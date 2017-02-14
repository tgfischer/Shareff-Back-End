import express from 'express';
import Moment from 'moment';
import {extendMoment} from 'moment-range';
import {pool} from '../app';
import {nls} from '../i18n/en';
import {rollback, isLoggedIn} from '../utils/Utils';
import {sendRentRequestNotificationEmail} from '../utils/EmailNotification';

const router = express.Router();
const moment = extendMoment(Moment);

/**
 * The following route will be used to create a rental request on an item.
 *
 * @param renterId - uuid => the id of the user who wants to rent the item
 * @param ownerId - uuid => the id of the user who owns the item being requested for rent => this is going to be used for notifying them, rather than doing a query for this id
 * @param itemId - uuid => the id of the item that is being requested to rent
 * @param startDate - date => the proposed date to start renting
 * @param endDate - date => the proposed date to stop renting
 * @param status - string/text => the status of the item. Initially will be "notification pending".
 *
 * Not required:
 * @param message - string/text => when this is added, it will be inserted into the messages table because
 * it will start a new conversation
 *
 * @return success - boolean => was the operation successful - for confirmation on the front end
 */
router.post('/request', isLoggedIn, (req, res) => {
    if (!req.body.renterId || !req.body.ownerId || !req.body.itemId || !req.body.startDate || !req.body.endDate) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        // Depending on the provided comment parameter, we may need to use a transaction.
        if (req.body.message) {
            pool.connect().then(client => {
                // We need to use a transaction => insert rentRequest, conversation and message

                // Begin our transaction
                client.query('BEGIN').then(beginResult => {
                    // First Insert -> Insert the rentRequest
                    const insRentReqQuery = `INSERT INTO public."rentRequest" ("renterId", "itemId", "startDate", "endDate", "status") \
                                                VALUES ($1, $2, $3, $4, $5) RETURNING "requestId", "itemId";`;
                    const insRentReqValues = [req.body.renterId, req.body.itemId, req.body.startDate, req.body.endDate, nls.RRS_NOTIFICATION_PENDING];

                    client.query(insRentReqQuery, insRentReqValues).then(insRentReqResult => {
                        // Second Insert -> Insert the conversation
                        const result = insRentReqResult;
                        const insConvQuery = `INSERT INTO public."conversation" ("rentRequestId", "renterId", "ownerId", "startDate") \
                                                VALUES ($1, $2, $3, $4) RETURNING *;`;
                        const insConvValues = [result.rows[0].requestId, req.body.renterId, req.body.ownerId, moment()];

                        client.query(insConvQuery, insConvValues).then(insConvResult => {
                            // Third Insert -> Insert the message
                            const insMsgQuery = `INSERT INTO public."message" ("senderId", "timeSent", "content", "conversationId") \
                                                    VALUES ($1, $2, $3, $4) RETURNING *;`;
                            const insMsgValues = [req.body.renterId, moment(), req.body.message, insConvResult.rows[0].id];

                            client.query(insMsgQuery, insMsgValues).then(insMsgResult => {
                                // Finish our transaction
                                client.query('COMMIT').then(endResult => {
                                    client.release();
                                    sendRentRequestNotificationEmail(result.rows[0]);
                                    res.status(200).json({ success: true });
                                }).catch(err => {
                                    // Catch from commit transaction
                                    console.log(err);
                                    rollback(err, client, res);
                                });
                            }).catch(err => {
                                // Catch from insert message query
                                console.log(err);
                                rollback(err, client, res);
                            });
                        }).catch(err => {
                            // Catch from insert conversation query
                            console.log(err);
                            rollback(err, client, res);
                        });
                    }).catch(err => {
                        // Catch from insert rent request query
                        console.log(err);
                        rollback(err, client, res);
                    });
                }).catch(err => {
                    // Catch from begin transaction
                    console.log(err);
                    rollback(err, client, res);
                });
            });
        } else {
            // There is no message to add, so we can just do a direct insert query for the rent request
            const query = `INSERT INTO public."rentRequest" ("renterId", "itemId", "startDate", "endDate", "status") \
                            VALUES ($1, $2, $3, $4, $5) RETURNING "requestId", "itemId";`;
            const values = [req.body.renterId, req.body.itemId, req.body.startDate, req.body.endDate, nls.RRS_NOTIFICATION_PENDING];
            pool.connect().then(client => {
                client.query(query, values).then(result => {
                    client.release();
                    sendRentRequestNotificationEmail(result.rows[0]);
                    res.status(200).json({ success: true });
                }).catch(err => {
                    client.release();
                    res.status(500).json({err});
                });
            });
        }
    }
});

/**
 * The following route will be used to automatically proceed the status of a specific rentRequest to the next stage.
 * If status is 'Notification pending' -> 'Request pending'
 * If status is 'Request pending' AND req.body.accepted = true -> 'Request approved'
 * If status is 'Request pending' AND req.body.accepted = false -> 'Request rejected'
 *
 * @param rentRequestId => the rentRequest being updated
 *
 * @optional_param accepted - boolean => passed when it the
 * @return success - boolean
 */
router.post('/request/auto_update_status', isLoggedIn, (req, res) => {
    const {request, approved} = req.body;

    if (!request || !approved) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        const {requestId} = request;

        pool.connect().then(client => {
            const query = 'SELECT * FROM public."rentRequest" WHERE "requestId"=$1;';

            client.query(query, [requestId]).then(result => {
                const currStatus = result.rows[0].status;
                let newStatus;

                switch (currStatus) {
                    case nls.RRS_NOTIFICATION_PENDING:
                        newStatus = nls.RRS_REQUEST_PENDING;
                        break;
                    case nls.RRS_REQUEST_PENDING:
                        if (approved === true) {
                            newStatus = nls.RRS_REQUEST_REJECTED;
                        } else if (approved === false) {
                            newStatus = nls.RRS_REQUEST_ACCEPTED;
                        } else {
                            // The status is pending, and an approval was not specified. Keep it the same.
                            newStatus = currStatus;
                        }
                        break;
                    default:
                        newStatus = currStatus;
                        break;
                }

                let updateQuery = `UPDATE public."rentRequest" SET "status"=$1 WHERE "requestId"=$2;`;

                client.query(updateQuery, [newStatus, requestId]).then(updateResult => {
                    client.release();
                    res.status(200).json({ success: true });
                }).catch(err => {
                    client.release();
                    res.status(500).json({err});
                });
            }).catch(err => {
                client.release();
                res.status(500).json({err});
            });
        });
    }
});

/**
 * The following route should only be used to reverse a status chaged caused from /rent/request/auto_update_status.
 *
 * @param rentRequestId => the rentRequest being updated
 * @param status - string => the status that is to be updated to.
 *
 *      Could be:
 *          RRS_NOTIFICATION_PENDING: 'Notification pending'
 *          RRS_REQUEST_PENDING: 'Pending'
 *          RRS_REQUEST_ACCEPTED: 'Accepted'
 *          RRS_REQUEST_REJECTED: 'Rejected'
 *
 *
 * @return success - boolean
 *
 */
router.post('/request/force_update_status', isLoggedIn, (req, res) => {
    if (!req.body.rentRequestId || !req.body.status) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {

        // Switch statement to ensure status is being set to the correct string. If the correct string wasn't passed, the newStatus will be set to null and no operation will proceed.'
        let newStatus;
        switch (req.body.status) {
            case nls.RRS_NOTIFICATION_PENDING:
                newStatus = nls.RRS_NOTIFICATION_PENDING;
                break;
            case nls.RRS_REQUEST_PENDING:
                newStatus = nls.RRS_REQUEST_PENDING;
                break;
            case nls.RRS_REQUEST_ACCEPTED:
                newStatus = nls.RRS_REQUEST_ACCEPTED;
                break;
            case nls.RRS_REQUEST_REJECTED:
                newStatus = nls.RRS_REQUEST_REJECTED;
                break;
            default:
                newStatus = null;
                break;
        }

        if (newStatus != null) {
            pool.connect().then(client => {
                let updateQuery = `UPDATE public."rentRequest" SET "status" = $1 WHERE "rentRequestId" = $2;`;
                client.query(updateQuery, [newStatus, req.body.rentRequestId]).then(updateResult => {
                    client.release();
                    res.status(200).json({ success: true });
                }).catch(err => {
                    client.release();
                    res.status(500).json({err});
                });
            });
        }
    }
});


export {router as rent}
