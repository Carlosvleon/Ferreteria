const request = require('supertest');
const app = require('../src/app'); // Asegúrate de tener un archivo que exporte tu app de Express
const adminProductModel = require('../src/models/admin/adminProductModel');
const adminCompraModel = require('../src/models/admin/adminCompraModel');
const adminTransaccionModel = require('../src/models/admin/adminTransaccionModel');
const fs = require('fs-extra');

// Mock de los middlewares de autenticación y autorización para las pruebas
jest.mock('../src/middleware/authMiddleware', () => (req, res, next) => {
  // Simula un usuario administrador autenticado
  req.user = { id_usuario: 'admin-uuid', email: 'admin@test.com', tipo_usuario: 3 };
  next();
});
jest.mock('../src/middleware/adminMiddleware', () => (req, res, next) => next());

// Mock de los modelos para no depender de la base de datos
jest.mock('../src/models/admin/adminProductModel');
jest.mock('../src/models/admin/adminCompraModel');
jest.mock('../src/models/admin/adminTransaccionModel');

// Mock explícito de fs-extra para evitar "open handles" en los tests de error
jest.mock('fs-extra', () => ({
  remove: jest.fn().mockResolvedValue(),
}));

let consoleErrorSpy;

describe('adminController', () => {

  beforeEach(() => {
    // Silenciar console.error para una salida de test más limpia
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  // --- Tests de Productos ---
  describe('GET /api/admin/productos', () => {
    it('AC-001: should return 200 and a list of products for an authenticated admin', async () => {
      const mockProducts = [{ id_producto: 1, nombre: 'Martillo' }];
      adminProductModel.obtenerProductosConDetalles.mockResolvedValue(mockProducts);

      const res = await request(app).get('/api/admin/productos');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockProducts);
    });

    it('AC-002: should return 500 on a server error', async () => {
      adminProductModel.obtenerProductosConDetalles.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/api/admin/productos');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno al obtener los productos.');
    });
  });

  describe('POST /api/admin/productos', () => {
    it('AC-003: should return 201 and the new product ID when creating a product successfully', async () => {
      const newProductData = { nombre: 'Taladro', precioOnline: 50000 };
      adminProductModel.crearProducto.mockResolvedValue(123);

      const res = await request(app)
        .post('/api/admin/productos')
        .send(newProductData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toEqual({ message: 'Producto creado con éxito', idProducto: 123 });
    });

    it('AC-004: should return 500 on a server error during creation', async () => {
      adminProductModel.crearProducto.mockRejectedValue(new Error('DB Error'));

      const res = await request(app)
        .post('/api/admin/productos')
        .send({ nombre: 'Taladro' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno al crear el producto.');
    });
  });

  describe('PUT /api/admin/productos/:idProducto', () => {
    it('AC-005: should return 200 when updating a product successfully', async () => {
      const updateData = { nombre_producto: 'Taladro Inalámbrico' };
      adminProductModel.actualizarProducto.mockResolvedValue();

      const res = await request(app)
        .put('/api/admin/productos/1')
        .send(updateData);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ message: 'Producto actualizado correctamente' });
    });

    it('AC-006: should return 500 on a server error during update', async () => {
      adminProductModel.actualizarProducto.mockRejectedValue(new Error('DB Error'));

      const res = await request(app)
        .put('/api/admin/productos/1')
        .send({ nombre_producto: 'Taladro Inalámbrico' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno al actualizar el producto.');
    });
  });

  describe('POST /api/admin/productos/:idProducto/imagen', () => {
    it('AC-007: should return 200 when uploading an image successfully', async () => {
      adminProductModel.actualizarRutaImagen.mockResolvedValue();

      const res = await request(app)
        .post('/api/admin/productos/1/imagen')
        .attach('imagen', Buffer.from('fake image data'), 'test.jpg');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('message', 'Imagen subida y asociada correctamente');
      expect(res.body).toHaveProperty('path');
    });

    it('AC-008: should return 400 if no file is uploaded', async () => {
      const res = await request(app).post('/api/admin/productos/1/imagen');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'No se envió ninguna imagen');
    });

    it('AC-009: should return 500 on a server error during image upload', async () => {
      // El controlador usa productoModel, que es un alias de adminProductModel
      const productoModel = require('../src/models/admin/adminProductModel');
      productoModel.actualizarRutaImagen.mockRejectedValue(new Error('DB Error'));

      const res = await request(app)
        .post('/api/admin/productos/1/imagen')
        .attach('imagen', Buffer.from('fake image data'), 'test.jpg');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno al subir la imagen');
      // Verifica que el rollback de eliminación de archivo fue llamado
      expect(fs.remove).toHaveBeenCalledTimes(1);
    });
  });

  // --- Tests de Catálogos ---
  describe('POST /api/admin/marcas', () => {
    it('AC-012: should return 201 when creating a brand successfully', async () => {
        adminProductModel.crearMarca.mockResolvedValue(1);
        const res = await request(app)
            .post('/api/admin/marcas')
            .send({ nombre: 'Marca Test' });
        
        expect(res.statusCode).toBe(201);
        expect(res.body).toEqual({ message: 'Marca creada con éxito', idMarca: 1 });
    });

    it('AC-013: should return 400 if name is missing', async () => {
        const res = await request(app)
            .post('/api/admin/marcas')
            .send({});
        
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Nombre de la marca es requerido');
    });
  });

  // --- Tests de Compras ---
  describe('GET /api/admin/compras', () => {
    it('AC-015: should return 200 and a list of purchases', async () => {
      const mockCompras = [{ id_compra: 1, total: 1000 }];
      adminCompraModel.listarComprasConFiltros.mockResolvedValue(mockCompras);

      const res = await request(app).get('/api/admin/compras');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockCompras);
    });
  });

});