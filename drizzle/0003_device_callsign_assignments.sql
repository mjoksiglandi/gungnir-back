CREATE TABLE IF NOT EXISTS device_callsign_assignments (
  id varchar(64) PRIMARY KEY,
  device_id varchar(64) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  asset_id varchar(64) REFERENCES assets(id),
  callsign varchar(80) NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS device_callsign_assignments_device_idx
  ON device_callsign_assignments (device_id, start_time);

CREATE INDEX IF NOT EXISTS device_callsign_assignments_asset_idx
  ON device_callsign_assignments (asset_id);

INSERT INTO device_callsign_assignments (
  id,
  device_id,
  asset_id,
  callsign,
  start_time,
  end_time,
  metadata,
  created_at,
  updated_at
)
SELECT
  CONCAT('dca-', SUBSTRING(md.mission_id FROM 1 FOR 20), '-', SUBSTRING(md.device_id FROM 1 FOR 20)),
  md.device_id,
  d.asset_id,
  md.callsign,
  COALESCE(md.created_at, now()),
  NULL,
  jsonb_set(
    COALESCE(md.metadata, '{}'::jsonb),
    '{legacyMissionId}',
    to_jsonb(md.mission_id),
    true
  ),
  COALESCE(md.created_at, now()),
  COALESCE(md.updated_at, now())
FROM mission_devices md
INNER JOIN devices d ON d.id = md.device_id
ON CONFLICT (id) DO NOTHING;

DROP TABLE IF EXISTS mission_devices;
