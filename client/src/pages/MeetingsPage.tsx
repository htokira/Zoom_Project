import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://localhost:3000/api'
const user = JSON.parse(localStorage.getItem('user') || '{}')
const CURRENT_USER_ID = user.id

export default function MeetingsPage() {
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
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Зустрічі</h1>
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
        <h2>Нова зустріч</h2>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Назва зустрічі"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={e => setScheduledAt(e.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
          type="text"
          placeholder="Ніки учасників через кому"
          value={memberUsernames}
          onChange={e => setMemberUsernames(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          {meetingError && <p style={{ color: 'red', fontSize: '13px' }}>{meetingError}</p>}
          <button
            onClick={handleCreateMeeting}
            style={{ padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
            Створити
          </button>
        </div>
      </div>
      <div>
        <h2>Заплановані зустрічі</h2>
        {meetings.length === 0 && <p>Немає зустрічей</p>}
        {meetings.map((meeting: any) => (
          <div key={meeting.id} style={{ padding: '15px', marginBottom: '10px', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3>{meeting.title}</h3>
            <p>Час: {new Date(meeting.scheduledAt).toLocaleString('uk-UA')}</p>
            <p>Код кімнати: <strong>{meeting.roomCode}</strong></p>
            <button onClick={async () => {
              localStorage.setItem('meetingChatId', String(meeting.chatId))
              window.location.href = `/room/${meeting.roomCode}`
            }}
            style={{ padding: '8px 16px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Приєднатись
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}