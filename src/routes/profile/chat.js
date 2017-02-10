import socketIo from 'socket.io';
import moment from 'moment';
import {pool} from '../../app';
import {getPayload} from '../../utils/Utils';
import {nls} from '../../i18n/en';
import server from '../../../server';

const io = socketIo.listen(server);

io.on('connection', socket => {
  // Join the room using the conversation id
  socket.on('subscribe', ({conversationId, userId, token}) => {
    getPayload(token).then(payload => {
      if (userId === payload) {
        socket.join(conversationId);
      } else {
        io.sockets.in(conversationId).emit('error', nls.UNAUTHORIZED);
      }
    }).catch(err => {
      console.error('ERROR: ', err.message, err.stack);
      io.sockets.in(conversationId).emit('error', nls.GENERIC_ERROR_MESSAGE);
    })
  });

  // Called when the client sends a message
  socket.on('send:message', ({content, senderId, conversationId, token}) => {
    getPayload(token).then(payload => {
      if (senderId === payload) {
        // Connect to the pool, and grab a client
        pool.connect().then(client => {
          let query = 'INSERT INTO "message" ("content", "senderId", "conversationId", "timeSent") \
                          VALUES ($1, $2, $3, $4)';

          // Insert the message into the database
          client.query(query, [content, senderId, conversationId, moment()]).then(result => {
            query = 'SELECT * FROM "message" WHERE "conversationId"=$1 ORDER BY "timeSent" ASC';

            // Insert the message into the database
            client.query(query, [conversationId]).then(result => {
              client.release();

              // Get the messages from the result
              const messages = result.rows;

              // Broadcast the messages to both the sender and receiver so they can display
              // them in their chatbox
              io.sockets.in(conversationId).emit('receive:messages', messages);
            }).catch(err => {
              client.release();

              console.error('ERROR: ', err.message, err.stack);
              io.sockets.in(conversationId).emit('error', nls.GENERIC_ERROR_MESSAGE);
            });
          }).catch(err => {
            client.release();

            console.error('ERROR: ', err.message, err.stack);
            io.sockets.in(conversationId).emit('error', nls.GENERIC_ERROR_MESSAGE);
          });
        }).catch(err => {
          console.error('ERROR: ', err.message, err.stack);
          io.sockets.in(conversationId).emit('error', nls.GENERIC_ERROR_MESSAGE);
        });
      } else {
        io.sockets.in(conversationId).emit('error', nls.UNAUTHORIZED);
      }
    }).catch(err => {
      console.error('ERROR: ', err.message, err.stack);
      io.sockets.in(conversationId).emit('error', nls.GENERIC_ERROR_MESSAGE);
    })
  });
});
