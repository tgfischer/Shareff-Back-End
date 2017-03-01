import express from 'express'; 
import schedule from 'node-schedule';
import Moment from 'moment'; 
import {extendMoment} from 'moment-range'; 
import {nls} from '../i18n/en';
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
    console.log("Tracking enabled");

    const query = `SELECT "booking".*, "rentalItem"."ownerId" \ 
                    FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId" = "rentalItem"."itemId";`; 
    pool.connect().then(client => {
        client.query(query).then(result => {
            client.release();

            const bookings = result.rows;
            for (let i = 0; i < bookings.length; i++) {
                const booking = bookings[i];
                const notificationMetaStatus = booking.metaStatus;

                if (notificationMetaStatus == nls.BMS_END_CONF_SENT) {
                    console.log("Moving on up -- ");
                    continue;   // If the booking has already ended, then continue to the next booking
                }
                
                const now = moment(); 
                const start = moment(booking.startDate); 
                const end = moment(booking.endDate);

                // Get the duration from start to now 
                const nowToStart = (moment.duration(start.diff(now))).asHours();
                const nowToEnd = (moment.duration(end.diff(now))).asHours();

                if (nowToStart > 0 && nowToStart <= timeBeforeBooking && (notificationMetaStatus == nls.BMS_PENDING_START)) {
                    // Case 1: Need to send a Booking Start Reminder
                    console.log("Send Start Reminders");
                    sendStartReminders(booking);

                    // Update this booking's metaStatus to be "Start Reminder Sent"
                    updateBookingMetaStatus(nls.BMS_START_REM_SENT, booking.bookingId); 

                } else if (nowToStart < 0 && nowToStart <= timeAfterBooking && (notificationMetaStatus == nls.BMS_START_REM_SENT)) {
                    // Case 2: Need to send a Booking Start Confirmation
                    console.log("Send Start Confirmations");
                    sendStartConfirmations(booking);

                    // Update the booking's metaStatus to be "Start Confirmation Sent"
                    updateBookingMetaStatus(nls.BMS_START_CONF_SENT, booking.bookingId);

                } else if (nowToEnd > 0 && nowToEnd <= timeBeforeBooking && (notificationMetaStatus == nls.BMS_START_CONF_SENT)) {
                    // Case 3: Need to send a Booking End Reminder
                    console.log("Send End Reminders");
                    sendEndReminders(booking);

                    // Update the booking's metaStatus to be "End Reminder Sent"
                    updateBookingMetaStatus(nls.BMS_END_REM_SENT, booking.bookingId);

                } else if (nowToEnd < 0 && nowToEnd <= timeAfterBooking && (notificationMetaStatus == nls.BMS_END_REM_SENT)) {
                    // Case 4: Need to send a Booking End Confirmation 
                    console.log("Send End Confirmations");
                    sendEndConfirmations(booking);

                    // Update the booking's metaStatus to be "End Confirmation Sent"
                    updateBookingMetaStatus(nls.BMS_END_CONF_SENT, booking.bookingId);

                } 
            }
        }).catch(err => {
            client.release();
            console.log(err);
        }); // end booking query
    }).catch(err => {
        console.log(err);  
    }); // end pool connect
});

const updateBookingStatuses = schedule.scheduleJob(timeRule, () => {
    console.log("Updating booking status");

    const query = `SELECT "booking".*, "rentalItem"."ownerId" \ 
                    FROM public."booking" INNER JOIN public."rentalItem" ON "booking"."itemId" = "rentalItem"."itemId";`; 

    pool.connect().then(client => {
        client.query(query).then(result => {
            const bookings = result.rows;
            for (let i = 0; i < bookings.length; i++) {
                const booking = bookings[i];
                const status = booking.status; 
                const metaStatus = booking.metaStatus;

                if (status == nls.BOOKING_COMPLETE) {
                    continue;   // If the booking is already complete, move on to the next booking
                }

                if (status == nls.BOOKING_PENDING && metaStatus == nls.BMS_START_CONF_SENT) {
                    updateBookingStatus(nls.BOOKING_ACTIVE, booking.bookingId);

                } else if (status == nls.BOOKING_ACTIVE && metaStatus == nls.BMS_END_CONF_SENT) {
                    updateBookingStatus(nls.BOOKING_COMPLETE, booking.bookingId);

                } 
            }

        }).catch(err => {
            client.release();
            console.log(err);
        });
    }).catch(err => {
        console.log(err);  
    });
});

// The following function is just used to change the status of the bookings 
const updateBookingStatus = (newStatus, bookingId) => {
    const updateQuery = `UPDATE "booking" SET "status"=$1 WHERE "bookingId"=$2;`;
    pool.connect().then(client => {
        client.query(updateQuery, [newStatus, bookingId]).then(result => {
            client.release();
        }).catch(err => {
            client.release();
            console.log(err);
        });
    });
};

// The following function is just used to change the meta status of the bookings
const updateBookingMetaStatus = (newStatus, bookingId) => {
    const updateQuery = `UPDATE "booking" SET "metaStatus"=$1 WHERE "bookingId"=$2;`;
    pool.connect().then(client => {
        client.query(updateQuery, [newStatus, bookingId]).then(result => {
            client.release();
        }).catch(err => {
            client.release();
            console.log(err);
        });
    });
};

export {router as tracking}