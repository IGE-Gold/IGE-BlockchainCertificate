const winston = require('winston');
const path = require('path');
const fs = require('fs');

class Logger {
  constructor(logPath) {
    this.logPath = logPath;
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logMaxSize = parseInt(process.env.LOG_MAX_SIZE) || 5242880; // 5MB
    this.logMaxFiles = parseInt(process.env.LOG_MAX_FILES) || 5;
    this.ensureLogDirectory();
    this.setupLogger();
  }

  ensureLogDirectory() {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  setupLogger() {
    // Formato personalizzato per i log
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );

    // Formato per console
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      })
    );

    this.logger = winston.createLogger({
      level: this.logLevel,
      format: logFormat,
      defaultMeta: { service: 'blockchain-certificate' },
      transports: [
        // File per tutti i log
        new winston.transports.File({
          filename: path.join(this.logPath, 'app.log'),
          maxsize: this.logMaxSize,
          maxFiles: this.logMaxFiles
        }),
        // File per errori
        new winston.transports.File({
          filename: path.join(this.logPath, 'error.log'),
          level: 'error',
          maxsize: this.logMaxSize,
          maxFiles: this.logMaxFiles
        }),
        // File per transazioni blockchain
        new winston.transports.File({
          filename: path.join(this.logPath, 'blockchain.log'),
          level: 'info',
          maxsize: this.logMaxSize,
          maxFiles: this.logMaxFiles * 2
        })
      ]
    });

    // Aggiungi console transport solo in sviluppo
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: consoleFormat
      }));
    }
  }

  // Metodi di logging
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Metodi specifici per il sistema
  logCertificateCreation(certificateData, blockchainResult) {
    this.logger.info('Certificato creato', {
      type: 'CERTIFICATE_CREATED',
      serial: certificateData.serial,
      company: certificateData.company,
      blockchainHash: blockchainResult.transactionHash,
      explorerLink: blockchainResult.explorerLink,
      timestamp: new Date().toISOString()
    });
  }

  logCertificateVerification(serial, found, certificateData = null) {
    this.logger.info('Certificato verificato', {
      type: 'CERTIFICATE_VERIFIED',
      serial: serial,
      found: found,
      certificateData: certificateData,
      timestamp: new Date().toISOString()
    });
  }

  logBlockchainTransaction(transactionData) {
    this.logger.info('Transazione blockchain', {
      type: 'BLOCKCHAIN_TRANSACTION',
      ...transactionData,
      timestamp: new Date().toISOString()
    });
  }

  logError(error, context = {}) {
    this.logger.error('Errore sistema', {
      type: 'SYSTEM_ERROR',
      error: error.message,
      stack: error.stack,
      context: context,
      timestamp: new Date().toISOString()
    });
  }

  logBackupOperation(operation, filePath) {
    this.logger.info('Operazione backup', {
      type: 'BACKUP_OPERATION',
      operation: operation,
      filePath: filePath,
      timestamp: new Date().toISOString()
    });
  }

  logSerialGeneration(serial, lastSerial, context = {}) {
    this.logger.info('Seriale generato', {
      type: 'SERIAL_GENERATED',
      newSerial: serial,
      lastSerial: lastSerial,
      context: context,
      timestamp: new Date().toISOString()
    });
  }

  // Metodo per ottenere log recenti
  getRecentLogs(level = 'info', limit = 100) {
    return new Promise((resolve, reject) => {
      const logFile = level === 'error' ? 'error.log' : 'app.log';
      const filePath = path.join(this.logPath, logFile);
      
      if (!fs.existsSync(filePath)) {
        resolve([]);
        return;
      }

      const logs = [];
      const readStream = fs.createReadStream(filePath);
      let buffer = '';

      readStream.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Mantieni l'ultima linea incompleta

        lines.forEach(line => {
          if (line.trim()) {
            try {
              const logEntry = JSON.parse(line);
              logs.push(logEntry);
            } catch (e) {
              // Ignora linee non JSON valide
            }
          }
        });
      });

      readStream.on('end', () => {
        // Ordina per timestamp e prendi gli ultimi N
        const sortedLogs = logs
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, limit);
        
        resolve(sortedLogs);
      });

      readStream.on('error', reject);
    });
  }
}

module.exports = Logger;
