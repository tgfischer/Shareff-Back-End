import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import multer from 'multer';
import uuid from 'node-uuid';
import path from 'path';
import {pool} from '../app';
import {
  rollBack, isLoggedIn, processImage, getValidImageMimeTypes, getUser
} from '../utils/Utils';
import {nls} from '../i18n/en';

const router = express.Router();

// Set the profile photo destination, and make sure that you attach the extension
// to the uploaded file
const storage = multer.diskStorage({
  destination: './assets/photos/uploads/profile',
  filename: (req, file, next) => {
    next(null, uuid.v4().toString('hex') + path.extname(file.originalname))
  }
});

/**
 * Update the user's personal information
 */
router.post('/personal_info', isLoggedIn, (req, res) => {
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
        query = `UPDATE "address" \
                  SET "line1"='${addressOne}', "line2"='${addressTwo}', "city"='${city}', "province"='${province}', "postalCode"='${postalCode}' \
                  WHERE "addressId"='${addressId}'`;

        // Update the user's address
        client.query(query).then(result => {
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
      }).catch(err => {
        rollBack(err, client, res);
      });
    }).catch(err => {
      rollBack(err, client, res);
    });
  });
});

/**
 * Upload a rental item
 */
router.post('/upload_item', isLoggedIn, (req, res) => {
  // Get the item details from the request
  const {
    title, category, description, price, addressId, terms, userId
  } = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = `INSERT INTO "rentalItem" (title, category, description, price, "addressId", "termsOfUse", "ownerId") VALUES ($1, $2, $3, $4, $5, $6, $7)`;

    client.query(query, [title, category, description, price, addressId, terms, userId]).then(result => {
      client.release();
      res.status(200).json({success: true});
    }).catch(err => {
      client.release();
      res.status(500).json({err});
    });
  });
});

/**
 * Upload the user's profile photo
 */
router.post('/upload_profile_photo', multer({storage}).array('files'), isLoggedIn, (req, res) => {
  const photo = req.files[0];

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
  processImage({
    width: 500,
    path: uploadDir
  }, (err) => {
    if (err) {
      return res.status(400).send({err});
    }

    // Create the publically accessible path to the photo by removing '/assets'
    // from the path
    const photoUrl = photo.path.replace(/^(assets)/, "").replace(/\\/g, "/");

    // Connect to the pool, and grab a client
    pool.connect().then(client => {
      // Update the user's personal information
      client.query(`UPDATE "userTable" SET "photoUrl"=$1`, [photoUrl]).then(result => {
        const {userId, token} = req.body;

        // Get the user. The client gets released
        getUser(client, userId, token).then(user => {
          res.status(200).json({user});
        }).catch(err => {
          res.status(500).json({err});
        });
      }).catch(err => {
        // Release the client back to the pool
        client.release();

        // Return the error
        return res.status(500).json({err});
      });
    });
  });
});

export {router as profile}
