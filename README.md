# Trip Expense Manager v2

This is the upgraded front-end foundation for the Trip Expense Manager.

## Included
- Current Trip with expandable details
- Auto-saving Notes with Saved/Saving indicator
- Trip Name auto-generation when blank
- Source + multiple destinations
- Trip members
- Transport / Vehicle / fuel / odometer fields
- Active / Settled trips
- Add/Edit/Delete expenses
- Paid By + Shared By
- Shared By live counter
- Decimal internal calculation with whole-rupee display
- Person-wise and category-wise reports
- Universal Search
- Admin-only Manage and Accounts
- Members active-first / inactive-after
- Settled Trips accordion
- Re-activate and delete settled trips
- JSON Backup / Restore
- Excel export
- Print-friendly report foundation

## Important
This version intentionally keeps the project dependency-light. Excel export uses the free SheetJS browser library from jsDelivr. The existing localStorage keys are migrated on first load.

PDF generation is currently browser print based so the user can choose "Save as PDF"; the final 2-page PDF layout and pie chart can be refined in the next implementation pass.
