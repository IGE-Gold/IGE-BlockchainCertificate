import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import './styles/App.css';
import { testConnection } from './services/api';
import CertificateForm from './components/CertificateForm';
import BulkImport from './components/BulkImport';
import CertificateList from './components/CertificateList';
import CertificateVerification from './components/CertificateVerification';
import Stats from './components/Stats';
import CsvEditor from './components/CsvEditor';
import Login from './components/Login';
import { FileText, Search, BarChart3, Home, Database } from 'lucide-react';

// Componente Header
const Header = ({ onLogout }) => {
  const location = useLocation();
  const username = sessionStorage.getItem('ige_username') || '';
  
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/create', label: 'Crea Certificato', icon: FileText },
    { path: '/verify', label: 'Verifica', icon: Search },
    { path: '/list', label: 'Lista', icon: FileText },
    { path: '/bulk', label: 'Import Massivo', icon: Database },
    { path: '/editor', label: 'Editor CSV', icon: Database },
    { path: '/stats', label: 'Statistiche', icon: BarChart3 }
  ];

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <Link to="/" className="logo">
            <div className="logo-icon">
              <img src="/ige.svg" alt="IGE" style={{ width: '72px', height: '72px', backgroundColor: '#000000', padding: '8px', borderRadius: '8px' }} />
            </div>
            IGE Gold Certificate
          </Link>
          
          <nav className="nav">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`nav-link ${location.pathname === path ? 'active' : ''}`}
              >
                <Icon size={18} />
                {label}
              </Link>
            ))}
            {username && (
              <div className="nav-link" style={{ opacity: 0.9 }}>
                <span style={{ marginRight: '0.5rem', color: '#9ca3af' }}>User:</span>
                <strong>{username}</strong>
              </div>
            )}
            <button
              onClick={onLogout}
              className="nav-link logout-btn"
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444'
              }}
            >
              Logout
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

// Componente Home
const HomePage = () => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await testConnection();
        setConnectionStatus(result);
      } catch (error) {
        setConnectionStatus({ connected: false, error: 'Errore di connessione' });
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, []);

  const features = [
    {
      icon: FileText,
      title: 'Crea Certificato',
      description: 'Genera e registra nuovi certificati blockchain per prodotti aurei',
      link: '/create'
    },
    {
      icon: Search,
      title: 'Verifica Certificato',
      description: 'Verifica l\'autenticità di un certificato tramite numero seriale',
      link: '/verify'
    },
    {
      icon: FileText,
      title: 'Lista Certificati',
      description: 'Visualizza e gestisci tutti i certificati creati',
      link: '/list'
    },
    {
      icon: Database,
      title: 'Import Massivo',
      description: 'Valida e registra certificati da file CSV',
      link: '/bulk'
    },
    {
      icon: Database,
      title: 'Editor CSV',
      description: 'Modifica i dati CSV con funzionalità Excel-like',
      link: '/editor'
    },
    {
      icon: BarChart3,
      title: 'Statistiche',
      description: 'Monitora le statistiche e l\'attività del sistema',
      link: '/stats'
    }
  ];

  return (
    <div className="main">
      <div className="container">
        {/* Hero Section */}
        <div className="card fade-in">
          <div className="text-center">
            <h1 className="card-title" style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>
              Genera e registra un certificato in blockchain
            </h1>
            <p className="card-subtitle" style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>
              IGE Gold S.P.A.
            </p>
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#666', 
              marginTop: '2rem', 
              padding: '0.5rem',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}>
              © 2025 IGE Gold s.r.l. - Proprietary Software
            </div>
            
            {/* Status connessione */}
            <div className="mb-4">
              {loading ? (
                <div className="status status-info blockchain-status">
                  <div className="blockchain-icon">
                    <div className="loading"></div>
                  </div>
                  <div className="status-text">
                    <div className="status-label">Stato Blockchain:</div>
                    <div className="status-value">Controllo connessione...</div>
                  </div>
                </div>
              ) : connectionStatus?.connected ? (
                <div className="status status-success blockchain-status">
                  <div className="blockchain-icon">
                    <div className="blockchain-chain"></div>
                  </div>
                  <div className="status-text">
                    <div className="status-label">Stato Blockchain:</div>
                    <div className="status-value">Connesso</div>
                  </div>
                </div>
              ) : (
                <div className="status status-error blockchain-status">
                  <div className="blockchain-icon">
                    <div className="blockchain-error"></div>
                  </div>
                  <div className="status-text">
                    <div className="status-label">Stato Blockchain:</div>
                    <div className="status-value">Errore: {connectionStatus?.error}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-2">
          {features.map(({ icon: Icon, title, description, link }, index) => (
            <Link key={index} to={link} className="card fade-in" style={{ textDecoration: 'none' }}>
              <div className="text-center">
                <div className="mb-3">
                  <Icon size={48} style={{ color: '#667eea' }} />
                </div>
                <h3 className="card-title" style={{ marginBottom: '0.5rem' }}>
                  {title}
                </h3>
                <p className="card-subtitle">
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Info aggiuntive */}
        <div className="card">
          <h2 className="card-title mb-4">Informazioni Sistema</h2>
          <div className="grid grid-3">
            <div className="text-center">
              <h4 style={{ color: '#4ade80', marginBottom: '0.5rem' }}>Blockchain</h4>
              <p className="card-subtitle">Polygon Amoy Testnet</p>
            </div>
            <div className="text-center">
              <h4 style={{ color: '#3b82f6', marginBottom: '0.5rem' }}>Sicurezza</h4>
              <p className="card-subtitle">Autenticazione Token</p>
            </div>
            <div className="text-center">
              <h4 style={{ color: '#f59e0b', marginBottom: '0.5rem' }}>Backup</h4>
              <p className="card-subtitle">Automatico CSV</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer style={{ 
          textAlign: 'center', 
          padding: '2rem 0', 
          marginTop: '3rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          color: '#666',
          fontSize: '0.8rem'
        }}>
          <div>© 2025 IGE Gold s.r.l. All rights reserved.</div>
          <div style={{ marginTop: '0.5rem' }}>
            Proprietary Software - Internal Use Only
          </div>
        </footer>

      </div>
    </div>
  );
};

// Componente principale App
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Controlla se l'utente è già autenticato
  useEffect(() => {
    const authStatus = sessionStorage.getItem('ige_gold_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (success) => {
    if (success) {
      sessionStorage.setItem('ige_gold_auth', 'true');
      // no-op: user id già salvato da Login
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('ige_gold_auth');
      localStorage.removeItem('ige_user_id');
      localStorage.removeItem('ige_username');
    } catch (_) {}
    sessionStorage.removeItem('ige_gold_auth');
    sessionStorage.removeItem('ige_user_id');
    sessionStorage.removeItem('ige_username');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        <Header onLogout={handleLogout} />
        <Routes>
          <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CertificateForm />} />
        <Route path="/bulk" element={<BulkImport />} />
          <Route path="/verify" element={<CertificateVerification />} />
          <Route path="/list" element={<CertificateList />} />
          <Route path="/editor" element={<CsvEditor />} />
          <Route path="/stats" element={<Stats />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
