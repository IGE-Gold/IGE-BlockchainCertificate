import React, { useState, useEffect } from 'react';
import { apiService, handleApiError } from '../services/api';
import { Save, RefreshCw, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';

const CertificateForm = () => {
  const [formData, setFormData] = useState({
    serial: '',
    company: 'IGE Gold S.P.A.',
    production_date: new Date().toISOString().split('T')[0],
    city: 'Arezzo',
    country: 'Italy',
    weight: '500',
    metal: 'Au',
    fineness: '999.9‰',
    tax_code: '02488190519',
    social_capital: '€1,000,000 I.V.',
    authorization: 'REG. OAM - OPO38',
    user: ''
  });

  const [loading, setLoading] = useState(false);
  const [generatingSerial, setGeneratingSerial] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [serialValidation, setSerialValidation] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  // Genera seriale automatico
  const generateSerial = async () => {
    setGeneratingSerial(true);
    setError(null);
    
    try {
      const response = await apiService.generateSerial();
      setFormData(prev => ({ ...prev, serial: response.serial }));
      setSerialValidation({ isValid: true, isUnique: true });
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setGeneratingSerial(false);
    }
  };

  // Valida seriale
  const validateSerial = async () => {
    if (!formData.serial) return;
    
    setError(null);
    
    try {
      const response = await apiService.validateSerial(formData.serial);
      setSerialValidation(response);
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  // Valida seriale quando cambia
  useEffect(() => {
    if (formData.serial && formData.serial.length === 13) {
      const timeoutId = setTimeout(() => {
        validateSerial();
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSerialValidation(null);
    }
  }, [formData.serial]);

  // Gestisce cambiamenti form
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
    setResult(null);
  };


  // Verifica se il certificato rispetta gli standard
  const isStandardCertificate = () => {
    const today = new Date();
    const productionDate = new Date(formData.production_date);
    const isRecent = (today - productionDate) <= 7 * 24 * 60 * 60 * 1000; // 7 giorni
    const isSerialValid = serialValidation?.isValid && serialValidation?.isUnique;
    const hasUser = formData.user.trim() !== '';
    
    return isRecent && isSerialValid && hasUser;
  };

  // Crea certificato
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Controlla se il certificato rispetta gli standard
    if (!isStandardCertificate()) {
      setPendingFormData(formData);
      setShowConfirmDialog(true);
      return;
    }
    
    await createCertificate(formData);
  };

  // Conferma creazione certificato non standard
  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    await createCertificate(pendingFormData);
  };

  // Annulla creazione certificato non standard
  const handleCancelSubmit = () => {
    setShowConfirmDialog(false);
    setPendingFormData(null);
  };

  // Funzione per creare il certificato
  const createCertificate = async (data) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiService.createCertificate(data);
      setResult(response);
      
      // Reset form dopo successo
      setTimeout(() => {
        setFormData(prev => ({
          ...prev,
          serial: '',
          production_date: new Date().toISOString().split('T')[0],
          user: ''
        }));
        setSerialValidation(null);
      }, 3000);
      
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main">
      <div className="container">
        <div className="card fade-in" style={{ padding: '0.5rem' }}>
          <div className="card-header" style={{ marginBottom: '0.25rem' }}>
            <div>
              <h1 className="card-title" style={{ marginBottom: '0' }}>Crea Nuovo Certificato</h1>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {result && (
            <div className="alert alert-success" style={{ position: 'sticky', top: '20px', zIndex: 10 }}>
              <CheckCircle size={20} />
              <div>
                <strong>Certificato creato con successo!</strong>
                <div className="mt-2">
                  <p><strong>Seriale:</strong> {result.data.serial}</p>
                  <p><strong>Hash Blockchain:</strong> {result.data.blockchainHash}</p>
                  <a 
                    href={result.data.blockchainLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-secondary mt-2"
                  >
                    <ExternalLink size={16} />
                    Visualizza su PolygonScan
                  </a>
                  <div className="mt-2 text-sm" style={{ color: '#a0a0a0', fontSize: '0.8rem' }}>
                    💡 <strong>Per vedere i dati in formato testo:</strong> Clicca su "Click to show more" → "View Input As" → "UTF-8" nella pagina PolygonScan
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Sezione Seriale e Utente */}
            <div className="card mb-1" style={{ background: 'rgba(30, 30, 30, 0.4)', padding: '0.25rem' }}>
              <h3 className="card-title mb-1" style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Seriale e Utente</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Seriale (13 cifre)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={generateSerial}
                    disabled={generatingSerial}
                    className="btn btn-secondary"
                  >
                    {generatingSerial ? <div className="loading"></div> : <RefreshCw size={16} />}
                    Genera
                  </button>
                  <input
                    type="text"
                    name="serial"
                    value={formData.serial}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="YYYYMMWWNNNNN"
                    maxLength="13"
                    required
                  />
                </div>
                
                {serialValidation && (
                  <div className="mt-2 flex gap-2">
                    {serialValidation.isValid ? (
                      <div className="status status-success">
                        <CheckCircle size={16} />
                        Formato valido
                      </div>
                    ) : (
                      <div className="status status-error">
                        <AlertCircle size={16} />
                        Formato non valido
                      </div>
                    )}
                    
                    {serialValidation.isUnique !== undefined && (
                      serialValidation.isUnique ? (
                        <div className="status status-success">
                          <CheckCircle size={16} />
                          Seriale disponibile
                        </div>
                      ) : (
                        <div className="status status-error">
                          <AlertCircle size={16} />
                          Seriale già esistente
                        </div>
                      )
                    )}
                  </div>
                )}
                </div>
                <div className="form-group">
                  <label className="form-label">Utente</label>
                  <input
                    type="text"
                    name="user"
                    value={formData.user}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Dati Azienda */}
            <div className="card mb-1" style={{ background: 'rgba(30, 30, 30, 0.4)', padding: '0.25rem' }}>
              <h3 className="card-title mb-1" style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Dati Azienda</h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Azienda</label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Codice Fiscale</label>
                  <input
                    type="text"
                    name="tax_code"
                    value={formData.tax_code}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Capitale Sociale</label>
                  <input
                    type="text"
                    name="social_capital"
                    value={formData.social_capital}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Autorizzazione</label>
                  <input
                    type="text"
                    name="authorization"
                    value={formData.authorization}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Dati Prodotto */}
            <div className="card mb-1" style={{ background: 'rgba(30, 30, 30, 0.4)', padding: '0.25rem' }}>
              <h3 className="card-title mb-1" style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>Dati Prodotto</h3>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Data Produzione</label>
                  <input
                    type="date"
                    name="production_date"
                    value={formData.production_date}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Città</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Paese</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="form-row-3">
                <div className="form-group">
                  <label className="form-label">Peso (g)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Metallo</label>
                  <select
                    name="metal"
                    value={formData.metal}
                    onChange={handleChange}
                    className="form-select"
                    required
                  >
                    <option value="Au">Au (Oro)</option>
                    <option value="Ag">Ag (Argento)</option>
                    <option value="Pt">Pt (Platino)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Titolo</label>
                  <input
                    type="text"
                    name="fineness"
                    value={formData.fineness}
                    onChange={handleChange}
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Bottoni */}
            <div className="flex gap-3 justify-center" style={{ marginTop: '0.25rem' }}>
              <button
                type="submit"
                disabled={loading || !formData.user.trim()}
                className="btn btn-primary"
              >
                {loading ? <div className="loading"></div> : <Save size={16} />}
                {loading ? 'Creazione...' : 'Crea Certificato'}
              </button>
            </div>
          </form>
        </div>

        {/* Dialog di conferma per certificati non standard */}
        {showConfirmDialog && (
          <div className="modal-overlay" onClick={handleCancelSubmit}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="modal-title">Conferma Creazione Certificato</h3>
                <button
                  className="modal-close"
                  onClick={handleCancelSubmit}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p>Il certificato che stai per creare non rispetta completamente gli standard:</p>
                <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem' }}>
                  {!serialValidation?.isValid && <li>• Seriale non valido</li>}
                  {!serialValidation?.isUnique && <li>• Seriale già esistente</li>}
                  {!formData.user.trim() && <li>• Utente non specificato</li>}
                  {new Date(formData.production_date) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && <li>• Data produzione troppo vecchia</li>}
                </ul>
                <p>Vuoi procedere comunque con la creazione?</p>
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-secondary"
                  onClick={handleCancelSubmit}
                >
                  Annulla
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirmSubmit}
                >
                  Conferma
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CertificateForm;
