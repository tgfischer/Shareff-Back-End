import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import multer from 'multer';
import uuid from 'node-uuid';
import path from 'path';
import googleMaps from '@google/maps';
import {pool} from '../../app';
import {
  rollBack, isLoggedIn, processImage, getValidImageMimeTypes, getUser, Storage
} from '../../utils/Utils';
import {nls} from '../../i18n/en';

const router = express.Router();

/**
 * Update the user's personal information
 */
router.post('/get_personal_info', isLoggedIn, (req, res) => {
  // Get the updated personal information from the body
  const {
    userId, token, addressId, firstName, lastName, addressOne, addressTwo, city, province,
    postalCode, email, password, description
  } = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    // Begin the transaction
    client.query('BEGIN').then(result => {
      let query = `UPDATE "userTable" \
                    SET "firstName"='${firstName}', "lastName"='${lastName}', "email"='${email}', "description"='${description}'`;

      // Only update the password if the user entered in in the form
      if (password) {
        // Hash the password first
        const hash = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
        query += `, "password"='${hash}'`;
      }

      query += ` WHERE "userId"='${userId}'`;

      // Update the user's personal information
      client.query(query).then(result => {
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

          query = `UPDATE "address" \
                    SET "line1"=$1, "line2"=$2, "city"=$3, "province"=$4, "postalCode"=$5, "longitude"=$7, "latitude"=$6, "gps"=ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography \
                    WHERE "addressId"=$8`;

          // Update the user's address
          client.query(query, [addressOne, addressTwo, city, province, postalCode, longitude, latitude, addressId]).then(result => {
            // Finish the transaction
            client.query('COMMIT').then(result => {
              // Get the user. The client gets released
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
  }).catch(err => {
    res.status(500).json({err});
  });
});

export {router as personalInfo}
