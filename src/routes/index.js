import express from 'express';
import {getPayload} from '../utils/Utils';
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).send('Shareff');
});

router.post('/get_user', (req, res) => {
  console.log(`\n${req.body.token}`);
  getPayload(req.body.token).then(payload => {
    delete payload.iat;
    
    return res.status(200).json({user: payload});
  }).catch(err => {
    return res.status(401).json({err});
  });
});

export {router as index}
