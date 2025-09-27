const moment = require('moment');

class SerialGenerator {
  constructor() {
    this.serialLength = 7; // YYNNNNN format: 2 digits year + 5 digits progressive
    this.maxProgressive = parseInt(process.env.MAX_PROGRESSIVE) || 99999;
  }

  /**
   * Valida il formato del seriale
   * @param {string} serial - Il seriale da validare
   * @returns {boolean} - True se valido
   */
  validateSerialFormat(serial) {
    if (!serial || typeof serial !== 'string') {
      return false;
    }
    
    // Deve essere esattamente 7 cifre numeriche (YYNNNNN)
    const serialRegex = /^\d{7}$/;
    return serialRegex.test(serial);
  }

  /**
   * Estrae i componenti da un seriale esistente
   * @param {string} serial - Il seriale da analizzare
   * @returns {object|null} - Oggetto con i componenti o null se invalido
   */
  parseSerial(serial) {
    if (!this.validateSerialFormat(serial)) {
      return null;
    }

    const year = parseInt(serial.substring(0, 2));
    const progressive = parseInt(serial.substring(2, 7));

    return {
      year: year,
      fullYear: 2000 + year, // Convert to full year
      progressive: progressive
    };
  }

  /**
   * Genera il prossimo seriale basato sui seriali esistenti per l'anno corrente
   * @param {Array} existingSerials - Array di seriali esistenti per l'anno
   * @returns {string} - Il nuovo seriale
   */
  generateNextSerial(existingSerials = []) {
    const now = moment();
    const currentYear = now.year();
    const currentYearShort = currentYear % 100; // Ultime due cifre dell'anno

    // Filtra i seriali validi per l'anno corrente
    const currentYearSerials = existingSerials.filter(serial => {
      const serialData = this.parseSerial(serial);
      return serialData && serialData.fullYear === currentYear;
    });

    // Se non ci sono seriali per l'anno corrente, inizia con 00001
    if (currentYearSerials.length === 0) {
      return this.formatSerial(currentYearShort, 1);
    }

    // Ordina i seriali per progressivo crescente
    const sortedSerials = currentYearSerials
      .map(serial => this.parseSerial(serial))
      .filter(data => data !== null)
      .sort((a, b) => a.progressive - b.progressive);

    // Trova il prossimo progressivo disponibile
    let nextProgressive = 1;
    for (const serialData of sortedSerials) {
      if (serialData.progressive === nextProgressive) {
        nextProgressive++;
      } else {
        break;
      }
    }

    // Controlla che non superi il limite configurabile
    if (nextProgressive > this.maxProgressive) {
      throw new Error(`Limite progressivo annuale raggiunto (${this.maxProgressive})`);
    }

    return this.formatSerial(currentYearShort, nextProgressive);
  }

  /**
   * Formatta i componenti in un seriale completo
   * @param {number} year - Anno (2 cifre, ultime due cifre dell'anno)
   * @param {number} progressive - Progressivo (1-99999)
   * @returns {string} - Seriale formattato YYNNNNN
   */
  formatSerial(year, progressive) {
    const yearStr = year.toString().padStart(2, '0');
    const progressiveStr = progressive.toString().padStart(5, '0');
    
    return `${yearStr}${progressiveStr}`;
  }

  /**
   * Genera un seriale per una data specifica
   * @param {string|Date} date - Data per cui generare il seriale
   * @param {number} progressive - Progressivo (default: 1)
   * @returns {string} - Seriale generato
   */
  generateSerialForDate(date, progressive = 1) {
    const momentDate = moment(date);
    const year = momentDate.year();
    const yearShort = year % 100;
    
    return this.formatSerial(yearShort, progressive);
  }

  /**
   * Verifica se un seriale è valido per una data specifica
   * @param {string} serial - Seriale da verificare
   * @param {string|Date} date - Data di riferimento
   * @returns {boolean} - True se il seriale è valido per la data
   */
  isValidForDate(serial, date) {
    const serialData = this.parseSerial(serial);
    if (!serialData) {
      return false;
    }

    const momentDate = moment(date);
    const year = momentDate.year();
    const yearShort = year % 100;

    return serialData.year === yearShort;
  }

  /**
   * Ottiene informazioni dettagliate su un seriale
   * @param {string} serial - Il seriale da analizzare
   * @returns {object|null} - Informazioni dettagliate o null se invalido
   */
  getSerialInfo(serial) {
    const data = this.parseSerial(serial);
    if (!data) {
      return null;
    }

    const fullYear = data.fullYear;
    const currentYear = moment().year();
    
    return {
      serial,
      year: data.year,
      fullYear: data.fullYear,
      progressive: data.progressive,
      isCurrentYear: fullYear === currentYear,
      isValid: this.validateSerialFormat(serial),
      format: 'YYNNNNN'
    };
  }
}

module.exports = SerialGenerator;
