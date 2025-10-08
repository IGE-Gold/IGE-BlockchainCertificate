const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const CSVManager = require('./utils/csvManager');
const SerialGenerator = require('./utils/serialGenerator');
const BlockchainManager = require('./utils/blockchainManager');
const Logger = require('./utils/logger');
const UsersManager = require('./utils/usersManager');

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
  usersCsvPath: process.env.USERS_CSV_PATH || path.join(__dirname, 'data', 'users.csv'),
  
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
const usersManager = new UsersManager(config.usersCsvPath, config.csvDelimiter, config.csvEncoding);
const multer = require('multer');
const upload = multer({
  limits: { fileSize: config.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowed = (config.allowedFileTypes || []).map(t => t.trim().toLowerCase());
    const mimetype = (file.mimetype || '').toLowerCase();
    if (allowed.length === 0 || allowed.includes(mimetype) || file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(null, true);
    }
    cb(new Error('Tipo file non consentito'));
  }
});

// Lock in-memory per evitare scritture multiple simultanee
let bulkWriteInProgress = false;

// Inizializza Express
const app = express();

// Trust proxy per Render (necessario per rate limiting)
app.set('trust proxy', 1);

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
  if (req.path === '/health' || req.path === '/login') {
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

// Route di login utente via CSV (no token)
app.post(`${config.apiPrefix}/login`, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username e password richiesti' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, error: 'Password troppo corta (min 6 caratteri)' });
    }
    const user = await usersManager.validateCredentials(username, password);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Credenziali non valide' });
    }
    return res.json({ success: true, user, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/login' });
    return res.status(500).json({ success: false, error: 'Errore login' });
  }
});

// Route per generare nuovo seriale
app.get(`${config.apiPrefix}/generate-serial`, async (req, res) => {
  try {
    const allSerials = await csvManager.getAllSerials();
    const newSerial = serialGenerator.generateNextSerial(allSerials);
    
    logger.logSerialGeneration(newSerial, allSerials.length > 0 ? allSerials[allSerials.length - 1] : null, { endpoint: '/api/generate-serial' });
    
    res.json({
      success: true,
      serial: newSerial,
      totalSerials: allSerials.length,
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
    const requiredFields = ['serial', 'company', 'production_date', 'city', 'country', 'weight', 'metal', 'fineness', 'tax_code', 'social_capital', 'authorization', 'user', 'bar_type'];
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
        error: 'Formato seriale non valido (deve essere 7 cifre numeriche)'
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
    
    // Validazione bar_type e campi custom
    const barType = String(certificateData.bar_type || '').toLowerCase();
    if (!['investment', 'custom'].includes(barType)) {
      return res.status(400).json({ success: false, error: 'bar_type must be either "investment" or "custom"' });
    }
    if (barType === 'custom') {
      const customMissing = ['custom_icon_code', 'custom_date', 'custom_text']
        .filter(f => !certificateData[f]);
      if (customMissing.length > 0) {
        return res.status(400).json({ success: false, error: `Missing custom fields: ${customMissing.join(', ')}` });
      }
      // Validazioni di base
      if (String(certificateData.custom_icon_code).length > 20) {
        return res.status(400).json({ success: false, error: 'custom_icon_code too long (max 20 chars)' });
      }
      const customDate = new Date(certificateData.custom_date);
      if (isNaN(customDate.getTime()) || customDate > new Date()) {
        return res.status(400).json({ success: false, error: 'custom_date must be a valid past or current date (YYYY-MM-DD)' });
      }
      if (String(certificateData.custom_text).length > 120) {
        return res.status(400).json({ success: false, error: 'custom_text too long (max 120 chars)' });
      }
    } else {
      // normalizza campi custom a stringa vuota per CSV
      certificateData.custom_icon_code = '';
      certificateData.custom_date = '';
      certificateData.custom_text = '';
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

// Validazione CSV massiva (upload CSV) - restituisce dettagli errori per riga
app.post(`${config.apiPrefix}/bulk/validate`, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'File CSV richiesto (campo file)' });
    }

    const csvText = req.file.buffer.toString(config.csvEncoding);
    const rows = await csvManager.parseCSVText(csvText);

    const requiredFields = ['serial', 'company', 'production_date', 'city', 'country', 'weight', 'metal', 'fineness', 'tax_code', 'social_capital', 'authorization', 'user', 'bar_type'];
    const existingSerials = new Set((await csvManager.getAllSerials()));
    const users = await usersManager.readAllUsers();
    const validUserIds = new Set(users.map(u => String(u.id)));
    const seenInBatch = new Set();

    const errors = [];

    rows.forEach((row, index) => {
      const rowNumber = index + 2; // +1 header, +1 base index
      const rowErrors = [];

      // Missing fields
      const missing = requiredFields.filter(f => !(row[f] && String(row[f]).trim() !== ''));
      if (missing.length > 0) {
        rowErrors.push(`Campi mancanti: ${missing.join(', ')}`);
      }

      const serial = String(row.serial || '').trim();
      if (!serialGenerator.validateSerialFormat(serial)) {
        rowErrors.push('Formato seriale non valido (7 cifre)');
      }
      if (seenInBatch.has(serial)) {
        rowErrors.push('Seriale duplicato nel CSV');
      }
      if (existingSerials.has(serial)) {
        rowErrors.push('Seriale già presente nel database');
      }

      const barType = String(row.bar_type || '').toLowerCase();
      if (!['investment', 'custom'].includes(barType)) {
        rowErrors.push('bar_type deve essere investment o custom');
      }
      if (barType === 'custom') {
        const customMissing = ['custom_icon_code', 'custom_date', 'custom_text'].filter(f => !(row[f] && String(row[f]).trim() !== ''));
        if (customMissing.length > 0) {
          rowErrors.push(`Campi custom mancanti: ${customMissing.join(', ')}`);
        }
        if (String(row.custom_icon_code || '').length > 20) {
          rowErrors.push('custom_icon_code troppo lungo (max 20)');
        }
        const cd = new Date(row.custom_date);
        if (isNaN(cd.getTime()) || cd > new Date()) {
          rowErrors.push('custom_date non valido o futuro');
        }
        if (String(row.custom_text || '').length > 120) {
          rowErrors.push('custom_text troppo lungo (max 120)');
        }
      }

      const userId = String(row.user || '').trim();
      if (!validUserIds.has(userId)) {
        rowErrors.push('user non valido: user_id inesistente');
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, serial: serial || null, errors: rowErrors });
      } else {
        seenInBatch.add(serial);
      }
    });

    const summary = {
      totalRows: rows.length,
      validRows: rows.length - errors.length,
      invalidRows: errors.length
    };

    return res.json({ success: true, summary, errors });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/bulk/validate' });
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Scrittura massiva: esegue blockchain + CSV per ogni riga valida in input JSON
app.post(`${config.apiPrefix}/bulk/write`, async (req, res) => {
  try {
    if (bulkWriteInProgress) {
      return res.status(429).json({ success: false, error: 'Operazione di scrittura massiva già in corso' });
    }
    bulkWriteInProgress = true;
    const { certificates } = req.body || {};
    if (!Array.isArray(certificates) || certificates.length === 0) {
      return res.status(400).json({ success: false, error: 'Array certificates richiesto e non vuoto' });
    }

    const requiredFields = ['serial', 'company', 'production_date', 'city', 'country', 'weight', 'metal', 'fineness', 'tax_code', 'social_capital', 'authorization', 'user', 'bar_type'];
    const existingSerials = new Set((await csvManager.getAllSerials()));
    const users = await usersManager.readAllUsers();
    const validUserIds = new Set(users.map(u => String(u.id)));
    const seenInBatch = new Set();

    const results = [];
    const toPersist = [];

    // Prima passata: validazione completa. Se una riga fallisce, non procedere alla scrittura
    for (let i = 0; i < certificates.length; i++) {
      const row = certificates[i];
      const rowNumber = i + 1;
      const rowErrors = [];

      const missing = requiredFields.filter(f => !(row[f] && String(row[f]).trim() !== ''));
      if (missing.length > 0) rowErrors.push(`Campi mancanti: ${missing.join(', ')}`);

      const serial = String(row.serial || '').trim();
      if (!serialGenerator.validateSerialFormat(serial)) rowErrors.push('Formato seriale non valido (7 cifre)');
      if (seenInBatch.has(serial)) rowErrors.push('Seriale duplicato nel payload');
      if (existingSerials.has(serial)) rowErrors.push('Seriale già presente nel database');

      const barType = String(row.bar_type || '').toLowerCase();
      if (!['investment', 'custom'].includes(barType)) rowErrors.push('bar_type deve essere investment o custom');
      if (barType === 'custom') {
        const customMissing = ['custom_icon_code', 'custom_date', 'custom_text'].filter(f => !(row[f] && String(row[f]).trim() !== ''));
        if (customMissing.length > 0) rowErrors.push(`Campi custom mancanti: ${customMissing.join(', ')}`);
        if (String(row.custom_icon_code || '').length > 20) rowErrors.push('custom_icon_code troppo lungo (max 20)');
        const cd = new Date(row.custom_date);
        if (isNaN(cd.getTime()) || cd > new Date()) rowErrors.push('custom_date non valido o futuro');
        if (String(row.custom_text || '').length > 120) rowErrors.push('custom_text troppo lungo (max 120)');
      }

      const userId = String(row.user || '').trim();
      if (!validUserIds.has(userId)) rowErrors.push('user non valido: user_id inesistente');

      if (rowErrors.length > 0) {
        results.push({ index: rowNumber, serial: serial || null, success: false, errors: rowErrors });
      } else {
        // segna serial valido per la validazione intra-batch
        seenInBatch.add(serial);
        results.push({ index: rowNumber, serial, success: true, pending: true });
      }
    }

    const hasValidationErrors = results.some(r => !r.success);
    if (hasValidationErrors) {
      bulkWriteInProgress = false;
      return res.status(400).json({ success: false, summary: { requested: certificates.length, written: 0, failed: results.filter(r => !r.success).length }, results });
    }

    // Seconda passata: scrittura su blockchain. Se una riga fallisce, interrompi e non persistere su CSV
    for (let i = 0; i < certificates.length; i++) {
      const row = certificates[i];
      const rowNumber = i + 1;
      const serial = String(row.serial || '').trim();

      const barType = String(row.bar_type || '').toLowerCase();
      if (barType !== 'custom') {
        row.custom_icon_code = '';
        row.custom_date = '';
        row.custom_text = '';
      }

      // ready to write on-chain
      try {
        const payload = { ...row, write_date: new Date().toISOString() };
        const bc = await blockchainManager.writeCertificate(payload);
        payload.blockchain_hash = bc.transactionHash;
        payload.blockchain_link = bc.explorerLink;
        toPersist.push(payload);
        // aggiorna risultato esistente
        const r = results.find(x => x.index === rowNumber);
        if (r) {
          r.success = true;
          r.pending = false;
          r.blockchainHash = bc.transactionHash;
          r.blockchainLink = bc.explorerLink;
        }
      } catch (bcErr) {
        const r = results.find(x => x.index === rowNumber);
        if (r) {
          r.success = false;
          r.pending = false;
          r.errors = [`Errore blockchain: ${bcErr.message}`];
        } else {
          results.push({ index: rowNumber, serial, success: false, errors: [`Errore blockchain: ${bcErr.message}`] });
        }
        // interruzione immediata: non persistere su CSV e restituisci esito
        const summary = {
          requested: certificates.length,
          written: 0,
          failed: results.filter(rr => rr.success === false).length
        };
        bulkWriteInProgress = false;
        return res.status(500).json({ success: false, summary, results });
      }
    }

    // Persist successful ones in CSV in one shot
    if (toPersist.length > 0) {
      await csvManager.writeCertificatesBatch(toPersist);
    }

    const summary = {
      requested: certificates.length,
      written: toPersist.length,
      failed: results.filter(r => !r.success).length
    };

    bulkWriteInProgress = false;
    return res.json({ success: true, summary, results });
  } catch (error) {
    logger.logError(error, { endpoint: '/api/bulk/write' });
    bulkWriteInProgress = false;
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Route per verificare certificato
app.get(`${config.apiPrefix}/certificate/:serial`, async (req, res) => {
  try {
    const { serial } = req.params;
    
    if (!serialGenerator.validateSerialFormat(serial)) {
      return res.status(400).json({
        success: false,
        error: 'Formato seriale non valido (deve essere 7 cifre numeriche)'
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
        { id: 'bar_type', title: 'bar_type' },
        { id: 'custom_icon_code', title: 'custom_icon_code' },
        { id: 'custom_date', title: 'custom_date' },
        { id: 'custom_text', title: 'custom_text' },
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
        { id: 'bar_type', title: 'bar_type' },
        { id: 'custom_icon_code', title: 'custom_icon_code' },
        { id: 'custom_date', title: 'custom_date' },
        { id: 'custom_text', title: 'custom_text' },
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

// Auto-backup periodico e retention
if (config.autoBackup) {
  const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // giornaliero
  const runBackup = async () => {
    try {
      const file = await csvManager.backupCSV();
      if (file) {
        logger.info('Backup eseguito', { type: 'AUTO_BACKUP_DONE', file });
      }
      // retention
      try {
        const fs = require('fs');
        const files = fs.readdirSync(config.backupPath)
          .filter(f => f.endsWith('.csv'))
          .map(f => ({ f, full: require('path').join(config.backupPath, f), stat: fs.statSync(require('path').join(config.backupPath, f)) }));
        const cutoff = Date.now() - (config.backupRetentionDays * 24 * 60 * 60 * 1000);
        files.forEach(({ full, stat }) => {
          if (stat.birthtimeMs < cutoff) {
            try { fs.unlinkSync(full); } catch (_) {}
          }
        });
      } catch (retErr) {
        logger.logError(retErr, { type: 'AUTO_BACKUP_RETENTION_ERROR' });
      }
    } catch (err) {
      logger.logError(err, { type: 'AUTO_BACKUP_ERROR' });
    }
  };
  // esegui all'avvio e poi schedula
  runBackup();
  setInterval(runBackup, BACKUP_INTERVAL_MS);
}

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
