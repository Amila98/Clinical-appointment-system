// adminCreate.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');
require('dotenv').config();

/**
 * Function to create an admin user if it doesn't exist already.
 * Hashes the admin password before saving it to the database.
 * Closes the mongoose connection after it's done.
 */
const createAdmin = async () => {
    try {
        // Connect to the MongoDB database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Check if an admin user with the same username already exists
        const existingAdmin = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        // Generate a salt for password hashing
        const salt = await bcrypt.genSalt(10);
        // Hash the admin password using the generated salt
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, salt);

        // Create a new admin user with the provided username and hashed password
        const admin = new Admin({
            username: process.env.ADMIN_USERNAME,
            password: hashedPassword,
            mustChangePassword: true
        });

        // Save the admin user to the database
        await admin.save();
        console.log('Admin user created successfully');
    } catch (error) {
        // Log any error that occurs during the process
        console.error('Error creating admin user:', error);
    } finally {
        // Close the mongoose connection after the function is done
        mongoose.connection.close();
    }
};


createAdmin();
