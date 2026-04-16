import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MeetingRoom from './pages/RoomPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Головна сторінка */}
        <Route path="/" element={
          <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Вітаємо у Zoom Clone</h1>
            <button onClick={() => window.location.href = '/room/test-room'}>
              Створити швидку зустріч
            </button>
          </div>
        } />

        {/* Сторінка кімнати зустрічі */}
        <Route path="/room/:roomCode" element={<MeetingRoom />} />
      </Routes>
    </Router>
  );
}

export default App;