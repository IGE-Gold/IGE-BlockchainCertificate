const moment = require('moment');

class SerialGenerator {
  constructor() {
    this.serialLength = parseInt(process.env.SERIAL_LENGTH) || 13;
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
    
    // Deve essere esattamente N cifre numeriche (configurabile)
    const serialRegex = new RegExp(`^\\d{${this.serialLength}}$`);
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

    return {
      year: parseInt(serial.substring(0, 4)),
      month: parseInt(serial.substring(4, 6)),
      week: parseInt(serial.substring(6, 8)),
      progressive: parseInt(serial.substring(8, 13))
    };
  }

  /**
   * Genera il prossimo seriale basato sull'ultimo seriale esistente
   * @param {string} lastSerial - L'ultimo seriale generato
   * @returns {string} - Il nuovo seriale
   */
  generateNextSerial(lastSerial) {
    const now = moment();
    const currentYear = now.year();
    const currentMonth = now.month() + 1; // moment usa 0-11, noi usiamo 1-12
    const currentWeek = now.isoWeek();

    // Se non c'è un ultimo seriale, inizia con 00001
    if (!lastSerial) {
      return this.formatSerial(currentYear, currentMonth, currentWeek, 1);
    }

    const lastSerialData = this.parseSerial(lastSerial);
    if (!lastSerialData) {
      throw new Error('Formato ultimo seriale non valido');
    }

    // Se siamo nella stessa settimana, incrementa il progressivo
    if (lastSerialData.year === currentYear && 
        lastSerialData.month === currentMonth && 
        lastSerialData.week === currentWeek) {
      
      const nextProgressive = lastSerialData.progressive + 1;
      
      // Controlla che non superi il limite configurabile
      if (nextProgressive > this.maxProgressive) {
        throw new Error(`Limite progressivo settimanale raggiunto (${this.maxProgressive})`);
      }
      
      return this.formatSerial(currentYear, currentMonth, currentWeek, nextProgressive);
    } else {
      // Nuova settimana, reset progressivo a 1
      return this.formatSerial(currentYear, currentMonth, currentWeek, 1);
    }
  }

  /**
   * Formatta i componenti in un seriale completo
   * @param {number} year - Anno (4 cifre)
   * @param {number} month - Mese (1-12)
   * @param {number} week - Settimana ISO (1-53)
   * @param {number} progressive - Progressivo (1-99999)
   * @returns {string} - Seriale formattato
   */
  formatSerial(year, month, week, progressive) {
    const yearStr = year.toString().padStart(4, '0');
    const monthStr = month.toString().padStart(2, '0');
    const weekStr = week.toString().padStart(2, '0');
    const progressiveStr = progressive.toString().padStart(5, '0');
    
    return `${yearStr}${monthStr}${weekStr}${progressiveStr}`;
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
    const month = momentDate.month() + 1;
    const week = momentDate.isoWeek();
    
    return this.formatSerial(year, month, week, progressive);
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
    const month = momentDate.month() + 1;
    const week = momentDate.isoWeek();

    return serialData.year === year && 
           serialData.month === month && 
           serialData.week === week;
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

    const date = moment().year(data.year).month(data.month - 1).isoWeek(data.week);
    
    return {
      serial,
      year: data.year,
      month: data.month,
      week: data.week,
      progressive: data.progressive,
      productionDate: date.format('YYYY-MM-DD'),
      weekStart: date.startOf('isoWeek').format('YYYY-MM-DD'),
      weekEnd: date.endOf('isoWeek').format('YYYY-MM-DD'),
      isValid: this.validateSerialFormat(serial)
    };
  }
}

module.exports = SerialGenerator;
