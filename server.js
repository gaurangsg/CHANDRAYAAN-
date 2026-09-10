require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const { connectDB } = require('./db');
const authRoutes = require('./routes/auth');

const app = express();
const port = process.env.PORT || 3000;
const rootDir = __dirname;

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET is not configured');
}

if (!process.env.MYSQL_DATABASE || !process.env.MYSQL_USER) {
  throw new Error('MySQL environment variables are not configured');
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    name: 'connect.sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use('/api/auth', authRoutes);
app.use(express.static(rootDir));

app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'chandrayaan.HTML'));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error' });
});

async function startServer() {
  await connectDB();
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('Server startup failed:', error.message);
    process.exit(1);
  });
}

module.exports = app;
