# 01 — Backend: symmetric response envelope with pagination kept in data

**What to build:** Every wrapped view returns the same envelope shape the frontend already unwraps, so wrapping a view becomes invisible to callers. A paginated list keeps its counters (`count`, `next`, `previous`) alongside the results inside the `data` payload; an empty response (204) carries no body; error responses use the same key names as success responses.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A wrapped paginated list returns `count`, `next`, `previous` and `results` inside `data`, and `data["results"]` has the right length.
- [ ] A wrapped single object returns `data` as the serialized object, with no extra nesting.
- [ ] A `DELETE` returns 204 with no body.
- [ ] An error body contains `status_code` (not `status`), plus `code` and `meta.error_id`.
- [ ] Lint and tests pass.