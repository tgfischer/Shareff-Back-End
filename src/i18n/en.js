// TODO: Move these messages to the client-side, and return the key
// e.g. GENERAL_ERROR_MESSAGE: 'error.general'
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
  MOMENT_DATE_FORMAT: 'YYYY-MM-DD'
};
