# MATE-HYD02 — Water-intake indicator and notices (A bordo Home)

- A third Home circle (same 136 px size as heart rate and SpO2) shows a glass and a counter of **simulated water-intake detections** logged today. The «i» (top right) explains in ES/EN that the demo simulates cameras detecting intakes and uses no real camera.
- The glass is a count on a fixed drawing scale (`VISUAL_CAPACITY`, never shown, never reached). It is not volume, a target or hydration status: no ticks, percent, units or colour change.
- Data: `src/demo/hydration.ts` (`demo-camera-sim`, outside `DAY_EVENTS`, so «Next event» and Ground are untouched). Level = events at or before the cursor for `dataOwner(profile)`, so drag and rewind follow the clock; John Doe reads Lucía's.
- Scene (Tomás only, reuses ALR01 firing, profile isolation and re-arming): 17:20 UTC reminder = 14:20 intake + 3 h scenario gap; 17:25 UTC confirmation = the 5th detected intake event itself (`hydrationNotices` in `companionNotices.ts`). Seeking never fires; rewinding re-arms.
- Recording: View as Tomás, seek to 17:19 → reminder ~60 s later (17:20:00); seek to 17:24 → confirmation ~60 s later (17:25:00, counter 4 → 5). Cut the two takes together.
