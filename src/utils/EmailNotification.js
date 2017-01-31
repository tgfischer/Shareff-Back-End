import {nls} from '../i18n/en';
import {pool} from '../app';
import {getRentRequestNotificationTemplate} from '../templates/emails';
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

let transporter = nodemailer.createTransport({
    service: "Gmail",
    debug: true,
    auth: {
        user : process.env.INFO_EMAIL_USERNAME, 
        pass : process.env.INFO_EMAIL_PASSWORD
    }
});

export const sendRentRequestNotificationEmail = (newRentRequest) => {
    pool.connect().then(client => {
        let query = `SELECT "userTable"."email", "userTable"."firstName", "rentalItem"."title" FROM public."userTable" INNER JOIN public."rentalItem" ON "userTable"."userId" = "rentalItem"."ownerId" WHERE "rentalItem"."itemId" = $1;`;
        client.query(query, [newRentRequest.itemId]).then(result => {
            client.release();

            // The correct email will be passed along with the result. This can then be used to send off a rent request notification to the item owner. 
            let mailOptions = { 
                from : "Shareff Alerts <info.shareff@gmail.com>",
                to : result.rows[0].email,
                subject : "[Shareff - Rent Request] A Rent Request has been made for your item!",
                html: getRentRequestNotificationTemplate(result.rows[0].firstName, result.rows[0].title)
            };

            transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                    console.log("ERROR SENDING MAIL: " + err);

                    // TODO: Handle the error, resend? 
                } else {
                    console.log("MAIL SENT SUCCESSFULLY TO " + result.rows[0].email);

                    // TODO: Update the status of the rent request 
                }
            });
        }).catch(err => {
            client.release();
            console.log(err);
        });
    });
};

