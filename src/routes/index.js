import express from 'express';
import {pool} from '../app';
const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).send('Shareff');
});

export {router as index}
