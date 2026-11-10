// Verified admin action proxy — verifies session token then executes action
// POST /.netlify/functions/admin-proxy
// Header: x-session-token: <token from login>
// Body:   { action: string, payload?: object }

const crypto = require('crypto');
const { neon } = require('@netlify/neon');

const GUILD_ID = BigInt('863475027214598173');

function verifyToken(token) {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const lastColon = decoded.lastIndexOf(':');
    const payload   = decoded.slice(0, lastColon);
    const sig       = decoded.slice(lastColon + 1);
    const expected  = crypto
      .createHmac('sha256', process.env.ADMIN_SESSION_SECRET || 'changeme')
      .update(payload)
      .digest('hex');
    if (sig !== expected) return null;
    const ts = parseInt(payload.split(':')[1]);
    if (Date.now() - ts > 86_400_000) return null; // 24 h expiry
    return { userId: payload.split(':')[0] };
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const session = verifyToken(event.headers['x-session-token']);
  if (!session) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const { action, payload = {} } = JSON.parse(event.body || '{}');
  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  try {
    switch (action) {

      case 'reset-stats': {
        await sql`
          UPDATE member_stats
          SET message_count = 0, gif_count = 0, image_count = 0,
              reaction_count = 0, voice_time_seconds = 0,
              in_server = FALSE, last_updated = NOW()
          WHERE guild_id = ${GUILD_ID}
        `;
        await sql`DELETE FROM message_reactions WHERE guild_id = ${GUILD_ID}`;
        await sql`DELETE FROM voice_sessions    WHERE guild_id = ${GUILD_ID}`;
        return { statusCode: 200, body: JSON.stringify({ ok: true, message: 'Stats reset. Usernames and join dates preserved.' }) };
      }

      case 'get-reviews': {
        const reviews = await sql`
          SELECT id, player_name, rating, review_text, created_at
          FROM reviews ORDER BY created_at DESC
        `;
        return { statusCode: 200, body: JSON.stringify({ reviews }) };
      }

      case 'delete-review': {
        const { id, player_name } = payload;
        if (id) {
          await sql`DELETE FROM reviews WHERE id = ${parseInt(id)}`;
          return { statusCode: 200, body: JSON.stringify({ ok: true }) };
        }
        if (player_name) {
          await sql`DELETE FROM reviews WHERE player_name = ${player_name}`;
          return { statusCode: 200, body: JSON.stringify({ ok: true }) };
        }
        return { statusCode: 400, body: JSON.stringify({ error: 'Provide id or player_name' }) };
      }

      case 'get-members': {
        const members = await sql`
          SELECT user_id, username, nickname, avatar_url, message_count,
                 gif_count, reaction_count, voice_time_seconds, in_server, join_date, is_booster
          FROM member_stats
          WHERE guild_id = ${GUILD_ID} AND is_bot IS NOT TRUE
          ORDER BY message_count DESC
          LIMIT 100
        `;
        return { statusCode: 200, body: JSON.stringify({ members }) };
      }

      case 'get-boosters': {
        const boosters = await sql`
          SELECT username, nickname, avatar_url
          FROM member_stats
          WHERE guild_id = ${GUILD_ID} AND is_booster = TRUE
        `;
        return { statusCode: 200, body: JSON.stringify({ boosters }) };
      }

      default:
        return { statusCode: 400, body: JSON.stringify({ error: `Unknown action: ${action}` }) };
    }
  } catch (err) {
    console.error('[admin-proxy]', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
