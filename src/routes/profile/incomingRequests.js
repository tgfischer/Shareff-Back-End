import express from 'express';
import {pool} from '../../app';
import {isLoggedIn, getIncomingRequests} from '../../utils/Utils';
import {nls} from '../../i18n/en';

const router = express.Router();

/**
 * Getting a list of my items
 */
router.post('/get_incoming_requests', isLoggedIn, (req, res) => {
  // Get the ownerId from the request
  const {userId} = req.body;
  getIncomingRequests(userId).then(requests => {
    res.status(200).json({requests});
  }).catch(err => {
    res.status(500).json({err});
  });
});

export {router as incomingRequests}
