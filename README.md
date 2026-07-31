cholo.meme
# Social reward service

The 1,000 $CHOLO welcome flow runs inside this Next.js app and stores state in Supabase. Apply `supabase/migrations/20260729000000_create_reward_claims.sql`, then configure:

```env
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=https://your-domain.com/api/rewards/callback/x
X_CHOLO_USERNAME=cholocoinmeme
X_CHOLO_USER_ID=1945221268137009152
REWARD_SESSION_SECRET=replace-with-at-least-32-random-bytes
REWARD_TOKEN_ENCRYPTION_KEY=replace-with-32-random-bytes-in-base64
```

Register the callback URL in the X developer console. X uses OAuth 2.0 PKCE and performs the follow through the official API. A status/claim response uses this shape:

```json
{
  "x": { "connected": true, "following": true, "username": "name" },
  "eligible": true,
  "claimed": false
}
```
