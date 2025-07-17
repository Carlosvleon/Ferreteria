const webpayService = require('../services/webpayService');
const compraModel = require('../models/compraModel');

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

    const resultado = await webpayService.confirmarTransaccion(token_ws, req.user.id_usuario);
    console.log('[WEBPAY][RESULTADO]', resultado);

    const usuarioId = req.user.id_usuario;

    let confirmacion = null;
    let idCompra = null;
    let transaccionExitosa = false;

    if (resultado.status === 'AUTHORIZED' && resultado.response_code === 0) {
      confirmacion = await compraModel.realizarCompra(usuarioId);
      if (confirmacion.exito) {
        idCompra = confirmacion.id_compra;
        transaccionExitosa = true;
      }
    }

    await compraModel.guardarTransaccionWebpay(usuarioId, resultado, idCompra);

    if (!transaccionExitosa) {
      return res.status(400).json({
        error: 'Transacción no autorizada',
        detalle: resultado
      });
    }

    res.json({ mensaje: 'Compra realizada con éxito', idCompra });
  } catch (err) {
    console.error("Error al confirmar el pago con Webpay:", err);
    await compraModel.guardarTransaccionWebpay(req.user.id_usuario, {
      buy_order: null,
      session_id: null,
      status: "FAILED",
      error_message: err.message
    });
    res.status(500).json({ error: "Error interno al confirmar el pago." });
  }
};

