// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error(err.message);
        res.status(401).json({ msg: 'Token is not valid', error: err.message });
    }
};
const roleCheck = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ msg: 'Access denied' });
        }
        next();
    };
};

// middleware/verifyMiddleware.js
const verifyMiddleware = (req, res, next) => {
    if (!req.user.isVerified) {
      return res.status(403).json({ msg: 'Email not verified' });
    }
    next();
  };

module.exports = { authMiddleware, roleCheck, verifyMiddleware };
