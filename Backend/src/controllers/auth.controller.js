/**
 * Controlador de autenticación
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import userService from '../services/user.service.js';
import bcrypt from 'bcryptjs';

/**
 * @desc    Registrar usuario
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
const register = asyncHandler(async (req, res) => {
  const { Usuario, Credencial } = req.body;

  // Crear usuario usando SP
  const hashedPassword = await bcrypt.hash(Credencial, 10);
  const result = await userService.createUser({Usuario, Credencial: hashedPassword});
  
  if (result.CreacionExitosa === 0) {
    return ApiResponse.badRequest(res, result.Mensaje);
  }
  
  // Generar token
  const token = userService.generateToken(result.UsuarioId);
  
  ApiResponse.created(res, { 
    user: {
      id: result.UsuarioId,
      Usuario: Usuario
    },
    token,
    expiresIn: '7d'
  }, result.Mensaje);
});

/**
 * @desc    Iniciar sesión
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res) => {
  const { Usuario, Credencial } = req.body;
  
  // Validar credenciales usando bcrypt
  const loginResult = await userService.checkLogin({Usuario, Credencial});
  
  if (!loginResult || loginResult === 0) {
    return ApiResponse.unauthorized(res, 'Credenciales inválidas');
  }
  
  // Generar token (usar el ID del usuario desde el resultado del SP)
  const token = userService.generateToken(loginResult);
  
  ApiResponse.success(res, { 
    user: {
      id: loginResult,
      Usuario: Usuario
    },
    token,
    expiresIn: '7d'
  }, 'Inicio de sesión exitoso');
});

/**
 * @desc    Actualizar contraseña
 * @route   PUT /api/v1/auth/update-password
 * @access  Public
 */
const updatePassword = asyncHandler(async (req, res) => {
  const { Usuario, NuevaCredencial } = req.body;
  
  // Hashear nueva contraseña
  const hashedPassword = await bcrypt.hash(NuevaCredencial, 10);
  
  // Actualizar contraseña usando SP
  const updated = await userService.updatePassword({Usuario, Credencial: hashedPassword});
  
  if (!updated) {
    return ApiResponse.notFound(res, 'Usuario no encontrado');
  }
  
  ApiResponse.success(res, null, 'Contraseña actualizada exitosamente');
});

export {
  register,
  login,
  updatePassword,
};
