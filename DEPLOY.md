# Deploying to ministry.st-theresa.org

St. Theresa's main website is hosted on **eCatholic**, a managed CMS platform. eCatholic does not support uploading custom HTML files or creating subdomains with custom apps, so the Ministry Fair app needs to be hosted separately.

The recommended approach: **host the app for free on Netlify, then point the `ministry` subdomain there.** Your main parish website at `st-theresa.org` stays on eCatholic — nothing changes.

---

## Prerequisites

1. **Google Apps Script backend** already deployed (see [README.md](README.md) steps 1–2)
2. **CONFIG updated** in `index.html` — set `apiUrl` to your Google Apps Script deployment URL

---

## Recommended: Netlify + subdomain (free)

There are two ways to deploy to Netlify: **manual drag-and-drop** (simplest) or **Git-connected** (auto-deploys when you push changes). Choose whichever fits your workflow.

### Option A: Manual drag-and-drop deployment

Best if you don't use Git or just want the fastest one-time setup.

1. Go to [app.netlify.com](https://app.netlify.com) and create a free account
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop your project folder (the one containing `index.html`)
4. Your site is live immediately at a random URL like `random-name.netlify.app`
5. Test it — make sure ministries load and registration works

**To update after making changes:** drag and drop the folder again at **Deploys → Drag and drop**. Changes go live immediately.

### Option B: Git-connected deployment (auto-deploy on push)

Best if the repo is on GitHub and you want changes to deploy automatically.

1. Push this repository to GitHub:
   ```bash
   git remote add github https://github.com/YOUR_USERNAME/ministryfair.git
   git push -u github main
   ```
2. Go to [app.netlify.com](https://app.netlify.com) and create a free account
3. Click **"Add new site" → "Import an existing project"**
4. Select **GitHub** and authorize Netlify
5. Choose the `ministryfair` repository
6. Netlify will auto-detect the `netlify.toml` config — no build settings to change
7. Click **Deploy site**

The included `netlify.toml` configures:
- **Publish directory** — serves files from the repo root
- **Security headers** — X-Frame-Options, Content-Type-Options, Referrer-Policy
- **SPA redirect** — all paths serve `index.html` (so deep links like `?m=music` work)
- **Cache control** — ensures visitors always get the latest version

**To update after making changes:** just push to `main`. Netlify rebuilds and deploys automatically within seconds.

```bash
git add index.html
git commit -m "Update ministry list"
git push github main
```

### Step 2 — Add custom domain in Netlify

1. In Netlify, go to **Site settings → Domain management → Add custom domain**
2. Enter `ministry.st-theresa.org`
3. Netlify will confirm and show you what DNS record is needed

### Step 3 — Add the DNS record

You need to add one DNS record so that `ministry.st-theresa.org` points to Netlify. **This does not affect the main `st-theresa.org` site at all.**

**If eCatholic manages your DNS (most likely):**

Contact eCatholic support and ask them to add this record:

> "Please add a CNAME record for the subdomain `ministry` pointing to `YOUR-SITE-NAME.netlify.app`"
>
> — Type: **CNAME**
> — Name/Host: **ministry**
> — Value/Target: **YOUR-SITE-NAME.netlify.app** *(replace with your actual Netlify URL)*

Replace `YOUR-SITE-NAME` with the name Netlify assigned your site (visible in your Netlify dashboard).

**If you manage DNS yourself** (GoDaddy, Namecheap, Cloudflare, etc.):

Log in to your DNS provider and add:

| Type  | Name/Host  | Value/Target                   |
|-------|------------|--------------------------------|
| CNAME | `ministry` | `YOUR-SITE-NAME.netlify.app`   |

### Step 4 — Wait for DNS + HTTPS

- DNS propagation takes anywhere from a few minutes to 48 hours (usually under 30 minutes)
- Once DNS is active, Netlify automatically provisions a free HTTPS certificate
- Check status at **Site settings → Domain management → HTTPS**

### Step 5 — Verify

Visit `https://ministry.st-theresa.org` and confirm everything works.

---

## How to find out if eCatholic manages your DNS

If you're not sure who manages DNS for `st-theresa.org`:

1. Ask whoever set up the parish website — they may remember
2. Check your domain registrar (GoDaddy, Namecheap, etc.) — log in and look at nameserver settings
3. Ask eCatholic support — they can tell you if your nameservers point to them

If your nameservers are pointed to eCatholic, then eCatholic controls DNS and you'll need to contact them to add the subdomain record. If nameservers point somewhere else (like your registrar), you can add the record yourself.

---

## Alternative: GitHub Pages (also free)

If you'd prefer GitHub Pages over Netlify:

### 1. Push to GitHub

```bash
git remote add github https://github.com/YOUR_USERNAME/ministryfair.git
git push -u github main
```

### 2. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Source: **Deploy from a branch** → **main** → **/ (root)**
3. Click **Save**

### 3. Set custom domain

1. In **Settings → Pages**, enter `ministry.st-theresa.org` in the **Custom domain** field
2. Click **Save**

### 4. Add DNS record

Same process as above — contact eCatholic (or your DNS provider) to add:

| Type  | Name/Host  | Value                       |
|-------|------------|-----------------------------|
| CNAME | `ministry` | `YOUR_USERNAME.github.io`   |

---

## Post-deployment checklist

- [ ] Set `apiUrl` in CONFIG to your Google Apps Script deployment URL
- [ ] Test registration on a phone — name, email, phone
- [ ] Test Google Sign-In (if enabled) — button renders and auto-fills profile
- [ ] Test ministry signup — tap "I'm Interested" on a ministry
- [ ] Check Google Sheet — verify signup appeared in "App Signups" tab
- [ ] Test deep links — `https://ministry.st-theresa.org?m=music` (use a real ministry ID)
- [ ] Generate QR codes for `https://ministry.st-theresa.org` (main) and `https://ministry.st-theresa.org?m=MINISTRY_ID` (per-ministry)
- [ ] Verify HTTPS is working at `https://ministry.st-theresa.org`

---

## Applying updates and corrections

When you've made changes to the app (bug fixes, new features, configuration changes), follow the steps below based on your deployment method.

### Updating `index.html` (frontend)

**If deployed via drag-and-drop (Option A):**
1. In Netlify, go to **Deploys**
2. Drag and drop your updated project folder
3. Changes are live immediately

**If deployed via Git (Option B):**
1. Commit your changes:
   ```bash
   git add index.html
   git commit -m "Description of what changed"
   git push github main
   ```
2. Netlify auto-deploys within seconds

### Updating `google-apps-script.js` (backend)

The backend runs on Google Apps Script, separate from Netlify. To update:

1. Open your Google Sheet → **Extensions → Apps Script**
2. Replace the code with the updated `google-apps-script.js` contents
3. Click **Deploy → Manage deployments**
4. Click the pencil icon (edit) on your active deployment
5. Change **Version** to **New version**
6. Click **Deploy**

The new deployment URL stays the same — no need to update `index.html`.

### Recent changes (session history)

The following changes have been made and merged to `main` across recent sessions:

**PR #1 — Backend connection**
- Connected the app to the St. Theresa Google Apps Script backend
- Set `apiUrl` in CONFIG to the live deployment URL

**PR #2 — Google Sign-In**
- Added optional Google Sign-In to the registration page
- Auto-fills name and email from Google account

**PR #3 — Sign-In button fix**
- Fixed a bug where the Google Sign-In button did not render when the registration view was initially hidden

**Test suite (separate branch)**
- 129 automated tests covering registration, ministry rendering, deep linking, localStorage, edge cases, and XSS
- Bug report documenting 14 known issues (see `BUG_REPORT.md` on the `claude/comprehensive-testing-QluT4` branch)

To apply these changes to a live deployment, redeploy using whichever method you chose above (drag-and-drop or Git push).

---

## Troubleshooting

**Ministries don't load:**
- Check that `apiUrl` in the CONFIG section of `index.html` points to a valid Google Apps Script deployment URL
- Verify the Apps Script is deployed as a Web App with "Anyone" access

**Google Sign-In button doesn't appear:**
- The button only renders when the registration view is visible
- Ensure you're serving the page over HTTPS (required by Google Sign-In)

**Custom domain not working:**
- Verify the CNAME record is set correctly (use `dig ministry.st-theresa.org` or an online DNS checker)
- DNS changes can take up to 48 hours to propagate
- Check Netlify **Site settings → Domain management** for any error messages

**HTTPS not working:**
- Netlify provisions HTTPS automatically after DNS is verified
- Check **Site settings → Domain management → HTTPS** for status
- If stuck, click **Verify DNS configuration** then **Provision certificate**
