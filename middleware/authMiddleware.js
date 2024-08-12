// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const PERMISSION_LEVELS = require('../utils/permissionLevels');

// Middleware to authenticate the token
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded JWT:", decoded); // Debugging log
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification failed:', err.message);
        res.status(401).json({ msg: 'Token is not valid', error: err.message });
    }
};

const roleCheck = (requiredPermissionLevel) => {
    return (req, res, next) => {
        if (req.user.permissionLevel < requiredPermissionLevel) {
            return res.status(403).json({ msg: 'Access denied' });
        }
        next();
    };
};


const verifyMiddleware = (req, res, next) => {
  // Check if the user's email is verified.
  if (req.user.role !== 'admin' && !req.user.isVerified) {
    return res.status(403).json({ msg: 'Email not verified' });
  }
  next();;
};

module.exports = { authMiddleware, roleCheck, verifyMiddleware };
