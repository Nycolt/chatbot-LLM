/**
 * Ejemplo de controlador para usuarios
 */

import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import User from '../models/User.model.js';

/**
 * @desc    Obtener todos los usuarios
 * @route   GET /api/v1/users
 * @access  Private/Admin
 */
const getUsers = asyncHandler(async (req, res) => {
    const users = await User.findAll();

    ApiResponse.success(res, users, 'Usuarios obtenidos exitosamente');
});

/**
 * @desc    Obtener un usuario por ID
 * @route   GET /api/v1/users/:id
 * @access  Private
 */
const getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // const user = await User.findById(id);
    const user = await User.findByPk(id);
    if (!user) {
        return ApiResponse.notFound(res, 'Usuario no encontrado');
    }

    ApiResponse.success(res, user, 'Usuario obtenido exitosamente');
});

/**
 * @desc    Crear un nuevo usuario
 * @route   POST /api/v1/users
 * @access  Private/Admin
 */
const createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // const user = await User.create({ name, email, password, role });
    const user = await User.create({ name, email, password, role });
    ApiResponse.created(res, user, 'Usuario creado exitosamente');
});

/**
 * @desc    Actualizar un usuario
 * @route   PUT /api/v1/users/:id
 * @access  Private
 */
const updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    // const user = await User.findByIdAndUpdate(id, req.body, { new: true });
    const user = await User.findByPk(id);

    if (!user) {
        return ApiResponse.notFound(res, 'Usuario no encontrado');
    }

    await user.update(req.body); piResponse.success(res, user, 'Usuario actualizado exitosamente');
});

/**
 * @desc    Eliminar un usuario
 * @route   DELETE /api/v1/users/:id
 * @access  Private/Admin
 */
const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
        return ApiResponse.notFound(res, 'Usuario no encontrado');
    }

    await user.destroy();

    ApiResponse.success(res, null, 'Usuario eliminado exitosamente');
});

export {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};
