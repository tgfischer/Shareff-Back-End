import socketIo from 'socket.io';
import server from '../../../server';

const io = socketIo.listen(server);

io.on('connection', socket => {
  // Join the room using the conversation id
  socket.on('subscribe', room => {
    socket.join(room);
  });

  // Called when the client sends a message
  socket.on('send:message', ({message, room}) => {
    io.sockets.in(room).emit('receive:message', {message});
  });
});
