SSKratomYMT - Ready-to-deploy package
Files included:
- index.html
- style.css
- script.js
- manifest.json
- service-worker.js
- icon.png
- Code.gs  (Google Apps Script)

Steps:
1. Open https://docs.google.com/spreadsheets/d/11vhg3yMbHRm53SSEHLsCI3EBXx5_meXVvlRuqhFteaY and confirm sheet name 'SaleForm'. If needed, create sheet named 'SaleForm'.
2. In Google Apps Script, create a new project, paste Code.gs contents and save.
3. Deploy -> New deployment -> Select "Web app". Set "Who has access" to "Anyone" or "Anyone with link".
4. Copy the Web App URL and paste into script.js CONFIG.webAppUrl.
5. Upload the web files to an HTTPS host (or serve locally with a simple server). PWA requires HTTPS to fully install.
6. Test: submit the form → check the Google Sheet for appended rows.
