import jwt from 'jsonwebtoken';

/**
 * This function retrieves the payload from the JWT (user information). It can
 * also be used to verify that the JWT that was supplied by the client is valid,
 * so the user can access restricted routes.
 *
 * @param token
 *    The JSON Web Token
 *
 * Returns a promise, so you can do:
 *
 *    import {getPayload} from '../utils/Utils';
 *
 *    getPayload(token).then(payload => {
 *      // Do something
 *    }).catch(err => {
 *      // Set the status to 401 Unauthorized, and return the error
 *      return res.status(401).json({err});
 *    });
 */
export const getPayload = (token) => {
  // Make a new promise
  return new Promise((resolve, reject) => {
    // Verify that the token is valid using the JWT secret that was used to sign
    // the user when they logged in
    jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
      if (err) {
        return reject(err);
      }

      return resolve(payload);
    });
  });
};

/**
 * This function is used to rollback any transactions that have occured, due to
 * an error.
 *
 * @param err
 *    The error that occured. Must have a property called message
 * @param client
 *    The client that has been executing the queries
 */
export const rollBack = (err, client, res) => {
  client.query('ROLLBACK', () => {
    // Release the client back to the pool
    client.release();
    console.log(`ERROR: ${err.message}\n\nROLLING BACK TRANSACTION (CHOO CHOO!)\n`);

    // Wait 3 seconds before returning the error
    setTimeout(() => {
      // Return the error
      res.status(500).json({err});
    }, 3000);
  }).catch(err => {
    // Something very wrong has happened if we're here...
    // Release the client back to the pool
    client.release();

    // Return the error
    res.status(500).json({err});
  });
};
