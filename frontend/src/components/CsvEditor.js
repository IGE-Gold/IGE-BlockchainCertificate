import React, { useState, useEffect, useRef } from 'react';
import { apiService, handleApiError } from '../services/api';
import { 
  Edit3, 
  Save, 
  Trash2, 
  Download, 
  Upload, 
  Copy, 
  ClipboardPaste, 
  Undo, 
  Redo, 
  Lock, 
  Unlock, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  History,
  FileText
} from 'lucide-react';

const CsvEditor = () => {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editingCell, setEditingCell] = useState(null);
  const [selectedCells, setSelectedCells] = useState([]);
  const [clipboard, setClipboard] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [backups, setBackups] = useState([]);
  const [showBackups, setShowBackups] = useState(false);
  const [saving, setSaving] = useState(false);

  const tableRef = useRef(null);

  // Colonne del CSV
  const columns = [
    { key: 'serial', label: 'Seriale', type: 'text' },
    { key: 'company', label: 'Azienda', type: 'text' },
    { key: 'production_date', label: 'Data Produzione', type: 'date' },
    { key: 'city', label: 'Città', type: 'text' },
    { key: 'country', label: 'Paese', type: 'text' },
    { key: 'weight', label: 'Peso (g)', type: 'number' },
    { key: 'metal', label: 'Metallo', type: 'select', options: ['Au', 'Ag', 'Pt'] },
    { key: 'fineness', label: 'Titolo', type: 'text' },
    { key: 'tax_code', label: 'Codice Fiscale', type: 'text' },
    { key: 'social_capital', label: 'Capitale Sociale', type: 'text' },
    { key: 'authorization', label: 'Autorizzazione', type: 'text' },
    { key: 'blockchain_hash', label: 'Hash Blockchain', type: 'text' },
    { key: 'blockchain_link', label: 'Link Blockchain', type: 'url' },
    { key: 'user', label: 'Utente', type: 'text' },
    { key: 'write_date', label: 'Data Scrittura', type: 'datetime' }
  ];

  // Carica dati CSV
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getCsvData();
      setData(response.data);
      setOriginalData(JSON.parse(JSON.stringify(response.data)));
      addToHistory(response.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  // Carica backup
  const loadBackups = async () => {
    try {
      const response = await apiService.getBackups();
      setBackups(response.backups);
    } catch (err) {
      console.error('Errore caricamento backup:', err);
    }
  };

  // Aggiungi stato alla cronologia
  const addToHistory = (newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newData)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo
  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  // Redo
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setData(JSON.parse(JSON.stringify(history[newIndex])));
    }
  };

  // Carica dati al mount
  useEffect(() => {
    loadData();
    loadBackups();
  }, []);

  // Gestisce click su cella
  const handleCellClick = (rowIndex, columnKey) => {
    if (!editing) return;
    
    setEditingCell({ row: rowIndex, column: columnKey });
    setSelectedCells([{ row: rowIndex, column: columnKey }]);
  };

  // Gestisce selezione multipla
  const handleCellMouseDown = (rowIndex, columnKey, e) => {
    if (!editing || e.shiftKey) return;
    
    setSelectedCells([{ row: rowIndex, column: columnKey }]);
    setEditingCell({ row: rowIndex, column: columnKey });
  };

  // Gestisce modifica cella
  const handleCellChange = (rowIndex, columnKey, value) => {
    const newData = [...data];
    newData[rowIndex] = { ...newData[rowIndex], [columnKey]: value };
    setData(newData);
  };

  // Salva modifiche
  const saveChanges = async () => {
    setSaving(true);
    setError(null);

    try {
      // Trova le righe modificate
      const modifiedRows = [];
      data.forEach((row, index) => {
        const originalRow = originalData[index];
        if (originalRow && JSON.stringify(row) !== JSON.stringify(originalRow)) {
          modifiedRows.push({ index, data: row });
        }
      });

      // Salva ogni riga modificata
      for (const { index, data: rowData } of modifiedRows) {
        await apiService.updateCsvRow(index, rowData);
      }

      // Aggiorna i dati originali
      setOriginalData(JSON.parse(JSON.stringify(data)));
      addToHistory(data);
      
      // Ricarica i backup
      await loadBackups();
      
      setEditing(false);
      setEditingCell(null);
      setSelectedCells([]);
      
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setSaving(false);
    }
  };

  // Elimina riga
  const deleteRow = async (rowIndex) => {
    if (!window.confirm('Sei sicuro di voler eliminare questa riga?')) return;

    try {
      await apiService.deleteCsvRow(rowIndex);
      await loadData();
      await loadBackups();
    } catch (err) {
      setError(handleApiError(err));
    }
  };

  // Copia celle selezionate
  const copyCells = () => {
    if (selectedCells.length === 0) return;
    
    const copyData = selectedCells.map(({ row, column }) => data[row][column]);
    setClipboard(copyData);
  };

  // Incolla dalle celle copiate
  const pasteCells = () => {
    if (clipboard.length === 0 || selectedCells.length === 0) return;
    
    const newData = [...data];
    selectedCells.forEach(({ row, column }, index) => {
      if (clipboard[index] !== undefined) {
        newData[row] = { ...newData[row], [column]: clipboard[index] };
      }
    });
    setData(newData);
  };

  // Gestisce incolla da Excel
  const handlePaste = (e) => {
    if (!editing) return;
    
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const rows = pastedData.split('\n').map(row => row.split('\t'));
    
    if (rows.length > 0 && selectedCells.length > 0) {
      const newData = [...data];
      const startRow = selectedCells[0].row;
      const startCol = columns.findIndex(col => col.key === selectedCells[0].column);
      
      rows.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          const targetRow = startRow + rowIndex;
          const targetCol = startCol + colIndex;
          
          if (targetRow < data.length && targetCol < columns.length) {
            const columnKey = columns[targetCol].key;
            newData[targetRow] = { ...newData[targetRow], [columnKey]: cell };
          }
        });
      });
      
      setData(newData);
    }
  };

  // Esporta CSV
  const exportCsv = () => {
    const csvContent = [
      columns.map(col => col.label).join(';'),
      ...data.map(row => columns.map(col => row[col.key] || '').join(';'))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `certificates_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Formatta valore per visualizzazione
  const formatValue = (value, type) => {
    if (!value) return '';
    
    switch (type) {
      case 'date':
        return new Date(value).toLocaleDateString('it-IT');
      case 'datetime':
        return new Date(value).toLocaleString('it-IT');
      case 'number':
        return Number(value).toLocaleString('it-IT');
      default:
        return value;
    }
  };

  // Formatta valore per input
  const formatInputValue = (value, type) => {
    if (!value) return '';
    
    switch (type) {
      case 'date':
        return new Date(value).toISOString().split('T')[0];
      case 'datetime':
        return new Date(value).toISOString().slice(0, 16);
      default:
        return value;
    }
  };

  return (
    <div className="main">
      <div className="container">
        <div className="card fade-in csv-editor">
          <div className="card-header">
            <div>
              <h1 className="card-title">Editor CSV</h1>
              <p className="card-subtitle">
                Gestisci i dati del database CSV con funzionalità simili a Excel
                {data.length > 0 && ` • ${data.length} righe`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowBackups(!showBackups)}
                className="btn btn-secondary"
              >
                <History size={16} />
                Backup ({backups.length})
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="btn btn-secondary"
              >
                {loading ? <div className="loading"></div> : <RefreshCw size={16} />}
                Aggiorna
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {/* Toolbar */}
          <div className="card mb-4" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setEditing(!editing)}
                className={`btn ${editing ? 'btn-danger' : 'btn-primary'}`}
              >
                {editing ? <Lock size={16} /> : <Unlock size={16} />}
                {editing ? 'Blocca Modifiche' : 'Abilita Modifiche'}
              </button>

              {editing && (
                <>
                  <div className="w-px h-6 bg-gray-600"></div>
                  
                  <button
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    className="btn btn-secondary"
                  >
                    <Undo size={16} />
                    Annulla
                  </button>
                  
                  <button
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    className="btn btn-secondary"
                  >
                    <Redo size={16} />
                    Ripeti
                  </button>
                  
                  <div className="w-px h-6 bg-gray-600"></div>
                  
                  <button
                    onClick={copyCells}
                    disabled={selectedCells.length === 0}
                    className="btn btn-secondary"
                  >
                    <Copy size={16} />
                    Copia
                  </button>
                  
                  <button
                    onClick={pasteCells}
                    disabled={selectedCells.length === 0 || clipboard.length === 0}
                    className="btn btn-secondary"
                  >
                    <ClipboardPaste size={16} />
                    Incolla
                  </button>
                  
                  <div className="w-px h-6 bg-gray-600"></div>
                  
                  <button
                    onClick={saveChanges}
                    disabled={saving || JSON.stringify(data) === JSON.stringify(originalData)}
                    className="btn btn-primary"
                  >
                    {saving ? <div className="loading"></div> : <Save size={16} />}
                    {saving ? 'Salvataggio...' : 'Salva Modifiche'}
                  </button>
                </>
              )}

              <div className="flex-1"></div>
              
              <button
                onClick={exportCsv}
                className="btn btn-secondary"
              >
                <Download size={16} />
                Esporta CSV
              </button>
            </div>
          </div>

          {/* Lista Backup */}
          {showBackups && (
            <div className="card mb-4" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
              <h3 className="card-title mb-3">Storico Backup</h3>
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>File</th>
                      <th>Dimensione</th>
                      <th>Creato</th>
                      <th>Modificato</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup, index) => (
                      <tr key={index}>
                        <td className="font-mono text-sm">{backup.filename}</td>
                        <td>{(backup.size / 1024).toFixed(1)} KB</td>
                        <td>{new Date(backup.created).toLocaleString('it-IT')}</td>
                        <td>{new Date(backup.modified).toLocaleString('it-IT')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tabella Editor */}
          {loading ? (
            <div className="text-center p-8">
              <div className="loading" style={{ width: '40px', height: '40px', margin: '0 auto' }}></div>
              <p className="mt-3" style={{ color: '#a0a0a0' }}>Caricamento dati...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center p-8">
              <FileText size={48} style={{ color: '#666', margin: '0 auto 1rem' }} />
              <h3 className="mb-2">Nessun dato disponibile</h3>
              <p style={{ color: '#a0a0a0' }}>Il database CSV è vuoto</p>
            </div>
          ) : (
            <div 
              className="table-container"
              onPaste={handlePaste}
              style={{ maxHeight: '70vh', overflow: 'auto' }}
            >
              <table ref={tableRef} className="table">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ width: '60px' }}>#</th>
                    {columns.map((column) => (
                      <th 
                        key={column.key}
                      >
                        {column.label}
                      </th>
                    ))}
                    {editing && <th style={{ width: '80px' }}>Azioni</th>}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td className="text-center font-mono text-sm">
                        {rowIndex + 1}
                      </td>
                      {columns.map((column) => {
                        const isEditing = editing && editingCell?.row === rowIndex && editingCell?.column === column.key;
                        const isSelected = selectedCells.some(cell => cell.row === rowIndex && cell.column === column.key);
                        
                        return (
                          <td
                            key={column.key}
                            className={`${isSelected ? 'bg-blue-900 bg-opacity-30' : ''} ${isEditing ? 'bg-blue-800 bg-opacity-50' : ''}`}
                            style={{ 
                              cursor: editing ? 'pointer' : 'default'
                            }}
                            onClick={() => handleCellClick(rowIndex, column.key)}
                            onMouseDown={(e) => handleCellMouseDown(rowIndex, column.key, e)}
                          >
                            {isEditing ? (
                              column.type === 'select' ? (
                                <select
                                  value={row[column.key] || ''}
                                  onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
                                  className="form-select"
                                  style={{ width: '100%', padding: '4px' }}
                                  autoFocus
                                >
                                  <option value="">Seleziona...</option>
                                  {column.options.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : column.type === 'datetime' ? 'datetime-local' : 'text'}
                                  value={formatInputValue(row[column.key] || '', column.type)}
                                  onChange={(e) => handleCellChange(rowIndex, column.key, e.target.value)}
                                  className="form-input"
                                  style={{ width: '100%', padding: '4px' }}
                                  autoFocus
                                />
                              )
                            ) : (
                              <div 
                                className="truncate"
                                style={{ 
                                  color: isSelected ? '#ffffff' : '#e0e0e0'
                                }}
                                title={formatValue(row[column.key], column.type)}
                              >
                                {formatValue(row[column.key], column.type)}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      {editing && (
                        <td className="text-center">
                          <button
                            onClick={() => deleteRow(rowIndex)}
                            className="btn btn-sm btn-danger"
                            title="Elimina riga"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Istruzioni */}
          {editing && (
            <div className="card mt-4" style={{ background: 'rgba(30, 30, 30, 0.4)' }}>
              <h3 className="card-title mb-3">Istruzioni</h3>
              <div className="grid grid-2">
                <div>
                  <h4 className="mb-2" style={{ color: '#4ade80' }}>✓ Funzionalità Disponibili</h4>
                  <ul className="space-y-1" style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                    <li>• Clicca su una cella per modificarla</li>
                    <li>• Copia/Incolla con Ctrl+C / Ctrl+V</li>
                    <li>• Incolla da Excel con Ctrl+V</li>
                    <li>• Annulla/Ripeti modifiche</li>
                    <li>• Backup automatico ad ogni salvataggio</li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-2" style={{ color: '#f59e0b' }}>⚠️ Attenzione</h4>
                  <ul className="space-y-1" style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                    <li>• I seriali devono essere unici</li>
                    <li>• Le date devono essere valide</li>
                    <li>• Salva spesso le modifiche</li>
                    <li>• I backup sono conservati per sempre</li>
                    <li>• Le modifiche sono permanenti</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CsvEditor;
