const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  try {
    const token = req.cookies && req.cookies.token;

    if (!token) {
      return res.status(401).json({
        message: 'No token, authorization denied'
      });
    }

    // JWT_SECRET must be configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');

      return res.status(500).json({
        message: 'Server configuration error'
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded.user;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);

    return res.status(401).json({
      message: 'Token is not valid'
    });
  }
};