import { Server, Socket } from 'socket.io';

export function initMeetingHub(io: Server) {
    io.on('connection', (socket: Socket) => {
        
        socket.on('join-room', (roomId: string, peerId: string) => {
            socket.join(roomId);
            
            socket.to(roomId).emit('user-connected', peerId);

            socket.on('disconnect', () => {
                socket.to(roomId).emit('user-disconnected', peerId);
            });
        });
    });
}