import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import path from 'path';
import validator from 'validator';
import {config} from '../config/db';

// Export the app object
export const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// Allow the assets folder to be accessible from the client-side
app.use(express.static('assets'));

// Enable CORS since client and server are running on different ports
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  next();
});

// Escape all of the properties in the body
app.use((req, res, next) => {
  for (let key in req.body) {
    if (Object.prototype.hasOwnProperty.call(req.body, key) && typeof req.body[key] === 'string') {
      req.body[key] = validator.escape(req.body[key]);
    }
  }

  next();
});

// Set up the database with the imported configuration
export const pool = new pg.Pool(config);

// If an error is thrown while working with the database, log the error
pool.on('error', (e, client) => {
  client.release();
  console.log(e);
});

// Define our routes
import {index} from './routes/index';
import {login} from './routes/login';
import {signup} from './routes/signup';
import {listings} from './routes/listings';
import {profile} from './routes/profile/profile';
import {personalInfo} from './routes/profile/personalInfo';
import {addItem} from './routes/profile/addItem';
import {messages} from './routes/profile/messages';
import {myItems} from './routes/profile/myItems';
import {myRequests} from './routes/profile/myRequests';
import {incomingRequests} from './routes/profile/incomingRequests';
import {schedule} from './routes/schedule';
import {rent} from './routes/rent';
import {tracking} from './routes/tracking';
import {user} from './routes/user';
app.use('/', index);
app.use('/login', login);
app.use('/signup', signup);
app.use('/listings', listings);
app.use('/profile', profile);
profile.use('/personal_info', personalInfo);
profile.use('/add_item', addItem);
profile.use('/messages', messages);
profile.use('/my_items', myItems);
profile.use('/my_requests', myRequests);
profile.use('/incoming_requests', incomingRequests);
app.use('/schedule', schedule);
app.use('/rent', rent);
app.use('/tracking', tracking);
app.use('/user', user);
