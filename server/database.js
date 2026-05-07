const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'feelgut.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            language      TEXT DEFAULT 'de',
            theme         TEXT DEFAULT 'dark',
            created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS entries (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL,
            type        TEXT NOT NULL,
            meal_time   TEXT,
            symptom_id  TEXT,
            severity    TEXT,
            description TEXT,
            date_time   DATETIME NOT NULL,
            created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS entry_symptoms (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id   INTEGER NOT NULL,
            symptom_id TEXT NOT NULL,
            severity   TEXT,
            FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        );
    `);

    // Migration: severity column für bestehende DBs
    try { db.run('ALTER TABLE entries ADD COLUMN severity TEXT'); } catch (_) {}

    db.run(`
        CREATE TABLE IF NOT EXISTS meal_items (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id  INTEGER NOT NULL,
            item_type TEXT NOT NULL,
            name      TEXT NOT NULL,
            FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS item_ingredients (
            id      INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            name    TEXT NOT NULL,
            FOREIGN KEY (item_id) REFERENCES meal_items(id) ON DELETE CASCADE
        );
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS symptoms (
            id      TEXT PRIMARY KEY,
            name_en TEXT NOT NULL,
            name_de TEXT NOT NULL
        );
    `);

    const symptomsData = [
        { id: 'stomach_pain',          en: 'Stomach pain',                        de: 'Magenschmerzen' },
        { id: 'abdominal_cramps',      en: 'Abdominal cramps',                    de: 'Bauchkrämpfe' },
        { id: 'diarrhea',              en: 'Diarrhea',                            de: 'Durchfall' },
        { id: 'constipation',          en: 'Constipation',                        de: 'Verstopfung' },
        { id: 'bloating',              en: 'Bloating',                            de: 'Blähungen' },
        { id: 'fullness',              en: 'Fullness',                            de: 'Völlegefühl' },
        { id: 'distended_bowel',       en: 'Distended bowel',                     de: 'Aufgeblähter Darm' },
        { id: 'crohn_pain',            en: 'Pain at Crohn\'s site',               de: 'Schmerzen an Crohn-Stelle' },
        { id: 'crohn_pressure_pain',   en: 'Pain when pressing Crohn\'s site',    de: 'Schmerzen bei Druck auf Crohn-Stelle' },
        { id: 'nausea',                en: 'Nausea/Vomiting',                     de: 'Übelkeit/Erbrechen' },
        { id: 'heartburn',             en: 'Heartburn/Acid reflux',               de: 'Sodbrennen/Aufstoßen' },
        { id: 'weight_loss',           en: 'Weight loss',                         de: 'Gewichtsverlust' },
        { id: 'fatigue',               en: 'Fatigue/Weakness',                    de: 'Müdigkeit/Schwäche' },
        { id: 'skin_rash',             en: 'Skin rash/Itching',                   de: 'Hautausschlag/Juckreiz' },
        { id: 'headache',              en: 'Headache/Dizziness',                  de: 'Kopfschmerzen/Schwindel' },
        { id: 'palpitations',          en: 'Palpitations/Circulation',            de: 'Herzrasen/Kreislaufprobleme' },
        { id: 'other',                 en: 'Other',                               de: 'Sonstiges' },
    ];

    for (const s of symptomsData) {
        db.run('INSERT OR REPLACE INTO symptoms (id, name_en, name_de) VALUES (?, ?, ?)', [s.id, s.en, s.de]);
    }

    saveDatabase();
    return db;
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data), { mode: 0o600 });
    }
}

function getDb() {
    return db;
}

function prepare(sql) {
    return {
        run: (...params) => {
            try {
                const stmt = db.prepare(sql);
                if (params.length > 0) stmt.bind(params);
                stmt.step();
                stmt.free();
                const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
                lastIdStmt.step();
                const lastId = lastIdStmt.getAsObject().id;
                lastIdStmt.free();
                saveDatabase();
                return { lastInsertRowid: lastId };
            } catch (error) {
                console.error('DB run error:', error, 'SQL:', sql);
                throw error;
            }
        },
        get: (...params) => {
            try {
                const stmt = db.prepare(sql);
                if (params.length > 0) stmt.bind(params);
                if (stmt.step()) {
                    const row = stmt.getAsObject();
                    stmt.free();
                    return row;
                }
                stmt.free();
                return undefined;
            } catch (error) {
                console.error('DB get error:', error, 'SQL:', sql);
                throw error;
            }
        },
        all: (...params) => {
            try {
                const results = [];
                const stmt = db.prepare(sql);
                if (params.length > 0) stmt.bind(params);
                while (stmt.step()) results.push(stmt.getAsObject());
                stmt.free();
                return results;
            } catch (error) {
                console.error('DB all error:', error, 'SQL:', sql);
                throw error;
            }
        },
    };
}

module.exports = { initDatabase, getDb, prepare, saveDatabase };
