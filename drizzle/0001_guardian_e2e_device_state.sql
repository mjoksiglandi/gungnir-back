CREATE TABLE IF NOT EXISTS guardian_e2e_device_state (
  device_id varchar(64) PRIMARY KEY REFERENCES devices(id) ON DELETE CASCADE,
  max_seq_accepted bigint NOT NULL DEFAULT 0,
  last_valid_received_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS guardian_e2e_device_state_max_seq_idx
  ON guardian_e2e_device_state (max_seq_accepted);
