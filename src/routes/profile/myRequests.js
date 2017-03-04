import express from 'express';
import {pool} from '../../app';
import {nls} from '../../i18n/en';
import {isLoggedIn} from '../../utils/Utils';

const router = express.Router();
const getMyRequestsQuery = 'SELECT "rentRequest"."requestId", "rentRequest"."itemId", "rentalItem"."ownerId", "rentRequest"."startDate", "rentRequest"."endDate", "rentRequest"."status", \
                      "rentalItem"."title" AS "itemTitle", concat_ws(\' \', "userTable"."firstName", "userTable"."lastName") AS "ownersName" \
                FROM ("rentalItem" INNER JOIN "rentRequest" ON "rentalItem"."itemId"="rentRequest"."itemId") \
                      INNER JOIN "userTable" ON "rentRequest"."renterId"="userTable"."userId" \
                WHERE "rentRequest"."renterId"=$1 AND ("rentRequest"."status"=$2 OR "rentRequest"."status"=$3);';

/**
 * Getting a list of my requests
 */
router.post('/get_my_requests', isLoggedIn, ({body}, res) => {
  // Get the ownerId from the request
  const {userId} = body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    client.query(getMyRequestsQuery, [userId, nls.RRS_REQUEST_PENDING, nls.RRS_REQUEST_REJECTED]).then(({rows}) => {
      client.release();

      res.status(200).json({myRequests: rows});
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

export {router as myRequests}
