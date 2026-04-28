const express = require('express');
const router = express.Router();
// Path check kar lo: controllers folder src ke andar hai na?
const { createOrder, verifyPayment } = require('../controllers/payment.controller');

// Ab ye functions hamesha defined rahenge
router.post('/create-order', createOrder);
router.post('/verify-payment', verifyPayment);

module.exports = router;