const request = require('supertest');
const app = require('../src/app');
const userModel = require('../src/models/UserModel');
const jwt = require('jsonwebtoken');

// Mockea el módulo completo del modelo de usuario
jest.mock('../src/models/UserModel');
// Mockea el módulo de JWT para controlar la verificación de tokens
jest.mock('jsonwebtoken');

describe('userController', () => {
  // Limpia todos los mocks después de cada prueba para evitar interferencias
  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Pruebas para el endpoint de Login ---
  describe('POST /api/usuarios/login', () => {
    it('UC-001: should return 200 and a JWT for valid credentials', async () => {
      userModel.login.mockResolvedValue({ status: 200, body: { token: 'valid.jwt.token' } });
      const res = await request(app)
        .post('/api/usuarios/login')
        .send({ email: 'usuario@test.com', password: '123456' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('UC-002 & UC-003: should return 401 for incorrect credentials', async () => {
      userModel.login.mockResolvedValue({ status: 401, body: { error: 'Credenciales incorrectas' } });
      const res = await request(app)
        .post('/api/usuarios/login')
        .send({ email: 'noexiste@test.com', password: '123456' });

      expect(res.statusCode).toBe(401);
      expect(res.body).toHaveProperty('error', 'Credenciales incorrectas');
    });

    it('UC-004: should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/usuarios/login')
        .send({ password: '123456' });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error', 'Correo y contraseña son obligatorios');
    });
    
    it('UC-007: should return 500 on server error', async () => {
        userModel.login.mockRejectedValue(new Error('Internal Server Error'));
        const res = await request(app)
          .post('/api/usuarios/login')
          .send({ email: 'usuario@test.com', password: '123456' });
  
        expect(res.statusCode).toBe(500);
        expect(res.body).toHaveProperty('error', 'Error en el servidor');
      });
  });

  // --- Pruebas para el endpoint de Registro ---
  describe('POST /api/usuarios/register', () => {
    const validUserData = { nombre: 'Juan', email: 'juan@test.com', password: '123456', rut: '12345678-9' };

    it('UC-008: should return 201 when registration is successful', async () => {
      userModel.register.mockResolvedValue({ status: 201, body: { message: 'Usuario creado exitosamente' } });
      const res = await request(app)
        .post('/api/usuarios/register')
        .send(validUserData);

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('message');
    });

    it('UC-009: should return 400 if email is already registered', async () => {
        userModel.register.mockResolvedValue({ status: 400, body: { error: 'El correo ya está registrado' } });
        const res = await request(app)
            .post('/api/usuarios/register')
            .send(validUserData);
        
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'El correo ya está registrado');
    });

    it('UC-011: should return 400 if password is too short', async () => {
        const res = await request(app)
            .post('/api/usuarios/register')
            .send({ ...validUserData, password: '123' });

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'El correo y contraseña (mínimo 6 caracteres) son obligatorios');
    });
  });

  // --- Pruebas para el endpoint de Logout ---
  describe('POST /api/usuarios/logout', () => {
    it('UC-014: should return 200 on successful logout with a valid token', async () => {
        jwt.verify.mockReturnValue({ exp: 1234567890 });
        userModel.invalidateToken.mockResolvedValue();

        const res = await request(app)
            .post('/api/usuarios/logout')
            .set('Authorization', 'Bearer valid.token');
        
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('message', 'Sesión cerrada correctamente');
    });

    it('UC-015: should return 400 for an invalid token', async () => {
        jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

        const res = await request(app)
            .post('/api/usuarios/logout')
            .set('Authorization', 'Bearer invalid.token');

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Token no válido.');
    });
  });
});