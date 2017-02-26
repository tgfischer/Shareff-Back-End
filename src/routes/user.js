import express from 'express';
import {pool} from '../app';

const router = express.Router();

/**
 * Get the targetted user
 */
router.post('/get_target_user', (req, res) => {
  const {userId} = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    let query = 'SELECT "userTable"."userId", "userTable"."firstName", "userTable"."lastName", \
                    "userTable"."email", "userTable"."photoUrl", "userTable"."description", \
                    "userTable"."avgRating", "address"."line1", "address"."line2", \
                    "address"."city", "address"."province", "address"."postalCode", \
                    "address"."longitude", "address"."latitude" \
                    FROM "userTable" INNER JOIN "address" ON "userTable"."userId"="address"."userId" \
                    WHERE "userTable"."userId"=$1 AND "address"."isPrimary"=\'true\' \
                    LIMIT 1';

    client.query(query, [userId]).then(result => {
      const targetUser = result.rows[0];
      query = 'SELECT "itemId", "title", "category", "costPeriod", "price" FROM "rentalItem" WHERE "ownerId"=$1';

      client.query(query, [userId]).then(result => {
        client.release();

        const targetItems = result.rows;
        res.status(200).json({targetUser, targetItems});
      }).catch(err => {
        client.release();

        console.log(JSON.stringify(err, null, 2));
        res.status(500).json({err});
      });
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

export {router as user}
