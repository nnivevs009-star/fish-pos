const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const db = require('./db');
const requireAuth = require('./middleware/requireAuth');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: __dirname }),
  secret: process.env.SESSION_SECRET || 'fish-pos-multi-branch-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 }
}));

// Routes
app.use('/', require('./routes/auth'));
app.use('/superadmin', require('./routes/superadmin'));
app.use('/branch', require('./routes/branch'));
app.use('/pos', require('./routes/pos'));

// Root: redirect based on role
app.get('/', requireAuth, (req, res) => {
  const role = req.session.role;
  if (role === 'superadmin') return res.redirect('/superadmin/dashboard');
  if (role === 'manager') return res.redirect('/branch/dashboard');
  res.redirect('/pos/app');
});

// Print default credentials on startup
function printStartupInfo() {
  const sa = db.prepare("SELECT id FROM users WHERE role='superadmin' LIMIT 1").get();
  if (sa) {
    console.log('[FISH POS] Default superadmin: superadmin / Admin1234');
  }
  console.log(`[FISH POS] Server running at http://localhost:${PORT}`);
}

app.listen(PORT, () => printStartupInfo());
