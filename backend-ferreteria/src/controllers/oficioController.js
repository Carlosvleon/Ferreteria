const oficioModel = require('../models/OficioModel');

exports.obtenerOficios = async (req, res) => {
  try {
    const oficios = await oficioModel.listarOficios();
    res.status(200).json(oficios);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener los oficios y sus especializaciones' });
  }
};

exports.agregarOficios = async (req, res) => {
  try {
    const usuario_id = req.user.id_usuario;
    const oficios = req.body.oficios;

    if (!oficios || !Array.isArray(oficios)) {
      return res.status(400).json({ error: 'Faltan datos obligatorios o los oficios no son válidos' });
    }

    await oficioModel.agregarOficiosUsuario(usuario_id, oficios);
    res.status(201).json({ message: 'Oficios agregados correctamente' });
  } catch (err) {
    console.error('Error al agregar los oficios:', err);
    res.status(500).json({ error: 'Error interno al agregar los oficios' });
  }
};

exports.actualizarEstado = async (req, res) => {
  try {
    const { oficio_id, especializacion_id, estado_id } = req.body;
    const usuario_id = req.user.id_usuario;

    if (!oficio_id || !especializacion_id || !estado_id) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    await oficioModel.actualizarEstadoOficio(usuario_id, oficio_id, especializacion_id, estado_id);
    res.status(200).json({ message: 'Estado del oficio actualizado correctamente' });
  } catch (err) {
    console.error('Error al actualizar el estado del oficio:', err);
    res.status(500).json({ error: 'Error interno al actualizar el estado del oficio' });
  }
};
