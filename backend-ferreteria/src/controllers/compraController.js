const webpayService = require('../services/webpayService');
const compraModel = require('../models/CompraModel');
const pool = require('../db');

exports.realizarCompra = async (req, res) => {
  try {
    const usuarioId = req.user.id_usuario;
    const resultado = await compraModel.realizarCompra(usuarioId);
    res.json(resultado);
  } catch (err) {
    console.error("Error al realizar la compra:", err);
    await compraModel.guardarTransaccionWebpay(req.user.id_usuario, {
      buy_order: null,
      session_id: null,
      status: "FAILED",
      error_message: err.message
    });
    res.status(500).json({ error: "Error interno al procesar la compra." });
  }
};

exports.obtenerMisCompras = async (req, res) => {
  try {
    const usuarioId = req.user.id_usuario;
    const compras = await compraModel.obtenerComprasPorUsuario(usuarioId);
    res.json(compras);
  } catch (err) {
    console.error("Error al obtener compras del usuario:", err);
    res.status(500).json({ error: "Error al obtener compras del usuario." });
  }
};

exports.pagarConWebpay = async (req, res) => {
  const client = await pool.connect();
  try {
    const usuarioId = req.user.id_usuario;
    const carrito = await compraModel.obtenerCarritoYTotal(usuarioId);

    if (!carrito || carrito.total <= 0) throw new Error('Carrito vacío o sin total');

    //  returnUrl estático (el token lo recibe Webpay vía POST)
    const returnUrl = `${process.env.FRONT_URL}/webpay/exito`;

    //  token y url se obtienen ahora
    const { token, url, buyOrder, sessionId, amount } = await webpayService.iniciarTransaccion(carrito.total, returnUrl);

    // Registramos la intención de pago
    await client.query(
      `INSERT INTO transaccion_webpay (
        buy_order, session_id, status, amount
      ) VALUES ($1, $2, $3, $4)`,
      [buyOrder, sessionId, 'INITIALIZED', amount]
    );

    await client.query('COMMIT');
    res.json({ token, url });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[WEBPAY][ERROR]', err);
    res.status(500).json({ error: "Error al iniciar el pago con Webpay." });
  } finally {
    client.release();
  }
};

exports.confirmarPagoWebpay = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { token_ws } = req.body;
    if (!token_ws) {
      return res.status(400).json({ error: 'Token de transacción es requerido' });
    }

    const usuarioId = req.user.id_usuario;
    let resultado;
    try {
      resultado = await webpayService.confirmarTransaccion(token_ws);
      console.log('[WEBPAY][RESULTADO]', resultado);
    } catch (error) {
      // Si falla la confirmación con Webpay, actualizamos la transacción a FAILED
      await client.query(
        `UPDATE transaccion_webpay SET
          status = 'FAILED',
          response_code = -1,
          transaction_date = NOW()
         WHERE session_id = $1`,
        [token_ws]
      );
      await client.query('COMMIT');
      throw error;
    }

    let confirmacion = null;
    let idCompra = null;
    let transaccionExitosa = false;

    const { 
      buy_order, session_id, status, amount, authorization_code, 
      card_detail = {}, payment_type_code, response_code, installments_number, transaction_date
    } = resultado;

    const card_last_digits = card_detail?.card_number ?? null;

    // Actualizamos la transacción con el resultado
    const transaccionResult = await client.query(
      `UPDATE transaccion_webpay SET
        status = $1, 
        authorization_code = $2,
        card_last_digits = $3, 
        payment_type_code = $4, 
        response_code = $5, 
        installments_number = $6, 
        transaction_date = $7
      WHERE buy_order = $8
      RETURNING id, status, response_code`,
      [
        status || 'FAILED', 
        authorization_code,
        card_last_digits, 
        payment_type_code, 
        response_code || -1, 
        installments_number, 
        transaction_date || 'NOW()',
        buy_order
      ]
    );

    if (transaccionResult.rows.length === 0) {
      throw new Error('No se encontró la transacción original');
    }

    const transaccionWebpay = transaccionResult.rows[0];

    if (resultado.status === 'AUTHORIZED' && resultado.response_code === 0) {
      try {
        // Pasamos el client a realizarCompra para usar la misma transacción
        confirmacion = await compraModel.realizarCompra(usuarioId, client);
        if (confirmacion.exito) {
          idCompra = confirmacion.id_compra;
          // Si la compra fue exitosa, creamos la relación en compra_transaccion_webpay
          await client.query(
            `INSERT INTO compra_transaccion_webpay (id_compra, id_transaccion) VALUES ($1, $2)`,
            [idCompra, transaccionWebpay.id]
          );
          transaccionExitosa = true;
        }
      } catch (compraError) {
        // Si falla la compra, actualizamos el estado de la transacción a FAILED
        await client.query(
          `UPDATE transaccion_webpay SET
            status = 'FAILED',
            response_code = -2
           WHERE id = $1`,
          [transaccionWebpay.id]
        );
        await client.query('COMMIT'); // Confirmamos la actualización del estado
        throw compraError;
      }
    }

    await client.query('COMMIT');

    if (!transaccionExitosa) {
      return res.status(400).json({
        error: 'Transacción no autorizada',
        detalle: resultado
      });
    }

    res.json({ 
      mensaje: 'Compra realizada con éxito', 
      idCompra,
      detalleTransaccion: resultado
    });
  } catch (err) {
    console.error("Error al confirmar el pago con Webpay:", err);
    // Aseguramos que cualquier transacción pendiente sea revertida
    await client.query('ROLLBACK');
    
    // Guardamos el registro del error en la transacción
    await compraModel.guardarTransaccionWebpay(req.user.id_usuario, {
      buy_order: null,
      session_id: null,
      status: "FAILED"
    });
    
    res.status(500).json({ 
      error: "Error interno al confirmar el pago.",
      mensaje: err.message 
    });
  } finally {
    client.release();
  }
};

