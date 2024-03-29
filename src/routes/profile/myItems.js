import express from 'express';
import {pool} from '../../app';
import {isLoggedIn, PLACEHOLDER_PHOTO_URL} from '../../utils/Utils';

const router = express.Router();

/**
 * Getting a list of my items
 */
router.post('/my_items', isLoggedIn, (req, res) => {
  // Get the ownerId from the request
  const {userId} = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = 'SELECT "itemId", "title", array_to_json("category") AS "category", "price", "costPeriod" FROM "rentalItem" WHERE "ownerId"=$1 AND "rentalItem"."status" != \'Archived\'';

    client.query(query, [userId]).then(({rows}) => {
      client.release();

      res.status(200).json({myItems: rows});
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

/**
 * Remove a rental item
 */
router.post('/remove_my_item', isLoggedIn, (req, res) => {
  // Get the itemId and ownerId from the request
  const {itemId, userId} = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    client.query('UPDATE "rentalItem" SET "status"=\'Archived\' WHERE "itemId"=$1 AND "ownerId"=$2', [itemId, userId]).then(result => {
      client.release();
      res.status(200).json({result});
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

/**
 * Update a rental item
 */
router.post('/update_my_item', isLoggedIn, (req, res) => {
  // Get the itemId and ownerId from the request
  const {title, category, price, costPeriod, description, terms, itemId, userId} = req.body;
  let {photos} = req.body;

  // If all the photos have benn removed the item
  // Perhaps could be a default value in the database
  if (photos.length == 0) {
    photos = [PLACEHOLDER_PHOTO_URL];
  }

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = 'UPDATE "rentalItem" \
                    SET "title"=$1, "description"=$2, "price"=$3, "costPeriod"=$4, "termsOfUse"=$5, "category"=$6, "photos"=$7 \
                    WHERE "itemId"=$8 AND "ownerId"=$9';

    client.query(query, [title, description, price, costPeriod, terms, category, photos, itemId, userId]).then(result => {
      client.release();
      res.status(200).json({result});
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
