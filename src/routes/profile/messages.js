import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';
const router = express.Router();

router.post('/get_conversations', isLoggedIn, ({body}, res) => {
  const {userId} = body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = 'SELECT "conversation"."id" AS "conversationId", "conversation"."renterId" AS "userId", "userTable"."firstName", "userTable"."lastName", "userTable"."photoUrl", "conversation"."startDate", "rentalItem"."title" AS "itemTitle", "conversation"."rentRequestId" AS "requestId" \
                    FROM (("conversation" INNER JOIN "userTable" ON "conversation"."renterId"="userTable"."userId") \
                          INNER JOIN "rentRequest" ON "conversation"."rentRequestId"="rentRequest"."requestId") \
                          INNER JOIN "rentalItem" ON "rentRequest"."itemId"="rentalItem"."itemId" \
                    WHERE "conversation"."ownerId"=$1 \
                   UNION \
                    SELECT "conversation"."id" AS "conversationId", "conversation"."ownerId" AS "userId", "userTable"."firstName", "userTable"."lastName", "userTable"."photoUrl", "conversation"."startDate", "rentalItem"."title" AS "itemTitle", "conversation"."rentRequestId" AS "requestId" \
                    FROM (("conversation" INNER JOIN "userTable" ON "conversation"."ownerId"="userTable"."userId") \
                          INNER JOIN "rentRequest" ON "conversation"."rentRequestId"="rentRequest"."requestId") \
                          INNER JOIN "rentalItem" ON "rentRequest"."itemId"="rentalItem"."itemId" \
                    WHERE "conversation"."renterId"=$1 \
                    ORDER BY "startDate" DESC';

    client.query(query, [userId]).then(result => {
      client.release();
      const conversations = result.rows;

      res.status(200).json({conversations});
    }).catch(err => {
      client.release();

      console.error('ERROR: ', err.message, err.stack);
      res.status(500).json({err});
    });
  }).catch(err => {
    console.error('ERROR: ', err.message, err.stack);
    res.status(500).json({err});
  });
});

router.post('/get_messages', isLoggedIn, ({body}, res) => {
  const {conversationId, requestId, recipientId} = body;

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    client.query('SELECT * FROM "message" WHERE "conversationId"=$1 ORDER BY "timeSent" ASC', [conversationId]).then(result => {
      const messages = result.rows;

      client.query('SELECT "userId", "firstName", "lastName", "email", "photoUrl" FROM "userTable" WHERE "userId"=$1 LIMIT 1', [recipientId]).then(result => {
        const recipient = result.rows[0];

        client.query('SELECT * FROM "rentRequest" WHERE "requestId"=$1 LIMIT 1', [requestId]).then(result => {
          const rentRequest = result.rows[0];
          const {itemId} = rentRequest;

          client.query('SELECT "itemId", "category", "costPeriod", "ownerId", "price", "title" FROM "rentalItem" WHERE "itemId"=$1 LIMIT 1', [itemId]).then(result => {
            client.release();
            const item = result.rows[0];

            res.status(200).json({
              result: {
                messages, recipient, rentRequest, item
              }
            });
          }).catch(err => {
            client.release();

            console.error('ERROR: ', err.message, err.stack);
            res.status(500).json({err});
          });
        }).catch(err => {
          client.release();

          console.error('ERROR: ', err.message, err.stack);
          res.status(500).json({err});
        });
      }).catch(err => {
        client.release();

        console.error('ERROR: ', err.message, err.stack);
        res.status(500).json({err});
      });
    }).catch(err => {
      client.release();

      console.error('ERROR: ', err.message, err.stack);
      res.status(500).json({err});
    });
  }).catch(err => {
    console.error('ERROR: ', err.message, err.stack);
    res.status(500).json({err});
  });
});

export {router as messages}
