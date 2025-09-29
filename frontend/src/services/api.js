import axios from 'axios';

// Configurazione API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
const API_TOKEN = process.env.REACT_APP_API_TOKEN || '19111976';

// Crea istanza axios con configurazione di base
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 secondi timeout
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`
  }
});

// Interceptor per gestire errori
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('❌ Token di accesso non valido o mancante');
    } else if (error.response?.status === 403) {
      console.error('❌ Accesso negato - token non valido');
    } else if (error.response?.status === 429) {
      console.error('❌ Troppe richieste, riprova più tardi');
    } else if (error.code === 'ECONNABORTED') {
      console.error('❌ Timeout della richiesta');
    } else if (!error.response) {
      console.error('❌ Errore di connessione al server');
    }
    
    return Promise.reject(error);
  }
);

// Servizi API
export const apiService = {
  // Login via CSV (no token richiesto)
  async login(username, password) {
    const response = await axios.post(`${API_BASE_URL}/login`, { username, password });
    return response.data;
  },
  // Health check (senza autenticazione)
  async healthCheck() {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  },

  // Genera nuovo seriale
  async generateSerial() {
    const response = await api.get('/generate-serial');
    return response.data;
  },

  // Valida seriale
  async validateSerial(serial) {
    const response = await api.post('/validate-serial', { serial });
    return response.data;
  },

  // Crea certificato
  async createCertificate(certificateData) {
    const response = await api.post('/write-certificate', certificateData);
    return response.data;
  },

  // Verifica certificato
  async getCertificate(serial) {
    const response = await api.get(`/certificate/${serial}`);
    return response.data;
  },

  // Ottieni tutti i certificati
  async getCertificates(params = {}) {
    const response = await api.get('/certificates', { params });
    return response.data;
  },

  // Ottieni statistiche
  async getStats() {
    const response = await api.get('/stats');
    return response.data;
  },

  // Ottieni log
  async getLogs(params = {}) {
    const response = await api.get('/logs', { params });
    return response.data;
  },

  // Ottieni dati CSV per editor
  async getCsvData() {
    const response = await api.get('/csv-data');
    return response.data;
  },

  // Aggiorna riga CSV
  async updateCsvRow(index, data) {
    const response = await api.put(`/csv-row/${index}`, data);
    return response.data;
  },

  // Elimina riga CSV
  async deleteCsvRow(index) {
    const response = await api.delete(`/csv-row/${index}`);
    return response.data;
  },

  // Ottieni lista backup
  async getBackups() {
    const response = await api.get('/backups');
    return response.data;
  }
};

// Utility per gestire errori API
export const handleApiError = (error) => {
  if (error.response) {
    // Errore dal server
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return `Errore di validazione: ${data.error || 'Dati non validi'}`;
      case 401:
        return 'Token di accesso richiesto';
      case 403:
        return 'Accesso negato - token non valido';
      case 404:
        return data.error || 'Risorsa non trovata';
      case 429:
        return 'Troppe richieste, riprova più tardi';
      case 500:
        return 'Errore interno del server';
      default:
        return data.error || `Errore ${status}`;
    }
  } else if (error.request) {
    // Errore di rete
    return 'Errore di connessione al server';
  } else {
    // Altri errori
    return error.message || 'Errore sconosciuto';
  }
};

// Utility per testare la connessione
export const testConnection = async () => {
  try {
    const health = await apiService.healthCheck();
    return {
      connected: true,
      data: health
    };
  } catch (error) {
    return {
      connected: false,
      error: handleApiError(error)
    };
  }
};

export default api;
