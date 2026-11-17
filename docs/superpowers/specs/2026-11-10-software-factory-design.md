# Software factory for gin-rummy-score-pad — design

Date: 2026-11-10, revised 2026-11-14
Status: awaiting approval

## Intent

Dennis scopes features with wayfinder into GitHub issues, then drives each
issue by hand through brainstorm → spec → plan → test-first implementation →
review → merge. The code quality is high, but answering questions and approving
stages for every issue causes "coding brain fry".

The factory takes over everything between a well-specified issue and a checked
pull request. Dennis keeps the two ends: scoping (wayfinder) and the final
review and merge. Quality must not drop.

The first large job it should later handle is "create the Android app", split
by wayfinder into issues. iOS follows after that.

## Goals

- A labelled issue becomes a pull request with no interaction in between.
- Dennis reviews finished, already-checked pull requests in batches.
- Redirecting a pull request takes one comment and one label, not a session.
- Checks run outside the agent's reach, so a green result means something.
- Runs on Dennis's machine, on his existing Claude subscription, and only
  while he has started it.

## Non-goals

- Merging. The factory never merges; a push to `master` deploys to GitHub
  Pages, so merge is release and stays with Dennis.
- Replacing wayfinder or the issue split.
- The Android app itself. That is the next project, run *through* the factory.
  Its extra checks (Capacitor build, emulator launch) are added then.
- Running in the cloud, multi-agent role play, dashboards, metrics.
- A hand-test checklist per issue (loope has one; add later if wanted).

## Anti-goals

- A factory that needs babysitting: questions mid-run, or many tiny reviews.
- Green pull requests that got green by weakening tests or CI.
- Acting on text written by strangers. The repo is public.
- A failed issue that retries on its own and burns usage unattended.

## Constraints

- Repo is public (`dennis-brutski/gin-rummy-score-pad`); anyone can open
  issues and comment.
- Dennis's global rules: no attribution trailers or co-author lines in commits
  or pull request descriptions, ever.
- No new dependencies. Node 22, `gh`, git and the Claude Code CLI are present.
- There is currently **no** workflow that runs tests on pull requests;
  `pages.yml` only builds and deploys on push to `master`.

## Where things live (decided by Dennis: own folder)

**`~/git/gin-rummy-scorepad-factory/`** — its own git repo:

- the factory script and its unit tests
- stage prompts
- `worktrees/issue-<n>/` — one per running or parked issue (git-ignored)
- `logs/issue-<n>/` — session output per run (git-ignored)

**App repo (`gin-rummy-score-pad`)** — only what belongs to the app:

- `AGENTS.md` and a `CLAUDE.md` that contains only `@AGENTS.md`
- `.github/workflows/ci.yml`

Agents work inside a worktree and cannot leave it, so they cannot reach the
factory's own code.

## How it works

### Labels (decided with Dennis: pickup by label)

Trigger labels, set by Dennis:

| Label | Meaning |
|---|---|
| `agent:explore` | Investigate, write up cause and proposed change as a comment |
| `agent:implement` | Build it, open a pull request |
| `agent:review` | On a pull request: rework it per Dennis's comments |
| `agent:merge` | On a pull request: merge `master` into its branch, resolve conflicts |

State labels, set by the factory:

| Label | Meaning |
|---|---|
| `agent:in-progress` | Claimed, running |
| `agent:needs-human` | Parked; a comment says why |
| `agent:done` | Pull request opened, or explore write-up posted |

An item's state **is** its labels; there is no other status store. An item is
eligible when it has a trigger label and no state label. Removing
`agent:needs-human` re-queues it.

### Pickup and trust (decided with Dennis: only issues he created or approved)

The factory runs only when Dennis starts it (decided by Dennis): one command
in the factory folder, running in the foreground. Nothing is installed as a
service or timer, and nothing starts at login. While it runs, it asks GitHub
every 5 minutes for eligible items, so issues labelled in the meantime are
picked up too. Labels applied while it is off simply wait.

An item is picked up only if **all** hold:

1. The trigger label was applied by `dennis-brutski` (read from the item's
   label events). Applying the label is the approval. GitHub already limits
   labelling to collaborators; this check is the second lock.
2. If the issue was written by someone else, its body has not been edited
   since the label was applied. Otherwise → `agent:needs-human`.
3. For `agent:review` and `agent:merge`: the pull request's branch is a
   `factory/issue-<n>` branch in this repo. Pull requests from forks are never
   picked up.

The agent is given the issue title and body, plus comments written by
`dennis-brutski` only. Other people's comments are never passed to it.

### One run

1. Script claims the item: adds `agent:in-progress`.
2. Script creates (or reuses) the worktree on branch `factory/issue-<n>` from
   current `master`, and runs `npm ci` there.
3. Script runs Claude Code headless in the worktree with the stage prompt.
   Every session must end with a fixed JSON status, enforced by the CLI's
   schema option; the script never parses prose to learn the outcome.
4. Script runs the brakes (below) on the result.
5. Script pushes the branch and opens the pull request (or posts the explore
   comment), swaps `agent:in-progress` for `agent:done`. The worktree is
   deleted when the pull request is merged or closed.

**All GitHub writes are done by the script, none by the agent.** The agent
cannot push, cannot call `gh`, and cannot read or write outside its worktree.
It never runs with permission checks switched off.

### Stages

- **Explore:** read-only. Output is a write-up: cause, proposed change, files
  touched, and a verdict on two rules — is it easy to undo, and is its reach
  small. Both yes → script replaces the label with `agent:implement`.
  Otherwise → `agent:needs-human` with the write-up.
- **Implement:**
  1. *Confidence gate.* The session reads the issue and the code and scores
     0–100 how clearly the issue can be built as written. Below the threshold
     (start: 70) it writes nothing; the script posts its questions and parks
     the issue as `agent:needs-human`. Dennis answers in a comment and removes
     the label.
  2. Plan, then test-first implementation, following `AGENTS.md`.
  3. A second, fresh session reviews the diff against `AGENTS.md`; the first
     fixes what it finds, once. This happens **before** the pull request opens.
- **Review (rework):** same branch and worktree; input is Dennis's pull
  request comments since the last factory push. Pushes new commits to the same
  pull request.
- **Merge:** script merges `master` into the branch. A clean merge needs no
  agent. A conflicted one gets one session; success is verified from git's own
  state, not the session's word. Then the brakes and the push.

### Brakes

- **Tight permissions.** Agent may edit files in its worktree, run the npm
  scripts, and commit locally. Nothing else.
- **Protected paths.** After the run the script inspects the diff. Adding test
  files is fine. Modifying or deleting existing tests, or touching `.github/`,
  `playwright.config.js`, `package.json` scripts, `AGENTS.md` or `CLAUDE.md`,
  opens the pull request as a **draft** with a warning at the top and
  `agent:needs-human`.
- **Local checks before push.** `npm test` and `npm run e2e` must pass, run by
  the script, not reported by the agent.
- **Outside check.** `ci.yml` runs `npm test` and `npm run e2e` on every pull
  request, on GitHub's machines.
- **Failures park, never retry.** Any failure — checks red, turn or time cap,
  usage limit, crash in a stage, session reports incomplete — parks the item
  as `agent:needs-human` with the full error as a comment. Nothing touches it
  again until Dennis removes the label. The worktree and commits are kept and
  reused by the next attempt.
- **Crash recovery.** On start, an item marked `agent:in-progress` with no
  live run behind it is re-queued, reusing its worktree. A lock stops a second
  copy of the factory from starting.
- **Limits.** Two runs at a time, a cap on turns and wall-clock time per run.
  All are settings at the top of the script.
- **Stop button.** Ctrl-C stops pickup and lets running agents finish; a
  second Ctrl-C kills them at once. Killed runs keep their worktree and are
  re-queued on the next start.

### Repo as memory

- `AGENTS.md`: what good looks like here — structure, test-first, where tests
  go, i18n rule (all 9 languages), no new dependencies, commit message style.
  The builder drafts it from the existing code, spec and plan; Dennis edits it.
- `CLAUDE.md` containing only `@AGENTS.md`, so Claude Code loads it.

## Commits (decided by Dennis, 2026-11-10)

The factory's agents commit on their `factory/issue-<n>` branches, with no
trailers. The global rule that Claude never commits on Dennis's behalf keeps
applying to `master` and to interactive sessions.

## Proving it

1. Stop-button drill: start a run, press Ctrl-C twice, confirm no agent
   process is left, then start again and confirm the run resumes.
2. Trust drill (unit tests): an item whose label was applied by someone else
   is skipped; an edited foreign issue is parked; a fork pull request is
   ignored; other people's comments are left out of the prompt.
3. Park drill: a deliberately vague issue ends as `agent:needs-human` with
   questions, and is not retried on the next poll or the next start.
4. One small real issue end to end, labelled `agent:implement`, through to a
   merged pull request.

Only after that: wayfinder on "Android app", and the Android checks.

## Build or adopt (decided with Dennis, 2026-11-11)

Existing tools were checked: Gas City, loope, baton, imploid. Decision: build
our own. Gas City replaces the GitHub-issue flow with its own tracker and is
heavy. The small pollers match the pickup loop but lack the trust rules and
brakes above; loope runs every agent with permission checks off and feeds
anyone's comments into the prompt. Five ideas are taken from loope: the
confidence gate, park-never-retry, structured session results, crash recovery
with worktree reuse, and the merge label.

## Calls made by Claude (not decided by Dennis — check these)

- Polling with `gh` every 5 minutes while running, not a self-hosted GitHub
  runner (GitHub advises against those on public repos).
- It keeps polling until stopped, rather than handling the current queue once
  and exiting.
- Ctrl-C drains, a second Ctrl-C kills; killed runs resume on the next start
  instead of being parked.
- One Node script with no dependencies; pure logic (eligibility, trust check,
  protected-path check) covered by `node --test` unit tests.
- Trigger labels stay on the item; state labels block pickup.
- `agent:needs-human` as the single parked state (questions, failures and
  stops all land there, told apart by the comment).
- Draft pull request rather than none when protected paths are touched.
- One automated review round, before the pull request opens.
- Pull request body: `Closes #<n>`, a summary, the checks that ran. No
  attribution lines.
- Starting values: 2 parallel runs, confidence threshold 70; turn and time
  caps chosen by the builder.

## Left to the builder

- Exact Claude Code headless flags and permission/sandbox settings, checked
  against current documentation.
- Prompt wording per stage and the JSON status schema.
- Turn and time cap values.
- How a live run is detected (lock or pid file) for crash recovery.
- How worktree cleanup detects merged or closed pull requests.

## Sources

Best practices drawn from the "Software Factory" NotebookLM notebook, chiefly:
Software Factory Workflow, Coding Brain Fry, Strategic Programming,
Engineering with AI, Code Quality Factory, The Dark Factory (Augment Code),
Agentless (arXiv 2407.01489), The Verification Horizon (arXiv 2606.26300).
Implementation ideas from loope (github.com/ngthluu/loope, MIT).
