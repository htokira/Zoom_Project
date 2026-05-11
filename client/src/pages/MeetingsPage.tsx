import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://localhost:3000/api'

export default function MeetingsPage() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const CURRENT_USER_ID = user.id
  const [meetings, setMeetings] = useState([])
  const [title, setTitle] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [error, setError] = useState('')
  const [memberUsernames, setMemberUsernames] = useState('')
  const [meetingError, setMeetingError] = useState('')

  useEffect(() => {
    axios.get(`${API}/meetings/${CURRENT_USER_ID}`)
      .then(res => setMeetings(res.data))
      .catch(err => console.error(err))
  }, [])

  async function handleCreateMeeting() {
    try {
        setMeetingError('')
        if (!title.trim()) {
          setMeetingError('Введіть назву зустрічі')
          return
        }
        if (!scheduledAt) {
          setMeetingError('Введіть дату зустрічі')
          return
        }
        if (new Date(scheduledAt) <= new Date()) {
          setMeetingError('Дата зустрічі має бути в майбутньому')
          return
        }
        const usernames = memberUsernames.split(',').map(u => u.trim()).filter(u => u)
        const ids: number[] = []
        for (const username of usernames) {
            const res = await axios.get(`${API}/auth/users/search?username=${username}`)
            const found = res.data.find((u: any) => u.username === username)
            if (!found) {
                setMeetingError(`Юзера "${username}" не знайдено`)
                return
            }
            if (found.id !== CURRENT_USER_ID) {
                ids.push(found.id)
            }
        }
        const res = await axios.post(`${API}/meetings`, {
            title,
            scheduledAt,
            createdBy: CURRENT_USER_ID
        })
        const meetingId = res.data.id
        if (ids.length > 0) {
            await axios.post(`${API}/invites`, {
                meetingId,
                userIds: ids
            })
        }

        const updated = await axios.get(`${API}/meetings/${CURRENT_USER_ID}`)
        setMeetings(updated.data)
        setTitle('')
        setScheduledAt('')
        setMemberUsernames('')
        setError('')
      } catch (err) {
        setError('Помилка при створенні зустрічі')
        console.error(err)
      }
    }
  return (
    <div className="page-container">
      <div className="page-content">
        <h1 className="page-title">Зустрічі</h1>
        
        <div className="glass-card">
          <h2 style={{marginTop: 0, color: '#0b3d60', marginBottom: '20px'}}>Нова зустріч</h2>
          {error && <p style={{ color: '#d93025', fontWeight: 'bold' }}>{error}</p>}
          <div className="form-group">
            <input
              type="text"
              placeholder="Назва зустрічі"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="dashboard-input"
            />
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="dashboard-input"
            />
            <input
              type="text"
              placeholder="Ніки учасників через кому"
              value={memberUsernames}
              onChange={e => setMemberUsernames(e.target.value)}
              className="dashboard-input"
            />
            {meetingError && <p style={{ color: '#d93025', fontSize: '14px', fontWeight: 'bold' }}>{meetingError}</p>}
            <button onClick={handleCreateMeeting} className="dash-btn primary-btn">
              Створити
            </button>
          </div>
        </div>

        <div className="glass-card">
          <h2 style={{marginTop: 0, color: '#0b3d60', marginBottom: '20px'}}>Заплановані зустрічі</h2>
          {meetings.length === 0 && <p style={{color: '#1a4f76', margin: 0}}>Немає зустрічей</p>}
          {meetings.map((meeting: any) => (
            <div key={meeting.id} className="list-item">
              <div className="flex-between">
                <div>
                  <h3>{meeting.title}</h3>
                  <p>Час: {new Date(meeting.scheduledAt).toLocaleString('uk-UA')}</p>
                  <p>Код кімнати: <strong>{meeting.roomCode}</strong></p>
                </div>
                <button 
                  onClick={async () => {
                    localStorage.setItem('meetingChatId', String(meeting.chatId))
                    window.location.href = `/room/${meeting.roomCode}`
                  }}
                  className="dash-btn success-btn"
                  style={{width: 'auto', padding: '10px 24px'}}
                >
                  Приєднатись
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}