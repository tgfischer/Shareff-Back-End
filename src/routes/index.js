import express from 'express';
import {getPayload} from '../utils/Utils';
import {pool} from '../app';
const router = express.Router();

/**
 * Get the user information from the token
 */
router.post('/get_user', (req, res) => {
  // Get the payload from the JWT, which will be the user information
  getPayload(req.body.token).then(userId => {
    // Connect to the pool, and reserve a client to make the query
    pool.connect().then(client => {
      var query = `SELECT * \
                    FROM "userTable", "address" \
                    WHERE "userTable"."userId"='${userId}' \
                    LIMIT 1`;

      // Get the user information from the database
      client.query(query).then(result => {
        // Send the user information back to the client
        return res.status(200).json({user: result.rows[0]});
      });
    });
  }).catch(err => {
    return res.status(401).json({err});
  });
});

export {router as index}
