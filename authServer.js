require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
app.use(express.json());

const port = process.env.TOKEN_SERVER_PORT;
const { authClient } = require('./connection');

app.listen(port, () => {
  console.log(`Authorization Server running on ${port}...`);
});

authClient.connect((err) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log('Connected');
  }
});

// REGISTER A USER
app.post('/api/createUser', async (req, res) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const query = 'INSERT INTO users (name, password, email, jenis, jabatan) VALUES ($1, $2, $3, $4, $5)';
    const values = [req.body.name, hashedPassword, req.body.email, req.body.jenis, req.body.jabatan];
    await authClient.query(query, values);
    res.status(201).send('User created successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error creating user');
  }
});

// AUTHENTICATE LOGIN AND RETURN JWT TOKEN
app.post('/api/login', async (req, res) => {
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await authClient.query(query, [req.body.email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).send('User does not exist!');
    }

    if (await bcrypt.compare(req.body.password, user.password)) {
      const accessToken = generateAccessToken({ user: user });
      const refreshToken = generateRefreshToken({ user: user });
      res.json({ accessToken, refreshToken });
    } else {
      res.status(401).send('Password Incorrect!');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during login');
  }
});

// Access Token
function generateAccessToken(user) {
  console.log(user);
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
}

// Refresh Token
let refreshTokens = [];

function generateRefreshToken(user) {
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '20m' });
  refreshTokens.push(refreshToken);
  return refreshToken;
}

// REFRESH TOKEN API
app.post('/api/refreshToken', (req, res) => {
  if (!refreshTokens.includes(req.body.token)) res.status(400).send('Refresh Token Invalid');
  refreshTokens = refreshTokens.filter((c) => c != req.body.token);
  const accessToken = generateAccessToken({ user: req.body.name });
  const refreshToken = generateRefreshToken({ user: req.body.name });
  res.json({ accessToken, refreshToken });
});

app.delete('/api/logout', (req, res) => {
  const tokenToInvalidate = req.body.token;
  if (!tokenToInvalidate) {
    return res.status(400).send('Token not provided');
  }
  refreshTokens = refreshTokens.filter((c) => c != tokenToInvalidate);
  res.status(202).send('Logged out!');
});
