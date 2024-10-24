// authMiddleware.js
const jwt = require('jsonwebtoken');
const Permission = require('../models/Permission');
const { decryptToken } = require('../utils/cryptoUtils');


const authMiddleware = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
  
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
  
    try {
        // Decrypt the token
        const decryptedToken = decryptToken(token);
        console.log('Decrypted Token:', decryptedToken); // Log the decrypted token for debugging
  
        // Verify the JWT token
        const decoded = jwt.verify(decryptedToken, process.env.JWT_SECRET);
        console.log('Decoded Token:', decoded); // Log the decoded token for debugging
  
        // Attach user data to request object
        req.user = decoded;
  
        next();
    } catch (err) {
        console.error('Token verification error:', err.message); // Log error details
        return res.status(401).json({ msg: 'Token is not valid', error: err.message });
    }
};


const roleCheck = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user.role;

            // Fetch permissions from the database based on user role
            const permissionDoc = await Permission.findOne({ role: userRole });

            if (!permissionDoc || !permissionDoc.permissions) {
                return res.status(403).json({ msg: 'Access denied: role not found or permissions not set' });
            }

            // Convert permissions to a plain object if it's a Map
            const userPermissions = permissionDoc.permissions instanceof Map ?
                Object.fromEntries(permissionDoc.permissions.entries()) :
                permissionDoc.permissions;

            // Log permissions and types for debugging
            console.log('User Permissions:', userPermissions);
            console.log('User Permissions Type:', Object.prototype.toString.call(userPermissions)); // Should be [object Object]
            console.log('Required Permissions:', requiredPermissions);

            // Check if the user has all required permissions
            const hasPermission = requiredPermissions.every(permissionName =>
                userPermissions[permissionName] === true
            );

            if (!hasPermission) {
                return res.status(403).json({ msg: 'Access denied: insufficient permissions' });
            }

            next();
        } catch (err) {
            console.error('Server error:', err.message);
            res.status(500).json({ msg: 'Server error', error: err.message });
        }
    };
};

const verifyMiddleware = (req, res, next) => {
    // If the user is not an admin and has not verified their email, return an error response
    if (req.user.role !== 'admin' && !req.user.isVerified) {
        return res.status(403).json({ msg: 'Email not verified' });
    }

    // If the user has verified their email, call the next middleware
    next();
};




module.exports = { authMiddleware, roleCheck, verifyMiddleware };
