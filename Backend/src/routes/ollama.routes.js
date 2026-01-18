/**
 * Rutas de Ollama
 */

import express from 'express';
import { askAgent } from '../controllers/ollama.controller.js';
import { extractProductIntent } from '../middlewares/productParser.js';

const router = express.Router();


// Rutas protegidas
router.post(
    '/ask',                                         // Ruta para preguntar al agente
    //protect,                                      // Middleware de protección (autenticación requerida)
    extractProductIntent({ skipOnError: true }),    // Extrae producto si lo menciona, si no, continúa
    askAgent                                        // Controlador para manejar la pregunta
);

export default router;
