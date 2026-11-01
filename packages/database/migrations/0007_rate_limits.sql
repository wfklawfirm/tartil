-- 0007: shared (cross-instance) rate-limit counters for credential endpoints. Owner/service path only: RLS on, no policies, no app_user grants.
CREATE TABLE rate_limits (
  bucket       text        NOT NULL,
  window_start timestamptz NOT NULL,
  n            integer     NOT NULL DEFAULT 1,
  PRIMARY KEY (bucket, window_start)
);
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON rate_limits FROM PUBLIC;
