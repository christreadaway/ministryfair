# Deploying to ministry.st-theresa.org

This guide covers deploying the Ministry Fair app to `http://ministry.st-theresa.org`. Choose whichever hosting option best fits your setup.

---

## Prerequisites (all options)

1. **DNS access** for `st-theresa.org` (usually managed through your domain registrar or hosting provider — GoDaddy, Namecheap, Cloudflare, etc.)
2. **Google Apps Script backend** already deployed (see [README.md](README.md) steps 1–2)
3. **CONFIG updated** in `index.html` — set `apiUrl` to your Google Apps Script deployment URL

---

## Option A: GitHub Pages (free)

Best if you're already using GitHub for this repo.

### 1. Push to GitHub

```bash
git remote add github https://github.com/YOUR_USERNAME/ministryfair.git
git push -u github main
```

### 2. Enable GitHub Pages

1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under "Source", select **Deploy from a branch**
3. Choose **main** branch, **/ (root)** folder
4. Click **Save**

### 3. Configure custom domain in GitHub

1. Still in **Settings → Pages**, enter `ministry.st-theresa.org` in the **Custom domain** field
2. Click **Save**
3. GitHub will create a `CNAME` file in your repo

### 4. Add DNS record

Log into your DNS provider for `st-theresa.org` and add:

| Type  | Host/Name   | Value                        |
|-------|-------------|------------------------------|
| CNAME | `ministry`  | `YOUR_USERNAME.github.io`    |

DNS propagation can take a few minutes to 48 hours (usually under 30 minutes).

### 5. Verify

Visit `http://ministry.st-theresa.org`. Once it's working, you can optionally check "Enforce HTTPS" in GitHub Pages settings to serve at `https://ministry.st-theresa.org`.

---

## Option B: Netlify (free)

Best for a quick setup with automatic HTTPS.

### 1. Deploy the site

**Via drag-and-drop:**
1. Go to [app.netlify.com](https://app.netlify.com)
2. Create a new site — drag your project folder (containing `index.html`) into the deploy area
3. Your site is live at a random `*.netlify.app` URL

**Via GitHub integration:**
1. Connect your GitHub repo to Netlify
2. Build command: *(leave blank — no build needed)*
3. Publish directory: `.` (root)

### 2. Add custom domain in Netlify

1. Go to **Site settings → Domain management → Add custom domain**
2. Enter `ministry.st-theresa.org`
3. Netlify will show you the required DNS record

### 3. Add DNS record

Log into your DNS provider for `st-theresa.org` and add:

| Type  | Host/Name   | Value                                  |
|-------|-------------|----------------------------------------|
| CNAME | `ministry`  | `YOUR_SITE_NAME.netlify.app`           |

Or, if Netlify tells you to use their load balancer IP:

| Type | Host/Name  | Value             |
|------|------------|-------------------|
| A    | `ministry` | `75.2.60.5`       |

### 4. Enable HTTPS

Netlify provisions a free Let's Encrypt certificate automatically once DNS propagates. Check **Domain management → HTTPS** to verify.

---

## Option C: Existing parish web host (cPanel, shared hosting, etc.)

Best if `st-theresa.org` already runs on a traditional web host.

### 1. Create the subdomain in your hosting panel

**cPanel:**
1. Log in to cPanel
2. Go to **Domains** (or **Subdomains** on older cPanel)
3. Create subdomain: `ministry`
4. Document root will default to something like `/home/youraccount/ministry.st-theresa.org` or `/public_html/ministry`

**Plesk:**
1. Go to **Websites & Domains → Add Subdomain**
2. Enter `ministry`
3. Set the document root

**Other panels:** Look for "Subdomains" or "Domains" in your hosting control panel.

### 2. Upload the file

Upload `index.html` to the subdomain's document root using:

- **File Manager** in cPanel/Plesk, or
- **FTP/SFTP** (use credentials from your host):
  ```bash
  sftp user@st-theresa.org
  cd /path/to/ministry-subdomain-root
  put index.html
  ```

### 3. DNS (may be automatic)

If your hosting and DNS are with the same provider, the subdomain DNS is usually configured automatically. If not, add:

| Type  | Host/Name   | Value                          |
|-------|-------------|--------------------------------|
| A     | `ministry`  | Your web server's IP address   |

Find your server IP in your hosting panel or by running `dig st-theresa.org A`.

### 4. Verify

Visit `http://ministry.st-theresa.org`. If your host supports Let's Encrypt or AutoSSL, enable HTTPS through the hosting panel.

---

## Option D: Cloudflare Pages (free)

Best if you already use Cloudflare for DNS.

### 1. Deploy

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages**
2. Connect your GitHub repo, or do a **Direct Upload** (upload your project folder)
3. Build command: *(leave blank)*
4. Build output directory: `.` (root)

### 2. Add custom domain

1. In your Pages project, go to **Custom domains** → **Set up a custom domain**
2. Enter `ministry.st-theresa.org`
3. If `st-theresa.org` is already on Cloudflare, the DNS record is added automatically
4. If not, add a CNAME record pointing `ministry` to `YOUR_PROJECT.pages.dev`

---

## Post-deployment checklist

- [ ] **Set your `apiUrl`** — Edit the CONFIG in `index.html` and set `apiUrl` to your Google Apps Script deployment URL
- [ ] **Test registration** — Open the site on a phone, register with name/email/phone
- [ ] **Test ministry signup** — Browse ministries and tap "I'm Interested" on one
- [ ] **Check Google Sheet** — Verify the signup appeared in the "App Signups" tab
- [ ] **Test deep links** — Try `http://ministry.st-theresa.org?m=music` (replace `music` with a real ministry ID)
- [ ] **Generate QR codes** — Create QR codes pointing to `http://ministry.st-theresa.org` for the main page and `http://ministry.st-theresa.org?m=MINISTRY_ID` for individual ministry tables
- [ ] **Enable HTTPS** — If your hosting option supports it, serve from `https://ministry.st-theresa.org`

---

## Updating the app

Since the app is a single file, updating is straightforward:

1. Edit `index.html` locally
2. Re-upload / push to your hosting provider
3. Changes are live immediately (or after a short CDN cache, typically under a minute)

For the Google Sheets backend, if you update `google-apps-script.js`:
1. Paste new code into Apps Script editor
2. Go to **Deploy → Manage deployments → Edit → New version → Deploy**
