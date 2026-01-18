/**
 * Rutas de autenticación
 */

import express from 'express';
import { body } from 'express-validator';

import {
  register,
  login,
  updatePassword,
} from '../controllers/auth.controller.js';

import { protect } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';

const router = express.Router();

// Validaciones
const registerValidation = [
  body('Usuario')
    .trim()
    .notEmpty().withMessage('El usuario es requerido'),
  body('Credencial')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
];

const loginValidation = [
  body('Usuario')
    .trim()
    .notEmpty().withMessage('El usuario es requerido'),    
  body('Credencial')
    .notEmpty().withMessage('La credencial es requerida'),
];

const updatePasswordValidation = [
  body('Usuario')
    .trim()
    .notEmpty().withMessage('El usuario es requerido'),
  body('NuevaCredencial')
    .notEmpty().withMessage('La nueva contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
];

// Rutas públicas
router.post('/register', registerValidation, validate, register);
router.post('/login', loginValidation, validate, login);
router.put('/update-password', updatePasswordValidation, validate, updatePassword);

// Rutas protegidas

export default router;
