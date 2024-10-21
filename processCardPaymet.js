const axios = require('axios');
require('dotenv').config();

const processCardPayment = async (amount, customerDetails, paymentDetails) => {
    try {
        const response = await axios.post('https://sandbox.payhere.lk/pay/checkout', {
            merchant_id: process.env.PAYHERE_MERCHANT_ID,    // Replace with your Merchant ID
            return_url: 'http://your-site.com/return',
            cancel_url: 'http://your-site.com/cancel',
            notify_url: 'http://your-site.com/notify',
            order_id: 'ItemNo12345',
            items: 'Doctor Appointment Payment',
            currency: 'LKR',
            amount: amount,
            first_name: customerDetails.firstName,
            last_name: customerDetails.lastName,
            email: customerDetails.email,
            phone: customerDetails.phone,
            address: customerDetails.address,
            city: customerDetails.city,
            country: 'Sri Lanka',
            card_number: paymentDetails.cardNumber,
            exp_month: paymentDetails.expiryMonth,
            exp_year: paymentDetails.expiryYear,
            ccv: paymentDetails.cvv
        });

        // PayHere will return a JSON response with payment details
        return response.data;
    } catch (error) {
        console.error('Error processing card payment via PayHere:', error);
        return false;
    }
};

module.exports = { processCardPayment };
