import express from 'express';
import Moment from 'moment';
import {extendMoment} from 'moment-range';
import {pool} from '../app';
import {nls} from '../i18n/en';

const router = express.Router();
const moment = extendMoment(Moment);

/* The following route will be used to check if the item is
 * is free during the dates specified.
 *
 * @param itemId - uuid => the item being checked for availability
 * @param startDate - date => the start date for checking availability
 * @param endDate - date => the end date for checking availability
 *
 * @return isAvailable - boolean
 *
 */
router.post('/is_available', (req, res) => {
    // TODO: Confirm the start date and end date are dates
    // TODO: Confirm the start date is before the end date
    // TODO: Move the query to an external NLS file - if possible due to parameters needed
    if (!req.body.itemId || !req.body.startDate || !req.body.endDate) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        /*
           Query the booking table for the provided itemId and get the scheduled dates it is booked for.
           Using the rows from the above query, we need to check if the item is available.
        */
        var proposedStartDate = moment(req.body.startDate, nls.MOMENT_DATE_FORMAT);
        var proposedEndDate = moment(req.body.endDate, nls.MOMENT_DATE_FORMAT);

        // Check start date is less than end date
        if (!proposedEndDate.isAfter(proposedStartDate)) {
            res.status(500).json({
                err: {
                    message: nls.END_BEFORE_START_DATE
                }
            });
        }

        // Create a range of dates from the requested startDate and endDate
        var proposedRange = moment().range(proposedStartDate, proposedEndDate);

        pool.connect().then(client => {
            client.query(`SELECT * FROM public."booking" WHERE "itemId"='${req.body.itemId}';`).then(result => {
                client.release();

                var overlap = false;    // assume it is available - then find if it is not


                // Check each booking start/end dates for overlap. If there is no overlap, the item is available
                for (var row of result.rows) {
                    if (row && row.startDate && row.endDate) {
                        var bookedStartDate = moment(row.startDate, nls.MOMENT_DATE_FORMAT);
                        var bookedEndDate = moment(row.endDate, nls.MOMENT_DATE_FORMAT);

                        if (proposedRange.contains(bookedStartDate) || proposedRange.contains(bookedEndDate)) {
                            overlap = true;
                            break;
                        }
                    }
                }

                res.status(200).json({ isAvailable : !overlap });

            }).catch(err => {
                client.release();
                res.status(500).json({err});
            });
        });
    }
});


/* The following route will be used to create a booking in the database. It will assume that the item has been check for availability (see above).
 *
 * @param itemId - uuid => the item that is being booked
 * @param rentRequestId - uuid => the request associated to the official booking
 * @param userId - uuid => the user making the booking (THE RENTER)
 * @param startDate - date => the start of the booking
 * @param endDate - date => the end of the booking
 *
 * @return success - boolean => Did the operation complete successfully
 *
 */
router.post('/book', (req, res) => {
    if (!req.body.itemId || !req.body.rentRequestId || !req.body.userId || !req.body.startDate || !req.body.endDate) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        // TODO: potentially check if the rent request (from rentRequestId) is in status "accepted"
        pool.connect().then(client => {
            client.query(`INSERT INTO public."booking" ("itemId", "rentRequestId", "userId", "startDate", "endDate") VALUES ('${req.body.itemId}', '${req.body.rentRequestId}', '${req.body.userId}', '${req.body.startDate}', '${req.body.endDate}');`).then(result => {
                client.release();
                res.status(200).json({ success: true });
            }).catch(err => {
                client.release();
                res.status(500).json({err});
            });
        });
    }
});

/* The following route will be used to remove a booking from the database.
 *
 * @param itemId - uuid => the item that is being booked
 * @param startDate - date => the start of the booking
 * @param endDate - date => the end of the booking
 *
 * OR
 * _
 * @param bookingId - uuid
 *
 *
 * @return success - boolean => Did the operation complete successfully
 *
 */
router.delete('/book', (req, res) => {
    if (req.body.bookingId) {
        pool.connect().then(client => {
            client.query(`DELETE FROM public."booking" WHERE "bookingId"='${req.body.bookingId}';`).then(result => {
                client.release();
                res.status(200).json({ success: true });
            }).catch(err => {
                client.release();
                res.status(500).json({err});
            });
        });
    } else if (req.body.itemId && req.body.startDate && req.body.endDate) {
        pool.connect().then(client => {
            client.query(`DELETE FROM public."booking" WHERE "itemId"='${req.body.itemId}' AND "startDate"='${req.body.startDate}' AND "endDate"='${req.body.endDate}';`).then(result => {
                client.release();
                res.status(200).json({ success: true });
            }).catch(err => {
                client.release();
                res.status(500).json({err});
            });
        });
    } else {
        res.status(500).json({
            err: {
               message: nls.INVALID_PARAMETER_SET
            }
        });
    }
});

/* The following route will return items that are available during the specified times.
 *
 * @param startDate - date => the start of the booking
 * @param endDate - date => the end of the booking
 *
 * @return availableItemIds - boolean => Did the operation complete successfully
 *
 */
// TODO: Switch this to a GET?
router.post('/available_items', (req, res) => {
    if (!req.body.startDate || !req.body.endDate) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        pool.connect().then(client => {
            client.query('SELECT * FROM public."booking";').then(result => {
                client.release();

                var setOfAvailableIds = new Set();
                var proposedStartDate = moment(req.body.startDate, nls.MOMENT_DATE_FORMAT);
                var proposedEndDate = moment(req.body.endDate, nls.MOMENT_DATE_FORMAT);
                var proposedRange = moment().range(proposedStartDate, proposedEndDate);

                for (var row of result.rows) {
                    if (row && row.startDate && row.endDate) {
                        var bookedStartDate = moment(row.startDate, nls.MOMENT_DATE_FORMAT);
                        var bookedEndDate = moment(row.endDate, nls.MOMENT_DATE_FORMAT);

                        if (!(proposedRange.contains(bookedStartDate) || proposedRange.contains(bookedEndDate))) {
                            setOfAvailableIds.add(row.itemId);
                        }
                    }
                }

                var arrayOfAvailableIds = new Array();
                setOfAvailableIds.forEach(function(id) {
                    arrayOfAvailableIds.push(id);
                });

                res.status(200).json({ availableItems : arrayOfAvailableIds });

            }).catch(err => {
                client.release();
                res.status(500).json({err});
            });
        });
    }
});

export {router as schedule}
