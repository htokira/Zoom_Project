import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { connectDB } from './db.ts'
import cors from 'cors'
import chatRoutes from './routes/chatRoutes.ts'
import fileRoutes from './routes/fileRoutes.ts'
import meetingRoutes from './routes/meetingRoutes.ts'
import inviteRoutes from './routes/inviteRoutes.ts'
import notificationRoutes from './routes/notificationRoutes.ts'
import { initChatHub } from './hubs/chatHubs.ts'
import authRoutes from './routes/authRoutes.ts'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' } 
})

app.use(cors())                     
app.use(express.json())          
app.use('/api/auth', authRoutes)
app.use('/api', chatRoutes)
app.use('/api', fileRoutes)
app.use('/api', meetingRoutes)
app.use('/api', inviteRoutes)
app.use('/api', notificationRoutes)

initChatHub(io)

httpServer.listen(3000, () => {
  console.log('Server running on port 3000')
  connectDB()
})
