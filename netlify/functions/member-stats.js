const { neon } = require('@netlify/neon');

const GUILD_ID = BigInt("863475027214598173");

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
        FROM member_stats WHERE user_id = ${BigInt(userId)} AND guild_id = ${GUILD_ID}
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
        SELECT username, nickname, avatar_url, message_count, voice_time_seconds FROM member_stats
        WHERE guild_id = ${GUILD_ID} AND message_count > 0 AND is_bot IS NOT TRUE
        ORDER BY message_count DESC LIMIT 10
      `;
      const topGifs = await sql`
        SELECT username, nickname, avatar_url, gif_count, image_count FROM member_stats
        WHERE guild_id = ${GUILD_ID} AND gif_count > 0 AND is_bot IS NOT TRUE
        ORDER BY gif_count DESC LIMIT 10
      `;
      const topReactions = await sql`
        SELECT username, nickname, avatar_url, reaction_count FROM member_stats
        WHERE guild_id = ${GUILD_ID} AND reaction_count > 0 AND is_bot IS NOT TRUE
        ORDER BY reaction_count DESC LIMIT 10
      `;
      const topVoice = await sql`
        SELECT username, nickname, avatar_url, voice_time_seconds FROM member_stats
        WHERE guild_id = ${GUILD_ID} AND voice_time_seconds > 0 AND is_bot IS NOT TRUE
        ORDER BY voice_time_seconds DESC LIMIT 10
      `;
      const topOldest = await sql`
        SELECT username, nickname, avatar_url, join_date FROM member_stats
        WHERE guild_id = ${GUILD_ID} AND join_date IS NOT NULL AND is_bot IS NOT TRUE
        ORDER BY join_date ASC LIMIT 5
      `;

      return {
        statusCode: 200,
        body: JSON.stringify({
          top_messages: topMessages.map(r => ({ username: r.username, nickname: r.nickname, avatar_url: r.avatar_url, count: r.message_count, voice_seconds: r.voice_time_seconds || 0 })),
          top_gifs:     topGifs.map(r => ({ username: r.username, nickname: r.nickname, avatar_url: r.avatar_url, count: r.gif_count, images: r.image_count || 0 })),
          top_reactions:topReactions.map(r => ({ username: r.username, nickname: r.nickname, avatar_url: r.avatar_url, count: r.reaction_count })),
          top_voice:    topVoice.map(r => ({ username: r.username, nickname: r.nickname, avatar_url: r.avatar_url, seconds: r.voice_time_seconds })),
          top_oldest:   topOldest.map(r => ({ username: r.username, nickname: r.nickname, avatar_url: r.avatar_url, join_date: r.join_date })),
        }),
      };
    }

    // Get oldest member
    if (statType === 'oldest') {
      const result = await sql`
        SELECT username, nickname, avatar_url, join_date FROM member_stats
        WHERE guild_id = ${GUILD_ID}
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
        WHERE guild_id = ${GUILD_ID} AND gif_count > 0
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
        WHERE guild_id = ${GUILD_ID} AND image_count > 0
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
        WHERE guild_id = ${GUILD_ID}
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

    // Get server boosters
    if (statType === 'boosters') {
      const result = await sql`
        SELECT username, nickname, avatar_url FROM member_stats
        WHERE guild_id = ${GUILD_ID} AND is_booster = TRUE
        ORDER BY username ASC
      `;
      return {
        statusCode: 200,
        body: JSON.stringify({
          boosters: result.map(r => ({ username: r.username, nickname: r.nickname, avatar_url: r.avatar_url })),
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
