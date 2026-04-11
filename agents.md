# Agents Guide

This file gives coding agents (Claude Code, Cursor, Copilot, etc.) the
conventions and context they need to work on this repository productively.

## What this repo is

A personal algorithm codebook built with [Docusaurus](https://docusaurus.io/).
Each algorithm lives in `docs/<topic>/<algorithm>.mdx` and is published as a
static site. The authoritative style reference is
[`docs/documenting-style.mdx`](docs/documenting-style.mdx) — read it before
creating or editing any algorithm page.

## Project layout

```
docs/                      All published content. Everything is .mdx.
  documenting-style.mdx    Canonical format every algorithm page must follow.
  intro.mdx, expectation.mdx
  sorting/                 Topic folders grouped by algorithm family.
  searching/
  greedy/
  dynamic-programming/
  additional-data-structures/
  discrete-mathematics/
src/components/
  PyListSnippet/           Interactive Pyodide-based Python runner used in
                           .mdx pages. Accepts hard-coded sample tests AND
                           free-form user input.
static/workers/
  py-list-snippet-worker.js  Web Worker that loads Pyodide and executes
                             `solve(xs)` against sample/custom inputs.
sidebars.js                Auto-generated sidebar from docs/ directory tree.
docusaurus.config.js       Site config.
```

## File format: every page MUST be .mdx

All content files in `docs/` are `.mdx` (not `.md`). MDX is required so we
can import Docusaurus tab components and the interactive Python runner.

Every algorithm page starts with this preamble:

```mdx
---
sidebar_position: <N>
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import PyListSnippet from '@site/src/components/PyListSnippet';

# <Algorithm Name>
```

Do not create new `.md` files. Do not remove the imports even if a given
page only uses a subset — consistency wins over minimalism here.

## Documenting style

Every algorithm page must have these sections, in this order, with exactly
these header levels:

1. `# <Algorithm Name>` — H1, matches the file's topic.
2. A one-to-three paragraph intuition/summary (no header).
3. `## Codes` — Python and C++ tabs at minimum, using `<Tabs>` / `<TabItem>`.
   Python goes first. Java is optional and only kept if it was already there.
4. `## Example` — a `<PyListSnippet>` that the reader can actually run. See
   "Interactive snippets" below.
5. `## Description` — must contain these H3 subsections in order:
   - `### Run time analysis`
   - `### Space analysis`
   - `### Proof of correctness`
6. `## Extensions` — leave empty (just the header) unless content already
   exists.
7. `## Applications` — leave empty (just the header) unless content already
   exists.
8. `## References` — bullet list of sources. Omit the section only if there
   are genuinely no references.

Header numbering/levels must be consistent. Don't jump from `##` to `####`.
Don't use `#` anywhere except the page title.

### Codes section rules

- Python code must be runnable as-is (no pseudo-code placeholders).
- C++ code must compile under C++17 with standard headers.
- Use the function name `solve` for the Python entry point whenever a
  `<PyListSnippet>` follows — the runner calls `solve(xs)`.
- Prefer idiomatic library usage (`heapq`, `bisect`, `collections.deque`,
  `std::priority_queue`, `std::vector`, etc.).

### Description section rules

- **Run time analysis**: state big-O in `$...$` LaTeX, then one or two
  sentences explaining where the cost comes from.
- **Space analysis**: state big-O in `$...$` LaTeX, then a sentence on
  auxiliary vs. input memory.
- **Proof of correctness**: a short argument — loop invariant, induction,
  exchange argument, or cite the classical proof. Not pseudo-code.

## Interactive snippets: `<PyListSnippet>`

`<PyListSnippet>` runs Python in the browser via Pyodide. The component
lives at [`src/components/PyListSnippet/index.jsx`](src/components/PyListSnippet/index.jsx)
and the worker at [`static/workers/py-list-snippet-worker.js`](static/workers/py-list-snippet-worker.js).

Usage:

```mdx
<PyListSnippet
  title="Sort a list"
  tests={[
    { input: [3, 1, 2], expected: [1, 2, 3] },
    { input: [], expected: [] },
  ]}
>
{`
def solve(xs):
    return sorted(xs)
`}
</PyListSnippet>
```

Rules:

- The snippet must define a top-level function named `solve` that takes a
  single argument (a list). The worker calls `solve(xs)`.
- `tests` is optional. Each entry has an `input` and an optional `expected`.
  Sample tests are displayed in a collapsible panel and run with the
  "Run sample tests" button.
- Readers can also type their own input into the textarea and press
  "Run on my input". The custom input is parsed as JSON (with a relaxed
  fallback for Python-style `True`/`False`/`None` and single quotes).
- For algorithms whose natural input is not a flat list (e.g. graphs),
  encode the input as a nested list and destructure inside `solve`, so
  the reader only has one input field to fill in.

## Do / don't

- **Do** read `docs/documenting-style.mdx` before starting.
- **Do** rename any remaining `.md` files to `.mdx` if you find them.
- **Do** use `git mv` when renaming so history is preserved.
- **Don't** invent applications or extensions. Leave those sections empty
  unless the user explicitly asks for content there.
- **Don't** use emojis in docs.
- **Don't** add feature flags, abstractions, or commentary beyond what the
  task asks for. A cleanup pass is not a refactor.
- **Don't** modify `sidebars.js` — Docusaurus regenerates it from the
  folder structure.

## Build & validation

```bash
yarn install        # once
yarn start          # local dev server with hot reload
yarn build          # production build — run this before declaring "done"
```

The build is the source of truth. If `yarn build` fails, the docs change
is not finished.

## References

- [Docusaurus docs](https://docusaurus.io/docs)
- [MDX](https://mdxjs.com/)
- [Pyodide](https://pyodide.org/)
