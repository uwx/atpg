import { JSONColumnType, Kysely, PostgresDialect, RawBuilder, sql } from 'kysely';
import { Pool } from 'pg';
import { Jetstream } from "@skyware/jetstream";

const dialect = new PostgresDialect({
    pool: new Pool({
        connectionString: process.env.DATABASE_URL,
    })
});

interface Database {
    atproto_records: {
        did: string;
        rkey: string;
        nsid: string;
        cid: string;
        record: JSONColumnType<object>;
        indexed_at: Date;
        updated_at: Date;
    };
}

const db = new Kysely<Database>({
    dialect,
});

const date24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

const jetstream = new Jetstream({
    cursor: date24HoursAgo.getTime() * 1000,
    maxMessageSizeBytes: 2_097_152 // 2 MB
});

jetstream.start();

setInterval(() => {
    console.log(`Cursor: ${jetstream.cursor}`)
}, 30_000);

jetstream.on('error', (error) => {
    console.error('Jetstream error:', error, 'at cursor:', jetstream.cursor);
});

jetstream.on('commit', async ({commit, did}) => {
    try {
        // console.log('Processing commit:', commit, 'for DID:', did);
        switch (commit.operation) {
            case 'create':
                await db
                    .insertInto('atproto_records')
                    .values({
                        did,
                        rkey: commit.rkey,
                        nsid: commit.collection,
                        cid: commit.cid,
                        record: json(commit.record),
                        indexed_at: sql<any>`${new Date()}::timestamptz`,
                        updated_at: sql<any>`${new Date()}::timestamptz`,
                    })
                    .onConflict(oc => oc.doNothing())
                    .execute();
            case 'update':
                // note: this will throw if the original record does not exist in the database. i need to figure out
                // a clean solution to upsert 
                await db
                    .updateTable('atproto_records')
                    .set({
                        did,
                        rkey: commit.rkey,
                        nsid: commit.collection,
                        cid: commit.cid,
                        record: json(commit.record),
                        updated_at: sql<any>`${new Date()}::timestamptz`,
                    })
                    .where('rkey', '=', commit.rkey)
                    .where('nsid', '=', commit.collection)
                    .where('did', '=', did)
                    .execute();
                break;
            case 'delete':
                await db.deleteFrom('atproto_records')
                    .where('rkey', '=', commit.rkey)
                    .where('nsid', '=', commit.collection)
                    .where('did', '=', did)
                    .execute();
                break;
        }
    } catch (error) {
        console.error('Error processing commit:', error, 'at cursor:', jetstream.cursor);
    }
})

function json<T>(object: T): RawBuilder<any> {
    return sql<any>`cast(${object} as jsonb)`
}