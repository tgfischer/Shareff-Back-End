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
                    SET "line1"=$1, "line2"=$2, "city"=$3, "province"=$4, "postalCode"=$5, "latitude"=$6, "longitude"=$7 \
                    WHERE "addressId"=$8`;

          // Update the user's address
          client.query(query, [addressOne, addressTwo, city, province, postalCode, latitude, longitude, addressId]).then(result => {
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

/**
 * Upload the user's profile photo
 */
router.post('/upload_profile_photo', Storage('profile').array('files'), isLoggedIn, (req, res) => {
  const photo = req.files[0];
  let json = {};

  // Check to see if the photo is actually a photo
  if (!getValidImageMimeTypes().includes(photo.mimetype)) {
    return res.status(400).json({
      json: {
        err: {
          message: nls.INVALID_IMAGE_TYPE
        }
      }
    });
  }

  // Add the project's working directory to the path
  const uploadDir = path.join(process.env.PWD, photo.path);

  // Resize the image so it's 500 pixels wide
  processImage({
    width: 500,
    path: uploadDir
  }, (path, err) => {
    if (err) {
      json.err = err;
      return res.status(400).json({json});
    }

    // Create the publically accessible path to the photo by removing '/assets'
    // from the path
    const photoUrl = photo.path.replace(/^(assets)/, "").replace(/\\/g, "/");

    // Connect to the pool, and grab a client
    pool.connect().then(client => {
      const {userId, token} = req.body;

      // Update the user's personal information
      client.query(`UPDATE "userTable" SET "photoUrl"=$1 WHERE "userId"=$2`, [photoUrl, userId]).then(result => {
        // Get the user. The client gets released
        getUser(client, userId, token).then(user => {
          json.user = user;
          res.status(200).json(json);
        }).catch(err => {
          json.err = err;
          res.status(500).json({json});
        });
      }).catch(err => {
        // Release the client back to the pool
        client.release();

        // Return the error
        json.err = err;
        return res.status(500).json({json});
      });
    }).catch(err => {
      json.err = err;
      res.status(500).json({json});
    });
  });
});

/**
 * Upload an item's photos to the server, but don't store in db.
 */
router.post('/upload_item_photos', Storage('items').array('files'), isLoggedIn, (req, res) => {
  const photos = req.files;

  let photoUrls = [];
  let asyncCalls = [];

  photos.forEach(function(photo) {
    // Check to see if the photo is actually a photo
    if (!getValidImageMimeTypes().includes(photo.mimetype)) {
      return res.status(400).json({
        err: {
          message: nls.INVALID_IMAGE_TYPE
        }
      });
    }

    // Add the project's working directory to the path
    const uploadDir = path.join(process.env.PWD, photo.path);

    // Resize the image so it's 500 pixels wide
    asyncCalls.push(new Promise((resolve, reject) => {
      processImage({
        width: 200,
        height: 200,
        path: uploadDir
      }, (file, err) => {
        // set a publicly accessible url
        file = file.replace(/^[^_]*assets/, "").replace(/\\/g, "/");
        photoUrls.push(file);
        if (err) {
          return reject(err);
        }
        resolve(true);
      });
    }));
  });

  Promise.all(asyncCalls).then(() => {
    const {userId, token} = req.body;
    let json = {};

    pool.connect().then(client => {
      getUser(client, userId, token).then(user => {
        json.user = user;
        json.photoUrls = photoUrls;
        res.status(200).json(json);
      }).catch(err => {
        json.err = err;
        res.status(500).json({json});
      });
    }).catch(err => {
      // Release the client back to the pool
      client.release();
      json.err = err;

      // Return the error
      return res.status(500).json({json});
    });
  });
});

export {router as personalInfo}
