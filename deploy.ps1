param(
    [string]$Message = ""
)

# ── 1. Require a commit message ───────────────────────────────────────────────
if (-not $Message) {
    $Message = Read-Host "Commit message"
    if (-not $Message) {
        Write-Host "Aborted: commit message is required." -ForegroundColor Red
        exit 1
    }
}

# ── 2. Stage all changes ──────────────────────────────────────────────────────
Write-Host "`n[1/3] Staging changes..." -ForegroundColor Cyan
git add .
if (-not $?) { Write-Host "git add failed." -ForegroundColor Red; exit 1 }

# ── 3. Commit ─────────────────────────────────────────────────────────────────
Write-Host "[2/3] Committing: $Message" -ForegroundColor Cyan
git commit -m $Message
# Don't exit on no-op commit — may still need to push or deploy

# ── 4. Push ───────────────────────────────────────────────────────────────────
Write-Host "[3/3] Pushing to origin/main..." -ForegroundColor Cyan
git push origin main

# ── 5. Deploy via Netlify CLI (reliable, bypasses GitHub webhook) ─────────────
Write-Host "`n[deploy] Running netlify deploy --prod..." -ForegroundColor Cyan
netlify deploy --prod
if ($?) {
    Write-Host "`nDone. Site is live at https://compracasa-simulator.netlify.app" -ForegroundColor Green
} else {
    Write-Host "Netlify deploy failed — check logs above." -ForegroundColor Red
    exit 1
}
