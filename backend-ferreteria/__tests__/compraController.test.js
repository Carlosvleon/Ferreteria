const request = require('supertest');
const app = require('../src/app');
const compraModel = require('../src/models/CompraModel');
const webpayService = require('../src/services/webpayService');

jest.mock('../src/models/CompraModel');
jest.mock('../src/services/webpayService');
jest.mock('../src/middleware/authMiddleware', () => (req, res, next) => {
  req.user = { id_usuario: 'mock-user-id' };
  next();
});

describe('compraController', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/compras/realizar', () => {
    it('CRC-001: should return 200 when purchase is successful', async () => {
      const mockResult = { exito: true, id_compra: 1 };
      compraModel.realizarCompra.mockResolvedValue(mockResult);

      const res = await request(app).post('/api/compras/realizar');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockResult);
    });

    it('CRC-002: should return 500 if the model throws an error (e.g., empty cart)', async () => {
      // En este caso, el modelo lanzaría un error que el controlador captura como 500.
      // Un 400 sería ideal, pero seguimos la implementación actual.
      compraModel.realizarCompra.mockRejectedValue(new Error('Carrito vacío'));

      const res = await request(app).post('/api/compras/realizar');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno al procesar la compra.');
    });
  });

  describe('POST /api/compras/webpay/iniciar', () => {
    it('CRC-007: should return 200 with webpay token and url for a valid cart', async () => {
      compraModel.obtenerCarritoYTotal.mockResolvedValue({ total: 10000 });
      webpayService.iniciarTransaccion.mockResolvedValue({ token: 'webpay-token', url: 'http://webpay.cl' });

      const res = await request(app).post('/api/compras/webpay/iniciar');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ token: 'webpay-token', url: 'http://webpay.cl' });
    });

    it('CRC-008: should return 500 if cart is empty', async () => {
      compraModel.obtenerCarritoYTotal.mockResolvedValue({ total: 0 });

      const res = await request(app).post('/api/compras/webpay/iniciar');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error al iniciar el pago con Webpay.');
    });
  });

});