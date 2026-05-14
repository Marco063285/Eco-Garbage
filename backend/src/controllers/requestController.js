const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const PickupRequest = require('../models/PickupRequest');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const WasteCategory = require('../models/WasteCategory');
const { haversineDistance, calculateEstimatedPrice, MAX_SEARCH_RADIUS_KM } = require('../utils/geo');

const flattenRequest = (r, payment) => ({
  ...r,
  id: r._id?.toString(),
  user_id: r.user_id?._id?.toString() || r.user_id?.toString(),
  user_name: r.user_id?.name,
  user_phone: r.user_id?.phone,
  user_email: r.user_id?.email,
  collector_id: r.collector_id?._id?.toString() || r.collector_id?.toString(),
  collector_name: r.collector_id?.name,
  collector_phone: r.collector_id?.phone,
  collector_avatar_url: r.collector_id?.avatar_url,
  category_id: r.category_id?._id?.toString() || r.category_id?.toString(),
  category_name: r.category_id?.name,
  category_icon: r.category_id?.icon,
  base_price: r.category_id?.base_price,
  distance_km: r.distance_km,
  quantity_number: r.quantity_number,
  payment_status: payment?.status,
  payment_amount: payment?.amount,
  payment_method: payment?.method,
  collector_location: r.collector_location || null,
  rating_score: r.rating_score,
  rating_comment: r.rating_comment,
});

// GET /api/requests
const getRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, archived = 'false' } = req.query;
    const filter = {};

    if (req.user.role === 'user') filter.user_id = req.user.id;
    else if (req.user.role === 'collector') filter.collector_id = req.user.id;
    if (status) filter.status = status;
    filter.is_archived = archived === 'true';

    const [reqs, total] = await Promise.all([
      PickupRequest.find(filter)
        .populate('user_id', 'name phone')
        .populate('collector_id', 'name phone avatar_url')
        .populate('category_id', 'name icon')
        .sort({ created_at: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean({ virtuals: false, getters: true }),
      PickupRequest.countDocuments(filter),
    ]);

    const reqIds = reqs.map(r => r._id);
    const payments = await Payment.find({ request_id: { $in: reqIds } }).lean();
    const payMap = {};
    payments.forEach(p => { payMap[p.request_id.toString()] = p; });

    const data = reqs.map(r => flattenRequest(r, payMap[r._id.toString()]));
    res.json({ success: true, data, pagination: { total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// GET /api/requests/:uuid
const getRequestById = async (req, res) => {
  try {
    const r = await PickupRequest.findOne({ uuid: req.params.uuid })
      .populate('user_id', 'name phone email')
      .populate('collector_id')
      .populate('category_id', 'name icon base_price')
      .lean({ virtuals: false, getters: true });
    if (!r) return res.status(404).json({ success: false, message: 'Demande non trouvee' });
    if (req.user.role === 'user' && r.user_id?._id?.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Acces interdit' });

    const payment = await Payment.findOne({ request_id: r._id }).lean();
    res.json({ success: true, data: flattenRequest(r, payment) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// Helper: find nearest available collector
const findNearestCollector = async (latitude, longitude) => {
  if (!latitude || !longitude) return null;

  // Try geospatial $near query first (requires collectors with location set)
  const collectorsWithGeo = await User.find({
    role: 'collector',
    is_active: true,
    'collector_profile.is_available': true,
    'collector_profile.location.coordinates': { $ne: [0, 0] },
  }).lean();

  if (collectorsWithGeo.length === 0) return null;

  // Calculate distance for each collector and pick the closest
  let nearest = null;
  let minDistance = Infinity;

  for (const collector of collectorsWithGeo) {
    const [cLng, cLat] = collector.collector_profile.location.coordinates;
    if (cLat === 0 && cLng === 0) continue;
    const dist = haversineDistance(latitude, longitude, cLat, cLng);
    if (dist < minDistance && dist <= MAX_SEARCH_RADIUS_KM) {
      minDistance = dist;
      nearest = collector;
    }
  }

  return nearest ? { collector: nearest, distance_km: Math.round(minDistance * 100) / 100 } : null;
};

// POST /api/requests
const createRequest = async (req, res) => {
  try {
    const {
      category_id, address, quantity_estimate, notes,
      scheduled_at, service_type = 'immediate',
      latitude, longitude, quantity_number = 1,
    } = req.body;

    if (!category_id || !address)
      return res.status(400).json({ success: false, message: 'Categorie et adresse requis' });

    const cat = await WasteCategory.findById(category_id);
    if (!cat) return res.status(404).json({ success: false, message: 'Categorie non trouvee' });

    const uuid = uuidv4();
    const qty = Math.max(1, parseInt(quantity_number) || 1);

    // Auto-assign nearest collector if coordinates provided
    let collector_id = null;
    let distance_km = null;
    let assignedStatus = 'pending';
    let estimated_price = cat.base_price;

    const assignment = await findNearestCollector(latitude, longitude);

    if (assignment) {
      collector_id = assignment.collector._id;
      distance_km = assignment.distance_km;
      assignedStatus = 'assigned';
      estimated_price = calculateEstimatedPrice(cat.base_price, qty, distance_km);
    } else {
      // No collector found, still calculate price with 0 distance
      estimated_price = calculateEstimatedPrice(cat.base_price, qty, 0);
    }

    const request = await PickupRequest.create({
      uuid, user_id: req.user.id, category_id,
      address, quantity_estimate, quantity_number: qty, notes,
      latitude, longitude, distance_km,
      scheduled_at: scheduled_at || undefined,
      service_type, estimated_price,
      collector_id, status: assignedStatus,
    });

    // Notify user
    await Notification.create({
      user_id: req.user.id,
      title: collector_id ? 'Collecteur assigne !' : 'Demande recue',
      message: collector_id
        ? `Un collecteur (${assignment.collector.name}) a ete assigne. Il est a ${distance_km} km. Prix estime: ${estimated_price.toLocaleString()} FCFA`
        : 'Votre demande de collecte a ete enregistree. Nous recherchons un collecteur disponible.',
      type: 'request',
    });

    // Notify assigned collector
    if (collector_id) {
      await Notification.create({
        user_id: collector_id,
        title: 'Nouvelle mission !',
        message: `Vous avez une nouvelle collecte a ${address}. Distance: ${distance_km} km. Montant: ${estimated_price.toLocaleString()} FCFA`,
        type: 'request',
      });
    }

    res.status(201).json({
      success: true,
      message: collector_id ? 'Demande creee — collecteur assigne automatiquement' : 'Demande creee',
      data: {
        uuid,
        status: assignedStatus,
        collector_name: assignment?.collector?.name || null,
        collector_phone: assignment?.collector?.phone || null,
        distance_km,
        estimated_price,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/requests/:uuid/status
const updateStatus = async (req, res) => {
  try {
    const { status, proof_url } = req.body;
    const validStatuses = ['approved', 'assigned', 'on_way', 'in_progress', 'completed', 'cancelled', 'failed'];
    if (!validStatuses.includes(status))
      return res.status(400).json({ success: false, message: 'Statut invalide' });

    const pickupReq = await PickupRequest.findOne({ uuid: req.params.uuid });
    if (!pickupReq) return res.status(404).json({ success: false, message: 'Demande non trouvee' });

    if (req.user.role === 'collector') {
      if (status === 'assigned' && !pickupReq.collector_id) {
        const acceptedRequest = await PickupRequest.findOneAndUpdate(
          { uuid: req.params.uuid, status: 'pending', collector_id: null },
          { $set: { status: 'assigned', collector_id: req.user.id } },
          { new: true }
        );
        if (!acceptedRequest) {
          return res.status(409).json({ success: false, message: 'Cette demande a deja ete acceptee ou n est plus disponible.' });
        }
        await Notification.create({
          user_id: pickupReq.user_id,
          title: 'Collecteur assigne',
          message: 'Un collecteur a accepte votre demande et se prepare a venir a votre adresse.',
          type: 'update',
        });
        return res.json({ success: true, message: 'Demande acceptee. Vous etes desormais assigne.' });
      }

      if (!pickupReq.collector_id || pickupReq.collector_id.toString() !== req.user.id)
        return res.status(403).json({ success: false, message: 'Acces interdit' });
    }

    const updates = { status };
    if (status === 'completed') {
      updates.collected_at = new Date();
      updates.final_price = pickupReq.estimated_price;
      const existingPayment = await Payment.findOne({ request_id: pickupReq._id });
      if (!existingPayment) {
        await Payment.create({
          uuid: uuidv4(), request_id: pickupReq._id,
          user_id: pickupReq.user_id, amount: pickupReq.estimated_price, status: 'pending',
        });
      }
      if (pickupReq.collector_id) {
        const User = require('../models/User');
        await User.findByIdAndUpdate(pickupReq.collector_id, {
          $inc: { 'collector_profile.total_collections': 1 },
        });
      }
    }
    if (proof_url) updates.proof_url = proof_url;
    await PickupRequest.findByIdAndUpdate(pickupReq._id, { $set: updates });

    const statusMessages = {
      approved: 'Votre demande de collecte a ete approuvee. Un collecteur sera bientot assigne.',
      assigned: 'Un collecteur a ete assigne a votre demande.',
      on_way: 'Votre collecteur est en route !',
      completed: 'Collecte terminee avec succes ! Pensez a noter votre collecteur.',
      cancelled: 'Votre demande a ete annulee.',
    };
    if (statusMessages[status]) {
      await Notification.create({
        user_id: pickupReq.user_id,
        title: `Collecte ${status}`,
        message: statusMessages[status],
        type: 'update',
      });
    }
    res.json({ success: true, message: 'Statut mis a jour' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/requests/:uuid/assign
const assignCollector = async (req, res) => {
  try {
    const { collector_id } = req.body;
    await PickupRequest.findOneAndUpdate(
      { uuid: req.params.uuid },
      { $set: { collector_id, status: 'assigned' } }
    );
    res.json({ success: true, message: 'Collecteur assigne' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// DELETE /api/requests/:uuid
const cancelRequest = async (req, res) => {
  try {
    const pickupReq = await PickupRequest.findOne({ uuid: req.params.uuid, user_id: req.user.id });
    if (!pickupReq) return res.status(404).json({ success: false, message: 'Demande non trouvee' });
    if (['completed', 'cancelled', 'in_progress'].includes(pickupReq.status))
      return res.status(400).json({ success: false, message: 'Impossible d annuler cette demande' });
    await PickupRequest.findByIdAndUpdate(pickupReq._id, { $set: { status: 'cancelled' } });
    res.json({ success: true, message: 'Demande annulee' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/requests/estimate — get price estimate before creating request
const estimatePrice = async (req, res) => {
  try {
    const { category_id, latitude, longitude, quantity_number = 1 } = req.body;

    if (!category_id)
      return res.status(400).json({ success: false, message: 'Categorie requise' });

    const cat = await WasteCategory.findById(category_id);
    if (!cat) return res.status(404).json({ success: false, message: 'Categorie non trouvee' });

    const qty = Math.max(1, parseInt(quantity_number) || 1);
    const assignment = await findNearestCollector(latitude, longitude);
    const distance_km = assignment?.distance_km || 0;
    const price = calculateEstimatedPrice(cat.base_price, qty, distance_km);

    res.json({
      success: true,
      data: {
        base_price: cat.base_price,
        quantity: qty,
        distance_km,
        estimated_price: price,
        collector_found: !!assignment,
        collector_name: assignment?.collector?.name || null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({ success: false, message: 'Latitude et longitude valides requis' });
    }

    const pickupReq = await PickupRequest.findOne({ uuid: req.params.uuid });
    if (!pickupReq) return res.status(404).json({ success: false, message: 'Demande non trouvee' });
    if (!pickupReq.collector_id || pickupReq.collector_id.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Acces interdit' });

    await PickupRequest.findByIdAndUpdate(pickupReq._id, {
      $set: {
        collector_location: {
          latitude,
          longitude,
          updated_at: new Date(),
        },
      },
    });

    res.json({ success: true, message: 'Position actualisee' });
  } catch (err) {
    console.error('updateLocation error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/requests/:uuid/archive
const archiveRequest = async (req, res) => {
  try {
    const pickupReq = await PickupRequest.findOne({ uuid: req.params.uuid });
    if (!pickupReq) return res.status(404).json({ success: false, message: 'Demande non trouvee' });

    // Vérifier les permissions
    if (req.user.role === 'user' && pickupReq.user_id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Acces interdit' });
    }
    if (req.user.role === 'collector' && pickupReq.collector_id?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Acces interdit - Vous ne pouvez archiver que vos propres collectes' });
    }

    if (!['completed', 'cancelled', 'failed'].includes(pickupReq.status)) {
      return res.status(400).json({ success: false, message: 'Seules les demandes completes, annulees ou echouees peuvent etre archivees' });
    }

    await PickupRequest.findByIdAndUpdate(pickupReq._id, {
      $set: { is_archived: true, archived_at: new Date() }
    });

    res.json({ success: true, message: 'Demande archivee avec succes' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/requests/:uuid/restore
const restoreRequest = async (req, res) => {
  try {
    const pickupReq = await PickupRequest.findOne({ uuid: req.params.uuid });
    if (!pickupReq) return res.status(404).json({ success: false, message: 'Demande non trouvee' });

    // Vérifier les permissions
    if (req.user.role === 'user' && pickupReq.user_id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Acces interdit' });
    }
    if (req.user.role === 'collector' && pickupReq.collector_id?.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Acces interdit - Vous ne pouvez restaurer que vos propres collectes' });
    }

    if (!pickupReq.is_archived) {
      return res.status(400).json({ success: false, message: 'Cette demande n est pas archivee' });
    }

    await PickupRequest.findByIdAndUpdate(pickupReq._id, {
      $set: { is_archived: false, archived_at: null }
    });

    res.json({ success: true, message: 'Demande restauree avec succes' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getRequests, getRequestById, createRequest, updateStatus, assignCollector, cancelRequest, updateLocation, archiveRequest, restoreRequest, estimatePrice };