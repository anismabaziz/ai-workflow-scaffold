[WHK-04] Dietary tag filtering for recipe search

## Result

Recipe search can now be narrowed by dietary tags. Vegan and gluten-free users get results they can actually eat: the search page offers four toggleable chips, each tag filters on the server, and active tags live in the URL so the selection survives a refresh. Invalid tags come back as a 400 with the valid list instead of a silent empty page.

## References and responsibilities

- **Project ticket:** WHK-04
- **GitHub issue:** Closes #41
- **Source requirement:** [spec](../spec/example-spec.md), fictional example project
- **Lead:** @
- **Reviewer:** @
- **Dependencies:** none

## Proof of execution

```text
cd backend
uv run pytest
# 138 passed

cd frontend
npm run lint   # passes
npm run build  # passes
```

Request/response, vegan + gluten-free:

```http
GET /recipes/search?tags=vegan,gluten-free
```

```json
{
  "results": [
    { "id": 7, "title": "Lentil and oat flatbread", "dietary_tags": ["vegan", "gluten-free"] }
  ]
}
```

Invalid tag:

```http
GET /recipes/search?tags=paleo
```

```json
{ "detail": "Unknown tag 'paleo'. Valid tags: vegan, gluten-free, dairy-free, nut-free." }
```

Screenshot of the chips filtering real results is attached in the PR.

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
- [x] Tests pass (138 passed).
- [x] Allowed and denied access is covered when access changes. Not applicable here, no access change.
- [x] Migrations are provided and a dry-run check detects nothing missing.

## Frontend / TypeScript

- [x] Lint passes.
- [x] Build passes.
- [x] The screen was verified against the real API and shared demo data.
- [x] Shared components and styles are reused.

## Documentation or configuration

- [x] The search contract section was added.
- [x] The links, paths and commands modified were verified.

## Functional review

- [ ] I read the issue, its source, and its acceptance criteria.
- [ ] Functional change tested locally by the reviewer.
- [ ] The refused or boundary cases concerned were verified.
- [ ] All my blocking change requests are resolved.
- [ ] I approve this pull request, or my review status explains what still blocks approval.
- [ ] Not functional (documentation/configuration only) (justification):

## Points of attention for the reviewer

- Tag matching is AND, per decision 1 in the spec. A recipe must carry every selected tag, not any one of them.
- The migration adds `dietary_tags` with no backfill; legacy recipes start untagged and only show up when no filter is applied. That is intentional.

## Merge authorization

- [ ] The required checks and review are done or their exception is documented.
- [ ] The project owner or the explicitly delegated person authorizes the merge.