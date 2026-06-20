---
description: Write a detailed engineering blog post for a pull request, with original SVG illustrations and publish-ready frontmatter
allowed-tools: Bash(gh pr view:*), Bash(gh pr diff:*), Bash(git log:*), Bash(git diff:*), Bash(git branch:*), Bash(mkdir:*), Write
argument-hint: [PR number or URL — defaults to the PR for current branch]
model: sonnet
---

## Context

- PR metadata: !`gh pr view $ARGUMENTS --json number,title,body,author,baseRefName,headRefName,additions,deletions,changedFiles,commits,mergedAt 2>/dev/null || gh pr view --json number,title,body,author,baseRefName,headRefName,additions,deletions,changedFiles,commits,mergedAt`
- PR diff: !`gh pr diff $ARGUMENTS 2>/dev/null || gh pr diff`
- Branch: !`git branch --show-current`
- Today's date: !`date +%Y-%m-%d`

## Ask where to save (FIRST — before writing anything)

Before generating the post or illustrations, ask the user where to save the
output, and wait for their answer. Present these options:

- **`blog/` (default)** — the pipeline's watched directory; pushing triggers
  the build + feed. Choose this for anything meant to publish.
- **A custom directory** — ask for the path (e.g. `drafts/`, `docs/posts/`).
  Use exactly what they give, creating it with `mkdir -p` if needed.
- **Draft / not for publishing** — save to `drafts/` so it stays out of the
  feed (the publishing pipeline only globs `blog/*.md`).

Treat the chosen directory as `<dir>` for the rest of this command. If the user
gives a PR argument but no save preference and doesn't respond, default to
`blog/`. Note: only posts under `blog/` are picked up by the feed — if they
pick anywhere else, say so explicitly so they aren't surprised when it doesn't
syndicate.

## Frontmatter (REQUIRED — emit first, before any prose)

Every post MUST begin with this YAML frontmatter block. The publishing
pipeline's RSS/Atom feed depends on `title`, `date`, and `tags: posts`; a post
missing any of these will not appear in the feed and won't syndicate.

```yaml
---
layout: post.njk
title: "<engaging, specific title — see structure item 1>"
description: "<one-sentence summary; used in the feed and social cards>"
date: <PR mergedAt date if present, else today's date, as YYYY-MM-DD>
tags: posts
---
```

The `post.njk` layout renders `title` as the page's `<h1>`. Therefore do NOT
repeat the title as a top-level heading in the body — start the body with the
hero illustration, then the opening prose.

## Task

Write a detailed technical blog post about this pull request, aimed at
other engineers. Use the PR title, description, commits, and diff above as
source material. The post should explain the work, not just narrate the diff.

Structure:

1. **Title** — engaging, specific (not just the PR title). Goes in the
   frontmatter `title`, not as a body heading.
2. **The problem / motivation** — what was broken, missing, or slow, and
   why it mattered. Set the stakes before the solution.
3. **The approach** — the design decisions and trade-offs. Mention
   alternatives that were considered or rejected, if inferable.
4. **Implementation highlights** — walk through the most interesting parts
   with short, illustrative code snippets pulled from the diff (don't paste
   the whole diff). Explain the _why_ behind non-obvious choices.
5. **Results / impact** — what changed for users or the system. Reference
   line counts, files touched, or perf implications where relevant.
6. **What's next** — follow-ups, known limitations, or future work.

## Illustrations

Generate **at least 2 original SVG illustrations** for the post (no external
image services — author the SVG markup directly):

1. **Hero / thumbnail** (required) — a 1200×630 (OG-card ratio) conceptual
   banner that captures the theme of the PR. Include the post title or a
   short evocative phrase as text. This goes at the very top of the body
   (immediately after the frontmatter, before the opening prose).
2. **At least one technical diagram** (required) — pick whatever genuinely
   clarifies _this_ PR from: architecture/component diagram, data/flow
   sequence, before→after comparison, state machine, or a perf/metrics chart
   (use real numbers from the diff when available). Add more if the post has
   several distinct ideas worth visualizing.

Illustration style:

- Cohesive palette: pick 2–3 accent colors + a neutral, and reuse them across
  all SVGs so the set looks like one family.
- Set `viewBox`, use a system font stack (`-apple-system, Segoe UI, Roboto,
sans-serif`) — never web-font URLs. Keep everything self-contained in the
  file (inline styles, no external refs).
- Consistent stroke widths, generous padding, readable labels (≥14px).
  Favor clean geometric shapes, subtle gradients, and clear hierarchy over
  clutter. It should look like a thoughtful engineering diagram, not clip art.
- Diagrams must be accurate to the actual code — label real file names,
  functions, services, and tables from the diff, not placeholders.

## Style

- Conversational but technically precise. Write like a senior engineer
  explaining their work to peers, not marketing copy.
- Use concrete details from the diff — file names, function names, real
  numbers — rather than vague generalities.
- Code blocks should be minimal and load-bearing: show the key change, not
  boilerplate.
- Target 600–1200 words depending on PR size.

## Output

1. Create the asset dir: `<dir>/assets/pr-<number>-<slug>/`.
2. Write each SVG there, e.g. `hero.svg`, `architecture.svg`, etc. Do NOT
   generate PNGs — the publishing pipeline rasterizes SVGs to PNG at build time.
3. Write the post to `<dir>/pr-<number>-<slug>.md` (create `<dir>` if needed),
   using the PR number and a short kebab-case slug of the title. Begin the
   file with the required frontmatter block above.
4. Embed illustrations inline with relative markdown image refs — hero at the
   top of the body, each diagram next to the section it supports. Use the SVG
   path as authored; the build rewrites `.svg`→`.png` and `assets/`→`/assets/`:
   `![alt text](assets/pr-<number>-<slug>/hero.svg)`
5. Print the post path and the list of generated SVG paths when done. If saved
   outside `blog/`, remind the user it won't appear in the feed until moved.
