const perfilModel = require('../models/PerfilModel');

exports.getPerfilUsuario = async (req, res) => {
  try {
    const userId = req.user.id_usuario;
    const perfil = await perfilModel.obtenerPerfilPorId(userId);
    if (!perfil) return res.status(404).json({ error: "Usuario no encontrado." });
    res.json(perfil);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener perfil" });
  }
};

exports.getTodosLosUsuarios = async (req, res) => {
  try {
    const usuarios = await perfilModel.obtenerUsuarios(req.query.tipo_usuario);
    res.status(200).json(usuarios);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener usuarios" });
  }
};

exports.getPerfilPorId = async (req, res) => {
  try {
    const perfil = await perfilModel.obtenerPerfilPorId(req.params.id);
    if (!perfil) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(perfil);
  } catch (err) {
    res.status(500).json({ error: "Error en el servidor" });
  }
};

const actualizarImagenGenerico = async (req, res, tipo) => {
  try {
    const { rut } = req.body;
    if (!req.file) return res.status(400).json({ error: "No se ha subido ningún archivo." });
    if (req.user.rut !== rut) return res.status(403).json({ error: "No autorizado" });

    const resultado = await perfilModel.actualizarImagen(rut, req.file, tipo);
    res.json(resultado);
  } catch (err) {
    console.error(`Error al actualizar la imagen de ${tipo}:`, err);
    res.status(500).json({ error: `Error al actualizar la imagen de ${tipo}` });
  }
};

exports.actualizarFotoPerfil = (req, res) => actualizarImagenGenerico(req, res, "perfil");

exports.actualizarPortada = (req, res) => actualizarImagenGenerico(req, res, "portada");
