import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiService, handleApiError } from '../services/api';
import { Search, Filter, Download, ExternalLink, Eye, RefreshCw, AlertCircle } from 'lucide-react';

const CertificateList = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    metal: '',
    year: '',
    month: ''
  });
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 20,
    offset: 0,
    hasMore: false
  });

  // Carica certificati
  const loadCertificates = async (reset = false) => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        search: searchTerm || undefined,
        limit: pagination.limit,
        offset: reset ? 0 : pagination.offset
      };

      const response = await apiService.getCertificates(params);
      setCertificates(reset ? response.certificates : [...certificates, ...response.certificates]);
      setPagination(response.pagination);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Carica certificati al mount
  useEffect(() => {
    loadCertificates(true);
  }, []);

  // Filtra certificati localmente
  const filteredCertificates = certificates.filter(cert => {
    if (filters.metal && cert.metal !== filters.metal) return false;
    if (filters.year && !cert.write_date.startsWith(filters.year)) return false;
    if (filters.month && !cert.write_date.includes(filters.month)) return false;
    return true;
  });

  // Gestisce ricerca
  const handleSearch = (e) => {
    e.preventDefault();
    loadCertificates(true);
  };

  // Gestisce filtri
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Reset filtri
  const resetFilters = () => {
    setFilters({ metal: '', year: '', month: '' });
    setSearchTerm('');
    loadCertificates(true);
  };

  // Formatta data
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Ottieni anni disponibili
  const getAvailableYears = () => {
    const years = [...new Set(certificates.map(cert => cert.write_date.split('-')[0]))];
    return years.sort((a, b) => b - a);
  };

  // Ottieni mesi disponibili
  const getAvailableMonths = () => {
    const months = [...new Set(certificates.map(cert => cert.write_date.substring(0, 7)))];
    return months.sort((a, b) => b.localeCompare(a));
  };

  return (
    <div className="main">
      <div className="container">
        <div className="card fade-in">
          <div className="card-header">
            <div>
              <h1 className="card-title">Lista Certificati</h1>
              <p className="card-subtitle">
                {pagination.total} certificati totali
                {filteredCertificates.length !== certificates.length && 
                  ` • ${filteredCertificates.length} filtrati`
                }
              </p>
            </div>
            <button
              onClick={() => loadCertificates(true)}
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? <div className="loading"></div> : <RefreshCw size={16} />}
              Aggiorna
            </button>
          </div>

          {/* Filtri e Ricerca */}
          <div className="card mb-4" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
            <div className="card-header">
              <h3 className="card-title">Filtri e Ricerca</h3>
              <button
                onClick={resetFilters}
                className="btn btn-sm btn-secondary"
              >
                Reset
              </button>
            </div>

            <form onSubmit={handleSearch} className="mb-3">
              <div className="form-group">
                <label className="form-label">Cerca per seriale, azienda, città o metallo</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input"
                    placeholder="Inserisci termine di ricerca..."
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                  >
                    <Search size={16} />
                    Cerca
                  </button>
                </div>
              </div>
            </form>

            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label">Metallo</label>
                <select
                  value={filters.metal}
                  onChange={(e) => handleFilterChange('metal', e.target.value)}
                  className="form-select"
                >
                  <option value="">Tutti</option>
                  <option value="Au">Au (Oro)</option>
                  <option value="Ag">Ag (Argento)</option>
                  <option value="Pt">Pt (Platino)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Anno</label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="form-select"
                >
                  <option value="">Tutti</option>
                  {getAvailableYears().map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mese</label>
                <select
                  value={filters.month}
                  onChange={(e) => handleFilterChange('month', e.target.value)}
                  className="form-select"
                >
                  <option value="">Tutti</option>
                  {getAvailableMonths().map(month => (
                    <option key={month} value={month}>
                      {new Date(month + '-01').toLocaleDateString('it-IT', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Tabella Certificati */}
          {loading && certificates.length === 0 ? (
            <div className="text-center p-8">
              <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
              <p className="mt-3" style={{ color: '#a0a0a0' }}>Caricamento certificati...</p>
            </div>
          ) : filteredCertificates.length === 0 ? (
            <div className="text-center p-8">
              <AlertCircle size={48} style={{ color: '#666', margin: '0 auto 1rem' }} />
              <h3 className="mb-2">Nessun certificato trovato</h3>
              <p style={{ color: '#a0a0a0' }}>
                {certificates.length === 0 
                  ? 'Non ci sono certificati nel database'
                  : 'Prova a modificare i filtri di ricerca'
                }
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Seriale</th>
                    <th>Azienda</th>
                    <th>Prodotto</th>
                    <th>Data Creazione</th>
                    <th>Blockchain</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCertificates.map((cert, index) => (
                    <tr key={index}>
                      <td>
                        <div className="font-mono font-bold">{cert.serial}</div>
                      </td>
                      <td>
                        <div className="font-medium">{cert.company}</div>
                        <div className="text-sm" style={{ color: '#a0a0a0' }}>
                          {cert.city}, {cert.country}
                        </div>
                      </td>
                      <td>
                        <div className="font-medium">
                          {cert.metal} {cert.fineness}
                        </div>
                        <div className="text-sm" style={{ color: '#a0a0a0' }}>
                          {cert.weight}g • {cert.production_date}
                        </div>
                      </td>
                      <td>
                        <div className="text-sm">{formatDate(cert.write_date)}</div>
                        <div className="text-xs" style={{ color: '#a0a0a0' }}>
                          da {cert.user}
                        </div>
                      </td>
                      <td>
                        {cert.blockchain_hash ? (
                          <div>
                            <div className="status status-success">
                              <ExternalLink size={14} />
                              Registrato
                            </div>
                            <div className="text-xs font-mono" style={{ color: '#a0a0a0' }}>
                              {cert.blockchain_hash.substring(0, 10)}...
                            </div>
                          </div>
                        ) : (
                          <div className="status status-warning">
                            <AlertCircle size={14} />
                            Non registrato
                          </div>
                        )}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <Link
                            to={`/verify?serial=${cert.serial}`}
                            className="btn btn-sm btn-secondary"
                            title="Verifica certificato"
                          >
                            <Eye size={14} />
                          </Link>
                          {cert.blockchain_link && (
                            <a
                              href={cert.blockchain_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-primary"
                              title="Visualizza su blockchain"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginazione */}
          {pagination.hasMore && (
            <div className="text-center mt-4">
              <button
                onClick={() => loadCertificates(false)}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? <div className="loading"></div> : <RefreshCw size={16} />}
                Carica Altri
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateList;
