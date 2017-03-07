import express from 'express';
import {pool} from '../../app';
import {isLoggedIn, PLACEHOLDER_PHOTO_URL} from '../../utils/Utils';

const router = express.Router();

/**
 * Upload a rental item
 */
router.post('/add_item', isLoggedIn, (req, res) => {
  // Get the item details from the request
  const {
    title, category, description, price, addressId, terms, userId, costPeriod
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

    client.query(query, [title, category, description, price, addressId, terms, userId, costPeriod, photos]).then(({rows}) => {
      client.release();
    
      const {itemId} = rows[0];
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
