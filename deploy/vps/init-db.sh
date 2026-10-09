#!/bin/sh
set -eu
# Only runs on a new database volume. psql quotes the password as a SQL literal.
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 <<'SQL'
\getenv app_password WEAVE_DB_PASSWORD
CREATE ROLE weave LOGIN PASSWORD :'app_password';
ALTER DATABASE weave OWNER TO weave;
ALTER SCHEMA public OWNER TO weave;
SQL
