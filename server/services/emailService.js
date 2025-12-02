const nodemailer = require('nodemailer');

let transporter = null;

let useSendGrid = false;
let sendgrid = null;
const sendgridApiKey = process.env.SENDGRID_API_KEY;
if (sendgridApiKey) {
  try {
    sendgrid = require('@sendgrid/mail');
    sendgrid.setApiKey(sendgridApiKey);
    useSendGrid = true;
  } catch (e) {
    useSendGrid = false;
  }
}

function buildTransporterFromEnv() {
  const smtpHost = process.env.SMTP_HOST && process.env.SMTP_HOST.trim();
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER && process.env.SMTP_USER.trim();
  const smtpPassRaw = process.env.SMTP_PASS || '';
  const smtpPass = smtpPassRaw.replace(/\s+/g, '').trim();

  const oauthClientId = process.env.SMTP_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.SMTP_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.SMTP_OAUTH_REFRESH_TOKEN;
  const oauthUser = process.env.SMTP_OAUTH_USER && process.env.SMTP_OAUTH_USER.trim();

  try {
    if (oauthClientId && oauthClientSecret && oauthRefreshToken && oauthUser) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: oauthUser,
          clientId: oauthClientId,
          clientSecret: oauthClientSecret,
          refreshToken: oauthRefreshToken
        }
      });
    }
    if (smtpHost && smtpUser && smtpPass) {
      return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass },
        tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== '0' }
      });
    }
    return null;
  } catch (err) {
    return null;
  }
}

function ensureTransporter() { if (!transporter) transporter = buildTransporterFromEnv(); return transporter; }

async function reloadTransporter() { transporter = buildTransporterFromEnv(); if (transporter) { try { await transporter.verify(); } catch (e) { } } }

const emailTemplates = {
  verification: (code) => ({ subject: 'Your DevLovers verification code', html: '<div><h2>Verify your email</h2><p>Code: ' + code + '</p></div>' }),
  welcome: (username) => ({ subject: 'Welcome to DevLovers!', html: '<div><h2>Welcome to DevLovers!</h2><p>Hi ' + username + '</p></div>' })
};

const emailService = {
  async sendVerificationEmail(toEmail, code) {
    try {
      const t = ensureTransporter();
      if (!t) return { success: true, skipped: true };
      const from = process.env.SMTP_FROM || 'no-reply@example.com';
      const template = emailTemplates.verification(code);
          try {
            if (useSendGrid && sendgrid) {
              await sendgrid.send({ to: toEmail, from, subject: template.subject, html: template.html, replyTo: from });
              return { success: true };
            }
            await t.sendMail({ from, to: toEmail, subject: template.subject, html: template.html });
            return { success: true };
          } catch (err) {
            if (err && err.code === 'EAUTH') {
              await reloadTransporter();
              const t2 = ensureTransporter();
              if (t2) { await t2.sendMail({ from, to: toEmail, subject: template.subject, html: template.html }); return { success: true }; }
            }
            throw err;
          }
    } catch (error) { return { success: false, error: error.message }; }
  },

  async sendWelcomeEmail(toEmail, username) {
    try {
      const t = ensureTransporter();
      if (!t && !useSendGrid) return { success: true, skipped: true };
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
      const template = emailTemplates.welcome(username);
      try {
        if (useSendGrid && sendgrid) {
          await sendgrid.send({ to: toEmail, from, subject: template.subject, html: template.html });
          return { success: true };
        }
        await t.sendMail({ from, to: toEmail, subject: template.subject, html: template.html });
        return { success: true };
      } catch (err) {
        if (err && err.code === 'EAUTH') {
          await reloadTransporter();
          const t2 = ensureTransporter();
          if (t2) { await t2.sendMail({ from, to: toEmail, subject: template.subject, html: template.html }); return { success: true }; }
        }
        throw err;
      }
    } catch (error) {
      return { success: false, error: error.message, stack: error.stack };
    }
  },

  async sendVerificationRequestEmail(fromEmail, username, body, toEmailParam) {
    try {
      const t = ensureTransporter();
      if (!t) return { success: true, skipped: true };

      const toEmail = (toEmailParam && String(toEmailParam).trim()) || process.env.VERIFICATION_REQUEST_TO || 'abhishekbuisness7985@gmail.com';
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
      const subject = 'Verification Request from ' + username + ' (' + fromEmail + ')';
      const html = '<div><h2>New Verification Request</h2><p>From: ' + fromEmail + '</p><p>Username: @' + username + '</p><div>' + body.replace(/\n/g, '<br>') + '</div></div>';

      try {
        if (useSendGrid && sendgrid) {
          await sendgrid.send({ to: toEmail, from, subject, html, replyTo: fromEmail });
          return { success: true };
        }
        await t.sendMail({ from, to: toEmail, subject, html, replyTo: fromEmail });
        return { success: true };
      } catch (err) {
        if (err && err.code === 'EAUTH') {
          await reloadTransporter();
          const t2 = ensureTransporter();
          if (t2) {
            await t2.sendMail({ from, to: toEmail, subject, html, replyTo: fromEmail });
            return { success: true };
          }
        }
        throw err;
      }
    } catch (error) {
      return { success: false, error: error.message, stack: error.stack };
    }
  },

  async testConnection() {
    try {
      if (useSendGrid && sendgrid) {
        try {
          if (sendgrid.client && typeof sendgrid.client.request === 'function') {
            await sendgrid.client.request({ method: 'GET', url: '/v3/user/account' });
            return { success: true };
          }
          return { success: true };
        } catch (e) {
          return { success: false, error: e.message, stack: e.stack };
        }
      }
      if (!transporter) return { success: false, error: 'Email service not configured' };
      await transporter.verify();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message, stack: error.stack };
    }
  }
};

module.exports = emailService;
