const express = require('express');
const router = express.Router();
const compraController = require('../controllers/compraController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/realizar', authMiddleware, compraController.realizarCompra);
router.get('/mis-compras', authMiddleware, compraController.obtenerMisCompras);
router.post('/webpay/iniciar', authMiddleware, compraController.pagarConWebpay);
router.post('/webpay/confirmar', authMiddleware, compraController.confirmarPagoWebpay);

module.exports = router;