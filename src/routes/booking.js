import express from 'express';
import {pool} from '../app';
import Moment from 'moment';
import {extendMoment} from 'moment-range';
import {nls} from '../i18n/en';
import {isLoggedIn, updateAverageRating} from '../utils/Utils';

const router = express.Router();
const moment = extendMoment(Moment);

/**
 *  The following route will be used to supply the proper information for the /booking page.
 *  A bookingId will be passed to this route in order to query and return the correct info.
 */
router.post('/get_booking_info', (req, res) => {
    const {bookingId} = req.body;
    if (!bookingId) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        /**
         * Necessary information for the booking page:
         *      - All the booking information, such as start date, end date, status and rental item
         *      - All user information, such as name, average rating, photo
         *      - Rental item info such as photo, title
         */
        getBookingInfo(bookingId).then(bookingInfo => {
            res.status(200).json({bookingInfo});
        }).catch(err => {
            console.log(err);
            res.status(500).json({err});
        });
    }
});

const getBookingInfo = (bookingId) => {
    return new Promise((resolve, reject) => {
        pool.connect().then(client => {
            const bookingAndItemInfo = `SELECT "booking".*, "rentalItem"."itemId", "rentalItem"."title", "rentalItem"."photos" \
                                        FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId"="rentalItem"."itemId" \
                                        WHERE "booking"."bookingId"=$1;`;
            client.query(bookingAndItemInfo, [bookingId]).then(result => {
                const booking = result.rows[0];
                const renterInfo = `SELECT * FROM public."userTable" WHERE "userId"=$1;`;
                client.query(renterInfo, [booking.userId]).then(renterRes => {
                    let renter = renterRes.rows[0];
                    renter.rating = null;   // This is default null value for the rating they have provided this booking
                    const ownerInfo = `SELECT "userTable".* \
                                        FROM public."userTable" INNER JOIN public."rentalItem" ON "userTable"."userId" = "rentalItem"."ownerId" \
                                        WHERE "rentalItem"."itemId" = $1;`;
                    client.query(ownerInfo, [booking.itemId]).then(ownerRes => {
                        let owner = ownerRes.rows[0];
                        owner.rating = null;
                        const ratingsQuery = `SELECT * FROM public."userReview" WHERE "bookingId"=$1;`;
                        client.query(ratingsQuery, [bookingId]).then(ratingsRes => {
                            client.release();
                            const ratings = ratingsRes.rows;
                            gatherAllBookingInfo(booking, renter, owner, ratings).then(bookingInfo => {
                                return resolve(bookingInfo);
                            });
                        }).catch(err => {
                            console.log(err);
                            client.release();
                            return reject(err);
                        });
                    }).catch(err => {
                        console.log(err);
                        client.release();
                        return reject(err);
                    });
                }).catch(err => {
                    console.log(err);
                    client.release();
                    return reject(err);
                });
            }).catch(err => {
                console.log(err);
                client.release();
                return reject(err);
            });
        });
    });
}

const gatherAllBookingInfo = (booking, renter, owner, ratings) => {
    return new Promise((resolve, reject) => {
        for (let rating of ratings) {
            if (rating.userIdFrom === renter.userId) {
                renter.rating = rating.rating;
            } else if (rating.userIdFrom === owner.userId) {
                owner.rating = rating.rating;
            }
        }
        const resObj = {
            booking: {
                bookingId: booking.bookingId,
                startDate: booking.startDate,
                endDate: booking.endDate,
                status: booking.status,
                totalCost: booking.totalCost,
                ownerStartConfirm: booking.ownerStartConfirm,
                renterStartConfirm: booking.renterStartConfirm,
                ownerEndConfirm: booking.ownerEndConfirm,
                renterEndConfirm: booking.renterEndConfirm,
                paymentStatus: booking.paymentStatus
            },
            rentalItem: {
                itemId: booking.itemId,
                title: booking.title,
                photos: booking.photos
            },
            owner: owner,
            renter: renter
        };
        return resolve(resObj);
    });
};


/**
 *  The following route will be used to rate the opposite user based on the booking
 *  that was just completed.
 *
 *  @param bookingId => the booking which is being rating
 *  @param ratingUserId => the user making this rating
 *  @param rating => the rating (out of 5) that the user is providing for the other user
 *
 *  Optional params
 *  @param title => the title of the review (or summary)
 *  @param comment => a comment about the rating
 *
 */
router.post('/submit_review', (req, res) => {
    const {bookingId, ratingUserId, rating} = req.body;
    if (!bookingId || !ratingUserId || !rating) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        // Get the full booking information from the id, and the renter's id from the item
        const query = `SELECT "booking".*, "rentalItem"."ownerId" \
                        FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId" = "rentalItem"."itemId" \
                        WHERE "bookingId"=$1;`;
        pool.connect().then(client => {
            client.query(query, [bookingId]).then(bookingRes => {
                const booking = bookingRes.rows[0];
                let userIdFor, userIdFrom;

                // On the booking, there are renter and owner ids. We also have one id of a
                // "ratingUserId". Determine whether the renter or owner is submitting the review
                if (ratingUserId === booking.userId) {
                    // The item renter is reviewing the item owner
                    userIdFrom = booking.userId; // renter
                    userIdFor = booking.ownerId; // owner
                } else if (ratingUserId === booking.ownerId) {
                    // The item owner is reviewing the item renter
                    userIdFrom = booking.ownerId; // owner
                    userIdFor = booking.userId; // renter
                } else {
                    res.status(500).json({
                        err: {
                            message: nls.UNAUTHORIZED
                        }
                    });
                }

                // At this point, there could be two different insertion queries.
                if (req.body.title && req.body.comments) {
                    // 1. Inserting with a title and comments
                    const insQuery = `INSERT INTO public."userReview" ("title", "comments", "userIdFor", "userIdFrom", "rating", "creationTime", "bookingId") \
                                        VALUES($1, $2, $3, $4, $5, $6, $7);`;
                    client.query(insQuery, [req.body.title, req.body.comments, userIdFor, userIdFrom, req.body.rating, moment(), req.body.bookingId]).then(insResult => {
                        client.release();

                        // Async call to update the rating value associated with each user
                        updateAverageRating(booking.ownerId);
                        updateAverageRating(booking.userId);

                        getBookingInfo(bookingId).then(bookingInfo => {
                            res.status(200).json({bookingInfo});
                        }).catch(err => {
                            res.status(500).json({err});
                        });
                    }).catch(err => {
                        console.log(err);
                        client.release();
                        res.status(500).json({err});
                    });
                } else {
                    // 2. Inserting without a title and comments
                    const insQuery = `INSERT INTO public."userReview" ("userIdFor", "userIdFrom", "rating", "creationTime", "bookingId") \
                                        VALUES($1, $2, $3, $4, $5);`;
                    client.query(insQuery, [userIdFor, userIdFrom, rating, moment(), bookingId]).then(insResult => {
                        client.release();

                        // Async call to update the rating value associated with each user
                        updateAverageRating(booking.ownerId);
                        updateAverageRating(booking.userId);

                        getBookingInfo(bookingId).then(bookingInfo => {
                            res.status(200).json({bookingInfo});
                        }).catch(err => {
                            res.status(500).json({err});
                        });
                    }).catch(err => {
                        console.log(err);
                        client.release();
                        res.status(500).json({err});
                    });
                }
            }).catch(err => {
                console.log(err);
                client.release();
                res.status(500).json({err});
            });
        });
    }
});

/**
 * The following route will be used to update the appropriate field in the booking table to confirm/reject the item confirmation.
 *
 * @param bookingId
 * @param userId - the user making this request
 * @param confirm - true if they confirm, false if they reject
 *
 *
 * Need the following new fields on the booking table:
 *  ownerStartConfirm
 *  renterStartConfirm
 *  ownerEndConfirm
 *  renterEndConfirm
 */
router.post('/submit_confirmation', (req, res) => {
    const {bookingId, userId, confirm} = req.body;
    if (!bookingId || !userId || confirm === undefined) {
        res.status(500).json({
            err: {
                message: nls.INVALID_PARAMETER_SET
            }
        });
    } else {
        // Get the full booking information from the id, and the renter's id from the item
        const query = `SELECT "booking".*, "rentalItem"."ownerId" \
                        FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId" = "rentalItem"."itemId" \
                        WHERE "bookingId"=$1;`;
        pool.connect().then(client => {
            client.query(query, [bookingId]).then(bookingRes => {
                const booking = bookingRes.rows[0];
                let updateQuery;
                if (booking.ownerId === userId && booking.status === nls.BOOKING_ACTIVE) {
                    // Owner Start Confirmation
                    updateQuery = `UPDATE "booking" SET "ownerStartConfirm"=$1 WHERE "bookingId"=$2;`;
                } else if (booking.userId === userId && booking.status === nls.BOOKING_ACTIVE) {
                    // Renter Start Confirmation
                    updateQuery = `UPDATE "booking" SET "renterStartConfirm"=$1 WHERE "bookingId"=$2;`;
                } else if (booking.ownerId === userId && booking.status === nls.BOOKING_COMPLETE) {
                    // Owner End Confirmation
                    updateQuery = `UPDATE "booking" SET "ownerEndConfirm"=$1 WHERE "bookingId"=$2;`;
                } else if (booking.userId === userId && booking.status === nls.BOOKING_COMPLETE) {
                    // Renter End Confirmation
                    updateQuery = `UPDATE "booking" SET "renterEndConfirm"=$1 WHERE "bookingId"=$2;`;
                }

                if (updateQuery) {
                    client.query(updateQuery, [confirm, bookingId]).then(result => {
                        client.release();
                        getBookingInfo(bookingId).then(bookingInfo => {
                            res.status(200).json({bookingInfo});
                        }).catch(err => {
                            res.status(500).json({err});
                        });
                    }).catch(err => {
                        console.log(err);
                        client.release();
                        res.status(500).json({err});
                    });
                } else {
                    // Make sure we return with error if we go through this request without updating!
                    res.status(500).json({
                        err: {
                            message: nls.UNAUTHORIZED
                        }
                    });
                }
            }).catch(err => {
                console.log(err);
                client.release();
                res.status(500).json({err});
            });
        });
    }
});

export {router as booking}
