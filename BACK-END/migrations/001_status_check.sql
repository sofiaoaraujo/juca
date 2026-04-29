-- Garante que crianca_alimento.status só aceita etapas SOS válidas.
ALTER TABLE crianca_alimento
  DROP CONSTRAINT IF EXISTS crianca_alimento_status_check;

ALTER TABLE crianca_alimento
  ADD CONSTRAINT crianca_alimento_status_check
  CHECK (status IN ('Tolerar','Interagir','Cheirar','Tocar','Saborear','Comer','Recusado'));
