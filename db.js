const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./data.db");

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            score INTEGER,
            rank TEXT
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            question TEXT,
            answer TEXT
        )
    `);
});

module.exports = db;
