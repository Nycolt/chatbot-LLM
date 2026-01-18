/**
 * Clase para crear respuestas consistentes
 */

class ApiResponse {
  static success(res, data, message = 'Operación exitosa', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  }

  static error(res, message = 'Error en el servidor', statusCode = 500, errors = null) {
    const response = {
      success: false,
      message,
    };

    if (errors) {
      response.errors = errors;
    }

    return res.status(statusCode).json(response);
  }

  static created(res, data, message = 'Recurso creado exitosamente') {
    return this.success(res, data, message, 201);
  }

  static notFound(res, message = 'Recurso no encontrado') {
    return this.error(res, message, 404);
  }

  static unauthorized(res, message = 'No autorizado') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Prohibido') {
    return this.error(res, message, 403);
  }

  static badRequest(res, message = 'Solicitud incorrecta', errors = null) {
    return this.error(res, message, 400, errors);
  }
}

export default ApiResponse;
