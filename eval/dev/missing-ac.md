# Invoice reminders — requirements

### REQ-001: Reminder schedule
A workspace admin configures reminder emails for unpaid invoices: 3 days before due date, on the due date and 7 days after. Each reminder is sent once per invoice at 09:00 in the workspace's timezone.

### REQ-002: Reminder content
The reminder email uses the workspace's email template with the invoice number, amount due, due date and a "Pay now" link that opens the invoice payment page. Depends on REQ-001.

**Acceptance criteria**
- Given an unpaid invoice INV-42 for $100 due 2026-03-01, when the reminder is sent, then the subject is "Invoice INV-42 is due 2026-03-01" and the body contains "$100.00" and a link to /invoices/INV-42/pay.

### REQ-003: Stop on payment
Once the invoice is paid in full or voided, no further reminders are sent for it. Depends on REQ-001.

### REQ-004: Opt-out per client
A team member can disable reminders for a specific client from the client profile. Disabled clients receive no reminders for any invoice. Depends on REQ-001.

**Acceptance criteria**
- Given reminders disabled for client C, when a reminder would be due for an invoice of C, then nothing is sent and the invoice timeline records "Reminder skipped: disabled for client".
- Given reminders re-enabled, when the next reminder is due, then it is sent.
