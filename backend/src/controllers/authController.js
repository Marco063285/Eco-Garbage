const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { sendVerificationEmail } = require('../services/emailService');

const generateToken = (user) =>
  jwt.sign(
    { id: user.id || user._id.toString(), uuid: user.uuid, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, phone, password, role = 'user' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Champs requis manquants' });
    if (!['user', 'collector'].includes(role))
      return res.status(400).json({ success: false, message: 'Role invalide' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing)
      return res.status(409).json({ success: false, message: 'Email deja utilise' });

    const hash = await bcrypt.hash(password, 10);
    const uuid = uuidv4();
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const userData = {
      uuid, name, email, phone: phone || undefined, password_hash: hash, role,
      email_verification_token: verificationToken,
      email_verification_expires: verificationExpires,
    };
    if (role === 'collector') {
      userData.collector_profile = { is_available: false, rating_avg: 0, total_collections: 0 };
    }

    const userDoc = await User.create(userData);

    await Notification.create({
      user_id: userDoc._id,
      title: 'Bienvenue sur EcoGarbage !',
      message: `Bonjour ${name}, votre compte a ete cree avec succes. Verifiez votre email pour activer votre compte.`,
      type: 'welcome',
    });

    // Send verification email (non-blocking — don't fail registration if email fails)
    try {
      await sendVerificationEmail(email, name, verificationToken);
    } catch (mailErr) {
      console.error('Email verification send error:', mailErr);
    }

    res.status(201).json({ success: true, message: 'Compte cree. Verifiez votre email pour activer votre compte.' });
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email et mot de passe requis' });

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

    const obj = userDoc.toObject({ virtuals: true });
    const { password_hash, ...safeUser } = obj;
    const token = generateToken(safeUser);
    res.json({ success: true, message: 'Connexion reussie', data: { token, user: safeUser } });
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const userDoc = await User.findById(req.user.id).select('-password_hash').lean({ virtuals: true });
    if (!userDoc) return res.status(404).json({ success: false, message: 'Utilisateur non trouve' });
    res.json({ success: true, data: userDoc });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await User.findByIdAndUpdate(req.user.id, { $set: { name, phone, address } });
    res.json({ success: true, message: 'Profil mis a jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/auth/password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userDoc = await User.findById(req.user.id);
    const valid = await bcrypt.compare(currentPassword, userDoc.password_hash);
    if (!valid) return res.status(400).json({ success: false, message: 'Mot de passe actuel incorrect' });
    const hash = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(req.user.id, { $set: { password_hash: hash } });
    res.json({ success: true, message: 'Mot de passe modifie' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// GET /api/auth/verify-email?token=...
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

module.exports = { register, login, getMe, updateProfile, changePassword, verifyEmail };