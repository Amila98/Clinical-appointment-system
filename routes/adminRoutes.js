// routes/adminRoutes.js
const express = require('express');
const { loginAdmin, changeAdminPassword } = require('../controllers/adminController');
const router = express.Router();
const { authMiddleware, roleCheck } = require('../middleware/authMiddleware');

// Admin login route
router.post('/login', loginAdmin);

// Change admin password route
router.post('/change-password', [authMiddleware, roleCheck('admin')], changeAdminPassword);



module.exports = router;



