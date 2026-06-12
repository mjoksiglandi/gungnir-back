DO $$
BEGIN
  CREATE TYPE device_platform AS ENUM ('air', 'sea', 'land', 'manpack', 'vehicle', 'unknown');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE devices
  ADD COLUMN IF NOT EXISTS platform_type device_platform NOT NULL DEFAULT 'unknown';

CREATE TABLE IF NOT EXISTS mission_devices (
  mission_id varchar(64) NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  device_id varchar(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  callsign varchar(80) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (mission_id, device_id)
);

CREATE INDEX IF NOT EXISTS mission_devices_device_idx ON mission_devices (device_id);
