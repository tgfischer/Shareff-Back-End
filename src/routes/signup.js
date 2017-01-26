import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import jwt from 'jsonwebtoken';
import {pool} from '../app';
import {nls} from '../i18n/en';
import {rollBack, isLoggedOut, getUser} from '../utils/Utils';

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
          // Now we can build the new user using the returned addressId
          var newUser = {
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            email: req.body.email,
            password: req.body.password
          };

          // Hash the password with a salt, rather than storing plaintext
          newUser.password = bcrypt.hashSync(newUser.password, bcrypt.genSaltSync(8), null);

          // Build the query to insert the user
          query = `INSERT INTO "userTable" ("firstName", "lastName", "email", "password") \
                    VALUES ('${newUser.firstName}', '${newUser.lastName}', '${newUser.email}', '${newUser.password}') \
                    RETURNING "userId", "photoUrl"`;

          // Insert the user into the users table
          client.query(query).then(result => {
            // Get the userId for the new user
            const {userId, photoUrl} = result.rows[0];

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
            query = `INSERT INTO "address" ("line1", "line2", "city", "province", "postalCode", "userId") \
                      VALUES ('${newAddress.line1}', '${newAddress.line2}', '${newAddress.city}', '${newAddress.province}', '${newAddress.postalCode}', '${userId}') \
                      RETURNING "addressId"`;

            // Insert the address into the database
            client.query(query).then(result => {
              // Insert the user into the users table
              client.query('COMMIT').then(result => {
                // Generate the token from the userId
                const token = jwt.sign(userId, process.env.JWT_SECRET);

                console.log(userId);

                // Fetch the new user from the database
                getUser(client, userId, token).then(user => {
                  res.status(200).json({user});
                }).catch(err => {
                  res.status(500).json({err});
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
