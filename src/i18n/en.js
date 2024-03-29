// TODO: Move these messages to the client-side, and return the key
// e.g. GENERIC_ERROR_MESSAGE: 'error.general'
export const nls = {
  SERVER_STARTED: 'Server listening on port',
  PRODUCTION_MODE: '>>> Production Mode',
  DEVELOPMENT_MODE: '>>> Development Mode',

  /* Error Messages */
  GENERIC_ERROR_MESSAGE: 'Something has gone wrong while processing your request. Please try again later.',
  INVALID_LOGIN_CREDENTIALS: 'Oops! Either the email or password that was provided is incorrect.',
  USER_ALREADY_EXISTS: 'Oops! There is already an account that uses that email address.',
  UNAUTHORIZED: 'You are anauthorized to perform this action',
  INVALID_IMAGE_TYPE: 'The image that you tried to upload is invalid',
  INVALID_PARAMETER_SET: 'Invalid parameter set. Please edit the request to contain the proper parameters.',
  END_BEFORE_START_DATE: 'The propose start date must come before the proposed end date.',
  ITEM_NOT_FOUND: 'The item that you are looking for doesn\'t seem to exist',

  /* Miscellaneous Message */
  MOMENT_DATE_FORMAT: 'YYYY-MM-DD',

  /* Rent Request Statuses */
  RRS_NOTIFICATION_PENDING: 'request.status.notificationPending',
  RRS_REQUEST_PENDING: 'request.status.pending',
  RRS_REQUEST_ACCEPTED: 'request.status.accepted',
  RRS_REQUEST_REJECTED: 'request.status.rejected',
  RRS_REQUEST_CANCELLED: 'request.status.cancelled',
  RRS_REQUEST_EXPIRED: 'request.status.expired',

  /* Booking Meta Statuses */
  BMS_PENDING_START: 'Pending Booking Start',
  BMS_START_REM_SENT: 'Start Reminder Sent',
  BMS_START_CONF_SENT: 'Start Confirmation Sent',
  BMS_END_REM_SENT: 'End Reminder Sent',
  BMS_END_CONF_SENT: 'End Confirmation Sent',

  /* Booking Statuses */
  BOOKING_PENDING: 'Pending',
  BOOKING_ACTIVE: 'Active',
  BOOKING_COMPLETE: 'Complete',
  BOOKING_UNAVAILABLE: 'Unavailable',

  /* Payment Statuses */
  PAYMENT_PENDING: 'Pending',
  PAYMENT_COMPLETED: 'Complete',
  PAYMENT_FAILED: 'Failed',

  /* Email Notification Subject Lines */
  SHAREFF_ALERTS: 'Shareff Alerts',
  SHAREFF_REMINDERS: 'Shareff Reminders',
  SHAREFF_CONFIRMATION: 'Shareff Confirmation',

  RENT_REQUEST_MADE: '[Shareff - Rent Request] A Rent Request has been made for your item!',
  RENT_REQUEST_ACCEPTED: '[Shareff - Rent Request] Your rent request has been approved!',
  RENT_REQUEST_REJECTED: '[Shareff - Rent Request] Your rent request was rejected',
  RENT_REQUEST_EXPIRED: '[Shareff - Rent Request] Your rent request has expired',
  RENTER_BOOKING_START_REMINDER: '[Shareff - Booking Reminder] Your rental booking begins soon!',
  OWNER_BOOKING_START_REMINDER: '[Shareff - Booking Reminder] Your item is being rented soon!',
  RENTER_BOOKING_END_REMINDER: '[Shareff - Booking Reminder] Your rental item must be returned soon!',
  OWNER_BOOKING_END_REMINDER: '[Shareff - Booking Reminder] Your item is being returned soon!',
  RENTER_BOOKING_START_CONFIRMATION: '[Shareff - Item Confirmation] Was your rental item delivered?',
  OWNER_BOOKING_START_CONFIRMATION: '[Shareff - Item Confirmation] Did you deliver your item?',
  RENTER_BOOKING_END_CONFIRMATION: '[Shareff - Item Confirmation] Did you return your rental item?',
  OWNER_BOOKING_END_CONFIRMATION: '[Shareff - Item Confirmation] Was your item returned?',
  RENTER_BOOKING_RATING: '[Shareff - Booking Rating] Please review your renting experience!',
  OWNER_BOOKING_RATING: '[Shareff - Booking Rating] Please review your renting experience!' //TODO: Change this to something better
};
