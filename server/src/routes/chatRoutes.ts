import { Router } from "express"
import { Server } from "socket.io"
import { getChatByUserId, createChat, getMessages, createPrivateChat, saveMessage } from '../repositories/chats.ts'

export function initChatRoutes(io: Server) {
    const router = Router()

    router.post('/chats/private', async (req, res) => {
        const { userId1, userId2 } = req.body
        const chat = await createPrivateChat(userId1, userId2)
        res.json(chat)
    })

    router.post('/messages', async (req, res) => {
        const { chatId, senderId, text } = req.body
        if (!text?.trim()) {
            return res.status(400).json({ error: 'Повідомлення не може бути порожнім' })
        }
        if (!chatId || !senderId) {
            return res.status(400).json({ error: 'chatId і senderId обовʼязкові' })
        }
        const messageId = await saveMessage(chatId, senderId, text)
        res.json({ id: messageId })
    })

    router.get('/chats/:userId', async (req, res) => {
        const userId = Number(req.params.userId)
        const chats = await getChatByUserId(userId)
        res.json(chats)
    })

    router.post('/chats', async (req, res) => {
        const { name, memberIds } = req.body
        if (!memberIds || memberIds.length === 0) {
            return res.status(400).json({ error: 'Додайте хоча б одного учасника' })
        }
        const chatId = await createChat(name, memberIds)
        const chat = await getChatByUserId(memberIds[0])
        for (const userId of memberIds) {
            io.to(`user_${userId}`).emit('newChat', { chatId })
        }
        res.json(chatId)
    })

    router.get('/chats/:chatId/messages', async (req, res) => {
        const skip = Number(req.query.skip) || 0
        const take = Number(req.query.take) || 50
        const chatId = Number(req.params.chatId)
        const messages = await getMessages(chatId, skip, take)
        res.json(messages)
    })

    return router
}