import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password
      });

      console.log('Успішний вхід:', response.data);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      alert('Ви успішно увійшли!');
      navigate('/dashboard'); 

    } catch (error) {
      console.error('Помилка входу:', error);
      alert('Невірний email або пароль!');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="gif-container">
          <img src="/cat.gif" alt="cat" />
        </div>

        <h2 className="auth-title">Вхід у Zummer </h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="auth-input"
              placeholder="your@email.com"
            />
          </div>
          
          <div className="input-group">
            <label>Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="auth-input"
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="auth-button">
            Увійти
          </button>
        </form>

        <p className="auth-link-text">
          Ще немає акаунту? <Link to="/register" className="auth-link">Зареєструватися</Link>
        </p>
      </div>
    </div>
  );
}