import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Controllo credenziali da .env
    const validUsername = process.env.REACT_APP_LOGIN_USERNAME || '1234567890';
    const validPassword = process.env.REACT_APP_LOGIN_PASSWORD || '0987654321';

    setTimeout(() => {
      if (credentials.username === validUsername && credentials.password === validPassword) {
        onLogin(true);
      } else {
        setError('Credenziali non valide');
      }
      setLoading(false);
    }, 1000);
  };

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">
            <img src="/ige.svg" alt="IGE" style={{ width: '96px', height: '96px', backgroundColor: '#000000', padding: '8px', borderRadius: '8px' }} />
          </div>
          <h1 className="login-title">IGE Gold Certificate</h1>
          <p className="login-subtitle">Sistema di Certificazione Blockchain</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert alert-error">
              <Lock size={16} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <User size={16} />
              Username
            </label>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Inserisci username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} />
              Password
            </label>
            <div className="password-input">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={credentials.password}
                onChange={handleChange}
                className="form-input"
                placeholder="Inserisci password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary login-button"
          >
            {loading ? (
              <div className="loading" style={{ width: '20px', height: '20px' }}></div>
            ) : (
              'Accedi'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="text-sm" style={{ color: '#a0a0a0' }}>
            Sistema riservato IGE Gold S.P.A.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
