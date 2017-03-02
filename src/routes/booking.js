import express from 'express'; 
import {pool} from '../app';
import Moment from 'moment';
import {extendMoment} from 'moment-range';
import {nls} from '../i18n/en';
import {isLoggedIn} from '../utils/Utils';

const router = express.Router(); 
const moment = extendMoment(Moment);

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
router.post('/submit-review', (req, res) => {
    if (!req.body.bookingId || !req.body.ratingUserId || !req.body.rating) {
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
            client.query(query, [req.body.bookingId]).then(bookingRes => {
                const booking = bookingRes.rows[0];
                console.log(booking);
                let userIdFor, userIdFrom;

                // On the booking, there are renter and owner ids. We also have one id of a 
                // "ratingUserId". Determine whether the renter or owner is submitting the review
                if (req.body.ratingUserId === booking.userId) {
                    // The item renter is reviewing the item owner
                    userIdFrom = booking.userId; // renter
                    userIdFor = booking.ownerId; // owner
                } else if (req.body.ratingUserId === booking.ownerId) {
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
                    const insQuery = `INSERT INTO public."userReview" ("title", "comments", "userIdFor", "userIdFrom", "rating", "creationTime") \
                                        VALUES($1, $2, $3, $4, $5, $6);`;
                    client.query(insQuery, [req.body.title, req.body.comments, userIdFor, userIdFrom, req.body.rating, moment()]).then(insResult => {
                        client.release();
                        res.status(200).json({success: true});

                    }).catch(err => {
                        console.log(err);
                        client.release();
                        res.status(500).json({err});   
                    });
                } else {
                    // 2. Inserting without a title and comments
                    const insQuery = `INSERT INTO public."userReview" ("userIdFor", "userIdFrom", "rating", "creationTime") \
                                        VALUES($1, $2, $3, $4);`;
                    client.query(insQuery, [userIdFor, userIdFrom, req.body.rating, moment()]).then(insResult => {
                        client.release();
                        res.status(200).json({success: true});
                        
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

export {router as booking}

