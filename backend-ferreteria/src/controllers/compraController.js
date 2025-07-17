const webpayService = require('../services/webpayService');
const compraModel = require('../models/compraModel');

exports.realizarCompra = async (req, res) => {
  try {
    const usuarioId = req.user.id_usuario;
    const resultado = await compraModel.realizarCompra(usuarioId);
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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

    const autorizado = resultado.status === 'AUTHORIZED' && resultado.response_code === 0;

    if (!autorizado) {
      return res.status(400).json({ error: 'Transacción no autorizada' });
    }

    //  Obtiene el ID del usuario autenticado
    const usuarioId = req.user.id_usuario;

    //  Ejecuta la compra
    const confirmacion = await compraModel.realizarCompra(usuarioId);
    //  Guarda la transacción Webpay
    if (confirmacion.exito) {
      await compraModel.guardarTransaccionWebpay(usuarioId, resultado, confirmacion.id_compra);
    }
    return res.json({
      mensaje: 'Compra realizada con éxito.',
      datos: confirmacion, 
      transaccion: {
        buyOrder: resultado.buy_order,
        amount: resultado.amount,
        cardLastDigits: resultado.card_detail.card_number,
        authorizationCode: resultado.authorization_code,
        transactionDate: resultado.transaction_date,
        paymentType: resultado.payment_type_code,
        installments: resultado.installments_number
      }
    });
  } catch (err) {
    console.error('[WEBPAY][ERROR][COMMIT]', err);
    res.status(500).json({ error: 'Error al confirmar la transacción' });
  }
};



