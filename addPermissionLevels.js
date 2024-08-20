const mongoose = require('mongoose');
const Permission = require('./models/Permission');
require('dotenv').config();

const addPermissionLevels = async () => {
    try {
        // Connect to the MongoDB database
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Define the permission levels to add
        const permissions = [
            { role: 'Super Admin', permissionLevel: 1 },
            { role: 'Admin', permissionLevel: 2 },
            { role: 'Doctor', permissionLevel: 3 },
            { role: 'Staff', permissionLevel: 4 },
            { role: 'Patient', permissionLevel: 5 }
        ];

        // Insert permission levels into the database
        for (const perm of permissions) {
            const existingPermission = await Permission.findOne({ role: perm.role });
            if (!existingPermission) {
                await Permission.create(perm);
                console.log(`Permission level for ${perm.role} added.`);
            } else {
                console.log(`Permission level for ${perm.role} already exists.`);
            }
        }
    } catch (error) {
        console.error('Error adding permission levels:', error);
    } finally {
        // Close the mongoose connection
        mongoose.connection.close();
    }
};

addPermissionLevels();
