CREATE TABLE import_states (
  id text PRIMARY KEY,
  last_imported_at timestamptz NOT NULL
);
