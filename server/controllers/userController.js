import User from '../models/User.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Notification from '../models/Notification.js';
import Promotion from '../models/Promotion.js';
import { sendEmail } from '../utils/sendEmail.js';

export const getProfile = async (req, res, next) => {
  res.json(req.user);
};

export const updateProfile = async (req, res, next) => {
  try {
    const updates = {};

    if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
    if (req.body.phone !== undefined) updates.phone = String(req.body.phone).trim();
    if (req.body.address !== undefined) updates.address = String(req.body.address).trim();
    if (req.body.profileImage !== undefined) updates.profileImage = String(req.body.profileImage).trim();
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!email) return res.status(400).json({ message: 'Email is required' });
      const exists = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (exists) return res.status(400).json({ message: 'Email already in use' });
      updates.email = email;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).select('-password');
    res.json(user);
  } catch (err) { next(err); }
};

export const changeMyPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }
    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirm password do not match' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const validCurrent = await user.matchPassword(currentPassword);
    if (!validCurrent) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password changed successfully' });
  } catch (err) { next(err); }
};

export const deactivateMyAccount = async (req, res, next) => {
  try {
    if (req.user.role === 'admin') {
      const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (activeAdminCount <= 1) {
        return res.status(400).json({ message: 'Cannot deactivate the last active admin' });
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, { isActive: false }, { new: true }).select('-password');
    res.clearCookie('refreshToken');
    res.json({ message: 'Account deactivated', user });
  } catch (err) { next(err); }
};

export const listUsers = async (req, res, next) => {
  try {
    const { role, active, approved, search, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;
    if (approved === 'true') filter.isApproved = true;
    if (approved === 'false') filter.isApproved = false;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter)
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) { next(err); }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
};

export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'customer', isApproved = false, isActive = true } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already in use' });
    const user = await User.create({ name, email, password, role, isApproved, isActive });
    res.status(201).json(user);
  } catch (err) { next(err); }
};

export const updateUserAdmin = async (req, res, next) => {
  try {
    const updates = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Restrict changing the last active admin to non-admin or inactive
    const activeAdminCount = await User.countDocuments({ role: 'admin', isActive: true });
    if (user.role === 'admin' && activeAdminCount <= 1) {
      if ((updates.role && updates.role !== 'admin') || updates.isActive === false) {
        return res.status(400).json({ message: 'Cannot demote/deactivate the last active admin' });
      }
    }

    Object.assign(user, updates);
    await user.save();
    res.json(user);
  } catch (err) { next(err); }
};

export const approveFarmer = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
    if (user) {
      await Notification.create({ userId: user._id, message: 'Your farmer account has been approved', type: 'farmer' });
      sendEmail({ to: user.email, subject: 'Farmer approved', html: 'Your farmer account is now approved. You can start listing products.' }).catch(() => {});
    }
    res.json(user);
  } catch (err) { next(err); }
};

export const rejectFarmer = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isApproved: false }, { new: true });
    res.json(user);
  } catch (err) { next(err); }
};

export const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    res.json(user);
  } catch (err) { next(err); }
};

export const activateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
    res.json(user);
  } catch (err) { next(err); }
};

export const getUserOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ customerId: req.params.id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) { next(err); }
};

export const dashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, totalFarmers, totalOrders, totalProducts] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'farmer' }),
      Order.countDocuments(),
      Product.countDocuments()
    ]);
    const revenue = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, sum: { $sum: '$totalAmount' } } }
    ]);
    res.json({
      totalUsers,
      totalFarmers,
      totalOrders,
      totalProducts,
      revenue: revenue[0]?.sum || 0
    });
  } catch (err) { next(err); }
};

export const analytics = async (req, res, next) => {
  try {
    const roles = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    const ordersByStatus = await Order.aggregate([{ $group: { _id: '$orderStatus', count: { $sum: 1 } } }]);
    const revenue = await Order.aggregate([
      { $match: { paymentStatus: 'Paid' } },
      { $group: { _id: null, sum: { $sum: '$totalAmount' } } }
    ]);
    const topProducts = await Order.aggregate([
      { $unwind: '$products' },
      { $group: { _id: '$products.productId', qty: { $sum: '$products.quantity' }, revenue: { $sum: '$products.price' } } },
      { $sort: { qty: -1 } },
      { $limit: 5 }
    ]);
    const promoUsage = await Promotion.aggregate([
      { $group: { _id: '$title', usage: { $sum: '$usageCount' } } },
      { $sort: { usage: -1 } },
      { $limit: 5 }
    ]);
    res.json({
      roles,
      ordersByStatus,
      revenue: revenue[0]?.sum || 0,
      topProducts,
      promoUsage
    });
  } catch (err) { next(err); }
};
