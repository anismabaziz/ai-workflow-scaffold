# 01: Recipe search returns dietary tag filters

**What to build:** The recipe search page can narrow results by dietary tags (vegan, gluten-free, dairy-free, nut-free). Users pick one or more tags and see only recipes that carry all of them, with results still sorted by relevance.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `GET /recipes/search?tags=vegan,gluten-free` returns only recipes carrying every requested tag.
- [ ] A recipe with no tags appears when no tag filter is applied, and disappears as soon as one is.
- [ ] Unknown tags return a clear 400 with the list of valid tags, not an empty result set.
- [ ] Lint and tests pass.