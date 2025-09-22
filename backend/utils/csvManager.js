const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const moment = require('moment');

class CSVManager {
  constructor(csvPath, backupPath) {
    this.csvPath = csvPath;
    this.backupPath = backupPath;
    this.delimiter = process.env.CSV_DELIMITER || ';';
    this.encoding = process.env.CSV_ENCODING || 'utf8';
    this.ensureDirectories();
  }

  ensureDirectories() {
    // Crea le directory se non esistono
    const dirs = [path.dirname(this.csvPath), this.backupPath];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  async backupCSV() {
    try {
      const timestamp = moment().format('YYYYMMDD_HHmmss');
      const backupFileName = `certificates_${timestamp}.csv`;
      const backupFilePath = path.join(this.backupPath, backupFileName);
      
      if (fs.existsSync(this.csvPath)) {
        fs.copyFileSync(this.csvPath, backupFilePath);
        console.log(`Backup creato: ${backupFilePath}`);
        return backupFilePath;
      }
    } catch (error) {
      console.error('Errore durante il backup:', error);
      throw error;
    }
  }

  async readAllCertificates() {
    return new Promise((resolve, reject) => {
      const certificates = [];
      
      if (!fs.existsSync(this.csvPath)) {
        resolve(certificates);
        return;
      }

      fs.createReadStream(this.csvPath, { encoding: this.encoding })
        .pipe(csv({ separator: this.delimiter }))
        .on('data', (row) => {
          certificates.push(row);
        })
        .on('end', () => {
          resolve(certificates);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async getLastSerial() {
    try {
      const certificates = await this.readAllCertificates();
      if (certificates.length === 0) {
        return null;
      }
      
      // Ordina per seriale e prendi l'ultimo
      const sortedCertificates = certificates.sort((a, b) => {
        return a.serial.localeCompare(b.serial);
      });
      
      return sortedCertificates[sortedCertificates.length - 1].serial;
    } catch (error) {
      console.error('Errore lettura ultimo seriale:', error);
      return null;
    }
  }

  async isSerialUnique(serial) {
    try {
      const certificates = await this.readAllCertificates();
      return !certificates.some(cert => cert.serial === serial);
    } catch (error) {
      console.error('Errore verifica unicità seriale:', error);
      return false;
    }
  }

  async writeCertificate(certificateData) {
    try {
      // Backup prima della scrittura
      await this.backupCSV();
      
      // Verifica unicità seriale
      const isUnique = await this.isSerialUnique(certificateData.serial);
      if (!isUnique) {
        throw new Error(`Seriale ${certificateData.serial} già esistente`);
      }

      // Leggi certificati esistenti
      const existingCertificates = await this.readAllCertificates();
      
      // Aggiungi nuovo certificato
      const allCertificates = [...existingCertificates, certificateData];
      
      // Scrivi CSV
      const csvWriter = createCsvWriter({
        path: this.csvPath,
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
        fieldDelimiter: this.delimiter
      });

      await csvWriter.writeRecords(allCertificates);
      console.log(`Certificato ${certificateData.serial} salvato con successo`);
      
      return true;
    } catch (error) {
      console.error('Errore scrittura certificato:', error);
      throw error;
    }
  }

  async findCertificateBySerial(serial) {
    try {
      const certificates = await this.readAllCertificates();
      return certificates.find(cert => cert.serial === serial) || null;
    } catch (error) {
      console.error('Errore ricerca certificato:', error);
      return null;
    }
  }
}

module.exports = CSVManager;
