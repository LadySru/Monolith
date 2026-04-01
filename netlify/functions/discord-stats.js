const GUILD_ID = "863475027214598173";

exports.handler = async (event, context) => {
  const req = {
    method: event.httpMethod,
  };
  if (req.method !== "GET") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const botToken = process.env.DISCORD_BOT_TOKEN;

    if (!botToken) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          error: "Discord bot token not configured",
          online: 0,
          members: 0,
        }),
      };
    }

    // Fetch guild data from Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
    });

    if (!response.ok) {
      console.error(
        `Discord API error: ${response.status} ${response.statusText}`
      );
      return {
        statusCode: response.status,
        body: JSON.stringify({
          error: "Failed to fetch Discord stats",
          online: 0,
          members: 0,
        }),
      };
    }

    const guildData = await response.json();

    // Get approximate online count (requires GUILD_PRESENCES intent)
    const guildName = guildData.name || "Monolith Social";

    // Build guild icon URL
    let iconUrl = null;
    if (guildData.icon) {
      const iconFormat = guildData.icon.startsWith("a_") ? "gif" : "png";
      iconUrl = `https://cdn.discordapp.com/icons/${GUILD_ID}/${guildData.icon}.${iconFormat}`;
    }

    // Get real member and presence counts from guild with counts
    let memberCount = 0;
    let onlineCount = 0;
    try {
      const presenceResponse = await fetch(
        `https://discord.com/api/v10/guilds/${GUILD_ID}?with_counts=true`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        }
      );

      if (presenceResponse.ok) {
        const presenceData = await presenceResponse.json();
        memberCount = presenceData.approximate_member_count || 0;
        onlineCount = presenceData.approximate_presence_count || 0;
      } else {
        // Fallback if we can't get counts
        memberCount = 0;
        onlineCount = 0;
      }
    } catch (error) {
      console.warn("Could not fetch guild counts:", error);
      memberCount = 0;
      onlineCount = 0;
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
      body: JSON.stringify({
        online: onlineCount,
        members: memberCount,
        icon: iconUrl,
        name: guildName,
        cached: false,
      }),
    };
  } catch (error) {
    console.error("Discord stats error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        online: 0,
        members: 0,
      }),
    };
  }
};
