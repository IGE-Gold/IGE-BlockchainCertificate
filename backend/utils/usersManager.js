const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

class UsersManager {
  constructor(usersCsvPath, delimiter = ';', encoding = 'utf8') {
    this.usersCsvPath = usersCsvPath;
    this.delimiter = delimiter;
    this.encoding = encoding;
    this.ensureDirectory();
  }

  ensureDirectory() {
    const dir = path.dirname(this.usersCsvPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.usersCsvPath)) {
      fs.writeFileSync(this.usersCsvPath, 'id;username;password\n', { encoding: this.encoding });
    }
  }

  async readAllUsers() {
    return new Promise((resolve, reject) => {
      const users = [];
      if (!fs.existsSync(this.usersCsvPath)) {
        return resolve(users);
      }

      fs.createReadStream(this.usersCsvPath, { encoding: this.encoding })
        .pipe(csv({ separator: this.delimiter }))
        .on('data', (row) => users.push(row))
        .on('end', () => resolve(users))
        .on('error', (err) => reject(err));
    });
  }

  async validateCredentials(username, password) {
    if (!username || !password || password.length < 6) {
      return null;
    }
    const users = await this.readAllUsers();
    const user = users.find(u => String(u.username) === String(username) && String(u.password) === String(password));
    if (!user) return null;
    return { id: user.id, username: user.username };
  }

  async getAllUsers() {
    return await this.readAllUsers();
  }

  async addUser(username, password) {
    try {
      const users = await this.readAllUsers();
      
      // Verifica se l'username esiste già
      if (users.find(u => String(u.username) === String(username))) {
        return { success: false, error: 'Username già esistente' };
      }
      
      // Genera nuovo ID
      const maxId = users.reduce((max, user) => {
        if (!user.id || !user.id.startsWith('User_')) return max;
        const idNum = parseInt(user.id.replace('User_', ''));
        return idNum > max ? idNum : max;
      }, 0);
      const newId = `User_${String(maxId + 1).padStart(3, '0')}`;
      
      // Aggiungi nuovo utente
      const newUser = { id: newId, username, password };
      users.push(newUser);
      
      // Scrivi nel file CSV
      await this.writeUsersToCsv(users);
      
      return { success: true, user: { id: newId, username } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updateUser(id, updates) {
    try {
      const users = await this.readAllUsers();
      const userIndex = users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        return { success: false, error: 'Utente non trovato' };
      }
      
      // Verifica se il nuovo username esiste già (se fornito)
      if (updates.username) {
        const existingUser = users.find(u => u.id !== id && String(u.username) === String(updates.username));
        if (existingUser) {
          return { success: false, error: 'Username già esistente' };
        }
      }
      
      // Aggiorna l'utente
      if (updates.username) users[userIndex].username = updates.username;
      if (updates.password) users[userIndex].password = updates.password;
      
      // Scrivi nel file CSV
      await this.writeUsersToCsv(users);
      
      return { success: true, user: { id, username: users[userIndex].username } };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deleteUser(id) {
    try {
      const users = await this.readAllUsers();
      const userIndex = users.findIndex(u => u.id === id);
      
      if (userIndex === -1) {
        return { success: false, error: 'Utente non trovato' };
      }
      
      // Rimuovi l'utente
      users.splice(userIndex, 1);
      
      // Scrivi nel file CSV
      await this.writeUsersToCsv(users);
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async writeUsersToCsv(users) {
    return new Promise((resolve, reject) => {
      const csvContent = 'id;username;password\n' + 
        users.map(user => `${user.id};${user.username};${user.password}`).join('\n');
      
      fs.writeFile(this.usersCsvPath, csvContent, { encoding: this.encoding }, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

module.exports = UsersManager;


