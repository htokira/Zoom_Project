import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Спроба реєстрації:', { username, email, password });
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
              placeholder="JohnDoe"
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