# Supabase Edge Functions deployment

This deployment uses two functions:

- veyrost-auth: public authentication bootstrap only (sign-up, sign-in, refresh, sign-out). It does not read provider secrets.
- veyrost-proxy: requires a valid Supabase user JWT (verify_jwt = true) and routes only allowlisted external APIs.

## Required Edge Function secrets

Set these in Supabase Dashboard → Edge Functions → Secrets, or with the Supabase CLI. Never commit values to this repository.

- DEEPSEEK_API_KEY
- SILICONFLOW_API_KEY
- GITHUB_TOKEN — use a fine-grained token restricted to only the repositories and permissions Veyrost needs.
- GOOGLE_API_KEY
- GOOGLE_CX
- Optional override: VEYROST_ALLOWED_ORIGINS=https://veyrost.is-a.dev,https://khayom1.github.io (the same allowlist is the code default).

Supabase supplies SUPABASE_URL and SUPABASE_PUBLISHABLE_KEYS automatically; the auth function reads the default publishable key and falls back to SUPABASE_ANON_KEY for legacy projects. The publishable key is intentionally embedded in the browser client because Supabase classifies it as safe for browser use. It is not a provider secret or service-role key.

## CLI deployment

1. Restore the paused Supabase project in the Supabase Dashboard.
2. Install the current Supabase CLI and authenticate: supabase login.
3. Link the project: supabase link --project-ref bgfcpnlxztziigrsyuqp.
4. Add the secrets above in the dashboard or supabase secrets set (supply values locally; do not put them in shell history or source control).
5. Deploy auth without gateway JWT validation: supabase functions deploy veyrost-auth --no-verify-jwt.
6. Deploy the proxy with JWT validation enabled: supabase functions deploy veyrost-proxy.
7. Confirm both functions are deployed and test sign-up/sign-in, proxy health, DeepSeek, SiliconFlow, GitHub, Google Search and Jina Reader.

veyrost-proxy validates the user role and subject again inside the handler. Its in-memory rate limit is per Edge Function isolate, so it is a best-effort abuse control, not a global quota system. Provider-side limits and Supabase platform limits remain necessary.

## Browser behavior

The browser stores no provider API key, GitHub token, Google key, Supabase secret/service-role key, or auth password. The Supabase publishable key is public by design and is embedded in the client; the user access/refresh token exists only in page memory for the current tab. Reloading the page signs the user out and requires sign-in again.

Custom provider hosts are disabled until an explicit server-side route and secret are reviewed and added to the proxy allowlist. Gmail and Google Drive remain unavailable until OAuth consent and scopes are implemented; they are not routed through a fake API-key path.
