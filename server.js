// Allows us to use ES6
require('babel-register');

const app = require('./src/app').app;
const http = require('http');
const nls = require('./src/i18n/en').nls;

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// We initialize the server here, and export it for SocketIO
module.exports = server.listen(PORT, () => {
  if (process.env.NODE_ENV === 'production') {
    console.log(`\n${nls.PRODUCTION_MODE}`);
  } else {
    console.log(`\n${nls.DEVELOPMENT_MODE}`);
  }

  console.log(nls.SERVER_STARTED, PORT);
});

// Start SocketIO
require('./src/routes/profile/socket-io');
