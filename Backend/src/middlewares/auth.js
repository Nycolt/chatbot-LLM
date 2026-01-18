/**
 * Middleware de autenticación
 * Ejemplo usando JWT
 */

import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import User from '../models/User.model.js';
import TransactSQL from '../services/TransactSQL.js';

const protect = async (req, res, next) => {
  try {

    let token;
    
    // Verificar si el token existe en los headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Verificar si no hay token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado, token no proporcionado',
      });
    }

    // Verificar el token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Buscar al usuario en la base de datos usando SP
    const user = await TransactSQL.singleQuery('GetUserById', {
      Id_entrada: decoded.id
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no encontrado',
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Middleware para roles específicos
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción',
      });
    }
    next();
  };
};

export { protect, authorize };
