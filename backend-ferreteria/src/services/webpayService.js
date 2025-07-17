const { WebpayPlus } = require('transbank-sdk');
const { guardarTransaccionWebpay } = require('../models/compraModel');

// Datos de integración oficiales
const transaction = WebpayPlus.Transaction.buildForIntegration(
  '597055555532', // commerceCode
  '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C' // API Key Secret
);

exports.iniciarTransaccion = async (carritoTotal, returnUrl, usuarioId) => {
  try {
    const amount = Math.round(carritoTotal); // sin decimales
    const timestamp = Date.now();
    const buyOrder = `orden-${timestamp}`.slice(0,26);
    const sessionId = `sess-${timestamp}`.slice(0,26);

    const response = await transaction.create(
      buyOrder,
      sessionId,
      amount,
      returnUrl
    );
    return { token: response.token, url: response.url };
  } catch (error) {
    console.error("Error al iniciar transacción con Transbank:", error);
    await guardarTransaccionWebpay(usuarioId, {
      buy_order: null,
      session_id: null,
      status: "FAILED",
      amount: carritoTotal,
      error_message: error.message
    });
    throw new Error("No se pudo iniciar la transacción. Por favor, intente nuevamente.");
  }
};

exports.confirmarTransaccion = async (token, usuarioId) => {
  try {
    const result = await transaction.commit(token);
    await guardarTransaccionWebpay(usuarioId, result);
    return result;
  } catch (error) {
    console.error("Error al confirmar transacción con Transbank:", error);
    await guardarTransaccionWebpay(usuarioId, {
      buy_order: null,
      session_id: null,
      status: "FAILED",
      error_message: error.message
    });
    throw new Error("No se pudo confirmar la transacción. Por favor, intente nuevamente.");
  }
};
