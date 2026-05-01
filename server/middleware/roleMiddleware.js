export const authorizeRoles = (...roles) => (req, res, next) => {
  // Admins can do everything
  if (req.user?.role === 'admin') return next();
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Forbidden: insufficient role' });
  }
  next();
};
