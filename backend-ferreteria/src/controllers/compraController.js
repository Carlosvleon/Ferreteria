const webpayService = require('../services/webpayService');
const compraModel = require('../models/compraModel');

exports.realizarCompra = async (req, res) => {
  try {
    const usuarioId = req.user.id_usuario;
    const resultado = await compraModel.realizarCompra(usuarioId);
    res.json(resultado);
  } catch (err) {
    console.error("Error al realizar la compra:", err);
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
  try {
    const usuarioId = req.user.id_usuario;
    const carrito = await compraModel.obtenerCarritoYTotal(usuarioId);

    if (!carrito || carrito.total <= 0) throw new Error('Carrito vacío o sin total');

    //  returnUrl estático (el token lo recibe Webpay vía POST)
    const returnUrl = `${process.env.FRONT_URL}/webpay/exito`;

    //  token y url se obtienen ahora
    const { token, url } = await webpayService.iniciarTransaccion(carrito.total, returnUrl);

    res.json({ token, url });
  } catch (err) {
    console.error('[WEBPAY][ERROR]', err);
    res.status(500).json({ error: "Error al iniciar el pago con Webpay." });
  }
};

exports.confirmarPagoWebpay = async (req, res) => {
  try {
    const { token_ws } = req.body;
    if (!token_ws) {
      return res.status(400).json({ error: 'Token de transacción es requerido' });
    }

    const resultado = await webpayService.confirmarTransaccion(token_ws);
    console.log('[WEBPAY][RESULTADO]', resultado);

    const usuarioId = req.user.id_usuario;

    // Por defecto no hay compra asociada (solo si es exitosa se asocia)
    let confirmacion = null;
    let idCompra = null;
    let transaccionExitosa = false;

    // Evalúa si es exitosa
    if (resultado.status === 'AUTHORIZED' && resultado.response_code === 0) {
      confirmacion = await compraModel.realizarCompra(usuarioId);
      if (confirmacion.exito) {
        idCompra = confirmacion.id_compra;
        transaccionExitosa = true;
      }
    }

    // Guarda SIEMPRE la transacción, exitosa o no
    await compraModel.guardarTransaccionWebpay(usuarioId, resultado, idCompra);

    // Si falló la transacción o la compra, responde con error (pero la transacción ya quedó registrada)
    if (!transaccionExitosa) {
      return res.status(400).json({
        error: 'Transacción no autorizada',
        detalle: resultado
      });
    }

    // Si todo ok, responde como siempre
    return res.json({
      mensaje: 'Compra realizada con éxito.',
      datos: confirmacion,
      transaccion: {
        buyOrder: resultado.buy_order,
        amount: resultado.amount,
        cardLastDigits: resultado.card_detail?.card_number,
        authorizationCode: resultado.authorization_code,
        transactionDate: resultado.transaction_date,
        paymentType: resultado.payment_type_code,
        installments: resultado.installments_number
      }
    });
  } catch (err) {
    // Registrar el error también como transacción fallida
    try {
      const usuarioId = req.user?.id_usuario ?? null;
      await compraModel.guardarTransaccionWebpay(usuarioId, { status: 'ERROR', error_message: err.message }, null);
    } catch (e) {
      console.error('No se pudo registrar el error de la transacción Webpay:', e);
    }
    console.error('[WEBPAY][ERROR][COMMIT]', err);
    res.status(500).json({ error: 'Error al confirmar la transacción' });
  }
};

