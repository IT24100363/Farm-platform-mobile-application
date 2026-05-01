import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const generateToken = (id, secret, expiresIn) => jwt.sign({ id }, secret, { expiresIn });

export const register = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, role, phone, isApproved: role === 'farmer' ? false : true });
    const accessToken = generateToken(user._id, process.env.JWT_SECRET, '1h');
    const refreshToken = generateToken(user._id, process.env.JWT_REFRESH_SECRET, '7d');
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ user, accessToken });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await user.matchPassword(password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });
    if (user.role === 'farmer' && !user.isApproved) return res.status(403).json({ message: 'Farmer awaiting approval' });
    const accessToken = generateToken(user._id, process.env.JWT_SECRET, '1h');
    const refreshToken = generateToken(user._id, process.env.JWT_REFRESH_SECRET, '7d');
    res.cookie('refreshToken', refreshToken, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user: await User.findById(user._id).select('-password'), accessToken });
  } catch (err) {
    next(err);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const accessToken = generateToken(req.refreshUser._id, process.env.JWT_SECRET, '1h');
    res.json({ accessToken });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ message: 'Logged out' });
};
