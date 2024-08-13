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
        // Ensure req.user.role is a string and convert to lower case
        const userRole = (req.user.role || '').toLowerCase();

        // Map role strings to permission levels
        const rolePermissionLevels = {
            'super admin': PERMISSION_LEVELS.SUPER_ADMIN,
            'admin': PERMISSION_LEVELS.ADMIN,
            'doctor': PERMISSION_LEVELS.DOCTOR,
            'staff': PERMISSION_LEVELS.STAFF,
            'patient': PERMISSION_LEVELS.PATIENT,
        };

        // Get the user's permission level based on their role
        const userPermissionLevel = rolePermissionLevels[userRole];

        // Log details for debugging
        console.log(`User Role: ${userRole}, User Permission Level: ${userPermissionLevel}, Required Permission Level: ${requiredPermissionLevel}`);

        // Compare permission levels
        if (userPermissionLevel === undefined) {
            return res.status(403).json({ msg: 'Invalid user role' });
        }
        if (userPermissionLevel < requiredPermissionLevel) {
            return res.status(403).json({ msg: 'Access denied' });
        }

        next();
    };
};

const verifyMiddleware = (req, res, next) => {
    // Check if the user's email is verified
    if (req.user.role !== 'admin' && !req.user.isVerified) {
        return res.status(403).json({ msg: 'Email not verified' });
    }
    next();
};

module.exports = { authMiddleware, roleCheck, verifyMiddleware };
