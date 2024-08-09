// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

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

const roleCheck = (roles) => {
    return (req, res, next) => {
        console.log("User role:", req.user.role); // Debugging log
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ msg: 'Access denied' });
        }
        next();
    };
};


const verifyMiddleware = (req, res, next) => {
  // Check if the user's email is verified.
  if (!req.user.isVerified) {
    // If the user's email is not verified, return a 403 status code and an error message.
    return res.status(403).json({ msg: 'Email not verified' });
  }
  // If the user's email is verified, proceed to the next middleware function.
  next();
};

module.exports = { authMiddleware, roleCheck, verifyMiddleware };
