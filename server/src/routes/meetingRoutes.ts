import { Router } from "express"
import { PrismaClient } from "@prisma/client"
import { createMeeting, getMeetingByUserId, getMeetingById } from '../repositories/meetings.ts'
import { createChat } from '../repositories/chats.ts'
import { verifyToken } from '../middleware/authMiddleware.ts'

const prisma = new PrismaClient()

const router = Router()
router.use(verifyToken);

router.post('/meetings', async (req, res) => {
    const { title, scheduledAt, createdBy } = req.body
    const date = new Date(scheduledAt).toISOString()
    const meeting = await createMeeting(title, date, createdBy)
    const chatId = await createChat(`Зустріч: ${meeting.roomCode}`, [createdBy], 'meeting')

    if (!title?.trim()) {
        return res.status(400).json({ error: 'Назва обовʼязкова' })
    }
    
    if (new Date(scheduledAt) <= new Date()) {
        return res.status(400).json({ error: 'Дата має бути в майбутньому' })
    }
    
    const updated = await prisma.meeting.update({
        where: { id: meeting.id },
        data: { chatId }
    })
    
    res.json(updated)
})

router.get('/meetings/details/:id', async(req, res) => {
    const meetingId = Number(req.params.id)
    const meeting = await getMeetingById(meetingId)
    res.json(meeting)
})

router.get('/meetings/:userId', async(req, res) => {
    const userId = Number(req.params.userId)
    const meeting = await getMeetingByUserId(userId)
    res.json(meeting)
})

router.get('/meetings/by-code/:code', async (req, res) => {
    try {
        const { code } = req.params;
        
        const meeting = await prisma.meeting.findUnique({
            where: { roomCode: code }
        });

        if (!meeting) {
            return res.status(404).json({ error: 'Зустріч з таким кодом не знайдена' });
        }

        res.json(meeting);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Помилка сервера' });
    }
});

export default router