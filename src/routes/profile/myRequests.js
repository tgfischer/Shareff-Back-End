import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';

const router = express.Router();

/**
 * Getting a list of my requests
 */
router.post('/get_my_requests', isLoggedIn, (req, res) => {
  // Get the ownerId from the request
  const {userId} = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = 'SELECT "rentRequest"."requestId", "rentRequest"."itemId", "rentRequest"."startDate", "rentRequest"."endDate", "rentRequest"."status", \
                          "rentalItem"."title" AS "itemTitle", concat_ws(\' \', "userTable"."firstName", "userTable"."lastName") AS "ownersName" \
                    FROM ("rentalItem" INNER JOIN "rentRequest" ON "rentalItem"."itemId"="rentRequest"."itemId") \
                          INNER JOIN "userTable" ON "rentRequest"."renterId"="userTable"."userId" \
                    WHERE "rentRequest"."renterId"=$1';

    client.query(query, [userId]).then(result => {
      client.release();

      const myRequests = result.rows;
      res.status(200).json({myRequests});
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
