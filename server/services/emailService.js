const nodemailer = require('nodemailer');

// Email transporter configuration
let transporter = null;

function buildTransporterFromEnv() {
  // Sanitize credentials from environment: trim and remove accidental spaces
  const smtpHost = process.env.SMTP_HOST && process.env.SMTP_HOST.trim();
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const smtpUser = process.env.SMTP_USER && process.env.SMTP_USER.trim();
  const smtpPassRaw = process.env.SMTP_PASS || '';
  const smtpPass = smtpPassRaw.replace(/\s+/g, '').trim();

  // OAuth2 support (optional): set these env vars to use OAuth2 with Gmail
  const oauthClientId = process.env.SMTP_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.SMTP_OAUTH_CLIENT_SECRET;
  const oauthRefreshToken = process.env.SMTP_OAUTH_REFRESH_TOKEN;
  const oauthUser = process.env.SMTP_OAUTH_USER && process.env.SMTP_OAUTH_USER.trim();

  try {
    if (oauthClientId && oauthClientSecret && oauthRefreshToken && oauthUser) {
      console.log('Initializing Email transporter: OAuth2');
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
    } else if (smtpHost && smtpUser && smtpPass) {
      if (smtpPassRaw && smtpPassRaw !== smtpPass) {
        console.warn('⚠️ SMTP_PASS had whitespace which was removed automatically.');
      }
      console.log('Initializing Email transporter: SMTP');
      return nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        tls: { rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== '0' }
      });
    }
    console.warn('⚠️ SMTP configuration missing or incomplete. Email functionality disabled.');
    return null;
  } catch (err) {
    console.error('❌ Failed to build transporter:', err && err.message ? err.message : err);
    return null;
  }
}

function ensureTransporter() {
  if (!transporter) {
    transporter = buildTransporterFromEnv();
  }
  return transporter;
}

async function reloadTransporter() {
  transporter = buildTransporterFromEnv();
  if (transporter) {
    try {
      await transporter.verify();
      console.log('✅ Email transporter reloaded and verified');
    } catch (err) {
      console.warn('⚠️ Email transporter reloaded but verify failed:', err && err.message ? err.message : err);
    }
  }
}

// Email templates
const emailTemplates = {
  verification: (code) => ({
    subject: 'Your DevLovers verification code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
        <h2>Verify your email</h2>
        <p>Use the OTP below to verify your email address:</p>
        <div style="font-size:28px;font-weight:700;letter-spacing:4px;padding:12px 16px;background:#f3f4f6;border-radius:8px;text-align:center;">
          ${code}
        </div>
        <p style="color:#6b7280">This code expires in 10 minutes.</p>
      </div>
    `
  }),
  
  welcome: (username) => ({
    subject: 'Welcome to DevLovers!',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;">
        <h2>Welcome to DevLovers!</h2>
        <p>Hi ${username},</p>
        <p>Your account has been successfully verified. You can now start connecting with fellow developers!</p>
        <p>Happy coding!</p>
      </div>
    `
  })
};

// Email sending functions
const emailService = {
  // Send verification email
  async sendVerificationEmail(toEmail, code) {
    try {
      const t = ensureTransporter();
      if (!t) {
        console.warn('⚠️ Email service not configured. Skipping verification email.');
        return { success: true, skipped: true };
      }

      const from = process.env.SMTP_FROM || 'no-reply@example.com';
      const template = emailTemplates.verification(code);

      try {
        await t.sendMail({ from, to: toEmail, subject: template.subject, html: template.html });
        console.log(`Verification email sent to ${toEmail}`);
        return { success: true };
      } catch (err) {
        // If auth error, try reloading transporter once (in case env changed after start)
        if (err && err.code === 'EAUTH') {
          console.warn('⚠️ Auth error while sending verification email, reloading transporter and retrying once...');
          await reloadTransporter();
          const t2 = ensureTransporter();
          if (t2) {
            await t2.sendMail({ from, to: toEmail, subject: template.subject, html: template.html });
            console.log(`Verification email sent to ${toEmail} after reload`);
            return { success: true };
          }
        }
        throw err;
      }
    } catch (error) {
      console.error('Email send error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send welcome email
  async sendWelcomeEmail(toEmail, username) {
    try {
      const t = ensureTransporter();
      if (!t) {
        console.warn('⚠️ Email service not configured. Skipping welcome email.');
        return { success: true, skipped: true };
      }

      const from = process.env.SMTP_FROM || 'no-reply@example.com';
      const template = emailTemplates.welcome(username);

      try {
        await t.sendMail({ from, to: toEmail, subject: template.subject, html: template.html });
        console.log(`Welcome email sent to ${toEmail}`);
        return { success: true };
      } catch (err) {
        if (err && err.code === 'EAUTH') {
          console.warn('⚠️ Auth error while sending welcome email, reloading transporter and retrying once...');
          await reloadTransporter();
          const t2 = ensureTransporter();
          if (t2) {
            await t2.sendMail({ from, to: toEmail, subject: template.subject, html: template.html });
            console.log(`Welcome email sent to ${toEmail} after reload`);
            return { success: true };
          }
        }
        throw err;
      }
    } catch (error) {
      console.error('Welcome email send error:', error);
      return { success: false, error: error.message };
    }
  },

  // Send verification request email
  async sendVerificationRequestEmail(fromEmail, username, body) {
    try {
      const t = ensureTransporter();
      if (!t) {
        console.warn('⚠️ Email service not configured. Skipping verification request email.');
        return { success: true, skipped: true };
      }

      const toEmail = 'abhishekbuisness7985@gmail.com';
      // Use SMTP_FROM as sender (required by SMTP servers), but set reply-to to user's email
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
      
      const subject = `Verification Request from ${username} (${fromEmail})`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;">
          <h2 style="color:#333;">New Verification Request</h2>
          <div style="background:#f3f4f6;padding:15px;border-radius:8px;margin:20px 0;">
            <p style="margin:0 0 10px 0;"><strong>From:</strong> ${fromEmail}</p>
            <p style="margin:0 0 10px 0;"><strong>Username:</strong> @${username}</p>
            <p style="margin:0;"><strong>Request Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div style="background:#fff;padding:20px;border:1px solid #e5e7eb;border-radius:8px;margin:20px 0;">
            <h3 style="color:#333;margin-top:0;">Message:</h3>
            <p style="white-space:pre-wrap;line-height:1.6;color:#4b5563;">${body.replace(/\n/g, '<br>')}</p>
          </div>
          <p style="color:#6b7280;font-size:14px;margin-top:30px;">
            This is an automated email from DevLovers verification request system.
          </p>
        </div>
      `;

      try {
        await t.sendMail({ 
          from: from, // Use configured SMTP account as sender (required by SMTP)
          to: toEmail, 
          subject: subject, 
          html: html,
          replyTo: fromEmail // Set reply-to to user's email so replies go to the user
        });
        console.log(`Verification request email sent from ${fromEmail} to ${toEmail}`);
        return { success: true };
      } catch (err) {
        // If auth error, try reloading transporter once (in case env changed after start)
        if (err && err.code === 'EAUTH') {
          console.warn('⚠️ Auth error while sending verification request email, reloading transporter and retrying once...');
          await reloadTransporter();
          const t2 = ensureTransporter();
          if (t2) {
            await t2.sendMail({ 
              from: from,
              to: toEmail, 
              subject: subject, 
              html: html,
              replyTo: fromEmail
            });
            console.log(`Verification request email sent from ${fromEmail} to ${toEmail} after reload`);
            return { success: true };
          }
        }
        throw err;
      }
    } catch (error) {
      console.error('Verification request email send error:', error);
      return { success: false, error: error.message };
    }
  },

  // Test email configuration
  async testConnection() {
    try {
      if (!transporter) {
        return { success: false, error: 'Email service not configured' };
      }
      await transporter.verify();
      console.log('Email service connection verified');
      return { success: true };
    } catch (error) {
      console.error('Email service connection failed:', error);
      return { success: false, error: error.message };
    }
  }
};

module.exports = emailService;
