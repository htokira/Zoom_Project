import { useState } from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Спроба входу:', { email, password });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Вхід у *супер програмка*</h2>
        
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