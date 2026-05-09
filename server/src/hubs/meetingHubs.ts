import { Server, Socket } from 'socket.io';

export function initMeetingHub(io: Server) {
    io.on('connection', (socket: Socket) => {
        console.log('User connected to socket:', socket.id);
        socket.on('join-room', (roomCode: string, peerId: string) => {
            console.log(`Користувач ${peerId} увійшов у ${roomCode}`);
            socket.join(roomCode);
            socket.to(roomCode).emit('user-connected', peerId);
            
            socket.on('disconnect', () => {
                console.log(`Користувач ${peerId} покинув ${roomCode}`);
                socket.to(roomCode).emit('user-disconnected', peerId);
            });

            socket.on('toggle-mic', (roomCode, peerId, isEnabled) => {
              socket.to(roomCode).emit('user-toggled-mic', peerId, isEnabled);
            });
        });
      });
}
