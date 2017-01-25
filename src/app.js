import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import {config} from '../config/db';

// Export the app object
export const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// Enable CORS since client and server are running on different ports
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Set up the database with the imported configuration
export const pool = new pg.Pool(config);

// If an error is thrown while working with the database, log the error
pool.on('error', (e, client) => {
  console.log(e);
});

// Define our routes
import {index} from './routes/index';
import {login} from './routes/login';
import {signup} from './routes/signup';
import {listings} from './routes/listings';
import {profile} from './routes/profile';
import {schedule} from './routes/schedule';
import {tracking} from './routes/tracking';
app.use('/', index);
app.use('/login', login);
app.use('/signup', signup);
app.use('/listings', listings);
app.use('/profile', profile);
app.use('/schedule', schedule);
app.use('/tracking', tracking);
