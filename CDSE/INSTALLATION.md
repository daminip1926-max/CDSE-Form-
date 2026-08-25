# Installation Guide - CDSE Dynamic Form

## Quick Start (5 Minutes)

### Step 1: Download
- You should already have `CDSE_App_FIXED.zip`

### Step 2: Extract
- Right-click on the ZIP file
- Select "Extract All" (Windows) or "Open" (Mac)
- Choose a location on your computer

### Step 3: Open
- Navigate to the extracted folder
- Find `index.html`
- Double-click it OR right-click → Open with → Browser

### Step 4: Done!
Application is ready to use. No installation needed.

---

## System Requirements

### Minimum
- Any modern web browser (Chrome, Firefox, Safari, Edge)
- 10 MB free disk space
- No internet required (works offline)

### Recommended
- Chrome or Firefox (Latest version)
- 20 MB free disk space
- 2 GB RAM
- Windows 10+, Mac OS 10.12+, or Linux

---

## Installation Methods

### Method 1: Direct (Easiest)
```
1. Extract CDSE_App_FIXED.zip
2. Open index.html in browser
3. Done!
```

### Method 2: Run as Local Server
If you have Python installed:

```bash
# Python 3
cd /path/to/CDSE_App_FIXED
python -m http.server 8000

# Then open browser and go to: http://localhost:8000
```

### Method 3: Using Node.js
If you have Node.js installed:

```bash
cd /path/to/CDSE_App_FIXED
npx http-server
```

---

## Folder Structure

After extraction, you will see:

```
CDSE_App_FIXED/
├── index.html                 ← Open this file
├── README.md                  ← Read this first
├── INSTALLATION.md            ← This file
├── TROUBLESHOOTING.md         ← For issues
├── css/
│   └── styles.css
├── js/
│   └── app.js
├── lib/
│   ├── docx.js
│   ├── pdf.js
│   └── xlsx.js
├── data/
│   ├── dam-data.js
│   ├── dam-database.xlsx
│   └── pdf-worker-b64.js
└── GoogleAppsScript_Code.gs
```

---

## Browser Setup

### Chrome / Chromium
1. Open Chrome browser
2. Press Ctrl+O (Windows) or Cmd+O (Mac)
3. Navigate to the extracted folder
4. Select index.html
5. Click Open

### Firefox
1. Open Firefox browser
2. Press Ctrl+O (Windows) or Cmd+O (Mac)
3. Navigate to the extracted folder
4. Select index.html
5. Click Open

### Safari (Mac)
1. Open Safari browser
2. Press Cmd+O
3. Navigate to the extracted folder
4. Select index.html
5. Click Open

### Edge
1. Open Edge browser
2. Press Ctrl+O
3. Navigate to the extracted folder
4. Select index.html
5. Click Open

---

## First Time Setup

### 1. Load the Application
- Open index.html in your browser
- Wait for page to load completely (3-5 seconds)

### 2. Check Everything
- Look for the NDSA logo at the top
- Check if all menu items are visible
- Try scrolling through the document

### 3. Load Dam Data (Optional)
- On the left sidebar, you'll see "Upload Dam CSV"
- Click it to load your dam dataset
- This allows you to use autofill features

### 4. Set Up Google Drive (Optional)
- If you want to save reports to Google Drive:
- Follow instructions in GoogleAppsScript_Code.gs
- Enter your Google Apps Script URL in the settings

---

## Testing the Installation

### Test 1: Basic Functionality
```
1. Open index.html
2. Scroll through different chapters
3. Try clicking on fields
4. Try typing in fields
5. Expected: Everything responds smoothly
```

### Test 2: Tables and Textareas
```
1. Go to any chapter with tables
2. Click on a textarea cell
3. Type some text
4. Expected: Text appears and wraps properly
```

### Test 3: Export Functionality
```
1. Fill in some data
2. Click "Export Excel" button
3. CSV file should download
4. Expected: File downloads successfully
```

### Test 4: Word Export
```
1. Fill in some data
2. Click "Download Word" button
3. DOCX file should download
4. Expected: File downloads and opens in Word
```

---

## File Permissions

Depending on your system, you may need to adjust file permissions:

### Windows
- Usually no action needed
- If blocked: Right-click file → Properties → Unblock

### Mac
- May show security warning on first run
- Go to: System Preferences → Security & Privacy
- Allow the browser to run the application

### Linux
- Usually no issues
- If needed: `chmod +x index.html`

---

## Firewall/Security

The application works entirely offline and makes no external network connections (except optional Google Drive).

### If Blocked by Firewall:
- Check if your browser is blocked
- Add browser to firewall whitelist
- The application itself doesn't need network access

---

## Storage Requirements

| Item | Size |
|------|------|
| index.html | ~450 KB |
| app.js | ~172 KB |
| CSS | ~20 KB |
| Libraries (docx, pdf, xlsx) | ~2 MB |
| Data files | ~300 KB |
| **Total** | **~2.9 MB** |

---

## Backup and Data

### Your Data is Safe Because:
- No data sent to servers
- Works completely offline
- All data stored on your computer
- You control all exports

### Backing Up Your Work:
```
1. Use "Export Excel" regularly
2. Use "Export JSON" to save complete data
3. Keep backups in different locations
4. Consider cloud backup (Google Drive integration available)
```

---

## Updates and Maintenance

### To Update:
```
1. Keep your current folder backed up
2. Extract new version to new location
3. Transfer your data files if needed
4. Test new version
5. Delete old version only after confirming new one works
```

### To Uninstall:
```
Simply delete the CDSE_App_FIXED folder
No files are added to system elsewhere
```

---

## Advanced Setup

### Google Drive Integration
To enable saving reports to Google Drive:

1. Create a Google Apps Script project
2. Copy the code from GoogleAppsScript_Code.gs
3. Deploy as web app
4. Copy the deployment URL
5. In the application, paste URL in settings
6. Authorize the connection

See GoogleAppsScript_Code.gs for detailed instructions.

---

## Common Issues During Installation

### Issue: "index.html not found"
**Solution:** Make sure you extracted the ZIP completely

### Issue: "Blank page when opening"
**Solution:** 
- Wait 5-10 seconds for page to load
- Try hard refresh (Ctrl+Shift+R)
- Try different browser

### Issue: "Styles not loading (page looks ugly)"
**Solution:**
- Check if css folder exists
- Try hard refresh
- Check browser console for errors

### Issue: "Can't see any data"
**Solution:**
- Upload a CSV file using "Upload Dam CSV" button
- Or manually fill in the fields

---

## Performance Optimization

### For Faster Loading:
1. Close unnecessary browser tabs
2. Use latest browser version
3. Clear browser cache periodically
4. Restart browser if slow

### For Large Datasets:
1. Use CSV import instead of manual entry
2. Export data regularly to prevent loss
3. Use separate files for different projects

---

## Mobile/Tablet Support

The application works on mobile and tablet devices:

### Setup on Mobile:
1. Email the CDSE_App_FIXED.zip to yourself
2. Extract using file manager app
3. Open index.html with browser
4. Use normally (same as desktop)

### Mobile Considerations:
- Screen is smaller (may need scrolling)
- Typing is possible but slower
- All features work the same
- Exports work normally

---

## Next Steps After Installation

1. ✅ Open index.html
2. ✅ Verify all sections load
3. ✅ Test typing in fields
4. ✅ Try exporting data
5. ✅ Read the main README.md
6. ✅ Start using the application

---

## Getting Help

If installation fails:

1. Check browser console (F12) for error messages
2. Try a different browser
3. Try extracting to a different folder
4. Make sure all files are extracted (check folder size ~3MB)
5. Restart your computer and try again

---

## Success Indicators

You'll know installation is successful when:

✅ index.html opens without errors  
✅ Page loads with NDSA logo visible  
✅ All text fields are clickable  
✅ Tables display properly  
✅ Buttons are responsive  
✅ You can type in textareas  
✅ Export buttons work  
✅ No error messages in console  

---

**Installation Complete!**

Proceed to README.md for full documentation and features.
