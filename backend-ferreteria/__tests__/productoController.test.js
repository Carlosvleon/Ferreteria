const request = require('supertest');
const app = require('../src/app');
const productoModel = require('../src/models/ProductoModel');

jest.mock('../src/models/ProductoModel');
jest.mock('../src/middleware/authMiddleware', () => (req, res, next) => {
  req.user = { id_usuario: 'mock-user-id', email: 'test@test.com' };
  next();
});

describe('productoController', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/productos/', () => {
    it('PRC-001: should return 200 and a list of active products', async () => {
      const mockProducts = [{ id: 1, name: 'Product A', active: true }];
      productoModel.obtenerActivos.mockResolvedValue(mockProducts);

      const res = await request(app).get('/api/productos/');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockProducts);
    });

    it('PRC-002: should return 500 on a server error', async () => {
      productoModel.obtenerActivos.mockRejectedValue(new Error('DB Error'));

      const res = await request(app).get('/api/productos/');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error al obtener productos activos desde la base de datos.');
    });
  });

  describe('GET /api/productos/bodega', () => {
    it('PRC-004: should return 400 if required query params are missing', async () => {
      const res = await request(app).get('/api/productos/bodega?id_sucursal=1');

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Debe enviar id_sucursal e id_bodega.');
    });
  });

});