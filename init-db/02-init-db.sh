#!/bin/bash
set -e

# Initialize the database: create tables, indexes, partitioning, and read-only user
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create the parent table
    CREATE TABLE IF NOT EXISTS atproto_records (
        did VARCHAR(255) NOT NULL,
        rkey VARCHAR(255) NOT NULL,
        nsid VARCHAR(255) NOT NULL,
        cid VARCHAR(255) NOT NULL,
        record JSONB NOT NULL,
        indexed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (rkey, nsid, did, indexed_at)
    ) PARTITION BY RANGE (indexed_at);

    -- Create index on record for faster JSONB queries
    CREATE INDEX IF NOT EXISTS idx_gin_record ON atproto_records USING gin(record);
    CREATE INDEX IF NOT EXISTS idx_gin_record_path ON atproto_records USING gin(record jsonb_path_ops);

    -- Create index on nsid for faster lookups
    CREATE INDEX IF NOT EXISTS idx_atproto_records_nsid ON atproto_records(nsid);
    CREATE INDEX IF NOT EXISTS idx_atproto_records_did ON atproto_records(did);
    CREATE INDEX IF NOT EXISTS idx_atproto_records_rkey ON atproto_records(rkey);

    -- Set up pg_partman for hourly partitioning on indexed_at
    SELECT partman.create_parent(
        p_parent_table := 'public.atproto_records',
        p_control := 'indexed_at',
        p_type := 'range',
        p_interval := '1 hour'
    );

    UPDATE partman.part_config SET retention = '48 hours', premake = 4 WHERE parent_table = 'public.atproto_records';

    -- Create an user with read-only access to the atproto_records table
    CREATE ROLE readonly_user WITH LOGIN PASSWORD 'readonly_password';
    GRANT CONNECT ON DATABASE "$POSTGRES_DB" TO readonly_user;
    GRANT USAGE ON SCHEMA public TO readonly_user;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
    -- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;
EOSQL