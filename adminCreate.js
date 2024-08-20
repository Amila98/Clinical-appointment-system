const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
require('dotenv').config();
const PERMISSION_LEVELS = require('./utils/permissionLevels');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        const existingSuperAdmin = await Admin.findOne({ role: 'Super Admin' });
        if (existingSuperAdmin) {
            console.log('Super Admin already exists');
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

        const admin = new Admin({
            username: process.env.ADMIN_USERNAME,
            password: hashedPassword,
            email: process.env.ADMIN_EMAIL,
            mustChangePassword: true,
            isVerified: true,
            role: 'Super Admin'
        });

        await admin.save();
        console.log('Super Admin user created successfully');
    } catch (error) {
        console.error('Error creating Super Admin user:', error);
    } finally {
        mongoose.connection.close();
    }
};

createAdmin();
