import { Server, Socket } from 'socket.io';

interface RoomUser {
  peerId: string;
  userName: string;
  userId: number;
}

export function initMeetingHub(io: Server) {
    const roomUsers: Record<string, number[]> = {};                    // roomCode → [userIds]
    const roomPeerMap: Record<string, Record<string, RoomUser>> = {}; // roomCode → peerId → info
    const roomMicStates: Record<string, Record<string, boolean>> = {};

    io.on('connection', (socket: Socket) => {
        const s = socket as any;
        console.log('User connected to socket:', socket.id);

        socket.on('join-room', (roomCode: string, peerId: string, userName: string, userId: number) => {
            if (!userId || !roomCode || !peerId) return;

            // Захист від повторного входу
            if (roomUsers[roomCode]?.includes(userId)) {
                console.log(`User ${userId} is already in room ${roomCode}`);
                socket.emit('access-denied', 'Ви вже підключені до цієї зустрічі.');
                return;
            }

            console.log(`Користувач ${userName} (${userId}) увійшов у кімнату ${roomCode}`);

            socket.join(roomCode);

            // Ініціалізація кімнати
            if (!roomUsers[roomCode]) roomUsers[roomCode] = [];
            if (!roomPeerMap[roomCode]) roomPeerMap[roomCode] = {};
            if (!roomMicStates[roomCode]) roomMicStates[roomCode] = {};

            roomUsers[roomCode].push(userId);
            roomPeerMap[roomCode][peerId] = { peerId, userName, userId };
            roomMicStates[roomCode][peerId] = true;

            s.userId = userId;
            s.roomCode = roomCode;
            s.peerId = peerId;

            // === КРИТИЧНО ВАЖЛИВО ===
            // Надсилаємо новому користувачу список усіх, хто вже в кімнаті
            const existingUsers = Object.values(roomPeerMap[roomCode])
                .filter(u => u.peerId !== peerId)
                .map(u => ({
                    peerId: u.peerId,
                    userName: u.userName
                }));

            socket.emit('all-users', existingUsers);

            // Повідомляємо інших учасників про нового користувача
            socket.to(roomCode).emit('user-connected', peerId, userName);

            // Надсилаємо поточні стани мікрофонів
            socket.emit('initial-mic-states', roomMicStates[roomCode]);
        });

        // === Екранна трансляція ===
        socket.on('start-screen-share', (roomCode: string, peerId: string) => {
            socket.to(roomCode).emit('user-started-screen', peerId);
        });

        socket.on('stop-screen-share', (roomCode: string, peerId: string) => {
            socket.to(roomCode).emit('user-stopped-screen', peerId);
        });

        // === Перемикання мікрофона ===
        socket.on('toggle-mic', (roomCode: string, peerId: string, isEnabled: boolean) => {
            if (roomMicStates[roomCode]) {
                roomMicStates[roomCode][peerId] = isEnabled;
            }
            socket.to(roomCode).emit('user-toggled-mic', peerId, isEnabled);
        });
        socket.on('toggle-video', (roomCode: string, peerId: string, isEnabled: boolean) => {
            socket.to(roomCode).emit('user-toggled-video', peerId, isEnabled);
        });

        // === Відключення ===
        socket.on('disconnect', () => {
            const { userId, roomCode, peerId } = s;

            if (roomCode && roomUsers[roomCode]) {
                roomUsers[roomCode] = roomUsers[roomCode].filter(id => id !== userId);

                if (roomUsers[roomCode].length === 0) {
                    delete roomUsers[roomCode];
                    delete roomPeerMap[roomCode];
                    delete roomMicStates[roomCode];
                }
            }

            if (roomCode && roomPeerMap[roomCode] && peerId) {
                delete roomPeerMap[roomCode][peerId];
            }

            if (roomCode && roomMicStates[roomCode] && peerId) {
                delete roomMicStates[roomCode][peerId];
            }

            if (roomCode && peerId) {
                socket.to(roomCode).emit('user-disconnected', peerId);
            }
        });
    });
}