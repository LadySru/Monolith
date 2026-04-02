const { neon } = require('@netlify/neon');

const handler = async (event) => {
  try {
    const sql = neon(process.env.NETLIFY_DATABASE_URL);
    const query = event.queryStringParameters || {};
    const userId = query.user_id;
    const statType = query.type || 'all';

    // Get individual profile stats
    if (statType === 'profile' && userId) {
      const result = await sql`
        SELECT user_id, username, message_count, voice_time_seconds, join_date
        FROM member_stats WHERE user_id = ${parseInt(userId)}
      `;

      if (!result || result.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'User not found' }),
        };
      }

      const stats = result[0];
      const voiceHours = Math.floor(stats.voice_time_seconds / 3600);
      const voiceMins = Math.floor((stats.voice_time_seconds % 3600) / 60);

      return {
        statusCode: 200,
        body: JSON.stringify({
          user_id: stats.user_id,
          username: stats.username,
          messages: stats.message_count,
          voice_hours: voiceHours,
          voice_mins: voiceMins,
          join_date: stats.join_date,
        }),
      };
    }

    // Get leaderboard
    if (statType === 'leaderboard') {
      const topMessages = await sql`
        SELECT username, message_count FROM member_stats
        ORDER BY message_count DESC LIMIT 10
      `;

      const topVoice = await sql`
        SELECT username, voice_time_seconds FROM member_stats
        ORDER BY voice_time_seconds DESC LIMIT 10
      `;

      return {
        statusCode: 200,
        body: JSON.stringify({
          top_messages: topMessages.map(row => ({
            username: row.username,
            count: row.message_count,
          })),
          top_voice: topVoice.map(row => ({
            username: row.username,
            hours: Math.floor(row.voice_time_seconds / 3600),
          })),
        }),
      };
    }

    // Get oldest member
    if (statType === 'oldest') {
      const result = await sql`
        SELECT username, nickname, avatar_url, join_date FROM member_stats
        ORDER BY join_date ASC LIMIT 1
      `;

      if (!result || result.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'No members found' }),
        };
      }

      const oldest = result[0];
      return {
        statusCode: 200,
        body: JSON.stringify({
          username: oldest.username,
          nickname: oldest.nickname,
          avatar_url: oldest.avatar_url,
          join_date: oldest.join_date,
        }),
      };
    }

    // Get most GIFs
    if (statType === 'most-gifs') {
      const result = await sql`
        SELECT username, nickname, avatar_url, gif_count FROM member_stats
        WHERE gif_count > 0
        ORDER BY gif_count DESC LIMIT 5
      `;

      return {
        statusCode: 200,
        body: JSON.stringify({
          top_gifs: result.map(row => ({
            username: row.username,
            nickname: row.nickname,
            avatar_url: row.avatar_url,
            count: row.gif_count,
          })),
        }),
      };
    }

    // Get most images
    if (statType === 'most-images') {
      const result = await sql`
        SELECT username, nickname, avatar_url, image_count FROM member_stats
        WHERE image_count > 0
        ORDER BY image_count DESC LIMIT 5
      `;

      return {
        statusCode: 200,
        body: JSON.stringify({
          top_images: result.map(row => ({
            username: row.username,
            nickname: row.nickname,
            avatar_url: row.avatar_url,
            count: row.image_count,
          })),
        }),
      };
    }

    // Get most reacted message
    if (statType === 'most-reactions') {
      const result = await sql`
        SELECT username, nickname, avatar_url, message_content, reaction_count FROM message_reactions
        ORDER BY reaction_count DESC LIMIT 1
      `;

      if (!result || result.length === 0) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: 'No reactions found' }),
        };
      }

      const msg = result[0];
      return {
        statusCode: 200,
        body: JSON.stringify({
          username: msg.username,
          nickname: msg.nickname,
          avatar_url: msg.avatar_url,
          message: msg.message_content,
          reactions: msg.reaction_count,
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Stats API ready' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

module.exports = { handler };
