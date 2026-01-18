/**
 * Ejemplos de uso de Stored Procedures
 */

import StoredProcedureHelper from '../utils/StoredProcedure.js';

/**
 * EJEMPLO 1: Stored Procedure sin parámetros
 * 
 * CREATE PROCEDURE GetAllActiveUsers()
 * BEGIN
 *   SELECT * FROM users WHERE isActive = 1;
 * END;
 */
export const getAllActiveUsers = async () => {
  const results = await StoredProcedureHelper.execute('GetAllActiveUsers');
  return results;
};

/**
 * EJEMPLO 2: Stored Procedure con parámetros
 * 
 * CREATE PROCEDURE GetUserById(IN userId INT)
 * BEGIN
 *   SELECT * FROM users WHERE id = userId;
 * END;
 */
export const getUserById = async (userId) => {
  const results = await StoredProcedureHelper.executeWithParams('GetUserById', [userId]);
  return results[0] || [];
};

/**
 * EJEMPLO 3: Stored Procedure con múltiples parámetros
 * 
 * CREATE PROCEDURE CreateUser(
 *   IN userName VARCHAR(50),
 *   IN userEmail VARCHAR(255),
 *   IN userPassword VARCHAR(255)
 * )
 * BEGIN
 *   INSERT INTO users (name, email, password) 
 *   VALUES (userName, userEmail, userPassword);
 *   SELECT LAST_INSERT_ID() as userId;
 * END;
 */
export const createUserSP = async (name, email, password) => {
  const results = await StoredProcedureHelper.executeWithParams(
    'CreateUser',
    [name, email, password]
  );
  return results;
};

/**
 * EJEMPLO 4: Stored Procedure con parámetros OUT
 * 
 * CREATE PROCEDURE GetUserStats(
 *   OUT totalUsers INT,
 *   OUT activeUsers INT
 * )
 * BEGIN
 *   SELECT COUNT(*) INTO totalUsers FROM users;
 *   SELECT COUNT(*) INTO activeUsers FROM users WHERE isActive = 1;
 * END;
 */
export const getUserStats = async () => {
  const query = `
    SET @totalUsers = 0;
    SET @activeUsers = 0;
    CALL GetUserStats(@totalUsers, @activeUsers);
    SELECT @totalUsers as totalUsers, @activeUsers as activeUsers;
  `;
  const results = await StoredProcedureHelper.executeQuery(query);
  return results[0];
};

/**
 * EJEMPLO 5: Stored Procedure con parámetros nombrados
 * 
 * CREATE PROCEDURE SearchUsers(
 *   IN searchTerm VARCHAR(255),
 *   IN userRole VARCHAR(20)
 * )
 * BEGIN
 *   SELECT * FROM users 
 *   WHERE (name LIKE CONCAT('%', searchTerm, '%') 
 *          OR email LIKE CONCAT('%', searchTerm, '%'))
 *   AND role = userRole;
 * END;
 */
export const searchUsers = async (searchTerm, role) => {
  const results = await StoredProcedureHelper.executeWithNamedParams(
    'SearchUsers',
    { searchTerm, userRole: role }
  );
  return results;
};

/**
 * EJEMPLO 6: Stored Procedure con transacciones
 * 
 * CREATE PROCEDURE UpdateUserRole(
 *   IN userId INT,
 *   IN newRole VARCHAR(20)
 * )
 * BEGIN
 *   DECLARE EXIT HANDLER FOR SQLEXCEPTION
 *   BEGIN
 *     ROLLBACK;
 *     SELECT 'Error: Transaction rolled back' as message;
 *   END;
 *   
 *   START TRANSACTION;
 *   UPDATE users SET role = newRole WHERE id = userId;
 *   INSERT INTO user_logs (userId, action, timestamp) 
 *   VALUES (userId, CONCAT('Role changed to ', newRole), NOW());
 *   COMMIT;
 *   SELECT 'Success' as message;
 * END;
 */
export const updateUserRole = async (userId, newRole) => {
  const results = await StoredProcedureHelper.executeWithParams(
    'UpdateUserRole',
    [userId, newRole]
  );
  return results;
};
