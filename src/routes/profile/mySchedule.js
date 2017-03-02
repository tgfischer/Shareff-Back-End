import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';

const router = express.Router();

/**
 * Getting a list of my items
 */
router.post('/my_schedule', isLoggedIn, (req, res) => {
  // Get the userId from the request
  const {userId} = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = 'SELECT "booking"."bookingId" AS "id", "booking"."userId", "rentalItem"."ownerId", "rentalItem"."title", "booking"."startDate" AS "start", "booking"."endDate" AS "end", "rentalItem"."itemId" \
    FROM "rentalItem" INNER JOIN "booking" ON "rentalItem"."itemId"="booking"."itemId" \
    WHERE "booking"."userId"=$1 OR "rentalItem"."ownerId"=$1';

    client.query(query, [userId]).then(({rows}) => {
      client.release();

      res.status(200).json({mySchedule: rows});
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

export {router as mySchedule}
