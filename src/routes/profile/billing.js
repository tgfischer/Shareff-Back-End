import express from 'express';
import {pool} from '../../app';
import {isLoggedIn, getUser, stripe} from '../../utils/Utils';

const router = express.Router();

/**
 * Update billing indo
 */
router.post('/update_billing_info', isLoggedIn, (req, res) => {
  // Get the cc details from the request
  const {expiryDate, userId, stripeCustomerId, token} = req.body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    stripe.customers.retrieve(stripeCustomerId).then(customer => {
      stripe.customers.updateCard(
        customer.id,
        customer.default_source,
        {
          exp_month: expiryDate.month,
          exp_year: expiryDate.year
        }
      ).then(card => {
        const query = `UPDATE public."userTable" SET "ccExpiryDate" = $1 WHERE "userId" = $2`;

        client.query(query, [expiryDate, userId]).then(result => {
          // need to send back updated user
          getUser(client, userId, token).then(user => {
            res.status(200).json({user});
          }).catch(err => {
            res.status(500).json({err});
          });
        }).catch(err => {
          res.status(500).json({err});
        });
      }).catch(err => {
        res.status(500).json({err});
      });
    }).catch(err => {
      res.status(500).json({err});
    });
  }).catch(err => {
    console.log(JSON.stringify(err, null, 2));
    res.status(500).json({err});
  });
});

export {router as billing}
