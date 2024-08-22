// utils/initPermissions.js
const Permission = require('../models/Permission');

const initPermissions = async () => {
    const permissions = [
        {
            role: 'Super Admin',
            permissions: [
                'create_user',
                'update_user',
                'delete_user',
                'read_user',
                'invite_doctor',
                'verify_doctor',
                'create_staff',
                'change_user_email',
                'change_admin_password',
                'view_admin_details',
                'update_admin_details',
                'upload-profile-picture',
                'create_specialization', 'read_specialization', 'update_specialization', 'delete_specialization'
            ]
        },
        {
            role: 'Admin',
            permissions: [
                'create_user',
                'update_user',
                'delete_user',
                'read_user',
                'invite_doctor',
                'verify_doctor',
                'create_staff',
                'change_user_email',
                'change_admin_password',
                'view_admin_details',
                'update_admin_details',
                'upload-profile-picture',
                'create_specialization', 'read_specialization', 'update_specialization', 'delete_specialization'
            ]
        },
        {
            role: 'Doctor',
            permissions: [
                'change_doctor_password',
                'view_doctor_details',
                'update_doctor_details',
                'upload-profile-picture'
            ]
        },
        {
            role: 'Staff',
            permissions: [
                'view_staff_details',
                'update_staff_details',
                'upload-profile-picture',
                'read_user'
            ]
        },
        {
            role: 'Patient',
            permissions: [
                'view_patient_details',
                'update_patient_details',
                'upload-profile-picture'
            ]
        }
    ];

    for (const perm of permissions) {
        await Permission.findOneAndUpdate({ role: perm.role }, perm, { upsert: true });
    }
};

module.exports = initPermissions;
