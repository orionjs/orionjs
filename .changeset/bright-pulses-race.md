---
'@orion-js/pulse': patch
'@orion-js/echoes': patch
---

Add opt-in embedded execution for unordered Pulse subscriptions. Version 2 keeps queue state,
leases, retries, and completed attempts atomically on delivery documents, while bridge-capable
workers continue draining version 1 and version 2 deliveries during rolling deployments. Echoes can
select the execution version per listener.
