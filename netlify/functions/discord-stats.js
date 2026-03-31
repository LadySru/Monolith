const GUILD_ID = "863475027214598173";

export default async (req, context) => {
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  try {
    const botToken = Netlify.env.get("DISCORD_BOT_TOKEN");

    if (!botToken) {
      return new Response(
        JSON.stringify({
          error: "Discord bot token not configured",
          online: 0,
          members: 0,
        }),
        { status: 503 }
      );
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
      return new Response(
        JSON.stringify({
          error: "Failed to fetch Discord stats",
          online: 0,
          members: 0,
        }),
        { status: response.status }
      );
    }

    const guildData = await response.json();

    // Get approximate online count (requires GUILD_PRESENCES intent)
    const memberCount = guildData.member_count || 0;
    const guildName = guildData.name || "Monolith Social";

    // Build guild icon URL
    let iconUrl = null;
    if (guildData.icon) {
      const iconFormat = guildData.icon.startsWith("a_") ? "gif" : "png";
      iconUrl = `https://cdn.discordapp.com/icons/${GUILD_ID}/${guildData.icon}.${iconFormat}`;
    }

    // Try to get online count from guild presences
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
        onlineCount = presenceData.approximate_presence_count || Math.ceil(memberCount * 0.3);
      } else {
        // Fallback: estimate online as ~30% of members
        onlineCount = Math.ceil(memberCount * 0.3);
      }
    } catch (error) {
      console.warn("Could not fetch presence data:", error);
      // Fallback: estimate online as ~30% of members
      onlineCount = Math.ceil(memberCount * 0.3);
    }

    return new Response(
      JSON.stringify({
        online: onlineCount,
        members: memberCount,
        icon: iconUrl,
        name: guildName,
        cached: false,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300", // Cache for 5 minutes (icon rarely changes)
        },
      }
    );
  } catch (error) {
    console.error("Discord stats error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        online: 0,
        members: 0,
      }),
      { status: 500 }
    );
  }
};
