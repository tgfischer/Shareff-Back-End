import express from 'express';
import {pool} from '../app';
import {getPayload} from '../utils/Utils';
import {nls} from '../i18n/en';

const router = express.Router();

/**
 * Get the the rental listings from the query
 */
router.post('/', (req, res) => {
  // Get the variables from URL
  const {startDate, endDate} = req.query;
  let {q} = req.query;

  // Replace the spaces with |'s in the query. This allows us to match with each
  // variable in the string
  q = q.replace(/\s+/g, '|');

  pool.connect().then(client => {
    // Query the database. ~* matches the regular expression, case insensitive
    client.query(`SELECT * FROM "listings" WHERE "title" ~* '${q}' OR description ~* '${q}'`).then(result => {
      client.release();

      // Mock the results for now
      let {rows} = result;
      rows = [{
        title: 'Trailer',
        description: 'This is a cool trailer'
      }, {
        title: '4x8 Trailer',
        description: 'This is a cool trailer'
      }, {
        title: 'Another Trailer',
        description: 'This is a cool 5x6 trailer'
      }, {
        title: 'Snowboard',
        description: 'Burton snowboard with bindings'
      }];

      // Return the result to the client
      res.status(200).json({result});
    }).catch(err => {
      client.release();
      console.error('ERROR: ', err.message, err.stack);

      // Return the error to the client
      res.status(500).json({err});
    });
  });
});

router.post('/get_rental_item', (req, res) => {
  const {itemId} = req.body;

  pool.connect().then(client => {
    // Get the rental item from the ID
    client.query(`SELECT * FROM "rentalItem" WHERE "itemId"=$1 LIMIT 1`, [itemId]).then(result => {
      const {rows} = result;

      // If the if that the user is looking for does not exist
      if (rows.length < 1) {
        client.release();
        return res.status(404).json({
          err: {
            message: nls.ITEM_NOT_FOUND
          }
        })
      }

      const rentalItem = result.rows[0];

      // Get the rental item photos from the ID
      client.query(`SELECT "photoUrl" FROM "rentalItemPhoto" WHERE "itemId"=$1`, [itemId]).then(result => {
        client.release();

        rentalItem.photos = result.rows;
        res.status(200).json({rentalItem});
      }).catch(err => {
        client.release();

        console.error('ERROR: ', err.message, err.stack);
        res.status(500).json({err});
      });
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

export {router as listings}
