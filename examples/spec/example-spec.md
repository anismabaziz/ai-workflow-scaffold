# [PF-12] Settle and fix the API response contract (success/error envelope + pagination)

Source: GitHub issue #72 (translated from French), <repo>/<project>.

## Context

A teammate is wiring up the frontend and backend and asked whether they should wait until the response handler is "made global" or work directly. **Answer: work directly, don't wait — but reuse what exists instead of rebuilding it.** This ticket exists so the information is written once for the whole team, not passed in a private message.

The problem isn't a missing mechanism: two already exist on `main`, and nobody documented them. The decision had been deferred to a code comment (`TODO(PF-01)` in `frontend/src/api/client.ts:65-67`, commit `9b11334`) instead of a ticket, and the issue was closed without the convention being settled. The backend README says nothing about it. That's the gap this closes.

## What already exists — reuse, don't rebuild

**1. The error handler is already global.** It is wired to DRF via `EXCEPTION_HANDLER` in `config/settings/base.py`. It therefore **already** applies to every view in the project, with nothing to add. Every exception passes through it and comes out in the format `{success, status, code, message, errors, meta{error_id, timestamp}}`.

To add a business error: subclass the base exception and declare the code in the error-code enum. Do **not** write a second handler: DRF accepts only one, the last one wired wins, and the first disappears silently.

**2. The success envelope also exists, but is adopted in only one place.** A standard success response and a base viewset (which overrides `finalize_response`) produce `{success, status_code, message, data}`. Only one app uses them; the rest return raw framework responses.

**3. The frontend already absorbs both shapes.** The API client detects the envelope and unwraps it once, in the response interceptor and the token refresh path. Callers therefore always get the payload directly, wrapped or not. That's what makes adoption **incremental and non-breaking**: you can wrap views one at a time without touching the frontend.

## The defects to fix before wrapping the rest

**Defect 1 — pagination metadata is silently lost.** Pagination is global, so **every** list is paginated. The viewset pulls `count`/`next`/`previous` out of the response body and lifts them into a sister `pagination` key beside `data` — then the client unwraps `data`, which **throws that sister key away**. No error, no log: just a paginator without its counters. Verified: nothing reads the sister key in the frontend today, so the bug is still latent.

**Defect 2 — the two envelopes aren't symmetric.** Errors emit `status`, successes emit `status_code`. So the frontend must know two shapes for one convention. Fixing it now costs a few lines; fixing it later costs a pass over every caller.

**Defect 3 — a 204 goes out with a body.** The viewset attaches an envelope to an empty response while keeping status 204, but a 204 must not carry a body (RFC 9110 §15.3.5). Intermediaries are allowed to strip it, which makes the behavior deployment-dependent.

## Goal

Settle the convention, make it symmetric, and make **wrapping a view invisible to the frontend** — so anyone can flip a view to the standard viewset without coordination and without breaking a screen.

## Expected work

### Backend

- [ ] Remove the pagination special case. Don't restructure the response body: put it as-is in `data`. After the frontend unwraps, the caller gets **exactly** today's raw shape — that's the property that makes adoption free.
- [ ] Don't wrap an empty response. If the body is `None` or `''`, return it as-is (defect 3).
- [ ] Rename the `"status"` key to `"status_code"` at all occurrences, to align errors with successes.
- [ ] Don't change anything else in the handler. It works and it's global.

### Frontend

- [ ] Harden the envelope detector with type guards so no business object can be mistaken for an envelope.
- [ ] Rewrite the stale comment and remove the `TODO(PF-01)`, pointing to the documented convention.
- [ ] Don't touch the 401 refresh path. It deliberately uses the raw client to avoid an interception loop.

### Documentation

- [ ] Add a section documenting the exact success shape, the exact error shape, the fact that the error handler is global and a second one must not be written, how to add an error code, and the adoption rule (decision 2).

### Tests

- [ ] Wrapped paginated list: counters and results all present in `data`, and `data["results"]` has the right length.
- [ ] Wrapped single object: `data` is the serialized object, no extra level.
- [ ] `DELETE`: the 204 response carries no body.
- [ ] Error: the body contains `status_code` and not `status`, plus `code` and `meta.error_id`. One test is enough, e.g. a 404 on a nonexistent id.

## Decisions made, to be confirmed by objection

**Decision 1 — it's the error side that gets renamed, not the success side.** The reverse looks more natural (the handler is global, the success response serves one app), but `status` is already an exposed business field name on three models. Keeping `status_code`, which is no business field's name, leaves the frontend's detector discriminative. Nothing consumes error bodies yet, so the rename is free today and won't be for long.

**Decision 2 — no mass switch in this PR.** Fix the mechanism and document the rule; don't convert every view at once. Once defect 1 is fixed the shape the frontend receives is identical in both cases, so the mixed state is invisible to anyone at runtime. **Adoption rule: any view modified for another reason switches to the standard viewset along the way.**

## Prohibitions

- don't write a second exception handler: the framework only takes one, and the second would silently swallow the first;
- don't wrap a paginated list before defect 1 is fixed in the same PR;
- don't rename `status_code` to `status` on the success side — see decision 1;
- don't change the HTTP status code of a `DELETE` (204 stays 204).

## Out of scope

- **The OpenAPI schema.** It documents the serializer output, so for a wrapped view it publishes the content of `data` without the envelope level. The gap is uniform and can be fixed later in one place. Open a separate ticket, not here.
- **Switching the other views** — decision 2.
- **Frontend tests.** No test runner exists in the frontend setup. Adding tooling is a separate ticket; the frontend proof for this PR is therefore a network trace.

## Acceptance criteria

- [ ] The tests above pass; lint and the full test suite pass.
- [ ] The frontend lint and build pass.
- [ ] The stale `TODO(PF-01)` reference is gone.
- [ ] The documented convention section exists.
- [ ] Proof in the PR: the full JSON response of a wrapped paginated list (showing the counters in `data`), the JSON response of an error (showing `status_code`), and a capture showing an existing screen still works. Never paste a full JWT.

## Organization

- **Suggested branch:** `fix/PF-12-api-response-contract`
- **Dependencies:** none, branches from `main`.
- **Blocks:** the integration. Do before wrapping a list.
- **Expected size:** small. Roughly ten lines of code, one documentation section, four tests. If the PR grows, the mass switch ruled out in decision 2 has slipped in.

## References

- `config/exceptions/handler.py`, base exception, error codes
- success response and standard viewset modules
- `config/settings/base.py` (handler wiring)
- API client envelope detection and refresh path
- the `TODO(PF-01)` left by the earlier commit and the closed issue — this ticket settles the convention, it doesn't reopen it.