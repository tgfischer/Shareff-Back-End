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
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Escape all of the properties in the body
app.use((req, res, next) => {
  for (let key in req.body) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
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
import {uploadItem} from './routes/profile/uploadItem';
import {messages} from './routes/profile/messages';
import {myItems} from './routes/profile/myItems';
import {schedule} from './routes/schedule';
import {rent} from './routes/rent';
import {tracking} from './routes/tracking';
app.use('/', index);
app.use('/login', login);
app.use('/signup', signup);
app.use('/listings', listings);
app.use('/profile', profile);
profile.use('/personal_info', personalInfo);
profile.use('/upload_item', uploadItem);
profile.use('/messages', messages);
profile.use('/my_items', myItems);
app.use('/schedule', schedule);
app.use('/rent', rent);
app.use('/tracking', tracking);
