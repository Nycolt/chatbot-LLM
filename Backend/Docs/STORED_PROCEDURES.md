# Guía de Stored Procedures con Sequelize y MySQL

## 📚 Configuración

El proyecto ya está configurado con **Sequelize** y **MySQL2** para usar stored procedures de manera sencilla.

## 🔧 Variables de Entorno

Configura tu archivo `.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nycolt_db
DB_USER=root
DB_PASSWORD=tu_password
DB_DIALECT=mysql
```

## 📝 Cómo Crear Stored Procedures en MySQL

### 1. Stored Procedure Simple (sin parámetros)

```sql
DELIMITER //
CREATE PROCEDURE GetAllActiveUsers()
BEGIN
  SELECT * FROM users WHERE isActive = 1;
END //
DELIMITER ;
```

**Uso en Node.js:**
```javascript
import StoredProcedureHelper from './utils/StoredProcedure.js';

const users = await StoredProcedureHelper.execute('GetAllActiveUsers');
```

### 2. Stored Procedure con Parámetros IN

```sql
DELIMITER //
CREATE PROCEDURE GetUserById(IN userId INT)
BEGIN
  SELECT * FROM users WHERE id = userId;
END //
DELIMITER ;
```

**Uso en Node.js:**
```javascript
const user = await StoredProcedureHelper.executeWithParams('GetUserById', [5]);
```

### 3. Stored Procedure con Múltiples Parámetros

```sql
DELIMITER //
CREATE PROCEDURE CreateUser(
  IN userName VARCHAR(50),
  IN userEmail VARCHAR(255),
  IN userPassword VARCHAR(255)
)
BEGIN
  INSERT INTO users (name, email, password, createdAt, updatedAt) 
  VALUES (userName, userEmail, userPassword, NOW(), NOW());
  SELECT LAST_INSERT_ID() as userId;
END //
DELIMITER ;
```

**Uso en Node.js:**
```javascript
const result = await StoredProcedureHelper.executeWithParams(
  'CreateUser',
  ['Juan Pérez', 'juan@example.com', 'hashedPassword123']
);
```

### 4. Stored Procedure con Parámetros OUT

```sql
DELIMITER //
CREATE PROCEDURE GetUserStats(
  OUT totalUsers INT,
  OUT activeUsers INT
)
BEGIN
  SELECT COUNT(*) INTO totalUsers FROM users;
  SELECT COUNT(*) INTO activeUsers FROM users WHERE isActive = 1;
END //
DELIMITER ;
```

**Uso en Node.js:**
```javascript
const query = `
  SET @totalUsers = 0;
  SET @activeUsers = 0;
  CALL GetUserStats(@totalUsers, @activeUsers);
  SELECT @totalUsers as totalUsers, @activeUsers as activeUsers;
`;
const stats = await StoredProcedureHelper.executeQuery(query);
```

### 5. Stored Procedure con Búsqueda

```sql
DELIMITER //
CREATE PROCEDURE SearchUsers(
  IN searchTerm VARCHAR(255),
  IN userRole VARCHAR(20)
)
BEGIN
  SELECT * FROM users 
  WHERE (name LIKE CONCAT('%', searchTerm, '%') 
         OR email LIKE CONCAT('%', searchTerm, '%'))
  AND role = userRole
  AND isActive = 1;
END //
DELIMITER ;
```

**Uso en Node.js:**
```javascript
const users = await StoredProcedureHelper.executeWithNamedParams(
  'SearchUsers',
  { searchTerm: 'juan', userRole: 'admin' }
);
```

### 6. Stored Procedure con Transacciones

```sql
DELIMITER //
CREATE PROCEDURE UpdateUserRole(
  IN userId INT,
  IN newRole VARCHAR(20)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SELECT 'Error: Transaction rolled back' as message;
  END;
  
  START TRANSACTION;
  
  UPDATE users SET role = newRole, updatedAt = NOW() WHERE id = userId;
  
  INSERT INTO user_logs (userId, action, timestamp) 
  VALUES (userId, CONCAT('Role changed to ', newRole), NOW());
  
  COMMIT;
  SELECT 'Success' as message, userId;
END //
DELIMITER ;
```

**Uso en Node.js:**
```javascript
const result = await StoredProcedureHelper.executeWithParams(
  'UpdateUserRole',
  [10, 'admin']
);
```

## 🛠️ Métodos Disponibles en StoredProcedureHelper

### `execute(procedureName)`
Ejecuta un SP sin parámetros.

```javascript
const results = await StoredProcedureHelper.execute('GetAllUsers');
```

### `executeWithParams(procedureName, params)`
Ejecuta un SP con array de parámetros.

```javascript
const results = await StoredProcedureHelper.executeWithParams('GetUserById', [5]);
```

### `executeOne(procedureName, params)`
Ejecuta un SP y devuelve solo el primer resultado.

```javascript
const user = await StoredProcedureHelper.executeOne('GetUserById', [5]);
```

### `executeWithNamedParams(procedureName, namedParams)`
Ejecuta un SP con objeto de parámetros nombrados.

```javascript
const results = await StoredProcedureHelper.executeWithNamedParams(
  'SearchUsers',
  { searchTerm: 'juan', userRole: 'admin' }
);
```

### `executeQuery(query, options)`
Ejecuta una query SQL personalizada.

```javascript
const results = await StoredProcedureHelper.executeQuery(
  'SELECT * FROM users WHERE role = ?',
  { replacements: ['admin'] }
);
```

## 📋 Ejemplos Prácticos

Los ejemplos completos están en:
- [`src/examples/storedProcedureExamples.js`](src/examples/storedProcedureExamples.js)

## 💡 Consejos y Mejores Prácticas

1. **Usa DELIMITER**: Siempre cambia el delimitador al crear SPs:
   ```sql
   DELIMITER //
   CREATE PROCEDURE ...
   END //
   DELIMITER ;
   ```

2. **Manejo de Errores**: Implementa handlers en tus SPs:
   ```sql
   DECLARE EXIT HANDLER FOR SQLEXCEPTION
   BEGIN
     ROLLBACK;
   END;
   ```

3. **Transacciones**: Usa transacciones para operaciones críticas:
   ```sql
   START TRANSACTION;
   -- operaciones
   COMMIT;
   ```

4. **Validación**: Valida parámetros dentro del SP:
   ```sql
   IF userId IS NULL THEN
     SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'userId es requerido';
   END IF;
   ```

5. **Logs**: Mantén un registro de operaciones importantes:
   ```sql
   INSERT INTO audit_log (action, userId, timestamp) 
   VALUES ('user_created', userId, NOW());
   ```

## 🔍 Listar Stored Procedures Existentes

```sql
-- Ver todos los SPs de la base de datos
SHOW PROCEDURE STATUS WHERE Db = 'nycolt_db';

-- Ver el código de un SP específico
SHOW CREATE PROCEDURE GetUserById;
```

## 🗑️ Eliminar un Stored Procedure

```sql
DROP PROCEDURE IF EXISTS GetUserById;
```

## � Stored Procedures del Proyecto

### DebbugDatasheets

**Propósito:** Sincronizar datos desde la tabla temporal `DatasheetTemporal` a la tabla principal `Datasheet`.

**Ubicación:** `Docs/sql/DebbugDatasheets.sql`

**Funcionalidad:**
1. Actualiza datasheets existentes (por ID)
2. Inserta nuevas datasheets que no existen en la tabla principal
3. Limpia la tabla temporal después de la sincronización
4. Manejo automático de transacciones (COMMIT o ROLLBACK)

**Uso en Node.js:**

```javascript
import TransactSQL from './services/TransactSQL.js';

// Ejecutar sincronización
const result = await TransactSQL.singleQuery('DebbugDatasheets');

console.log(result);
// {
//   status: 'success',
//   inserted: 10,    // Nuevas datasheets insertadas
//   updated: 5,      // Datasheets actualizadas
//   deleted: 0,      // Registros temporales eliminados
//   total_affected: 15
// }
```

**Uso en el servicio:**

```javascript
import DatasheetService from './services/Datasheet.service.js';

// 1. Cargar datos en tabla temporal
await DatasheetService.bulkCreateDatasheets(datasheets);

// 2. Sincronizar a tabla principal
const result = await DatasheetService.syncDatasheetsFromTemp();
```

**Crear el SP en MySQL:**

```bash
# Opción 1: Desde MySQL Workbench
# Copiar y pegar el contenido de Docs/sql/DebbugDatasheets.sql

# Opción 2: Desde línea de comandos
mysql -u root -p nycolt_db < Docs/sql/DebbugDatasheets.sql
```

**Verificar el SP:**

```sql
-- Listar stored procedures
SHOW PROCEDURE STATUS WHERE Db = 'nycolt_db';

-- Ver código del SP
SHOW CREATE PROCEDURE DebbugDatasheets;
```

**Características:**
- ✅ Transaccional (ROLLBACK automático en caso de error)
- ✅ Usa COALESCE para actualizar solo valores no nulos
- ✅ Retorna estadísticas de la operación
- ✅ Limpieza automática de tabla temporal
- ✅ Manejo de errores con handler

## �📖 Documentación Adicional

- [Sequelize Raw Queries](https://sequelize.org/docs/v6/core-concepts/raw-queries/)
- [MySQL Stored Procedures](https://dev.mysql.com/doc/refman/8.0/en/stored-programs.html)
