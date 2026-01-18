/**
 * Ejemplo de servicio para lógica de negocio de usuarios
 */

import User from '../models/User.model.js';
import jwt from 'jsonwebtoken';
import config from '../config/env.js';
import TransactSQL from './TransactSQL.js';
import bcrypt from 'bcryptjs';

class UserService {


  /**
   * Generar token JWT
   * @param {number} userId - ID del usuario
   */
  generateToken(userId) {
    return jwt.sign(
      { 
        id: userId,
      }, 
      config.jwt.secret, 
      {
        expiresIn: config.jwt.expire,
      }
    );
  }

  /**
   * Validar login obteniendo hash de BD y comparando con bcrypt
   * @param {string} Usuario - Nombre de usuario
   * @param {string} Credencial - Contraseña del usuario (texto plano)
   * @returns {Promise<number|null>} - ID del usuario si login exitoso, null si falla
   */
  async checkLogin(User) {

    
    // Obtener el hash de la contraseña del usuario desde BD
    const result = await TransactSQL.singleQuery('GetUserCredential', {
      Usuario_entrada: User.Usuario
    });
    
    if (!result || !result.UsuarioId) {
      return null;
    }
    
    // Comparar la contraseña en texto plano con el hash almacenado
    const isValid = await bcrypt.compare(User.Credencial, result.HashCredencial);
    
    if (!isValid) {
      return null;
    }
    
    return result.UsuarioId;
  }

  /**
   * Actualizar contraseña usando stored procedure UpdatePassword
   * @param {string} Usuario - Nombre de usuario
   * @param {string} NuevaCredencial - Nueva contraseña
   * @returns {Promise<boolean>} - true si actualización exitosa, false si falla
   */
  async updatePassword(User) {
    const result = await TransactSQL.singleQuery('UpdatePassword', {
      Usuario_entrada: User.Usuario,
      NuevaCredencial_entrada: User.Credencial
    });
    
    return result?.ActualizacionExitosa === 1;
  }

  /**
   * Crear usuario usando stored procedure CreateUser
   * @param {string} Usuario - Nombre de usuario
   * @param {string} Credencial - Contraseña del usuario
   * @returns {Promise<object|null>} - Objeto con CreacionExitosa, UsuarioId y Mensaje
   */
  async createUser(User) {
    const result = await TransactSQL.singleQuery('CreateUser', {
      Usuario_entrada: User.Usuario,
      Credencial_entrada: User.Credencial
    });
    
    return result;
  }

}

export default new UserService();
