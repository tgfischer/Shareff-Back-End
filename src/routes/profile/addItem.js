import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';

const router = express.Router();

/**
 * Upload a rental item
 */
router.post('/add_item', isLoggedIn, (req, res) => {
  // Get the item details from the request
  const {
    title, category, description, price, addressId, terms, userId, costPeriod, photos
  } = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = `INSERT INTO public."rentalItem" ("title", "category", "description", "price", "addressId", "termsOfUse", "ownerId", "costPeriod", "photo") \
      VALUES ($1, ARRAY[$2], $3, $4, $5, $6, $7, $8, ARRAY[$9]);`;

    client.query(query, [title, category, description, price, addressId, terms, userId, costPeriod, photos]).then(result => {
      client.release();
      res.status(200).json({success: true});
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
