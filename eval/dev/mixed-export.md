# Client import — requirements

### REQ-001: CSV import
A workspace admin imports clients from a CSV with columns name, email, phone. Maximum 5,000 rows per file. Rows with an invalid email are skipped and listed in the import report.

**Acceptance criteria**
- Given a CSV with 3 valid rows and 1 row with email "bob@", when imported, then 3 clients are created and the report lists row 4 with reason "Invalid email".
- Given 5,001 rows, when uploaded, then the error "Maximum 5,000 rows" is shown and nothing is imported.

### REQ-002: Duplicate handling
Duplicates are handled appropriately so the team does not end up with messy data. Extends REQ-001.

### REQ-003: Import limits
To protect the system, a file may contain at most 10,000 rows. Extends REQ-001.

**Acceptance criteria**
- Given 10,001 rows, when uploaded, then the error "Maximum 10,000 rows" is shown.

### REQ-004: Import report
After import the owner downloads a report listing every skipped row with its reason, as defined in REQ-001 and the error catalogue REQ-012.

**Acceptance criteria**
- Given an import with 2 skipped rows, when the report is downloaded, then it contains exactly 2 lines plus a header, each with row number, email and reason.
