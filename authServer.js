require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');
app.use(express.json());
app.use(cors());

const port = process.env.TOKEN_SERVER_PORT;
const { authClient } = require('./connection');

app.listen(port, () => {
  console.log(`Authorization Server running on ${port}`);
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

// Declare an array to store active access tokens

const activeAccessTokens = [];
module.exports = {
  activeAccessTokens,
};

// AUTHENTICATE LOGIN AND RETURN JWT TOKEN
app.post('/api/login', async (req, res) => {
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await authClient.query(query, [req.body.email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).send('User tidak terdaftar dalam database');
    }

    if (await bcrypt.compare(req.body.password, user.password)) {
      const accessToken = generateAccessToken({ user: user });
      activeAccessTokens.push(accessToken);
      res.json({ accessToken });
    } else {
      res.status(401).send('Password tidak sesuai!');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during login');
  }
});

// Access Token
function generateAccessToken(user) {
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
}

app.delete('/api/logout', async (req, res) => {
  const tokenToInvalidate = req.body.token;
  if (!tokenToInvalidate) {
    return res.status(400).send('Token not provided');
  }
  // Validate and remove the token from the list
  const index = activeAccessTokens.indexOf(tokenToInvalidate);

  if (index !== -1) {
    activeAccessTokens.splice(index, 1);
    res.status(202).send('Logged out!');
  } else {
    res.status(401).send('Invalid token');
  }
});
