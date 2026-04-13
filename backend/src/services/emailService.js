const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
  port: parseInt(process.env.MAIL_PORT) || 2525,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

/**
 * Send an email verification link to the newly registered user.
 * @param {string} toEmail
 * @param {string} userName
 * @param {string} token
 */
const sendVerificationEmail = async (toEmail, userName, token) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${baseUrl}/verify-email?token=${token}`;

  await transporter.sendMail({
    from: `"EcoGarbage" <${process.env.MAIL_FROM || 'no-reply@ecogarbage.app'}>`,
    to: toEmail,
    subject: 'Vérifiez votre adresse email – EcoGarbage',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f7faf8;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;">♻️</span>
          <h2 style="color:#1A8A3C;margin:8px 0 0;">EcoGarbage</h2>
        </div>
        <h3 style="color:#111;margin-bottom:8px;">Bonjour ${userName} 👋</h3>
        <p style="color:#555;line-height:1.6;">
          Merci de vous être inscrit sur <strong>EcoGarbage</strong>. Cliquez sur le bouton ci-dessous pour vérifier votre adresse email et activer votre compte.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${link}"
            style="background:#1A8A3C;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
            Vérifier mon email
          </a>
        </div>
        <p style="color:#999;font-size:13px;text-align:center;">
          Ce lien expire dans <strong>24 heures</strong>.<br/>
          Si vous n'avez pas créé de compte, ignorez cet email.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#bbb;font-size:11px;text-align:center;">© 2025 EcoGarbage. Tous droits réservés.</p>
      </div>
    `,
  });
};

/**
 * Send a password reset link.
 */
const sendResetPasswordEmail = async (toEmail, userName, token) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${baseUrl}/reset-password?token=${token}`;

  await transporter.sendMail({
    from: `"EcoGarbage" <${process.env.MAIL_FROM || 'no-reply@ecogarbage.app'}>`,
    to: toEmail,
    subject: 'Réinitialisation de mot de passe – EcoGarbage',
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f7faf8;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:40px;">🔒</span>
          <h2 style="color:#1A8A3C;margin:8px 0 0;">EcoGarbage</h2>
        </div>
        <h3 style="color:#111;margin-bottom:8px;">Bonjour ${userName} 👋</h3>
        <p style="color:#555;line-height:1.6;">
          Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${link}"
            style="background:#1A8A3C;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color:#999;font-size:13px;text-align:center;">
          Ce lien expire dans <strong>1 heure</strong>.<br/>
          Si vous n'avez pas fait cette demande, ignorez cet email.
        </p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
        <p style="color:#bbb;font-size:11px;text-align:center;">© 2025 EcoGarbage. Tous droits réservés.</p>
      </div>
    `,
  });
};

module.exports = { sendVerificationEmail, sendResetPasswordEmail };
