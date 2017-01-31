import express from 'express';
import {pool} from '../app';
import {nls} from '../i18n/en';
import {sendRentRequestNotificationEmail} from '../utils/EmailNotification';

const router = express.Router();

/** 
 * The following route will be used to create a rental request on an item. 
 * 
 * @param renterId - uuid => the id of the user who wants to rent the item
 * @param itemId - uuid => the id of the item that is being requested to rent
 * @param startDate - date => the proposed date to start renting
 * @param endDate - date => the proposed date to stop renting
 * @param status - string/text => the status of the item. Initially will be "notification pending".
 * 
 * Not required: 
 * @param comments - string/text => when this is added, it will be inserted into the messages table because
 * it will start a new conversation
 * 
 * @return success - boolean => was the operation successful - for confirmation on the front end 
 */
router.post('/request', (req, res) => {
    if (!req.body.renterId || !req.body.itemId || !req.body.startDate || !req.body.endDate) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        let query = `INSERT INTO public."rentRequest" ("renterId", "itemId", "startDate", "endDate", "status") VALUES ($1, $2, $3, $4, $5) RETURNING "id", "itemId";`;
        let values = [req.body.renterId, req.body.itemId, req.body.startDate, req.body.endDate, nls.RRS_NOTIFICATION_PENDING];
        pool.connect().then(client => {
            client.query(query, values).then(result => {
                // If a comments section is provided, it needs to be stored in the messages database, because it initializes a new convo
                if (req.body.comments) {
                    // TODO: Kick off a new conversation with the message as the comments. 
                }
                client.release();
                sendRentRequestNotificationEmail(result.rows[0]);
                res.status(200).json({ success: true });
            }).catch(err => {
                client.release();
                res.status(500).json({err});
            });

        });
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
router.post('/request/auto_update_status', (req, res) => {
    if (!req.body.rentRequestId) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {

        pool.connect().then(client => {

            let query = `SELECT * FROM public."rentRequest" WHERE "rentRequestId" = $1;`;
            client.query(query, [req.body.rentRequestId]).then(result => {
                let currStatus = result.rows[0].status; 
                let newStatus;
                switch (currStatus) {
                    case nls.RRS_NOTIFICATION_PENDING: 
                        newStatus = nls.RRS_REQUEST_PENDING;
                        break;
                    case nls.RRS_REQUEST_PENDING: 
                        if (req.body.approved === true) {
                            newStatus = nls.RRS_REQUEST_REJECTED;
                        } else if (req.body.approved === false) {
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

                let updateQuery = `UPDATE public."rentRequest" SET "status" = $1 WHERE "rentRequestId" = $2;`;
                client.query(updateQuery, [newStatus, req.body.rentRequestId]).then(updateResult => {
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
router.post('/request/force_update_status', (req, res) => {
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