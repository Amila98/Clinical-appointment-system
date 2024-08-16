// authMiddleware.js
const jwt = require('jsonwebtoken');
const Permission = require('../models/Permission');

// Middleware to authenticate the token
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
        res.status(401).json({ msg: 'Token is not valid', error: err.message });
    }
};

// Middleware to check if the user has the required permission (feature)
const roleCheck = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user.role;
            const permission = await Permission.findOne({ role: userRole });

            if (!permission) {
                return res.status(403).json({ msg: 'Access denied: role not found' });
            }

            const hasPermission = requiredPermissions.every(permissionName =>
                permission.permissions.includes(permissionName)
            );

            if (!hasPermission) {
                return res.status(403).json({ msg: 'Access denied: insufficient permissions' });
            }

            next();
        } catch (err) {
            res.status(500).json({ msg: 'Server error', error: err.message });
        }
    };
};

const verifyMiddleware = (req, res, next) => {
    if (req.user.role !== 'admin' && !req.user.isVerified) {
        return res.status(403).json({ msg: 'Email not verified' });
    }
    next();
};

module.exports = { authMiddleware, roleCheck, verifyMiddleware };
