import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';

const router = express.Router();

/**
 * Upload a rental item
 */
router.post('/upload_item', isLoggedIn, (req, res) => {
  // Get the item details from the request
  const {
    title, category, description, price, addressId, terms, userId
  } = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = `INSERT INTO public."rentalItem" ("title", "category", "description", "price", "addressId", "termsOfUse", "ownerId", "costPeriod") VALUES ($1, $2, $3, $4, $5, $6, $7, $8);`;

    client.query(query, [title, category, description, price, addressId, terms, userId, "days"]).then(result => {
      client.release();
      res.status(200).json({success: true});
    }).catch(err => {
      console.log("error on insert query" + err);
      client.release();
      res.status(500).json({err});
    });
  }).catch(err => {
    console.log("error on start" + err);
    res.status(500).json({err});
  });
});

export {router as uploadItem}
