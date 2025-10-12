# atpg

This is a tool that lets you expose read-only access to the AT Protocol (last 48 hours of Jetstream) via PostgreSQL.

## Usage

1. `cp docker-compose.template.yml docker-compose.yml`
2. Replace POSTGRES_USER and POSTGRES_PASSWORD and DATABASE_URL or your database probably will be vandalized
3. `sudo docker compose up --build`
4. Connect via `postgres://readonly_user:readonly_password@localhost:5432/atpg`

## Details
The table can be accessed at `public.atproto_records` and it has the columns `did`, `nsid`, `rkey`, `cid`, `record` (BSON), `indexed_at`, and `updated_at`.

The database is partitioned using partman every hour and partitions are deleted at 48 hours of age. This can be adjusted for longer retention.
A [GIN](https://www.postgresql.org/docs/current/gin.html) index is placed on the contents of the `record` column so that JSON path queries on it are faster.

The `readonly_user` has a query timeout of 250ms to prevent DoS.

## Public Instance

A best-effort instance is hosted at `postgres://readonly_user:readonly_password@132.145.199.149:5432/atpg`. If this gets DoSed it will probably be turned offline.
