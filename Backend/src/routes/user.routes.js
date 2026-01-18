/**
 * Rutas de usuarios
 */

import express from 'express';
import { body } from 'express-validator';

import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../controllers/user.controller.js';

import { protect, authorize } from '../middlewares/auth.js';
import validate from '../middlewares/validate.js';

const router = express.Router();

// Validaciones
const userValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ max: 50 }).withMessage('El nombre no puede exceder 50 caracteres'),
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Debe ser un email válido'),
  body('password')
    .if(body('password').exists())
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
];

// Rutas protegidas
router.use(protect);

router
  .route('/')
  .get(authorize('admin'), getUsers)
  .post(authorize('admin'), userValidation, validate, createUser);

router
  .route('/:id')
  .get(getUserById)
  .put(userValidation, validate, updateUser)
  .delete(authorize('admin'), deleteUser);

export default router;
