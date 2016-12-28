// Allows us to use ES6
require('babel-register');

const app = require('./src/app').app;
const PORT = process.env.PORT || 4000;

// We initialize the server here
app.listen(PORT, () => {
    console.log('Server listening on port', PORT);
});
