const request = require('supertest');
const app = require('../src/app');
const carritoModel = require('../src/models/CarritoModel');

jest.mock('../src/models/CarritoModel');
jest.mock('../src/middleware/authMiddleware', () => (req, res, next) => {
  req.user = { id_usuario: 'mock-user-id' };
  next();
});

let consoleErrorSpy;

describe('carritoController', () => {

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  describe('POST /api/carrito/agregar', () => {
    it('CC-001: should return 200 when adding a valid product to the cart', async () => {
      const cartData = {
        id_sucursal: 1,
        productos: [{ id_producto: 1, cantidad: 2 }]
      };
      carritoModel.agregarProductosPorSucursal.mockResolvedValue({ success: true });

      const res = await request(app)
        .post('/api/carrito/agregar')
        .send(cartData);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it('CC-006: should return 400 if product quantity is zero', async () => {
        const cartData = {
          id_sucursal: 1,
          productos: [{ id_producto: 1, cantidad: 0 }]
        };
  
        const res = await request(app)
          .post('/api/carrito/agregar')
          .send(cartData);
  
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Cada producto debe tener un id_producto y una cantidad válida.');
    });

    it('CC-008: should return 400 if product id is not a number', async () => {
        const cartData = {
          id_sucursal: 1,
          productos: [{ id_producto: '1', cantidad: 2 }]
        };
  
        const res = await request(app)
          .post('/api/carrito/agregar')
          .send(cartData);
  
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Cada producto debe tener un id_producto y una cantidad válida.');
    });

    it('CC-019: should return 500 on a server error', async () => {
      const cartData = {
        id_sucursal: 1,
        productos: [{ id_producto: 1, cantidad: 2 }]
      };
      carritoModel.agregarProductosPorSucursal.mockRejectedValue(new Error('DB Error'));

      const res = await request(app)
        .post('/api/carrito/agregar')
        .send(cartData);

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno al agregar productos al carrito.');
    });
  });

});