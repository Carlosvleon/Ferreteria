const pool = require('../db');

exports.realizarCompra = async (usuarioId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Obtener el carrito y sus productos
    const { rows: carritoRows } = await client.query(
      "SELECT id_carrito_compras, total FROM carrito_compras WHERE id_usuario = $1",
      [usuarioId]
    );
    if (carritoRows.length === 0) throw new Error('No hay carrito activo para este usuario.');

    const idCarrito = carritoRows[0].id_carrito_compras;
    const totalCarrito = carritoRows[0].total;

    const { rows: productosCarrito } = await client.query(
      `SELECT dcc.id_producto, dcc.cantidad, dcc.total, p.nombre
       FROM detalle_carrito_compras dcc
       JOIN producto p ON dcc.id_producto = p.id_producto
       WHERE dcc.id_carrito_compras = $1`,
      [idCarrito]
    );
    if (productosCarrito.length === 0) throw new Error('El carrito está vacío.');

    // 2. Validar stock para cada producto
    let productosSinStock = [];
    for (const item of productosCarrito) {
      const { rows: stockRows } = await client.query(
        `SELECT SUM(stock) AS stock_total
         FROM bodega_producto
         WHERE id_producto = $1`,
        [item.id_producto]
      );
      const stockTotal = parseInt(stockRows[0].stock_total || 0, 10);
      if (stockTotal < item.cantidad) {
        productosSinStock.push({
          id_producto: item.id_producto,
          nombre: item.nombre,
          solicitado: item.cantidad,
          disponible: stockTotal
        });
      }
    }
    if (productosSinStock.length > 0) {
      await client.query('ROLLBACK');
      return {
        exito: false,
        mensaje: 'Stock insuficiente para algunos productos.',
        productosSinStock
      };
    }

    // 3. Crear la compra
    const { rows: compraRows } = await client.query(
      `INSERT INTO compra (id_usuario, total, fecha)
       VALUES ($1, $2, NOW())
       RETURNING id_compra`,
      [usuarioId, totalCarrito]
    );
    const idCompra = compraRows[0].id_compra;
    // Depurar datos de la compra creada (opcional: puedes ajustar los campos que desees mostrar)
    console.log({
      id_compra: idCompra,
      usuario: usuarioId,
      total: totalCarrito,
      productos: productosCarrito.map(p => ({
      id_producto: p.id_producto,
      nombre: p.nombre,
      cantidad: p.cantidad,
      total: p.total
      }))
    });

    // 4. Crear los detalles de compra (incluyendo nombre_producto)
    for (const item of productosCarrito) {
      await client.query(
        `INSERT INTO detalle_compra (id_compra, id_producto, cantidad, total, nombre_producto)
         VALUES ($1, $2, $3, $4, $5)`,
        [idCompra, item.id_producto, item.cantidad, item.total, item.nombre]
      );
    }

    // 5. Descontar stock de bodegas (en orden, varias si es necesario)
    for (const item of productosCarrito) {
      let cantidadRestante = item.cantidad;
      const { rows: bodegas } = await client.query(
        `SELECT id_bodega, stock FROM bodega_producto
         WHERE id_producto = $1 AND stock > 0
         ORDER BY id_bodega ASC`,
        [item.id_producto]
      );
      for (const bodega of bodegas) {
        if (cantidadRestante <= 0) break;
        const descontar = Math.min(bodega.stock, cantidadRestante);
        await client.query(
          `UPDATE bodega_producto SET stock = stock - $1
           WHERE id_bodega = $2 AND id_producto = $3`,
          [descontar, bodega.id_bodega, item.id_producto]
        );
        cantidadRestante -= descontar;
      }
    }

    // 6. Vaciar el carrito
    await client.query(
      `DELETE FROM detalle_carrito_compras WHERE id_carrito_compras = $1`,
      [idCarrito]
    );
    await client.query(
      `UPDATE carrito_compras SET total = 0 WHERE id_carrito_compras = $1`,
      [idCarrito]
    );

    await client.query('COMMIT');
    return {
      exito: true,
      mensaje: 'Compra realizada con éxito.',
      id_compra: idCompra,
      total: totalCarrito,
      productos: productosCarrito
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
exports.obtenerComprasPorUsuario = async (usuarioId) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT c.id_compra, c.total, c.fecha,
              json_agg(json_build_object(
                'id_producto', dc.id_producto,
                'nombre', dc.nombre_producto,
                'cantidad', dc.cantidad,
                'total', dc.total
              )) AS productos
         FROM compra c
         JOIN detalle_compra dc ON c.id_compra = dc.id_compra
        WHERE c.id_usuario = $1
        GROUP BY c.id_compra
        ORDER BY c.fecha DESC`,
      [usuarioId]
    );
    return rows;
  } finally {
    client.release();
  }
};

exports.obtenerCarritoYTotal = async (usuarioId) => {
  const { rows } = await pool.query(
    'SELECT id_carrito_compras, total FROM carrito_compras WHERE id_usuario = $1',
    [usuarioId]
  );
  if (rows.length === 0) return null;
  return { id: rows[0].id_carrito_compras, total: parseFloat(rows[0].total || 0) };
};

async function guardarTransaccionWebpay(usuarioId, resultado, idCompra = null) {
  // Destructura lo que exista en resultado (puede llegar info incompleta si falla la transacción)
  const { 
    buy_order = null, session_id = null, status = null, amount = null, authorization_code = null, 
    card_detail = {}, payment_type_code = null, response_code = null, installments_number = null, transaction_date = null,
    error_message = null
  } = resultado || {};

  const card_last_digits = card_detail?.card_number ?? null;

  // Guarda la transacción siempre, aunque falle
  const transaccion = await pool.query(
    `INSERT INTO transaccion_webpay (
      id_usuario, buy_order, session_id, status, amount, authorization_code,
      card_last_digits, payment_type_code, response_code, installments_number, transaction_date, error_message
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
    [
      usuarioId, buy_order, session_id, status, amount, authorization_code,
      card_last_digits, payment_type_code, response_code, installments_number, transaction_date, error_message
    ]
  );

  const idTransaccion = transaccion.rows[0].id;

  // Solo crea la relación con compra si existe idCompra (transacción exitosa)
  if (idCompra) {
    await pool.query(
      `INSERT INTO compra_transaccion_webpay (id_compra, id_transaccion) VALUES ($1, $2)`,
      [idCompra, idTransaccion]
    );
  }
}


exports.guardarTransaccionWebpay = guardarTransaccionWebpay;
