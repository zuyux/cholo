export function instagramClientConfig() {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error('instagram_unavailable');
  return { clientId, clientSecret, redirectUri };
}
