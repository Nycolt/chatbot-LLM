-- Si el listado del buzón falla con: Unknown column 'solution_id' in 'field list'
-- Ejecutar en chat_db:

ALTER TABLE needs_inbox
  ADD COLUMN solution_id INT NULL DEFAULT NULL COMMENT 'FK opcional a solutions.id';
