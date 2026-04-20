import { Server } from 'socket.io'
import { getChatMembers, saveMessage } from '../repositories/chats.ts'
import { createNotification } from '../repositories/notifications.ts'

export function initChatHub(io: Server) {
  io.on('connection', (socket) => {
    socket.on('joinChat', (chatId) => {
    socket.join(`chat_${chatId}`)
})
    socket.on('joinUser', (userId: number) => {
    socket.join(`user_${userId}`)
})

    socket.on('sendMessage', async (data) => {
        await saveMessage(data.chatId, data.senderId, data.text)
        const members = await getChatMembers(data.chatId)
        for (const member of members) {
          if (member.userId !== data.senderId) {
            await createNotification(member.userId, 'new_message', `New notification in chat ${data.chatId}`)
            io.to(`user_${member.userId}`).emit('notification', {
            type: 'new_message',
            chatId: data.chatId
        })
    }
}
        io.to(`chat_${data.chatId}`).emit('receiveMessage', data)
    })
    socket.on('disconnect', () => {
      console.log('User disconnected')
    })
  })
}