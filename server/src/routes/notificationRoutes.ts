import { Router } from "express"
import { createNotification, markAllRead, getNotificationByUserId } from '../repositories/notifications.ts'
import { verifyToken } from '../middleware/authMiddleware.ts'

const router = Router()
router.use(verifyToken);

router.post('/notifications', async(req, res) =>{
    const {userId, type, payload} = req.body
    const notification = await createNotification(userId, type, payload)
    res.json(notification)
})

router.get('/notifications/:userId', async(req, res) =>{
    const userId = Number(req.params.userId)
    const notifications = await getNotificationByUserId(userId)
    res.json(notifications)
})

router.patch('/notifications/:userId/read', async(req, res) => {
    const userId = Number(req.params.userId)
    const mark = await markAllRead(userId)
    res.json(mark)
})

export default router