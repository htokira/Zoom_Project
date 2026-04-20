import { Router } from "express"
import { Server } from "socket.io"
import { createInvites, updateInviteStatus, getInvitesByMeetingId } from '../repositories/invites.ts'
import { createNotification } from '../repositories/notifications.ts'
import { getMeetingById } from '../repositories/meetings.ts'

export function initInviteRoutes(io: Server) {
    const router = Router()

    router.post('/invites', async(req, res) => {
    const {meetingId, userIds} = req.body
    if (!meetingId) {
        return res.status(400).json({ error: 'meetingId обовʼязковий' })
    }
    if (!userIds || userIds.length === 0) {
        return res.status(400).json({ error: 'Додайте хоча б одного учасника' })
    }
    await createInvites(meetingId, userIds)
    const meeting = await getMeetingById(meetingId)
    for (const userId of userIds) {
        const payload = JSON.stringify({ 
            meetingId, 
            roomCode: meeting?.roomCode,
            title: meeting?.title
        })
        await createNotification(userId, 'meeting_invite', payload)
        io.to(`user_${userId}`).emit('notification', {
            type: 'meeting_invite',
            meetingId,
            roomCode: meeting?.roomCode,
            title: meeting?.title
        })
    }
    res.json({ success: true })
})

    router.get('/invites/:meetingId', async(req, res) => {
        const meetingId = Number(req.params.meetingId)
        const invite = await getInvitesByMeetingId(meetingId)
        res.json(invite)
    })

    router.patch('/invites/:id', async(req, res) => {
        const inviteId = Number(req.params.id)
        const { status } = req.body
        const update = await updateInviteStatus(inviteId, status)
        res.json(update)
    })

    return router
}