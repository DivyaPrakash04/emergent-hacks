<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- Roomsure is UI only: no backend, database, auth or server functions; a separate backend replaces the mock API later.
- Roomsure components live in `src/components/roomsure/<feature>/`, one per file; route files stay thin and only compose components.
- The app shell (header, mobile tab bar, desktop nav rail) wraps every route from `__root.tsx`; hidden-nav paths are listed in `shell/navItems.ts`.
- Files in `src/lib/roomsure/` headed `// STAND-IN` are temporary brain files written in Lovable; Claude Code's real versions replace them, so UI code must import only their public exports.
- `rankListings.ts` is copied unchanged from the `feat/ranking-engine` branch; never change its logic here.
- App state lives in `src/lib/roomsure/state.ts` (a `useSyncExternalStore` store saved to localStorage), keyed by listing id.
