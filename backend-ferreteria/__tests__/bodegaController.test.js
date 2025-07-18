const request = require('supertest');
const app = require('../src/app');
const bodegaModel = require('../src/models/BodegaModel');

jest.mock('../src/models/BodegaModel');
jest.mock('../src/middleware/authMiddleware', () => (req, res, next) => {
  req.user = { id_usuario: 'mock-user-id', email: 'test@test.com' };
  next();
});

describe('bodegaController', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/bodegas/productos', () => {
    it('BC-001: should return 200 and products for a given sucursal and bodega', async () => {
      const mockProducts = [{ id: 1, name: 'Product A' }];
      bodegaModel.obtenerProductos.mockResolvedValue(mockProducts);

      const res = await request(app)
        .post('/api/bodegas/productos')
        .send({ id_sucursal: 1, id_bodega: 1 });

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockProducts);
    });

    it('BC-002: should return 400 if id_sucursal or id_bodega are missing', async () => {
      const res = await request(app)
        .post('/api/bodegas/productos')
        .send({ id_sucursal: 1 });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Debe enviar id_sucursal e id_bodega en el body.');
    });
  });

});