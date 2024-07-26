const bcrypt = require('bcryptjs');

const checkPassword = async (plainPassword, hashedPassword) => {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('Password match result:', isMatch);
};

// Replace these values with your actual values
const plainPassword = 'your_admin_password';
const hashedPassword = '$2a$10$I4tdWsHqK2NIiWvs0oFqPubve4qwXORMR7bSkFCPswJrvae8VIlaC'; 

checkPassword(plainPassword, hashedPassword);