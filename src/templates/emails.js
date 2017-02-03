/**
 * The following file will be used to keep an external copy of the HTML strings that will build the email messages for notifications.
 * 
 */
/* RENT REQUEST TEMPLATES */
// Template for the email sent to the item owner when they receive a rent request
export const getRentRequestNotificationTemplate = (firstName, itemTitle) => {
        return `<html>
            <head>
                <style> 
                    .red {
                        color: red;
                    }
                </style>
            </head>
            <body>
                <div>
                    <p> Hi ${firstName}! </p>
                    <div> A rent request has been made on your item, "${itemTitle}". Please head over to Shareff to view the request. </div>
                    <br/>
                    <br/>
                    <button class="red"> 
                        Go to Shareff!
                    </button>
                    <br/>
                    <br/>
                    <i> Have a great day! </i>
                    <br/>
                    <br/>
                    <div>
                        <b> The Shareff Team </b><br/>
                        London, ON, Canada<br/>
                        info.shareff@gmail.com<br/>
                    </div>
                </div>
            </body>
        </html>`
};

/* REMINDER EMAIL TEMPLATES */
// Template sent to the renter to remind them that their rental booking will start soon
export const getRenterStartReminderNotificationTemplate = (firstName, itemTitle, booking) => {
    return `<html>
        <head>
            <style>
            
            </style>
        </head>
        <body> 
            <div> 
                <p> Hi ${firstName}! </p>
                <div> We just wanted to remind you that your item rental for ${itemTitle} begins at ${booking.startDate}! Head over to Shareff to view more details about your rental!' </div>
                <br />
                <br />
                <button>
                    Go to Shareff!
                </button>
                <br/>
                <br/>
                <i> Have a great day! </i>
                <br/>
                <br/>
                <div>
                    <b> The Shareff Team </b><br/>
                    London, ON, Canada<br/>
                    info.shareff@gmail.com<br/>
                </div>
            </div>
        </body>
    </html>`
};

// Template sent to the renter to remind them that their rental booking will end soon
export const getRenterEndReminderNotificationTemplate = (firstName, itemTitle, booking) => {
    return ``;
};

// Template sent to the owner to remind them that their rental item will be rented soon
export const getOwnerStartReminderNotificationTemplate = (firstName, itemTitle, booking) => {
    return ``;
};

// Template sent to the owner to remind them that their rental item will be returned soon
export const getOwnerEndReminderNotificationTemplate = (firstName, itemTitle, booking) => {
    return ``;
};

/* CONFIRMATION EMAIL TEMPLATES */
// Template sent to the renter for them to confirm they received their rental item 
export const getRenterStartConfirmationNotificationTemplate = (firstName, itemTitle, booking) => {
    return ``;
};

// Template sent to the renter for them to confirm they returned their rental item 
export const getRenterEndConfirmationNotificationTemplate = (firstName, itemTitle, booking) => {
    return ``;
};

// Template sent to the owner for them to confirm they delivered their rental item 
export const getOwnerStartConfirmationNotificationTemplate = (firstName, itemTitle, booking) => {
    return ``;
};

// Template sent to the owner for them to confirm they received their rental item back => booking over
export const getOwnerEndConfirmationNotificationTemplate = (firstName, itemTitle, booking) => {
    return ``;
};