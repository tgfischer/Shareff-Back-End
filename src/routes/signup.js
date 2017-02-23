import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import jwt from 'jsonwebtoken';
import googleMaps from '@google/maps';
import {pool} from '../app';
import {nls} from '../i18n/en';
import {rollBack, isLoggedOut, getUser} from '../utils/Utils';
import stripeWrapper from 'stripe';

const stripe = stripeWrapper("sk_test_rFLCN6uHUJ4YAbD7U3xRCi9Y"); //test secret key
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
          const {
            firstName, lastName, email, password, addressOne, addressTwo,
            city, province, postalCode
          } = req.body;

          // Hash the password with a salt, rather than storing plaintext
          const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);

          const expiryDate = {
            month: 4,
            year: 2020
          }

          const ccn = '4242424242424242';
          const cvn = 567;
          let custId = '';

          // Create a new customer and then a new source with
          // the credit card they entered
          stripe.customers.create({email}).then(function(customer){
            custId = customer.id;
            return stripe.customers.createSource(customer.id, {
              source: {
                 object: 'card',
                 exp_month: expiryDate.month,
                 exp_year: expiryDate.year,
                 number: ccn,
                 cvc: cvn
              }
            });
          }).then(function(source) {
            return stripe.customers.update(custId, {"source" : source.id});
          }).then(function(customer) {
            console.log(customer.sources.data);
          });

          // Build the query to insert the user
          query = `INSERT INTO "userTable" ("firstName", "lastName", "email", "password") \
                    VALUES ($1, $2, $3, $4) \
                    RETURNING "userId", "photoUrl"`;

          // Insert the user into the users table
          client.query(query, [firstName, lastName, email, hash]).then(result => {
            // Get the userId for the new user
            const {userId, photoUrl} = result.rows[0];

            const googleMapsClient = googleMaps.createClient({
              key: process.env.GOOGLE_MAPS_API_KEY
            });

            // Geocode the address to get the latitude and longitude
            googleMapsClient.geocode({
              address: `${addressOne} ${addressTwo || ''}, ${city} ${province}, ${postalCode}`
            }, (err, response) => {
              if (err) {
                return rollBack(err, client, res);
              }

              // Get the results from the response
              let latitude, longitude = '';
              const {results} = response.json;

              // First check to see if there was a result
              if (results.length > 0) {
                const {lat, lng} = results[0].geometry.location;

                latitude = lat;
                longitude = lng;
              }

              // Build the query to insert the address
              query = `INSERT INTO "address" ("line1", "line2", "city", "province", "postalCode", "latitude", "longitude", "userId") \
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) \
                        RETURNING "addressId"`;

              // Insert the address into the database
              client.query(query, [addressOne, addressTwo, city, province, postalCode, latitude, longitude, userId]).then(result => {
                // Insert the user into the users table
                client.query('COMMIT').then(result => {
                  // Generate the token from the userId
                  const token = jwt.sign(userId, process.env.JWT_SECRET);

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
  }).catch(err => {
    res.status(500).json({err});
  });;
});

export {router as signup}
