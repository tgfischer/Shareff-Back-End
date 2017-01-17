import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import jwt from 'jsonwebtoken';
import {pool} from '../app';
import {nls} from '../nls/messages';
const router = express.Router();

router.post('/', (req, res) => {
  var newUser = {
    email: req.body.email,
    password: req.body.password
  };

  pool.connect().then(client => {
    client.query(`SELECT email FROM users WHERE email='${newUser.email}' LIMIT 1`).then(result => {
      let user = result.rows[0];

      // Check that the correct user was returned from the database
      if (user) {
        client.release();

        // Wait 3 seconds before returning the error
        setTimeout(() => {
          res.status(500).json({
            err: {
              message: nls.USER_ALREADY_EXISTS
            }
          });
        }, 3000);
      } else {
        // Hash the password with a salt, rather than storing plaintext
        newUser.password = bcrypt.hashSync(newUser.password, bcrypt.genSaltSync(8), null);

        // Insert
        client.query(`INSERT INTO users (email, password) VALUES ('${newUser.email}', '${newUser.password}')`).then(result => {
          client.release();

          // Remove the password field from the user so we don't send it back
          // to the client
          delete newUser.password;

          // Generate the token for the user
          newUser.token = jwt.sign(newUser, process.env.JWT_SECRET);

          // Return the user that was fetched from the database
          res.status(200).json({user: newUser});
        });
      }
    }).catch(err => {
      client.release();
      console.error('ERROR: ', err.message, err.stack);

      res.status(500).json({err});
    });
  });
});

export {router as signup}
