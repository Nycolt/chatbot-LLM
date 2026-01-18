/**
 * Rutas de Datasheets
 */

import express from 'express';
//import { body } from 'express-validator';

import { insertarDatasheets } from '../controllers/datasheet.controller.js';

import { protect } from '../middlewares/auth.js';
//import validate from '../middlewares/validate.js';

const router = express.Router();

// Validaciones
//const registerValidation = [
//  body('Usuario')
//    .trim()
//    .notEmpty().withMessage('El usuario es requerido'),
//  body('Credencial')
//    .notEmpty().withMessage('La contraseña es requerida')
//    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),
//];


// Rutas protegidas
router.post(
    '/insertar/masivo',        // Ruta para insertar datasheets masivamente
    protect,            // Middleware de protección (autenticación requerida)
    //registerValidation,  // Validaciones de entrada
    //validate,           // Middleware de validación
    insertarDatasheets   // Controlador para manejar la inserción de datasheets
);


export default router;
