-- Frases aprendidas desde el buzón (needs_inbox) para matching rápido en el chat.
-- Ejecutar si no usas sequelize.sync en desarrollo.

CREATE TABLE IF NOT EXISTS learned_solution_keywords (
  id INT NOT NULL AUTO_INCREMENT,
  solution VARCHAR(255) NOT NULL COMMENT 'Ej: FortiAnalyzer',
  phrase VARCHAR(512) NOT NULL COMMENT 'Texto normalizado para includes()',
  needs_inbox_id INT DEFAULT NULL,
  phrase_original TEXT DEFAULT NULL COMMENT 'Texto original del usuario o frase del revisor',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_learned_solution_phrase (solution, phrase),
  KEY idx_learned_needs_inbox (needs_inbox_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
