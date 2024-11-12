const nodemailer = require('nodemailer');
const { EMAIL_USER, EMAIL_PASS } = process.env;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: EMAIL_USER,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}`);
  } catch (err) {
    console.error(`Error sending email to ${to}:`, err.message); // Log the detailed error message
    throw err; // Re-throw the error to handle it in the route
  }
};

const sendReminder = async (email, message) => {
  const subject = "Appointment Reminder";
  await sendEmail(email, subject, message); // Use sendEmail to send the actual email
};


module.exports = { sendEmail, sendReminder };
