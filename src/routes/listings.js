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
  const {startDate, endDate} = req.body;
  let {q} = req.body;

  // Replace the spaces with |'s in the query. This allows us to match with each
  // variable in the string
  q = q.replace(/\s+/g, '|');

  pool.connect().then(client => {
    const query = 'SELECT "rentalItem"."itemId", "rentalItem"."title", substring("rentalItem"."description" for 250) AS "description", \
                      "rentalItem"."price", "rentalItem"."costPeriod", "rentalItem"."ownerId", "address"."city" \
                    FROM "rentalItem" INNER JOIN "address" ON "rentalItem"."addressId"="address"."addressId" \
                    WHERE "title" ~* $1 OR description ~* $1';
    // Query the database. ~* matches the regular expression, case insensitive
    // substring limits the amount of characters that are returned
    client.query(query, [q]).then(result => {
      client.release();

      // Mock the results for now
      const {rows} = result;

      // Return the result to the client
      res.status(200).json({listings: rows});
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
    client.query(`SELECT * FROM "rentalItem" INNER JOIN "address" ON "rentalItem"."addressId"="address"."addressId" WHERE "itemId"=$1 LIMIT 1`, [itemId]).then(result => {
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

      // Get the rental item and the owner ID
      const rentalItem = result.rows[0];
      const {ownerId} = rentalItem;

      // Get the owner's information
      client.query(`SELECT "userId", "firstName", "lastName", "email", "photoUrl", "description", "avgRating" FROM "userTable" WHERE "userId"=$1 LIMIT 1`, [ownerId]).then(result => {
        client.release();

        // Set the owner of the item
        rentalItem.owner = result.rows[0];
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
