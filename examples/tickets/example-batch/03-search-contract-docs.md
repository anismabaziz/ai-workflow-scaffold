# 03: Document the search API contract

**What to build:** The search endpoint's contract is written down in one place: the `tags` query parameter format, the valid tag vocabulary, the sort order, and the pagination shape. Anyone wiring a screen to the search can build against the docs instead of reading code.

**Blocked by:** 01 (Recipe search returns dietary tag filters).

**Status:** ready-for-agent

- [ ] The docs describe the `tags` parameter, valid values, sort order, and pagination.
- [ ] The example responses in the docs match the current API output.
- [ ] Links and commands in the docs were verified against the running app.