import express from 'express';

// Export the app object
export const app = express();

// Define our routes
import {index} from './routes/index';
app.use('/', index);
