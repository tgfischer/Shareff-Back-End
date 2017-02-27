import express from 'express'; 
import schedule from 'node-schedule';
import Moment from 'moment'; 
import {extendMoment} from 'moment-range'; 
import {pool} from '../app';
import {
    sendStartReminders, sendStartConfirmations, sendEndReminders, sendEndConfirmations
} from '../utils/EmailNotification';

const router = express.Router();
const moment = extendMoment(Moment);        // create a moment object with more capability (such as date ranges)

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
            
            const bookings = result.rows;
            for (let i = 0; i < bookings.length; i++) {
                const booking = bookings[i];
                console.log("Booking Number: " + booking.bookingId);

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
                    client.query(updateQuery, ["Start Reminder Sent", booking.bookingId]).then(result => {
                        client.release();
                        console.log("Update Success: Start Reminders");
                    }).catch(err => {
                        client.release();
                        console.log("Update Error: Start Reminders: " + err);
                    });

                } else if (nowToStart < 0 && nowToStart <= timeAfterBooking && notificationStatus.equals("Start Reminder Sent")) {
                    // Case 2: Need to send a Booking Start Confirmation

                    // Send the start confirmation 
                    sendStartConfirmations(booking);

                    // Update the booking's metaStatus to be "Start Confirmation Sent"
                    client.query(updateQuery, ["Start Confirmation Sent", booking.bookingId]).then(result => {
                        client.release();
                        console.log("Update Success: Start Confirmations");
                    }).catch(err => {
                        client.release();
                        console.log("Update Error: Start Confirmations: " + err);
                    });

                } else if (nowToEnd > 0 && nowToEnd <= timeBeforeBooking && notificationStatus.equals("Start Confirmation Sent")) {
                    // Case 3: Need to send a Booking End Reminder

                    // Send the end reminder
                    sendEndReminders(booking);

                    // Update the booking's metaStatus to be "End Reminder Sent"
                    client.query(updateQuery, ["End Reminder Sent", booking.bookingId]).then(result => {
                        client.release();
                        console.log("Update Success: End Reminders");
                    }).catch(err => {
                        client.release();
                        console.log("Update Error: End Reminders: " + err);
                    });

                } else if (nowToEnd < 0 && nowToEnd <= timeAfterBooking && notificationStatus.equals("End Reminder Sent")) {
                    // Case 4: Need to send a Booking End Confirmation 

                    // Send the end confirmation
                    sendEndConfirmations(booking);

                    // Update the booking's metaStatus to be "End Confirmation Sent"
                    client.query(updateQuery, ["End Confirmation Sent", booking.bookingId]).then(result => {
                        client.release();
                        console.log("Update Success: End Confirmations")
                    }).catch(err => {
                        client.release();
                        console.log("Update Error: End Confirmations: " + err);
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

// const updateBookingStatuses = schedule.scheduleJob(timeRule, () => {
//     console.log("Updating tracking status...");

//     const query = `SELECT "booking".*, "rentalItem"."ownerId" \ 
//                     FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId" = "rentalItem"."itemId";`; 

//     pool.connect().then(client => {
//         client.query(query).then(result => {

//         });
//     });
// });

export {router as tracking}