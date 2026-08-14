---
'@orion-js/pulse': patch
'@orion-js/echoes': patch
---

Remove the execution-version and ordering selectors. Pulse now uses one delivery-resident execution model for every listener, with atomic claims, retries, outcomes, and bounded attempt history stored on each delivery. Echoes removes the corresponding event and subscription options.
