const productoModel = require('../models/ProductoModel');


exports.getProductosActivos = async (req, res) => {
  try {
    const productos = await productoModel.obtenerActivos();
    res.json(productos);
  } catch (err) {
    console.error("Error al obtener productos activos:", err);
    res.status(500).json({ error: "Error al obtener productos activos desde la base de datos." });
  }
};

// Helper function to avoid code duplication.
// It can be called from different routes (e.g., GET with query params or POST with body).
const obtenerProductosDeBodega = async (req, res, id_sucursal, id_bodega) => {
  if (!id_sucursal || !id_bodega) {
    return res.status(400).json({ error: "Debe enviar id_sucursal e id_bodega." });
  }

  try {
    const productos = await productoModel.obtenerPorBodega(id_bodega, id_sucursal);
    if (req.user && req.user.email) {
      console.log(`Consulta de productos para bodega ${id_bodega} en sucursal ${id_sucursal} por ${req.user.email}`);
    }
    res.json(productos);
  } catch (err) {
    console.error("Error al consultar productos por bodega:", err);
    res.status(500).json({ error: "Error al obtener productos desde la base de datos." });
  }
};

exports.getProductosPorBodega = async (req, res) => {
  const { id_sucursal, id_bodega } = req.query;
  await obtenerProductosDeBodega(req, res, id_sucursal, id_bodega);
};

exports.getProductosPorBodegaPost = async (req, res) => {
  const { id_sucursal, id_bodega } = req.body;
  await obtenerProductosDeBodega(req, res, id_sucursal, id_bodega);
};
