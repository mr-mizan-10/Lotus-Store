const { v4: uuidv4 } = require('uuid');
const logger = require('../logger');

module.exports = function (req, res, next) {
  try {
    const incoming = req.headers['x-request-id'];
    const id = incoming && typeof incoming === 'string' ? incoming : uuidv4();
    req.requestId = id;
    // create a child logger bound to this request id
    try {
      req.logger = logger.child({ requestId: id });
    } catch (e) {
      req.logger = logger;
    }
    res.setHeader('X-Request-Id', id);
  } catch (err) {
    // ignore
    req.logger = logger;
  }
  next();
};
