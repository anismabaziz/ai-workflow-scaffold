# 02: Search page filter chips wired to the API

**What to build:** On the recipe search page, users can toggle dietary tag chips (vegan, gluten-free, dairy-free, nut-free). Each toggle updates the URL query and re-runs the search against the real API, with the active tags reflected in the results.

**Blocked by:** 01 (Recipe search returns dietary tag filters).

**Status:** ready-for-agent

- [ ] Toggling a chip adds/removes the tag in the URL query and re-fetches results.
- [ ] Empty, loading and error states render when the search fails or returns nothing.
- [ ] The selected tags survive a page refresh via the URL.
- [ ] Lint and build pass.