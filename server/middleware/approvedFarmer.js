export const approvedFarmerOnly = (req, res, next) => {
  if (req.user?.role === 'admin') return next(); // admins bypass
  if (req.user?.role !== 'farmer') {
    return res.status(403).json({ message: 'Forbidden: farmer only' });
  }
  if (!req.user.isApproved) {
    return res.status(403).json({ message: 'Farmer not approved yet' });
  }
  next();
};
