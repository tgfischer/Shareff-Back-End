import express from 'express';
import bcrypt from 'bcrypt-nodejs';
import {pool} from '../app';
import {rollBack, isLoggedIn} from '../utils/Utils';
import {PERSONAL_INFO_UPDATE_SUCCESS} from '../i18n/en';
const router = express.Router();

/**
 * Get the the rental listings from the query
 */
router.post('/personal_info', isLoggedIn, (req, res) => {
  // Get the updated personal information from the body
  const {
    userId, addressId, firstName, lastName, addressOne, addressTwo, city, province,
    postalCode, email, password
  } = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    // Begin the transaction
    client.query('BEGIN').then(result => {
      let query = `UPDATE "userTable" \
                    SET "firstName"='${firstName}', "lastName"='${lastName}', "email"='${email}'`;

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
            // Return the success message to the client
            res.status(200).json({success: true});
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

router.post('/upload_item', isLoggedIn, (req, res) => {
  // Get the item details from the request
  const {
    title, category, description, price, addressId, terms, userId
  } = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    client.query('BEGIN').then(result => {
      const query = `INSERT INTO "rentalItem" (title, category, description, price, "addressId", "termsOfUse", "ownerId") VALUES ('${title}', ARRAY['{"name":"dvd", "age":22}']::json[], \
      '${description}', '${price}', '${addressId}', '${terms}', '${userId}')`;

      client.query(query).then(result => {
        client.query('COMMIT').then(result => {
          res.status(200).json({success: true});
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

export {router as profile}
