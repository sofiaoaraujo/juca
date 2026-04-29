-- Migração: alinha crianca_alimento.status ao vocabulário SOS canônico.
-- Deve ser rodada no Supabase SQL Editor antes de adicionar o CHECK constraint.

-- Passo 1: mapear valores ABA antigos para equivalentes SOS
-- 'Aceita' era o antigo status de sucesso total → equivale a 'Comer'
UPDATE crianca_alimento SET status = 'Comer'  WHERE status = 'Aceita';
-- 'Lamber' era contato oral sem engolir → equivale ao nível 'Tocar' no SOS
UPDATE crianca_alimento SET status = 'Tocar'  WHERE status = 'Lamber';

-- Passo 2: remover quaisquer outros valores não mapeáveis
-- (inspecione antes com: SELECT DISTINCT status FROM crianca_alimento;)
DELETE FROM crianca_alimento
  WHERE status NOT IN ('Tolerar','Interagir','Cheirar','Tocar','Saborear','Comer','Recusado');

-- Passo 3: adicionar o CHECK constraint
ALTER TABLE crianca_alimento
  DROP CONSTRAINT IF EXISTS crianca_alimento_status_check;

ALTER TABLE crianca_alimento
  ADD CONSTRAINT crianca_alimento_status_check
  CHECK (status IN ('Tolerar','Interagir','Cheirar','Tocar','Saborear','Comer','Recusado'));
