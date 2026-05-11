import { useState, useEffect } from 'react'
import axios from 'axios'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')
const API = 'http://localhost:3000/api'

export default function NotificationPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const CURRENT_USER_ID = user.id
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
    <div className="page-container">
      <div className="page-content glass-card">
        <div className="flex-between" style={{ marginBottom: '30px' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Сповіщення</h1>
            {notifications.length > 0 && (
                <button onClick={handleMarkAsRead} className="dash-btn primary-btn" style={{width: 'auto', padding: '10px 20px'}}>
                    Позначити як прочитані
                </button>
            )}
        </div>
        {notifications.length === 0 && <p style={{ color: '#1a4f76', textAlign: 'center', fontSize: '18px' }}>Немає нових сповіщень</p>}
        {notifications.map((n: any) => (
            <div key={n.id} className="list-item">
                {n.type === 'meeting_invite' && (() => {
                    let payload: any = {}
                    try {
                        payload = JSON.parse(n.payload || '{}')
                    } catch {
                        payload = { title: n.payload }
                    }
                    return (
                        <div className="flex-between">
                            <p style={{fontSize: '18px', color: '#0b3d60'}}>📅 Запрошення на зустріч: <strong>{payload.title}</strong></p>
                            <button
                                onClick={() => {
                                    localStorage.setItem('meetingChatId', String(payload.meetingId))
                                    window.location.href = `/room/${payload.roomCode}`
                                }}
                                className="dash-btn success-btn"
                                style={{width: 'auto', padding: '10px 20px'}}
                            >
                                Приєднатись
                            </button>
                        </div>
                    )
                })()}
                <p style={{ color: '#3a6b8c', fontSize: '14px' }}>{new Date(n.createdAt).toLocaleString('uk-UA')}</p>
            </div>
        ))}
      </div>
    </div>
  )
}