# Card payments — requirements

### REQ-001: Pay an invoice by card
A client pays an open invoice with a credit or debit card from the invoice page. On success the invoice becomes Paid and a receipt email is sent.

**Acceptance criteria**
- Given an open invoice of $120, when the client pays with a valid card, then the invoice status is Paid, the payment record shows $120 and a receipt email is sent within 1 minute.

### REQ-002: Processing fee
A processing fee is added on top of the invoice amount. The fee percentage is TBD (to be confirmed with Finance). Extends REQ-001.

**Acceptance criteria**
- Given an invoice of $100, when the client opens the payment page, then the fee line and total are displayed before the card form.

### REQ-003: Saved cards
A client may save a card for future payments. Saved cards show the brand and last 4 digits only. Extends REQ-001.

**Acceptance criteria**
- Given a saved Visa ending 4242, when the client opens the payment page, then "Visa •••• 4242" is offered as a payment option.
- Given the client removes the card, when the page is reloaded, then it is no longer offered.

### REQ-004: Declined card
When the card is declined the client is informed and may try another card. Extends REQ-001.

**Acceptance criteria**
- Given a card the processor declines, when the client submits, then the message "Your card was declined" is shown and the invoice stays open.
