import { Server } from 'socket.io'
import { getChatMembers, saveMessage } from '../repositories/chats.ts'
import { createNotification } from '../repositories/notifications.ts'
import prisma from '../db.ts'

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

      const chat = await prisma.chat.findUnique({
        where: { id: data.chatId },
        select: { name: true, type: true }
      })

      const members = await getChatMembers(data.chatId)

      for (const member of members) {
        if (member.userId !== data.senderId) {

          const chatName = chat?.name 
            ? chat.name 
            : (chat?.type === 'private' ? 'Приватний чат' : `Чат #${data.chatId}`)

          const payloadObj = {
            chatId: data.chatId,
            chatName: chatName
          }
          await createNotification(member.userId, 'new_message', JSON.stringify(payloadObj))

          io.to(`user_${member.userId}`).emit('notification', {
            type: 'new_message',
            ...payloadObj
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