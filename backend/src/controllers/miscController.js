const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const PickupRequest = require('../models/PickupRequest');
const Rating = require('../models/Rating');
const Complaint = require('../models/Complaint');
const Payment = require('../models/Payment');
const WasteCategory = require('../models/WasteCategory');
const User = require('../models/User');

// ========== NOTIFICATIONS ==========

const getNotifications = async (req, res) => {
  try {
    const [rows, unreadCount] = await Promise.all([
      Notification.find({ user_id: req.user.id }).sort({ created_at: -1 }).limit(50).lean({ virtuals: true }),
      Notification.countDocuments({ user_id: req.user.id, is_read: false }),
    ]);
    res.json({ success: true, data: rows, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ user_id: req.user.id }, { $set: { is_read: true } });
    res.json({ success: true, message: 'Notifications marquees comme lues' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ========== RATINGS ==========

const createRating = async (req, res) => {
  try {
    const { request_uuid, score, comment } = req.body;
    if (!score || score < 1 || score > 5)
      return res.status(400).json({ success: false, message: 'Note entre 1 et 5 requise' });

    const pickupReq = await PickupRequest.findOne({ uuid: request_uuid, user_id: req.user.id, status: 'completed' });
    if (!pickupReq)
      return res.status(404).json({ success: false, message: 'Demande non trouvee ou non completee' });

    await Rating.findOneAndUpdate(
      { request_id: pickupReq._id },
      { $set: { user_id: req.user.id, collector_id: pickupReq.collector_id, score, comment } },
      { upsert: true }
    );

    // Compute average in DB instead of loading all ratings into memory
    const [avgResult] = await Rating.aggregate([
      { $match: { collector_id: pickupReq.collector_id } },
      { $group: { _id: null, avg: { $avg: '$score' } } },
    ]);
    const avg = avgResult?.avg || 0;
    await User.findByIdAndUpdate(pickupReq.collector_id, {
      $set: { 'collector_profile.rating_avg': parseFloat(avg.toFixed(2)) },
    });

    res.json({ success: true, message: 'Note enregistree' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ========== COMPLAINTS ==========

const createComplaint = async (req, res) => {
  try {
    const { request_uuid, type, description } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Description requise' });

    let request_id;
    if (request_uuid) {
      const r = await PickupRequest.findOne({ uuid: request_uuid });
      if (r) request_id = r._id;
    }

    const uuid = uuidv4();
    await Complaint.create({ uuid, user_id: req.user.id, request_id, type: type || 'other', description });
    res.status(201).json({ success: true, message: 'Reclamation enregistree', data: { uuid } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const getMyComplaints = async (req, res) => {
  try {
    const rows = await Complaint.find({ user_id: req.user.id }).sort({ created_at: -1 }).lean({ virtuals: true });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ========== PAYMENTS ==========

const getPayments = async (req, res) => {
  try {
    const raw = await Payment.find({ user_id: req.user.id })
      .populate({ path: 'request_id', select: 'uuid category_id', populate: { path: 'category_id', select: 'name' } })
      .sort({ created_at: -1 }).lean();
    const rows = raw.map(p => ({
      ...p, id: p._id.toString(),
      request_uuid: p.request_id?.uuid,
      category_name: p.request_id?.category_id?.name,
      request_id: p.request_id?._id?.toString(),
    }));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const payRequest = async (req, res) => {
  try {
    const { payment_uuid, method } = req.body;
    await Payment.findOneAndUpdate(
      { uuid: payment_uuid, user_id: req.user.id },
      { $set: { status: 'completed', method, paid_at: new Date(), transaction_ref: `TXN-${Date.now()}` } }
    );
    res.json({ success: true, message: 'Paiement enregistre' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ========== CATEGORIES (public) ==========

// Simple in-process TTL cache — categories change rarely
let _categoriesCache = null;
let _categoriesCachedAt = 0;
const CATEGORIES_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getCategories = async (req, res) => {
  try {
    if (_categoriesCache && Date.now() - _categoriesCachedAt < CATEGORIES_TTL_MS) {
      return res.json({ success: true, data: _categoriesCache });
    }
    const rows = await WasteCategory.find({ is_active: true }).sort({ name: 1 }).lean();
    _categoriesCache = rows.map(c => ({ ...c, id: c._id.toString() }));
    _categoriesCachedAt = Date.now();
    res.json({ success: true, data: _categoriesCache });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ========== COLLECTOR ==========

const getCollectorTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { collector_id: req.user.id };
    if (status) filter.status = status;
    const [raw, total] = await Promise.all([
      PickupRequest.find(filter)
        .populate('user_id', 'name phone')
        .populate('category_id', 'name icon')
        .sort({ created_at: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      PickupRequest.countDocuments(filter),
    ]);
    const rows = raw.map(r => ({
      ...r, id: r._id.toString(),
      user_name: r.user_id?.name, user_phone: r.user_id?.phone,
      category_name: r.category_id?.name, category_icon: r.category_id?.icon,
      user_id: r.user_id?._id?.toString(), category_id: r.category_id?._id?.toString(),
    }));
    res.json({ success: true, data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const getAvailableCollectorRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const filter = { status: 'pending', collector_id: null };
    const [raw, total] = await Promise.all([
      PickupRequest.find(filter)
        .populate('user_id', 'name phone')
        .populate('category_id', 'name icon')
        .sort({ created_at: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      PickupRequest.countDocuments(filter),
    ]);

    const rows = raw.map(r => ({
      ...r, id: r._id.toString(),
      user_name: r.user_id?.name, user_phone: r.user_id?.phone,
      category_name: r.category_id?.name, category_icon: r.category_id?.icon,
      user_id: r.user_id?._id?.toString(), category_id: r.category_id?._id?.toString(),
    }));

    res.json({ success: true, data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const updateCollectorAvailability = async (req, res) => {
  try {
    const { is_available } = req.body;
    await User.findByIdAndUpdate(req.user.id, { $set: { 'collector_profile.is_available': is_available } });
    res.json({ success: true, message: is_available ? 'Vous etes maintenant disponible' : 'Vous etes maintenant indisponible' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const updateCollectorLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude == null || longitude == null)
      return res.status(400).json({ success: false, message: 'Coordonnees requises' });
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)
      return res.status(400).json({ success: false, message: 'Coordonnees invalides' });

    await User.findByIdAndUpdate(req.user.id, {
      $set: {
        'collector_profile.location': { type: 'Point', coordinates: [longitude, latitude] },
        'collector_profile.last_location_update': new Date(),
      },
    });
    res.json({ success: true, message: 'Position mise a jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const getCollectorStats = async (req, res) => {
  try {
    const collectorOid = new mongoose.Types.ObjectId(req.user.id);
    // Run all three queries in parallel; sum final_price directly on PickupRequest
    // to avoid an expensive Payment→PickupRequest join across the full payments collection
    const [user, completed, earningsResult] = await Promise.all([
      User.findById(req.user.id).select('collector_profile').lean(),
      PickupRequest.countDocuments({ collector_id: req.user.id, status: 'completed' }),
      PickupRequest.aggregate([
        { $match: { collector_id: collectorOid, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$final_price' } } },
      ]),
    ]);
    const profile = user?.collector_profile || {};
    const earnings = earningsResult[0]?.total || 0;
    res.json({ success: true, data: { profile, completed, earnings } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = {
  getNotifications, markAllRead,
  createRating, createComplaint, getMyComplaints,
  getPayments, payRequest, getCategories,
  getCollectorTasks, getAvailableCollectorRequests, updateCollectorAvailability, updateCollectorLocation, getCollectorStats,
};