-- Buzón de Necesidades: almacena cada consulta del usuario para revisión y reclasificación
-- Ejecutar en la base de datos chat_db
-- Uso: mysql -u root -p chat_db < Backend/Docs/sql/needs_inbox.sql

USE chat_db;

CREATE TABLE IF NOT EXISTS needs_inbox (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_question TEXT NOT NULL COMMENT 'Pregunta original del usuario',
  detected_solutions JSON DEFAULT NULL COMMENT 'Soluciones detectadas por el motor, ej: ["FortiGate","FortiWeb"]',
  matched_keywords JSON DEFAULT NULL COMMENT 'Palabras/frases coincidentes por solución',
  detected_scores JSON DEFAULT NULL COMMENT 'Puntajes por solución, ej: [{"solution":"FortiGate","score":2}]',
  detected_category VARCHAR(255) DEFAULT NULL COMMENT 'Categoría o solución principal detectada',
  confirmed_solution VARCHAR(255) DEFAULT NULL COMMENT 'Solución confirmada manualmente por el revisor',
  solution_id INT DEFAULT NULL COMMENT 'FK opcional a solutions.id (catálogo)',
  review_status ENUM('pendiente','auto_clasificado','requiere_revision','confirmado','descartado') NOT NULL DEFAULT 'pendiente',
  observations TEXT DEFAULT NULL COMMENT 'Notas del revisor',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_needs_inbox_status (review_status),
  INDEX idx_needs_inbox_category (detected_category),
  INDEX idx_needs_inbox_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
