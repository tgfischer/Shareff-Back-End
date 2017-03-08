import express from 'express';
import {pool} from '../app';
import Moment from 'moment';
import {extendMoment} from 'moment-range';
import {getPayload} from '../utils/Utils';
import {nls} from '../i18n/en';

const router = express.Router();
const NUM_PER_PAGE = 10;

const moment = extendMoment(Moment);

/**
 * Get the the rental listings from the query
 */
router.post('/', (req, res) => {
  // Get the variables from URL
  const {
    startDate, endDate, category, page, maxPrice, maxDistance, longitude, latitude
  } = req.body;
  const offset = page && page >= 0 ? page * NUM_PER_PAGE : 0;
  let {q, location} = req.body;

  pool.connect().then(client => {
    // Array to hold the parameters
    const params = [];

    // The beginning of the query
    let query = 'SELECT "rentalItem"."itemId", "rentalItem"."title", "rentalItem"."description", \
                    "rentalItem"."price", "rentalItem"."costPeriod", "rentalItem"."ownerId", "rentalItem"."category", "rentalItem"."photos", \
                    "address"."city", "userTable"."firstName" AS "ownerFirstName", \
                    "userTable"."lastName" AS "ownerLastName" \
                  FROM (("rentalItem" INNER JOIN "address" ON "rentalItem"."addressId"="address"."addressId")\
                    INNER JOIN "userTable" ON "rentalItem"."ownerId"="userTable"."userId")';
    let where = '';

    // If the user typed something into the search box
    if (q) {
      // Replace the spaces with |'s in the query. This allows us to match with each
      // variable in the string
      q = q.replace(/\s+/g, '|');
      params.push(q);

      where += ` WHERE (("rentalItem"."title" ~* $${params.length} OR "rentalItem"."description" ~* $${params.length})`;
    }

    // If the user entered a location
    if (location) {
      // Replace the spaces with |'s in the query. This allows us to match with each
      // variable in the string
      location = location.replace(/\s+/g, '|');
      params.push(location);

      where += `${params.length > 1 ? ' AND' : ' WHERE ('} ("address"."line1" ~* $${params.length} OR \
                  "address"."line2" ~* $${params.length} OR "address"."city" ~* $${params.length} OR \
                  "address"."postalCode" ~* $${params.length})`;
    }

    // If the user wants to filter by price
    if (maxPrice && maxPrice < 2000) {
      params.push(maxPrice);

      where += `${params.length > 1 ? ' AND' : ' WHERE ('} ("rentalItem"."price" <= $${params.length})`;
    }

    // 100 is our upper limit, so if they set it to 2000 then don't filter out
    // items by max distance
    if (maxDistance && maxDistance < 100 && longitude && latitude) {
      params.push(longitude);
      params.push(latitude);
      params.push(maxDistance * 1000); // Calculate the distance, convert from km to meters

      where += `${params.length > 3 ? ' AND' : ' WHERE ('} ST_DWithin("address"."gps", \
        ST_SetSRID(ST_MakePoint($${params.length - 2}::double precision, $${params.length - 1}::double precision), 4326), $${params.length})`;
    }

    // Add the suffix to the query
    where += `${params.length > 0 ? ') AND' : ' WHERE'} "rentalItem"."status" != \'Archived\'`;
    query += where;
    
    // Query the database. ~* matches the regular expression, case insensitive
    // substring limits the amount of characters that are returned
    client.query(query, params).then(({rows}) => {

      // If there is a provided start and end date, we need to filter the listings for what is not booked
      let listings = rows;
      if (category) {
        // If there is a provided category(s), filter out results that do not match these
        filterCategoryListings(listings, category).then(listings => {
          // If there is a provided start and end date, we need to filter the listings for what is not booked        
          if (startDate && endDate) {
            filterAvailableListings(listings, startDate, endDate).then(listings => {
              const listingAmount = listings.length;
              listings = listings.splice(offset, offset+NUM_PER_PAGE);
              res.status(200).json({
                totalNumListings: listingAmount,
                numPerPage: NUM_PER_PAGE,
                listings
              });
            }).catch(err => {
              console.error('ERROR: ', err.message, err.stack);
              res.status(500).json({err});
            });
          } else {
            const listingAmount = listings.length;
            listings = listings.splice(offset, offset+NUM_PER_PAGE);
            res.status(200).json({
              totalNumListings: listingAmount,
              numPerPage: NUM_PER_PAGE,
              listings
            });
          }
        }).catch(err => {
          console.error('ERROR: ', err.message, err.stack);
          res.status(500).json({err});
        });
      } else {
        // If there is a provided start and end date, we need to filter the listings for what is not booked  
        if (startDate && endDate) {
          filterAvailableListings(listings, startDate, endDate).then(listings => {
            const listingAmount = listings.length;
            const spliceAmount = (offset+NUM_PER_PAGE > listingAmount) ? listingAmount : offset+NUM_PER_PAGE;
            console.log(listingAmount, offset, spliceAmount);
            listings = listings.splice(offset, spliceAmount);
            res.status(200).json({
              totalNumListings: listingAmount,
              numPerPage: NUM_PER_PAGE,
              listings
            });
          }).catch(err => {
            console.error('ERROR: ', err.message, err.stack);
            res.status(500).json({err});
          });
        } else {
          const listingsAmount = listings.length;
          listings = listings.splice(offset, offset+NUM_PER_PAGE);
          res.status(200).json({
            totalNumListings: listingsAmount,
            numPerPage: NUM_PER_PAGE,
            listings
          });
        }
      }
    }).catch(err => {
      client.release();
      console.error('ERROR: ', err.message, err.stack);

      // Return the error to the client
      res.status(500).json({err});
    });
  });
});

router.post('/get_rental_item', (req, res) => {
  const {itemId} = req.body;

  pool.connect().then(client => {
    // Get the rental item from the ID
    client.query(`SELECT * FROM "rentalItem" INNER JOIN "address" ON "rentalItem"."addressId"="address"."addressId" WHERE "itemId"=$1 LIMIT 1`, [itemId]).then(result => {
      const {rows} = result;

      // If the if that the user is looking for does not exist
      if (rows.length < 1) {
        client.release();
        return res.status(404).json({
          err: {
            message: nls.ITEM_NOT_FOUND
          }
        });
      }

      // Get the rental item and the owner ID
      const rentalItem = result.rows[0];
      const {ownerId} = rentalItem;

      // Get the owner's information
      client.query(`SELECT "userId", "firstName", "lastName", "email", "photoUrl", "description", "avgRating" FROM "userTable" WHERE "userId"=$1 LIMIT 1`, [ownerId]).then(result => {
        client.release();

        // Set the owner of the item
        rentalItem.owner = result.rows[0];
        res.status(200).json({rentalItem});
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

const filterCategoryListings = (listings, category) => {
  return new Promise((resolve, reject) => {
    const sizeOfListings = listings.length;
    const sizeOfCategories = category.length;
    let count = 0; 
    let filteredListings = [];

    if (sizeOfListings > 0 && sizeOfCategories > 0) {
      for (const listing of listings) {
        count++;
        isCategoryFound(listing, category).then(isFound => {
          if (isFound) {
            filteredListings.push(listing);
          }
          if (count === sizeOfListings) {
            return resolve(filteredListings);
          }
        }).catch(err => {
          return reject(err);
        });
      }
    } else {
      return resolve(listings);
    }
  });
};

const isCategoryFound = (listing, categories) => {
  return new Promise((resolve, reject) => {
    // For each listing, check if any of that listing's categories match to any of the preferred categories
    const sizeOfListCategories = listing.category.length;
    if (sizeOfListCategories > 0) {
      let count = 0;
      for (const listCategory of listing.category) {
        count++;
        if (categories.indexOf(listCategory) > -1) {
          return resolve(true);
        }
        if (count === sizeOfListCategories) {
          return resolve(false);
        }
      }
    } else {
      // This listing has no categories to match with the requested categories
      return resolve(false);
    }
  });
};

const filterAvailableListings = (listings, startDate, endDate) => {
  return new Promise((resolve, reject) => {
    const requestStartDate = moment(new Date(startDate), nls.MOMENT_DATE_FORMAT);
    const requestEndDate = moment(new Date(endDate), nls.MOMENT_DATE_FORMAT);
    const requestRange = moment.range(requestStartDate, requestEndDate);
    const sizeOfListings = listings.length;
    let count = 0;
    let newListings = [];

    if (sizeOfListings > 0) {
      for (const listing of listings) {
        pool.connect().then(client => {
          client.query(`SELECT * FROM "booking" WHERE "itemId"=$1;`, [listing.itemId]).then(result => {
            client.release();
            count++;
            const bookings = result.rows;

            isListingAvailable(requestRange, bookings).then(isAvailable => {
              if (isAvailable) {
                newListings.push(listing);
              }
              if (count === sizeOfListings) {
                return resolve(newListings);
              }
            }).catch(err => {
              console.log(err);
              return reject(err);
            });
          }).catch(err => {
            console.log(err);
            return reject(err);
          });
        });
      }
    } else {
      return resolve(listings);
    }
  });

};

const isListingAvailable = (requestRange, bookings) => {
  return new Promise((resolve, reject) => {
    const sizeOfBookings = bookings.length;
    let count = 0;
    if (sizeOfBookings > 0) {
      for (const booking of bookings) {
        count++;
        const bookedStartDate = moment(booking.startDate, nls.MOMENT_DATE_FORMAT);
        const bookedEndDate = moment(booking.endDate, nls.MOMENT_DATE_FORMAT);
        const bookedRange = moment.range(bookedStartDate, bookedEndDate);

        if (bookedRange.overlaps(requestRange, {adjacent: true}) || requestRange.overlaps(bookedRange, {adjacent:true})) { // true)
          return resolve(false);
        }
        if (count === sizeOfBookings) {
          return resolve(true);
        }
      }
    } else {
      return resolve(true);
    }
  });
};

export {router as listings}
