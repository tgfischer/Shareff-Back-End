import express from 'express';
import {pool} from '../app';
import {nls} from '../i18n/en';

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
 * @param comments - string/text
 * @param questions - string/text
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
        pool.connect().then(client => {
            
            var insertQuery = `INSERT INTO public."rentRequest" ("renterId", "itemId", "startDate", "endDate", "status") VALUES ('${req.body.renterId}', '${req.body.itemId}', '${req.body.startDate}', '${req.body.endDate}', '${nls.RRS_NOTIFICATION_PENDING}');`;
            client.query(insertQuery).then(result => {
                client.release();
                res.status(200).json({ success: true });
            }).catch(err => {
                client.release();
                res.status(500).json({err});
            });
        });
    } 
});

/** 
 * The following route will be used to update the status of a specific rentRequest.
 * 
 * @param rentRequestId => the rentRequest being updated
 * @param status - string/text => the new status of the rent request
 * 
 * @return success - boolean
 */
router.post('/request/update_status', (req, res) => {
    if (!req.body.rentRequestId || !req.body.status) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        pool.connect().then(client => {
            client.query(`UPDATE public."rentRequest" SET "status" = '${req.body.status}' WHERE "rentRequestId" = '${req.body.rentRequestId}';`).then(result => {
                client.release();
                console.log(result.rows);
                res.status(200).json({ success: true });
            }).catch(err => {
                client.release();
                res.status(500).json({err});  
            });
        });
    }
});

export {router as rent}