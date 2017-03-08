import {nls} from '../i18n/en';
import {pool} from '../app';
import {
    getRentRequestNotificationTemplate,
    getRenterStartReminderNotificationTemplate,
    getRenterEndReminderNotificationTemplate,
    getOwnerStartReminderNotificationTemplate,
    getOwnerEndReminderNotificationTemplate,
    getRenterStartConfirmationNotificationTemplate,
    getRenterEndConfirmationNotificationTemplate,
    getOwnerStartConfirmationNotificationTemplate,
    getOwnerEndConfirmationNotificationTemplate,
    getRentRequestAcceptedNotificationTemplate,
    getRentRequestRejectedNotificationTemplate,
    getRentRequestExpiredNotificationTemplate
} from '../templates/emails';
import nodemailer from 'nodemailer';

/**
 * The following utility methods will be used to send specific types of
 * email notifications to users.
 *
 * Email notifications may include:
 *      - someone wants to rent your item!
 *  Upcoming reminders
 *      - your booking is coming up!
 *      - your item is being rented soon!
 *      - your rented item is due back soon!
 *      - your item is being returned soon!
 *  Confirmation of items
 *      - did you receive your rental item?
 *      - did you deliver your rental item?
 *      - did you return your rental item?
 *      - was your rental item returned?
 */

const transporter = nodemailer.createTransport({
    service: "Gmail",
    debug: true,
    auth: {
        user : process.env.INFO_EMAIL_USERNAME,
        pass : process.env.INFO_EMAIL_PASSWORD
    }
});

const sendMail = (mailOptions) => {
    console.log("SENDING MAIL... ");
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log("Error sending mail to: " + mailOptions.to);
        } else {
            console.log("Mail successfully sent to: " + mailOptions.to);
        }
    });
};

const getBookingOwner = (booking) => {
    return new Promise((resolve, reject) => {
        pool.connect().then(client => {
            const getOwnerQuery = `SELECT "userTable"."email", "userTable"."firstName", "rentalItem"."title" \
                        FROM public."userTable" INNER JOIN public."rentalItem" ON "userTable"."userId" = "rentalItem"."ownerId" \
                        WHERE "rentalItem"."itemId" = $1;`;
            client.query(getOwnerQuery, [booking.itemId]).then(owner => {
                client.release();
                return resolve(owner.rows[0]);
            });
        }).catch(err => {
            client.release();
            return reject(err);
        });
    });
};

const getBookingRenter = (booking) => {
    return new Promise((resolve, reject) => {
        pool.connect().then(client => {
            const getRenterQuery = `SELECT "email", "firstName" FROM public."userTable" WHERE "userId"=$1;`;
            client.query(getRenterQuery, [booking.userId]).then(renter => {
                const getItemTitle = `SELECT "title" FROM public."rentalItem" WHERE "itemId"=$1`;
                client.query(getItemTitle, [booking.itemId]).then(itemTitle => {
                    client.release();
                    return resolve([renter.rows[0], itemTitle.rows[0]]);
                });
            });
        }).catch(err => {
            client.release();
            return reject(err);
        });
    });
};

export const sendStartReminders = (booking) => {
    // Send a start reminder to the owner
    getBookingOwner(booking).then(owner => {
        sendMail({
            from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
            to : owner.email,
            subject : nls.OWNER_BOOKING_START_REMINDER,
            html : getOwnerStartReminderNotificationTemplate(owner.firstName, owner.title, booking.startDate)
        });
    }).catch(err => {
        console.log("Error sending owner start reminders: " + err);
    });

    // Send a start reminder to the renter
    getBookingRenter(booking).then(returnArr => {
        const renter = returnArr[0];
        const title = returnArr[1];
        sendMail({
            from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
            to : renter.email,
            subject : nls.RENTER_BOOKING_START_REMINDER,
            html : getRenterStartReminderNotificationTemplate(renter.firstName, title.title, booking.startDate)
        });
    }).catch(err => {
        console.log("Error sending renter start reminders: " + err);
    });
};

export const sendStartConfirmations = (booking) => {
    // Send a start confirmation to the owner
    getBookingOwner(booking).then(owner => {
        sendMail({
            from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
            to : owner.email,
            subject : nls.OWNER_BOOKING_START_CONFIRMATION,
            html : getOwnerStartConfirmationNotificationTemplate(owner.firstName, owner.title)
        });
    }).catch(err => {
        console.log("Error sending owner start confirmations: " + err);
    });

    // Send a start confirmation to the renter
    getBookingRenter(booking).then(returnArr => {
        const renter = returnArr[0];
        const title = returnArr[1];
        sendMail({
            from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
            to : renter.email,
            subject : nls.RENTER_BOOKING_START_CONFIRMATION,
            html : getRenterStartConfirmationNotificationTemplate(renter.firstName, title.title)
        });
    }).catch(err => {
        console.log("Error sending renter start confirmations: " + err);
    });
};

export const sendEndReminders = (booking) => {
    // Send a end reminder to the owner
    getBookingOwner(booking).then(owner => {
        sendMail({
            from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
            to : owner.email,
            subject : nls.OWNER_BOOKING_END_REMINDER,
            html : getOwnerEndReminderNotificationTemplate(owner.firstName, owner.title, booking.endDate)
        });
    }).catch(err => {
        console.log("Error sending owner end reminders: " + err);
    });

    // Send a end reminder to the renter
    getBookingRenter(booking).then(returnArr => {
        const renter = returnArr[0];
        const title = returnArr[1];
        sendMail({
            from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
            to : renter.email,
            subject : nls.RENTER_BOOKING_END_REMINDER,
            html : getRenterEndReminderNotificationTemplate(renter.firstName, title.title, booking.endDate)
        });
    }).catch(err => {
        console.log("Error sending renter end reminders: " + err);
    });
};

export const sendEndConfirmations = (booking) => {
    // Send a end confirmation to the owner
    getBookingOwner(booking).then(owner => {
        sendMail({
            from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
            to : owner.email,
            subject : nls.OWNER_BOOKING_END_CONFIRMATION,
            html : getOwnerEndConfirmationNotificationTemplate(owner.firstName, owner.title)
        });
    }).catch(err => {
        console.log("Error sending owner end confirmations: " + err);
    });

    // Send a end confirmation to the renter
    getBookingRenter(booking).then(returnArr => {
        const renter = returnArr[0];
        const title = returnArr[1];
        sendMail({
            from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
            to : renter.email,
            subject : nls.RENTER_BOOKING_END_CONFIRMATION,
            html : getRenterEndConfirmationNotificationTemplate(renter.firstName, title.title)
        });
    }).catch(err => {
        console.log("Error sending renter start confirmations: " + err);
    });
};

// Rent Request Notification
export const sendRentRequestNotification = (newRentRequest) => {
    pool.connect().then(client => {
        const query = `SELECT "userTable"."email", "userTable"."firstName", "rentalItem"."title" FROM public."userTable" INNER JOIN public."rentalItem" ON "userTable"."userId" = "rentalItem"."ownerId" WHERE "rentalItem"."itemId" = $1;`;
        client.query(query, [newRentRequest.itemId]).then(result => {
            // The correct email will be passed along with the result. This can then be used to send off a rent request notification to the item owner.
            sendMail({
                from :  nls.SHAREFF_ALERTS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
                to : result.rows[0].email,
                subject : nls.RENT_REQUEST_MADE,
                html: getRentRequestNotificationTemplate(result.rows[0].firstName, result.rows[0].title)
            });

            // After the mail has been sent, now we can update the status of the rent request to become PENDING rather than NOTIFICATION PENDING
            const updateRRstatus = `UPDATE "rentRequest" SET "status"=$2 WHERE "requestId"=$1;`;
            client.query(updateRRstatus, [newRentRequest.requestId, nls.RRS_REQUEST_PENDING]).then(result => {
                client.release();
                console.log("Updated rent request status successfully");
            }).catch(err => {
                client.release();
                console.log("Error trying to update rent request status from Notification Pending to Pending " + err);
            });

        }).catch(err => {
            client.release();
            console.log(err);
        });
    });
};

const getRentRequestRenter = (rentRequest) => {
    return new Promise((resolve, reject) => {
        pool.connect().then(client => {
            const getRenterQuery = `SELECT "email", "firstName" FROM public."userTable" WHERE "renterId"=$1;`;
            client.query(getRenterQuery, [booking.userId]).then(renter => {
                const getItemTitle = `SELECT "title" FROM public."rentalItem" WHERE "itemId"=$1`;
                client.query(getItemTitle, [booking.itemId]).then(itemTitle => {
                    client.release();
                    return resolve([renter.rows[0], itemTitle.rows[0]]);
                });
            });
        }).catch(err => {
            client.release();
            return reject(err);
        });
    });
};

// Rent Request Accepted/Rejected
/**
 * Assume that the rent request status has not already been updated in the database.
 *
 * i.e. After it changes to Accepted, it will be updated in the database and then sent here. Therefore send update with the status that it is going to be changed to.
 */
export const sendRentRequestStatusChangeNotification = (rentRequest, newStatus) => {
    getRentRequestRenter(rentRequest).then(returnArr => {
        const renter = returnArr[0];
        const title = returnArr[1].title;

        let emailSubject, htmlTemplate;
        if (newStatus === nls.RRS_REQUEST_ACCEPTED) {
            emailSubject = nls.RENT_REQUEST_ACCEPTED;
            htmlTemplate = getRentRequestAcceptedNotificationTemplate(renter.firstName, title);
        } else if (newStatus === nls.RRS_REQUEST_REJECTED) {
            emailSubject = nls.RENT_REQUEST_REJECTED;
            htmlTemplate = getRentRequestRejectedNotificationTemplate(renter.firstName, title);
        }


        if (emailSubject && htmlTemplate) {
            console.log("Send mail" + renter.rows[0].email);
            sendMail({
                from : nls.SHAREFF_ALERTS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
                to : renter.email,
                subject : emailSubject,
                html : htmlTemplate
            });
        }
    }).catch(err => {
        console.log("Error getting rent request renter");
    });
};

// Rent Request Expired
/**
 * The following function is used to send an email notification when the rent request has expired!
 */
export const sendRentRequestExpiredNotification = (rentRequest) => {
    getRentRequestRenter(rentRequest).then(returnArr => {
        const renter = returnArr[0];
        const title = returnArr[1].title;

        sendMail({
            from : nls.SHAREFF_ALERTS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
            to : renter.email,
            subject : nls.RENT_REQUEST_EXPIRED,
            html : getRentRequestExpiredNotificationTemplate(renter.firstName, title)
        });
    });
}
