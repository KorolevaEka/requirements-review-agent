# In-app notifications — requirements

### REQ-001: Notification bell
A team member sees a bell icon in the header with a badge showing the count of unread notifications, capped at "99+". Clicking the bell opens the notification panel (REQ-002).

**Acceptance criteria**
- Given 3 unread notifications, when the page loads, then the badge shows "3".
- Given 120 unread notifications, when the page loads, then the badge shows "99+".
- Given 0 unread notifications, when the page loads, then no badge is shown.

### REQ-002: Notification panel
The panel lists the 20 most recent notifications, newest first, each with title, relative time and an unread dot. Scrolling to the bottom loads the next 20. Opening a notification marks it read and navigates to its target. Opened from REQ-001.

**Acceptance criteria**
- Given 45 notifications, when the panel opens, then 20 are shown and scrolling to the end loads 20 more, then 5 more.
- Given an unread notification, when it is clicked, then the unread dot disappears, the badge count (REQ-001) decreases by 1 and the browser navigates to the notification's link.

### REQ-003: Mark all as read
A "Mark all as read" action in the panel (REQ-002) marks every notification of the member as read and clears the badge (REQ-001).

**Acceptance criteria**
- Given 7 unread notifications, when "Mark all as read" is clicked, then all unread dots disappear and the badge is hidden within 1 second.
- Given 0 unread notifications, when the panel opens, then the action is disabled.
