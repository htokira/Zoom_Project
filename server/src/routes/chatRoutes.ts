import { Router } from "express"
import { getChatByUserId, createChat, getMessages, createPrivateChat } from '../repositories/chats.ts'

const router = Router()

router.post('/chats/private', async (req, res) => {
    const { userId1, userId2 } = req.body
    const chat = await createPrivateChat(userId1, userId2)
    res.json(chat)
})

router.get('/chats/:userId', async (req, res) => {
    const userId = Number(req.params.userId)
    const chats = await getChatByUserId(userId)
    res.json(chats)
})

router.post('/chats', async (req, res) => {
    const { name, memberIds } = req.body
    const chat = await createChat(name, memberIds)
    res.json(chat)
})

router.get('/chats/:chatId/messages', async (req, res) => {
    const skip = Number(req.query.skip) || 0
    const take = Number(req.query.take) || 50
    const chatId = Number(req.params.chatId)
    const messages = await getMessages(chatId, skip, take)
    res.json(messages)
})

export default router