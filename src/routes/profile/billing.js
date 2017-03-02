import express from 'express';
import {pool} from '../../app';
import {isLoggedIn, getUser, stripe, convertDate} from '../../utils/Utils';

const router = express.Router();

/**
 * Update billing indo
 */
router.post('/update_billing_info', isLoggedIn, (req, res) => {
  // Get the cc details from the request
  const {userId, stripeCustomerId, ccn, cvn, expiryDate, token} = req.body;
  const expDate = convertDate(expiryDate);
  // if ccn or cvn have X's, the user didn't change them
  const finalCCN = ccn.indexOf('X') === -1 ? parseInt(ccn) : '';
  const finalCVN = cvn.indexOf('X') === -1 ? parseInt(cvn) : '';
  const newCard = (finalCCN && finalCVN);

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    let query = `UPDATE public."userTable" SET "ccExpiryDate" = $1`;
    let values = [expiryDate];

    stripe.customers.retrieve(stripeCustomerId).then(customer => {
      let stripePromise = '';
      if (newCard) {
        query += `, "ccLast4Digits" = $3, "ccBrand" = $4 `;
        stripePromise = stripe.customers.createSource(customer.id, {
            source: {
               object: 'card',
               exp_month: expDate.month,
               exp_year: expDate.year,
               number: finalCCN,
               cvc: finalCVN
            }
        }).then(card => {
          //only delete the old card if the new source was created succesfully
          stripe.customers.deleteCard(customer.id, customer.default_source);
          return card;
        });
      } else {
        stripePromise = stripe.customers.updateCard(
          customer.id,
          customer.default_source,
          {
            exp_month: expDate.month,
            exp_year: expDate.year
          }
        );
      }

      stripePromise.then(card => {
        query += ` WHERE "userId" = $2`;
        values.push(userId);
        if (newCard) {
          values.push(card.last4, card.brand);
        }
        client.query(query, values).then(result => {
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
