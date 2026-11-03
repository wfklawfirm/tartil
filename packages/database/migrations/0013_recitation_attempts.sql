-- 0013: personal recitation (tasmi') attempts. The audio itself is NEVER stored by this pipeline (audio_retained is pinned to false);
-- only the structured analysis is kept, owned by the user (RLS). Analyses are machine hypotheses, not grades or rulings.
CREATE TABLE recitation_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  surah smallint NOT NULL CHECK (surah BETWEEN 1 AND 114),
  from_ayah integer NOT NULL CHECK (from_ayah >= 1),
  to_ayah integer NOT NULL CHECK (to_ayah >= from_ayah),
  status text NOT NULL CHECK (status IN ('analyzed','insufficient_evidence')),
  provider text NOT NULL CHECK (length(provider) BETWEEN 1 AND 80),
  duration_ms integer NOT NULL CHECK (duration_ms >= 0),
  result jsonb NOT NULL,
  audio_retained boolean NOT NULL DEFAULT false CHECK (audio_retained = false),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recitation_attempts_user_idx ON recitation_attempts (user_id, created_at DESC);
ALTER TABLE recitation_attempts ENABLE ROW LEVEL SECURITY; ALTER TABLE recitation_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY recitation_attempts_select ON recitation_attempts FOR SELECT TO app_user USING (user_id = app.current_user_id());
CREATE POLICY recitation_attempts_insert ON recitation_attempts FOR INSERT TO app_user WITH CHECK (user_id = app.current_user_id());
CREATE POLICY recitation_attempts_delete ON recitation_attempts FOR DELETE TO app_user USING (user_id = app.current_user_id());
GRANT SELECT, INSERT, DELETE ON recitation_attempts TO app_user;
