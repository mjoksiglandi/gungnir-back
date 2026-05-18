CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS timescaledb;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'disabled', 'invited');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE unit_status AS ENUM ('active', 'inactive', 'deployed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE asset_status AS ENUM ('nominal', 'degraded', 'lost', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE device_status AS ENUM ('online', 'offline', 'degraded', 'retired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE command_status AS ENUM ('pending', 'sent', 'accepted', 'rejected', 'timeout', 'failed', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE alert_severity AS ENUM ('info', 'low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM ('open', 'contained', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
    CREATE TYPE map_layer_source_type AS ENUM ('internal', 'external', 'fire-intel', 'air-traffic', 'notams', 'weather');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id varchar(64) PRIMARY KEY,
  name varchar(160) NOT NULL,
  type varchar(64) NOT NULL,
  parent_organization_id varchar(64),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id varchar(64) PRIMARY KEY,
  email varchar(160) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name varchar(160) NOT NULL,
  status user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS roles (
  id varchar(64) PRIMARY KEY,
  name varchar(80) NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS permissions (
  id varchar(64) PRIMARY KEY,
  key varchar(160) NOT NULL UNIQUE,
  description text
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id varchar(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id varchar(64) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id varchar(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id varchar(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organization_roles (
  organization_id varchar(64) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role_id varchar(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS units (
  id varchar(64) PRIMARY KEY,
  organization_id varchar(64) NOT NULL REFERENCES organizations(id),
  callsign varchar(80) NOT NULL,
  name varchar(160) NOT NULL,
  type varchar(64) NOT NULL,
  status unit_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id varchar(64) PRIMARY KEY,
  unit_id varchar(64) REFERENCES units(id),
  name varchar(160) NOT NULL,
  asset_type varchar(80) NOT NULL,
  platform_type varchar(80) NOT NULL,
  status asset_status NOT NULL DEFAULT 'nominal',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id varchar(64) PRIMARY KEY,
  asset_id varchar(64) REFERENCES assets(id),
  device_type varchar(80) NOT NULL,
  source_type varchar(80) NOT NULL,
  api_key_hash text,
  external_id varchar(160),
  status device_status NOT NULL DEFAULT 'offline',
  last_seen_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telemetry_reports (
  id varchar(64) NOT NULL,
  device_id varchar(64) NOT NULL REFERENCES devices(id),
  asset_id varchar(64) REFERENCES assets(id),
  source varchar(80) NOT NULL,
  timestamp timestamptz NOT NULL,
  position geography(Point,4326),
  lat_scaled integer NOT NULL,
  lon_scaled integer NOT NULL,
  altitude_m integer,
  heading_deg integer,
  ground_speed_ms integer,
  vertical_speed_ms integer,
  battery_pct integer,
  signal_quality integer,
  mode varchar(80),
  armed boolean,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

SELECT create_hypertable('telemetry_reports', by_range('timestamp'), if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS telemetry_reports_device_time_idx ON telemetry_reports (device_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS current_track_states (
  id varchar(64) PRIMARY KEY,
  asset_id varchar(64) NOT NULL REFERENCES assets(id),
  device_id varchar(64) NOT NULL REFERENCES devices(id),
  timestamp timestamptz NOT NULL,
  lat_scaled integer NOT NULL,
  lon_scaled integer NOT NULL,
  altitude_m integer,
  heading_deg integer,
  speed_ms integer,
  status varchar(64) NOT NULL DEFAULT 'active',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS track_history (
  id varchar(64) PRIMARY KEY,
  asset_id varchar(64) NOT NULL REFERENCES assets(id),
  device_id varchar(64) NOT NULL REFERENCES devices(id),
  telemetry_id varchar(64),
  timestamp timestamptz NOT NULL,
  lat_scaled integer NOT NULL,
  lon_scaled integer NOT NULL,
  heading_deg integer,
  speed_ms integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS track_history_asset_time_idx ON track_history (asset_id, timestamp DESC);

CREATE TABLE IF NOT EXISTS track_segments (
  id varchar(64) PRIMARY KEY,
  asset_id varchar(64) NOT NULL REFERENCES assets(id),
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  status varchar(64) NOT NULL DEFAULT 'open',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS track_events (
  id varchar(64) PRIMARY KEY,
  track_segment_id varchar(64) REFERENCES track_segments(id),
  type varchar(80) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS commands (
  id varchar(64) PRIMARY KEY,
  command_id varchar(128) NOT NULL UNIQUE,
  asset_id varchar(64) REFERENCES assets(id),
  device_id varchar(64) REFERENCES devices(id),
  type varchar(80) NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status command_status NOT NULL DEFAULT 'pending',
  priority integer NOT NULL DEFAULT 5,
  issued_by_user_id varchar(64) REFERENCES users(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  ack_at timestamptz,
  completed_at timestamptz,
  error_message text,
  correlation_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_response jsonb
);

CREATE TABLE IF NOT EXISTS missions (
  id varchar(64) PRIMARY KEY,
  name varchar(160) NOT NULL,
  status varchar(64) NOT NULL,
  mission_type varchar(80) NOT NULL,
  geometry geometry(Geometry,4326),
  start_time timestamptz,
  end_time timestamptz,
  assigned_units jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS geofences (
  id varchar(64) PRIMARY KEY,
  name varchar(160) NOT NULL,
  geometry geometry(Geometry,4326) NOT NULL,
  type varchar(64) NOT NULL,
  status varchar(64) NOT NULL,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id varchar(64) PRIMARY KEY,
  type varchar(80) NOT NULL,
  severity alert_severity NOT NULL,
  status alert_status NOT NULL DEFAULT 'open',
  source varchar(80) NOT NULL,
  asset_id varchar(64) REFERENCES assets(id),
  device_id varchar(64) REFERENCES devices(id),
  geometry geometry(Geometry,4326),
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS incidents (
  id varchar(64) PRIMARY KEY,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  severity alert_severity NOT NULL,
  status incident_status NOT NULL DEFAULT 'open',
  geometry geometry(Geometry,4326),
  created_by varchar(64) REFERENCES users(id),
  assigned_to varchar(64) REFERENCES users(id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS map_layers (
  id varchar(64) PRIMARY KEY,
  name varchar(160) NOT NULL,
  layer_type varchar(80) NOT NULL,
  source_type map_layer_source_type NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  refresh_interval_sec integer NOT NULL DEFAULT 300,
  ttl_sec integer NOT NULL DEFAULT 900,
  last_updated_at timestamptz,
  confidence integer NOT NULL DEFAULT 100,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS layer_features (
  id varchar(64) PRIMARY KEY,
  layer_id varchar(64) NOT NULL REFERENCES map_layers(id) ON DELETE CASCADE,
  source varchar(80) NOT NULL,
  external_id varchar(160),
  geometry geometry(Geometry,4326) NOT NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL,
  expires_at timestamptz
);

CREATE TABLE IF NOT EXISTS external_sources (
  id varchar(64) PRIMARY KEY,
  name varchar(160) NOT NULL,
  source_type varchar(80) NOT NULL,
  provider_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  refresh_interval_sec integer NOT NULL DEFAULT 300,
  ttl_sec integer NOT NULL DEFAULT 900,
  confidence integer NOT NULL DEFAULT 75,
  bbox jsonb,
  last_successful_sync timestamptz,
  last_error text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id varchar(64) PRIMARY KEY,
  user_id varchar(64) REFERENCES users(id),
  action varchar(160) NOT NULL,
  resource_type varchar(80) NOT NULL,
  resource_id varchar(64) NOT NULL,
  ip varchar(80),
  user_agent text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  timestamp timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id varchar(64) PRIMARY KEY,
  user_id varchar(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti varchar(128) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
