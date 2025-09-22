const { ethers } = require('ethers');

class BlockchainManager {
  constructor(rpcUrl, privateKey, chainId, explorerBaseUrl) {
    this.rpcUrl = rpcUrl;
    this.privateKey = privateKey;
    this.chainId = chainId;
    this.explorerBaseUrl = explorerBaseUrl;
    this.gasLimitMultiplier = parseFloat(process.env.GAS_LIMIT_MULTIPLIER) || 1.2;
    this.maxGasPrice = parseInt(process.env.MAX_GAS_PRICE) || 50000000000;
    
    // Inizializza provider e wallet
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Verifica la connessione alla blockchain
   * @returns {Promise<object>} - Informazioni sulla connessione
   */
  async checkConnection() {
    try {
      const network = await this.provider.getNetwork();
      const balance = await this.provider.getBalance(await this.wallet.getAddress());
      const address = await this.wallet.getAddress();
      
      return {
        connected: true,
        network: {
          name: network.name,
          chainId: Number(network.chainId)
        },
        wallet: {
          address: address,
          balance: ethers.formatEther(balance)
        }
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Stima il gas necessario per la transazione
   * @param {string} data - Dati da scrivere sulla blockchain
   * @returns {Promise<object>} - Stima del gas
   */
  async estimateGas(data) {
    try {
      // Converti i dati JSON in formato esadecimale
      const hexData = ethers.toUtf8Bytes(data);
      
      const gasEstimate = await this.provider.estimateGas({
        to: await this.wallet.getAddress(),
        data: hexData
      });
      
      // Per ethers v6, getGasPrice() è deprecato, usa getFeeData()
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || feeData.maxFeePerGas || BigInt(20000000000); // 20 gwei default
      
      const adjustedGasLimit = Math.ceil(Number(gasEstimate) * this.gasLimitMultiplier);
      const cappedGasPrice = gasPrice > this.maxGasPrice ? this.maxGasPrice : gasPrice;
      
      return {
        gasLimit: adjustedGasLimit,
        gasPrice: cappedGasPrice
      };
    } catch (error) {
      throw new Error(`Errore stima gas: ${error.message}`);
    }
  }

  /**
   * Scrive i dati del certificato sulla blockchain
   * @param {object} certificateData - Dati del certificato
   * @returns {Promise<object>} - Risultato della transazione
   */
  async writeCertificate(certificateData) {
    try {
      // Prepara i dati per la blockchain
      const blockchainData = this.prepareBlockchainData(certificateData);
      
      // Stima il gas
      const gasEstimate = await this.estimateGas(blockchainData);
      
      // Converti i dati JSON in formato esadecimale
      const hexData = ethers.toUtf8Bytes(blockchainData);
      
      // Crea la transazione
      const transaction = {
        to: await this.wallet.getAddress(),
        data: hexData,
        gasLimit: gasEstimate.gasLimit,
        gasPrice: gasEstimate.gasPrice
      };

      // Invia la transazione
      const txResponse = await this.wallet.sendTransaction(transaction);
      
      // Attendi la conferma
      const receipt = await txResponse.wait();
      
      // Genera il link all'explorer (PolygonScan non supporta parametri diretti per UTF-8)
      const explorerLink = `${this.explorerBaseUrl}${receipt.hash}`;
      
      return {
        success: true,
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerLink: explorerLink,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Errore scrittura blockchain:', error);
      throw new Error(`Errore scrittura blockchain: ${error.message}`);
    }
  }

  /**
   * Prepara i dati per la scrittura sulla blockchain
   * @param {object} certificateData - Dati del certificato
   * @returns {string} - Dati formattati per la blockchain
   */
  prepareBlockchainData(certificateData) {
    // Dati JSON organizzati logicamente
    const jsonData = {
      // Metadati certificato
      type: 'GOLD_CERTIFICATE',
      version: '1.0',
      serial: certificateData.serial,
      created_on: new Date().toLocaleDateString('en-US'),
      timestamp: new Date().toISOString(),
      
      // Informazioni azienda
      company: {
        name: certificateData.company,
        tax_code: certificateData.tax_code,
        social_capital: certificateData.social_capital,
        authorization: certificateData.authorization
      },
      
      // Informazioni prodotto
      product: {
        metal: certificateData.metal,
        fineness: certificateData.fineness,
        weight: certificateData.weight,
        production_date: certificateData.production_date,
        location: {
          city: certificateData.city,
          country: certificateData.country
        }
      },
      
      // Disclaimer
      disclaimer: "This certificate is authenticated and recorded on the Polygon blockchain. The authenticity can be verified through the blockchain transaction hash."
    };
    
    return JSON.stringify(jsonData, null, 2);
  }

  /**
   * Verifica una transazione sulla blockchain
   * @param {string} transactionHash - Hash della transazione
   * @returns {Promise<object>} - Dettagli della transazione
   */
  async verifyTransaction(transactionHash) {
    try {
      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      
      if (!receipt) {
        throw new Error('Transazione non trovata');
      }
      
      return {
        found: true,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        explorerLink: `${this.explorerBaseUrl}${transactionHash}`
      };
    } catch (error) {
      return {
        found: false,
        error: error.message
      };
    }
  }

  /**
   * Legge i dati del certificato dalla blockchain in formato leggibile
   * @param {string} transactionHash - Hash della transazione
   * @returns {Promise<object>} - Dati del certificato formattati
   */
  async readCertificateData(transactionHash) {
    try {
      const transaction = await this.provider.getTransaction(transactionHash);
      
      if (!transaction) {
        throw new Error('Transazione non trovata');
      }
      
      // Converte i dati esadecimali in stringa UTF-8
      const dataString = ethers.toUtf8String(transaction.data);
      
      // Prova a parsare come JSON
      let certificateData;
      try {
        certificateData = JSON.parse(dataString);
      } catch (parseError) {
        // Se non è JSON valido, restituisci i dati raw
        return {
          success: true,
          rawData: dataString,
          isReadable: false,
          message: 'Dati non in formato JSON standard'
        };
      }
      
      // Crea un messaggio leggibile dal JSON
      const certificateMessage = this.formatCertificateMessage(certificateData);
      
      return {
        success: true,
        transactionHash: transactionHash,
        blockNumber: transaction.blockNumber,
        certificateData: certificateData,
        certificateMessage: certificateMessage,
        isReadable: true,
        explorerLink: `${this.explorerBaseUrl}${transactionHash}`
      };
      
    } catch (error) {
      throw new Error(`Errore lettura dati certificato: ${error.message}`);
    }
  }

  /**
   * Formatta i dati del certificato in un messaggio leggibile
   * @param {object} certificateData - Dati del certificato
   * @returns {string} - Messaggio formattato
   */
  formatCertificateMessage(certificateData) {
    // Gestisce sia il vecchio formato che il nuovo
    if (certificateData.certificate_message) {
      return certificateData.certificate_message;
    }
    
    // Nuovo formato strutturato
    let message = `GOLD CERTIFICATE - Blockchain Authenticated\n\n`;
    message += `CERTIFICATE INFORMATION:\n`;
    message += `Serial Number: ${certificateData.serial}\n`;
    message += `Created on: ${certificateData.created_on}\n\n`;
    
    if (certificateData.company) {
      message += `COMPANY INFORMATION:\n`;
      message += `Company: ${certificateData.company.name}\n`;
      message += `Tax Code: ${certificateData.company.tax_code}\n`;
      message += `Social Capital: ${certificateData.company.social_capital}\n`;
      message += `Authorization: ${certificateData.company.authorization}\n\n`;
    }
    
    if (certificateData.product) {
      message += `PRODUCT SPECIFICATIONS:\n`;
      message += `Metal Type: ${certificateData.product.metal}\n`;
      message += `Fineness: ${certificateData.product.fineness}\n`;
      message += `Weight: ${certificateData.product.weight} grams\n`;
      message += `Production Date: ${certificateData.product.production_date}\n`;
      if (certificateData.product.location) {
        message += `Location: ${certificateData.product.location.city}, ${certificateData.product.location.country}\n`;
      }
      message += `\n`;
    }
    
    if (certificateData.disclaimer) {
      message += `DISCLAIMER:\n${certificateData.disclaimer}`;
    }
    
    return message;
  }

  /**
   * Ottiene il saldo del wallet
   * @returns {Promise<string>} - Saldo in MATIC
   */
  async getBalance() {
    try {
      const address = await this.wallet.getAddress();
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      throw new Error(`Errore lettura saldo: ${error.message}`);
    }
  }

  /**
   * Ottiene informazioni sul network
   * @returns {Promise<object>} - Informazioni sul network
   */
  async getNetworkInfo() {
    try {
      const network = await this.provider.getNetwork();
      const blockNumber = await this.provider.getBlockNumber();
      
      return {
        name: network.name,
        chainId: Number(network.chainId),
        blockNumber: blockNumber,
        isCorrectNetwork: Number(network.chainId) === this.chainId
      };
    } catch (error) {
      throw new Error(`Errore lettura network: ${error.message}`);
    }
  }
}

module.exports = BlockchainManager;
