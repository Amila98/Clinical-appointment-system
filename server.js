const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');


const patientRoutes = require('./routes/patientRoutes');
const adminRoutes = require('./routes/adminRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const staffRoutes = require('./routes/staffRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const initPermissions = require('./utils/initPermissions');

require('dotenv').config();


const app = express();

initPermissions();

app.use(cors({
    origin: 'http://localhost:3001',  // Replace with the URL of your frontend
    methods: 'GET,POST,PUT,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization'
}));


// Middleware
app.use(express.json());

// Routes
app.use('/api/patient', patientRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);


// Connect to database and start server
connectDB();
const PORT = process.env.PORT || 5000;


app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
