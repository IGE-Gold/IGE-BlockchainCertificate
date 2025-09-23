import React, { useState, useEffect } from 'react';
import { apiService, handleApiError } from '../services/api';
import { BarChart3, TrendingUp, FileText, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

const Stats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Carica statistiche
  const loadStats = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getStats();
      setStats(response.stats);
      setLastUpdate(new Date());
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Carica statistiche al mount
  useEffect(() => {
    loadStats();
  }, []);

  // Formatta numeri
  const formatNumber = (num) => {
    return new Intl.NumberFormat('it-IT').format(num);
  };




  return (
    <div className="main">
      <div className="container">
        <div className="card fade-in">
          <div className="card-header">
            <div>
              <h1 className="card-title">Statistiche Sistema</h1>
              <p className="card-subtitle">
                Monitoraggio dell'attività e delle performance del sistema
                {lastUpdate && (
                  <span className="ml-2" style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                    • Ultimo aggiornamento: {lastUpdate.toLocaleTimeString('it-IT')}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={loadStats}
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? <div className="loading"></div> : <RefreshCw size={16} />}
              Aggiorna
            </button>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {loading && !stats ? (
            <div className="text-center p-8">
              <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
              <p className="mt-3" style={{ color: '#a0a0a0' }}>Caricamento statistiche...</p>
            </div>
          ) : stats && (
            <>
              {/* Statistiche Principali */}
              <div className="grid grid-4 mb-6">
                <div className="card text-center" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
                  <FileText size={32} style={{ color: '#667eea', margin: '0 auto 0.5rem' }} />
                  <h3 className="text-2xl font-bold mb-1">{formatNumber(stats.totalCertificates)}</h3>
                  <p className="text-sm" style={{ color: '#a0a0a0' }}>Certificati Totali</p>
                </div>
                
                <div className="card text-center" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
                  <div className="blockchain-icon-stats">
                    <div className="blockchain-chain-stats"></div>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">
                    {stats.blockchain?.connected ? 'Connesso' : 'Disconnesso'}
                  </h3>
                  <p className="text-sm" style={{ color: '#a0a0a0' }}>Stato Blockchain</p>
                </div>
                
                <div className="card text-center" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
                  <TrendingUp size={32} style={{ color: '#f59e0b', margin: '0 auto 0.5rem' }} />
                  <h3 className="text-2xl font-bold mb-1">
                    {stats.lastSerial ? stats.lastSerial.substring(0, 8) + '...' : 'N/A'}
                  </h3>
                  <p className="text-sm" style={{ color: '#a0a0a0' }}>Ultimo Seriale</p>
                </div>
                
                <div className="card text-center" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
                  <BarChart3 size={32} style={{ color: '#3b82f6', margin: '0 auto 0.5rem' }} />
                  <h3 className="text-2xl font-bold mb-1">
                    {Object.keys(stats.byMonth || {}).length}
                  </h3>
                  <p className="text-sm" style={{ color: '#a0a0a0' }}>Mesi Attivi</p>
                </div>
              </div>

              {/* Statistiche Temporali */}
              <div className="grid grid-3 gap-6 mb-6">
                <div className="card text-center" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
                  <h3 className="card-title mb-4">Ultima Settimana</h3>
                  <div className="text-3xl font-bold mb-2" style={{ color: '#4ade80' }}>
                    {formatNumber(stats.lastWeek || 0)}
                  </div>
                  <p className="text-sm" style={{ color: '#a0a0a0' }}>certificati</p>
                </div>
                
                <div className="card text-center" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
                  <h3 className="card-title mb-4">Ultimi 6 Mesi</h3>
                  <div className="text-3xl font-bold mb-2" style={{ color: '#3b82f6' }}>
                    {formatNumber(stats.last6Months || 0)}
                  </div>
                  <p className="text-sm" style={{ color: '#a0a0a0' }}>certificati</p>
                </div>
                
                <div className="card text-center" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
                  <h3 className="card-title mb-4">Dall'Inizio</h3>
                  <div className="text-3xl font-bold mb-2" style={{ color: '#f59e0b' }}>
                    {formatNumber(stats.totalCertificates || 0)}
                  </div>
                  <p className="text-sm" style={{ color: '#a0a0a0' }}>certificati</p>
                </div>
              </div>

              {/* Informazioni Blockchain */}
              {stats.blockchain && (
                <div className="card" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
                  <h3 className="card-title mb-4">Stato Blockchain</h3>
                  <div className="grid grid-2 gap-4">
                    <div>
                      <h4 className="mb-2" style={{ color: '#667eea' }}>Connessione</h4>
                      <div className="flex items-center gap-2">
                        {stats.blockchain.connected ? (
                          <CheckCircle size={20} style={{ color: '#4ade80' }} />
                        ) : (
                          <AlertCircle size={20} style={{ color: '#ef4444' }} />
                        )}
                        <span>
                          {stats.blockchain.connected ? 'Connesso' : 'Disconnesso'}
                        </span>
                      </div>
                      {stats.blockchain.network && (
                        <div className="mt-2 text-sm" style={{ color: '#a0a0a0' }}>
                          Network: {stats.blockchain.network.name} (Chain ID: {stats.blockchain.network.chainId})
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="mb-2" style={{ color: '#667eea' }}>Wallet</h4>
                      {stats.blockchain.wallet && (
                        <div className="text-sm" style={{ color: '#a0a0a0' }}>
                          <div>Indirizzo: {stats.blockchain.wallet.address.substring(0, 10)}...</div>
                          <div>Saldo: {stats.blockchain.wallet.balance} MATIC</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stats;
