import React, { useState } from 'react';
import { apiService, handleApiError } from '../services/api';
import { Upload, CheckCircle, XCircle, FileText, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';

const BulkImport = () => {
  const [file, setFile] = useState(null);
  const [validSummary, setValidSummary] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [writing, setWriting] = useState(false);
  const [writeResult, setWriteResult] = useState(null);
  const [certificatesPreview, setCertificatesPreview] = useState([]);
  const [lastValidation, setLastValidation] = useState({ totalRows: 0, validRows: 0, invalidRows: 0 });
  const [toast, setToast] = useState(null); // { type: 'success'|'error'|'info', message: string }

  const onFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setValidSummary(null);
    setErrors([]);
    setWriteResult(null);
    setCertificatesPreview([]);
  };

  const handleValidate = async () => {
    if (!file) return;
    setLoading(true);
    setErrors([]);
    setWriteResult(null);
    try {
      const res = await apiService.validateBulkCsv(file);
      setValidSummary(res.summary);
      setLastValidation(res.summary || { totalRows: 0, validRows: 0, invalidRows: 0 });
      setErrors(res.errors || []);
      if ((res.summary?.invalidRows || 0) === 0) {
        setToast({ type: 'success', message: `Validation OK: ${res.summary.validRows}/${res.summary.totalRows} rows valid.` });
      } else {
        setToast({ type: 'error', message: `Validation failed: ${res.summary.invalidRows} invalid row(s).` });
      }
      // Nota: per privacy/sicurezza, il backend non rimanda i record
      // Qui potremmo opzionalmente rileggere il CSV lato client per mostrare anteprima
    } catch (err) {
      setErrors([{ row: null, serial: null, errors: [handleApiError(err)] }]);
      setToast({ type: 'error', message: 'Validation error. See details below.' });
    } finally {
      setLoading(false);
    }
  };

  // Lettura CSV lato client per payload di scrittura (solo righe senza errori)
  const readCsvClient = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = reader.result;
          const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
          if (lines.length < 2) return resolve([]);
          const header = lines[0].split(';').map(h => h.trim());
          const items = lines.slice(1).map(line => {
            const cols = line.split(';');
            const obj = {};
            header.forEach((h, i) => { obj[h] = (cols[i] || '').trim(); });
            return obj;
          });
          resolve(items);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file, 'utf-8');
    });
  };

  const handleWrite = async () => {
    if (!file) return;
    if (!validSummary || (validSummary && validSummary.invalidRows > 0)) return;
    if (writing) return; // anti doppio click
    setWriting(true);
    setWriteResult(null);
    try {
      const items = await readCsvClient(file);
      // Filtra le righe segnate valide dall'ultima validazione
      const invalidSerials = new Set((errors || []).filter(e => e.serial).map(e => e.serial));
      const payload = items.filter(it => !invalidSerials.has(String(it.serial || '').trim()));
      setCertificatesPreview(payload.slice(0, 5));
      const res = await apiService.writeBulk(payload);
      setWriteResult(res);
      if (res && res.results) {
        // ordina per index
        res.results.sort((a,b) => (a.index||0) - (b.index||0));
      }
      if (res?.success) {
        setToast({ type: 'success', message: `Write completed: ${res.summary.written}/${res.summary.requested} rows written.` });
      } else {
        setToast({ type: 'error', message: `Write failed: ${res?.summary?.failed ?? 0} rows failed.` });
      }
    } catch (err) {
      setErrors([{ row: null, serial: null, errors: [handleApiError(err)] }]);
      setToast({ type: 'error', message: 'Write error. See details below.' });
    } finally {
      setWriting(false);
    }
  };

  return (
    <div className="main">
      <div className="container">
        {/* Toast Notification */}
        {toast && (
          <div className="card fade-in" style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            borderRadius: '8px',
            border: toast.type === 'success' ? '1px solid rgba(34,197,94,0.3)' : toast.type === 'info' ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(239,68,68,0.3)',
            background: toast.type === 'success' ? 'rgba(34,197,94,0.1)' : toast.type === 'info' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
            color: toast.type === 'success' ? '#22c55e' : toast.type === 'info' ? '#3b82f6' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {toast.type === 'success' && <CheckCircle size={20} style={{ marginRight: '0.5rem' }} />}
              {toast.type === 'error' && <XCircle size={20} style={{ marginRight: '0.5rem' }} />}
              {toast.type === 'info' && <AlertTriangle size={20} style={{ marginRight: '0.5rem' }} />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => setToast(null)} style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '1.2rem',
              padding: '0.25rem'
            }}>×</button>
          </div>
        )}

        {/* Header */}
        <div className="card fade-in">
          <div className="text-center">
            <h1 className="card-title" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
              <Upload size={32} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Bulk Import Certificates
            </h1>
            <p className="card-subtitle">
              Upload and validate CSV files for mass certificate creation
            </p>
          </div>
        </div>

        {/* Upload Section */}
        <div className="card fade-in">
          <h2 className="card-title mb-4">Upload CSV File</h2>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
              Select CSV File:
            </label>
            <input 
              type="file" 
              accept=".csv,text/csv" 
              onChange={onFileChange}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.05)',
                color: '#fff',
                fontSize: '0.9rem'
              }}
            />
            {file && (
              <div style={{ marginTop: '0.5rem', color: '#22c55e', fontSize: '0.9rem' }}>
                <FileText size={16} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                Selected: {file.name}
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              disabled={!file || loading || writing} 
              onClick={handleValidate}
              className="btn btn-primary"
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                opacity: (!file || loading || writing) ? 0.5 : 1,
                cursor: (!file || loading || writing) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading && <Loader2 size={16} style={{ marginRight: '0.5rem' }} className="animate-spin" />}
              <CheckCircle size={16} style={{ marginRight: '0.5rem' }} />
              Validate CSV
            </button>
            
            <button 
              disabled={!file || loading || writing || !validSummary || (validSummary && validSummary.invalidRows>0)} 
              onClick={handleWrite}
              className="btn btn-success"
              style={{ 
                display: 'flex', 
                alignItems: 'center',
                opacity: (!file || loading || writing || !validSummary || (validSummary && validSummary.invalidRows>0)) ? 0.5 : 1,
                cursor: (!file || loading || writing || !validSummary || (validSummary && validSummary.invalidRows>0)) ? 'not-allowed' : 'pointer'
              }}
            >
              {writing && <Loader2 size={16} style={{ marginRight: '0.5rem' }} className="animate-spin" />}
              <Upload size={16} style={{ marginRight: '0.5rem' }} />
              Write Valid Rows
            </button>
          </div>
        </div>

        {/* Validation Summary */}
        {validSummary && (
          <div className="card fade-in">
            <h3 className="card-title mb-4">Validation Summary</h3>
            <div className="grid grid-3">
              <div className="text-center">
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.5rem' }}>
                  {validSummary.totalRows}
                </div>
                <div className="card-subtitle">Total Rows</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '0.5rem' }}>
                  {validSummary.validRows}
                </div>
                <div className="card-subtitle">Valid Rows</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: validSummary.invalidRows > 0 ? '#ef4444' : '#22c55e', marginBottom: '0.5rem' }}>
                  {validSummary.invalidRows}
                </div>
                <div className="card-subtitle">Invalid Rows</div>
              </div>
            </div>
          </div>
        )}

        {/* Errors */}
        {errors && errors.length > 0 && (
          <div className="card fade-in" style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)' }}>
            <h3 className="card-title mb-4" style={{ color: '#ef4444' }}>
              <XCircle size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
              Validation Errors
            </h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {errors.map((e, idx) => (
                <div key={idx} style={{ 
                  padding: '0.75rem', 
                  marginBottom: '0.5rem', 
                  background: 'rgba(239,68,68,0.1)', 
                  borderRadius: '6px',
                  border: '1px solid rgba(239,68,68,0.2)'
                }}>
                  <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                    Row {e.row ?? '-'} • Serial {e.serial ?? '-'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#fca5a5' }}>
                    {e.errors.join(' • ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Write Results */}
        {writeResult && (
          <div className="card fade-in">
            <h3 className="card-title mb-4">
              <CheckCircle size={24} style={{ marginRight: '0.5rem', verticalAlign: 'middle', color: writeResult.success ? '#22c55e' : '#ef4444' }} />
              Write Results
            </h3>
            
            {/* Summary Stats */}
            <div className="grid grid-3 mb-4">
              <div className="text-center">
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6', marginBottom: '0.5rem' }}>
                  {writeResult.summary.requested}
                </div>
                <div className="card-subtitle">Requested</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e', marginBottom: '0.5rem' }}>
                  {writeResult.summary.written}
                </div>
                <div className="card-subtitle">Written</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: writeResult.summary.failed > 0 ? '#ef4444' : '#22c55e', marginBottom: '0.5rem' }}>
                  {writeResult.summary.failed}
                </div>
                <div className="card-subtitle">Failed</div>
              </div>
            </div>

            {/* Detailed Results */}
            <h4 style={{ marginBottom: '1rem', color: '#e5e7eb' }}>Certificate Details</h4>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {(writeResult.results || []).map((r, idx) => (
                <div key={idx} style={{ 
                  padding: '1rem', 
                  marginBottom: '0.75rem', 
                  background: r.success ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', 
                  borderRadius: '8px',
                  border: r.success ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {r.success ? <CheckCircle size={20} style={{ marginRight: '0.5rem', color: '#22c55e' }} /> : <XCircle size={20} style={{ marginRight: '0.5rem', color: '#ef4444' }} />}
                      <span style={{ fontWeight: '500' }}>Row {r.index}</span>
                      <span style={{ margin: '0 0.5rem', color: '#9ca3af' }}>•</span>
                      <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                        {r.serial || '-'}
                      </span>
                    </div>
                    {r.blockchainLink && (
                      <a 
                        href={r.blockchainLink} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          color: '#3b82f6',
                          textDecoration: 'none',
                          fontSize: '0.9rem'
                        }}
                      >
                        <ExternalLink size={16} style={{ marginRight: '0.25rem' }} />
                        Explorer
                      </a>
                    )}
                  </div>
                  {r.errors && r.errors.length > 0 && (
                    <div style={{ fontSize: '0.9rem', color: '#fca5a5', marginTop: '0.5rem' }}>
                      {r.errors.join(' • ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview */}
        {certificatesPreview.length > 0 && (
          <div className="card fade-in">
            <h3 className="card-title mb-4">Preview (First 5 Records)</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '1rem' }}>
              <pre style={{ 
                color: '#e5e7eb', 
                fontSize: '0.8rem', 
                lineHeight: '1.4',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {JSON.stringify(certificatesPreview, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BulkImport;


