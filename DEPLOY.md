# Deploying Ministry Fair

**Last updated:** February 11, 2026

Ministry Fair is a single-file web app. There is no build step. You deploy by uploading a folder.

---

## Quick Start (Netlify — recommended)

### 1. Deploy to Netlify

1. Go to [app.netlify.com](https://app.netlify.com) and sign in (or create a free account)
2. Click **"Add new site" → "Import an existing project"**
3. Connect your GitHub repo (`christreadaway/ministryfair`) — or use **"Deploy manually"** and drag-drop the project folder
4. Netlify auto-detects `netlify.toml` — no build command needed
5. Your site is live at `random-name.netlify.app` within seconds

### 2. Test the fresh deployment

Open the Netlify URL in your browser. You should see the **Church Gate**:
- "Ministry Fair" heading
- "Get Started" card with Google and Microsoft sign-in buttons
- No pre-configured church data

### 3. Walk through setup as a new church

1. Sign in with a Google account (use a church email domain if you have one)
2. If the domain isn't recognized → the setup wizard starts
3. Choose **Google Sheets** as the platform
4. Set your organization name, title, colors
5. Create a Google Sheet, add the Apps Script backend (see below), paste the URLs
6. Add admin emails
7. Launch

### 4. (Optional) Custom domain

In Netlify: **Site settings → Domain management → Add custom domain**

Then add a CNAME record with your DNS provider:

| Type | Name | Value |
|------|------|-------|
| CNAME | `ministry` (or whatever subdomain) | `your-site.netlify.app` |

Netlify auto-provisions HTTPS once DNS propagates (usually <30 min).

---

## Setting Up the Google Sheets Backend

This is what the church admin does during the setup wizard:

### 1. Create a Google Sheet

Create a new Google Sheet in your Google account. The app will create the required tabs automatically when it first connects.

### 2. Add the Apps Script backend

1. In the Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code in the editor
3. Paste the entire contents of `google-apps-script.js`
4. Click **Save**

### 3. Run initial setup

1. In the Apps Script editor, select the `testSetup` function from the dropdown
2. Click **Run**
3. Authorize when prompted — this creates the 6 sheet tabs with headers

### 4. Deploy as a Web App

1. Click **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Click **Deploy**
6. Copy the deployment URL (looks like `https://script.google.com/macros/s/.../exec`)

### 5. Paste into the setup wizard

Back in Ministry Fair's setup wizard (Step 3):
- Paste the **Google Sheet URL** (the regular sheet URL from your browser)
- Paste the **Apps Script API URL** (the deployment URL you just copied)
- Click **Test Connection** to verify

---

## Redeploying / Updating

### If connected to GitHub (recommended)

Push to `main` → Netlify auto-deploys. Done.

```bash
git add -A && git commit -m "Update" && git push origin main
```

### If using manual deploy

1. In Netlify: **Deploys → Drag and drop** your updated project folder
2. Changes are live immediately

### Updating the Google Apps Script backend

If you update `google-apps-script.js`:
1. Paste new code into the Apps Script editor
2. **Deploy → Manage deployments → Edit (pencil icon) → New version → Deploy**

---

## Alternative: GitHub Pages (also free)

```bash
# Push to GitHub
git remote add github https://github.com/YOUR_USERNAME/ministryfair.git
git push -u github main
```

1. Go to repo **Settings → Pages**
2. Source: **Deploy from branch → main → / (root)**
3. Click **Save**
4. Custom domain: enter your subdomain, add CNAME record as above

---

## Post-deployment checklist

- [ ] Visit the URL — Church Gate should appear
- [ ] Sign in — setup wizard should start
- [ ] Complete setup wizard with your Google Sheet
- [ ] Test: register as a parishioner on a phone
- [ ] Test: tap "I'm Interested" on a ministry
- [ ] Check Google Sheet — verify signup appeared in "App Signups" tab
- [ ] Test: deep link `?m=ministry-id`
- [ ] Test: admin dashboard loads
- [ ] Generate QR codes for the ministry fair
