import express from 'express'; 
import Moment from 'moment'; 
import {extendMoment} from 'moment-range'; 
import {pool} from '../app';

const router = express.Router();
const moment = extendMoment(Moment);        // create a moment object with more capability (such as date ranges)

/** 
 * The following route will schedule a node cron job to run every 5 minutes and look for a rent request that has the status "Notification pending". 
 * 
 */ 
router.post('/rent/request/notification', (req, res) => {
    
});


export {router as tracking}