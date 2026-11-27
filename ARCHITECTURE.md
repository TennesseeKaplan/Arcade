# Arcade architecture

Each game lives in its own top-level folder and publishes through GitHub Pages. Shared browser code lives in `shared/player/`.

## Start each visit fresh

Add the shared page module to each game’s HTML. This path assumes the page is one folder below the Arcade root.

```html
<script type="module" src="../shared/player/game-page.js"></script>
```

Initialize a new run when the page loads and keep gameplay state in memory. The shared module reloads a game if Back or Forward restores it from the browser’s back-forward cache. Switching tabs does not end a visit. Save preferences such as mute separately from run state.

## Archived hosted leaderboard design

The [leaderboard archive](architecture/leaderboard/) contains the backend and deployment instructions. Live Desperados shows the finish result without an online leaderboard.

GitHub Pages serves the game and leaderboard interface. A separate hosted API and database would accept finished scores and return per-game rankings. Games would submit a nickname and a completed result only when the player chooses to post it. Leaderboard entries are independent of the current run.

A first version could use Supabase with an Edge Function that validates submissions, limits posting frequency, and keeps database write credentials on the server. Desperados can rank finish time in milliseconds, fastest first. Browser-reported scores are suitable for casual play. Stronger verification would require additional server-side evidence.

## New game decisions

Use the [game development decision guide](architecture/game-development/) to choose what to reuse, adopt, adapt, build, or defer. The guide covers the test to run before sharing a system across games.
