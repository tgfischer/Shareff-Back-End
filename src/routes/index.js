import express from 'express';
import {getPayload} from '../utils/Utils';
const router = express.Router();

/**
 * Get the user information from the token
 */
router.post('/get_user', (req, res) => {
  // Get the payload from the JWT, which will be the user information
  getPayload(req.body.token).then(payload => {
    // Delete the time created property
    delete payload.iat;

    // Send the user information back to the client
    return res.status(200).json({user: payload});
  }).catch(err => {
    return res.status(401).json({err});
  });
});

export {router as index}
