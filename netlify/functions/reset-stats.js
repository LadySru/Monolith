// Admin endpoint to reset member activity stats while preserving identity data
// POST /.netlify/functions/reset-stats
// Header: x-admin-secret: <ADMIN_SECRET>

const { neon } = require('@netlify/neon');

const GUILD_ID = BigInt('863475027214598173');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const secret = event.headers['x-admin-secret'] || event.queryStringParameters?.secret;
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Zero out activity stats; keep username, nickname, avatar_url, join_date
    const result = await sql`
      UPDATE member_stats
      SET message_count      = 0,
          gif_count          = 0,
          image_count        = 0,
          reaction_count     = 0,
          voice_time_seconds = 0,
          in_server          = FALSE,
          last_updated       = NOW()
      WHERE guild_id = ${GUILD_ID}
    `;

    // Clear per-message reaction records and voice session history
    await sql`DELETE FROM message_reactions WHERE guild_id = ${GUILD_ID}`;
    await sql`DELETE FROM voice_sessions    WHERE guild_id = ${GUILD_ID}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Stats reset. Usernames, nicknames, and join dates preserved.',
        rows_updated: result.count ?? '(unknown)',
      }),
    };
  } catch (error) {
    console.error('reset-stats error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
