# Deployment Guide

This is the reference for how code gets from a change to a live URL. Top half is
plain-language, for Erica. Bottom half is technical detail for Claude (or future
Erica) to use when troubleshooting a deployment problem.

---

## Part 1 — The simple version

### The two environments

| Environment | URL | Git branch | What it's for |
|---|---|---|---|
| **Production** (real app) | **https://mylemmy.app** | `main` | The real thing — what you and any future users actually use day to day. |
| **Staging** (test copy) | **https://lemmy-git-staging-aleafalls23.vercel.app** | `staging` | A safe copy to try changes on your phone before they go live. Same install-to-home-screen trick works here too. |

Old bookmark note: `pantry-app-beta-five.vercel.app` still works but just
forwards to `mylemmy.app` now — safe to keep using if it's saved somewhere, but
prefer `mylemmy.app` going forward.

### How a change actually goes live

1. A change gets made on its own branch, and a **pull request (PR)** is opened against `main`.
2. GitHub won't let a PR merge until Vercel has successfully built it — this shows up as a green check on the PR.
3. Once you click **Merge** on GitHub, Vercel automatically builds it again and this time publishes it straight to `mylemmy.app`. Nothing else to run, nothing to remember — merging *is* deploying.
4. Usually visible on `mylemmy.app` within a minute or two of merging.

### How to try something before it's real

If you want to test a bigger change on your phone first:
1. Get the change merged into the `staging` branch instead of `main` first.
2. Open `https://lemmy-git-staging-aleafalls23.vercel.app` on your phone (add it to your home screen the same way you did with the real app, if you want to test the installed-app experience specifically).
3. Once you're happy, that same change gets merged from `staging` into `main` to actually publish it.

### If something looks broken on mylemmy.app

1. Check https://vercel.com/aleafalls23/lemmy — the top deployment tells you if the last build succeeded or failed.
2. If the last deploy failed, the site is still running whatever the *previous successful* deploy was — it doesn't go down, it just doesn't update. Not an emergency.
3. Tell Claude "the last deploy failed" or "mylemmy.app looks broken" and paste/describe what you're seeing — the technical section below tells Claude exactly where to look.

### Rules of thumb
- You can no longer push code directly to `main` (even you, as the owner) — everything goes through a PR now. This is intentional, it's the safety net.
- You don't need to run any deploy command yourself for normal changes. If a session ever tells you it's running `vercel --prod` manually, that means something about the automatic path isn't working — worth asking why.

---

## Part 2 — Technical reference (for Claude)

### Accounts / project identity
- **GitHub repo**: `aleafalls/lemmy` (renamed from `pantry-app` — old clone URLs still redirect, but `git remote -v` should show `lemmy.git`).
- **Vercel project**: name `lemmy`, id `prj_7NZYGLfGdBjZS5Jln1JolL77Dn4a`, team `aleafalls23`. Confirmed via `vercel project ls` that there is exactly **one** project — no duplicate-project confusion, despite the earlier rename.
- **Vercel↔GitHub Git integration**: connected as of 2026-07-20. Before that date, *every* deployment was a manual `vercel` CLI push — merging a PR did nothing. If deploys ever stop happening automatically again, this connection is the first thing to check (see below).

### Domains
- `mylemmy.app` — the only real custom Domain object on the project (`vercel domains ls`), set as **Primary** in Vercel dashboard → Domains. This is production.
- `pantry-app-beta-five.vercel.app` — legacy alias from before the rename, now configured to 307-redirect to `mylemmy.app` (done in Vercel dashboard → Domains, not via CLI).
- Various other `pantry-*-aleafalls23.vercel.app` / `lemmy-*-aleafalls23.vercel.app` strings you may see in `vercel alias ls` or `vercel ls` are auto-generated per-deployment URLs, not real domains — safe to ignore, they're not user-facing.
- Every git branch gets a **stable** alias once pushed: `lemmy-git-<branch-name>-aleafalls23.vercel.app` (this is how the `staging` URL above works). Note: if a branch's HEAD commit is byte-identical to a commit Vercel already built (e.g. right after creating a new branch with no new commits), it may **not** trigger a fresh build/alias — an empty commit (`git commit --allow-empty`) forces one if you need to confirm a branch alias is live.

### Branch protection on `main`
Configured via `gh api -X PUT repos/aleafalls/lemmy/branches/main/protection`:
- `required_pull_request_reviews.required_approving_review_count`: `0` (PR required, but no second approver — there's only one developer; GitHub does support 0 here, don't assume it needs to be ≥1)
- `required_status_checks.contexts`: `["Vercel"]`
- `enforce_admins`: `true` (applies even to the repo owner)
- `allow_force_pushes` / `allow_deletions`: `false`

To inspect current settings: `gh api repos/aleafalls/lemmy/branches/main/protection`

### Checking whether Vercel's Git integration actually fired for a commit
**Important**: use the commit **status** API, not check-runs — check-runs only shows an unrelated bot called "Vercel Preview Comments" and will look empty even when the real integration is working fine.
```
gh api repos/aleafalls/lemmy/commits/<sha>/status
```
Look for an entry with `"context": "Vercel"` and `"state": "success"/"pending"/"failure"`. `target_url` links to the Vercel inspector page for that build.

Cross-check with the CLI: `vercel ls` (recent deployments across the project, shows Preview vs Production and Ready/Error), or `vercel inspect <deployment-url>` for one specific build's detail and logs.

### Local git auth (personal vs. work GitHub accounts)
This machine has two `gh`-authenticated GitHub accounts (`aleafalls` = personal/this project, `eerwin-amd` = work). To avoid the wrong one winning:
- `~/.ssh/config` has a dedicated host alias:
  ```
  Host github.com-aleafalls
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_aleafalls
    IdentitiesOnly yes
    AddKeysToAgent yes
    UseKeychain yes
  ```
  `IdentitiesOnly yes` is required — without it, ssh-agent offers the work key first and GitHub silently authenticates as `eerwin-amd` instead of erroring.
- This repo's `origin` remote must point at that alias: `git@github.com-aleafalls:aleafalls/lemmy.git`. Verify with `git remote -v`. If push fails with `Permission to aleafalls/lemmy.git denied to eerwin-amd`, this is why — check the remote URL and the SSH config block above.
- `gh` itself (PR creation, `gh api` calls, etc.) uses whichever account is **active**: `gh auth status` shows both; `aleafalls` should be active for this project.

### Known failure modes already hit once (context for next time)
- **Merging PRs didn't deploy anything** (2026-07-19/20): root cause was no Git integration at all, not a broken one. Manual `vercel --prod` was the only thing deploying. Fixed by `vercel git connect` + confirming with a real push.
- **`vercel --prod` deploys but mylemmy.app doesn't update**: a manual CLI production deploy only auto-aliases to generic `*-aleafalls23.vercel.app` URLs — it does **not** reliably re-point a custom domain like `mylemmy.app` on its own. If this is ever needed again (it shouldn't be, now that Git integration works), follow up with `vercel alias set <deployment-url> mylemmy.app` explicitly.
- **`git push` denied for the wrong account** — see SSH section above.
- **Two Vercel "projects" appearing in `vercel ls`** (`lemmy` and `pantry-app`) — this was deployment history showing old project-name-at-time-of-build, not two real projects. `vercel project ls` is the authoritative check; it showed one project throughout.

### Manual/emergency deploy (should not be needed anymore)
```
vercel --prod
```
Only use this if Git integration is confirmed broken (check the status API above first) and something urgent needs to ship. If you do, immediately verify with `vercel alias set <new-deployment-url> mylemmy.app` — do not assume the custom domain updated automatically.
