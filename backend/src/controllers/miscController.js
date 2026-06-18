const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const PickupRequest = require('../models/PickupRequest');
const Rating = require('../models/Rating');
const Complaint = require('../models/Complaint');
const WasteCategory = require('../models/WasteCategory');
const User = require('../models/User');
const { isVehicleCompatible } = require('../services/assignmentService');
const { hasValidHazardousCertification } = require('../utils/collectorCertification');



const getNotifications = async (req, res) => {
  try {
    const [rows, unreadCount] = await Promise.all([
      Notification.find({ user_id: req.user.id })
        .select('title message type is_read created_at')
        .sort({ created_at: -1 })
        .limit(50)
        .lean({ virtuals: true }),
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
      { upsert: true, runValidators: true }
    );
    await PickupRequest.findByIdAndUpdate(pickupReq._id, {
      $set: {
        rating_score: score,
        rating_comment: String(comment || '').trim().slice(0, 500),
      },
    });


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



const createComplaint = async (req, res) => {
  try {
    const { request_uuid, type, description } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Description requise' });

    let request_id;
    if (request_uuid) {
      const r = await PickupRequest.findOne({ uuid: request_uuid, user_id: req.user.id });
      if (!r) {
        return res.status(404).json({ success: false, message: 'Collecte associee introuvable' });
      }
      request_id = r._id;
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



let _categoriesCache = null;
let _categoriesCachedAt = 0;
const CATEGORIES_TTL_MS = 5 * 60 * 1000; // 5 minutes
const invalidateCategoriesCache = () => {
  _categoriesCache = null;
  _categoriesCachedAt = 0;
};

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



const getCollectorTasks = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, archived = 'false' } = req.query;
    const filter = { collector_id: req.user.id, is_archived: archived === 'true' };
    if (status) filter.status = status;
    const [raw, total, collector] = await Promise.all([
      PickupRequest.find(filter)
        .populate('user_id', 'name phone')
        .populate('category_id', 'name icon is_hazardous')
        .sort({ created_at: -1 })
        .skip((parseInt(page) - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
      PickupRequest.countDocuments(filter),
    ]);
    const rows = raw.map(r => ({
      ...r, id: r._id.toString(),
      user_name: r.user_id?.name,
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
      User.findById(req.user.id)
        .select('collector_profile.vehicle_type collector_profile.hazardous_certification')
        .lean(),
    ]);

    const vehicleType = collector?.collector_profile?.vehicle_type || 'foot';
    const rows = raw.map(r => ({
      id: r._id.toString(),
      uuid: r.uuid,
      status: r.status,
      user_name: 'Client EcoGarbage',
      address: Number.isFinite(r.latitude) && Number.isFinite(r.longitude)
        ? `Zone approximative (${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)})`
        : 'Zone masquee jusqu a acceptation',
      category_name: r.category_id?.name, category_icon: r.category_id?.icon,
      category_id: r.category_id?._id?.toString(),
      quantity_number: r.quantity_number,
      quantity_estimate: r.quantity_estimate,
      estimated_price: r.estimated_price,
      service_type: r.service_type,
      vehicle_compatible: isVehicleCompatible({
        vehicleType,
        quantity: r.quantity_number,
        serviceType: r.service_type,
        isHazardous: Boolean(r.category_id?.is_hazardous),
        hazardousCertified: hasValidHazardousCertification(collector),
      }),
      scheduled_at: r.scheduled_at,
      created_at: r.created_at,
    }));

    res.json({ success: true, data: rows, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const updateCollectorAvailability = async (req, res) => {
  try {
    const { is_available } = req.body;
    if (typeof is_available !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Disponibilite invalide' });
    }
    if (is_available) {
      const collector = await User.findById(req.user.id)
        .select('collector_profile.verification_status collector_profile.verification_expires_at')
        .lean();
      const verificationExpired = collector?.collector_profile?.verification_expires_at
        && collector.collector_profile.verification_expires_at <= new Date();
      if (
        collector?.collector_profile?.verification_status !== 'verified'
        || verificationExpired
      ) {
        return res.status(403).json({
          success: false,
          message: 'Renouvelez votre verification avant de vous rendre disponible.',
        });
      }
    }
    const result = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { 'collector_profile.is_available': is_available } },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({ success: false, message: 'Collecteur non trouve' });
    }
    res.json({ success: true, message: is_available ? 'Vous etes maintenant disponible' : 'Vous etes maintenant indisponible' });
  } catch (err) {
    console.error('Erreur updateCollectorAvailability:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur: ' + (err.message || 'Impossible de mettre a jour votre disponibilite') });
  }
};

const updateCollectorLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number')
      return res.status(400).json({ success: false, message: 'Coordonnées doivent être des nombres' });
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
  getCategories, invalidateCategoriesCache,
  getCollectorTasks, getAvailableCollectorRequests, updateCollectorAvailability, updateCollectorLocation, getCollectorStats,
};
