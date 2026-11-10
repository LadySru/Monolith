// Handles Discord OAuth2 callback, verifies guild admin, issues session token
// GET /.netlify/functions/admin-callback?code=...

const crypto = require('crypto');

const GUILD_ID    = '863475027214598173';
const CLIENT_ID   = process.env.DISCORD_CLIENT_ID || '1486388915048026322';
const REDIRECT_URI = 'https://monolithsocial.netlify.app/.netlify/functions/admin-callback';
const ADMIN_PAGE  = 'https://monolithsocial.netlify.app/admin.html';
const ADMIN_PERM  = BigInt(0x8); // administrator bit

function signToken(userId) {
  const payload = `${userId}:${Date.now()}`;
  const sig = crypto
    .createHmac('sha256', process.env.ADMIN_SESSION_SECRET || 'changeme')
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

exports.handler = async (event) => {
  const { code, error } = event.queryStringParameters || {};

  if (error || !code) {
    return { statusCode: 302, headers: { Location: `${ADMIN_PAGE}?error=cancelled` }, body: '' };
  }

  try {
    // 1. Exchange code for access token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) throw new Error(`Token exchange failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();

    // 2. Get Discord user info
    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) throw new Error('Failed to fetch user info');
    const user = await userRes.json();

    // 3. Check guild membership via bot token
    const memberRes = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/members/${user.id}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    });
    if (!memberRes.ok) {
      return { statusCode: 302, headers: { Location: `${ADMIN_PAGE}?error=not_member` }, body: '' };
    }
    const member = await memberRes.json();

    // 4. Check if guild owner or has administrator permission
    const guildRes = await fetch(`https://discord.com/api/guilds/${GUILD_ID}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    });
    const guild = await guildRes.json();
    const isOwner = guild.owner_id === user.id;

    let hasAdmin = isOwner;
    if (!hasAdmin) {
      const rolesRes = await fetch(`https://discord.com/api/guilds/${GUILD_ID}/roles`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      });
      const roles = await rolesRes.json();
      const roleMap = Object.fromEntries(roles.map(r => [r.id, r]));
      hasAdmin = member.roles.some(rid => {
        const role = roleMap[rid];
        return role && (BigInt(role.permissions) & ADMIN_PERM) === ADMIN_PERM;
      });
    }

    if (!hasAdmin) {
      return { statusCode: 302, headers: { Location: `${ADMIN_PAGE}?error=not_admin` }, body: '' };
    }

    // 5. Issue session token and pass display info to client
    const token = signToken(user.id);
    const displayName = member.nick || user.global_name || user.username;
    const avatarHash = member.avatar
      ? `https://cdn.discordapp.com/guilds/${GUILD_ID}/users/${user.id}/avatars/${member.avatar}.png`
      : user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/${parseInt(user.id) % 6}.png`;

    const userInfo = Buffer.from(JSON.stringify({ name: displayName, avatar: avatarHash }))
      .toString('base64url');

    return {
      statusCode: 302,
      headers: { Location: `${ADMIN_PAGE}?token=${token}&user=${userInfo}` },
      body: '',
    };
  } catch (err) {
    console.error('[admin-callback]', err);
    return { statusCode: 302, headers: { Location: `${ADMIN_PAGE}?error=server_error` }, body: '' };
  }
};
