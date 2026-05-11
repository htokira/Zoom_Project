import { Server, Socket } from 'socket.io';

export function initMeetingHub(io: Server) {
    const roomUsers: Record<string, string[]> = {};
    const roomMicStates: Record<string, Record<string, boolean>> = {};

    io.on('connection', (socket: Socket) => {
        const s = socket as any;
        console.log('User connected to socket:', socket.id);
        
        socket.on('join-room', (roomCode: string, peerId: string, userName: string, userId) => {
            if (!userId) return;

            if (roomUsers[roomCode] && roomUsers[roomCode].includes(userId)) {
                console.log(`User ${userId} is already in room ${roomCode}. Handling reconnection...`);
                socket.emit('access-denied', 'Ви вже підключені до цієї зустрічі.');
                return;
            }

            console.log(`Користувач ${userName} (${userId}) увійшов у ${roomCode}`);
            socket.join(roomCode);
            
            if (!roomUsers[roomCode]) roomUsers[roomCode] = [];
            roomUsers[roomCode].push(userId);

            if (!roomMicStates[roomCode]) roomMicStates[roomCode] = {};
            roomMicStates[roomCode][peerId] = true;

            s.userId = userId;
            s.roomCode = roomCode;
            s.peerId = peerId;

            socket.to(roomCode).emit('user-connected', peerId, userName);
            socket.emit('initial-mic-states', roomMicStates[roomCode]);
        }); 

        socket.on('disconnect', () => {
            const { userId, roomCode, peerId } = s;
            
            if (roomCode && roomUsers[roomCode]) {
              console.log(`Користувач ${peerId} покинув ${roomCode}`);

              roomUsers[roomCode] = roomUsers[roomCode].filter(id => id !== userId);

              if (roomUsers[roomCode].length === 0) {
                  delete roomUsers[roomCode];
              }

              socket.to(roomCode).emit('user-disconnected', peerId);
            }
            
            if (roomCode && roomMicStates[roomCode]) {
              delete roomMicStates[roomCode][peerId];
              
              if (Object.keys(roomMicStates[roomCode]).length === 0) {
                  delete roomMicStates[roomCode];
              }
            }
        });

        socket.on('toggle-mic', (roomCode, peerId, isEnabled) => {
            if (roomMicStates[roomCode]) {
              roomMicStates[roomCode][peerId] = isEnabled;
            }
            socket.to(roomCode).emit('user-toggled-mic', peerId, isEnabled);
        });
        
      });
}
