# Lessons learned

Durable, transferable rules distilled from real bugs hit in this repo. Each is a
"don't repeat this" — read before doing the matching kind of work.

## Theming / dark mode

- **Never mix a fixed-colour surface with theme-flipping token text (or vice
  versa).** An element is either fully theme-driven (semantic tokens on both bg
  and text) or fully fixed — not half each. *Bug:* the Clerk auth card had a
  hardcoded light `colorBackground` while its text used `text-foreground` (a
  token that flips light in dark mode) → in dark mode, light text on a light
  card = invisible. Fix was to make the card colour theme-aware too. To theme a
  third-party widget (Clerk), read `next-themes` `resolvedTheme` in a client
  component and pass a per-theme colour set.

- **On `bg-primary` / `bg-destructive`, use `text-{role}-foreground`, never
  `text-white`.** In a warm/dark palette those backgrounds get *lighter* in dark
  mode, so white text falls below AA (~3:1). The `*-foreground` tokens flip to
  near-black in dark mode and stay AA in both. (White is only correct over fixed
  media like video.) Verify palette changes with a compositing contrast script
  in **both** themes, not by eye.

## Radix / shadcn composition

- **`asChild` must wrap a single element that renders a real DOM node and
  forwards ref + onClick — not a context-provider/composite component.** *Bug:*
  an `AlertDialogTrigger asChild` wrapped a `<Tooltip>` (which renders a fragment
  of trigger + content, not a DOM node), so the click never reached the button
  and the dialog never opened — the action silently did nothing. Compose triggers
  by nesting (`Tooltip > TooltipTrigger asChild > DialogTrigger asChild >
  Button`), or drop the tooltip and use a native `title`.

## Tailwind

- **Tailwind silently drops arbitrary values containing nested `min()`/commas.**
  `[grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr))]` never
  generated, so a co-listed `grid-cols-1` won and the layout stacked. For complex
  grid templates use a **raw-CSS utility class**, and confirm it actually emitted
  (grep the compiled CSS) rather than trusting the class to exist.

## Next.js dev workflow

- **Don't run `next build` while `next dev` is running** — they share `.next`;
  the build rewrites it mid-flight and the dev server crashes (`ENOENT
  app-paths-manifest.json`). Use `tsc --noEmit` to typecheck while dev is live;
  only `next build` when no dev server is up.

## Relational deletes

- **Before deleting a row, audit every inbound FK.** Required, non-cascade FKs
  block the delete (Prisma `P2003`). *Bug:* `user.delete()` failed on
  `Task.reporterId` / `Document.uploaderId` (required, no `onDelete`), even though
  most relations cascade and optional ones SET NULL. Handle each blocking FK
  explicitly **inside one transaction** (cascade-delete, SET NULL, or reassign)
  so you never half-delete. For *users* specifically, prefer
  deactivation/anonymization over hard delete (see below).

## Product: deleting users in a collaboration tool

- **Default to deactivate (soft delete), not hard delete; for true erasure,
  anonymize.** Mature tools (Slack/Jira/Linear) deactivate by default and keep
  authored content attributed to a "former/deactivated" user. Hard delete should
  either *anonymize* (keep the row, scrub PII → "Deleted user", preserves FKs +
  history + GDPR) or *transfer ownership* (GitHub `@ghost`, Google Workspace).
  Reassigning a deleted user's content to the actor "works" but mis-attributes
  it — acceptable as a stopgap only.

## Shell / tooling cwd (this harness)

- **A Bash `cd` persists across calls and silently moves cwd for later commands.**
  A `cd <repo-root> && git …` left subsequent `npx shadcn add`/`sed` running from
  the wrong dir. Pass `--cwd`/absolute paths, or `cd` back explicitly.
- **zsh does NOT word-split unquoted variables** — `sed … $FILES` passed one
  giant filename and silently no-op'd. Use an array (`files=(…); … "${files[@]}"`)
  or `${=VAR}`.
