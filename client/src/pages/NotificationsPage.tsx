import { useState, useEffect } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')
const API = 'http://localhost:3000/api'
const user = JSON.parse(localStorage.getItem('user') || '{}')
const CURRENT_USER_ID = user.id

export default function NotificationPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  useEffect(() => {
    axios.get(`${API}/notifications/${CURRENT_USER_ID}`)
        .then(res => setNotifications(res.data))
        .catch(err => console.error(err))
    if (socket.connected) {
        socket.emit('joinUser', CURRENT_USER_ID)
    } else {
        socket.on('connect', () => {
            socket.emit('joinUser', CURRENT_USER_ID)
        })
    }
    socket.on('notification', (data: any) => {
        if (data.type === 'meeting_invite') {
            setNotifications(prev => [...prev, {
                id: Date.now(),
                type: data.type,
                payload: JSON.stringify({
                    meetingId: data.meetingId,
                    roomCode: data.roomCode,
                    title: data.title
                }),
                createdAt: new Date().toISOString(),
                isRead: false
            }])
        }
    })
    return () => {
        socket.off('notification')
        socket.off('connect')
    }
}, [])
  async function handleMarkAsRead() {
    await axios.patch(`${API}/notifications/${CURRENT_USER_ID}/read`)
    setNotifications([])
  }
  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1>Сповіщення</h1>
            {notifications.length > 0 && (
                <button onClick={handleMarkAsRead}
                    style={{ padding: '8px 16px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                    Позначити всі як прочитані
                </button>
            )}
        </div>
        {notifications.length === 0 && <p style={{ color: '#999' }}>Немає нових сповіщень</p>}
        {notifications.map((n: any) => (
            <div key={n.id} style={{ padding: '15px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
                {n.type === 'meeting_invite' && (() => {
                    let payload: any = {}
                    try {
                        payload = JSON.parse(n.payload || '{}')
                    } catch {
                        payload = { title: n.payload }
                    }
                    return (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p>📅 Запрошення на зустріч: <strong>{payload.title}</strong></p>
                            <button
                                onClick={() => {
                                    localStorage.setItem('meetingChatId', String(payload.meetingId))
                                    window.location.href = `/room/${payload.roomCode}`
                                }}
                                style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                                Приєднатись
                            </button>
                        </div>
                    )
                })()}
                <p style={{ color: '#999', fontSize: '12px' }}>{new Date(n.createdAt).toLocaleString('uk-UA')}</p>
            </div>
        ))}
    </div>
  )
}