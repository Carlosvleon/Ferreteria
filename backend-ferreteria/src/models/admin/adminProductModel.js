const pool = require('../../db');
const { v4: uuidv4 } = require('uuid'); 

exports.crearProducto = async (productoData) => {
  const client = await pool.connect();
  const { codigoProducto, nombre, idMarca, idModelo, idCategoria, precioOnline } = productoData;

  try {
    await client.query('BEGIN');

    // Validar código único opcionalmente
    const existe = await client.query(`SELECT 1 FROM producto WHERE codigo_producto = $1`, [codigoProducto]);
    if (existe.rowCount > 0) {
      throw new Error('Ya existe un producto con ese código');
    }

    // Paso 1: Crear el producto
    const result = await client.query(`
      INSERT INTO producto (codigo_producto, nombre, id_marca, id_modelo, id_categoria, activo)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id_producto
    `, [codigoProducto, nombre, idMarca, idModelo, idCategoria]);

    const idProducto = result.rows[0].id_producto;

    // Paso 2: Crear su precio online
    await client.query(`
      INSERT INTO precios_online (id_producto, precio_online)
      VALUES ($1, $2)
    `, [idProducto, precioOnline]);

    // Paso 3: Asociar el producto a todas las bodegas activas, si no existe la relación
    const bodegasRes = await client.query(`SELECT id_bodega FROM bodega WHERE activo = true`);
    for (const bodega of bodegasRes.rows) {
      await client.query(`
        INSERT INTO bodega_producto (id_bodega, id_producto, stock, stock_critico, fecha_modificacion)
        SELECT $1, $2, 0, 10, NOW()
        WHERE NOT EXISTS (
          SELECT 1 FROM bodega_producto WHERE id_bodega = $1 AND id_producto = $2
        )
      `, [bodega.id_bodega, idProducto]);
    }

    await client.query('COMMIT');
    return idProducto;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

exports.obtenerProductosConDetalles = async () => {
  const query = `
    SELECT
      p.id_producto,
      p.nombre AS nombre_producto,
      p.codigo_producto, p.imagen, p.activo,
      p.id_marca, p.id_modelo, p.id_categoria,
      m.nombre AS marca,
      mo.nombre AS modelo,
      c.nombre AS categoria,
      po.precio_online,
      jsonb_agg(
        jsonb_build_object(
          'id_sucursal', s.id_sucursal, 'nombre_sucursal', s.nombre,
          'id_bodega', b.id_bodega, 'nombre_bodega', b.nombre,
          'stock', bp.stock
        )
      ) FILTER (WHERE b.id_bodega IS NOT NULL) AS stock_por_bodega
    FROM producto p
    LEFT JOIN marca m ON p.id_marca = m.id_marca
    LEFT JOIN modelo mo ON p.id_modelo = mo.id_modelo
    LEFT JOIN categoria c ON p.id_categoria = c.id_categoria
    LEFT JOIN precios_online po ON p.id_producto = po.id_producto
    LEFT JOIN bodega_producto bp ON p.id_producto = bp.id_producto LEFT JOIN bodega b ON bp.id_bodega = b.id_bodega LEFT JOIN sucursal s ON b.id_sucursal = s.id_sucursal
    GROUP BY p.id_producto, m.nombre, mo.nombre, c.nombre, po.precio_online
    ORDER BY p.id_producto
  `;

  const result = await pool.query(query);
  return result.rows;
};

exports.listarMarcas = async () => {
  const result = await pool.query('SELECT id_marca AS id, nombre FROM marca WHERE activo IS TRUE');
  return result.rows;
};

exports.listarModelos = async () => {
  const result = await pool.query('SELECT id_modelo AS id, nombre FROM modelo WHERE activo IS TRUE');
  return result.rows;
};

exports.listarCategorias = async () => {
  const result = await pool.query('SELECT id_categoria AS id, nombre FROM categoria WHERE activo IS TRUE');
  return result.rows;
};

exports.crearMarca = async (nombre) => {
  const result = await pool.query(`
    INSERT INTO marca (nombre, activo)
    VALUES ($1, true)
    RETURNING id_marca AS id
  `, [nombre]);

  return result.rows[0].id;
};

exports.crearModelo = async (nombre) => {
  const result = await pool.query(`
    INSERT INTO modelo (nombre, activo)
    VALUES ($1, true)
    RETURNING id_modelo AS id
  `, [nombre]);
  return result.rows[0].id;
};

exports.crearCategoria = async (nombre) => {
  const result = await pool.query(`
    INSERT INTO categoria (nombre, activo)
    VALUES ($1, true)
    RETURNING id_categoria AS id
  `, [nombre]);
  return result.rows[0].id;
};

exports.actualizarProducto = async (idProducto, datos) => {
  // ¡DEBE SER EN SNAKE_CASE!
  const {
    codigo_producto,
    nombre_producto,
    id_marca,
    id_modelo,
    id_categoria,
    precio_online,
    stock_por_bodega = [],
    activo
  } = datos;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Activo solo true o false o null
    const valorActivo = (activo === true || activo === false) ? activo : null;

    await client.query(`
      UPDATE producto
      SET codigo_producto = $1,
          nombre = $2,
          id_marca = $3,
          id_modelo = $4,
          id_categoria = $5,
          activo = $6
      WHERE id_producto = $7
    `, [
      codigo_producto,
      nombre_producto,
      id_marca,
      id_modelo,
      id_categoria,
      valorActivo,
      idProducto
    ]);

    await client.query(`
      UPDATE precios_online
      SET precio_online = $1
      WHERE id_producto = $2
    `, [precio_online, idProducto]);

    for (const item of stock_por_bodega) {
      const { id_bodega, stock } = item;
      await client.query(`
        UPDATE bodega_producto
        SET stock = $1,
            fecha_modificacion = NOW()
        WHERE id_producto = $2 AND id_bodega = $3
      `, [stock, idProducto, id_bodega]);
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};


exports.actualizarRutaImagen = async (idProducto, rutaImagen) => {
  await pool.query(
    'UPDATE producto SET imagen = $1 WHERE id_producto = $2',
    [rutaImagen, idProducto]
  );
};

exports.obtenerProductoPorId = async (idProducto) => {
  const result = await pool.query(
    'SELECT * FROM producto WHERE id_producto = $1',
    [idProducto]
  );
  return result.rows[0];
};

exports.repararStockFaltante = async (idProducto) => {
  const { rows } = await pool.query('SELECT id_bodega FROM bodega');
  for (const bodega of rows) {
    await pool.query(`
      INSERT INTO bodega_producto (id_bodega, id_producto, stock, stock_critico)
      VALUES ($1, $2, 0, 0)
      ON CONFLICT DO NOTHING
    `, [bodega.id_bodega, idProducto]);
  }
};

exports.obtenerRutaImagenPorId = async (idProducto) => {
  try {
    // Usando los nombres correctos que indicaste: tabla 'producto', columna 'imagen'.
    const result = await pool.query('SELECT imagen FROM producto WHERE id_producto = $1', [idProducto]);
    // ¡CORRECCIÓN CLAVE! Devolver el valor de la columna 'imagen'.
    return result.rows[0]?.imagen || null;
  } catch (error) {
    console.error(`Error al obtener la ruta de la imagen para el producto ${idProducto}:`, error);
    throw error; // Propaga el error para que el controlador lo maneje
  }
};
