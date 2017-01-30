import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';

const router = express.Router();

/**
 * Getting a list of my items
 */
router.post('/my_items', isLoggedIn, (req, res) => {
  // Get the ownerId from the request
  const {ownerId} = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = `SELECT "title", "category", "description", "price", "termsOfUse" FROM "rentalItem" WHERE ownerId=$1`;

    client.query(query, [ownerId]).then(result => {
      client.release();

      // Mock the result for now
      let {rows} = result;
      rows = [{
        title: 'Trailer',
        category: 'Car',
        description: 'This is a cool trailer',
        price: 65,
        termsOfUse: 'Do not break it.'
      }, {
        title: '4x8 Trailer',
        category: 'Car',
        description: 'This is a cool trailer',
        price: 98,
        termsOfUse: 'Keep it clean.'
      }, {
        title: 'Another Trailer',
        category: 'Car',
        description: 'This is a dope trailer',
        price: 120,
        termsOfUse: 'N/A'
      }, {
        title: 'snowboard',
        category: 'Equippment',
        description: 'K2 snowboard',
        price: 25,
        termsOfUse: 'Wipe the snow off before return.'
      }];

      res.status(200).json({result});
    }).catch(err => {
      client.release();
      res.status(500).json({err});
    });
  }).catch(err => {
    res.status(500).json({err});
  });
});

export {router as uploadItem}
