import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt-nodejs';
import {pool} from '../app';
import {nls} from '../nls/messages';

const router = express.Router();

router.post('/', (req, res) => {
  const creds = {
    email: req.body.email,
    password: req.body.password
  };

  pool.connect().then(client => {
    client.query(`SELECT email, password FROM users WHERE email='${creds.email}' LIMIT 1`).then(result => {
      client.release();

      let user = result.rows[0];

      if (user) {
        // Check to see if the hashed password matches the one in the database
        const hashMatches = bcrypt.compareSync(creds.password, user.password);

        // Check that the correct user was returned from the database
        if (hashMatches && user.email === creds.email) {
          // Delete the password field, since we don't want to return that to the
          // client
          delete user.password;

          // Generate the token for the user
          user.token = jwt.sign(creds, process.env.JWT_SECRET);

          // Output the log in credentials for debugging purposes
          console.log('LOGIN: ' + JSON.stringify(user, null, 2));

          // Return the user that was fetched from the database
          res.status(200).json({user});
        } else {
          // Wait 3 seconds before returning the error
          setTimeout(() => {
            res.status(500).json({err: nls.INVALID_LOGIN_CREDENTIALS});
          }, 3000);
        }
      } else {
        // Wait 3 seconds before returning the error
        setTimeout(() => {
          res.status(500).json({err: nls.INVALID_LOGIN_CREDENTIALS});
        }, 3000);
      }
    }).catch(err => {
      client.release();
      console.error('ERROR: ', err.message, err.stack);

      res.status(500).json({
        err: err
      });
    });
  });
});

export {router as login}
