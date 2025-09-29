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
}

module.exports = UsersManager;


