// email-debug.js
// Run this from the server folder to reproduce the SMTP auth flow with debug logs.
// It uses your existing server/.env values.

require('dotenv').config();
const nodemailer = require('nodemailer');

(async function () {
  try {
    const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const user = (process.env.SMTP_USER || '').trim();
    const passRaw = process.env.SMTP_PASS || '';
    const pass = passRaw.replace(/\s+/g, '').trim();

    console.log('SMTP host:', host);
    console.log('SMTP port:', port);
    console.log('SMTP user:', user);
    console.log('NOTE: SMTP_PASS is not printed for security');

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      logger: true,
      debug: true,
      tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== '0' }
    });

    console.log('\nRunning transporter.verify() - this will perform the AUTH exchange and print debug logs.');
    await transporter.verify();
    console.log('\nTransporter verified successfully.');
  } catch (err) {
    console.error('\nTransporter verify failed:');
    console.error(err && err.stack ? err.stack : err);
    process.exitCode = 1;
  }
})();
