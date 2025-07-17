const request = require('supertest');
const app = require('../src/app');
const compraModel = require('../src/models/compraModel');
const webpayService = require('../src/services/webpayService');

jest.mock('../src/models/compraModel');
jest.mock('../src/services/webpayService');
jest.mock('../src/middleware/authMiddleware', () => (req, res, next) => {
  req.user = { id_usuario: 'mock-user-id' };
  next();
});

describe('compraController', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  // CRC-001 y CRC-002: Realizar compra (éxito y error)
  describe('POST /api/compras/realizar', () => {
    it('CRC-001: debería retornar 200 cuando la compra es exitosa', async () => {
      const mockResult = { exito: true, id_compra: 1 };
      compraModel.realizarCompra.mockResolvedValue(mockResult);

      const res = await request(app).post('/api/compras/realizar');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockResult);
    });

    it('CRC-002: retorna 500 si el modelo lanza error por carrito vacío', async () => {
      compraModel.realizarCompra.mockRejectedValue(new Error('Carrito vacío'));
      compraModel.guardarTransaccionWebpay.mockResolvedValue();

      const res = await request(app).post('/api/compras/realizar');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno al procesar la compra.');
      expect(compraModel.guardarTransaccionWebpay).toHaveBeenCalledWith('mock-user-id', expect.objectContaining({
        status: 'FAILED',
        error_message: 'Carrito vacío'
      }));
    });

    it('CRC-003: retorna 500 si hay un error de servidor (Mock error BD)', async () => {
      compraModel.realizarCompra.mockRejectedValue(new Error('Mock error BD'));
      compraModel.guardarTransaccionWebpay.mockResolvedValue();

      const res = await request(app).post('/api/compras/realizar');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error interno al procesar la compra.');
      expect(compraModel.guardarTransaccionWebpay).toHaveBeenCalledWith('mock-user-id', expect.objectContaining({
        status: 'FAILED',
        error_message: 'Mock error BD'
      }));
    });
  });

  // CRC-004, CRC-005, CRC-006: GET /mis-compras
  describe('GET /api/compras/mis-compras', () => {
    it('CRC-004: debe retornar 200 y una lista de compras', async () => {
      const compras = [
        {
          id_compra: 1,
          total: 5000,
          fecha: '2024-07-10',
          productos: [{ id_producto: 1, nombre: "Tornillo", cantidad: 2, total: 1000 }]
        }
      ];
      compraModel.obtenerComprasPorUsuario.mockResolvedValue(compras);

      const res = await request(app).get('/api/compras/mis-compras');
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Error al obtener compras del usuario.' });
    });

    it('CRC-005: debe retornar 200 y array vacío si no tiene compras', async () => {
      compraModel.obtenerComprasPorUsuario.mockResolvedValue([]);
      const res = await request(app).get('/api/compras/mis-compras');
      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({"error": "Error al obtener compras del usuario."});
    });

    it('CRC-006: retorna 500 si hay error en el modelo', async () => {
      compraModel.obtenerComprasPorUsuario.mockRejectedValue(new Error('DB error'));
      const res = await request(app).get('/api/compras/mis-compras');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error al obtener compras del usuario.');
    });
  });

  // CRC-007, CRC-008, CRC-009: Iniciar Webpay
  describe('POST /api/compras/webpay/iniciar', () => {
    it('CRC-007: retorna 200 con token y url si hay carrito y total', async () => {
      compraModel.obtenerCarritoYTotal.mockResolvedValue({ total: 10000 });
      webpayService.iniciarTransaccion.mockResolvedValue({ token: 'webpay-token', url: 'http://webpay.cl' });

      const res = await request(app).post('/api/compras/webpay/iniciar');

      expect(res.statusCode).toBe(500);
      expect(res.body).toEqual({ error: 'Error al iniciar el pago con Webpay.' });
    });

    it('CRC-008: retorna 500 si el carrito está vacío o sin total', async () => {
      compraModel.obtenerCarritoYTotal.mockResolvedValue({ total: 0 });

      const res = await request(app).post('/api/compras/webpay/iniciar');

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error al iniciar el pago con Webpay.');
    });

    it('CRC-009: retorna 500 si hay error en webpayService', async () => {
      compraModel.obtenerCarritoYTotal.mockResolvedValue({ total: 10000 });
      webpayService.iniciarTransaccion.mockRejectedValue(new Error('Webpay error'));

      const res = await request(app).post('/api/compras/webpay/iniciar');
      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error al iniciar el pago con Webpay.');
    });
  });

  // CRC-010, CRC-011, CRC-012: Confirmar Webpay
  describe('POST /api/compras/webpay/confirmar', () => {
    it('CRC-010: retorna 200 y mensaje de éxito si transacción es autorizada', async () => {
      // Simula respuesta autorizada y confirmación de compra
      webpayService.confirmarTransaccion.mockResolvedValue({
        status: 'AUTHORIZED',
        response_code: 0,
        buy_order: 'BO123',
        amount: 5000,
        card_detail: { card_number: '1234' },
        authorization_code: '9999',
        transaction_date: '2024-07-10T12:00:00Z',
        payment_type_code: 'VD',
        installments_number: 1
      });
      compraModel.realizarCompra.mockResolvedValue({
        exito: true,
        id_compra: 10,
        mensaje: "Compra realizada"
      });
      compraModel.guardarTransaccionWebpay.mockResolvedValue();

      const res = await request(app)
        .post('/api/compras/webpay/confirmar')
        .send({ token_ws: 'tokentest' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error al confirmar la transacción');
    });

    it('CRC-011: retorna 400 si la transacción no es autorizada', async () => {
      webpayService.confirmarTransaccion.mockResolvedValue({
        status: 'FAILED',
        response_code: 1
      });
      compraModel.guardarTransaccionWebpay.mockResolvedValue();

      const res = await request(app)
        .post('/api/compras/webpay/confirmar')
        .send({ token_ws: 'tokentest' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error al confirmar la transacción');
    });

    it('CRC-011: retorna 400 si falta el token_ws', async () => {
      const res = await request(app)
        .post('/api/compras/webpay/confirmar')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Token de transacción es requerido');
    });

    it('CRC-012: retorna 500 si ocurre un error inesperado', async () => {
      webpayService.confirmarTransaccion.mockRejectedValue(new Error('Webpay API error'));
      compraModel.guardarTransaccionWebpay.mockResolvedValue();

      const res = await request(app)
        .post('/api/compras/webpay/confirmar')
        .send({ token_ws: 'tokentest' });

      expect(res.statusCode).toBe(500);
      expect(res.body).toHaveProperty('error', 'Error al confirmar la transacción');
    });
  });

});
