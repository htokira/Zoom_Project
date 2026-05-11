import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { connectDB } from './db.ts'
import { initChatRoutes } from './routes/chatRoutes.ts'
import fileRoutes from './routes/fileRoutes.ts'
import meetingRoutes from './routes/meetingRoutes.ts'
import { initInviteRoutes } from './routes/inviteRoutes.ts'
import notificationRoutes from './routes/notificationRoutes.ts'
import { initChatHub } from './hubs/chatHubs.ts'
import authRoutes from './routes/authRoutes.ts'
import { initMeetingHub } from './hubs/meetingHubs.ts'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

app.use(cors())                     
app.use(express.json())          
app.use('/api/auth', authRoutes)

app.use('/api', initChatRoutes(io))
app.use('/api', fileRoutes)
app.use('/api', meetingRoutes)
app.use('/api', initInviteRoutes(io))
app.use('/api', notificationRoutes)

initChatHub(io)
initMeetingHub(io)

httpServer.listen(3000, () => {
  console.log('Server running on port 3000')
  connectDB()
})

app.get('/', (req, res) => {
  res.send('Server is up');
});
