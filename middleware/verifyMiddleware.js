// middleware/verifyMiddleware.js
const verifyMiddleware = (req, res, next) => {
    if (!req.user.isVerified) {
      return res.status(403).json({ msg: 'Email not verified' });
    }
    next();
  };
  
  module.exports = verifyMiddleware;
  