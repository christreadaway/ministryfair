# Security Guide for Ministry Fair App

## Understanding the Security Alert

If you received a security alert about an "exposed Google API key," here's what you need to know:

### What the app actually uses

This Ministry Fair app uses **Google Apps Script** as its backend, not Google Cloud API keys. The difference is important:

- **Google Apps Script URL**: This is MEANT to be public. It's designed to be called from your web app and is protected by Google's own access controls.
- **Google Cloud API Key**: This should NEVER be in your code. These are used for other Google services and can be misused if exposed.

### Why you might have received an alert

1. **False Positive**: Security scanners sometimes flag text like "ministry-fair" as a potential Google Cloud project ID
2. **Actual exposed key**: If you added a real Google Cloud API key to the code (not needed for this app)
3. **Git history**: An old commit might have temporarily contained sensitive data

## How to Verify and Fix

### Step 1: Check what's actually in your code

Look in `index.html` around the CONFIG section. It should only have:
```javascript
apiUrl: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
```

If you see something like `AIza...` followed by random characters, that's a Google API key and needs to be removed.

### Step 2: If you DO have an exposed API key

**Immediately rotate the key:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (if you have one)
3. Go to "APIs & Services" > "Credentials"
4. Find the exposed API key
5. Click the three dots > "Delete key"
6. If you actually need the key, create a new one and store it properly (see below)

### Step 3: Remove it from your code

Edit index.html and replace any API key with the proper Apps Script URL.

### Step 4: Remove it from Git history (if needed)

If the key was committed to Git, you need to remove it from history:

```bash
# This is complex - consider getting help from someone technical
# Or simply regenerate the key in Google Cloud Console (Step 2)
# Then anyone with the old key won't be able to use it
```

## Best Practices

### Do:

1. **Use placeholders in code**: Never commit real API keys to Git
2. **Use .gitignore**: Add sensitive files to `.gitignore` (already set up)
3. **Regenerate exposed keys**: If a key is ever exposed, regenerate it immediately
4. **Use Google Apps Script**: For this app, you only need the Apps Script URL (which is safe to be public)

### Don't:

1. **Don't put API keys in code**: Even in comments
2. **Don't commit .env files**: These often contain secrets
3. **Don't share keys in screenshots**: When asking for help online
4. **Don't reuse keys**: Each app/environment should have its own keys

## For This Specific App

**You should NOT need a Google Cloud API key at all.**

This app only needs:
1. A Google Sheet
2. A Google Apps Script (created from the sheet)
3. The Apps Script deployment URL (which goes in `apiUrl`)
4. A Google OAuth Client ID (for Google Sign-In, which is safe to include in client code)

The Apps Script URL looks like:
```
https://script.google.com/macros/s/ABC123.../exec
```

This URL is **safe to put in your code** - it's meant to be public. The Apps Script itself controls who can access and modify your sheet data.

## Still Concerned?

If you're still seeing security alerts:

1. **Check GitHub Security tab**: Go to your repository > Security tab > See what's actually flagged
2. **Dismiss false positives**: If it's just the placeholder text or project name, you can dismiss the alert
3. **Contact support**: If you're unsure, GitHub Support can help clarify the alert
