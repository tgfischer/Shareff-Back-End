// Allows us to use ES6
require('babel-register');

const app = require('./src/app').app;
const nls = require('./src/i18n/en').nls;
const PORT = process.env.PORT || 4000;


// We initialize the server here
app.listen(PORT, () => {
  if (process.env.NODE_ENV === 'production') {
    console.log(`\n${nls.PRODUCTION_MODE}`);
  } else {
    console.log(`\n${nls.DEVELOPMENT_MODE}`);
  }

  console.log(nls.SERVER_STARTED, PORT);
});
