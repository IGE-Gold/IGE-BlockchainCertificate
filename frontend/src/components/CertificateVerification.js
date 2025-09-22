import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiService, handleApiError } from '../services/api';
import { Search, CheckCircle, XCircle, ExternalLink, Copy, AlertTriangle } from 'lucide-react';

const CertificateVerification = () => {
  const [searchParams] = useSearchParams();
  const [serial, setSerial] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Legge il parametro seriale dall'URL e precompila il campo
  useEffect(() => {
    const serialFromUrl = searchParams.get('serial');
    if (serialFromUrl) {
      setSerial(serialFromUrl);
      // Verifica automaticamente se c'è un seriale nell'URL
      handleAutoVerify(serialFromUrl);
    }
  }, [searchParams]);

  // Verifica automatica quando arriva da lista
  const handleAutoVerify = async (serialNumber) => {
    if (!serialNumber.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.getCertificate(serialNumber);
      setResult(response);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serial.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.getCertificate(serial);
      setResult(response);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="main">
      <div className="container">
        <div className="card fade-in">
          <div className="card-header">
            <div>
              <h1 className="card-title">Verifica Certificato</h1>
              <p className="card-subtitle">Inserisci il numero seriale per verificare l'autenticità del certificato</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mb-4">
            <div className="form-group">
              <label className="form-label">Numero Seriale (13 cifre)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value)}
                  className="form-input"
                  placeholder="YYYYMMWWNNNNN"
                  maxLength="13"
                  required
                />
                <button
                  type="submit"
                  disabled={loading || !serial.trim()}
                  className="btn btn-primary"
                >
                  {loading ? <div className="loading"></div> : <Search size={16} />}
                  {loading ? 'Verifica...' : 'Verifica'}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="alert alert-error">
              <XCircle size={20} />
              {error}
            </div>
          )}

          {result && (
            <div className="card fade-in" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
              <div className="card-header">
                <div className="flex items-center gap-2">
                  <CheckCircle size={24} style={{ color: '#4ade80' }} />
                  <h2 className="card-title">Certificato Verificato</h2>
                </div>
                <div className="status status-success">
                  <CheckCircle size={16} />
                  Autentico
                </div>
              </div>

              <div className="grid grid-2">
                {/* Dati Azienda */}
                <div>
                  <h3 className="mb-3" style={{ color: '#667eea' }}>Dati Azienda</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Azienda:</span>
                      <span className="font-medium">{result.certificate.company}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Codice Fiscale:</span>
                      <span className="font-medium">{result.certificate.tax_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Capitale Sociale:</span>
                      <span className="font-medium">{result.certificate.social_capital}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Autorizzazione:</span>
                      <span className="font-medium">{result.certificate.authorization}</span>
                    </div>
                  </div>
                </div>

                {/* Dati Prodotto */}
                <div>
                  <h3 className="mb-3" style={{ color: '#667eea' }}>Dati Prodotto</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Seriale:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{result.certificate.serial}</span>
                        <button
                          onClick={() => copyToClipboard(result.certificate.serial)}
                          className="btn btn-sm btn-secondary"
                          title="Copia seriale"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Data Produzione:</span>
                      <span className="font-medium">{result.certificate.production_date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Luogo:</span>
                      <span className="font-medium">{result.certificate.city}, {result.certificate.country}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Peso:</span>
                      <span className="font-medium">{result.certificate.weight}g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Metallo:</span>
                      <span className="font-medium">{result.certificate.metal} {result.certificate.fineness}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Utente:</span>
                      <span className="font-medium">{result.certificate.user}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Blockchain Info */}
              {result.certificate.blockchain_hash && (
                <div className="mt-4 p-4" style={{ background: 'rgba(20, 20, 20, 0.6)', borderRadius: '8px' }}>
                  <h3 className="mb-3" style={{ color: '#f59e0b' }}>Informazioni Blockchain</h3>
                  <div className="grid grid-2">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Hash Transazione:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">{result.certificate.blockchain_hash.substring(0, 20)}...</span>
                          <button
                            onClick={() => copyToClipboard(result.certificate.blockchain_hash)}
                            className="btn btn-sm btn-secondary"
                            title="Copia hash"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Data Registrazione:</span>
                        <span className="font-medium">{formatDate(result.certificate.write_date)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400">Stato Blockchain:</span>
                        {result.blockchainVerification?.status === 'success' ? (
                          <div className="status status-success">
                            <CheckCircle size={16} />
                            Confermato
                          </div>
                        ) : (
                          <div className="status status-warning">
                            <AlertTriangle size={16} />
                            In verifica
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Block Number:</span>
                        <span className="font-medium">{result.blockchainVerification?.blockNumber || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {result.certificate.blockchain_link && (
                    <div className="mt-3 text-center">
                      <a
                        href={result.certificate.blockchain_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                      >
                        <ExternalLink size={16} />
                        Visualizza su PolygonScan
                      </a>
                    </div>
                  )}

                  {/* Dati Blockchain Leggibili */}
                  {result.blockchainData?.isReadable && result.blockchainData.certificateMessage && (
                    <div className="mt-4">
                      <h4 className="mb-3" style={{ color: '#f59e0b' }}>Certificate Data from Blockchain</h4>
                      <div 
                        className="blockchain-data-display"
                        style={{
                          background: 'rgba(15, 15, 15, 0.8)',
                          border: '1px solid #f59e0b',
                          borderRadius: '8px',
                          padding: '1rem',
                          fontFamily: 'monospace',
                          fontSize: '0.85rem',
                          lineHeight: '1.4',
                          color: '#e0e0e0',
                          whiteSpace: 'pre-wrap',
                          overflow: 'auto',
                          maxHeight: '300px'
                        }}
                      >
                        {result.blockchainData.certificateMessage}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Azioni */}
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setResult(null);
                    setSerial('');
                    setError(null);
                  }}
                  className="btn btn-secondary"
                >
                  Nuova Verifica
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Istruzioni */}
        <div className="card">
          <h3 className="card-title mb-3">Come Verificare un Certificato</h3>
          <div className="grid grid-2">
            <div>
              <h4 className="mb-2" style={{ color: '#4ade80' }}>✓ Certificato Autentico</h4>
              <ul className="space-y-1" style={{ color: '#a0a0a0' }}>
                <li>• Il seriale è registrato nel database</li>
                <li>• La transazione blockchain è confermata</li>
                <li>• I dati corrispondono ai record ufficiali</li>
                <li>• Il certificato è stato creato da IGE Gold S.P.A.</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2" style={{ color: '#ef4444' }}>✗ Certificato Non Valido</h4>
              <ul className="space-y-1" style={{ color: '#a0a0a0' }}>
                <li>• Il seriale non è stato trovato</li>
                <li>• La transazione blockchain non esiste</li>
                <li>• I dati non corrispondono ai record</li>
                <li>• Il certificato potrebbe essere contraffatto</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CertificateVerification;
