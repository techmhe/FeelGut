const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const { initDatabase, prepare, saveDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'feelgut-secret-key-change-in-production';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'feelgut-secret-key-change-in-production') {
    console.error('FATAL: JWT_SECRET env var must be set in production');
    process.exit(1);
}

// In-memory token blacklist (logout invalidation)
const tokenBlacklist = new Set();

// Security headers
app.use(helmet({
    contentSecurityPolicy: false, // handled by Vite build / CDN setup
}));

// CORS
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:5173';
app.use(cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
}));

app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
});

// Auth middleware
function authenticateToken(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (tokenBlacklist.has(token)) {
        return res.status(401).json({ error: 'Token has been invalidated' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        req.token = token;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// ============================================
// AUTH ROUTES
// ============================================

// Register
app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Invalid input' });
        }

        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({ error: 'Username must be 3–50 characters' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Check if user exists
        const existingUser = prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
        const userId = result.lastInsertRowid;

        const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ success: true, user: { id: userId, username } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Invalid input' });
        }

        const user = prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                language: user.language,
                theme: user.theme,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout — invalidates token immediately
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    tokenBlacklist.add(req.token);
    res.clearCookie('token');
    res.json({ success: true });
});

// Delete account
app.delete('/api/auth/delete-account', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;

        prepare('DELETE FROM entries WHERE user_id = ?').run(userId);
        prepare('DELETE FROM users WHERE id = ?').run(userId);

        tokenBlacklist.add(req.token);
        res.clearCookie('token');

        res.json({ success: true });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
    const user = prepare('SELECT id, username, language, theme FROM users WHERE id = ?').get(req.user.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
});

// ============================================
// USER SETTINGS ROUTES
// ============================================

const ALLOWED_LANGUAGES = ['de', 'en'];
const ALLOWED_THEMES = ['dark', 'light'];

app.put('/api/user/settings', authenticateToken, (req, res) => {
    try {
        const { language, theme } = req.body;

        if (language !== undefined) {
            if (!ALLOWED_LANGUAGES.includes(language)) {
                return res.status(400).json({ error: 'Invalid language' });
            }
            prepare('UPDATE users SET language = ? WHERE id = ?').run(language, req.user.userId);
        }
        if (theme !== undefined) {
            if (!ALLOWED_THEMES.includes(theme)) {
                return res.status(400).json({ error: 'Invalid theme' });
            }
            prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, req.user.userId);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Change password
app.put('/api/auth/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password are required' });
        }

        if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
            return res.status(400).json({ error: 'Invalid input' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'New password must be at least 8 characters' });
        }

        const user = prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newPasswordHash, req.user.userId);

        res.json({ success: true });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// ENTRIES ROUTES
// ============================================

const ALLOWED_ENTRY_TYPES = ['meal', 'symptom'];
const ALLOWED_MEAL_TIMES = ['morning', 'noon', 'evening', 'snack', null, undefined];
const ALLOWED_SEVERITIES = ['mild', 'moderate', 'severe', null, undefined];

app.get('/api/entries', authenticateToken, (req, res) => {
    try {
        const entries = prepare(`
            SELECT id, type, meal_time as mealTime, symptom_id as symptomId,
                   severity, description, date_time as dateTime
            FROM entries
            WHERE user_id = ?
            ORDER BY date_time DESC
        `).all(req.user.userId);

        for (const entry of entries) {
            if (entry.type === 'meal') {
                const items = prepare(`
                    SELECT id, item_type as itemType, name
                    FROM meal_items WHERE entry_id = ?
                `).all(entry.id);

                for (const item of items) {
                    item.ingredients = prepare(`
                        SELECT id, name FROM item_ingredients WHERE item_id = ?
                    `).all(item.id);
                }

                entry.items = items;
            } else if (entry.type === 'symptom') {
                entry.symptoms = prepare(`
                    SELECT id, symptom_id as symptomId, severity
                    FROM entry_symptoms WHERE entry_id = ?
                `).all(entry.id);
            }
        }

        res.json({ entries });
    } catch (error) {
        console.error('Get entries error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/entries', authenticateToken, (req, res) => {
    try {
        const { type, mealTime, symptomId, severity, description, dateTime, items } = req.body;

        if (!type || !dateTime) {
            return res.status(400).json({ error: 'Type and dateTime are required' });
        }

        if (!ALLOWED_ENTRY_TYPES.includes(type)) {
            return res.status(400).json({ error: 'Invalid entry type' });
        }

        if (description && (typeof description !== 'string' || description.length > 1000)) {
            return res.status(400).json({ error: 'Description must be at most 1000 characters' });
        }

        if (type === 'meal' && (!items || items.length === 0)) {
            return res.status(400).json({ error: 'A meal entry needs at least one item' });
        }
        if (type === 'symptom' && (!req.body.symptoms || req.body.symptoms.length === 0)) {
            return res.status(400).json({ error: 'A symptom entry needs at least one symptom' });
        }

        // Validate meal items
        if (type === 'meal' && items) {
            for (const item of items) {
                if (!item.name || typeof item.name !== 'string' || item.name.length > 200) {
                    return res.status(400).json({ error: 'Item name must be at most 200 characters' });
                }
                if (item.ingredients) {
                    for (const ing of item.ingredients) {
                        if (typeof ing !== 'string' || ing.length > 200) {
                            return res.status(400).json({ error: 'Ingredient name must be at most 200 characters' });
                        }
                    }
                }
            }
        }

        const result = prepare(`
            INSERT INTO entries (user_id, type, meal_time, symptom_id, severity, description, date_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(req.user.userId, type, mealTime || null, symptomId || null, severity || null, description || null, dateTime);

        const entryId = result.lastInsertRowid;

        if (type === 'meal' && items) {
            for (const item of items) {
                const itemResult = prepare(`
                    INSERT INTO meal_items (entry_id, item_type, name) VALUES (?, ?, ?)
                `).run(entryId, item.itemType, item.name);

                const itemId = itemResult.lastInsertRowid;

                if (item.ingredients && item.ingredients.length > 0) {
                    for (const ing of item.ingredients) {
                        prepare(`
                            INSERT INTO item_ingredients (item_id, name) VALUES (?, ?)
                        `).run(itemId, ing);
                    }
                }
            }
        }

        if (type === 'symptom' && req.body.symptoms) {
            for (const s of req.body.symptoms) {
                prepare(`
                    INSERT INTO entry_symptoms (entry_id, symptom_id, severity) VALUES (?, ?, ?)
                `).run(entryId, s.symptomId, s.severity || null);
            }
        }

        res.json({ success: true, entryId });
    } catch (error) {
        console.error('Add entry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.delete('/api/entries/:id', authenticateToken, (req, res) => {
    try {
        const entryId = parseInt(req.params.id);
        if (isNaN(entryId)) return res.status(400).json({ error: 'Invalid entry id' });

        const entry = prepare('SELECT id FROM entries WHERE id = ? AND user_id = ?').get(entryId, req.user.userId);
        if (!entry) return res.status(404).json({ error: 'Entry not found' });

        prepare('DELETE FROM entries WHERE id = ?').run(entryId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete entry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

app.get('/api/entries/recent-items', authenticateToken, (req, res) => {
    try {
        const items = prepare(`
            SELECT mi.id, mi.name, mi.item_type as itemType
            FROM meal_items mi
            JOIN entries e ON e.id = mi.entry_id
            WHERE e.user_id = ?
            AND mi.id IN (
                SELECT MAX(mi2.id)
                FROM meal_items mi2
                JOIN entries e2 ON e2.id = mi2.entry_id
                WHERE e2.user_id = ?
                GROUP BY LOWER(mi2.name)
            )
            ORDER BY mi.id DESC
            LIMIT 20
        `).all(req.user.userId, req.user.userId);

        for (const item of items) {
            item.ingredients = prepare(`
                SELECT name FROM item_ingredients WHERE item_id = ?
            `).all(item.id).map(r => r.name);
        }

        res.json({ items });
    } catch (error) {
        console.error('Recent items error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// SYMPTOMS ROUTES
// ============================================

app.get('/api/symptoms', (req, res) => {
    try {
        const symptoms = prepare('SELECT id, name_en as en, name_de as de FROM symptoms').all();
        res.json({ symptoms });
    } catch (error) {
        console.error('Get symptoms error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Serve built frontend
const publicDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get('*', (req, res) => {
        res.sendFile(path.join(publicDir, 'index.html'));
    });
}

async function startServer() {
    try {
        await initDatabase();
        console.log('Database initialized');

        app.listen(PORT, () => {
            console.log(`FeelGut server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
