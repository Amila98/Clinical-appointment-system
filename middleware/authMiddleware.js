// authMiddleware.js
const jwt = require('jsonwebtoken');
const Permission = require('../models/Permission');


const authMiddleware = (req, res, next) => {
    // Extract the token from the Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // If no token is provided, return a 401 error
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        // Verify the token and decode the user ID
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach the decoded user information to the request object
        req.user = decoded;

        // Call the next middleware
        next();
    } catch (err) {
        // If the token is not valid, return a 401 error with the error message
        res.status(401).json({ msg: 'Token is not valid', error: err.message });
    }
};


const roleCheck = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            // Get the role of the user from the request
            const userRole = req.user.role;

            // Find the permission for the user's role in the database
            const permission = await Permission.findOne({ role: userRole });

            // If the permission is not found, return an error response
            if (!permission) {
                return res.status(403).json({ msg: 'Access denied: role not found' });
            }

            // Check if the user has all the required permissions
            const hasPermission = requiredPermissions.every(permissionName =>
                permission.permissions.includes(permissionName)
            );

            // If the user does not have all the required permissions, return an error response
            if (!hasPermission) {
                return res.status(403).json({ msg: 'Access denied: insufficient permissions' });
            }

            // If the user has all the required permissions, call the next middleware
            next();
        } catch (err) {
            // If there is an error, return a server error response
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
