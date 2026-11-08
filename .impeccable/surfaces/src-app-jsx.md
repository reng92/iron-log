---
version: 1
slug: "src-app-jsx"
primary_target: "src/App.jsx"
related_targets: ["src/constants.js"]
---

# Iron Log app shell + Oggi (Home)

Scope: whole app (Operate mode), Home "Oggi" first, then Allena, Dieta, Corpo, Io. Single user, Italian UI, Android (Capacitor) primary + web. Dark and light themes.

Task: answer "what do I do / eat / drink today" in one glance and log in seconds, one thumb, often mid-set.

## Direction contract

THESIS: The day is printed like a food label: a stark "Valori di oggi" declaration with NutrInform-style batteries filling toward the plan's targets. It refuses the category default of neon rings on black cards.

OWN-WORLD: Label panels (white / near-black in dark) ruled with heavy 8px and hairline 1px black rules; one grotesque family, bold, all figures tabular; packaging-green shell field (#1F4D3A family) for header and active nav; battery fills: green (on track), blue (water), red only for over-target. No emoji as icons; no generic grey cards.

STORY: He opens the app, reads today's declaration (kcal, protein, water, workout) like a label, taps +bottle or "mangiato", starts the workout. Every number names its source (plan, day type).

FIRST VIEWPORT: Green packaging header with greeting, date, day type chip. Below, the label panel "Valori di oggi": title rule, rows Energia / Proteine / Acqua each with value, target and a horizontal battery, +750 quick add on the water row. Then "Allenamento di oggi" row with the big Inizia button. Next meal, then the week strip and weight sit below the fold. Bottom nav: 5 tabs.

FORM: Etichetta nutrizionale UE + batteria NutrInform, candidate 6 of my ordered list, seed key 265eddc5. Signature move: NutrInform battery meters. Raises: one grotesque, tabular figures (datamatics); a live exercise fills the whole screen (feed); new PR / changed target stays highlighted until seen (gate); week strip uses a fixed size ramp (atlas); each number shows its source (mono).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
