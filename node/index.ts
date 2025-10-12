import { Pool } from 'pg';
import { Jetstream } from "@skyware/jetstream";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
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
                await pool.query(/*sql*/`
                INSERT INTO atproto_records (
                    did, rkey, nsid, cid, record, indexed_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
                    ON CONFLICT DO NOTHING;`,
                [did, commit.rkey, commit.collection, commit.cid, JSON.stringify(commit.record)]
                );
            case 'update':
                // note: this will throw if the original record does not exist in the database. i need to figure out
                // a clean solution to upsert 
                await pool.query(/*sql*/`
                UPDATE atproto_records
                    SET did = $1, rkey = $2, nsid = $3, cid = $4, record = $5::jsonb, updated_at = NOW()
                    WHERE rkey = $2 AND nsid = $3 AND did = $1;`,
                [did, commit.rkey, commit.collection, commit.cid, JSON.stringify(commit.record)]
                );
                break;
            case 'delete':
                await pool.query(/*sql*/`
                DELETE FROM atproto_records
                    WHERE rkey = $1 AND nsid = $2 AND did = $3;`,
                [commit.rkey, commit.collection, did]
                );
                break;
        }
    } catch (error) {
        console.error('Error processing commit:', error, 'at cursor:', jetstream.cursor);
    }
})
