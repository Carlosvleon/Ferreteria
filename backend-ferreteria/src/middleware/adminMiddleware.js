const adminMiddleware = (req, res, next) => {
  
  // Asumimos que el tipo_usuario_id = 3 corresponde al rol de Administrador
  if (!req.user || req.user.tipo_usuario !== 3) { 
    return res.status(403).json({ error: 'Acceso restringido a administradores' });
  }
  next();
};


module.exports = adminMiddleware;
