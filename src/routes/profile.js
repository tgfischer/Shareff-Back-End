import express from 'express';
import {pool} from '../app';
import {rollBack} from '../utils/Utils';
import {PERSONAL_INFO_UPDATE_SUCCESS} from '../i18n/en';
const router = express.Router();

/**
 * Get the the rental listings from the query
 */
router.post('/personal_info', (req, res) => {
  // Get the updated personal information from the body
  const {
    userId, addressId, firstName, lastName, addressOne, addressTwo, city, province,
    postalCode, email, password
  } = req.body;

  pool.connect().then(client => {
    // Begin the transaction
    client.query('BEGIN').then(result => {
      let query = `UPDATE "userTable" \
                    SET "firstName"='${firstName}', "lastName"='${lastName}', "email"='${email}'`;

      // Only update the password if the user entered in in the form
      if (password) {
        query += `, "password"='${password}'`;
      }

      query += ` WHERE "userId"='${userId}'`;

      // Update the user's personal information
      client.query(query).then(result => {
        query = `UPDATE "address" \
                  SET "addressOne"='${addressOne}', "addressTwo"='${addressTwo}', "city"='${city}', "province"='${province}', "postalCode"='${postalCode}' \
                  WHERE "addressId"='${addressId}'`;

        // Update the user's address
        client.query(query).then(result => {
          // Finish the transaction
          client.query('COMMIT').then(result => {
            // Return the success message to the client
            res.status(200).json({message: PERSONAL_INFO_UPDATE_SUCCESS});
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

export {router as profile}
