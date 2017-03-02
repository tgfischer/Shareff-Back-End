/**
 * The following file will be used to keep an external copy of the HTML strings that will build the email messages for notifications.
 * 
 */
/* RENT REQUEST TEMPLATES */
// Template for the email sent to the item owner when they receive a rent request
export const getRentRequestNotificationTemplate = (firstName, itemTitle) => {
    return `
    <html>
        <head>
            <style> 
                
            </style>
        </head>
        <body>
            <div>
                <p> Hi ${firstName}! </p>
                <div> A rent request has been made on your item, <b>"${itemTitle}"</b>. Please head over to Shareff to view the request. </div>
                <br/>
                <br/>
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
    </html>`;
};

/* --------------------------------------------------- REMINDER/CONFIRMATION EMAIL TEMPLATES --------------------------------------------------- */
// Template sent to the renter to remind them that their rental booking will start soon
export const getRenterStartReminderNotificationTemplate = (firstName, itemTitle, startDate) => {
    return `
    <html>
        <head>
            <style>
            
            </style>
        </head>
        <body> 
            <div> 
                <p> Hi ${firstName}! </p>
                <div> We just wanted to remind you that your item rental for <b>"${itemTitle}"</b> begins at ${startDate}. </div>
                <div> Head over to Shareff to view more details about your rental! </div>
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
    </html>`;
};

// Template sent to the owner to remind them that their rental item will be rented soon
export const getOwnerStartReminderNotificationTemplate = (firstName, itemTitle, startDate) => {
    return `
    <html>
        <head>
            <style>
            
            </style>
        </head>
        <body> 
            <div> 
                <p> Hi ${firstName}! </p>
                <div> We just wanted to remind you that your item <b>"${itemTitle}"</b> will be rented beginning at ${startDate}. </div>
                <div> Head over to Shareff to view more details about this booking! </div>
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
    </html>`;
};

// Template sent to the renter for them to confirm they received their rental item 
export const getRenterStartConfirmationNotificationTemplate = (firstName, itemTitle) => {
    return `
    <html>
        <head>
            <style>
            
            </style>
        </head>
        <body> 
            <div> 
                <p> Hi ${firstName}! </p>
                <div> We would like to confirm that you have received your rental item, <b>"${itemTitle}"</b>. </div>
                <div> Please click the link below to confirm that you received this item. In the event that you did not receive your item, please contact us. </div>
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
    </html>`;
};

// Template sent to the owner for them to confirm they delivered their rental item 
export const getOwnerStartConfirmationNotificationTemplate = (firstName, itemTitle) => {
    return `
    <html>
        <head>
            <style>
            
            </style>
        </head>
        <body> 
            <div> 
                <p> Hi ${firstName}! </p>
                <div> We would like to confirm that you have delivered your rental item, <b>"${itemTitle}"</b>. </div>
                <div> Please click the link below to confirm that you delivered this item. In the event that you did not deliver your rental item, please contact us. </div>
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
    </html>`;
};

// Template sent to the renter to remind them that their rental booking will end soon
export const getRenterEndReminderNotificationTemplate = (firstName, itemTitle, endDate) => {
    return `
    <html>
        <head>
            <style> 
                
            </style>
        </head>
        <body>
            <div>
                <p> Hi ${firstName}! </p>
                <div> We just wanted to remind you that your item rental for <b>"${itemTitle}"</b> will end at ${endDate}. </div>
                <div> Head over to Shareff to view more details about your rental! </div>
                <br/>
                <br/>
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
    </html>`;
};

// Template sent to the owner to remind them that their rental item will be returned soon
export const getOwnerEndReminderNotificationTemplate = (firstName, itemTitle, endDate) => {
    return `
    <html>
        <head>
            <style> 
                
            </style>
        </head>
        <body>
            <div>
                <p> Hi ${firstName}! </p>
                <div> We just wanted to remind you that your item <b>"${itemTitle}"</b> will be returned at ${endDate}. </div>
                <div> Head over to Shareff to view more details about your rental! </div>
                <br/>
                <br/>
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
    </html>`;
};

// Template sent to the renter for them to confirm they returned their rental item 
export const getRenterEndConfirmationNotificationTemplate = (firstName, itemTitle) => {
    return `
    <html>
        <head>
            <style> 
                
            </style>
        </head>
        <body>
            <div>
                <p> Hi ${firstName}! </p>
                <div> We would like to confirm that you have return your rental item, <b>"${itemTitle}"</b>. </div>
                <div> Please click the link below to confirm that you returned this item. </div>
                <br/>
                <br/>
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
    </html>`;
};

// Template sent to the owner for them to confirm they received their rental item back => booking over
export const getOwnerEndConfirmationNotificationTemplate = (firstName, itemTitle) => {
    return `
    <html>
        <head>
            <style> 
                
            </style>
        </head>
        <body>
            <div>
                <p> Hi ${firstName}! </p>
                <div> We would like to confirm that your rental item, <b>"${itemTitle}"</b>, has been returned to you. </div>
                <div> Please click the link below to confirm that this item has been returned. </div>
                <br/>
                <br/>
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
    </html>`;
};