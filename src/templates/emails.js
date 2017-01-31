/**
 * The following file will be used to keep an external copy of the HTML strings that will build the email messages for notifications.
 * 
 */
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