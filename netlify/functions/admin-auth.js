// Redirects to Discord OAuth2 login
// GET /.netlify/functions/admin-auth

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1486388915048026322';
const REDIRECT_URI = 'https://monolithsocial.netlify.app/.netlify/functions/admin-callback';

exports.handler = async () => {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
  });

  return {
    statusCode: 302,
    headers: { Location: `https://discord.com/oauth2/authorize?${params}` },
    body: '',
  };
};
