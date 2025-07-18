const express = require('express');
const router = express.Router();
const carritoController = require('../controllers/carritoController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/agregar', authMiddleware, carritoController.agregarAlCarrito);
router.get('/', authMiddleware, carritoController.obtenerCarrito);

module.exports = router;
