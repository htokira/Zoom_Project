import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../App.css';
import axios from 'axios';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!_\-?]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setPasswordError('Пароль має містити мінімум 8 символів, 1 велику літеру, 1 цифру та 1 спецсимвол (! _ - ?)');
      return;
    }

    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', {
        username,
        email,
        password
      });
      console.log('Успішна реєстрація та вхід:', response.data);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));

      alert('Реєстрація успішна!');
      navigate('/dashboard'); 

    } catch (error) {
      console.error('Помилка реєстрації:', error);
      alert('Помилка реєстрації!');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Реєстрація</h2>
        
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <label>Ім'я користувача</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="auth-input"
              placeholder="YourNickname"
            />
          </div>

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
            {passwordError && (
              <p style={{ color: '#8a0d0d', fontSize: '13px', marginTop: '4px' }}>
                {passwordError}
              </p>
            )}
          </div>

          <button type="submit" className="auth-button success">
            Створити акаунт
          </button>
        </form>

        <p className="auth-link-text">
          Вже маєте акаунт? <Link to="/login" className="auth-link">Увійти</Link>
        </p>
      </div>
    </div>
  );
}