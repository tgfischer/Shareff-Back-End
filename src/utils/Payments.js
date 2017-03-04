import {stripe} from './Utils';
import {pool} from '../app';

export const completeTransaction = (renterId, amount, description) => {
  pool.connect().then(client => {
    const query = `SELECT "stripeCustomerId", "stripeAccountId" FROM "userTable" WHERE "userId" = $1`;
    const shareffFee = amount*0.05; // we keep 5%
    client.query(query, [renterId]).then(result => {
      const stripeCustomerId = result.rows[0].stripeCustomerId;
      const stripeAccountId = result.rows[0].stripeAccountId;
      stripe.customers.retrieve(stripeCustomerId).then(customer => {
        stripe.charges.create({
          currency: "cad",
          source: customer.default_source,
          customer: customer.id,
          amount,
          destination: {
            amount: amount-shareffFee,
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
  });
}
