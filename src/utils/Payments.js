import {stripe} from 'Utils';
import {pool} from '../app';

export const chargeRenter = (renterId, amount, description) => {
  pool.connect().then(client => {
    const query = `SELECT "stripeCustomerId" FROM "userTable" WHERE "userId" = $1`;
    client.query(query, [renterId]).then(result => {
      stripe.customer.retrieve(stripeCustomerId).then(customer => {
        stripe.charges.create({
          currency: "cad",
          source: customer.default_source,
          amount,
          description
        }).then(result => {

        }).catch(err => {
          console.log(err);
        });
      }).catch(err => {
        console.log(err);
      });
    });
  });
}

export const payOwner = (ownerId) => {

}
