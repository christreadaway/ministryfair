# Deploying to ministry.st-theresa.org

St. Theresa's main website is hosted on **eCatholic**, a managed CMS platform. eCatholic does not support uploading custom HTML files or creating subdomains with custom apps, so the Ministry Fair app needs to be hosted separately.

The recommended approach: **host the app for free on Netlify, then point the `ministry` subdomain there.** Your main parish website at `st-theresa.org` stays on eCatholic — nothing changes.

---

## Prerequisites

1. **Google Apps Script backend** already deployed (see [README.md](README.md) steps 1–2)
2. **CONFIG updated** in `index.html`:
   - `apiUrl` — your Google Apps Script deployment URL
   - `googleClientId` — your Google OAuth Client ID (see [Setting up Google Sign-In](README.md#setting-up-google-sign-in))
3. **Admins tab** populated — at least one admin email in the Admins sheet
4. **Google Cloud Console** — your production domain added to Authorized JavaScript Origins (see below)

---

## Recommended: Netlify + subdomain (free)

### Step 1 — Deploy to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) and create a free account
2. Click **"Add new site" → "Deploy manually"**
3. Drag and drop your project folder (the one containing `index.html`)
4. Your site is live immediately at a random URL like `random-name.netlify.app`
5. Test it — make sure ministries load and registration works

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

Visit `http://ministry.st-theresa.org` (and `https://ministry.st-theresa.org` once HTTPS is ready).

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

## Google Sign-In: Add Your Domain

After deploying, you need to authorize your production domain for Google Sign-In:

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Click your OAuth Client ID
3. Under **Authorized JavaScript origins**, add:
   - `https://ministry.st-theresa.org` (your production URL)
   - `https://YOUR-SITE-NAME.netlify.app` (your Netlify URL, for testing)
4. Click **Save**

Without this step, the Google Sign-In button will not work on your deployed site.

---

## Post-deployment checklist

### Parishioner flow
- [ ] Set `apiUrl` in CONFIG to your Google Apps Script deployment URL
- [ ] Set `googleClientId` in CONFIG to your Google OAuth Client ID
- [ ] Test registration on a phone — name, email, phone
- [ ] Test ministry signup — tap "I'm Interested" on a ministry
- [ ] Check Google Sheet — verify signup appeared in "App Signups" tab
- [ ] Test deep links — `https://ministry.st-theresa.org?m=music` (use a real ministry ID)
- [ ] Generate QR codes for `https://ministry.st-theresa.org` (main) and `https://ministry.st-theresa.org?m=MINISTRY_ID` (per-ministry)
- [ ] Verify HTTPS is working at `https://ministry.st-theresa.org`

### Admin flow
- [ ] Add at least one admin email to the **Admins** tab in Google Sheets
- [ ] Add your production domain to **Authorized JavaScript origins** in Google Cloud Console
- [ ] Visit `https://ministry.st-theresa.org?admin` and sign in with Google
- [ ] Verify admin dashboard loads (blue header) with Signups, New Parishioners, Ministries, and Manage Users tabs
- [ ] Test adding a ministry from the Ministries tab
- [ ] Test adding another admin from the Manage Users tab
- [ ] Test CSV export from the Signups tab

### Ministry leader flow
- [ ] Set an **Organizer Email** (column F) on a ministry in the Ministries tab
- [ ] Sign in at `?admin` with that organizer's Google account
- [ ] Verify leader dashboard loads (green header) with signups for their ministry
- [ ] Test per-ministry CSV export

---

## Updating the app

Since the app is a single file, updates are simple:

1. Edit `index.html` locally
2. In Netlify: **Deploys → Drag and drop** your updated folder (or push to GitHub if connected)
3. Changes are live immediately

For the Google Sheets backend, if you update `google-apps-script.js`:
1. Paste new code into Apps Script editor
2. Go to **Deploy → Manage deployments → Edit → New version → Deploy**
