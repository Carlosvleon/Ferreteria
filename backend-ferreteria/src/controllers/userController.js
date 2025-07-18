const userModel = require('../models/UserModel');
const jwt = require('jsonwebtoken');
require('dotenv').config();

exports.login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });

  try {
    const result = await userModel.login(email, password);
    res.status(result.status).json(result.body);
  } catch (err) {
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

exports.register = async (req, res) => {
  try {
    const data = req.body;
    // Validar y forzar que el password sea string
    if (!data.email || typeof data.password !== 'string' || data.password.length < 6) {
      return res.status(400).json({ error: 'El correo y contraseña (mínimo 6 caracteres) son obligatorios' });
    }
    data.password = String(data.password); // Por si acaso
    const result = await userModel.register(data);
    res.status(result.status).json(result.body);
  } catch (err) {
    console.error("Error al registrar el usuario:", err);
    res.status(500).json({ error: "Error interno al registrar el usuario." });
  }
};

exports.logout = async (req, res) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await userModel.invalidateToken(token, decoded.exp);
    res.status(200).json({ message: 'Sesión cerrada correctamente' });
  } catch (err) {
    res.status(400).json({ error: 'Token no válido.' });
  }
};
