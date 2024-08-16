const express = require('express');
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');
const { createUser, getUserById, updateUser, deleteUser } = require('../controllers/userController');
const  PERMISSION_LEVELS  = require('../utils/permissionLevels');

const router = express.Router();

// Only Super Admin can create Admins
// Create user route
router.post('/create-user', authMiddleware, roleCheck(['create_user']), createUser);

// Get user by ID route
router.get('/get-user/:role/:id', authMiddleware, roleCheck(['read_user']), getUserById);

// Update user by ID route
router.put('/update-user/:role/:id', authMiddleware, roleCheck(['update_user']), updateUser);

// Delete user by ID route
router.delete('/delete-user/:role/:id', authMiddleware, roleCheck(['delete_user']), deleteUser);



// Only Super Admin can update role permissions

module.exports = router;
