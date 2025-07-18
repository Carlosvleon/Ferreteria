// perfilController.test.js
const perfilController = require('../src/controllers/perfilController');
const perfilModel = require('../src/models/PerfilModel');

// Mockea el modelo entero
jest.mock('../src/models/PerfilModel');


describe('perfilController', () => {
  let req, res;

  beforeEach(() => {
    req = {
      user: { id_usuario: 1, rut: "12345678-9" },
      params: {},
      query: {},
      body: {},
      file: undefined,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('getPerfilUsuario', () => {
    it('devuelve el perfil si existe', async () => {
      const perfil = { id_usuario: 1, nombre: "Carlos" };
      perfilModel.obtenerPerfilPorId.mockResolvedValue(perfil);

      await perfilController.getPerfilUsuario(req, res);
      expect(perfilModel.obtenerPerfilPorId).toHaveBeenCalledWith(1);
      expect(res.json).toHaveBeenCalledWith(perfil);
    });

    it('devuelve 404 si no existe el perfil', async () => {
      perfilModel.obtenerPerfilPorId.mockResolvedValue(null);

      await perfilController.getPerfilUsuario(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Usuario no encontrado." });
    });

    it('devuelve 500 en caso de error', async () => {
      perfilModel.obtenerPerfilPorId.mockRejectedValue(new Error('DB Error'));

      await perfilController.getPerfilUsuario(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Error al obtener perfil" });
    });
  });

  describe('getTodosLosUsuarios', () => {
    it('devuelve la lista de usuarios', async () => {
      const usuarios = [{ id_usuario: 1 }, { id_usuario: 2 }];
      perfilModel.obtenerUsuarios.mockResolvedValue(usuarios);

      req.query.tipo_usuario = 2;
      await perfilController.getTodosLosUsuarios(req, res);
      expect(perfilModel.obtenerUsuarios).toHaveBeenCalledWith(2);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(usuarios);
    });

    it('devuelve 500 si falla', async () => {
      perfilModel.obtenerUsuarios.mockRejectedValue(new Error('fail'));
      await perfilController.getTodosLosUsuarios(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Error al obtener usuarios" });
    });
  });

  describe('getPerfilPorId', () => {
    it('devuelve el perfil si existe', async () => {
      req.params.id = 5;
      const perfil = { id_usuario: 5 };
      perfilModel.obtenerPerfilPorId.mockResolvedValue(perfil);

      await perfilController.getPerfilPorId(req, res);
      expect(perfilModel.obtenerPerfilPorId).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith(perfil);
    });

    it('devuelve 404 si no existe', async () => {
      req.params.id = 5;
      perfilModel.obtenerPerfilPorId.mockResolvedValue(null);

      await perfilController.getPerfilPorId(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Usuario no encontrado" });
    });

    it('devuelve 500 si hay error', async () => {
      req.params.id = 5;
      perfilModel.obtenerPerfilPorId.mockRejectedValue(new Error('fail'));
      await perfilController.getPerfilPorId(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Error en el servidor" });
    });
  });

  describe('actualizarFotoPerfil', () => {
    it('devuelve 403 si rut no coincide', async () => {
      req.body.rut = 'otro-rut';
      req.file = { filename: "test.jpg" }; // <-- CORRECCIÓN: Añadir archivo para pasar la primera validación
      await perfilController.actualizarFotoPerfil(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "No autorizado" });
    });

    it('actualiza foto correctamente', async () => {
      req.body.rut = '12345678-9';
      req.file = { filename: "test.jpg" };
      perfilModel.actualizarImagen.mockResolvedValue({ ok: true });

      await perfilController.actualizarFotoPerfil(req, res);
      expect(perfilModel.actualizarImagen).toHaveBeenCalledWith('12345678-9', req.file, "perfil");
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it('devuelve 500 en error', async () => {
      req.body.rut = '12345678-9';
      req.file = { filename: "test.jpg" };
      perfilModel.actualizarImagen.mockRejectedValue(new Error('fail'));

      await perfilController.actualizarFotoPerfil(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      // <-- CORRECCIÓN: El mensaje debe ser idéntico al del controlador
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Error al actualizar la imagen de perfil" }));
    });
  });

  describe('actualizarPortada', () => {
    it('devuelve 403 si rut no coincide', async () => {
      req.body.rut = 'otro-rut';
      req.file = { filename: "portada.jpg" }; // <-- CORRECCIÓN: Añadir archivo para pasar la primera validación
      await perfilController.actualizarPortada(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: "No autorizado" });
    });

    it('actualiza portada correctamente', async () => {
      req.body.rut = '12345678-9';
      req.file = { filename: "portada.jpg" };
      perfilModel.actualizarImagen.mockResolvedValue({ ok: true });

      await perfilController.actualizarPortada(req, res);
      expect(perfilModel.actualizarImagen).toHaveBeenCalledWith('12345678-9', req.file, "portada");
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    it('devuelve 500 en error', async () => {
      req.body.rut = '12345678-9';
      req.file = { filename: "portada.jpg" };
      perfilModel.actualizarImagen.mockRejectedValue(new Error('fail'));

      await perfilController.actualizarPortada(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      // <-- CORRECCIÓN: El mensaje debe ser idéntico al del controlador
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Error al actualizar la imagen de portada" }));
    });
  });
});
