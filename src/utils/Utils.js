import jwt from 'jsonwebtoken';

/**
 * This function retrieves the payload from the JWT (user information). It can
 * also be used to verify that the JWT that was supplied by the client is valid,
 * so the user can access restricted routes.
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
