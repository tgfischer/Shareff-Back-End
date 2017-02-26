import express from 'express'; 
import schedule from 'node-schedule';
import Moment from 'moment'; 
import {extendMoment} from 'moment-range'; 
import {pool} from '../app';
import {
    sendStartReminders, sendStartConfirmations, sendEndReminders, sendEndConfirmations
} from '../utils/EmailNotification';
import {
    getNotificationLevel
} from '../utils/Utils';

const router = express.Router();
const moment = extendMoment(Moment);        // create a moment object with more capability (such as date ranges)
/*
ALTER TABLE public.booking ADD COLUMN "metaStatus" varchar(50);
ALTER TABLE public.booking ADD COLUMN "status" varchar(30);
*/

/** 
 * The following variables define function calls based on cron dates. Cron schedules use 6 parameters to specify date:
 * 
 *  1) seconds (0-59) - optional
 *  2) minutes (0-59)
 *  3) hours (0-23) 
 *  4) day of month (1-31) 
 *  5) month (1-12)
 *  6) day of week (0-7) (Sunday can be 0 or 7)
 * 
 */

// The following job will be called every 5 minutes! -- Thanks StackOverflow
let timeRule = new schedule.RecurrenceRule();
timeRule.minute = new schedule.Range(0, 59, 5);

const timeBeforeBooking = 1;    // This value is 1 hour before
const timeAfterBooking = -0.25; // This value is 15 minutes after

const tracker = schedule.scheduleJob(timeRule, () => {
    console.log("Working on tracking...");

    const query = `SELECT "booking".*, "rentalItem"."ownerId" \ 
                    FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId" = "rentalItem"."itemId";`; 
    pool.connect().then(client => {
        client.query(query).then(result => {
            //client.release();
            
            const bookings = result.rows;
            for (let i = 0; i < bookings.length; i++) {
                const booking = bookings[i];
                const now = moment(); 
                const start = moment(booking.startDate); 
                const end = moment(booking.endDate);

                // Get the duration from start to now 
                const nowToStart = (moment.duration(start.diff(now))).asHours();
                const nowToEnd = (moment.duration(end.diff(now))).asHours();
                const notificationStatus = booking.metaStatus;

                const updateQuery = `UPDATE "booking" SET "metaStatus"=$1 WHERE "bookingId"=$2;`;
                if (nowToStart > 0 && nowToStart <= timeBeforeBooking && notificationStatus.equals("Pending Booking Start")) {
                    // Case 1: Need to send a Booking Start Reminder

                    // Send the start reminder 
                    sendStartReminders(booking);

                    // Update this booking's metaStatus to be "Start Reminder Sent"
                    client.query(query1, ["Start Reminder Sent", booking.bookingId]).then(result => {
                        client.release();
                    }).catch(err => {
                        client.release();
                    });

                } else if (nowToStart < 0 && nowToStart <= timeAfterBooking && notificationStatus.equals("Start Reminder Sent")) {
                    // Case 2: Need to send a Booking Start Confirmation

                    // Send the start confirmation 
                    sendStartConfirmations(booking);

                    // Update the booking's metaStatus to be "Start Confirmation Sent"
                    client.query(query1, ["Start Confirmation Sent", booking.bookingId]).then(result => {
                        client.release();
                    }).catch(err => {
                        client.release();
                    });

                } else if (nowToEnd > 0 && nowToEnd <= timeBeforeBooking && notificationStatus.equals("Start Confirmation Sent")) {
                    // Case 3: Need to send a Booking End Reminder

                    // Send the end reminder
                    sendEndReminder(booking);

                    // Update the booking's metaStatus to be "End Reminder Sent"
                    client.query(query1, ["End Reminder Sent", booking.bookingId]).then(result => {
                        client.release();
                    }).catch(err => {
                        client.release();
                    });

                } else if (nowToEnd < 0 && nowToEnd <= timeAfterBooking && notificationStatus.equals("End Reminder Sent")) {
                    // Case 4: Need to send a Booking End Confirmation 

                    // Send the end confirmation
                    sendEndConfirmations(booking);

                    // Update the booking's metaStatus to be "End Confirmation Sent"
                    client.query(query1, ["End Confirmation Sent", booking.bookingId]).then(result => {
                        client.release();
                    }).catch(err => {
                        client.release();
                    });
                } else {
                    client.release();
                }
            }

        }).catch(err => {
            client.release();
            console.log(err);
        }); // end booking query
    }); // end pool connect

});

const updateBookingStatuses = schedule.scheduleJob(timeRule, () => {
    console.log("Updating tracking status...");

    const query = `SELECT "booking".*, "rentalItem"."ownerId" \ 
                    FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId" = "rentalItem"."itemId";`; 

    pool.connect().then(client => {
        client.query(query).then(result => {

        });
    });
});

// const hoursAway = 2;    // this constant determines how close (in hours) the time needs to be before it sends the reminder notification
// const reminder = schedule.scheduleJob(timeRule, () => {
//     console.log("Calling 'reminder' job!");
//     // To create all reminders, we must search the database BOOKINGS and compare their start dates and end dates 
//     const query = `SELECT "booking".*, "rentalItem"."ownerId" \ 
//                     FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId" = "rentalItem"."itemId";`; //
//     pool.connect().then(client => {
//         client.query(query).then(result => {
//             client.release();

//             // We want to send a reminder iff the start date is within 2 hours away! 
//             for (let i = 0; i < result.rows.length; i++) {
//                 if (result.rows[i] && result.rows[i].startDate && result.rows[i].endDate) {
//                     let now = moment(); 
//                     let end = moment(result.rows[i].startDate); 
//                     let duration = moment.duration(end.diff(now));
//                     let hoursDiff = duration.asHours();
//                     console.log("HOURS DIFF 1: " + hoursDiff);

//                     // If the amount of hours difference between now and the start date is <= 2, we can send our rental item starting reminder emails to owner and renter
//                     if (hoursDiff <= hoursAway && hoursDiff > 0) {
//                         console.log("BOOKING STARTS IN <= 2 HOURS!");

//                         /* If we are here, this means that the booking starts in less than 2 hours. At this point, send an email notification to the renter
//                             reminding them about the booking. Also send an email notification to the owner, reminding them. */

//                         sendRenterReminderNotification(true, result.rows[i]);
//                         sendOwnerReminderNotification(true, result.rows[i]);

//                     } else {
//                         // If its not 2 hours before the start date - it might be 2 hours away from the end date; let's check for that
//                         now = moment();
//                         end = moment(result.rows[i].endDate);
//                         duration = moment.duration(end.diff(now));
//                         hoursDiff = duration.asHours();
//                         console.log("HOURS DIFF 2: " + hoursDiff);

//                         if (hoursDiff <= hoursAway && hoursDiff > 0) {
//                             console.log("BOOKING ENDS IN <= 2 HOURS");

//                             /* If we are here, this means that the booking ends in less than 2 hours. At this point, send an email notification to the renter 
//                                 reminding them they must return their booking. Also send an email notification to the owner, reminding them their item will be returned. */

//                             sendRenterReminderNotification(false, result.rows[i]);
//                             sendOwnerReminderNotification(false, result.rows[i]);

//                         }
//                     }
//                 }
//             }
            
//         }).catch(err => {
//             console.log("ERROR DURING SELECT FROM BOOKING, REMINDER" + err);  
//         });
//     });

// });

// const minsAfter = 20;       // this constant determines the amount of minutes after start/end booking times before sending out the appropriate confirmation emails
// const confirmation = schedule.scheduleJob(timeRule, () => {
//     console.log("Calling 'confirmation' job!");
//     const query = `SELECT "booking".*, "rentalItem"."ownerId" \ 
//                     FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId" = "rentalItem"."itemId";`; 
//     pool.connect().then(client => {
//         client.query(query).then(result => {
//             client.release();

//             // We want to send a reminder iff the start date passed 20 minutes ago! 
//             for (let i = 0; i < result.rows.length; i++) {
//                 if (result.rows[i] && result.rows[i].startDate && result.rows[i].endDate) {
//                     let end = moment(result.rows[i].endDate); 
//                     let now = moment(); 
//                     let duration = moment.duration(now.diff(end));
//                     let minsDiff = duration.asMinutes();
//                     console.log("MINS DIFF 1: " + minsDiff);

//                     // If the amount of minutes difference between now and the end date is >= 25, we can send our rental item starting confirmation emails to owner and renter
//                     if (minsDiff >= minsAfter) {
//                         console.log("BOOKING ENDED >= 20 MINUTES AGO");

//                         /* If we are here, this means that the booking began more than 20 minutes ago. At this point, send an email notification to the renter
//                             asking them to confirm they have received the item. Also send an email notification to the owner, asking to confirm they delivered the item. */

//                         sendRenterConfirmationNotification(false, result.rows[i]);
//                         sendOwnerConfirmationNotification(false, result.rows[i]);

//                     } else {
//                         // If its not 2 hours before the start date - it might be 2 hours away from the end date; let's check for that
//                         end = moment(result.rows[i].startDate);
//                         now = moment();
//                         duration = moment.duration(now.diff(end));
//                         minsDiff = duration.asMinutes();
//                         console.log("MINS DIFF 2: " + minsDiff);

//                         if (minsDiff >= minsAfter) {
//                             console.log("BOOKING BEGAN >= 20 MINUTES AGO");

//                             /* If we are here, this means that the booking ended more than 20 minutes ago. At this point, send an email notification to the renter
//                             asking them to confirm they have returned the item. Also send an email notification to the owner, asking to confirm they received their item back. */

//                             sendRenterConfirmationNotification(true, result.rows[i]);
//                             sendOwnerConfirmationNotification(true, result.rows[i]);

//                         }
//                     }
//                 }
//             }
//         }).catch(err => {
//             console.log("ERROR DURING SELECT FROM BOOKING, CONFIRMATION " + err);  
//         });
//     });
// });

// // Schedule removal of old rent requests? 

// // Schedule removal of old booking rows?

export {router as tracking}