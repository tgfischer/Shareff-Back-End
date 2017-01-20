import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt-nodejs';
import {pool} from '../app';
import {nls} from '../i18n/en';
import {rollBack, isLoggedOut} from '../utils/Utils';

const router = express.Router();

router.post('/', isLoggedOut, (req, res) => {
  const creds = {
    email: req.body.email,
    password: req.body.password
  };

  pool.connect().then(client => {
    const query = `SELECT * \
                    FROM "userTable", "address" \
                    WHERE "email"='${creds.email}' \
                    LIMIT 1`;

    client.query(query).then(result => {
      client.release();

      let user = result.rows[0];

      // Verify that there is an email and password to check
      if (user && user.email && user.password) {
        // Check to see if the hashed password matches the one in the database
        const hashMatches = bcrypt.compareSync(creds.password, user.password);

        // Check that the correct user was returned from the database
        if (hashMatches && user.email === creds.email) {
          // Delete the password field, since we don't want to return that to the
          // client
          delete user.password;

          // Generate the token for the user
          user.token = jwt.sign(user, process.env.JWT_SECRET);

          // Return the user that was fetched from the database
          res.status(200).json({user});
        } else {
          // Wait 3 seconds before returning the error
          setTimeout(() => {
            res.status(500).json({
              err: {
                message: nls.INVALID_LOGIN_CREDENTIALS
              }
            });
          }, 3000);
        }
      } else {
        // Wait 3 seconds before returning the error
        setTimeout(() => {
          res.status(500).json({
            err: {
              message: nls.INVALID_LOGIN_CREDENTIALS
            }
          });
        }, 3000);
      }
    }).catch(err => {
      client.release();
      console.error('ERROR: ', err.message, err.stack);

      res.status(500).json({err});
    });
  });
});

export {router as login}
