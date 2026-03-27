// API for saving and retrieving game scores
// GET /.netlify/functions/game-scores?game=snake&limit=10
// POST /.netlify/functions/game-scores { game_type, player_name, score }

const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  try {
    // GET - Retrieve leaderboard
    if (event.httpMethod === 'GET') {
      const game = event.queryStringParameters?.game || 'snake';
      const limit = Math.min(parseInt(event.queryStringParameters?.limit || '10'), 100);

      const scores = await sql`
        SELECT id, player_name, score, created_at
        FROM game_scores
        WHERE game_type = ${game}
        ORDER BY score DESC, created_at ASC
        LIMIT ${limit}
      `;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        body: JSON.stringify({ scores })
      };
    }

    // POST - Save score
    if (event.httpMethod === 'POST') {
      const { game_type, player_name, score } = JSON.parse(event.body || '{}');

      // Validation
      if (!game_type || !player_name || score === undefined) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields: game_type, player_name, score' })
        };
      }

      if (!['snake', 'silhouette', 'quiz', 'tap'].includes(game_type)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid game_type' })
        };
      }

      if (typeof score !== 'number' || score < 0) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Score must be a non-negative number' })
        };
      }

      const result = await sql`
        INSERT INTO game_scores (game_type, player_name, score)
        VALUES (${game_type}, ${player_name}, ${score})
        RETURNING id, player_name, score, created_at
      `;

      return {
        statusCode: 201,
        body: JSON.stringify({ message: 'Score saved', data: result[0] })
      };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('Game scores error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
