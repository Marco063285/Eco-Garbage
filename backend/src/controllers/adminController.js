const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const PickupRequest = require('../models/PickupRequest');
const Payment = require('../models/Payment');
const Complaint = require('../models/Complaint');
const WasteCategory = require('../models/WasteCategory');

const CM_PHONE_REGEX = /^(\+?237)?[62]\d{8}$/;

// GET /api/admin/dashboard
const getDashboard = async (req, res) => {
  try {
    const [users, collectors, totalReq, completedReq, pendingReq, openComplaints] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'collector' }),
      PickupRequest.countDocuments(),
      PickupRequest.countDocuments({ status: 'completed' }),
      PickupRequest.countDocuments({ status: 'pending' }),
      Complaint.countDocuments({ status: 'open' }),
    ]);

    const revenueResult = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenue = revenueResult[0]?.total || 0;

    const rawRecent = await PickupRequest.find()
      .populate('user_id', 'name')
      .populate('category_id', 'name')
      .sort({ created_at: -1 })
      .limit(8)
      .lean();
    const recentRequests = rawRecent.map(r => ({
      uuid: r.uuid, status: r.status, service_type: r.service_type,
      estimated_price: r.estimated_price, created_at: r.created_at,
      user_name: r.user_id?.name, category_name: r.category_id?.name,
    }));

    const rawCollectors = await User.find({ role: 'collector' })
      .select('name collector_profile')
      .sort({ 'collector_profile.total_collections': -1 })
      .limit(5).lean();
    const topCollectors = rawCollectors.map(c => ({
      name: c.name,
      total_collections: c.collector_profile?.total_collections || 0,
      rating_avg: c.collector_profile?.rating_avg || 0,
    }));

    res.json({
      success: true,
      data: {
        stats: { users, collectors, totalRequests: totalReq, completedRequests: completedReq, pendingRequests: pendingReq, revenue, openComplaints },
        recentRequests, topCollectors,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// GET /api/admin/users
const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 15, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
    const [rows, total] = await Promise.all([
      User.find(filter).select('-password_hash').sort({ created_at: -1 })
        .skip((page - 1) * parseInt(limit)).limit(parseInt(limit)).lean(),
      User.countDocuments(filter),
    ]);
    const users = rows.map(u => ({ ...u, id: u._id.toString() }));
    res.json({ success: true, data: users, pagination: { total, page: parseInt(page) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/admin/users/:id/status
const toggleUserStatus = async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean')
      return res.status(400).json({ success: false, message: 'Valeur is_active invalide' });
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'ID utilisateur invalide' });
    const updated = await User.findByIdAndUpdate(req.params.id, { $set: { is_active } });
    if (!updated)
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    res.json({ success: true, message: is_active ? 'Compte activé' : 'Compte suspendu' });
  } catch (err) {
    console.error('toggleUserStatus error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// GET /api/admin/complaints
const getComplaints = async (req, res) => {
  try {
    const raw = await Complaint.find()
      .populate('user_id', 'name email')
      .populate('request_id', 'uuid')
      .sort({ created_at: -1 }).lean();
    const rows = raw.map(c => ({
      ...c, id: c._id.toString(),
      user_name: c.user_id?.name, user_email: c.user_id?.email,
      request_uuid: c.request_id?.uuid,
      user_id: c.user_id?._id?.toString(), request_id: c.request_id?._id?.toString(),
    }));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/admin/complaints/:uuid
const respondComplaint = async (req, res) => {
  try {
    const { status, admin_response } = req.body;
    await Complaint.findOneAndUpdate({ uuid: req.params.uuid }, { $set: { status, admin_response } });
    res.json({ success: true, message: 'Reclamation mise a jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// GET /api/admin/reports
const getReports = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    const days = period === 'week' ? 7 : period === 'year' ? 365 : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [byCategory, byStatus, dailyRevenue] = await Promise.all([
      PickupRequest.aggregate([
        { $match: { created_at: { $gte: since }, status: 'completed' } },
        { $lookup: { from: 'wastecategories', localField: 'category_id', foreignField: '_id', as: 'category' } },
        { $unwind: '$category' },
        { $group: { _id: '$category._id', name: { $first: '$category.name' }, count: { $sum: 1 }, revenue: { $sum: '$estimated_price' } } },
        { $project: { _id: 0, name: 1, count: 1, revenue: 1 } },
      ]),
      PickupRequest.aggregate([
        { $match: { created_at: { $gte: since } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $project: { _id: 0, status: '$_id', count: 1 } },
      ]),
      Payment.aggregate([
        { $match: { status: 'completed', paid_at: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$paid_at' } }, amount: { $sum: '$amount' } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, date: '$_id', amount: 1 } },
      ]),
    ]);

    res.json({ success: true, data: { byCategory, byStatus, dailyRevenue } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// GET /api/admin/categories
const getCategories = async (req, res) => {
  try {
    const rows = await WasteCategory.find().sort({ name: 1 }).lean();
    const data = rows.map(c => ({ ...c, id: c._id.toString() }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/admin/categories
const createCategory = async (req, res) => {
  try {
    const { name, description, icon, base_price, is_hazardous, is_recyclable } = req.body;
    await WasteCategory.create({ name, description, icon, base_price, is_hazardous: is_hazardous || false, is_recyclable: is_recyclable || false });
    res.status(201).json({ success: true, message: 'Categorie creee' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// PUT /api/admin/categories/:id
const updateCategory = async (req, res) => {
  try {
    const { name, description, icon, base_price, is_hazardous, is_recyclable, is_active } = req.body;
    await WasteCategory.findByIdAndUpdate(req.params.id, { $set: { name, description, icon, base_price, is_hazardous, is_recyclable, is_active } });
    res.json({ success: true, message: 'Categorie mise a jour' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// POST /api/admin/users
const createUser = async (req, res) => {
  try {
    const { name, email, phone, role, password } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ success: false, message: 'Nom, email, mot de passe et rôle requis' });
    if (!['user', 'collector', 'admin'].includes(role))
      return res.status(400).json({ success: false, message: 'Rôle invalide' });    if (phone) {
      const cleaned = phone.replace(/[\s\-().]/g, '');
      if (!CM_PHONE_REGEX.test(cleaned))
        return res.status(400).json({ success: false, message: 'Numero de telephone camerounais invalide' });
    }    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing)
      return res.status(409).json({ success: false, message: 'Cet email est déjà utilisé' });
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      uuid: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || undefined,
      password_hash,
      role,
      is_verified: true,
      is_active: true,
      collector_profile: role === 'collector' ? { is_available: true } : undefined,
    });
    res.status(201).json({ success: true, message: 'Utilisateur créé', data: { id: user._id.toString() } });
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// DELETE /api/admin/users/:id
const deleteUser = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id))
      return res.status(400).json({ success: false, message: 'ID utilisateur invalide' });
    const user = await User.findById(req.params.id);
    if (!user)
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    if (user.role === 'admin')
      return res.status(403).json({ success: false, message: 'Impossible de supprimer un administrateur' });
    // Check for active requests
    const activeReqs = await PickupRequest.countDocuments({
      $or: [{ user_id: user._id }, { collector_id: user._id }],
      status: { $in: ['assigned', 'on_way', 'in_progress'] },
    });
    if (activeReqs > 0)
      return res.status(400).json({ success: false, message: 'Cet utilisateur a des collectes en cours. Terminez-les d\'abord.' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

module.exports = { getDashboard, getUsers, toggleUserStatus, createUser, deleteUser, getComplaints, respondComplaint, getReports, getCategories, createCategory, updateCategory };