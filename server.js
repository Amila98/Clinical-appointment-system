const express = require('express');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');


const app = express();

// Middleware
app.use(express.json());

// Routes
// Routes
app.use('/api/patient', patientRoutes);
app.use('/api/auth', authRoutes);

// Connect to database and start server
connectDB();
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
