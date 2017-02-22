import express from 'express';
import {getPayload, getUser} from '../utils/Utils';
import {pool} from '../app';
const router = express.Router();

/**
 * Get the user information from the token
 */
router.post('/get_user', (req, res) => {
  const {token} = req.body;

  // Get the payload from the JWT, which will be the user information
  getPayload(token).then(userId => {
    // Connect to the pool, and reserve a client to make the query
    pool.connect().then(client => {
      // Get the user. The client gets released
      getUser(client, userId, token).then(user => {
        res.status(200).json({user});
      }).catch(err => {
        console.log(JSON.stringify(err, null, 2));
        res.status(500).json({err});
      });
    }).catch(err => {
      res.status(500).json({err});
    });
  }).catch(err => {
    return res.status(401).json({err});
  });
});

/**
 * Get basic information about a user (e.g. non-sensitive information)
 */
router.post('/get_basic_user', (req, res) => {
  const {userId} = req.body;

  // Connect to the pool, and reserve a client to make the query
  pool.connect().then(client => {
    client.query('SELECT "userId", "firstName", "lastName", "email", "photoUrl" FROM "userTable" WHERE "userId"=$1', [userId]).then(result => {
      // Get the user and send the request
      const user = result.rows[0];
      res.status(200).json({user});
    }).catch(err => {
      res.status(500).json({err});
    });
  }).catch(err => {
    res.status(500).json({err});
  });
});

export {router as index}
