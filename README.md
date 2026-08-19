# AI Workflow Scaffold

A language-agnostic scaffold for an agent-driven development workflow. Copy
these files into any new project — TypeScript, Python, or anything else — and
run the same ticket → spec → branch → PR → review → merge loop on every change.

This scaffold has no application code. It ships the workflow rules, the agent
skills, the pull-request template, and the secret scan, plus example artifacts
showing the exact file formats the workflow produces.

## The workflow at a glance

1. **Spec.** When an idea or issue needs shaping, `/to-spec` turns the
   conversation into a spec under `.plan/spec/`.
2. **Tickets.** `/to-tickets` breaks the spec into one ticket per file under
   `.plan/tickets/<date>-<summary>/`, each declaring what to build and what it
   is blocked by.
3. **Branch + implementation.** Create a branch named after the ticket
   (for example `feat/PF-12-api-contract`), implement, and keep the PR focused
   on one result.
4. **Pull request.** Write the PR body under
   `.plan/pull-requests/<branch-with-hyphens>.md` following
   `.github/pull_request_template.md`. Proof of execution is mandatory.
5. **Review.** Reviewer comments go under
   `.plan/review-replies/<branch>/` with one numbered file per review round.
   Reply in the reserved sections once the resolving ticket is implemented.
6. **Merge.** Merge only after checks, review approval and the agreed merge
   authorization.

Planning artifacts stay local: `.plan/` and `AGENTS.md` are not part of the
codebase and are not committed. Everything an agent may read or write inside
`.plan/` is defined in `AGENTS.md`.

## Skills

The skills the workflow relies on are vendored in `skills/`, so anyone who
clones this repo has them. Each folder is a skill: a `SKILL.md` plus optional
resources.

| Skill | Purpose |
|---|---|
| `to-spec` | Turn the current conversation into a spec |
| `to-tickets` | Break a plan or spec into tickets declaring their blocking edges |
| `unslop` | Remove AI writing patterns from human-facing text |
| `code-review` | Review changes since a fixed point along standards and spec |
| `codebase-design` | Design and deepen module interfaces |
| `domain-modeling` | Build and sharpen a project's domain model |
| `find-skills` | Discover and install additional agent skills |
| `grill-with-docs` | Stress-test a plan while recording ADRs and a glossary |
| `grilling` | Grill the user about a plan, decision, or idea |
| `implement` | Implement a piece of work from a spec or tickets |
| `improve-codebase-architecture` | Scan for deepening opportunities and grill through them |
| `tdd` | Test-driven development |

### Installing the skills for your agent

To make a skill available to your agent tool, copy or symlink its folder into
the skills directory your agent reads:

- **Claude Code (project-level):** `.claude/skills/<skill>`
- **Claude Code (user-level):** `~/.claude/skills/<skill>`
- **opencode (project-level):** `.opencode/skills/<skill>`

For example:

```bash
ln -s "$PWD/skills/unslop" .claude/skills/unslop
```

Your agent then loads `unslop` automatically, and AGENTS.md can reference it
by name.

## Bootstrapping a new project

1. Copy the scaffold into the new project directory (or use it as a GitHub
   template).
2. Keep `AGENTS.md` and create the local planning structure:

   ```bash
   mkdir -p .plan/tickets .plan/spec .plan/pull-requests .plan/review-replies
   ```

3. If you keep `AGENTS.md` and `.plan/` out of git, exclude them from version
   control (for example in `.git/info/exclude`) — do not commit planning
   artifacts as product code.
4. Add your CI workflow(s) under `.github/workflows/`. The `secret-scan`
   workflow is included and runs gitleaks on pushes and pull requests.
5. Write the team conventions (branch naming, who merges, definition of done)
   where your team reads them. `AGENTS.md` already pins the agent-side
   workflow.
6. Start with `/to-spec`, then `/to-tickets`, then pick a ticket and create
   your branch.

## Structure

```text
AGENTS.md                  Agent workflow rules (tickets, specs, PR bodies, review replies)
.github/
  pull_request_template.md Pull request body format
  workflows/
    secret-scan.yml        Gitleaks secret scan
skills/                    Vendored agent skills (12)
examples/                  Example artifacts showing the exact formats
  tickets/                 One ticket per file
  spec/                    Spec format
  pull-requests/           PR body format
  review-replies/          Review iteration format
.plan/                     Local-only planning artifacts (not committed)
  tickets/
  spec/
  pull-requests/
  review-replies/
```

## Contributing to this scaffold

If the workflow changes, update `AGENTS.md`, the PR template and the example
artifacts together, then refresh the vendored skills. Apply the `unslop` skill
to any human-facing text.