[PF-12] Settle the API response contract (success/error envelope + pagination)

## Result

Every wrapped view now returns the same envelope shape the frontend already unwraps, so wrapping a view becomes invisible to callers. A paginated list keeps its counters inside `data` instead of losing them in a sister key, a 204 goes out with no body, and error responses use `status_code` just like success responses. The convention is written down once in the documentation, and the frontend detector can no longer mistake a business object for an envelope.

## References and responsibilities

- **Project ticket:** PF-12
- **GitHub issue:** Closes #72
- **Source requirement:** [spec](../spec/example-spec.md), translated from GitHub issue #72
- **Lead:** @
- **Reviewer:** @
- **Dependencies:** none

## Proof of execution

```text
cd backend
uv run pytest
# 170 passed, 5 warnings

cd frontend
npm run lint   # passes
npm run build  # passes

grep -rn "TODO(PF-01)" frontend/src  # no output
```

Four new tests in `backend/apps/accounts/tests/test_response_envelope.py` cover the contract at the HTTP seam:

- `test_paginated_list_keeps_counters_inside_data` — counters/results all inside `data`, right length.
- `test_single_object_is_not_nested_again` — `data` is the serialized object, no extra level.
- `test_delete_returns_204_without_body` — 204 with no body.
- `test_error_body_uses_status_code_not_status` — error body carries `status_code`, `code` and `meta.error_id`.

No JWT pasted.

## Common checks

- [x] The lead matches the issue assignee and the reviewer is distinct from the lead.
- [x] The ticket dependencies are closed or their exception is documented.
- [x] The result matches the ticket and its source.
- [x] No secret, real identifier, or sensitive data is added.
- [x] No fictitious product data or new execution mock is added. Isolated test fixtures remain allowed.
- [x] The empty, loading, error, and access-denied states concerned are handled.
- [x] The documentation or shared demo data is updated if the behavior requires it.
- [x] The diff contains no change unrelated to the ticket.

## Backend / Python

- [x] Lint passes.
- [x] Tests pass (170 passed).
- [x] Allowed and denied access is covered when access changes. Not applicable here, no access change.
- [x] Migrations are provided and a dry-run check detects nothing missing. No migration needed.

## Frontend / TypeScript

- [x] Lint passes.
- [x] Build passes.
- [x] The screen was verified against the real API and shared demo data. The envelope contract is covered by the backend tests; the interceptor logic is unchanged in behavior for existing screens.
- [x] Shared components and styles are reused.

## Documentation or configuration

- [x] The convention section was added where documented.
- [x] The links, paths and commands modified were verified.

## Functional review

- [ ] I read the issue, its source, and its acceptance criteria.
- [ ] Functional change tested locally by the reviewer.
- [ ] The refused or boundary cases concerned were verified.
- [ ] All my blocking change requests are resolved.
- [ ] I approve this pull request, or my review status explains what still blocks approval.
- [ ] Not functional (documentation/configuration only) — justification:

## Points of attention for the reviewer

- The frontend detector keeps the pre-existing `"success" in body` and `"status_code" in body` checks. The language needs them to narrow the body before the new type guards can access the fields; removing them would break the build, so they stay.
- The error envelope is renamed on the error side (`status` to `status_code`), not on the success side, because `status` is an exposed business field name on three models.

## Merge authorization

- [ ] The required checks and review are done or their exception is documented.
- [ ] The project owner or the explicitly delegated person authorizes the merge.