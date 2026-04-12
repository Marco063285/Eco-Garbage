const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const PickupRequest = require('../models/PickupRequest');
const Payment = require('../models/Payment');
const Notification = require('../models/Notification');
const WasteCategory = require('../models/WasteCategory');

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
  category_id: r.category_id?._id?.toString() || r.category_id?.toString(),
  category_name: r.category_id?.name,
  category_icon: r.category_id?.icon,
  base_price: r.category_id?.base_price,
  payment_status: payment?.status,
  payment_amount: payment?.amount,
  payment_method: payment?.method,
  rating_score: r.rating_score,
  rating_comment: r.rating_comment,
});

// GET /api/requests
const getRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};

    if (req.user.role === 'user') filter.user_id = req.user.id;
    else if (req.user.role === 'collector') filter.collector_id = req.user.id;
    if (status) filter.status = status;

    const [reqs, total] = await Promise.all([
      PickupRequest.find(filter)
        .populate('user_id', 'name phone')
        .populate('collector_id', 'name')
        .populate('category_id', 'name icon')
        .sort({ created_at: -1 })
        .skip((page - 1) * parseInt(limit))
        .limit(parseInt(limit))
        .lean(),
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
      .populate('collector_id', 'name phone')
      .populate('category_id', 'name icon base_price')
      .lean();
    if (!r) return res.status(404).json({ success: false, message: 'Demande non trouvee' });
    if (req.user.role === 'user' && r.user_id?._id?.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Acces interdit' });

    const payment = await Payment.findOne({ request_id: r._id }).lean();
    res.json({ success: true, data: flattenRequest(r, payment) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/requests
const createRequest = async (req, res) => {
  try {
    const { category_id, address, quantity_estimate, notes, scheduled_at, service_type = 'immediate' } = req.body;
    if (!category_id || !address)
      return res.status(400).json({ success: false, message: 'Categorie et adresse requis' });

    const cat = await WasteCategory.findById(category_id);
    if (!cat) return res.status(404).json({ success: false, message: 'Categorie non trouvee' });

    const uuid = uuidv4();
    await PickupRequest.create({
      uuid, user_id: req.user.id, category_id,
      address, quantity_estimate, notes,
      scheduled_at: scheduled_at || undefined,
      service_type, estimated_price: cat.base_price,
    });

    await Notification.create({
      user_id: req.user.id,
      title: 'Demande recue',
      message: 'Votre demande de collecte a ete enregistree. Nous vous assignons un collecteur.',
      type: 'request',
    });

    res.status(201).json({ success: true, message: 'Demande creee', data: { uuid } });
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
    if (req.user.role === 'collector' && pickupReq.collector_id?.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: 'Acces interdit' });

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

module.exports = { getRequests, getRequestById, createRequest, updateStatus, assignCollector, cancelRequest };