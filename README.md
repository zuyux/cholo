cholo.meme
# Social reward service

The 100 $CHOLO welcome flow expects a server-side social verification service. Configure:

```env
SOCIAL_REWARD_AUTH_URL=https://social.example.com/oauth
SOCIAL_REWARD_API_URL=https://social.example.com/api
SOCIAL_REWARD_API_SECRET=replace-with-a-server-secret
```

The service must expose `/x` below the auth URL, plus `POST /instagram`, `GET /status?address=...&verify=...`, `POST /follow/x`, and `POST /claim` below the API URL. `POST /instagram` stores the submitted Instagram username against the wallet address for later follow verification; Instagram OAuth is not used. The X OAuth grant must include `tweet.read users.read follows.read follows.write offline.access`. `POST /follow/x` receives `{ "address": "..." }`, uses the server-held OAuth user token, and always follows the configured CHOLO account rather than accepting a target ID from the browser. A status/claim response uses this shape:

```json
{
  "instagram": { "connected": true, "following": true, "username": "name" },
  "x": { "connected": true, "following": true, "username": "name" },
  "eligible": true,
  "claimed": false
}
```
