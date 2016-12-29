import express from 'express';
import pg from 'pg';
import {config} from '../config/db';

// Export the app object
export const app = express();

console.log(config);

// Set up the database with the imported configuration
export const pool = new pg.Pool(config);

// If an error is thrown while working with the database, log the error
pool.on('error', (e, client) => {
  console.log(e);
});

// Define our routes
import {index} from './routes/index';
app.use('/', index);
