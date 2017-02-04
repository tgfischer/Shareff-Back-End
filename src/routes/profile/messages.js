import express from 'express';
import {pool} from '../../app';
import {isLoggedIn} from '../../utils/Utils';
const router = express.Router();

router.post('/get_conversations', isLoggedIn, (req, res) => {
  const {userId} = req.body;

  console.log(userId);

  // Connect to the pool, and grab a client
  pool.connect().then(client => {
    const query = 'SELECT "conversation"."id", "conversation"."rentRequestId", "conversation"."startDate", ( \
                      SELECT row_to_json(ROW(row)) \
                      FROM ( \
                        SELECT "userTable".* FROM "conversation" INNER JOIN "userTable" ON "conversation"."ownerId"="userTable"."userId" \
                      ) row \
                    ) AS "owner", ( \
                      SELECT row_to_json(ROW(row)) \
                      FROM ( \
                        SELECT "userTable".* FROM "conversation" INNER JOIN "userTable" ON "conversation"."renterId"="userTable"."userId" \
                      ) row \
                    ) AS "renter" \
                  FROM "conversation" \
                  WHERE "conversation"."renterId"=$1 OR "conversation"."ownerId"=$1';

    client.query(query, [userId]).then(result => {
      client.release();
      const conversations = result.rows;

      console.log(JSON.stringify(conversations, null, 2));

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

export {router as messages}
