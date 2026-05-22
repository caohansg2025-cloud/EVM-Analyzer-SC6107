# Deployment Guide

> Covers: (1) flipping the frontend from mocks to a live backend, and (2) deploying the frontend to Vercel.
> **Status**: documented in Phase 4. Actual deployment must be performed by the user (requires Vercel + GitHub accounts).

---

## 1. Switching from Mocks to Live Backend (Commit 16)

Phase 1 wired the entire frontend through a single switch: `NEXT_PUBLIC_USE_MOCKS`. Phases 1–3 all used mocks; this step flips to a real backend once your teammates (Positions 1/2/3) have deployed theirs.

### Prerequisites

- Backend Integration Engineer (Position 4) has a server running that implements `docs/backend-api-spec.md` — three endpoints:
  - `GET /api/trace/:txHash`
  - `GET /api/gas-state/:txHash`
  - `GET /api/security/:address`
- The backend is reachable from your machine (localhost) or from Vercel (public HTTPS URL).

### Step-by-step

**Local development against a locally-running backend:**

```bash
# 1. Edit frontend/.env.local
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

```powershell
# 2. Restart the dev server (env changes don't hot-reload)
# Ctrl+C in the dev server window, then:
npm run dev
```

**Local development against a deployed backend:**

```bash
NEXT_PUBLIC_USE_MOCKS=false
NEXT_PUBLIC_API_BASE_URL=https://api.your-backend.example.com
```

### What to expect when the flag is off

- The first time you load a tab, a real HTTP request goes to the backend (no 300ms mock delay).
- DevTools → Network shows `GET /api/trace/0x5c504e...` (etc.) with a real response.
- If the backend is down/unreachable → ErrorState card shows the failed status code.
- If the backend's response shape doesn't match `mock_data/*.json` → TypeScript catches it via the `as TraceResponse` casts in `src/lib/api.ts`. Push back on the backend; do NOT silently adapt the frontend types (iron rule).

### Rolling back

If integration runs into trouble during a demo:

```bash
# Set back to mocks — instant fallback to known-good data
NEXT_PUBLIC_USE_MOCKS=true
```

Restart dev server. The UI returns to deterministic mock data with no code changes.

### CORS

If the backend is on a different origin (port or host), the backend team needs to allow the frontend's origin in their CORS config:

```
Access-Control-Allow-Origin: http://localhost:3000
# or
Access-Control-Allow-Origin: https://<your-vercel-url>.vercel.app
```

Without this, the browser blocks the request and you'll see a CORS error in DevTools. The backend spec (`docs/backend-api-spec.md` §7) covers this.

---

## 2. Vercel Deployment (Commit 17)

Vercel is the official deployment target for Next.js apps. The free Hobby tier is more than enough for this project.

### Prerequisites

- A GitHub account with this repository pushed
- A Vercel account (sign up at https://vercel.com — free, you can use GitHub SSO)
- The frontend builds cleanly locally (`npm run build` exits 0)

### Option A — Connect via Vercel dashboard (recommended for first deploy)

1. Log into https://vercel.com/new
2. Click "Import Git Repository"
3. Choose your GitHub org and select `EVM-Analyzer-SC6107-main`
4. **Configure project settings:**
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend` ⚠️ critical — without this Vercel won't find the app
   - **Build Command**: leave default (`next build`)
   - **Output Directory**: leave default (`.next`)
   - **Install Command**: leave default (`npm install`)
5. **Environment Variables** — add these:
   ```
   NEXT_PUBLIC_USE_MOCKS = true
   NEXT_PUBLIC_API_BASE_URL = (leave empty for now, or your deployed backend URL)
   ```
6. Click **Deploy** — first deploy takes ~2 minutes.

After deploy, you'll get a URL like `https://evm-analyzer-sc6107-main.vercel.app`.

### Option B — Deploy via CLI (good for re-deploys)

```powershell
# One-time setup
npm install -g vercel
vercel login

# From the frontend directory
cd D:\NTU\SC6107\EVM-Analyzer-SC6107-main\frontend
vercel --prod
```

The CLI asks a few questions:
- "Set up and deploy?" → **Y**
- "Which scope?" → pick your Vercel team / personal account
- "Link to existing project?" → **N** (first time) or **Y** (subsequent)
- "What's your project's name?" → `evm-analyzer-sc6107`
- "In which directory is your code located?" → `./`
- "Override settings?" → **N**

Subsequent deploys are just `vercel --prod` — Vercel remembers the config.

### After deploying

1. **Verify the live URL**:
   - Open the printed `https://<project>.vercel.app` URL in a fresh browser.
   - All three tabs should work against mocks (Trace shows sample data, etc.).
   - Open DevTools → Console — no red errors.

2. **Test wallet connect on the deployed URL**:
   - Vercel serves over HTTPS, so MetaMask works as expected.
   - Click "Connect Wallet", approve in MetaMask, see your truncated address.

3. **Update root README** with the live URL (Commit 18).

### Auto-deploy on push

Once linked via Option A, every push to `develop` or `main` automatically triggers a Vercel deploy. Pushes to feature branches create **preview deployments** with their own URLs — useful for reviewing PRs.

### Updating env vars later

If you later want to flip to a live backend:
1. Go to Vercel → your project → Settings → Environment Variables
2. Change `NEXT_PUBLIC_USE_MOCKS` to `false`
3. Set `NEXT_PUBLIC_API_BASE_URL` to your backend's public URL
4. Trigger a redeploy: Deployments → … → Redeploy

### Known issues / gotchas

| Symptom | Likely cause | Fix |
|---|---|---|
| 404 page on deploy | Root Directory not set to `frontend` | Re-configure in Vercel project settings |
| Build fails with "module not found" | `node_modules` was accidentally committed | Confirm `.gitignore` excludes it |
| Recharts/Prism errors only in prod build | `transpilePackages` removed | Confirm `next.config.ts` still has both packages listed |
| Build takes > 5 min | `node_modules` accidentally pushed | Same fix as above |
| MetaMask doesn't connect on the live URL | Browser caching old service worker | Hard refresh (Ctrl + Shift + R) |

---

## 3. Demo Flow After Deployment

This is the suggested path through the deployed app for the 5-minute presentation:

1. **Open the Vercel URL** in a fresh browser tab.
2. **Trace tab loads** with the Uniswap V2 swap sample.
3. Click the chevron on the root call → children collapse → click again → expand.
4. Click the truncated tx hash → green checkmark briefly appears (copied to clipboard).
5. Switch to **Gas & State** tab — bar chart and tables render.
6. Hover any bar in the chart → tooltip shows percentage.
7. Switch to **Security** tab — see severity-counted summary.
8. Click the High-severity Reentrancy card → expands to show syntax-highlighted Solidity.
9. Click **Connect Wallet** in the header → MetaMask popup → approve → button changes to "0x... · Sepolia".
10. Optionally type a different tx hash or contract address in the search bar and click "Load".

This takes ~90 seconds and demonstrates all 18 commits' worth of features.
