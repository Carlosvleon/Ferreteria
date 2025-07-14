const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const adminController = require('../../controllers/admin/adminController');
const authMiddleware = require('../../middleware/authMiddleware');
const adminMiddleware = require('../../middleware/adminMiddleware'); // Descomentar si tienes este middleware
const multer = require('multer');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const idProducto = req.params.idProducto;
    const dir = path.join(__dirname, '../../../uploads/productos/', idProducto);
    // Crea la carpeta si no existe
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const nombre = Date.now() + ext;
    cb(null, nombre);
  }
});

const upload = multer({ storage: storage });

// Middleware para todas las rutas de admin.
// Idealmente, aquí también verificarías el rol de administrador.
router.use(authMiddleware, adminMiddleware);

// --- Rutas de Productos ---
router.get('/productos', adminController.listarProductos);
router.post('/productos', adminController.crearProducto);
router.put('/productos/:idProducto', adminController.actualizarProducto);
router.post('/productos/:idProducto/imagen', upload.single('imagen'), adminController.subirImagenProducto);


// --- Rutas de Catálogos ---
router.get('/marcas', adminController.listarMarcas);
router.get('/modelos', adminController.listarModelos);
router.get('/categorias', adminController.listarCategorias);

// --- Rutas de Compras ---
router.get('/compras', adminController.listarCompras);
router.get('/compras/:idCompra', adminController.verDetalleCompra);

// --- Rutas de Transacciones ---
router.get('/transacciones', adminController.listarTransacciones);


module.exports = router;