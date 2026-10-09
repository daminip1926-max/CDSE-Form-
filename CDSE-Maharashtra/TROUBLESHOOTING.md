# Troubleshooting Guide - CDSE Dynamic Form

## General Troubleshooting Steps

Before diving into specific issues, try these general fixes first:

### Step 1: Clear Browser Cache
```
Windows: Ctrl + Shift + Delete
Mac: Cmd + Shift + Delete
Linux: Ctrl + Shift + Delete
```
- Select "Cached images and files"
- Select "All time"
- Click Delete

### Step 2: Hard Refresh
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Step 3: Restart Browser
- Close all browser windows completely
- Wait 10 seconds
- Reopen browser
- Open index.html again

### Step 4: Try Different Browser
- Try Chrome if using Firefox
- Try Firefox if using Chrome
- Try Safari or Edge as alternatives

---

## Issue: Application Won't Open

### Symptom
Opening index.html shows blank page or error

### Possible Causes & Solutions

**Cause 1: File not found**
```
Solution:
1. Extract the ZIP file completely
2. Verify CDSE_App_FIXED folder exists
3. Verify index.html exists inside the folder
4. Try opening from different location
```

**Cause 2: Browser not found**
```
Solution:
1. Use Chrome, Firefox, Safari, or Edge
2. Don't use Internet Explorer (too old)
3. Update your browser to latest version
```

**Cause 3: File path issue**
```
Solution (Windows):
1. Right-click index.html
2. Select "Open with"
3. Choose Google Chrome or Firefox
4. Not Internet Explorer

Solution (Mac):
1. Right-click index.html
2. Select "Open with"
3. Choose Safari or Chrome
```

---

## Issue: Page Loads But Looks Broken

### Symptom
Page has no styling, looks plain, text everywhere

### Possible Causes & Solutions

**Cause: CSS file not loading**
```
Solution:
1. Verify css folder exists
2. Verify styles.css exists inside css folder
3. Check browser console (F12) for errors
4. Try hard refresh (Ctrl+Shift+R)
```

**Cause: Incorrect file path**
```
Solution:
1. Don't move index.html to different folder
2. Keep CDSE_App_FIXED structure intact
3. All folders must be in same directory
```

---

## Issue: Textareas Not Showing Text

### Symptom
Type text in textarea but it doesn't appear or text disappears

### Solution

This should now be FIXED in this version. If still occurring:

```
Step 1: Verify you have the FIXED version
- Check if css/styles.css was updated

Step 2: Clear cache
- Follow "Clear Browser Cache" steps above

Step 3: Hard refresh
- Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

Step 4: Check CSS file
- Open css/styles.css
- Search for "table.data td textarea"
- Should have: width:100%; box-sizing:border-box;
```

---

## Issue: Excel Export Missing Dam Name

### Symptom
Export to Excel shows "Unknown_Dam" or no dam name field

### Solution

This should now be FIXED in this version. If still occurring:

```
Step 1: Verify you have the FIXED version
- Check if js/app.js was updated

Step 2: Verify dam name is filled
- Go to Cover page
- Fill in "Name of Dam" field
- Don't leave it blank

Step 3: Export again
- Click "Export Excel"
- Open CSV file
- Search for dam name
- Should appear in first data rows
```

---

## Issue: Data Not Loading Correctly

### Symptom
Import JSON file but data doesn't appear correctly in all fields

### Solution

```
Step 1: Verify JSON file is valid
- Open in text editor
- Should start with { and end with }
- No obvious errors

Step 2: Check field IDs
- Each field must have unique data-field ID
- No duplicates allowed

Step 3: Re-export and test
- Fill new form data
- Export JSON
- Refresh page
- Import same JSON
- Check if data loads correctly

Step 4: Recreate from backup
- If old JSON doesn't load
- Create new file manually or from CSV
- Save as new JSON
```

---

## Issue: Table Data Misaligned

### Symptom
Table data appears in wrong columns or rows are misaligned

### Solution

```
Step 1: Check table structure
- Verify all <tr> rows have correct <td> cells
- Count headers and data columns

Step 2: Clear and reload
- Refresh page (F5)
- Clear form data
- Reload if needed

Step 3: Re-import data
- Export current data
- Refresh page
- Import again
```

---

## Issue: Export Files Not Downloading

### Symptom
Click Export button but nothing happens or file doesn't appear

### Possible Causes & Solutions

**Cause 1: Pop-up blocked**
```
Solution:
1. Check browser pop-up blocker
2. Allow pop-ups from this site
3. Reload page
4. Try export again
```

**Cause 2: Download folder issue**
```
Solution:
1. Check your Downloads folder
2. File might be there with default name
3. Change browser download settings
4. Set specific download location
```

**Cause 3: Antivirus/Security**
```
Solution:
1. Temporarily disable antivirus
2. Try export again
3. Re-enable antivirus
4. Add browser to whitelist
```

**Cause 4: No data to export**
```
Solution:
1. Fill in some form data first
2. Can't export empty form
3. Add at least one field value
4. Try export again
```

---

## Issue: Cannot Type in Fields

### Symptom
Click on field but typing doesn't work

### Possible Causes & Solutions

**Cause 1: Field is disabled**
```
Solution:
1. Check if field has grey/disabled appearance
2. Look for "Officer Mode" - might be enabled
3. Reload page
4. Try different field
```

**Cause 2: Browser issue**
```
Solution:
1. Try different browser
2. Clear browser cache
3. Update browser
4. Disable browser extensions
```

**Cause 3: Keyboard issue**
```
Solution:
1. Try Caps Lock or Num Lock
2. Test typing in different app
3. Check keyboard connection (USB)
4. Try different keyboard
```

---

## Issue: Word Document Export Not Working

### Symptom
Click "Download Word" but Word file doesn't download

### Solution

```
Step 1: Verify dependencies
- docx.js library loaded (check console F12)
- No error messages

Step 2: Fill form data
- Need at least some data to export
- Empty form exports blank document

Step 3: Try manual export
- Use "Export Excel" as fallback
- Copy data to Word manually

Step 4: Check Microsoft Word
- Make sure Word is installed
- Word not required for export to work
- PDF viewer can open DOCX files
```

---

## Issue: Page Very Slow

### Symptom
Application runs slowly, typing lags, buttons delayed

### Solution

```
Step 1: Close other applications
- Close browser tabs
- Close other programs
- Free up computer memory

Step 2: Reduce dataset size
- Unload large CSV file if loaded
- Use with smaller dataset
- Or increase computer RAM

Step 3: Clear browser data
- Clear cache
- Clear cookies
- Clear site data

Step 4: Try different browser
- Chrome usually fastest
- Firefox good alternative
- Safari works well on Mac
```

---

## Issue: Browser Shows Security Warning

### Symptom
Warning about accessing local files or untrusted content

### Solution

This is normal for locally opened HTML files.

```
Option 1: Ignore warning (Safe)
- Click "Continue" or "Allow"
- Application is running locally (no internet)
- No security risk

Option 2: Use local server
- Run Python: python -m http.server 8000
- Or use: npx http-server
- Access via http://localhost:8000

Option 3: Deploy to web
- Upload to secure server
- Access via HTTPS
- No warning appears
```

---

## Issue: Can't Access Previously Saved Data

### Symptom
Old JSON/data files won't import or load incorrectly

### Solution

```
Step 1: Verify file format
- Check if JSON file is valid
- Open in text editor
- Should be valid JSON format

Step 2: Check file corruption
- Try creating new JSON export
- Compare with old file
- If old file different, it may be corrupted

Step 3: Manual recovery
- Open old JSON in text editor
- Look for your data
- Re-enter important fields manually

Step 4: Re-export to new format
- Import what works
- Fill in missing data
- Export fresh JSON
- Use new file going forward
```

---

## Issue: Form Fields Keep Resetting

### Symptom
Fill data in field, move away, data is gone

### Solution

```
Step 1: Check if autofill is on
- Look for "Auto-fill" settings
- May be overwriting entries
- Disable if not needed

Step 2: Verify field IDs
- Each field needs unique data-field ID
- Check browser console for warnings

Step 3: Try different field
- Check if issue in specific field or all fields
- If specific field broken, use different one
```

---

## Issue: Print Not Working

### Symptom
Print button doesn't work or output looks wrong

### Solution

```
Step 1: Use browser print
- Ctrl+P (Windows) or Cmd+P (Mac)
- Select printer
- Preview before printing

Step 2: Check settings
- Margins: Default (0.5")
- Scale: 100%
- Color: Default
- Paper: A4 or Letter

Step 3: PDF export instead
- Click "Download Word"
- Save as PDF instead
- Print from PDF viewer
- Better quality
```

---

## Issue: Responsive Design Not Working on Mobile

### Symptom
Page doesn't resize properly on phone/tablet

### Solution

```
Step 1: Check zoom level
- Phone should show full width
- If zoomed in, zoom out
- Two-finger pinch to zoom

Step 2: Rotate screen
- Try portrait and landscape
- Some fields better in landscape

Step 3: Use mobile browser
- Chrome Mobile works best
- Safari works on iPhone
- Firefox on Android

Step 4: Desktop version
- Use desktop/laptop for better experience
- Mobile is supported but desktop better
```

---

## Issue: Special Characters Not Displaying

### Symptom
Hindi/Devanagari text appears as boxes or wrong characters

### Solution

```
Step 1: Verify browser encoding
- Menu → Encoding → UTF-8
- Should be set to UTF-8

Step 2: Verify file encoding
- Data files must be UTF-8
- Check file properties

Step 3: Check CSV import
- CSV should have BOM marker
- File→ Save As → UTF-8 with BOM
```

---

## Getting Help: Check Browser Console

### How to Open Console
```
Windows: F12 or Ctrl+Shift+I
Mac: Cmd+Option+I
Linux: F12 or Ctrl+Shift+I
```

### What to Look For
```
Red text = Errors (important!)
Yellow text = Warnings
Blue text = Information
```

### How to Report Errors
```
1. Take screenshot of error message
2. Note the error text
3. Include steps to reproduce
4. Include browser name and version
```

---

## When Nothing Else Works

### Nuclear Option: Start Fresh
```
1. Delete CDSE_App_FIXED folder
2. Download CDSE_App_FIXED.zip again
3. Extract to new location
4. Open fresh index.html
5. Verify everything works
```

### Last Resort
```
1. Try completely different computer
2. Try mobile/tablet
3. Ask colleague to test
4. Contact technical support
```

---

## Issue: Google Drive Integration Not Working

### Symptom
"Save to Google Drive" button doesn't work

### Solution

```
Step 1: Check setup
- Google Apps Script URL must be configured
- See GoogleAppsScript_Code.gs for setup

Step 2: Verify URL
- Paste correct deployment URL
- Should start with https://
- Shouldn't have PASTE_YOUR text

Step 3: Check internet
- Requires working internet connection
- Test internet speed
- Check if Google Drive accessible

Step 4: Google account
- Must be logged in to Google
- Check Google Drive access
- Verify permissions
```

---

## Performance Checklist

If experiencing general slowness:

- [ ] Close other browser tabs
- [ ] Close other applications
- [ ] Clear browser cache
- [ ] Update browser
- [ ] Restart computer
- [ ] Check internet speed
- [ ] Reduce dataset size
- [ ] Try different browser
- [ ] Try different computer

---

## Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| Blank page | Hard refresh (Ctrl+Shift+R) |
| Ugly styling | Clear cache + refresh |
| No textareas text | Clear cache + verify FIXED version |
| Missing dam name | Verify app.js updated |
| Export not working | Fill form data first |
| Slow performance | Close other apps + clear cache |
| Security warning | Normal, click continue |

---

## FAQ

**Q: Will this overwrite my files?**
A: No, everything is in the local CDSE_App_FIXED folder only.

**Q: Can I move the folder?**
A: Yes, move entire folder. Don't move individual files.

**Q: Will it work without internet?**
A: Yes, except Google Drive integration (optional).

**Q: How large can datasets be?**
A: Up to 10,000 dams, depending on computer RAM.

**Q: Is data backed up?**
A: Only if you export it. Refresh deletes unsaved data.

**Q: Can multiple people use it?**
A: Yes, each person gets their own copy on their computer.

---

**Still having issues?**

1. Check this entire troubleshooting guide
2. Check README.md and INSTALLATION.md
3. Look at browser console errors (F12)
4. Try different browser
5. Ask for technical support

---

**Most common issues are resolved by:**
1. ✅ Clear cache
2. ✅ Hard refresh
3. ✅ Restart browser
4. ✅ Restart computer

Try these first for 90% of problems!
