// breadcrumb im afraid of injections

const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 4001;

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      // secure: true, // enable in production with HTTPS
      maxAge: 1000 * 60 * 60,
    },
  })
);

// Fixed code shown in "ACCESS GRANTED" (changed)
const FIXED_ACCESS_CODE = 'F0X-5AF3-7Y2Z-9P1Q';

// SQLite setup (in-memory DB for simplicity)
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )`);

  // Insert root user with plaintext password
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['root', 'rootpass']);
  // Optional: extra user for demo
  db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['admin', 'admin123']);
});

// Detect if request comes from localhost (unused but kept)
function isLocalRequest(req) {
  const raw = (req.ip || req.connection.remoteAddress || '').replace('::ffff:', '');
  return raw === '127.0.0.1' || raw === '::1' || raw === 'localhost';
}

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/');
}

// Login page (hacker aesthetics) — unchanged from original except removed server-side references
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/granted');

  res.send(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>Login — root</title>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>
      :root { --bg: #000; --panel: rgba(0,0,0,0.6); --glow: #00ff7f; --muted:#888; }
      html,body{height:100%;margin:0;background:var(--bg);font-family:"Courier New",monospace;color:var(--glow)}
      .wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;
            background-image: radial-gradient(circle at 10% 10%, rgba(0,255,127,0.035), transparent 10%),
                              linear-gradient(180deg, rgba(0,0,0,0.02), transparent 40%);}
      .console{width:480px;max-width:94%;padding:32px;background:var(--panel);border:1px solid rgba(0,255,127,0.08);
               box-shadow:0 0 40px rgba(0,255,127,0.04),inset 0 0 1px rgba(255,255,255,0.02);border-radius:10px;transition: transform 150ms ease;}
      h1{margin:0 0 12px 0;font-size:22px;letter-spacing:1px;color:var(--glow);text-align:left}
      label{display:block;margin-bottom:8px;font-size:13px;color:var(--muted);text-align:left}
      .input{width:100%;padding:12px 14px;margin-top:6px;background:transparent;border:1px solid rgba(0,255,127,0.12);
             color:var(--glow);border-radius:6px;outline:none;box-sizing:border-box;font-size:14px;text-shadow:0 0 6px rgba(0,255,127,0.06)}
      .row{margin-bottom:14px}
      .btn{width:100%;padding:12px;border-radius:6px;border:1px solid rgba(0,255,127,0.18);
           background:linear-gradient(90deg, rgba(0,255,127,0.12), rgba(0,255,127,0.06));
           color:var(--glow);font-weight:700;letter-spacing:1px;cursor:pointer;font-size:14px}
      .note{margin-top:12px;font-size:12px;color:var(--muted);text-align:left}
      .fake-terminal{font-size:12px;color:#0f0;opacity:0.85;margin-top:14px;white-space:pre-wrap;background:rgba(0,0,0,0.2);padding:8px;border-radius:4px}
      .error{margin-top:10px;color:#ff6b6b;font-size:13px;min-height:18px}
      @keyframes shake {0%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}100%{transform:translateX(0)}}
      .shake{animation:shake 320ms cubic-bezier(.36,.07,.19,.97)}
      .btn:hover{transform:translateY(-1px);box-shadow:0 6px 18px rgba(0,255,127,0.03)}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="console" id="panel" role="main" aria-labelledby="title">
        <h1 id="title">AUTH — ROOT</h1>
        <form id="loginForm" autocomplete="on">
          <div class="row">
            <label>Username</label>
            <input class="input" id="username" name="username" placeholder="root" required value="root" />
          </div>
          <div class="row">
            <label>Password</label>
            <input class="input" id="password" name="password" type="password" placeholder="password" />
          </div>
          <button class="btn" type="submit">SIGN IN</button>
        </form>

        <div class="error" id="errorMsg" aria-live="polite"></div>

        <div class="fake-terminal" id="terminal">
        $ /* breadcrumb: I'm a little afraid of injections. */ 
        </div>

        <script>
          (function () {
            // Temporary password for root is BestProfIsMari0 (change later)
            const form = document.getElementById('loginForm');
            const errorMsg = document.getElementById('errorMsg');
            const panel = document.getElementById('panel');

            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              errorMsg.textContent = '';
              panel.classList.remove('shake');

              const username = document.getElementById('username').value.trim();
              const password = document.getElementById('password').value;
              const cfgToken = 'cm9vdHBhc3M='; 
              try {
                const resp = await fetch('/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username, password })
                });

                if (resp.ok) {
                  const data = await resp.json();
                  if (data.ok) {
                    window.location = '/granted';
                    return;
                  }
                }

                let text = 'Incorrect password';
                try {
                  const js = await resp.json();
                  if (js && js.msg) text = js.msg;
                } catch (err) {}
                errorMsg.textContent = text;
                panel.classList.add('shake');

              } catch (err) {
                errorMsg.textContent = 'Connection error';
                panel.classList.add('shake');
              }
            });
          })();
        </script>
      </div>
    </div>
  </body>
</html>
  `);
});

// Login route — VULNERABLE to SQL Injection
app.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || typeof username !== 'string') {
    return res.status(401).json({ ok: false, msg: 'Invalid username' });
  }

  // DANGER: Direct string concatenation -> SQL injection
  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;

  db.get(query, (err, row) => {
    if (err) {
      console.error('SQL error:', err.message);
      return res.status(500).json({ ok: false, msg: 'Internal error' });
    }

    if (row) {
      // Successful login: store username in session
      req.session.user = { username: row.username };
      return res.json({ ok: true });
    } else {
      return res.status(401).json({ ok: false, msg: 'Incorrect credentials' });
    }
  });
});

// "ACCESS GRANTED" page with changed launch code
app.get('/granted', requireAuth, (req, res) => {
  const safeUser = String(req.session.user && req.session.user.username ? req.session.user.username : '').replace(/[^a-zA-Z0-9_-]/g, '');

  res.send(`
<!doctype html>
<html>
  <head>
    <meta charset="utf-8"/>
    <title>ACCESS GRANTED</title>
    <meta name="viewport" content="width=device-width,initial-scale=1"/>
    <style>
      :root{--bg:#000;--glow:#00ff7f;--muted:#888}
      html,body{height:100%;margin:0;background:var(--bg);font-family:"Courier New",monospace;color:var(--glow)}
      .wrap{height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column}
      .panel{padding:40px;background:rgba(0,0,0,0.6);border-radius:10px;border:1px solid rgba(0,255,127,0.08);text-align:center;min-width:320px}
      h1{font-size:28px;margin:0 0 8px 0;letter-spacing:2px}
      p{margin:0 0 14px 0;color:var(--muted)}
      .btn{padding:10px 14px;border-radius:6px;border:1px solid rgba(0,255,127,0.18);background:transparent;color:var(--glow);cursor:pointer}
      .access-code { margin-top:18px; padding:14px 20px; border-radius:8px; font-weight:700; letter-spacing:2px;
                      border:1px solid rgba(0,255,127,0.12); background:rgba(0,0,0,0.45); display:inline-block; font-size:18px; }
      .hint { margin-top:10px; color:var(--muted); font-size:13px; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="panel" role="main" aria-labelledby="grant">
        <h1 id="grant">ACCESS GRANTED</h1>
        <p>Connected as <strong>${safeUser}</strong></p>

        <div class="access-code" aria-label="Access code">${FIXED_ACCESS_CODE}</div>
        <div class="hint">Launch code</div>

        <form method="POST" action="/logout" style="margin-top:18px">
          <button class="btn" type="submit">LOG OUT</button>
        </form>
      </div>
    </div>
  </body>
</html>
  `);
});

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

app.listen(PORT, () => {
  console.log('Server listening on http://localhost:' + PORT);
});
