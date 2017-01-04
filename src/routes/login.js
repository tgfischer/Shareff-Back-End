import express from 'express';
import jwt from 'jsonwebtoken';
import {pool} from '../app';
const router = express.Router();

router.post('/', (req, res) => {
  console.log(JSON.stringify(req.body, null, 2));

  const user = {
    email: req.body.email,
    password: req.body.password
  };

  user.token = jwt.sign(user, process.env.JWT_SECRET);

  res.status(200).json({
    ok:true,
    user
  });
});

export {router as login}
