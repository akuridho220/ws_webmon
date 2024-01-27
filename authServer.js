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

// Password reset token
async function generatePasswordResetToken() {
  var randomstring = require('randomstring');
  const randomToken = randomstring.generate({
    length: 50,
    charset: 'alphabetic',
  });
  return randomToken;
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

app.put('/api/createPasswordReset', async (req, res) => {
  try {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await authClient.query(query, [req.body.email]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).send('User tidak terdaftar dalam database');
    }

    const passwordResetToken = await generatePasswordResetToken();
    try {
      const updateQuery = `UPDATE users SET password_reset_token = $1 WHERE email = $2`;
      await authClient.query(updateQuery, [passwordResetToken, req.body.email]);
      res.status(200).send('Password reset token berhasil diubah');
    } catch {
      res.status(401).send('Reset token telah diambil harap coba lagi');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during send password reset');
  }
});

app.put('/api/resetPassword', async (req, res) => {
  try {
    const query = 'SELECT * FROM users WHERE password_reset_token = $1';
    const result = await authClient.query(query, [req.body.token]);
    const user = result.rows[0];
    const email = user.email;

    if (!user) {
      return res.status(404).send('User tidak terdaftar dalam database');
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    try {
      const updateQuery = `UPDATE users SET password = $1, password_reset_at = NOW(), password_reset_token = NULL WHERE email = $2`;
      await authClient.query(updateQuery, [hashedPassword, email]);
      res.status(200).send('Password berhasil diubah');
    } catch {
      res.status(401).send('Gagal mengubah password');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during password reset');
  }
});
