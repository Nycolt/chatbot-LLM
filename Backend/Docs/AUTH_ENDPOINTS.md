# 🔐 Endpoints de Autenticación JWT

## Configuración JWT

Las siguientes variables de entorno controlan el comportamiento del JWT:

```env
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d
```

---

## 📌 Endpoints Disponibles

### 1. Registro de Usuario

**POST** `/api/v1/auth/register`

Crea un nuevo usuario y devuelve un token JWT.

**Body (JSON):**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "password": "password123",
  "role": "user"
}
```

**Validaciones:**
- `name`: Requerido, no vacío
- `email`: Requerido, formato email válido, único
- `password`: Requerido, mínimo 6 caracteres
- `role`: Opcional (default: "user"), valores: "user" | "admin"

**Respuesta exitosa (201):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2026-01-08T10:30:00.000Z",
      "updatedAt": "2026-01-08T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

**Errores:**
```json
// Email duplicado (400)
{
  "success": false,
  "message": "El email ya está registrado"
}

// Validación fallida (400)
{
  "success": false,
  "message": "Errores de validación",
  "errors": [
    {
      "field": "password",
      "message": "La contraseña debe tener al menos 6 caracteres"
    }
  ]
}
```

---

### 2. Inicio de Sesión

**POST** `/api/v1/auth/login`

Autentica un usuario y devuelve un token JWT.

**Body (JSON):**
```json
{
  "email": "juan@example.com",
  "password": "password123"
}
```

**Validaciones:**
- `email`: Requerido, formato email válido
- `password`: Requerido

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "role": "user",
      "isActive": true,
      "createdAt": "2026-01-08T10:30:00.000Z",
      "updatedAt": "2026-01-08T10:30:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

**Errores:**
```json
// Credenciales inválidas (401)
{
  "success": false,
  "message": "Credenciales inválidas"
}
```

---

### 3. Obtener Usuario Actual

**GET** `/api/v1/auth/me`

Obtiene la información del usuario autenticado.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Usuario obtenido exitosamente",
  "data": {
    "id": 1,
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "role": "user",
    "isActive": true,
    "createdAt": "2026-01-08T10:30:00.000Z",
    "updatedAt": "2026-01-08T10:30:00.000Z"
  }
}
```

**Errores:**
```json
// Token no proporcionado (401)
{
  "success": false,
  "message": "No autorizado, token no proporcionado"
}

// Token inválido (401)
{
  "success": false,
  "message": "Token inválido"
}

// Token expirado (401)
{
  "success": false,
  "message": "Token expirado"
}

// Usuario no encontrado (401)
{
  "success": false,
  "message": "Usuario no encontrado"
}

// Usuario inactivo (401)
{
  "success": false,
  "message": "Usuario inactivo"
}
```

---

## 🔧 Estructura del Token JWT

El token JWT contiene la siguiente información:

```javascript
{
  "id": 1,        // ID del usuario
  "role": "user", // Rol del usuario
  "iat": 1704710400,  // Timestamp de emisión
  "exp": 1705315200   // Timestamp de expiración
}
```

---

## 🛡️ Uso del Token en Peticiones

Para acceder a endpoints protegidos, incluye el token en el header `Authorization`:

### Ejemplo con cURL:
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Ejemplo con Fetch (JavaScript):
```javascript
const response = await fetch('http://localhost:3000/api/v1/auth/me', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### Ejemplo con Axios:
```javascript
import axios from 'axios';

const response = await axios.get('http://localhost:3000/api/v1/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Ejemplo con Thunder Client / Postman:
1. Selecciona el endpoint
2. Ve a la pestaña "Headers"
3. Añade:
   - **Key**: `Authorization`
   - **Value**: `Bearer tu_token_aqui`

---

## 🔐 Middleware de Protección

### `protect`
Protege rutas que requieren autenticación.

```javascript
import { protect } from '../middlewares/auth.js';

router.get('/register', protect, RegisterFun);
```

### `authorize`
Restringe acceso por rol de usuario.

```javascript
import { protect, authorize } from '../middlewares/auth.js';

// Solo admins pueden acceder
router.delete('/users/:id', protect, authorize('admin'), deleteUser);

// Admins y moderadores pueden acceder
router.put('/posts/:id', protect, authorize('admin', 'moderator'), updatePost);
```

---

## 📝 Flujo de Autenticación

```
1. Usuario → POST /auth/register o /auth/login
2. Servidor → Valida credenciales
3. Servidor → Genera JWT con id y role
4. Servidor → Devuelve { user, token, expiresIn }
5. Cliente → Guarda token (localStorage, cookie, etc.)
6. Cliente → Incluye token en Authorization header
7. Servidor → Middleware `protect` valida token
8. Servidor → Busca usuario en DB
9. Servidor → Inyecta req.user
10. Controlador → Accede a req.user
```

---

## ⚠️ Seguridad

### Mejores Prácticas:

1. **Secreto JWT seguro**: Usa una cadena larga y aleatoria
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **HTTPS en producción**: Siempre usa HTTPS para proteger el token

3. **Expiración corta**: En producción considera tokens de corta duración (1h-24h)

4. **Refresh tokens**: Implementa refresh tokens para renovar tokens expirados

5. **Almacenamiento seguro**: 
   - ❌ No uses localStorage en apps críticas (vulnerable a XSS)
   - ✅ Usa httpOnly cookies o sessionStorage

6. **Revocación de tokens**: Implementa una blacklist de tokens en Redis

---

## 🧪 Testing con cURL

### Registro:
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login:
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Obtener usuario actual:
```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```
