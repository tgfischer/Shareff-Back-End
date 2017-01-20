import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import jwt from 'jsonwebtoken';
import {pool} from '../app';
import {nls} from '../i18n/en';
import {rollBack, isLoggedOut} from '../utils/Utils';

const router = express.Router();

router.post('/', isLoggedOut, (req, res) => {
  // Connect to the pool, and reserve a client to make the query
  pool.connect().then(client => {
    var query = `SELECT "email" \
                  FROM "userTable" \
                  WHERE "email"='${req.body.email}' \
                  LIMIT 1`;

    // Check to see if there is a user with that email already registered
    client.query(query).then(result => {
      let user = result.rows[0];

      // If there was a user, rollback
      if (user) {
        rollBack({
          message: nls.USER_ALREADY_EXISTS
        }, client, res);
      } else {
        // Begin the transaction
        client.query('BEGIN').then(result => {
          // First, we need to insert the address because the user table needs
          // the address id
          const newAddress = {
            line1: req.body.addressOne,
            line2: req.body.addressTwo,
            city: req.body.city,
            province: req.body.province,
            postalCode: req.body.postalCode
          };

          // Build the query to insert the address
          query = `INSERT INTO "address" ("line1", "line2", "city", "province", "postalCode") \
                    VALUES ('${newAddress.line1}', '${newAddress.line2}', '${newAddress.city}', '${newAddress.province}', '${newAddress.postalCode}') \
                    RETURNING "addressId"`;

          // Insert the address into the database
          client.query(query).then(result => {
            // Get the address id from the new address record
            const {addressId} = result.rows[0];

            // Now we can build the new user using the returned addressId
            var newUser = {
              firstName: req.body.firstName,
              lastName: req.body.lastName,
              email: req.body.email,
              password: req.body.password,
              addressId
            };

            // Hash the password with a salt, rather than storing plaintext
            newUser.password = bcrypt.hashSync(newUser.password, bcrypt.genSaltSync(8), null);

            // Build the query to insert the user
            query = `INSERT INTO "userTable" ("firstName", "lastName", "email", "password", "addressId") \
                      VALUES ('${newUser.firstName}', '${newUser.lastName}', '${newUser.email}', '${newUser.password}', '${newUser.addressId}') \
                      RETURNING "userId"`;

            // Insert the user into the users table
            client.query(query).then(result => {
              // Remove the password field from the user so we don't send it back
              // to the client
              delete newUser.password;

              // Add the user id to the object so it gets signed in the token
              newUser.userId = result.rows[0].userId;

              // Generate the token for the user
              newUser.token = jwt.sign(newUser, process.env.JWT_SECRET);

              // Insert the user into the users table
              client.query('COMMIT').then(result => {
                // Release the client back to the pool
                client.release();

                // Merge the two objects together
                Object.assign(newUser, newAddress);

                // Return the user that was fetched from the database
                res.status(200).json({user: newUser});
              }).catch(err => {
                rollBack(err, client, res);
              });
            }).catch(err => {
              rollBack(err, client, res);
            });
          }).catch(err => {
            rollBack(err, client, res);
          });
        }).catch(err => {
          rollBack(err, client, res);
        });
      }
    }).catch(err => {
      rollBack(err, client, res);
    });
  });
});

export {router as signup}
