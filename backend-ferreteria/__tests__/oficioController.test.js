const request = require('supertest');
const app = require('../src/app');
const oficioModel = require('../src/models/OficioModel');

jest.mock('../src/models/OficioModel');
jest.mock('../src/middleware/authMiddleware', () => (req, res, next) => {
  req.user = { id_usuario: 'mock-user-id' };
  next();
});

describe('oficioController', () => {

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/oficios/', () => {
    it('OC-001: should return 200 and a list of oficios', async () => {
      const mockOficios = [{ id: 1, nombre: 'Carpintería' }];
      oficioModel.listarOficios.mockResolvedValue(mockOficios);

      const res = await request(app).get('/api/oficios/');

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual(mockOficios);
    });
  });

  describe('POST /api/oficios/agregar', () => {
    it('OC-003: should return 201 when adding oficios successfully', async () => {
      oficioModel.agregarOficiosUsuario.mockResolvedValue();

      const res = await request(app)
        .post('/api/oficios/agregar')
        .send({ oficios: [1, 2, 3] });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message', 'Oficios agregados correctamente');
    });

    it('OC-004: should return 400 if oficios is not an array', async () => {
      const res = await request(app)
        .post('/api/oficios/agregar')
        .send({ oficios: '1,2,3' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Faltan datos obligatorios o los oficios no son válidos');
    });
  });

});