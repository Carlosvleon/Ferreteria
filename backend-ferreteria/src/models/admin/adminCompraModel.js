const pool = require('../../db');

exports.listarComprasConFiltros = async ({ rut, fechaInicio, fechaFin, busqueda, pagina = 1, limite = 10 }) => {
  const offset = (pagina - 1) * limite;

  const filtros = [];
  const valores = [];

  if (rut) {
    filtros.push('u.rut ILIKE $' + (valores.length + 1));
    valores.push(`%${rut}%`);
  }

  if (fechaInicio) {
    filtros.push('c.fecha >= $' + (valores.length + 1));
    valores.push(fechaInicio);
  }

  if (fechaFin) {
    filtros.push('c.fecha <= $' + (valores.length + 1));
    valores.push(fechaFin);
  }

  if (busqueda) {
    filtros.push(`(u.email ILIKE $${valores.length + 1} OR CAST(c.id_compra AS TEXT) ILIKE $${valores.length + 1})`);
    valores.push(`%${busqueda}%`);
  }

  const whereClause = filtros.length ? 'WHERE ' + filtros.join(' AND ') : '';

  // Consulta de resultados
  const query = `
    SELECT c.id_compra, c.total, c.fecha, u.email, u.rut,
           COUNT(dc.id_producto) AS total_productos
    FROM compra c
    JOIN usuarios u ON u.id_usuario = c.id_usuario
    JOIN detalle_compra dc ON dc.id_compra = c.id_compra
    ${whereClause}
    GROUP BY c.id_compra, u.email, u.rut
    ORDER BY c.fecha DESC
    LIMIT $${valores.length + 1} OFFSET $${valores.length + 2}
  `;

  const countQuery = `
    SELECT COUNT(DISTINCT c.id_compra) AS total
    FROM compra c
    JOIN usuarios u ON u.id_usuario = c.id_usuario
    JOIN detalle_compra dc ON dc.id_compra = c.id_compra
    ${whereClause}
  `;

  const totalRes = await pool.query(countQuery, valores);
  const totalCompras = parseInt(totalRes.rows[0].total, 10);
  const totalPaginas = Math.ceil(totalCompras / limite);

  valores.push(limite, offset);
  const { rows } = await pool.query(query, valores);

  return { resultados: rows, totalPaginas };
};


exports.obtenerDetalleCompra = async (idCompra) => {
  const compraQuery = `
    SELECT c.id_compra, c.total, c.fecha, u.email, u.rut
    FROM compra c
    JOIN usuarios u ON u.id_usuario = c.id_usuario
    WHERE c.id_compra = $1
  `;

  const detalleQuery = `
    SELECT nombre_producto, cantidad, total
    FROM detalle_compra
    WHERE id_compra = $1
  `;

  const transaccionQuery = `
    SELECT t.*
    FROM transaccion_webpay t
    JOIN compra_transaccion_webpay ct ON t.id = ct.id_transaccion
    WHERE ct.id_compra = $1
  `;

  const [compra] = (await pool.query(compraQuery, [idCompra])).rows;
  const detalle = (await pool.query(detalleQuery, [idCompra])).rows;
  const transaccion = (await pool.query(transaccionQuery, [idCompra])).rows[0];

  return { compra, detalle, transaccion };
};
