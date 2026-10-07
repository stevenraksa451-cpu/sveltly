-- Ajoute l'horodatage de complétion des tâches, nécessaire pour ne plus
-- charger par défaut que les tâches actives + récemment terminées (voir
-- hooks/useTasks.ts) au lieu de l'historique complet depuis la création du
-- compte. Additive et non destructif : colonne nullable, aucune donnée
-- existante modifiée ni supprimée.
alter table public.tasks add column if not exists completed_at timestamptz;
create index if not exists idx_tasks_completed_at on public.tasks(user_id, completed_at);
