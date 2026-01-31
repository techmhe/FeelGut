const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'feelgut.db');

let db = null;

async function initDatabase() {
    const SQL = await initSqlJs();
    
    // Load existing database or create new one
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
    } else {
        db = new SQL.Database();
    }
    
    // Create tables
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            language TEXT DEFAULT 'en',
            theme TEXT DEFAULT 'dark',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            symptom_id TEXT,
            description TEXT,
            date_time DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS symptoms (
            id TEXT PRIMARY KEY,
            name_en TEXT NOT NULL,
            name_de TEXT NOT NULL
        );
    `);
    
    // Insert default symptoms if not exists
    const symptomsData = [
        { id: 'stomach_pain', en: 'Stomach pain', de: 'Magenschmerzen' },
        { id: 'abdominal_cramps', en: 'Abdominal cramps', de: 'Bauchkrämpfe' },
        { id: 'diarrhea', en: 'Diarrhea', de: 'Durchfall' },
        { id: 'constipation', en: 'Constipation', de: 'Verstopfung' },
        { id: 'bloating', en: 'Bloating/Fullness', de: 'Blähungen/Völlegefühl' },
        { id: 'nausea', en: 'Nausea/Vomiting', de: 'Übelkeit/Erbrechen' },
        { id: 'heartburn', en: 'Heartburn/Acid reflux', de: 'Sodbrennen/Aufstoßen' },
        { id: 'weight_loss', en: 'Weight loss', de: 'Gewichtsverlust' },
        { id: 'fatigue', en: 'Fatigue/Weakness', de: 'Müdigkeit/Schwäche' },
        { id: 'skin_rash', en: 'Skin rash/Itching', de: 'Hautausschlag/Juckreiz' },
        { id: 'headache', en: 'Headache/Dizziness', de: 'Kopfschmerzen/Schwindel' },
        { id: 'palpitations', en: 'Palpitations/Circulation problems', de: 'Herzrasen/Kreislaufprobleme' },
        { id: 'other', en: 'Other', de: 'Sonstiges' }
    ];
    
    for (const symptom of symptomsData) {
        db.run('INSERT OR IGNORE INTO symptoms (id, name_en, name_de) VALUES (?, ?, ?)', 
            [symptom.id, symptom.en, symptom.de]);
    }
    
    saveDatabase();
    return db;
}

function saveDatabase() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(DB_PATH, buffer);
    }
}

function getDb() {
    return db;
}

// Helper functions that mirror better-sqlite3 API
function prepare(sql) {
    return {
        run: (...params) => {
            try {
                const stmt = db.prepare(sql);
                if (params.length > 0) {
                    stmt.bind(params);
                }
                stmt.step();
                stmt.free();
                
                // Get last insert rowid immediately after the insert
                const lastIdStmt = db.prepare('SELECT last_insert_rowid() as id');
                lastIdStmt.step();
                const lastId = lastIdStmt.getAsObject().id;
                lastIdStmt.free();
                
                saveDatabase();
                console.log('Run completed, lastInsertRowid:', lastId);
                return { lastInsertRowid: lastId };
            } catch (error) {
                console.error('Database run error:', error, 'SQL:', sql, 'Params:', params);
                throw error;
            }
        },
        get: (...params) => {
            try {
                const stmt = db.prepare(sql);
                if (params.length > 0) {
                    stmt.bind(params);
                }
                if (stmt.step()) {
                    const row = stmt.getAsObject();
                    stmt.free();
                    return row;
                }
                stmt.free();
                return undefined;
            } catch (error) {
                console.error('Database get error:', error, 'SQL:', sql, 'Params:', params);
                throw error;
            }
        },
        all: (...params) => {
            try {
                const results = [];
                const stmt = db.prepare(sql);
                if (params.length > 0) {
                    stmt.bind(params);
                }
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            } catch (error) {
                console.error('Database all error:', error, 'SQL:', sql, 'Params:', params);
                throw error;
            }
        }
    };
}

function getLastInsertRowId() {
    try {
        const stmt = db.prepare('SELECT last_insert_rowid() as id');
        stmt.step();
        const result = stmt.getAsObject();
        stmt.free();
        console.log('Last insert row id:', result.id);
        return result.id || 0;
    } catch (error) {
        console.error('Error getting last insert row id:', error);
        return 0;
    }
}

module.exports = {
    initDatabase,
    getDb,
    prepare,
    saveDatabase
};
