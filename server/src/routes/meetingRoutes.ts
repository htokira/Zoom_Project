import { Router } from "express"
import { createMeeting, getMeetingByUserId, getMeetingById } from '../repositories/meetings.ts'

const router = Router()

router.post('/meetings', async (req, res) => {
    const {title, scheduledAt, createdBy} = req.body
    const meeting = await createMeeting(title, scheduledAt, createdBy)
    res.json(meeting)
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

export default router