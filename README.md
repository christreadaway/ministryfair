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
  primaryColor: '#8B2635',
  primaryColorDark: '#6B1D29'
};
```

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

### 6. Generate QR Codes

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

## Google Sheet Structure

The app creates three tabs automatically:

### Ministries
Your ministry directory (you edit this)

### App Signups
All signups and removals with timestamps:

| Date | Time | First | Last | Email | Phone | New Parishioner | Ministry | Action | Q1 | Q2 | Q3 |
|------|------|-------|------|-------|-------|-----------------|----------|--------|-----|-----|-----|

### New Parishioners
Auto-populated list of visitors who want to join the parish

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
