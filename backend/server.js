const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const CSVManager = require('./utils/csvManager');
const SerialGenerator = require('./utils/serialGenerator');
const BlockchainManager = require('./utils/blockchainManager');
const Logger = require('./utils/logger');

// Configurazione - TUTTE le variabili devono essere nel file .env
const config = {
  // App Config
  port: process.env.PORT,
  csvPath: process.env.CSV_FILE_PATH,
  backupPath: process.env.BACKUP_PATH,
  logPath: process.env.LOG_PATH,
  
  // Blockchain Config
  polygonRpcUrl: process.env.POLYGON_RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
  chainId: parseInt(process.env.CHAIN_ID),
  explorerBaseUrl: process.env.EXPLORER_BASE_URL,
  
  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS),
  
  // Logging
  logLevel: process.env.LOG_LEVEL,
  logMaxSize: parseInt(process.env.LOG_MAX_SIZE),
  logMaxFiles: parseInt(process.env.LOG_MAX_FILES),
  
  // Security
  corsOrigin: process.env.CORS_ORIGIN,
  helmetEnabled: process.env.HELMET_ENABLED === 'true',
  
  // Serial Generation
  serialLength: parseInt(process.env.SERIAL_LENGTH),
  maxProgressive: parseInt(process.env.MAX_PROGRESSIVE),
  
  // Blockchain Gas
  gasLimitMultiplier: parseFloat(process.env.GAS_LIMIT_MULTIPLIER),
  maxGasPrice: parseInt(process.env.MAX_GAS_PRICE),
  
  // File Upload
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE),
  allowedFileTypes: process.env.ALLOWED_FILE_TYPES.split(','),
  
  // Database
  csvDelimiter: process.env.CSV_DELIMITER,
  csvEncoding: process.env.CSV_ENCODING,
  
  // Backup
  backupRetentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS),
  autoBackup: process.env.AUTO_BACKUP === 'true',
  
  // API
  apiVersion: process.env.API_VERSION,
  apiPrefix: process.env.API_PREFIX,
  apiToken: process.env.API_TOKEN
};

// Validazione configurazione obbligatoria
const requiredEnvVars = [
  'PORT', 'CSV_FILE_PATH', 'BACKUP_PATH', 'LOG_PATH',
  'POLYGON_RPC_URL', 'PRIVATE_KEY', 'CHAIN_ID', 'EXPLORER_BASE_URL',
  'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS',
  'LOG_LEVEL', 'LOG_MAX_SIZE', 'LOG_MAX_FILES',
  'CORS_ORIGIN', 'HELMET_ENABLED',
  'SERIAL_LENGTH', 'MAX_PROGRESSIVE',
  'GAS_LIMIT_MULTIPLIER', 'MAX_GAS_PRICE',
  'MAX_FILE_SIZE', 'ALLOWED_FILE_TYPES',
  'CSV_DELIMITER', 'CSV_ENCODING',
  'BACKUP_RETENTION_DAYS', 'AUTO_BACKUP',
  'API_VERSION', 'API_PREFIX', 'API_TOKEN'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Variabili d\'ambiente mancanti:', missingVars.join(', '));
  console.error('📝 Copia il file env.example come .env e configura i valori');
  process.exit(1);
}

// Inizializza componenti
const logger = new Logger(config.logPath);
const csvManager = new CSVManager(config.csvPath, config.backupPath);
const serialGenerator = new SerialGenerator();
const blockchainManager = new BlockchainManager(
  config.polygonRpcUrl,
  config.privateKey,
  config.chainId,
  config.explorerBaseUrl
);

// Inizializza Express
const app = express();

// Middleware di sicurezza
if (config.helmetEnabled) {
  app.use(helmet());
}
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: process.env.MAX_FILE_SIZE }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: {
    error: 'Troppe richieste, riprova più tardi',
    retryAfter: Math.ceil(config.rateLimitWindowMs / 1000)
  }
});
app.use(`${config.apiPrefix}/`, limiter);

// Middleware di autenticazione token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  // Controlla anche il parametro query per compatibilità
  const queryToken = req.query.token;
  const finalToken = token || queryToken;
  
  if (!finalToken) {
    return res.status(401).json({
      success: false,
      error: 'Token di accesso richiesto',
      hint: 'Invia il token nell\'header Authorization: Bearer <token> o come parametro ?token=<token>'
    });
  }
  
  if (finalToken !== config.apiToken) {
    logger.warn('Tentativo accesso con token non valido', {
      ip: req.ip,
      token: finalToken,
      path: req.path
    });
    
    return res.status(403).json({
      success: false,
      error: 'Token non valido'
    });
  }
  
  next();
};

// Applica autenticazione a tutti gli endpoint API tranne health check
app.use(`${config.apiPrefix}`, (req, res, next) => {
  if (req.path === '/health') {
    return next(); // Salta autenticazione per health check
  }
  return authenticateToken(req, res, next);
});

// Middleware di logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Middleware di gestione errori
app.use((error, req, res, next) => {
  logger.logError(error, {
    method: req.method,
    path: req.path,
    body: req.body
  });
  
  res.status(500).json({
    success: false,
    error: 'Errore interno del server',
    timestamp: new Date().toISOString()
  });
});

// Route di health check
app.get(`${config.apiPrefix}/health`, async (req, res) => {
  try {
    const connection = await blockchainManager.checkConnection();
    const lastSerial = await csvManager.getLastSerial();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      blockchain: connection,
      lastSerial: lastSerial
    });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/health' });
    res.status(500).json({
      success: false,
      error: 'Errore health check'
    });
  }
});

// Route per generare nuovo seriale
app.get(`${config.apiPrefix}/generate-serial`, async (req, res) => {
  try {
    const lastSerial = await csvManager.getLastSerial();
    const newSerial = serialGenerator.generateNextSerial(lastSerial);
    
    logger.logSerialGeneration(newSerial, lastSerial, { endpoint: '/api/generate-serial' });
    
    res.json({
      success: true,
      serial: newSerial,
      lastSerial: lastSerial,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/generate-serial' });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per validare seriale
app.post(`${config.apiPrefix}/validate-serial`, async (req, res) => {
  try {
    const { serial } = req.body;
    
    if (!serial) {
      return res.status(400).json({
        success: false,
        error: 'Seriale richiesto'
      });
    }
    
    const isValid = serialGenerator.validateSerialFormat(serial);
    const isUnique = await csvManager.isSerialUnique(serial);
    const serialInfo = serialGenerator.getSerialInfo(serial);
    
    res.json({
      success: true,
      serial: serial,
      isValid: isValid,
      isUnique: isUnique,
      serialInfo: serialInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/validate-serial' });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per creare certificato
app.post(`${config.apiPrefix}/write-certificate`, async (req, res) => {
  try {
    const certificateData = req.body;
    
    // Validazione dati obbligatori
    const requiredFields = ['serial', 'company', 'production_date', 'city', 'country', 'weight', 'metal', 'fineness', 'tax_code', 'social_capital', 'authorization', 'user'];
    const missingFields = requiredFields.filter(field => !certificateData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `Campi obbligatori mancanti: ${missingFields.join(', ')}`
      });
    }
    
    // Validazione formato seriale
    if (!serialGenerator.validateSerialFormat(certificateData.serial)) {
      return res.status(400).json({
        success: false,
        error: 'Formato seriale non valido (deve essere 13 cifre numeriche)'
      });
    }
    
    // Verifica unicità seriale
    const isUnique = await csvManager.isSerialUnique(certificateData.serial);
    if (!isUnique) {
      return res.status(400).json({
        success: false,
        error: `Seriale ${certificateData.serial} già esistente`
      });
    }
    
    // Aggiungi timestamp
    certificateData.write_date = new Date().toISOString();
    
    // Scrittura su blockchain
    logger.info('Inizio scrittura certificato su blockchain', { serial: certificateData.serial });
    const blockchainResult = await blockchainManager.writeCertificate(certificateData);
    
    // Aggiungi hash e link blockchain ai dati
    certificateData.blockchain_hash = blockchainResult.transactionHash;
    certificateData.blockchain_link = blockchainResult.explorerLink;
    
    // Salvataggio su CSV
    await csvManager.writeCertificate(certificateData);
    
    // Log operazione
    logger.logCertificateCreation(certificateData, blockchainResult);
    logger.logBlockchainTransaction(blockchainResult);
    
    res.json({
      success: true,
      message: 'Certificato creato con successo',
      data: {
        serial: certificateData.serial,
        blockchainHash: blockchainResult.transactionHash,
        blockchainLink: blockchainResult.explorerLink,
        blockNumber: blockchainResult.blockNumber,
        gasUsed: blockchainResult.gasUsed,
        writeDate: certificateData.write_date
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { 
      endpoint: '/api/write-certificate',
      body: req.body 
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Route per verificare certificato
app.get(`${config.apiPrefix}/certificate/:serial`, async (req, res) => {
  try {
    const { serial } = req.params;
    
    if (!serialGenerator.validateSerialFormat(serial)) {
      return res.status(400).json({
        success: false,
        error: 'Formato seriale non valido'
      });
    }
    
    const certificate = await csvManager.findCertificateBySerial(serial);
    
    if (!certificate) {
      logger.logCertificateVerification(serial, false);
      return res.status(404).json({
        success: false,
        error: 'Certificato non trovato',
        serial: serial
      });
    }
    
    // Verifica transazione blockchain se disponibile
    let blockchainVerification = null;
    let blockchainData = null;
    if (certificate.blockchain_hash) {
      blockchainVerification = await blockchainManager.verifyTransaction(certificate.blockchain_hash);
      // Leggi anche i dati leggibili dalla blockchain
      try {
        blockchainData = await blockchainManager.readCertificateData(certificate.blockchain_hash);
      } catch (readError) {
        logger.logError(readError, { 
          endpoint: '/api/certificate/:serial - readCertificateData',
          serial: serial 
        });
      }
    }
    
    logger.logCertificateVerification(serial, true, certificate);
    
    res.json({
      success: true,
      certificate: certificate,
      blockchainVerification: blockchainVerification,
      blockchainData: blockchainData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { 
      endpoint: '/api/certificate/:serial',
      serial: req.params.serial 
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per leggere dati blockchain in formato leggibile
app.get(`${config.apiPrefix}/blockchain-data/:transactionHash`, async (req, res) => {
  try {
    const { transactionHash } = req.params;
    
    if (!transactionHash || !transactionHash.startsWith('0x')) {
      return res.status(400).json({
        success: false,
        error: 'Hash transazione non valido'
      });
    }
    
    const blockchainData = await blockchainManager.readCertificateData(transactionHash);
    
    res.json({
      success: true,
      data: blockchainData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { 
      endpoint: '/api/blockchain-data/:transactionHash',
      transactionHash: req.params.transactionHash 
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per ottenere tutti i certificati
app.get(`${config.apiPrefix}/certificates`, async (req, res) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;
    
    let certificates = await csvManager.readAllCertificates();
    
    // Filtro di ricerca se specificato
    if (search) {
      const searchLower = search.toLowerCase();
      certificates = certificates.filter(cert => 
        cert.serial.toLowerCase().includes(searchLower) ||
        cert.company.toLowerCase().includes(searchLower) ||
        cert.city.toLowerCase().includes(searchLower) ||
        cert.metal.toLowerCase().includes(searchLower)
      );
    }
    
    // Ordinamento per data di scrittura (più recenti prima)
    certificates.sort((a, b) => new Date(b.write_date) - new Date(a.write_date));
    
    // Paginazione
    const total = certificates.length;
    const paginatedCertificates = certificates.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      certificates: paginatedCertificates,
      pagination: {
        total: total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: offset + parseInt(limit) < total
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { endpoint: '/api/certificates' });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per ottenere statistiche
app.get(`${config.apiPrefix}/stats`, async (req, res) => {
  try {
    const certificates = await csvManager.readAllCertificates();
    const lastSerial = await csvManager.getLastSerial();
    const connection = await blockchainManager.checkConnection();
    
    // Statistiche sui certificati
    const stats = {
      totalCertificates: certificates.length,
      lastSerial: lastSerial,
      blockchain: connection,
      byMetal: {},
      byMonth: {},
      byYear: {}
    };
    
    // Analisi per metallo
    certificates.forEach(cert => {
      stats.byMetal[cert.metal] = (stats.byMetal[cert.metal] || 0) + 1;
      
      const date = new Date(cert.write_date);
      const year = date.getFullYear();
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      stats.byYear[year] = (stats.byYear[year] || 0) + 1;
      stats.byMonth[month] = (stats.byMonth[month] || 0) + 1;
    });
    
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { endpoint: '/api/stats' });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per ottenere log recenti
app.get(`${config.apiPrefix}/logs`, async (req, res) => {
  try {
    const { level = 'info', limit = 50 } = req.query;
    const logs = await logger.getRecentLogs(level, parseInt(limit));
    
    res.json({
      success: true,
      logs: logs,
      level: level,
      limit: parseInt(limit),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { endpoint: '/api/logs' });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per ottenere tutti i dati CSV per l'editor
app.get(`${config.apiPrefix}/csv-data`, async (req, res) => {
  try {
    const certificates = await csvManager.readAllCertificates();
    
    res.json({
      success: true,
      data: certificates,
      total: certificates.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { endpoint: '/api/csv-data' });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per aggiornare una riga del CSV
app.put(`${config.apiPrefix}/csv-row/:index`, async (req, res) => {
  try {
    const { index } = req.params;
    const updatedData = req.body;
    
    // Backup prima della modifica
    await csvManager.backupCSV();
    
    // Leggi tutti i certificati
    const certificates = await csvManager.readAllCertificates();
    
    // Valida indice
    const rowIndex = parseInt(index);
    if (rowIndex < 0 || rowIndex >= certificates.length) {
      return res.status(400).json({
        success: false,
        error: 'Indice riga non valido'
      });
    }
    
    // Valida seriale se modificato
    if (updatedData.serial && updatedData.serial !== certificates[rowIndex].serial) {
      if (!serialGenerator.validateSerialFormat(updatedData.serial)) {
        return res.status(400).json({
          success: false,
          error: 'Formato seriale non valido'
        });
      }
      
      const isUnique = await csvManager.isSerialUnique(updatedData.serial);
      if (!isUnique) {
        return res.status(400).json({
          success: false,
          error: 'Seriale già esistente'
        });
      }
    }
    
    // Aggiorna la riga
    certificates[rowIndex] = { ...certificates[rowIndex], ...updatedData };
    
    // Scrivi il CSV aggiornato
    const csvWriter = createCsvWriter({
      path: config.csvPath,
      header: [
        { id: 'serial', title: 'serial' },
        { id: 'company', title: 'company' },
        { id: 'production_date', title: 'production_date' },
        { id: 'city', title: 'city' },
        { id: 'country', title: 'country' },
        { id: 'weight', title: 'weight' },
        { id: 'metal', title: 'metal' },
        { id: 'fineness', title: 'fineness' },
        { id: 'tax_code', title: 'tax_code' },
        { id: 'social_capital', title: 'social_capital' },
        { id: 'authorization', title: 'authorization' },
        { id: 'blockchain_hash', title: 'blockchain_hash' },
        { id: 'blockchain_link', title: 'blockchain_link' },
        { id: 'user', title: 'user' },
        { id: 'write_date', title: 'write_date' }
      ],
      fieldDelimiter: process.env.CSV_DELIMITER || ';'
    });
    
    await csvWriter.writeRecords(certificates);
    
    logger.info('Riga CSV aggiornata', {
      type: 'CSV_ROW_UPDATED',
      index: rowIndex,
      serial: updatedData.serial || certificates[rowIndex].serial,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Riga aggiornata con successo',
      data: certificates[rowIndex],
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { 
      endpoint: '/api/csv-row/:index',
      index: req.params.index,
      body: req.body 
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per eliminare una riga del CSV
app.delete(`${config.apiPrefix}/csv-row/:index`, async (req, res) => {
  try {
    const { index } = req.params;
    
    // Backup prima della modifica
    await csvManager.backupCSV();
    
    // Leggi tutti i certificati
    const certificates = await csvManager.readAllCertificates();
    
    // Valida indice
    const rowIndex = parseInt(index);
    if (rowIndex < 0 || rowIndex >= certificates.length) {
      return res.status(400).json({
        success: false,
        error: 'Indice riga non valido'
      });
    }
    
    const deletedRow = certificates[rowIndex];
    
    // Rimuovi la riga
    certificates.splice(rowIndex, 1);
    
    // Scrivi il CSV aggiornato
    const csvWriter = createCsvWriter({
      path: config.csvPath,
      header: [
        { id: 'serial', title: 'serial' },
        { id: 'company', title: 'company' },
        { id: 'production_date', title: 'production_date' },
        { id: 'city', title: 'city' },
        { id: 'country', title: 'country' },
        { id: 'weight', title: 'weight' },
        { id: 'metal', title: 'metal' },
        { id: 'fineness', title: 'fineness' },
        { id: 'tax_code', title: 'tax_code' },
        { id: 'social_capital', title: 'social_capital' },
        { id: 'authorization', title: 'authorization' },
        { id: 'blockchain_hash', title: 'blockchain_hash' },
        { id: 'blockchain_link', title: 'blockchain_link' },
        { id: 'user', title: 'user' },
        { id: 'write_date', title: 'write_date' }
      ],
      fieldDelimiter: process.env.CSV_DELIMITER || ';'
    });
    
    await csvWriter.writeRecords(certificates);
    
    logger.info('Riga CSV eliminata', {
      type: 'CSV_ROW_DELETED',
      index: rowIndex,
      serial: deletedRow.serial,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Riga eliminata con successo',
      deletedRow: deletedRow,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { 
      endpoint: '/api/csv-row/:index',
      index: req.params.index 
    });
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route per ottenere lista backup
app.get(`${config.apiPrefix}/backups`, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const backupDir = config.backupPath;
    const files = fs.readdirSync(backupDir)
      .filter(file => file.endsWith('.csv'))
      .map(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({
      success: true,
      backups: files,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.logError(error, { endpoint: '/api/backups' });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Avvia server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Server avviato sulla porta ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    timestamp: new Date().toISOString()
  });
  
  console.log(`🚀 Server blockchain certificate avviato su http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}${config.apiPrefix}/health`);
  console.log(`📝 API docs: http://localhost:${PORT}${config.apiPrefix}/`);
});

// Gestione chiusura graceful
process.on('SIGINT', () => {
  logger.info('Server in chiusura...', { signal: 'SIGINT' });
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Server in chiusura...', { signal: 'SIGTERM' });
  process.exit(0);
});

module.exports = app;
