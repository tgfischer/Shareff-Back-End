import express from 'express';
import {pool} from '../../app';
import {isLoggedIn, getUser, stripe, convertDate} from '../../utils/Utils';
import {updateBankAccount, updateCreditCard} from '../../utils/Payments';

const router = express.Router();

/**
 * Update billing indo
 */
router.post('/update_billing_info', isLoggedIn, (req, res) => {
  // Get the cc details from the request
  const {
    userId, stripeCustomerId, stripeAccountId, token, firstName, lastName,
    line1, postalCode, province, city, email
  } = req.body;

  let {
    ccn, cvn, expiryDate, accountHolderName, accountNumber,
    transitNumber, institutionNumber, dob
  } = req.body.info;

  const bankInfo = {
    accountHolderName, accountNumber, transitNumber, institutionNumber,
    firstName, lastName, line1, postalCode, province, dob, city,
    ip: req.connection.remoteAddress
  }

  const ccInfo = {ccn, cvn, expiryDate, email}

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const promises = [
      updateBankAccount(bankInfo, stripeAccountId, userId),
      updateCreditCard(ccInfo, stripeCustomerId, userId)
    ];


    Promise.all(promises).then(result => {
      getUser(client, userId, token).then(user => {
        res.status(200).json({user});
      }).catch(err => {
        res.status(500).json({err});
      });
    }).catch(err => {
      res.status(500).json({err});
    });
  }).catch(err => {
    console.log(err);
    console.log(JSON.stringify(err, null, 2));
    res.status(500).json({err});
  });
});

export {router as billing}
