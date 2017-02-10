import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';
import {nls} from '../../i18n/en';

const router = express.Router();

/**
 * Getting a list of my items
 */
router.post('/get_incoming_requests', isLoggedIn, (req, res) => {
  // Get the ownerId from the request
  const {userId} = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = 'SELECT "rentRequest"."requestId", "rentRequest"."itemId", "rentRequest"."startDate", "rentRequest"."endDate", \
                          "rentalItem"."title" AS "itemTitle", concat_ws(\' \', "userTable"."firstName", "userTable"."lastName") AS "rentersName" \
                    FROM ("rentalItem" INNER JOIN "rentRequest" ON "rentalItem"."itemId"="rentRequest"."itemId") \
                          INNER JOIN "userTable" ON "rentRequest"."renterId"="userTable"."userId" \
                    WHERE "rentalItem"."ownerId"=$1 AND "rentRequest"."status"=$2';

    client.query(query, [userId, nls.RRS_NOTIFICATION_PENDING]).then(result => {
      client.release();

      const requests = result.rows;
      res.status(200).json({requests});
    }).catch(err => {
      client.release();

      console.error('ERROR: ', err.message, err.stack);
      res.status(500).json({err});
    });
  }).catch(err => {
    console.error('ERROR: ', err.message, err.stack);
    res.status(500).json({err});
  });
});

export {router as incomingRequests}
