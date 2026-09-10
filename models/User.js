const pool = require('../db');

async function createUser(email, passwordHash) {
  const [result] = await pool.execute(
    'INSERT INTO users (email, password_hash) VALUES (?, ?)',
    [email, passwordHash]
  );

  return { id: result.insertId, email };
}

async function findUserByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, email, password_hash AS passwordHash FROM users WHERE email = ?',
    [email]
  );

  return rows[0] || null;
}

async function findUserById(id) {
  const [rows] = await pool.execute(
    'SELECT id, email FROM users WHERE id = ?',
    [id]
  );

  return rows[0] || null;
}

module.exports = { createUser, findUserByEmail, findUserById };
