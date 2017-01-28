import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';
const router = express.Router();

router.post('/get_messages', isLoggedIn, (req, res) => {
  const {userId, recipient} = req.body;
});

export {router as messages}
