import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL?.trim();

if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

function getSslConfig() {
  const sslValue = process.env.PGSSL?.trim().toLowerCase();

  if (!sslValue || sslValue === "false" || sslValue === "0" || sslValue === "disable") {
    return false;
  }

  return {
    rejectUnauthorized: false,
  };
}

const sqlitePath = join(process.cwd(), "data", "app.db");
const sqlite = new DatabaseSync(sqlitePath);
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: getSslConfig(),
});

async function main() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS game (
        id TEXT PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        tagline TEXT NOT NULL,
        intro TEXT NOT NULL,
        promo_video_url TEXT NOT NULL DEFAULT '',
        promo_poster_url TEXT NOT NULL DEFAULT '',
        promo_title TEXT NOT NULL DEFAULT '',
        promo_text TEXT NOT NULL DEFAULT '',
        start_node_code TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS story_nodes (
        code TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        transcript TEXT NOT NULL,
        video_url TEXT NOT NULL,
        node_type TEXT NOT NULL,
        auto_next_node_code TEXT,
        is_ending BOOLEAN NOT NULL DEFAULT FALSE,
        ending_tone TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS story_choices (
        node_code TEXT NOT NULL REFERENCES story_nodes(code) ON DELETE CASCADE,
        code TEXT NOT NULL,
        label TEXT NOT NULL,
        hint TEXT NOT NULL,
        target_node_code TEXT NOT NULL,
        PRIMARY KEY (node_code, code)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS playthroughs (
        id TEXT PRIMARY KEY,
        game_slug TEXT NOT NULL,
        current_node_code TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS choice_logs (
        id BIGSERIAL PRIMARY KEY,
        playthrough_id TEXT NOT NULL REFERENCES playthroughs(id) ON DELETE CASCADE,
        node_code TEXT NOT NULL,
        choice_code TEXT NOT NULL,
        choice_label TEXT NOT NULL,
        target_node_code TEXT NOT NULL,
        chosen_at TEXT NOT NULL
      )
    `);

    await client.query("DELETE FROM choice_logs");
    await client.query("DELETE FROM playthroughs");
    await client.query("DELETE FROM story_choices");
    await client.query("DELETE FROM story_nodes");
    await client.query("DELETE FROM game");

    const game = sqlite.prepare(`
      SELECT id, slug, title, tagline, intro,
             promo_video_url, promo_poster_url, promo_title, promo_text,
             start_node_code
      FROM game
      LIMIT 1
    `).get();

    if (game) {
      await client.query(
        `
          INSERT INTO game (
            id, slug, title, tagline, intro,
            promo_video_url, promo_poster_url, promo_title, promo_text,
            start_node_code
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          game.id,
          game.slug,
          game.title,
          game.tagline,
          game.intro,
          game.promo_video_url,
          game.promo_poster_url,
          game.promo_title,
          game.promo_text,
          game.start_node_code,
        ],
      );
    }

    const nodes = sqlite.prepare(`
      SELECT code, title, description, transcript, video_url, node_type,
             auto_next_node_code, is_ending, ending_tone
      FROM story_nodes
      ORDER BY code
    `).all();

    for (const node of nodes) {
      await client.query(
        `
          INSERT INTO story_nodes (
            code, title, description, transcript, video_url, node_type,
            auto_next_node_code, is_ending, ending_tone
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          node.code,
          node.title,
          node.description,
          node.transcript,
          node.video_url,
          node.node_type,
          node.auto_next_node_code,
          Boolean(node.is_ending),
          node.ending_tone,
        ],
      );
    }

    const choices = sqlite.prepare(`
      SELECT node_code, code, label, hint, target_node_code
      FROM story_choices
      ORDER BY node_code, code
    `).all();

    for (const choice of choices) {
      await client.query(
        `
          INSERT INTO story_choices (node_code, code, label, hint, target_node_code)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          choice.node_code,
          choice.code,
          choice.label,
          choice.hint,
          choice.target_node_code,
        ],
      );
    }

    const playthroughs = sqlite.prepare(`
      SELECT id, game_slug, current_node_code, status, started_at, finished_at
      FROM playthroughs
    `).all();

    for (const row of playthroughs) {
      await client.query(
        `
          INSERT INTO playthroughs (
            id, game_slug, current_node_code, status, started_at, finished_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          row.id,
          row.game_slug,
          row.current_node_code,
          row.status,
          row.started_at,
          row.finished_at,
        ],
      );
    }

    const logs = sqlite.prepare(`
      SELECT playthrough_id, node_code, choice_code, choice_label, target_node_code, chosen_at
      FROM choice_logs
      ORDER BY id
    `).all();

    for (const row of logs) {
      await client.query(
        `
          INSERT INTO choice_logs (
            playthrough_id, node_code, choice_code, choice_label, target_node_code, chosen_at
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          row.playthrough_id,
          row.node_code,
          row.choice_code,
          row.choice_label,
          row.target_node_code,
          row.chosen_at,
        ],
      );
    }

    await client.query("COMMIT");
    console.log(`Imported SQLite data from ${sqlitePath} into PostgreSQL`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
