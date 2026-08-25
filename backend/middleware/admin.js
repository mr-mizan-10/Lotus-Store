// Must run AFTER the `auth` middleware, which sets req.user
module.exports = function (req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  next();
};
