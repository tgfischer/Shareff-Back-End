import express from 'express';
import {pool} from '../../app';

const router = express.Router();

/**
 * Getting a list of my items
 */
router.post('/my_items', (req, res) => {
  // Get the ownerId from the request
  const {ownerId} = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = `SELECT "title", "category", "description", "price", "termsOfUse" FROM "rentalItem" WHERE "ownerId"=$1`;
    client.query(query, [ownerId]).then(result => {
      client.release();
      const myItems = result.rows;

      res.status(200).json({myItems});
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

export {router as myItems}
