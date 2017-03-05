import jwt from 'jsonwebtoken';
import lwip from 'lwip';
import validator from 'validator';
import multer from 'multer';
import uuid from 'node-uuid';
import path from 'path';
import {nls} from '../i18n/en';
import {pool} from '../app';
import stripeWrapper from 'stripe';
import moment from 'moment';

/**
 * This function generates the thumbnail path for images
 *
 * @param path
 *    This is the path to the image
 */
const getThumbnailPath = ({path}) => {
  const parts = path.split(".");
  let thumbnail = path;

  if (parts.length > 1) {
    parts[parts.length - 2] += "_thumbnail";
    thumbnail = parts.join(".");
  }

  return thumbnail;
};

/**
 * This function create a stripe object using the api key
 */
export const stripe = stripeWrapper(process.env.STRIPE_API_KEY);

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
 * This is a middleware function that determines if the user is currently logged
 * in
 */
export const isLoggedIn = (req, res, next) => {
  const {userId, token} = req.body;

  // Get the userId from the token
  getPayload(token).then(payload => {
    // Make sure that the userIds match
    if (userId === payload) {
      next();
    } else {
      // If they don't, then the user is a flithy phony. Don't let them continue
      // with the request
      res.status(401).json({
        err: {
          message: nls.UNAUTHORIZED
        }
      });
    }
  }).catch(err => {
    // If something went wrong while verifying the token, then throw an error,
    // and don't let them continue with the request
    res.status(500).json({
      err: {
        message: nls.GENERIC_ERROR_MESSAGE
      }
    });
  });
};

/**
 * This is a middleware function that determines if the user is currently logged
 * out
 */
export const isLoggedOut = (req, res, next) => {
  const {user, token} = req.body;

  // If the user sends a user object or a token, don't let them continue with
  // the request
  if (!token && !user) {
    next();
  } else {
    res.status(401).json({
      err: {
        message: nls.UNAUTHORIZED
      }
    });
  }
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
export const rollBack = (err, client, res, stripe, customer) => {
  // if stripe param was passed, delete customer from stripe db
  if (stripe) {
    stripe.customers.del(customer.id);
  }

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

/**
 * Processes uploaded images, and resizes them to the desired size
 *
 * @param args
 *    Valid arguments:
 *      1. path   - The path to the uploaded images
 *      2. width  - The desired width of the image. Height auto scales
 *      3. height - The desired height of the image. Width auto scales
 * @param next
 *    The callback for the function, so it can be used with async in batch
 *    uploads
 */
export const processImage = ({path, width, height, isThumbnail}, next) => {
  // Open the photo so it can be resized
  lwip.open(path, (err, image) => {
    if (err) {
      return next(err);
    }

    // Default is to not scale the image
    let ratio = 1;

    if (width) {
      ratio = width / image.width();
    } else if (height) {
      ratio = height / image.height();
    }

    // Prevent upscaling if the image is too small
    ratio = ratio > 1 ? 1 : ratio;

    // Scale the image, and save it
    image.batch().scale(ratio).writeFile(path, (err) => {
      if (isThumbnail) {
        // Resize the image so its 500 pixels wide
        ratio = 500 / image.width();

        // Generate the thumbnail path
        path = getThumbnailPath({path});

        // Scale the thumbnail, and save it
        image.batch().scale(ratio).writeFile(path, (err) => {
          return next(path, err);
        });
      } else {
        return next(path, err);
      }
    });
  });
};

/**
 * Get a list of valid photo mimetypes. It's used to validate that the files
 * uploaded are actually photos, and not malicious
 */
export const getValidImageMimeTypes = () => ([
  'image/jpeg',
  'image/png',
  'image/bmp',
  'image/gif'
]);

/**
 * The url for the placeholder photo
 */
export const PLACEHOLDER_PHOTO_URL = '/photos/white-image.png';

/**
 * Get the user from the database. This function releases the client after the
 * query
 *
 * @param client
 *    The client that will be used to query the database
 * @param userId
 *    The userId of the desired user
 * @param token
 *    The user's authentication token
 */
export const getUser = (client, userId, token) => {
  // Make a new promise
  return new Promise((resolve, reject) => {
    // Get the user information from the database
    client.query(`SELECT * FROM "userTable" INNER JOIN "address" ON "userTable"."userId"="address"."userId" WHERE "userTable"."userId"=$1 LIMIT 1`, [userId]).then(result => {
      // Release the client
      client.release();

      // Get the user
      const user = result.rows[0];

      // Delete the password
      delete user.password;

      // Set the token
      user.token = token;

      // Reolve the promise with the user
      resolve(user);
    }).catch(err => {
      // Release the client
      client.release();

      // Reject the promise with the error
      reject(err);
    });
  });
};

/**
 * Set the storage object with the proper destination url
 *
 * @param url
 *    the destination url of where to save the photos
 */
export const Storage = (url) => {
  // Set the profile photo and item photo destinations
  // and make sure that you attach the extension to the uploaded file
  const mult = multer({
    storage: multer.diskStorage({
      destination: (req, file, next) => {
        next(null, `./assets/photos/uploads/${url}`);
      },
      filename: (req, file, next) => {
        next(null, uuid.v4().toString('hex') + path.extname(file.originalname))
      }
    })
  });

  return mult;
}

/**
 * Convert date from front end format, Month Year, ex: April 2017
 * to db format, {month: month, year: year}, ex: {month: April, year: 2017}
 * @param date
 *    the date to convert
 */
export const convertDate = (date) => {
   const expDateFull = new Date(date);
   const expDate = {
    month: expDateFull.getMonth()+1, //getMonth is 0 indexed
    year: expDateFull.getFullYear(),
    day: expDateFull.getDate()
   }

   return expDate;
}

/**
 * Calcualte the total cost of a rent request
 * @param startDate
 *   the start date of a request
 * @param endDate
 *   the end date of a request
 * @param price
 *   the price of a request
 */
 export const calculatePrice = (startDate, endDate, price) => {
   const start = moment(startDate);
   const end = moment(endDate);
   const duration = moment.duration(end.diff(start)).asDays();
   const totalPrice = (duration * price).toFixed(2);
   return totalPrice;
 }

/**
 * Update the average rating value of a specified user to include a new rating
 */
export const updateAverageRating = (userId) => {
  pool.connect().then(client => {
    const query = `SELECT "rating" FROM public."userReview" WHERE "userIdFor"=$1;`;
    client.query(query, [userId]).then(result => {
      const ratings = result.rows;
      const size = ratings.length;

      let average = 0;
      for (let i = 0; i < size; i++) {
        average += ratings[i].rating;
      }
      average = average/size;

      const newRatingQuery = `UPDATE "userTable" SET "avgRating"=$1 WHERE "userId"=$2;`;
      client.query(newRatingQuery, [average, userId]).then(result => {
        client.release();
      }).catch(err => {
        client.release();
        console.log(err);
      });
    }).catch(err => {
      console.log(err);
      client.release();
    });
  });
};

export const getIncomingRequests = (userId) => {
  return new Promise((resolve, reject) => {
    pool.connect().then(client => {
      const query = 'SELECT "rentRequest"."requestId", "rentRequest"."itemId", "rentRequest"."renterId", "rentRequest"."startDate", "rentRequest"."endDate", "rentRequest"."status", \
                            "rentalItem"."title" AS "itemTitle", concat_ws(\' \', "userTable"."firstName", "userTable"."lastName") AS "rentersName" \
                      FROM ("rentalItem" INNER JOIN "rentRequest" ON "rentalItem"."itemId"="rentRequest"."itemId") \
                            INNER JOIN "userTable" ON "rentRequest"."renterId"="userTable"."userId" \
                      WHERE "rentalItem"."ownerId"=$1 AND "rentRequest"."status"=$2;';

      client.query(query, [userId, nls.RRS_REQUEST_PENDING]).then(result => {
        client.release();

        const requests = result.rows;
        return resolve(requests);
      }).catch(err => {
        client.release();

        console.error('ERROR: ', err.message, err.stack);
        return reject(err);
      });
    }).catch(err => {
      console.error('ERROR: ', err.message, err.stack);
      return reject(err);
    });
  });
};

export const getNotificationLevel = (metaStatus) => {
  switch(metaStatus) {
    case "Pending Status":
      return 0;
    case "Start Reminder Sent":
      return 1;
    case "Start Confirmation Sent":
      return 2;
    case "End Reminder Sent":
      return 3;
    case "End Confirmation Sent":
      return 4;
    default:
      return 0;
  }
}
