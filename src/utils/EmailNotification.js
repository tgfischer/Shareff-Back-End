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
    getOwnerEndConfirmationNotificationTemplate
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

// User Rating Notification 
export const sendRatingNotification = () => {

};

const sendEmail = (mailOptions) => {
    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.log("Error sending mail to: " + mailOptions.to);
        } else {
            console.log("Mail successfully sent to: " + mailOptions.to);
        }
    });
};

const getBookingOwner = (booking) => {

};

const getBookingRenter = (booking) => {

};

export const sendStartReminders = (booking) => {
    // Send a start reminder to the owner 
    getBookingOwner(booking).then(owner => {
        
    }).catch(err => {

    });

    // Send a start reminder to the renter
    getBookingRenter(booking).then(renter => {

    }).catch(err => {
        
    });
};

export const sendStartConfirmations = (booking) => {
    // Send a start confirmation to the owner 
    getBookingOwner(booking).then(owner => {

    }).catch(err => {

    });

    // Send a start confirmation to the renter
    getBookingRenter(booking).then(renter => {

    }).catch(err => {
        
    });
};

export const sendEndReminders = (booking) => {
    // Send a end reminder to the owner 
    getBookingOwner(booking).then(owner => {

    }).catch(err => {

    });

    // Send a end reminder to the renter
    getBookingRenter(booking).then(renter => {

    }).catch(err => {
        
    });
};

export const sendEndConfirmations = (booking) => {
    // Send a start confirmation to the owner 
    getBookingOwner(booking).then(owner => {

    }).catch(err => {

    });

    // Send a start confirmation to the renter
    getBookingRenter(booking).then(renter => {

    }).catch(err => {
        
    });
};

// Reminder Notifications
export const sendRenterReminderNotification = (isStart, booking) => {
    pool.connect().then(client => {
        // Do a query here to get the renter's first name, email address, and the title of the item they are renting.. 
        const userQuery = `SELECT "email", "firstName" FROM public."userTable" WHERE "userId"=$1;`;  // booking.userId contains the id of the person who is renting!
        client.query(userQuery, [booking.userId]).then(userResult => {
            const itemQuery = `SELECT "title" FROM public."rentalItem" WHERE "itemId"=$1;`;
            client.query(itemQuery, [booking.itemId]).then(itemResult => {
                client.release();

                let subject, template; 
                if (isStart) {
                    // Renter start email
                    subject = nls.RENTER_BOOKING_START_REMINDER;
                    template = getRenterStartReminderNotificationTemplate(userResult.rows[0].firstName, itemResult.rows[0].title, booking.startDate);
                } else {
                    // Renter end email
                    subject = nls.RENTER_BOOKING_END_REMINDER;
                    template = getRenterEndReminderNotificationTemplate(userResult.rows[0].firstName, itemResult.rows[0].title, booking.endDate);
                }

                // Build the email options
                const mailOptions = {
                    from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
                    to : userResult.rows[0].email,
                    subject : subject,
                    html : template
                };

                // Send the email 
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        // resend(mailOptions); 
                        console.log("ERROR SENDING RENTER REMINDER MAIL: " + err);
                    } else {
                        console.log("RENTER REMINDER MAIL SENT SUCCESSFULLY TO: " + userResult.rows[0].email);
                    }
                });
            });  
        });
    });
};

export const sendOwnerReminderNotification = (isStart, booking) => {

    pool.connect().then(client => {
        const query = `SELECT "userTable"."email", "userTable"."firstName", "rentalItem"."title" \ 
                        FROM public."userTable" INNER JOIN public."rentalItem" ON "userTable"."userId" = "rentalItem"."ownerId" \
                        WHERE "rentalItem"."itemId" = $1;`;

        client.query(query, [booking.itemId]).then(result => {
            client.release();

            let subject, template; 
            if (isStart) {
                // Owner start email 
                subject = nls.OWNER_BOOKING_START_REMINDER;
                template = getOwnerStartReminderNotificationTemplate(result.rows[0].firstName, result.rows[0].title, booking.startDate);
            } else {
                // Owner end email 
                subject = nls.OWNER_BOOKING_END_REMINDER; 
                template = getOwnerEndReminderNotificationTemplate(result.rows[0].firstName, result.rows[0].title, booking.endDate);
            }

            // Build the email options
            const mailOptions = {
                from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
                to : result.rows[0].email,
                subject : subject,
                html : template
            };

            // Send the email 
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    // resend(mailOptions); 
                    console.log("ERROR SENDING OWNER REMINDER MAIL: " + err);
                } else {
                    console.log("OWNER REMINDER MAIL SENT SUCCESSFULLY TO: " + result.rows[0].email);
                }
            });

        });
    });
    
};

// Confirmation Notifications
export const sendRenterConfirmationNotification = (isStart, booking) => {
    pool.connect().then(client => {
        // Do a query here to get the renter's first name, email address, and the title of the item they are renting.. 
        const userQuery = `SELECT "email", "firstName" FROM public."userTable" WHERE "userId"=$1;`;  // booking.userId contains the id of the person who is renting!
        client.query(userQuery, [booking.userId]).then(userResult => {
            const itemQuery = `SELECT "title" FROM public."rentalItem" WHERE "itemId"=$1;`;
            client.query(itemQuery, [booking.itemId]).then(itemResult => {
                client.release();

                let subject, template; 
                if (isStart) {
                    // Renter start email
                    subject = nls.RENTER_BOOKING_START_REMINDER;
                    template = getRenterStartConfirmationNotificationTemplate(userResult.rows[0].firstName, itemResult.rows[0].title, booking.startDate);
                } else {
                    // Renter end email
                    subject = nls.RENTER_BOOKING_END_REMINDER;
                    template = getRenterEndConfirmationNotificationTemplate(userResult.rows[0].firstName, itemResult.rows[0].title, booking.endDate);
                }

                // Build the email options
                const mailOptions = {
                    from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
                    to : userResult.rows[0].email,
                    subject : subject,
                    html : template
                };

                // Send the email 
                transporter.sendMail(mailOptions, (err, info) => {
                    if (err) {
                        // resend(mailOptions); 
                        console.log("ERROR SENDING RENTER REMINDER MAIL: " + err);
                    } else {
                        console.log("RENTER REMINDER MAIL SENT SUCCESSFULLY TO: " + userResult.rows[0].email);
                    }
                });
            });  
        });
    });
};

export const sendOwnerConfirmationNotification = (isStart, booking) => {
    pool.connect().then(client => {
        const query = `SELECT "userTable"."email", "userTable"."firstName", "rentalItem"."title" \ 
                        FROM public."userTable" INNER JOIN public."rentalItem" ON "userTable"."userId" = "rentalItem"."ownerId" \
                        WHERE "rentalItem"."itemId" = $1;`;

        client.query(query, [booking.itemId]).then(result => {
            client.release();

            let subject, template; 
            if (isStart) {
                // Owner start email 
                subject = nls.OWNER_BOOKING_START_REMINDER;
                template = getOwnerStartConfirmationNotificationTemplate(result.rows[0].firstName, result.rows[0].title, booking.startDate);
            } else {
                // Owner end email 
                subject = nls.OWNER_BOOKING_END_REMINDER; 
                template = getOwnerEndConfirmationNotificationTemplate(result.rows[0].firstName, result.rows[0].title, booking.endDate);
            }

            // Build the email options
            const mailOptions = {
                from : nls.SHAREFF_REMINDERS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
                to : result.rows[0].email,
                subject : subject,
                html : template
            };

            // Send the email 
            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    // resend(mailOptions); 
                    console.log("ERROR SENDING OWNER REMINDER MAIL: " + err);
                } else {
                    console.log("OWNER REMINDER MAIL SENT SUCCESSFULLY TO: " + result.rows[0].email);
                }
            });

        });
    });
};

// Rent Request Notification
export const sendRentRequestNotification = (newRentRequest) => {
    pool.connect().then(client => {
        const query = `SELECT "userTable"."email", "userTable"."firstName", "rentalItem"."title" FROM public."userTable" INNER JOIN public."rentalItem" ON "userTable"."userId" = "rentalItem"."ownerId" WHERE "rentalItem"."itemId" = $1;`;
        client.query(query, [newRentRequest.itemId]).then(result => {
            client.release();

            // The correct email will be passed along with the result. This can then be used to send off a rent request notification to the item owner. 
            const mailOptions = { 
                from :  nls.SHAREFF_ALERTS + " <" + process.env.INFO_EMAIL_USERNAME + ">",
                to : result.rows[0].email,
                subject : nls.RENT_REQUEST_MADE,
                html: getRentRequestNotificationTemplate(result.rows[0].firstName, result.rows[0].title)
            };
            sendMail(mailOptions);
            
        }).catch(err => {
            client.release();
            console.log(err);
        });
    });
};