// API for community reviews
// GET /.netlify/functions/reviews?limit=10
// POST /.netlify/functions/reviews { player_name, rating, review_text }

const { neon } = require('@netlify/neon');

const LINK_PATTERN = /(https?:\/\/|www\.|\.com|\.gg|\.net|\.org|discord\.gg)/i;

exports.handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  try {
    // GET - Retrieve all reviews with stats
    if (event.httpMethod === 'GET') {
      const limit = Math.min(parseInt(event.queryStringParameters?.limit || '50'), 500);

      // Get all reviews
      const reviews = await sql`
        SELECT id, player_name, rating, review_text, created_at
        FROM reviews
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      // Get rating stats
      const stats = await sql`
        SELECT 
          COUNT(*) as total_reviews,
          ROUND(AVG(rating)::numeric, 1) as avg_rating,
          COUNT(*) FILTER (WHERE rating = 5) as five_star,
          COUNT(*) FILTER (WHERE rating = 4) as four_star,
          COUNT(*) FILTER (WHERE rating = 3) as three_star,
          COUNT(*) FILTER (WHERE rating = 2) as two_star,
          COUNT(*) FILTER (WHERE rating = 1) as one_star
        FROM reviews
      `;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        body: JSON.stringify({
          reviews,
          stats: stats[0] || { total_reviews: 0, avg_rating: 0 }
        })
      };
    }

    // POST - Submit review
    if (event.httpMethod === 'POST') {
      const { player_name, rating, review_text } = JSON.parse(event.body || '{}');

      // Validation
      if (!player_name || !rating || !review_text) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required fields' })
        };
      }

      // Sanitize & validate
      const clean_name = player_name.trim().replace(/[<>"'&]/g, '');
      const clean_text = review_text.trim().replace(/[<>"'&]/g, '');

      if (!clean_name || clean_name.length < 2) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Name must be at least 2 characters' })
        };
      }

      if (clean_text.length < 10) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Review must be at least 10 characters' })
        };
      }

      if (LINK_PATTERN.test(clean_name) || LINK_PATTERN.test(clean_text)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Links not allowed in reviews' })
        };
      }

      const rating_num = parseInt(rating);
      if (isNaN(rating_num) || rating_num < 1 || rating_num > 5) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Rating must be 1-5' })
        };
      }

      const result = await sql`
        INSERT INTO reviews (player_name, rating, review_text)
        VALUES (${clean_name}, ${rating_num}, ${clean_text})
        RETURNING id, player_name, rating, review_text, created_at
      `;

      return {
        statusCode: 201,
        body: JSON.stringify({ message: 'Review posted', data: result[0] })
      };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('Reviews error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
