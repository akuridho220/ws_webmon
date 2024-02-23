require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
const cors = require('cors');
app.use(express.json());
app.use(cors());

const axios = require('axios');
const nodemailer = require('nodemailer');

const port = process.env.TOKEN_SERVER_PORT;
const { authClient } = require('./connection');
const e = require('express');

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
// app.post('/api/createUser', async (req, res) => {
//   try {
//     const hashedPassword = await bcrypt.hash(req.body.password, 10);
//     const query = 'INSERT INTO users (name, password, email, jenis, jabatan) VALUES ($1, $2, $3, $4, $5)';
//     const values = [req.body.name, hashedPassword, req.body.email, req.body.jenis, req.body.jabatan];
//     await authClient.query(query, values);
//     res.status(201).send('User created successfully');
//   } catch (error) {
//     console.error(error);
//     res.status(500).send('Error creating user');
//   }
// });

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
      let accessToken;
      if (req.body.remember === true) {
        accessToken = generateAccessToken({ user: user }, 60 * 60 * 24 * 10);
      } else {
        accessToken = generateAccessToken({ user: user }, 60 * 60 * 24);
      }
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
function generateAccessToken(user, expires) {
  console.log('user => name: ', user.user.name, ' email: ', user.user.email, 'has login ', '| expire token', expires);
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: expires });
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
      const data = {
        message: 'Password reset token berhasil diubah',
        token: passwordResetToken,
      };
      res.status(200).send(data);
    } catch {
      res.status(401).send('Reset token telah diambil harap coba lagi');
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during send password reset');
  }
});

// reset password
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

const authServer = process.env.AUTH_SERVER;
const baseUrl = process.env.BASE_URL_APP;
async function sendEmail(email, resetToken) {
  try {
    // Create a nodemailer transporter
    const transport = nodemailer.createTransport({
      service: process.env.SERVICE_SMTP,
      host: process.env.HOST_SMTP,
      port: process.env.PORT_SMTP,
      secure: true,
      auth: {
        user: process.env.USER_SMTP,
        pass: process.env.PASS_SMTP,
      },
    });

    // Send the email
    const info = await transport.sendMail({
      from: 'webmon63@stis.ac.id',
      to: email,
      subject: 'Password Reset link untuk Web Monitoring PKL 63 (No reply)',
      text: `Click the link below to reset your password: ${baseUrl}reset-password?token=${resetToken}`,
      html: `<div style="font-family: 'Arial', sans-serif; color: #333; padding: 20px;">
      <h2 style="color: #951a2e;">Password Reset Web Monitoring PKL 63</h2>
      <p style="font-size: 16px;">Klik link dibawah ini untuk mereset password akun anda:</p>
      <p style="font-size: 16px; margin-bottom: 20px;">
        <a href="${baseUrl}reset-password?token=${resetToken}" style="text-decoration: none; background-color: #c4314e; color: #fff; padding: 10px 20px; border-radius: 5px; display: inline-block;">Reset Password</a>
      </p>
      <p style="font-size: 14px; color: #777;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
    </div>`,
    });
  } catch (error) {
    console.log(error);
    throw error; // Propagate the error to be caught by the calling function
  }
}

app.post('/api/forgotPassword', async (req, res) => {
  try {
    if (req.method === 'POST') {
      const { email } = req.body;
      // Generate a random reset token
      const response = await axios.put(`${authServer}CreatePasswordReset`, {
        email,
      });
      const resetToken = response.data.token;

      // Send the email
      await sendEmail(email, resetToken);
      res.status(200).json({ message: 'Password reset email sent successfully.' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to process password reset.' });
  }
});

app.post('/api/verifyResetToken', async (req, res) => {
  try {
    const { token } = req.body;
    const query = 'SELECT * FROM users WHERE password_reset_token = $1';
    const result = await authClient.query(query, [token]);
    const user = result.rows[0];

    if (!user) {
      return res.status(200).send('Token tidak valid');
    }

    res.status(200).send('Token valid');
  } catch (error) {
    console.error(error);
    res.status(500).send('Error during verify token');
  }
});
