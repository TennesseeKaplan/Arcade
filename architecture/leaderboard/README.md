# Desperados leaderboard

The game stays on GitHub Pages. The leaderboard needs a Supabase project.

1. Run `schema.sql` in the project's SQL Editor.
2. Create an Edge Function named `desperados-leaderboard` with the contents of `index.ts`. Disable the function's JWT check for anonymous score submission. Supabase supplies the private service role credential to the function.
3. Set the `desperados-leaderboard` meta tag in `desperados/index.html` to the public function URL, then deploy the page. Set `ARCADE_ORIGIN` in the function environment for an alternate hosting origin.
4. Verify that a completed run posts once and appears in the top ten on another device.

Scores are browser-reported. The endpoint validates shape and plausible time bounds, and retries reuse the same run ID. Public writes should have hosting-side rate limits before opening a board to broad traffic. Never put the service role credential in the game.

## Restoring the game integration

The leaderboard has been removed from the live game. The original frontend integration is preserved in [the leaderboard commit](https://github.com/TennesseeKaplan/Arcade/commit/9bdd8098a1852283a8eacfe50b9d7e54a7eb4db3). Restore its leaderboard UI and API calls before configuring the public function URL.
