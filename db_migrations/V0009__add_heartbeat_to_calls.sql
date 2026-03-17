ALTER TABLE t_p58147154_messenger_vcommunica.calls
  ADD COLUMN IF NOT EXISTS caller_hb timestamptz DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS callee_hb timestamptz DEFAULT NOW();

CREATE INDEX IF NOT EXISTS calls_status_idx ON t_p58147154_messenger_vcommunica.calls(status);
