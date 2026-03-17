ALTER TABLE t_p58147154_messenger_vcommunica.calls
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS duration_sec integer;
