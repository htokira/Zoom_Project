import { Server } from 'socket.io'
import { getChatMembers, saveMessage } from '../repositories/chats.ts'
import { createNotification } from '../repositories/notifications.ts'
import prisma from '../db.ts'

export function initChatHub(io: Server) {
  io.on('connection', (socket) => {
    
    socket.on('joinChat', (chatId) => {
      console.log('joinChat отримано, chatId:', chatId);
      socket.join(`chat_${chatId}`)
    })

    socket.on('joinUser', (userId: number) => {
      console.log('joinUser отримано, userId:', userId);
      socket.join(`user_${userId}`)
    })

    socket.on('sendMessage', async (data) => {
      console.log('sendMessage отримано:', data);
      
      // 1. Зберігаємо повідомлення в базу
      await saveMessage(data.chatId, data.senderId, data.text)

      // 2. Отримуємо інфо про чат для гарного сповіщення
      const chat = await prisma.chat.findUnique({
        where: { id: data.chatId },
        select: { name: true, type: true }
      })

      // 3. Отримуємо список учасників чату
      const members = await getChatMembers(data.chatId)

      for (const member of members) {
        if (member.userId !== data.senderId) {
          console.log('Створюємо сповіщення для користувача:', member.userId);

          // Формуємо назву чату
          const chatName = chat?.name 
            ? chat.name 
            : (chat?.type === 'private' ? 'Приватний чат' : `Чат #${data.chatId}`)

          const payloadObj = {
            chatId: data.chatId,
            chatName: chatName
          }

          // Записуємо сповіщення в БД
          await createNotification(member.userId, 'new_message', JSON.stringify(payloadObj))

          // Відправляємо пуш-сповіщення в сокет користувача
          io.to(`user_${member.userId}`).emit('notification', {
            type: 'new_message',
            ...payloadObj
          })
        }
      }

      // 4. Пересилаємо саме повідомлення всім у чаті
      console.log('Емітимо в кімнату:', `chat_${data.chatId}`);
      io.to(`chat_${data.chatId}`).emit('receiveMessage', data)
    })

    socket.on('disconnect', () => {
      console.log('User disconnected')
    })
  })
}