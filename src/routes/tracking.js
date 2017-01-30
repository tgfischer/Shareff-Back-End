import express from 'express'; 
import Moment from 'moment'; 
import {extendMoment} from 'moment-range'; 
import {pool} from '../app';

const router = express.Router();
const moment = extendMoment(Moment);        // create a moment object with more capability




export {router as tracking}