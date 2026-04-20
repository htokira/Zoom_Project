import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import axios from 'axios'
import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import MeetingRoom from './pages/RoomPage';
import ChatsPage from './pages/ChatsPage';
import MeetingsPage from './pages/MeetingsPage';
import NotificationPage from './pages/NotificationsPage'
import { useEffect } from 'react'
import { io } from 'socket.io-client'

const globalSocket = io('http://localhost:3000')

function App() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  useEffect(() => {
    if (!user.id) return
    if (globalSocket.connected) {
      globalSocket.emit('joinUser', user.id)
    } else {
      globalSocket.on('connect', () => {
        globalSocket.emit('joinUser', user.id)
      })
    }
    
    globalSocket.on('notification', (data: any) => {
      if (data.type === 'new_message') {
        alert('💬 Нове повідомлення в чаті!')
      } else if (data.type === 'meeting_invite') {
        alert(`📅 Вас запрошено на зустріч: ${data.title}`)
      }
    })
    
    return () => {
      globalSocket.off('notification')
    }
  }, [])
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/chats" element={<ChatsPage />} />
      <Route path="/meetings" element={<MeetingsPage />} />
      <Route path="/notifications" element={<NotificationPage />} />
      <Route path="/dashboard" element={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px' }}>Головне меню</h1>
          <button onClick={() => window.location.href = '/chats'}
            style={{ padding: '12px 32px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '200px', fontSize: '16px' }}>
            💬 Чати
          </button>
          <button onClick={() => window.location.href = '/meetings'}
            style={{ padding: '12px 32px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '200px', fontSize: '16px' }}>
            📅 Зустрічі
          </button>
          <button onClick={() => window.location.href = '/notifications'}
            style={{ padding: '12px 32px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '200px', fontSize: '16px' }}>
            🔔 Сповіщення
          </button>
          <button onClick={async () => {
            const user = JSON.parse(localStorage.getItem('user') || '{}')
            const res = await axios.post('http://localhost:3000/api/meetings', {
                title: 'Швидка зустріч',
                scheduledAt: new Date().toISOString(),
                createdBy: user.id
            })
            localStorage.setItem('meetingChatId', String(res.data.chatId))
            window.location.href = `/room/${res.data.roomCode}`
        }}
            style={{ padding: '12px 32px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', width: '200px', fontSize: '16px' }}>
            🎥 Швидка зустріч
          </button>
      </div>
    } />

      <Route path="/room/:roomCode" element={<MeetingRoom />} />
      
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    
    </Routes>
  );
}

export default App;