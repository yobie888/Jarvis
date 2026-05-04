const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("jodie.db");

// création tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT,
            score INTEGER DEFAULT 0,
            rank TEXT DEFAULT 'RECRUE'
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
