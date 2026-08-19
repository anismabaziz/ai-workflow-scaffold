# [WHK-04] Dietary tag filtering for recipe search

Source: GitHub issue #41, fictional example project.

## Context

Recipe search on the community app only matches titles and ingredient text, so a vegan user asking for "chicken" or a gluten-free user searching "bread" get results they cannot eat. The product team agreed on a closed vocabulary of four dietary tags — vegan, gluten-free, dairy-free, nut-free — applied per recipe. This ticket wires those tags through search.

The search endpoint already exists and is fast; the problem is that no field carries dietary intent, and the frontend search page has no way to express it. Tags are the minimal addition that covers the confirmed use cases without building a full dietary system nobody asked for yet.

## What already exists — reuse, don't rebuild

**1. Search is one endpoint.** `GET /recipes/search` already does full-text matching on title and ingredient text, with relevance sorting and pagination. Filtering adds a parameter to this endpoint; it does not create a second search path.

**2. Recipes already have tag-like data.** The model has a free-text `cuisine` field, but it is display-only and never indexed for filtering. Reusing it for dietary matching would mix two meanings (region vs. diet) and mislead the UI. A dedicated `dietary_tags` field on the recipe is the honest home for this.

**3. The frontend already has a query-driven search page.** The page reads its query from the URL, so filter chips can live entirely in the query string without touching navigation or state plumbing.

## What to build

### Backend

- [ ] Add `dietary_tags` (array of enum values) to the recipe model, with a migration and the four allowed values.
- [ ] `GET /recipes/search` accepts `tags=vegan,gluten-free`, `AND`s the requested tags, and keeps existing relevance sorting.
- [ ] Unknown or malformed tags return a 400 listing the valid values, not an empty result set.
- [ ] Filtering is covered by tests: no filter, single tag, multiple tags (all must match), and an invalid tag.

### Frontend

- [ ] Four toggleable chips on the search page, mirrored in the URL query string.
- [ ] Toggling a chip re-runs the search against the API; active tags are visible in the results and survive a refresh.
- [ ] Empty, loading and error states render for a failed or empty search.

### Documentation

- [ ] The search contract documents the `tags` parameter, valid values, sort order, and pagination shape.

## Decisions made, to be confirmed by objection

**Decision 1 — tags AND, they don't OR.** "Vegan and nut-free" must return only recipes that are both. OR would hand vegans a page of nut-filled food, which is worse than no filter at all. The UI says "I only eat these" — the query must match that.

**Decision 2 — the field is `dietary_tags`, not a reuse of `cuisine`.** Two meanings in one field make the filter untrustworthy and the autocomplete noisy. A new enum field is a few lines and keeps the two concepts separate.

**Decision 3 — invalid tags are a 400, not a silent empty page.** A silent empty result hides typos and stale clients; a 400 with the valid vocabulary makes the contract debuggable.

## Prohibitions

- don't add a second search endpoint or a custom SQL path — extend the existing one;
- don't OR the tags — decision 1;
- don't invent a fifth tag beyond the confirmed four;
- don't add tags to the display-only `cuisine` field — decision 2.

## Out of scope

- **Filtering by multiple categories** (diet plus cuisine, diet plus prep time). One axis is enough for now; a composite filter system is a separate conversation.
- **User-declared dietary preferences on their profile.** Out of the confirmed scope.
- **Backfilling tags on existing recipes.** The demo data gets tags; legacy content is tagged in a later pass.

## Acceptance criteria

- [ ] The backend tests above pass; lint and the full suite pass.
- [ ] The frontend lint and build pass.
- [ ] The search contract section exists and its examples match the API.
- [ ] Proof in the PR: a filtered request/response pair (`tags=vegan,gluten-free`), a 400 for an invalid tag, and a capture of the chips filtering real results. No real user data pasted.

## Organization

- **Suggested branch:** `feat/whk-04-dietary-tag-filters`
- **Dependencies:** none, branches from `main`.
- **Blocks:** nothing.
- **Expected size:** small. One model field, one query change, four chips. If the PR grows beyond this, scope has slipped in.

## References

- `GET /recipes/search` implementation and its tests
- recipe model and its migration history
- search page component and its URL query handling