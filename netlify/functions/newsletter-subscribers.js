// API for newsletter subscriptions
// GET /.netlify/functions/newsletter-subscribers?limit=10
// POST /.netlify/functions/newsletter-subscribers { email, name, interests }

const { neon } = require('@netlify/neon');

exports.handler = async (event, context) => {
  const sql = neon(process.env.NETLIFY_DATABASE_URL);

  try {
    // GET - Retrieve subscriber count (admin use)
    if (event.httpMethod === 'GET') {
      const activeOnly = event.queryStringParameters?.active !== 'false';
      const query = activeOnly 
        ? sql`SELECT COUNT(*) as count FROM newsletter_subscribers WHERE is_active = true`
        : sql`SELECT COUNT(*) as count FROM newsletter_subscribers`;

      const result = await query;

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriber_count: result[0]?.count || 0 })
      };
    }

    // POST - Subscribe to newsletter
    if (event.httpMethod === 'POST') {
      const { email, name, interests } = JSON.parse(event.body || '{}');

      // Validation
      if (!email) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Email is required' })
        };
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid email address' })
        };
      }

      const clean_name = name ? name.trim().slice(0, 50) : 'Subscriber';
      const clean_interests = interests ? JSON.stringify(interests) : null;

      try {
        // Try to insert, if duplicate email then just reactivate
        const result = await sql`
          INSERT INTO newsletter_subscribers (email, name, interests, is_active)
          VALUES (${email.toLowerCase()}, ${clean_name}, ${clean_interests}, true)
          ON CONFLICT (email) DO UPDATE
          SET is_active = true, name = ${clean_name}, interests = ${clean_interests}
          RETURNING id, email, name, created_at
        `;

        return {
          statusCode: 201,
          body: JSON.stringify({
            message: 'Subscribed successfully',
            data: result[0]
          })
        };
      } catch (error) {
        if (error.message.includes('duplicate')) {
          return {
            statusCode: 409,
            body: JSON.stringify({ error: 'Email already subscribed' })
          };
        }
        throw error;
      }
    }

    // DELETE - Unsubscribe (if needed)
    if (event.httpMethod === 'DELETE') {
      const { email } = JSON.parse(event.body || '{}');

      if (!email) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Email is required' })
        };
      }

      await sql`
        UPDATE newsletter_subscribers
        SET is_active = false
        WHERE email = ${email.toLowerCase()}
      `;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Unsubscribed' })
      };
    }

    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('Newsletter error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
