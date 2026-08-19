CDSE Dynamic Form — Folder Structure
=====================================

index.html          Main app page. Links/loads everything below.
css/
  styles.css         All the app's styling (previously inline in <style>).
js/
  app.js             All the app's own logic — form building, chapter
                     rendering, print/PDF handling, and the Word (.docx)
                     export code.
lib/
  pdf.js             Bundled PDF.js library (used for annexure PDF handling).
  docx.js            Bundled docx.js library (used to build the Word export).
data/
  dam-data.js        The ~2,862-dam master database as a JavaScript array
                     (DAM_ROWS / DAM_HEADERS). This is what the app actually
                     reads at runtime for "Auto-fill from Dataset".
  dam-database.xlsx  The SAME dam data as a real Excel workbook, so you can
                     open it in Excel, edit/add dam records, filter, etc.

Why two copies of the dam data?
--------------------------------
Browsers won't reliably let a local HTML file (opened by double-click,
no web server) read an .xlsx file at runtime — that kind of file access
is blocked for security reasons on file:// pages. So the app itself reads
dam-data.js (plain JavaScript, which loads fine locally), while
dam-database.xlsx is provided purely as an editable, human-friendly copy
of the same data. If you edit dam-database.xlsx and want those changes to
show up in the app, you'd need to regenerate dam-data.js from it.

How to use
----------
Just open index.html in a browser (double-click it, or drag it into
Chrome). It will automatically load styles.css, the two libraries, the
dam dataset, and app.js — behaving exactly like the single-file version,
just organized into separate files.

Do not move index.html to a different folder without moving the css/,
js/, lib/, and data/ folders along with it — it references them by
relative path.
