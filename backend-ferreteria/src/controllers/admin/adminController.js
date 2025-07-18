const adminProductModel = require('../../models/admin/adminProductModel');
const adminCompraModel = require('../../models/admin/adminCompraModel');
const adminTransaccionModel = require('../../models/admin/adminTransaccionModel');
const path = require('path');
const fs = require('fs-extra');
const productoModel = require('../../models/admin/adminProductModel');

// ========= PRODUCTOS =========

exports.crearProducto = async (req, res) => {
  try {
    // La validación de datos de entrada (con Joi, por ejemplo) sería ideal aquí
    const idProducto = await adminProductModel.crearProducto(req.body);
    res.status(201).json({ message: 'Producto creado con éxito', idProducto });
  } catch (err) {
    console.error('Error al crear producto:', err);
    // Evitar filtrar el mensaje de error de la BD al cliente
    res.status(500).json({ error: 'Error interno al crear el producto.' });
  }
};

exports.listarProductos = async (req, res) => {
  try {
    // Usa la función optimizada que ya obtiene todos los detalles
    const productos = await adminProductModel.obtenerProductosConDetalles();
    res.json(productos);
  } catch (err) {
    console.error('Error al listar productos:', err);
    res.status(500).json({ error: 'Error interno al obtener los productos.' });
  }
};

exports.actualizarProducto = async (req, res) => {
  console.log('REQ.BODY', req.body);
  try {
    const { idProducto } = req.params;
    // El modelo ahora maneja la transacción de manera atómica
    await adminProductModel.actualizarProducto(idProducto, req.body);
    res.json({ message: 'Producto actualizado correctamente' });
  } catch (err) {
    console.error(`Error al actualizar producto ${req.params.idProducto}:`, err);
    res.status(500).json({ error: 'Error interno al actualizar el producto.' });
  }
};

exports.subirImagenProducto = async (req, res) => {
  try {
    const { idProducto } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No se envió ninguna imagen' });
    }

    const rutaImagen = `/uploads/productos/${idProducto}/${req.file.filename}`;
    await productoModel.actualizarRutaImagen(idProducto, rutaImagen);

    return res.json({ message: 'Imagen subida y asociada correctamente', path: rutaImagen });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    // Si algo falla, eliminamos el archivo que se acaba de subir para no dejar basura.
    if (req.file) {
      await fs.remove(req.file.path);
      console.log(`[SUBIR IMAGEN][ROLLBACK] Se eliminó el archivo subido ${req.file.path} debido a un error.`);
    }
    res.status(500).json({ error: 'Error interno al subir la imagen' });
  }
};


// ========= COMPRAS =========

exports.listarCompras = async (req, res) => {
  try {
    // Refactorizado para usar la función correcta y unificada del modelo
    const data = await adminCompraModel.listarComprasConFiltros(req.query);
    res.json(data);
  } catch (err) {
    console.error('Error al listar compras:', err);
    res.status(500).json({ error: 'Error interno al obtener las compras.' });
  }
};

exports.verDetalleCompra = async (req, res) => {
  try {
    const { idCompra } = req.params;
    const detalle = await adminCompraModel.obtenerDetalleCompra(idCompra);
    if (!detalle || !detalle.compra) {
      return res.status(404).json({ error: 'Compra no encontrada' });
    }
    res.json(detalle);
  } catch (err) {
    console.error(`Error al obtener detalle de compra ${req.params.idCompra}:`, err);
    res.status(500).json({ error: 'Error interno al obtener el detalle de la compra.' });
  }
};

// ========= TRANSACCIONES =========

exports.listarTransacciones = async (req, res) => {
  try {
    const data = await adminTransaccionModel.listarTransaccionesConFiltros(req.query);
    res.json(data);
  } catch (err) {
    console.error('Error al listar transacciones:', err);
    res.status(500).json({ error: 'Error interno al obtener las transacciones.' });
  }
};

// ========= CATÁLOGOS (Marcas, Modelos, Categorías) =========

const listarCatalogo = (modelFunction) => async (req, res) => {
  try {
    const items = await modelFunction();
    res.json(items);
  } catch (err) {
    console.error(`Error al listar catálogo:`, err);
    res.status(500).json({ error: 'Error interno al obtener el listado.' });
  }
};

exports.listarMarcas = listarCatalogo(adminProductModel.listarMarcas);
exports.listarModelos = listarCatalogo(adminProductModel.listarModelos);
exports.listarCategorias = listarCatalogo(adminProductModel.listarCategorias);

exports.crearMarca = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de la marca es requerido' });
    }
    const idMarca = await adminProductModel.crearMarca(nombre);
    res.status(201).json({ message: 'Marca creada con éxito', idMarca });
  } catch (err) {
    console.error('Error al crear marca:', err);
    res.status(500).json({ error: 'Error interno al crear la marca.' });
  }
}
exports.crearModelo = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre del modelo es requerido' });
    }
    const idModelo = await adminProductModel.crearModelo(nombre);
    res.status(201).json({ message: 'Modelo creado con éxito', idModelo });
  } catch (err) {
    console.error('Error al crear modelo:', err);
    res.status(500).json({ error: 'Error interno al crear el modelo.' });
  }
}
exports.crearCategoria = async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) {
      return res.status(400).json({ error: 'Nombre de la categoría es requerido' });
    }
    const idCategoria = await adminProductModel.crearCategoria(nombre);
    res.status(201).json({ message: 'Categoría creada con éxito', idCategoria });
  } catch (err) {
    console.error('Error al crear categoría:', err);
    res.status(500).json({ error: 'Error interno al crear la categoría.' });
  }
}