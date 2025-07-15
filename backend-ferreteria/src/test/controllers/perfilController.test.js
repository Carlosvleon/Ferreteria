// tests/controllers/perfilController.test.js

const request = require('supertest');
const express = require('express');
const multer = require('multer');
const perfilController = require('../../../src/controllers/perfilController');
const perfilModel = require('../../../src/models/PerfilModel');

// Mock de Express y rutas
const app = express();
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// Middleware falso para simular autenticación
app.use((req, res, next) => {
  req.user = { id_usuario: 1, rut: '12345678-9' };
  next();
});

jest.mock('../../../src/models/PerfilModel');

app.get('/perfil', perfilController.getPerfilUsuario);
app.get('/usuarios', perfilController.getTodosLosUsuarios);
app.get('/perfil/:id', perfilController.getPerfilPorId);
app.post('/perfil/foto', upload.single('imagen'), perfilController.actualizarFotoPerfil);
app.post('/perfil/portada', upload.single('imagen'), perfilController.actualizarPortada);

describe('perfilController', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /perfil - perfil encontrado', async () => {
    const fakeProfile = { nombre: 'Juan', rut: '12345678-9' };
    perfilModel.obtenerPerfilPorId.mockResolvedValue(fakeProfile);

    const response = await request(app).get('/perfil');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(fakeProfile);
  });

  test('GET /perfil - perfil no encontrado', async () => {
    perfilModel.obtenerPerfilPorId.mockResolvedValue(null);

    const response = await request(app).get('/perfil');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Usuario no encontrado.");
  });

  test('GET /perfil - error inesperado', async () => {
    perfilModel.obtenerPerfilPorId.mockRejectedValue(new Error('DB error'));

    const response = await request(app).get('/perfil');
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Error al obtener perfil");
  });

  test('GET /usuarios - usuarios encontrados', async () => {
    const fakeUsers = [{ nombre: 'Ana' }, { nombre: 'Luis' }];
    perfilModel.obtenerUsuarios.mockResolvedValue(fakeUsers);

    const response = await request(app).get('/usuarios?tipo_usuario=cliente');
    expect(response.status).toBe(200);
    expect(response.body.length).toBe(2);
  });

  test('GET /usuarios - sin resultados devuelve lista vacía', async () => {
    perfilModel.obtenerUsuarios.mockResolvedValue([]);

    const response = await request(app).get('/usuarios');
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  test('GET /usuarios - error inesperado', async () => {
    perfilModel.obtenerUsuarios.mockRejectedValue(new Error('DB error'));

    const response = await request(app).get('/usuarios');
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Error al obtener usuarios");
  });

  test('GET /perfil/:id - perfil encontrado por ID', async () => {
    const fakeProfile = { nombre: 'María' };
    perfilModel.obtenerPerfilPorId.mockResolvedValue(fakeProfile);

    const response = await request(app).get('/perfil/2');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(fakeProfile);
  });

  test('GET /perfil/:id - perfil no encontrado por ID', async () => {
    perfilModel.obtenerPerfilPorId.mockResolvedValue(null);

    const response = await request(app).get('/perfil/60');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe("Usuario no encontrado");
  });

  test('GET /perfil/:id - error inesperado', async () => {
    perfilModel.obtenerPerfilPorId.mockRejectedValue(new Error('DB error'));

    const response = await request(app).get('/perfil/2');
    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Error en el servidor");
  });

  describe('POST /perfil/foto', () => {
    test('actualiza la foto de perfil correctamente', async () => {
      perfilModel.actualizarImagen.mockResolvedValue({ message: 'Perfil actualizada con éxito' });

      const res = await request(app)
        .post('/perfil/foto')
        .field('rut', '12345678-9')
        .attach('imagen', Buffer.from('img'), 'avatar.jpg');

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Perfil actualizada/);
    });

    test('retorna 400 si no se adjunta archivo', async () => {
      const res = await request(app)
        .post('/perfil/foto')
        .field('rut', '12345678-9');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No se ha subido ningún archivo.');
    });

    test('retorna 403 si el rut no coincide', async () => {
      const res = await request(app)
        .post('/perfil/foto')
        .field('rut', '11-1')
        .attach('imagen', Buffer.from('img'), 'avatar.jpg');

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('No autorizado');
    });

    test('retorna 500 si falla el modelo', async () => {
      perfilModel.actualizarImagen.mockRejectedValue(new Error('fail'));

      const res = await request(app)
        .post('/perfil/foto')
        .field('rut', '12345678-9')
        .attach('imagen', Buffer.from('img'), 'avatar.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error al actualizar la imagen de perfil');
    });
  });

  describe('POST /perfil/portada', () => {
    test('actualiza la portada correctamente', async () => {
      perfilModel.actualizarImagen.mockResolvedValue({ message: 'Portada actualizada con éxito' });

      const res = await request(app)
        .post('/perfil/portada')
        .field('rut', '12345678-9')
        .attach('imagen', Buffer.from('img'), 'portada.jpg');

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Portada actualizada/);
    });

    test('retorna 400 si no se adjunta archivo', async () => {
      const res = await request(app)
        .post('/perfil/portada')
        .field('rut', '12345678-9');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No se ha subido ningún archivo.');
    });

    test('retorna 500 si el modelo falla', async () => {
      perfilModel.actualizarImagen.mockRejectedValue(new Error('fail'));

      const res = await request(app)
        .post('/perfil/portada')
        .field('rut', '12345678-9')
        .attach('imagen', Buffer.from('img'), 'portada.jpg');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Error al actualizar la imagen de portada');
    });
  });
});
