import express from 'express';
import {pool} from '../../app';
import {nls} from '../../i18n/en';
import {isLoggedIn} from '../../utils/Utils';

const router = express.Router();
const getRequestsQuery = 'SELECT "rentRequest"."requestId", "rentRequest"."itemId", "rentalItem"."ownerId", "rentRequest"."startDate", "rentRequest"."endDate", "rentRequest"."status", \
                      "rentalItem"."title" AS "itemTitle", concat_ws(\' \', "userTable"."firstName", "userTable"."lastName") AS "ownersName" \
                FROM ("rentalItem" INNER JOIN "rentRequest" ON "rentalItem"."itemId"="rentRequest"."itemId") \
                      INNER JOIN "userTable" ON "rentRequest"."renterId"="userTable"."userId" \
                WHERE "rentRequest"."renterId"=$1';

/**
 * Getting a list of my requests
 */
router.post('/get_my_requests', isLoggedIn, ({body}, res) => {
  // Get the ownerId from the request
  const {userId} = body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {


    client.query(getRequestsQuery, [userId]).then(({rows}) => {
      client.release();

      res.status(200).json({myRequests: rows});
    }).catch(err => {
      client.release();

      console.error('ERROR: ', err.message, err.stack);
      res.status(500).json({err});
    });
  }).catch(err => {
    console.error('ERROR: ', err.message, err.stack);
    res.status(500).json({err});
  });
});

/**
 * Cancelling a rent request
 */
router.post('/cancel_request', isLoggedIn, ({body}, res) => {
  // Get the ownerId from the request
  const {userId, requestId} = body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    // First, double check that this user even owns that request ID
    client.query('SELECT status AS "numRequests" FROM "rentRequest" WHERE "requestId"=$1 AND "renterId"=$2 LIMIT 1', [requestId, userId]).then(({rows}) => {
      // If there is not a request with that ID and renter, throw an unauthorized error
      if (rows.length < 1) {
        client.release();
        return res.status(404).json({
          err: {
            message: nls.UNAUTHORIZED
          }
        });
      }

      // Double check that the request has not been approved or cancelled already
      if (rows[0].status === 'request.status.accepted' || rows[0].status === 'request.status.cancelled') {
        client.release();
        return res.status(500).json({
          err: {
            message: nls.GENERIC_ERROR_MESSAGE
          }
        });
      }

      // Now we can update the status to cancelled
      client.query('UPDATE "rentRequest" SET "status"=$1 WHERE "requestId"=$2', [nls.RRS_REQUEST_CANCELLED, requestId]).then(({rows}) => {
        // Fetch an updated list of the requests and send them back to the client
        client.query(getRequestsQuery, [userId]).then(({rows}) => {
          client.release();

          res.status(200).json({myRequests: rows});
        }).catch(err => {
          client.release();

          console.error('ERROR: ', err.message, err.stack);
          res.status(500).json({err});
        });
      }).catch(err => {
        client.release();

        console.error('ERROR: ', err.message, err.stack);
        res.status(500).json({err});
      });
    }).catch(err => {
      client.release();

      console.error('ERROR: ', err.message, err.stack);
      res.status(500).json({err});
    });
  }).catch(err => {
    console.error('ERROR: ', err.message, err.stack);
    res.status(500).json({err});
  });
});

export {router as myRequests}
