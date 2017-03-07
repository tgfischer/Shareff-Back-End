import express from 'express';
import {pool} from '../../app';
import {isLoggedIn, PLACEHOLDER_PHOTO_URL} from '../../utils/Utils';
import {nls} from '../../i18n/en';

const router = express.Router();

/**
 * Upload a rental item
 */
router.post('/add_item', isLoggedIn, (req, res) => {
  // Get the item details from the request
  const {
    title, category, description, price, addressId, terms, userId, costPeriod, unavailableDays
  } = req.body;
  let {photos} = req.body;

  // If the user didn't attach a photo to the item
  // Perhaps could be a default value in the database
  if (!photos) {
    photos = [PLACEHOLDER_PHOTO_URL];
  }

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = `INSERT INTO public."rentalItem" ("title", "category", "description", "price", "addressId", "termsOfUse", "ownerId", "costPeriod", "photos") \
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING "itemId"`;

    client.query(query, [title, category, description, price, addressId, terms, userId, costPeriod, photos]).then(result => {
      client.release();
      const itemId = result.rows[0].itemId;

      unavailableDays.forEach(function(date) {
        pool.connect().then(client => {
          const createBookingQuery = `INSERT INTO public."booking" ("itemId", "rentRequestId", "userId", "startDate", "endDate", "status") VALUES ($1, $2, $3, $4, $5, $6);`;
          const params = [itemId, null, userId, date.start, date.end, nls.BOOKING_UNAVAILABLE];
          client.query(createBookingQuery, params).then(result => {
              client.release();
              console.log("Booked off availablity successfully!");
          }).catch(err => {
              client.release();
              console.log("An error occurred booking off item availablity.. " + err);  
          });
        });
      });

      res.status(200).json({itemId});
    }).catch(err => {
      client.release();

      console.log(JSON.stringify(err, null, 2));
      res.status(500).json({err});
    });
  }).catch(err => {
    console.log(JSON.stringify(err, null, 2));
    res.status(500).json({err});
  });
});

export {router as addItem}
