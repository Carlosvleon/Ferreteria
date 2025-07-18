const pool = require("../db");

exports.obtenerTodos = async () => {
  const productosResult = await pool.query(
    `SELECT 
      p.id_producto,
      p.codigo_producto,
      p.nombre,
      p.imagen,
      p.id_marca,
      p.activo,
      m.nombre AS marca,
      p.id_modelo,
      mo.nombre AS modelo,
      p.id_categoria,
      c.nombre AS categoria, 
      po.precio_online
    FROM producto p
    LEFT JOIN precios_online po ON po.id_producto = p.id_producto
    LEFT JOIN marca m ON m.id_marca = p.id_marca
    LEFT JOIN modelo mo ON mo.id_modelo = p.id_modelo
    LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.activo = true
    ORDER BY p.id_producto ASC`
  );

  return productosResult.rows;
};

exports.obtenerActivos = async () => {
  const query = `
    SELECT 
      p.id_producto, p.codigo_producto, p.nombre, p.imagen, p.id_marca, p.activo,
      m.nombre AS marca, p.id_modelo, mo.nombre AS modelo, p.id_categoria, c.nombre AS categoria, 
      po.precio_online,
      (
        SELECT jsonb_agg(sedes)
        FROM (
          SELECT s.id_sucursal, s.nombre AS nombre_sucursal,
                 jsonb_agg(jsonb_build_object('idBodega', b.id_bodega, 'nombreBodega', b.nombre, 'stock', bp.stock)) AS bodegas
          FROM bodega_producto bp
          JOIN bodega b ON bp.id_bodega = b.id_bodega
          JOIN sucursal s ON b.id_sucursal = s.id_sucursal
          WHERE bp.id_producto = p.id_producto
          GROUP BY s.id_sucursal, s.nombre
        ) AS sedes
      ) AS sedes
    FROM producto p
    LEFT JOIN precios_online po ON po.id_producto = p.id_producto
    LEFT JOIN marca m ON m.id_marca = p.id_marca
    LEFT JOIN modelo mo ON mo.id_modelo = p.id_modelo
    LEFT JOIN categoria c ON c.id_categoria = p.id_categoria
    WHERE p.activo = true
    ORDER BY p.id_producto ASC;
  `;
  const { rows } = await pool.query(query);
  return rows;
};
