# The domain core

The domain core is the centre of the onion: the part of the system that decides
what the product *does* (prices an order, grounds a finding, schedules a shift),
expressed as functions over values. Not every project has one yet; when the
business rules are worth protecting, extract them into a `domain/` folder or a
separate workspace package and declare it as `domain` in
`.claude/architecture.json` so `check-onion.sh` guards it.

## Zero I/O is the load-bearing rule

No database, no network client, no filesystem, no `process.env`, no HTTP
framework, no ORM. The only side effects permitted are calls through **injected**
ports (an `LLMProvider`, a `Clock`). The `domain_io` check (and import-graph rules
like `no-core-to-server` / `no-core-io`) keep it that way.

This is functional core / imperative shell: the core is a function over values,
and every effect is pushed out to a shell (a service or a job runner) that
resolves inputs, calls in, and writes results back.

## Inputs arrive resolved

Configuration, templates and reference data reach the core as **values**, not
slugs or paths. Resolving a slug means reading a file or a row — that is the
caller's job.

```ts
// ❌ in the domain core
const template = await readFile(`templates/${slug}.md`, 'utf8');

// ✅ in the service (the shell), then passed in
const template = await this.templates.load(slug);
const result = renderInvoice({ order, template, … });
```

The test that this holds: **could the core run in a browser, with no filesystem
and no server?** If not, an effect has leaked in.

## What belongs here vs. in the server

| Question | Answer |
|---|---|
| Does it decide *what* a result is? | core |
| Does it fetch, persist, or authenticate anything? | server |
| Is it a pure transform over values already in hand? | core |
| Does it need config, secrets, or a clock? | server — pass the value in |

Example: a function that drops every model finding whose line references do not
exist in the input, and recomputes a score from the survivors, is a pure function
over the input and the model output — so it lives in the core, and is testable
without a key, a database or a network.

## If the core builds prompts

When the core assembles LLM prompts, the prompt is part of its contract:

- every optional slot is **omit-when-empty**: an absent slot must produce a prompt
  byte-identical to the one before that feature existed;
- external content is wrapped in one helper that marks it untrusted;
- a shared injection guard is appended in one place, not restated per prompt;
- cancellation is signalled by a callback that **throws**; the core stays agnostic
  about the error type, so cancellation semantics stay in the shell.

## Its own package boundary

When the core is a separate package, its `src/index.ts` (or `exports` map) is the
only supported import surface. Importing an internal path from the server couples
to the core's file layout; import from the barrel.

If the core is consumed as TypeScript source through a path alias (no build
step), its typecheck *is* its build. Do not add a bundler step that consumers
would never see.
