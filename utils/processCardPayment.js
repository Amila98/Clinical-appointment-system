require('dotenv').config();
const md5 = require('crypto-js/md5');
const axios = require('axios');

// PayHere credentials from environment variables
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID;
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;
const PAYHERE_RETURN_URL = 'https://www.ideazone.lk/return';
const PAYHERE_CANCEL_URL = 'https://www.ideazone.lk/cancel';
const PAYHERE_NOTIFY_URL = 'https://www.ideazone.lk/notify';
const PAYHERE_URL = 'https://sandbox.payhere.lk/pay/checkout';

// Generate payment hash
function generateHash(orderId, amount, currency) {
    const formattedAmount = parseFloat(amount).toFixed(2).replace(/,/g, '');
    const hashString = PAYHERE_MERCHANT_ID + orderId + formattedAmount + currency + PAYHERE_MERCHANT_SECRET;
    return md5(hashString).toString().toUpperCase();
}

// Function to generate the payment form HTML
const processCardPayment = async (amount, customerDetails, orderId) => {
    try {
        const currency = 'LKR';
        const formattedAmount = parseFloat(amount).toFixed(2).replace(/,/g, '');
        const hash = generateHash(orderId, amount, currency);
        const { first_name, last_name, email, phone, address, city, country } = customerDetails;

        // Validate required fields
        if (!first_name || !last_name || !email || !phone || !address || !city || !country) {
            throw new Error("Missing required customer details");
        }

        const paymentData = {
            merchant_id: PAYHERE_MERCHANT_ID,
            return_url: PAYHERE_RETURN_URL,
            cancel_url: PAYHERE_CANCEL_URL,
            notify_url: PAYHERE_NOTIFY_URL,
            order_id: orderId,
            items: 'Doctor Appointment Fee',
            currency: currency,
            amount: formattedAmount,
            first_name,
            last_name,
            email,
            phone,
            address,
            city,
            country,
            hash
        };

        // Create a form with hidden fields to post data to PayHere
        const formHtml = `
          <form action="${PAYHERE_URL}" method="post" id="payhereForm">
            ${Object.keys(paymentData).map(
                (key) => `<input type="hidden" name="${key}" value="${paymentData[key]}" />`
            ).join('')}
            <input type="submit" value="Proceed to PayHere" />
          </form>
          <script>document.getElementById("payhereForm").submit();</script>
        `;
        
        return { status: 'success', paymentHtml: formHtml };
    } catch (error) {
        console.error('Error generating payment request:', error);
        return { status: 'error', message: 'Unable to process the payment request.' };
    }
};

module.exports = processCardPayment;
