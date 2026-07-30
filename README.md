cholo.meme
# Social reward service

The 100 $CHOLO welcome flow runs inside this Next.js app and stores state in Supabase. Apply `supabase/migrations/20260729000000_create_reward_claims.sql`, then configure:

```env
X_CLIENT_ID=...
X_CLIENT_SECRET=...
X_REDIRECT_URI=https://your-domain.com/api/rewards/callback/x
X_CHOLO_USERNAME=cholocoinmeme
```

Register the callback URL in the X developer console. Instagram does not expose arbitrary follower verification through its public API, so the app records the submitted handle; X uses OAuth 2.0 PKCE and performs the follow through the official API. A status/claim response uses this shape:

```json
{
  "instagram": { "connected": true, "following": true, "username": "name" },
  "x": { "connected": true, "following": true, "username": "name" },
  "eligible": true,
  "claimed": false
}
```
