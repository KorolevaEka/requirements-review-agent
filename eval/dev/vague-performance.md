# Report export — requirements

### REQ-001: Export to CSV
An analyst exports the current filtered table to CSV from the toolbar. The file contains exactly the visible columns in display order, UTF-8 with BOM, comma separated, header row included.

**Acceptance criteria**
- Given a table with 3 visible columns and 100 rows, when Export is clicked, then a CSV with 101 lines and 3 columns is downloaded.

### REQ-002: Export speed
Export should be fast so analysts are not kept waiting. See REQ-001.

**Acceptance criteria**
- Given a table of 10,000 rows, when Export is clicked, then the download starts quickly.

### REQ-003: Large exports
Exports above 50,000 rows run in the background. The analyst receives an in-app notification with a download link when the file is ready; the link is valid for 24 hours. Extends REQ-001.

**Acceptance criteria**
- Given 60,000 rows, when Export is clicked, then the toast "We'll notify you when the export is ready" is shown and a notification with a link appears when the job finishes.
- Given a link older than 24 hours, when opened, then HTTP 410 is returned.

### REQ-004: Export dialog
The export dialog is user-friendly and lets the analyst pick an appropriate delimiter. Related to REQ-001.

**Acceptance criteria**
- Given the dialog is open, when the analyst picks a delimiter from the list (comma, semicolon, tab), then the downloaded file uses that delimiter.
