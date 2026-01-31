const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDatabase, prepare, saveDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'feelgut-secret-key-change-in-production';

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Serve static files from parent directory
app.use(express.static(path.join(__dirname, '..')));

// Auth middleware
function authenticateToken(req, res, next) {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
}

// ============================================
// AUTH ROUTES
// ============================================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        if (username.length < 3) {
            return res.status(400).json({ error: 'Username must be at least 3 characters' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Check if user exists
        const existingUser = prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const result = prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, passwordHash);
        const userId = result.lastInsertRowid;

        // Generate token
        const token = jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ success: true, user: { id: userId, username } });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        // Find user
        const user = prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                username: user.username,
                language: user.language,
                theme: user.theme
            } 
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
});

// Delete account
app.delete('/api/auth/delete-account', authenticateToken, (req, res) => {
    try {
        const userId = req.user.userId;
        
        // Delete all user's entries first (foreign key constraint)
        prepare('DELETE FROM entries WHERE user_id = ?').run(userId);
        
        // Delete the user
        prepare('DELETE FROM users WHERE id = ?').run(userId);
        
        // Clear the auth cookie
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

// Update user settings
app.put('/api/user/settings', authenticateToken, (req, res) => {
    try {
        const { language, theme } = req.body;
        
        if (language) {
            prepare('UPDATE users SET language = ? WHERE id = ?').run(language, req.user.userId);
        }
        if (theme) {
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
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        
        // Get current user
        const user = prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        
        // Update password
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

// Get all entries for current user
app.get('/api/entries', authenticateToken, (req, res) => {
    try {
        console.log('Fetching entries for user:', req.user.userId);
        const entries = prepare(`
            SELECT id, type, symptom_id as symptomId, description, date_time as dateTime 
            FROM entries 
            WHERE user_id = ? 
            ORDER BY date_time DESC
        `).all(req.user.userId);
        
        console.log('Found entries:', entries.length);
        res.json({ entries });
    } catch (error) {
        console.error('Get entries error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new entry
app.post('/api/entries', authenticateToken, (req, res) => {
    try {
        const { type, symptomId, description, dateTime } = req.body;
        console.log('Adding entry for user:', req.user.userId, 'type:', type);

        if (!type || !dateTime) {
            return res.status(400).json({ error: 'Type and dateTime are required' });
        }

        const result = prepare(`
            INSERT INTO entries (user_id, type, symptom_id, description, date_time) 
            VALUES (?, ?, ?, ?, ?)
        `).run(req.user.userId, type, symptomId || null, description || null, dateTime);

        console.log('Entry added with id:', result.lastInsertRowid);
        res.json({ 
            success: true, 
            entry: { 
                id: result.lastInsertRowid, 
                type, 
                symptomId, 
                description, 
                dateTime 
            } 
        });
    } catch (error) {
        console.error('Add entry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete entry
app.delete('/api/entries/:id', authenticateToken, (req, res) => {
    try {
        const entryId = parseInt(req.params.id);
        
        // Make sure entry belongs to user
        const entry = prepare('SELECT id FROM entries WHERE id = ? AND user_id = ?').get(entryId, req.user.userId);
        if (!entry) {
            return res.status(404).json({ error: 'Entry not found' });
        }

        prepare('DELETE FROM entries WHERE id = ?').run(entryId);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete entry error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============================================
// SYMPTOMS ROUTES
// ============================================

// Get all symptoms
app.get('/api/symptoms', (req, res) => {
    try {
        const symptoms = prepare('SELECT id, name_en as en, name_de as de FROM symptoms').all();
        res.json({ symptoms });
    } catch (error) {
        console.error('Get symptoms error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start server after database initialization
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
