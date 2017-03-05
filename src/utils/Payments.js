import {stripe, convertDate} from './Utils';
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

export const updateBankAccount = (bankInfo, stripeAccountId, userId) => {
  let promise = new Promise((resolve, reject) => {
    let {accountHolderName, accountNumber, transitNumber, institutionNumber} = bankInfo;
    const {firstName, lastName, line1, postalCode, province, dob, city, ip} = bankInfo;

    // user did not fill out bank info, just return to caller
    if (!accountNumber && !transitNumber && !institutionNumber && !dob) {
      resolve(true);
      return;
    }

    // if any account details have X's in them, the user didn't change them;
    accountNumber = accountNumber.indexOf('X') === -1 ? accountNumber : '';
    transitNumber = transitNumber.indexOf('X') === -1 ? transitNumber : '';
    institutionNumber = transitNumber.indexOf('X') === -1 ? institutionNumber : '';

    const routingNumber = `${transitNumber}${institutionNumber}`;
    const newBank = (accountNumber && transitNumber && institutionNumber);

    const birthDate = convertDate(dob);

    if (newBank) {
      let stripePromise = '';
      let createAccount = false;

      if (stripeAccountId) { //only need to update the account
        stripePromise = stripe.accounts.retrieve(stripeAccountId);
      } else { //need to create a whole account
        createAccount = true;
        stripePromise = stripe.accounts.create({
          country: "CA",
          managed: true,
          external_account: {
            object: 'bank_account',
            currency: 'cad',
            country: 'CA',
            account_holder_name: accountHolderName,
            account_number: accountNumber,
            routing_number: routingNumber
          }
        });
      }

      stripePromise.then(account => {
        stripe.accounts.update(account.id, {
          legal_entity: {
            dob: {
              day: birthDate.day,
              month: birthDate.month,
              year: birthDate.year
            },
            address: {
              city,
              line1,
              postal_code: postalCode,
              state: province
            },
            first_name: firstName,
            last_name: lastName,
            type: "individual"
          },
          tos_acceptance: {
            date: Math.floor(Date.now() / 1000),
            ip
          }
        }).then(account => {
          pool.connect().then(client => {
            const query = `UPDATE public."userTable" SET "stripeAccountId" = $1, "dob" = $2 WHERE "userId" = $3`;
            client.query(query, [account.id, dob, userId]).then(result => {
              client.release();
              resolve(true);
            }).catch(err => {
              client.release();
              reject(err);
            });
          }).catch(err => {
            reject(err);
          });
        }).catch(err => {
          reject(err);
        });
      }).catch(err => {
        reject(err);
      });
    } else {
      resolve(true);
    }
  });

  return promise;
}

export const updateCreditCard = (ccInfo, stripeCustomerId, userId) => {
  let promise = new Promise((resolve, reject) => {
    let {ccn, cvn, expiryDate, email} = ccInfo;

    // user didnt fill out credit card info, just return
    if (!ccn && !cvn && !expiryDate) {
      resolve(true);
      return;
    }

    const expDate = convertDate(expiryDate);

    // if ccn or cvn have X's, the user didn't change them
    ccn = ccn.indexOf('X') === -1 ? parseInt(ccn) : '';
    cvn = cvn.indexOf('X') === -1 ? parseInt(cvn) : '';
    const newCard = (ccn && cvn);

    if (!stripeCustomerId) {
      // Create a new customer and then a new source for the customer
      // using the credit card they entered
      stripe.customers.create({email}).then(customer => {
        stripe.customers.createSource(customer.id, {
          source: {
             object: 'card',
             exp_month: expDate.month,
             exp_year: expDate.year,
             number: ccn,
             cvc: cvn
          }
        }).then(source => {
          stripe.customers.update(customer.id, {"source" : source.id}).then(customer => {
            const ccBrand = customer.sources.data[0].brand;
            const ccLast4Digits = customer.sources.data[0].last4;
            const query = `UPDATE public."userTable" SET "stripeCustomerId" = $1, "ccExpiryDate" = $2, \
                    "ccLast4Digits" = $3, "ccBrand" = $4 WHERE "userId" = $5`;

            pool.connect().then(client => {
              // Insert the user into the users table
              client.query(query, [customer.id, expiryDate, ccLast4Digits, ccBrand, userId]).then(result => {
                client.release();
                resolve(true);
              }).catch(err => {
                client.release();
                reject(err);
              });
            }).catch(err => {
              reject(err);
            });
          }).catch(err => {
            reject(err);
          });
        }).catch(err => {
          reject(err);
        });
      }).catch(err => {
        reject(err);
      });
    } else {
      let query = `UPDATE public."userTable" SET "ccExpiryDate" = $1`;
      let values = [expiryDate];

      stripe.customers.retrieve(stripeCustomerId).then(customer => {
        let stripePromise = '';
        // if user provided new card details update the card,
        // otherwise just update the expiry date
        if (newCard) {
          query += `, "ccLast4Digits" = $3, "ccBrand" = $4 `;
          stripePromise = stripe.customers.createSource(customer.id, {
              source: {
                 object: 'card',
                 exp_month: expDate.month,
                 exp_year: expDate.year,
                 number: ccn,
                 cvc: cvn
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


          pool.connect().then(client => {
            client.query(query, values).then(result => {
              client.release();
              resolve(true);
            }).catch(err => {
              client.release();
              reject(err);
            });
          }).catch(err => {
            reject(err);
          })
        }).catch(err => {
          reject(err);
        });
      }).catch(err => {
        reject(err);
      });
    }
  });

  return promise;
}
