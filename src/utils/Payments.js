import {stripe} from './Utils';
import {pool} from '../app';

export const completeTransaction = (renterId, ownerId, amount) => {
  pool.connect().then(client => {
    const getCustomerQuery = `SELECT "stripeCustomerId" FROM "userTable" WHERE "userId" = $1`;
    const stripeFee = Math.trunc(amount*0.029)+30; // strip take 2.9% + 30c
    const shareffFee = Math.trunc((amount-stripeFee)*0.05); // we keep another 5%
    const payout = amount-stripeFee-shareffFee; // pay out minus all fees

    client.query(getCustomerQuery, [renterId]).then(result => {
      const stripeCustomerId = result.rows[0].stripeCustomerId;
      const getOwnerQuery = `SELECT "stripeAccountId" FROM "userTable" WHERE "userId" = $1`;

      client.query(getOwnerQuery, [ownerId]).then(result => {
        const stripeAccountId = result.rows[0].stripeAccountId;
        stripe.customers.retrieve(stripeCustomerId).then(customer => {
          stripe.charges.create({
            currency: "cad",
            source: customer.default_source,
            customer: customer.id,
            amount,
            application_fee: shareffFee,
            destination: {
              account: stripeAccountId
            }
          }).then(result => {
            client.release();
            console.log(result);
          }).catch(err => {
            client.release();
            console.log(err);
          });
        }).catch(err => {
          client.release();
          console.log(err);
        });
      }).catch(err => {
        client.release();
        console.log(err);
      });
    }).catch(err => {
      client.release();
      console.log(err);
    });
  });
}
