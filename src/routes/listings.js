import express from 'express';
import {pool} from '../app';
import {getPayload} from '../utils/Utils';
import {nls} from '../i18n/en';

const router = express.Router();
const NUM_PER_PAGE = 10;

/**
 * Get the the rental listings from the query
 */
router.post('/', (req, res) => {
  // Get the variables from URL
  const {startDate, endDate, category, page, maxPrice, maxDistance} = req.body;
  const offset = page && page >= 0 ? page * NUM_PER_PAGE : 0;
  let {q, location} = req.body;

  pool.connect().then(client => {
    // The beginning of the query
    let query = 'SELECT "rentalItem"."itemId", "rentalItem"."title", "rentalItem"."description", \
                    "rentalItem"."price", "rentalItem"."costPeriod", "rentalItem"."ownerId", "rentalItem"."category", "rentalItem"."photos", \
                    "address"."city", "userTable"."firstName" AS "ownerFirstName", \
                    "userTable"."lastName" AS "ownerLastName" \
                  FROM ("rentalItem" INNER JOIN "address" ON "rentalItem"."addressId"="address"."addressId")\
                        INNER JOIN "userTable" ON "rentalItem"."ownerId"="userTable"."userId"';

    // Array to hold the parameters
    const params = [];

    // If the user typed something into the search box
    if (q) {
      // Replace the spaces with |'s in the query. This allows us to match with each
      // variable in the string
      q = q.replace(/\s+/g, '|');
      params.push(q);

      query += ` WHERE (("rentalItem"."title" ~* $${params.length} OR "rentalItem"."description" ~* $${params.length})`;
    }

    // If the user entered a location
    if (location) {
      // Replace the spaces with |'s in the query. This allows us to match with each
      // variable in the string
      location = location.replace(/\s+/g, '|');
      params.push(location);

      query += `${params.length > 1 ? ' AND' : ' WHERE ('} ("address"."line1" ~* $${params.length} OR \
                  "address"."line2" ~* $${params.length} OR "address"."city" ~* $${params.length} OR \
                  "address"."postalCode" ~* $${params.length})`;
    }

    // Add the suffix to the query
    query += `${params.length > 0 ? ') AND' : ' WHERE'} "rentalItem"."status" != \'Archived\' LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    // Push the last two parameters to the query
    params.push(NUM_PER_PAGE);
    params.push(offset);

    // Query the database. ~* matches the regular expression, case insensitive
    // substring limits the amount of characters that are returned
    client.query(query, params).then(({rows}) => {
      const listings = rows;

      // Now query the database for the total number of listings that match the
      // query
      client.query('SELECT COUNT(*) AS "totalNumListings" FROM "rentalItem" WHERE ("rentalItem"."title" ~* $1 OR "rentalItem"."description" ~* $1) AND "rentalItem"."status" != \'Archived\'', [q]).then(({rows}) => {
        client.release();

        // Return the result to the client
        res.status(200).json({
          totalNumListings: Number(rows[0].totalNumListings),
          numPerPage: NUM_PER_PAGE,
          listings
        });
      }).catch(err => {
        client.release();
        console.error('ERROR: ', err.message, err.stack);

        // Return the error to the client
        res.status(500).json({err});
      });
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
        });
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
