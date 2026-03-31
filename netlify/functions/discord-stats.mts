import type { Context, Config } from "@netlify/functions";

const GUILD_ID = "863475027214598173";

export default async (req: Request, context: Context): Promise<Response> => {
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
    const response = await fetch(`https://discordapp.com/api/v10/guilds/${GUILD_ID}`, {
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

    const guildData = await response.json() as {
      member_count?: number;
      presences?: Array<{ status: string }>;
    };

    // Get approximate online count (requires GUILD_PRESENCES intent)
    const memberCount = guildData.member_count || 0;

    // Try to get online count from guild presences
    let onlineCount = 0;
    try {
      const presenceResponse = await fetch(
        `https://discordapp.com/api/v10/guilds/${GUILD_ID}/presences`,
        {
          headers: {
            Authorization: `Bot ${botToken}`,
          },
        }
      );

      if (presenceResponse.ok) {
        const presences = (await presenceResponse.json()) as Array<{ status: string }>;
        onlineCount = presences.filter(
          (p) => p.status !== "offline"
        ).length;
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
        cached: false,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60", // Cache for 1 minute
        },
      }
    );
  } catch (error) {
    console.error("Discord stats error:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error",
        online: 0,
        members: 0,
      }),
      { status: 500 }
    );
  }
};

export const config: Config = {
  path: "/discord-stats",
};
