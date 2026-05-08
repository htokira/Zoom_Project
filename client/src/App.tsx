import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import MeetingRoom from './pages/RoomPage';
import ChatsPage from './pages/ChatsPage';
import MeetingsPage from './pages/MeetingsPage';
import NotificationPage from './pages/NotificationsPage';
import { io } from 'socket.io-client'

const globalSocket = io('http://localhost:3000')

function App() {
  const [joinCode, setJoinCode] = useState('');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const navigate = useNavigate();

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
  }, [user.id])

  const handleJoinByCode = () => {
    if (joinCode.trim()) {
      localStorage.removeItem('meetingChatId'); 
      navigate(`/room/${joinCode.trim()}`);
    } else {
      alert('Будь ласка, введіть код кімнати');
    }
  };

  const handleQuickMeeting = async () => {
    const userData = localStorage.getItem('user');
    if (!userData) {
        alert('Помилка: користувач не авторизований');
        return;
    }
    const userObj = JSON.parse(userData);
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 1);

    try {
      const res = await axios.post('http://localhost:3000/api/meetings', {
          title: 'Швидка зустріч',
          scheduledAt: futureDate.toISOString(),
          createdBy: userObj.id
      });

      localStorage.setItem('meetingChatId', String(res.data.chatId));
      navigate(`/room/${res.data.roomCode}`);
    } catch (error) {
      console.error('Помилка створення зустрічі:', error);
      alert('Не вдалося створити зустріч');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/chats" element={<ChatsPage />} />
      <Route path="/meetings" element={<MeetingsPage />} />
      <Route path="/notifications" element={<NotificationPage />} />
      
      <Route path="/profile" element={
        <div className="profile-page">
          <h2>Налаштування профілю</h2>
          <p>Користувач: <strong>{user.username}</strong></p>
          <p>Email: <strong>{user.email}</strong></p>
          <div className="profile-buttons">
            <button onClick={handleLogout} className="dash-btn success-btn">Вийти з акаунту</button>
            <button onClick={() => navigate('/dashboard')} className="dash-btn secondary-btn">Назад у меню</button>
          </div>
        </div>
      } />

      <Route path="/dashboard" element={
        <div className="dashboard-container">
          
          <header className="dashboard-header">
            <h1 className="dashboard-logo">Zummer</h1>
            <div className="user-profile-widget">
              <span className="welcome-text">Привіт, {user.username}!</span>
              <button onClick={() => navigate('/profile')} className="avatar-button">
                {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </button>
            </div>
          </header>

          <main className="dashboard-main">
            
            <div className="dashboard-left-group">
              <section className="dashboard-card join-card">
                <h2>Приєднатися до зустрічі</h2>
                <div className="join-form">
                  <input 
                    type="text" 
                    placeholder="Введіть код кімнати" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="dashboard-input"
                  />
                  <button onClick={handleJoinByCode} className="dash-btn primary-btn">
                    🔗 Приєднатися
                  </button>
                </div>
              </section>

              <section className="dashboard-card meetings-card">
                <h2>Мої зустрічі</h2>
                <div className="card-buttons">
                  <button onClick={handleQuickMeeting} className="dash-btn success-btn">
                    🎥 Швидка зустріч
                  </button>
                  <button onClick={() => navigate('/meetings')} className="dash-btn secondary-btn">
                    📅 Заплановані зустрічі
                  </button>
                </div>
              </section>
            </div>

            <div className="dashboard-right-group">
              <section className="dashboard-card comms-card">
                <div className="card-buttons">
                  <button onClick={() => navigate('/notifications')} className="dash-btn secondary-btn">
                    🔔 Сповіщення
                  </button>
                  <button onClick={() => navigate('/chats')} className="dash-btn secondary-btn">
                    💬 Чати
                  </button>
                </div>
              </section>

              <div className="dashboard-gif-container">
                <img src="/cat.gif" alt="cat" />
              </div>
            </div>

          </main>
        </div>
      } />

      <Route path="/room/:roomCode" element={<MeetingRoom />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;