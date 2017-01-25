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
    });
  }).catch(err => {
    return res.status(401).json({err});
  });
});

export {router as index}
