import { Router } from "express"
import { createInvites, updateInviteStatus, getInvitesByMeetingId } from '../repositories/invites.ts'

const router = Router()

router.post('/invites', async(req, res) => {
    const {meetingId, userIds} = req.body
    const invite = await createInvites(meetingId, userIds)
    res.json(invite)
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

export default router