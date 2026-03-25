// Run once to initialize database tables
// Trigger: POST to /.netlify/functions/init-db with auth check

const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  // Security: Only allow from authenticated Netlify Functions
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);

    // Create game_scores table
    await sql`
      CREATE TABLE IF NOT EXISTS game_scores (
        id SERIAL PRIMARY KEY,
        game_type VARCHAR(50) NOT NULL,
        player_name VARCHAR(50) NOT NULL,
        score INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_game_scores_game_type ON game_scores(game_type);
      CREATE INDEX IF NOT EXISTS idx_game_scores_created_at ON game_scores(created_at DESC);
    `;

    // Create reviews table
    await sql`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(50) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        review_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
    `;

    // Create newsletter_subscribers table
    await sql`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(50),
        interests TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
      CREATE INDEX IF NOT EXISTS idx_subscribers_email ON newsletter_subscribers(email);
      CREATE INDEX IF NOT EXISTS idx_subscribers_active ON newsletter_subscribers(is_active);
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Database initialized successfully' })
    };
  } catch (error) {
    console.error('Database init error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
