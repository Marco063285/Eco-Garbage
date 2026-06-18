const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { randomUUID: uuidv4 } = crypto;
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuthSession = require('../models/AuthSession');
const AuditLog = require('../models/AuditLog');
const AdminActionGrant = require('../models/AdminActionGrant');
const connectDB = require('../config/db');
const { sendVerificationEmail, sendResetPasswordEmail } = require('../services/emailService');
const {
  evaluateMultipleAccounts,
  normalizePhone,
} = require('../services/fraudDetectionService');
const {
  buildTotpUri,
  createSession,
  createStepUpToken,
  encryptTotpSecret,
  generateBackupCodes,
  generateChallengeToken,
  generateTotpSecret,
  hashBackupCodes,
  isAdminTwoFactorRequired,
  verifyAdminCode,
  verifyChallengeToken,
  verifyTotp,
} = require('../services/adminSecurityService');
const { decrypt } = require('../utils/sensitiveData');

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const CM_PHONE_REGEX = /^(\+?237)?[62]\d{8}$/;
const validatePassword = (password) => {
  if (!password || password.length < 8) return 'Le mot de passe doit contenir au moins 8 caracteres';
  if (!PASSWORD_REGEX.test(password)) return 'Le mot de passe doit contenir une majuscule, une minuscule et un chiffre';
  return null;
};
const validatePhone = (phone) => {
  if (!phone) return null;
  const cleaned = phone.replace(/[\s\-().]/g, '');
  if (!CM_PHONE_REGEX.test(cleaned)) return 'Numero de telephone camerounais invalide (ex: +237 6XXXXXXXX)';
  return null;
};

const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject
    ? userDoc.toObject({ virtuals: true })
    : { ...userDoc };
  [
    'password_hash',
    'email_verification_token',
    'email_verification_expires',
    'password_reset_token',
    'password_reset_expires',
    'phone_fingerprint',
    'registration_ip_fingerprint',
    'registration_device_fingerprint',
  ].forEach((field) => delete user[field]);

  if (user.admin_security) {
    user.two_factor_enabled = Boolean(user.admin_security.two_factor_enabled);
    delete user.admin_security;
  } else {
    user.two_factor_enabled = false;
  }
  if (user.collector_profile) {
    user.collector_photo_available = Boolean(
      user.collector_profile.profile_photo?.stored_name
    );
    delete user.collector_profile.profile_photo;
    delete user.collector_profile.national_id_number;
    delete user.collector_profile.id_front_url;
    delete user.collector_profile.id_back_url;
    delete user.collector_profile.selfie_url;
    delete user.collector_profile.selfie_video_url;
    delete user.collector_profile.verification_notes;
  }
  return user;
};

const respondWithSession = async ({ userDoc, req, res, message = 'Connexion reussie' }) => {
  const { session, token } = await createSession({ user: userDoc, req });
  const safeUser = sanitizeUser(userDoc);
  return res.json({
    success: true,
    message,
    data: {
      token,
      user: safeUser,
      session: { uuid: session.uuid, unusual: session.is_unusual },
    },
  });
};


const register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    const pwError = validatePassword(password);
    if (pwError)
      return res.status(400).json({ success: false, message: pwError });
    const phoneError = validatePhone(phone);
    if (phoneError)
      return res.status(400).json({ success: false, message: phoneError });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ success: false, message: 'Email deja utilise' });

    const hash = await bcrypt.hash(password, 10);
    const uuid = uuidv4();
    const smtpConfigured = !!(process.env.MAIL_HOST && process.env.MAIL_USER);
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const userData = {
      uuid,
      name,
      email,
      phone: phone ? normalizePhone(phone) : undefined,
      password_hash: hash,
      role: 'user',
      is_verified: !smtpConfigured, // auto-verify when SMTP not configured
      email_verification_token: smtpConfigured ? verificationToken : null,
      email_verification_expires: smtpConfigured ? verificationExpires : null,
    };

    const userDoc = await User.create(userData);
    await evaluateMultipleAccounts({ user: userDoc, req });

    await Notification.create({
      user_id: userDoc._id,
      title: 'Bienvenue sur EcoGarbage !',
      message: smtpConfigured
        ? `Bonjour ${name}, votre compte a ete cree avec succes. Verifiez votre email pour activer votre compte.`
        : `Bonjour ${name}, bienvenue sur EcoGarbage ! Votre compte est actif.`,
      type: 'welcome',
      delivery: {
        status: 'delivered',
        email_fallback_enabled: false,
        push: { status: 'not_required' },
        email: { status: 'not_required' },
        completed_at: new Date(),
      },
    });

    if (smtpConfigured) {
      try {
        await sendVerificationEmail(email, name, verificationToken);
      } catch (mailErr) {
        console.error('Email verification send error:', mailErr);
      }
      res.status(201).json({ success: true, message: 'Compte cree. Verifiez votre email pour activer votre compte.' });
    } else {
      res.status(201).json({ success: true, message: 'Compte cree avec succes ! Vous pouvez vous connecter.', autoVerified: true });
    }
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });

    const databaseReady = await connectDB.ensureConnected();
    if (!databaseReady) {
      return res.status(503).json({
        success: false,
        message: 'Base de donnees temporairement indisponible. Reessayez dans quelques secondes.',
      });
    }

    const userDoc = await User.findOne({ email: email.toLowerCase() });
    if (!userDoc)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    if (!userDoc.is_active)
      return res.status(403).json({ success: false, message: 'Compte suspendu. Contactez le support.' });
    if (!userDoc.is_verified)
      return res.status(403).json({ success: false, message: 'Veuillez verifier votre email avant de vous connecter.', code: 'EMAIL_NOT_VERIFIED' });

    const valid = await bcrypt.compare(password, userDoc.password_hash);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });

    if (userDoc.role === 'admin') {
      if (userDoc.admin_security?.two_factor_enabled) {
        return res.status(202).json({
          success: true,
          code: 'ADMIN_2FA_REQUIRED',
          message: 'Code de double authentification requis',
          data: {
            challenge_token: generateChallengeToken(userDoc, 'login'),
          },
        });
      }
      if (isAdminTwoFactorRequired()) {
        return res.status(202).json({
          success: true,
          code: 'ADMIN_2FA_SETUP_REQUIRED',
          message: 'Activez la double authentification pour continuer',
          data: {
            challenge_token: generateChallengeToken(userDoc, 'setup'),
          },
        });
      }
    }

    return respondWithSession({ userDoc, req, res });
  } catch (err) {
    console.error('login error:', err);
    if (['MongoServerSelectionError', 'MongoNetworkError'].includes(err?.name)) {
      return res.status(503).json({
        success: false,
        message: 'Base de donnees temporairement indisponible. Reessayez dans quelques secondes.',
      });
    }
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};


const getMe = async (req, res) => {
  try {
    const userDoc = await User.findById(req.user.id);
    if (!userDoc) return res.status(404).json({ success: false, message: 'Utilisateur non trouve' });
    res.json({ success: true, data: sanitizeUser(userDoc) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};


const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    if (phone) {
      const cleaned = phone.replace(/[\s\-().]/g, '');
      if (!/^(\+?237)?[62]\d{8}$/.test(cleaned))
        return res.status(400).json({ success: false, message: 'Numero de telephone camerounais invalide' });
    }
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          name,
          phone: phone ? normalizePhone(phone) : undefined,
          address,
        },
      },
      { new: true }
    );
    await evaluateMultipleAccounts({ user: updated, req });
    res.json({ success: true, message: 'Profil mis a jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};


const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userDoc = await User.findById(req.user.id);
    const valid = await bcrypt.compare(currentPassword, userDoc.password_hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ success: false, message: pwError });
    const hash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user.id, { $set: { password_hash: hash } });
    await AuthSession.updateMany(
      {
        user_id: req.user.id,
        uuid: { $ne: req.session.uuid },
        revoked_at: null,
      },
      {
        $set: {
          revoked_at: new Date(),
          revoked_by: req.user.id,
          revocation_reason: 'password_changed',
        },
      }
    );
    res.json({ success: true, message: 'Mot de passe modifie' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};


const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Token manquant' });

    const userDoc = await User.findOne({
      email_verification_token: token,
      email_verification_expires: { $gt: new Date() },
    });

    if (!userDoc)
      return res.status(400).json({ success: false, message: 'Lien invalide ou expire.' });

    userDoc.is_verified = true;
    userDoc.email_verification_token = null;
    userDoc.email_verification_expires = null;
    await userDoc.save();

    res.json({ success: true, message: 'Email verifie avec succes. Vous pouvez maintenant vous connecter.' });
  } catch (err) {
    console.error('verifyEmail error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};


const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email requis' });

    const userDoc = await User.findOne({ email: email.toLowerCase() });
    if (!userDoc)
      return res.status(404).json({ success: false, message: 'Aucun compte associe a cet email' });
    if (userDoc.is_verified)
      return res.status(400).json({ success: false, message: 'Cet email est deja verifie' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    userDoc.email_verification_token = verificationToken;
    userDoc.email_verification_expires = verificationExpires;
    await userDoc.save();

    try {
      await sendVerificationEmail(userDoc.email, userDoc.name, verificationToken);
    } catch (mailErr) {
      console.error('Resend verification email error:', mailErr);
      return res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de l\'email' });
    }

    res.json({ success: true, message: 'Email de verification renvoye. Verifiez votre boite mail.' });
  } catch (err) {
    console.error('resendVerification error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};


const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email requis' });

    const userDoc = await User.findOne({ email: email.toLowerCase() });

    if (!userDoc) return res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    userDoc.password_reset_token = resetToken;
    userDoc.password_reset_expires = resetExpires;
    await userDoc.save();

    try {
      await sendResetPasswordEmail(userDoc.email, userDoc.name, resetToken);
    } catch (mailErr) {
      console.error('Reset password email error:', mailErr);
    }

    res.json({ success: true, message: 'Si un compte existe avec cet email, un lien de reinitialisation a ete envoye.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};


const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token et mot de passe requis' });

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ success: false, message: pwError });

    const userDoc = await User.findOne({
      password_reset_token: token,
      password_reset_expires: { $gt: new Date() },
    });

    if (!userDoc) return res.status(400).json({ success: false, message: 'Lien invalide ou expire.' });

    const hash = await bcrypt.hash(password, 10);
    userDoc.password_hash = hash;
    userDoc.password_reset_token = null;
    userDoc.password_reset_expires = null;
    await userDoc.save();
    await AuthSession.updateMany(
      { user_id: userDoc._id, revoked_at: null },
      {
        $set: {
          revoked_at: new Date(),
          revoked_by: userDoc._id,
          revocation_reason: 'password_reset',
        },
      }
    );

    res.json({ success: true, message: 'Mot de passe reinitialise avec succes. Vous pouvez maintenant vous connecter.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const startTwoFactorSetup = async (req, res) => {
  try {
    const decoded = verifyChallengeToken(req.body.challenge_token, 'setup');
    const user = await User.findOne({ _id: decoded.id, role: 'admin', is_active: true })
      .select('+admin_security.pending_totp_secret');
    if (!user) return res.status(404).json({ success: false, message: 'Administrateur introuvable' });
    const secret = generateTotpSecret();
    user.admin_security.pending_totp_secret = encryptTotpSecret(secret);
    user.admin_security.pending_totp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    res.json({
      success: true,
      data: {
        secret,
        provisioning_uri: buildTotpUri({ email: user.email, secret }),
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Defi de securite invalide ou expire' });
  }
};

const confirmTwoFactorSetup = async (req, res) => {
  try {
    const decoded = verifyChallengeToken(req.body.challenge_token, 'setup');
    const user = await User.findOne({ _id: decoded.id, role: 'admin', is_active: true })
      .select(
        '+admin_security.pending_totp_secret '
        + '+admin_security.totp_secret +admin_security.backup_code_hashes'
      );
    if (!user || user.admin_security?.pending_totp_expires < new Date()) {
      return res.status(400).json({ success: false, message: 'Configuration 2FA expiree' });
    }
    const secret = decrypt(user.admin_security.pending_totp_secret);
    if (!verifyTotp(secret, req.body.code)) {
      return res.status(400).json({ success: false, message: 'Code 2FA incorrect' });
    }
    const backupCodes = generateBackupCodes();
    user.admin_security.two_factor_enabled = true;
    user.admin_security.totp_secret = encryptTotpSecret(secret);
    user.admin_security.pending_totp_secret = undefined;
    user.admin_security.pending_totp_expires = undefined;
    user.admin_security.backup_code_hashes = await hashBackupCodes(backupCodes);
    user.admin_security.enabled_at = new Date();
    await user.save();
    await AuditLog.create({
      actor_id: user._id,
      action: 'admin_security.two_factor_enabled',
      target_type: 'User',
      target_id: user._id,
      metadata: { method: 'totp' },
      ip: req.ip,
      user_agent: req.get('user-agent'),
    });
    const { session, token } = await createSession({ user, req });
    res.json({
      success: true,
      message: 'Double authentification activee',
      data: {
        token,
        user: sanitizeUser(user),
        session: { uuid: session.uuid, unusual: session.is_unusual },
        backup_codes: backupCodes,
      },
    });
  } catch (error) {
    res.status(401).json({ success: false, message: 'Defi de securite invalide ou expire' });
  }
};

const verifyTwoFactorLogin = async (req, res) => {
  try {
    const decoded = verifyChallengeToken(req.body.challenge_token, 'login');
    const user = await User.findOne({ _id: decoded.id, role: 'admin', is_active: true })
      .select('+admin_security.totp_secret +admin_security.backup_code_hashes');
    if (!user?.admin_security?.two_factor_enabled) {
      return res.status(400).json({ success: false, message: 'Double authentification non activee' });
    }
    const verification = await verifyAdminCode(user, req.body.code);
    if (!verification.valid) {
      return res.status(401).json({ success: false, message: 'Code 2FA incorrect' });
    }
    return respondWithSession({ userDoc: user, req, res });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Defi de securite invalide ou expire' });
  }
};

const enrollTwoFactor = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id, role: 'admin' })
      .select('+admin_security.pending_totp_secret');
    if (user.admin_security?.two_factor_enabled) {
      return res.status(409).json({ success: false, message: 'La double authentification est deja active' });
    }
    const secret = generateTotpSecret();
    user.admin_security.pending_totp_secret = encryptTotpSecret(secret);
    user.admin_security.pending_totp_expires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
    res.json({
      success: true,
      data: {
        secret,
        provisioning_uri: buildTotpUri({ email: user.email, secret }),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const enableTwoFactor = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user.id, role: 'admin' })
      .select(
        '+admin_security.pending_totp_secret '
        + '+admin_security.totp_secret +admin_security.backup_code_hashes'
      );
    if (!user?.admin_security?.pending_totp_secret
      || user.admin_security.pending_totp_expires < new Date()) {
      return res.status(400).json({ success: false, message: 'Configuration 2FA expiree' });
    }
    const secret = decrypt(user.admin_security.pending_totp_secret);
    if (!verifyTotp(secret, req.body.code)) {
      return res.status(400).json({ success: false, message: 'Code 2FA incorrect' });
    }
    const backupCodes = generateBackupCodes();
    user.admin_security.two_factor_enabled = true;
    user.admin_security.totp_secret = encryptTotpSecret(secret);
    user.admin_security.pending_totp_secret = undefined;
    user.admin_security.pending_totp_expires = undefined;
    user.admin_security.backup_code_hashes = await hashBackupCodes(backupCodes);
    user.admin_security.enabled_at = new Date();
    await user.save();
    await AuditLog.create({
      actor_id: user._id,
      action: 'admin_security.two_factor_enabled',
      target_type: 'User',
      target_id: user._id,
      metadata: { method: 'totp' },
      ip: req.ip,
      user_agent: req.get('user-agent'),
    });
    res.json({
      success: true,
      message: 'Double authentification activee',
      data: { backup_codes: backupCodes },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const disableTwoFactor = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('+admin_security.totp_secret +admin_security.backup_code_hashes');
    const passwordValid = await bcrypt.compare(
      String(req.body.password || ''),
      user.password_hash
    );
    const codeValid = await verifyAdminCode(user, req.body.code);
    if (!passwordValid || !codeValid.valid) {
      return res.status(401).json({ success: false, message: 'Confirmation de securite invalide' });
    }
    user.admin_security = {
      two_factor_enabled: false,
      backup_code_hashes: [],
    };
    await user.save();
    await AuditLog.create({
      actor_id: user._id,
      action: 'admin_security.two_factor_disabled',
      target_type: 'User',
      target_id: user._id,
      metadata: {},
      ip: req.ip,
      user_agent: req.get('user-agent'),
    });
    res.json({ success: true, message: 'Double authentification desactivee' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const listSessions = async (req, res) => {
  try {
    const sessions = await AuthSession.find({
      user_id: req.user.id,
      expires_at: { $gt: new Date() },
    }).sort({ last_seen_at: -1 }).lean();
    res.json({
      success: true,
      data: sessions.map((session) => ({
        uuid: session.uuid,
        device_name: session.device_name,
        platform: session.platform,
        user_agent: session.user_agent,
        is_unusual: session.is_unusual,
        is_current: session.uuid === req.session.uuid,
        last_seen_at: session.last_seen_at,
        created_at: session.created_at,
        revoked_at: session.revoked_at,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const revokeSession = async (req, res) => {
  const session = await AuthSession.findOneAndUpdate(
    { uuid: req.params.uuid, user_id: req.user.id, revoked_at: null },
    {
      $set: {
        revoked_at: new Date(),
        revoked_by: req.user.id,
        revocation_reason: 'user_revoked',
      },
    },
    { new: true }
  );
  if (!session) return res.status(404).json({ success: false, message: 'Session introuvable' });
  await AuditLog.create({
    actor_id: req.user.id,
    action: 'admin_security.session_revoked',
    target_type: 'AuthSession',
    target_id: session._id,
    metadata: { session_uuid: session.uuid },
    ip: req.ip,
    user_agent: req.get('user-agent'),
  });
  return res.json({
    success: true,
    message: 'Session revoquee',
    data: { current_session_revoked: session.uuid === req.session.uuid },
  });
};

const revokeOtherSessions = async (req, res) => {
  const result = await AuthSession.updateMany(
    {
      user_id: req.user.id,
      uuid: { $ne: req.session.uuid },
      revoked_at: null,
    },
    {
      $set: {
        revoked_at: new Date(),
        revoked_by: req.user.id,
        revocation_reason: 'other_sessions_revoked',
      },
    }
  );
  res.json({
    success: true,
    message: 'Autres sessions revoquees',
    data: { revoked: result.modifiedCount },
  });
};

const logout = async (req, res) => {
  await AuthSession.updateOne(
    { uuid: req.session.uuid, user_id: req.user.id },
    {
      $set: {
        revoked_at: new Date(),
        revoked_by: req.user.id,
        revocation_reason: 'logout',
      },
    }
  );
  res.json({ success: true, message: 'Deconnexion reussie' });
};

const createAdminStepUp = async (req, res) => {
  try {
    const scope = String(req.body.scope || '');
    const allowedScopes = [
      'collector_review',
      'user_status',
      'payment_refund',
      'service_configuration',
      'business_contract_review',
    ];
    if (!allowedScopes.includes(scope)) {
      return res.status(400).json({ success: false, message: 'Action renforcee invalide' });
    }
    const user = await User.findById(req.user.id)
      .select('+admin_security.totp_secret +admin_security.backup_code_hashes');
    const passwordValid = await bcrypt.compare(
      String(req.body.password || ''),
      user.password_hash
    );
    if (!passwordValid) {
      return res.status(401).json({ success: false, message: 'Mot de passe incorrect' });
    }
    if (user.admin_security?.two_factor_enabled) {
      const verification = await verifyAdminCode(user, req.body.code);
      if (!verification.valid) {
        return res.status(401).json({ success: false, message: 'Code 2FA incorrect' });
      }
    } else if (isAdminTwoFactorRequired()) {
      return res.status(403).json({
        success: false,
        message: 'Activez la double authentification avant cette action',
      });
    }
    const grant = await AdminActionGrant.create({
      uuid: crypto.randomUUID(),
      user_id: user._id,
      session_uuid: req.session.uuid,
      scope,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    });
    const token = createStepUpToken({
      user,
      sessionUuid: req.session.uuid,
      scope,
      grantUuid: grant.uuid,
    });
    await AuditLog.create({
      actor_id: user._id,
      action: 'admin_security.step_up_granted',
      target_type: 'AuthSession',
      target_id: req.session.id,
      metadata: { scope },
      ip: req.ip,
      user_agent: req.get('user-agent'),
    });
    res.json({
      success: true,
      data: { token, expires_in_seconds: 5 * 60 },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  changePassword,
  confirmTwoFactorSetup,
  createAdminStepUp,
  disableTwoFactor,
  enableTwoFactor,
  enrollTwoFactor,
  forgotPassword,
  getMe,
  listSessions,
  login,
  logout,
  register,
  resendVerification,
  resetPassword,
  revokeOtherSessions,
  revokeSession,
  startTwoFactorSetup,
  updateProfile,
  verifyEmail,
  verifyTwoFactorLogin,
};
