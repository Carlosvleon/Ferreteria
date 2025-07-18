const carritoModel = require('../models/CarritoModel');

exports.agregarAlCarrito = async (req, res) => {
  try {
    const usuarioId = req.user.id_usuario;
    const { id_sucursal, productos } = req.body;

    // Validar que cada producto tenga id_producto y cantidad
    for (const producto of productos) {
      if (
        typeof producto.id_producto !== 'number' ||
        typeof producto.cantidad !== 'number' ||
        producto.cantidad <= 0
      ) {
        return res.status(400).json({ error: "Cada producto debe tener un id_producto y una cantidad válida." });
      }
    }

    // Llama al modelo, que debe implementar la lógica de buscar bodegas y descontar stock
    const resultado = await carritoModel.agregarProductosPorSucursal(usuarioId, id_sucursal, productos);
    res.json(resultado);
  } catch (err) {
    console.error("Error al agregar productos al carrito:", err);
    res.status(500).json({ error: "Error interno al agregar productos al carrito." });
  }
};

exports.obtenerCarrito = async (req, res) => {
  try {
    const usuarioId = req.user.id_usuario;
    const resultado = await carritoModel.obtenerCarrito(usuarioId);
    res.json(resultado);
  } catch (err) {
    console.error("Error al obtener el carrito:", err);
    res.status(500).json({ error: "Error al obtener el carrito de compras." });
  }
};
