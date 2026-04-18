import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import MeetingRoom from './pages/RoomPage';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      <Route path="/dashboard" element={
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100">
          <h1 className="text-3xl font-bold text-gray-700 mb-8">Головне меню / Кабінет</h1>
          
          <button 
            onClick={() => window.location.href = '/room/test-room'}>
            Створити швидку зустріч
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