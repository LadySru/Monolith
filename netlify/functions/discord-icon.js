const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = '863475027214598173';

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check if token is configured
  if (!DISCORD_BOT_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Discord bot token not configured' })
    };
  }

  try {
    // Fetch guild data from Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`
      }
    });

    if (!response.ok) {
      console.error('Discord API error:', response.status);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to fetch guild data' })
      };
    }

    const data = await response.json();

    if (!data.icon) {
      return {
        statusCode: 200,
        body: JSON.stringify({ iconUrl: null })
      };
    }

    // Construct the Discord CDN icon URL
    const iconUrl = `https://cdn.discordapp.com/icons/${GUILD_ID}/${data.icon}.webp?size=256`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      },
      body: JSON.stringify({ iconUrl })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
