import { Server } from 'socket.io'
import { getChatMembers, saveMessage } from '../repositories/chats.ts'
import { createNotification } from '../repositories/notifications.ts'

export function initChatHub(io: Server) {
  io.on('connection', (socket) => {
    socket.on('joinChat', (chatId) => {
      socket.join(`chat_${chatId}`)
    })

    socket.on('sendMessage', async (data) => {
        await saveMessage(data.chatId, data.senderId, data.text)
        const members = await getChatMembers(data.chatId)
        for (const member of members) {
          if (member.UserId !== data.senderId) {
            await createNotification(member.UserId, 'new_message', `New notification in chat ${data.chatId}`)
            io.to(`user_${member.UserId}`).emit('notification', {
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