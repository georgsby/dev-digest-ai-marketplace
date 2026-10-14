# Fastify — the transport ring

A route file is an **adapter**, not a layer of the application. It translates HTTP
into a service call and back. Fastify appears on this ring and nowhere else: no
adapter or platform file imports `fastify`, and the `http_import_leak` check (and
an import-graph rule like `no-adapter-to-transport`) keeps it that way.

Fastify mechanics (hooks, plugins, serialization, logging) are in
`engineering-paved-path:fastify-best-practices`. This file is only about placement.

## What a handler may contain

Four things, in this order:

1. resolve the request context — `const { tenantId, userId } = await getContext(app.container, req)`
2. call exactly one service method
3. set the status code
4. return the DTO

```ts
app.post('/projects', { schema: { body: ProjectInput } }, async (req, reply) => {
  const { tenantId, userId } = await getContext(app.container, req);
  const { project, created } = await service.add(tenantId, userId, req.body.url);
  reply.status(created ? 201 : 200);
  return project;
});
```

No `if` on business state, no database handle, no mapping loop. A handler longer
than ~10 lines is a service method that has not been extracted yet.

## Validation happens once, on the way in

```ts
app.post('/projects', { schema: { body: ProjectInput } }, ...)   // ✅ contract on the edge
ProjectInput.parse(req.body)                                      // ❌ hand-rolled, bypasses the type provider
```

With `fastify-type-provider-zod`, register the validator and serializer
compilers once in the app bootstrap (`setValidatorCompiler` /
`setSerializerCompiler`); a module opts in with
`app.withTypeProvider<ZodTypeProvider>()`. Declaring the schema is what gives
`req.body` its type *and* what produces a 400 before the handler runs.

**Parse, don't validate**: once the contract has parsed the input, nothing
downstream re-checks it. A service taking `url: string` trusts it. Re-parsing in a
service is noise that hides where the real boundary is.

⚠️ **Without `schema.response`, the response contract is a compile-time type
only.** Fastify serializes whatever the handler returns, so nothing strips an
extra field at runtime. Either declare response schemas, or treat the row→DTO
mapper on the way out of the repository as load-bearing. Do not "rely on the
contract type" to keep a `password_hash` or an internal column out of a response.

## Errors

Throw a typed error from the service; never build an error response in a handler.

```ts
// service.ts
if (!row) throw new NotFoundError(`project ${id}`);
```

One `app.setErrorHandler` maps the error type's status code centrally. A handler
that does `reply.status(404).send({ error: … })` duplicates that mapping and
drifts from it.

## Plugins and encapsulation

Each module is a Fastify plugin. Prefer registering modules explicitly from one
module index over directory autoloading: the same code path then runs under the
dev runner, the bundler and the test runner, and the module list is greppable.

`app.decorate('container', container)` is the DI seam. Fastify's own
encapsulation (a `register` creates a child scope) is the dependency-injection
mechanism; do not add a second DI framework beside it.

## Long work leaves the request

An LLM run, a clone, an index build, a report export — these go through a job
queue enqueued from the **service**, not inline in the handler. A route that
awaits a multi-minute pipeline has put the application ring inside the transport
ring, and the HTTP timeout becomes a business constraint.
