# Parish Ministry Fair App

A mobile-first web app that simplifies ministry signups at parish events. Parishioners scan a QR code, register once, then express interest in any ministry with a tap.

**Free, open source, and easy to customize for your parish.**

## Features

- **One-time registration** — Name, email, phone (auto-formatted), stored locally
- **Ministry directory** — Browse all ministries with search functionality
- **Smart search** — Finds ministries by name, description, or organizer name
- **Express interest** — Tap to sign up, with optional qualifying questions per ministry
- **Remove interest** — Change your mind with confirmation prompt
- **Organizer contact** — See ministry leader's contact info after signing up
- **New parishioner flag** — Option to indicate interest in joining the parish
- **Audit trail** — All signups and removals logged to Google Sheets
- **Deep linking** — QR codes can link directly to specific ministries
- **Admin dashboard** — Full admin panel with signups, new parishioners, ministry CRUD, user management
- **Ministry leader dashboard** — Leaders see signups for their ministries with qualifying answers and CSV export
- **Role-based access** — Admins and ministry leaders sign in via Google; parishioners need no sign-in
- **No app install required** — Works in any mobile browser

## Quick Start

### 1. Copy the Google Sheet

Create a new Google Sheet for your parish.

### 2. Set Up the Backend

1. In your Google Sheet, go to **Extensions → Apps Script**
2. Delete any existing code
3. Paste the contents of `google-apps-script.js`
4. Save (Ctrl+S)
5. Run **testSetup** from the function dropdown (creates all tabs)
6. Click **Deploy → New deployment → Web app**
7. Set "Execute as" to **Me** and "Who has access" to **Anyone**
8. Click **Deploy** and **copy the URL**

### 3. Configure the App

Open `index.html` and edit the CONFIG section at the top:

```javascript
const CONFIG = {
  organizationName: 'Your Parish Name',
  appTitle: 'Ministry Fair',
  tagline: 'Your tagline here',
  apiUrl: 'YOUR_GOOGLE_SCRIPT_URL_HERE',
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID_HERE',
  primaryColor: '#8B2635',
  primaryColorDark: '#6B1D29'
};
```

See [Setting up Google Sign-In](#setting-up-google-sign-in) below for how to get your `googleClientId`.

### 4. Host the App

**Option A: GitHub Pages (free)**
1. Fork this repository
2. Go to Settings → Pages → Enable from main branch
3. Your app is live at `https://yourusername.github.io/parish-ministry-fair/`

**Option B: Netlify (free)**
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop your `index.html` file
3. Done!

**Option C: Your parish website**
Upload `index.html` to your web host

### 5. Add Your Ministries

Edit the **Ministries** tab in your Google Sheet:

| Column | Description | Example |
|--------|-------------|---------|
| A - ID | Unique identifier | `music` |
| B - Name | Display name | `Music Ministry` |
| C - Description | Brief description | `Lift hearts in worship through song...` |
| D - Icon | Emoji | `🎵` |
| E - Organizer Name | Contact person | `John Smith` |
| F - Organizer Email | Contact email | `john@parish.org` |
| G - Organizer Phone | Contact phone | `5125551234` |
| H-J - Questions | Optional (see below) | |

### 6. Set Up Google Sign-In

Google Sign-In is used for admin and ministry leader authentication. See the detailed instructions in [Setting up Google Sign-In](#setting-up-google-sign-in) below.

### 7. Add Admins

In your Google Sheet, go to the **Admins** tab (created by `testSetup`) and add rows:

| Email | Name | Added Date |
|-------|------|------------|
| `admin@gmail.com` | Jane Admin | 2/1/26 |

Use the **Google account email** for each admin. These users will have full dashboard access.

### 8. Set Up Ministry Leaders

Ministry leaders are identified automatically by the **Organizer Email** column (F) in the Ministries tab. Any Google account email that matches an Organizer Email gets leader dashboard access — no separate configuration needed.

A leader can organize multiple ministries and will see signups for all of them.

### 9. Generate QR Codes

Use any QR code generator (e.g., [qr-code-generator.com](https://www.qr-code-generator.com/)):

- **Main entry:** `https://yoursite.com`
- **Specific ministry:** `https://yoursite.com?m=ministry-id`

Print QR codes for each table at your fair!

---

## Customization

### Colors

Edit the CONFIG section to match your parish colors:

```javascript
primaryColor: '#8B2635',      // Main buttons, header
primaryColorDark: '#6B1D29'   // Button shadows, gradients
```

### Qualifying Questions

Add optional questions for specific ministries in columns H, I, J:

**Text input:**
```
text|Do you play an instrument?
```

**Dropdown:**
```
select|Voice part|Soprano,Alto,Tenor,Bass
```

**Checkboxes:**
```
checkbox|Which Mass times work?|Saturday 5pm,Sunday 9am,Sunday 11am
```

---

## Setting up Google Sign-In

Admin and ministry leader sign-in requires a Google OAuth Client ID. This is free and takes about 5 minutes.

### 1. Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top → **New Project**
3. Name it something like "Parish Ministry Fair" and click **Create**
4. Make sure the new project is selected in the dropdown

### 2. Configure the OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** and click **Create**
3. Fill in:
   - App name: `Ministry Fair` (or your parish name)
   - User support email: your email
   - Developer contact: your email
4. Click **Save and Continue** through the remaining steps (no scopes needed)
5. Under **Test users**, add the Gmail addresses of your admins and leaders
6. When ready for production, click **Publish App** (otherwise only test users can sign in)

### 3. Create OAuth Client ID

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth client ID**
3. Application type: **Web application**
4. Name: `Ministry Fair`
5. Under **Authorized JavaScript origins**, add your app URLs:
   - `https://yoursite.com` (your production URL)
   - `http://localhost` (for local testing, optional)
6. Click **Create**
7. Copy the **Client ID** (looks like `123456789-abc123.apps.googleusercontent.com`)

### 4. Add to CONFIG

Paste the Client ID into the CONFIG in `index.html`:

```javascript
googleClientId: '123456789-abc123.apps.googleusercontent.com',
```

---

## Admin & Leader Access

### Accessing the Staff Sign-In

Staff sign-in is accessed by:
- Adding `?admin` to the URL (e.g., `https://yoursite.com?admin`)
- Clicking the subtle **Admin** link at the bottom-right of the app

### User Roles

| Role | How identified | What they see |
|------|---------------|---------------|
| **Admin** | Email in the Admins sheet | Full dashboard: all signups, new parishioners, ministry CRUD, user management |
| **Ministry Leader** | Email matches Organizer Email on any ministry | Leader dashboard: signups for their ministries, CSV export |
| **Parishioner** | No sign-in needed | Browse ministries, register, express interest |

### Admin Dashboard

Admins get a blue-themed dashboard with four tabs:

- **Signups** — Searchable table of all signups and removals, newest first, with CSV export
- **New Parishioners** — People who checked "I'd like to join the parish", with CSV export
- **Ministries** — Add, edit, and delete ministries directly from the dashboard
- **Manage Users** — Add/remove admin users; view ministry leaders (linked to organizer emails)

### Ministry Leader Dashboard

Leaders get a green-themed dashboard showing:

- Stats for their ministry/ministries (total signups, unique people)
- Per-ministry signups table with contact info and qualifying question answers
- Per-ministry CSV export

### Managing Admins

Admins can be managed two ways:
1. **From the dashboard** — Go to the **Manage Users** tab to add or remove admins
2. **From Google Sheets** — Edit the **Admins** tab directly

### Managing Leaders

Leaders don't need separate configuration. To make someone a ministry leader:
1. Set their Google email as the **Organizer Email** (column F) on a ministry
2. They can now sign in and see signups for that ministry

To remove a leader, change or clear the Organizer Email on the ministry.

---

## Google Sheet Structure

The app creates four tabs automatically (via `testSetup`):

### Ministries
Your ministry directory (you edit this)

### App Signups
All signups and removals with timestamps:

| Date | Time | First | Last | Email | Phone | New Parishioner | Ministry | Action | Q1 | Q2 | Q3 |
|------|------|-------|------|-------|-------|-----------------|----------|--------|-----|-----|-----|

### New Parishioners
Auto-populated list of visitors who want to join the parish

### Admins
Access control for admin dashboard:

| Email | Name | Added Date |
|-------|------|------------|

---

## Updating After the Fair

**To add/edit ministries:** Edit the Ministries tab directly. Changes appear immediately.

**To update the app code:**
1. Update the Apps Script code
2. Go to Deploy → Manage deployments → Edit → New version → Deploy

---

## Files

| File | Description |
|------|-------------|
| `index.html` | The complete web app (single file, no build needed) |
| `google-apps-script.js` | Google Apps Script backend |
| `README.md` | This file |
| `DEPLOY.md` | Hosting & subdomain setup guide |
| `PRODUCT-SPEC.md` | Detailed product specification |

---

## FAQ

**Q: Does this cost anything?**  
A: No. GitHub Pages, Netlify, and Google Sheets are all free.

**Q: Do parishioners need to install an app?**  
A: No. It works in any mobile browser.

**Q: What if someone loses internet mid-signup?**  
A: Their profile is saved locally. They can continue when back online.

**Q: Can I use this for events other than ministry fairs?**  
A: Yes! Works for volunteer signups, small group fairs, event registration, etc.

---

## License

MIT License — Free to use, modify, and distribute.

Built with ❤️ for parish communities everywhere.

---

## Support

This app is free and open source. If it's helped your parish, consider supporting the creator:

[Support Modernizing Catholic](https://www.patreon.com/c/christreadaway)
