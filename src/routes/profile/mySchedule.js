import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';

const router = express.Router();

/**
 * Getting a list of my items
 */
router.post('/my_schedule', isLoggedIn, (req, res) => {
  // Get the ownerId from the request
  const {userId} = req.body;
  console.log("EMILY MADE IT HERE YAY!");

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = 'SELECT "itemId", "title", array_to_json("category") AS "category", "price", "costPeriod" FROM "rentalItem" WHERE "ownerId"=$1';

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
