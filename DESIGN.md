---
name: Iron Log
description: Diario personale di allenamento e dieta, impaginato come un'etichetta nutrizionale
colors:
  shell: "#163C88"
  shell-dark: "#0F2A5E"
  shell-ink: "#F3F6FF"
  shell-dim: "#BCCBEE"
  accent: "#1F5FD6"
  accent-dark: "#5B97FF"
  water: "#0B88AE"
  water-dark: "#3CC6E8"
  danger: "#C8102E"
  danger-dark: "#FF5A5F"
  warn: "#B76A00"
  ink: "#0B0D12"
  ink-dark: "#F1F4F9"
  ground: "#E9EDF3"
  ground-dark: "#0A0D12"
  panel: "#FFFFFF"
  panel-dark: "#12161D"
  hairline: "#D3D9E3"
  hairline-dark: "#272E3A"
typography:
  display:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 900
    lineHeight: 0.98
    letterSpacing: "-0.01em"
  label-title:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 900
    lineHeight: 1
  body:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.4
  row-key:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 800
  caption:
    fontFamily: "Archivo Variable, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  label: "6px"
  control: "10px"
  card: "12px"
  sheet: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.panel}"
    rounded: "{rounded.control}"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
  label-panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.label}"
    padding: "12px 14px"
  nav-bar:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-ink}"
    height: "58px"
  input:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "44px"
---

# Iron Log — Design

## Overview
Il mondo è **"Etichetta & Batteria"**: la giornata si legge come la dichiarazione nutrizionale di una confezione. I pannelli principali sono etichette con regole nere spesse (8px e 4px) e filetti da 1px; i valori del giorno sono **batterie NutrInform** che si riempiono verso l'obiettivo del piano. Il guscio (header della Home, barra di navigazione, allenamento live, recupero) è il blu cobalto della confezione. Modalità Operate: la struttura è quella standard di un'app mobile, il mondo entra solo da tipo, palette, densità e dalla batteria.

Fonte dei token: `src/theme.css.js` (variabili CSS su `.app` e `.app.light`). Tema scuro e chiaro, scelti dall'utente in Io.

## Colors
- **Guscio** blu cobalto (`shell`, scuro `shell-dark`) con testo `shell-ink`; usato solo per header Home, nav, barra dell'allenamento live e schermata di recupero.
- **Accento** blu acceso: pulsanti primari, batterie di energia e proteine, stati attivi e "fatto". Anche `--ok` coincide con l'accento: niente verde nell'app.
- **Acqua** ciano, riservato all'acqua (batteria, borracce, grafici).
- **Pericolo** rosso solo per "oltre obiettivo" e azioni distruttive; **warn** ambra per avvisi.
- **Regole** (`--rule`) = colore del testo: nero in chiaro, quasi bianco in scuro.

## Typography
Una sola famiglia, **Archivo Variable** self-hosted (`@fontsource-variable/archivo`), con asse di larghezza: i titoli usano `font-stretch: 75%` e peso 800–900, il testo corrente 100% e 400–700. Tutte le cifre sono tabulari (`font-variant-numeric: tabular-nums` sull'app). Testi in frase normale, mai tutto maiuscolo; dimensione minima 12px.

## Layout
Colonna mobile max 480px, gutter 16px, padding con safe area (`--safe-t`, `--safe-b`). Navigazione a 5 tab (Oggi, Allena, Dieta, Corpo, Io); le sezioni interne usano il controllo segmentato `.stab-row`. Target touch ≥ 44px (52px nell'allenamento live).

## Elevation & Depth
Profondità quasi assente: le etichette si separano con il bordo da 2px del colore regola. Unica ombra: l'etichetta "Valori di oggi" che sormonta l'header (`.lab.lift`) e i bottom sheet.

## Shapes
Etichette 6px, controlli 10px, card legacy 12px, bottom sheet 16px in alto. Batteria: corpo con bordo 2px e "polo" a destra.

## Components
- `.pack` header confezione della Home; `.lab` etichetta con `.lab-h`, `.r8`/`.r4`/`.r1` (regole), `.lab-row`, `.lab-src` (da dove viene il numero), `.lab-foot`.
- `Battery` (in `src/screens/Oggi.jsx`): riempimento con `transform: scaleX`, `over` rosso solo per l'energia oltre il 105%.
- `.wtab` tabella della settimana con segni a scala fissa (`.mk`, `.mk.part`, `.mk.on`).
- Allenamento live (`.live`, `.pager`, `.page`): un esercizio per schermata con scroll-snap, puntini di avanzamento, riepilogo finale; recupero a tutto schermo blu con batteria che si svuota.
- `.hrow` righe di storico espandibili (Peso).
- Bottoni `.btn-p` / `.btn-s`, `.bico` icone 40px, `.inp` 16px (evita lo zoom).

## Do's and Don'ts
- **Sì**: ogni numero dice da dove viene ("obiettivo dal piano · giorno palestra"); icone SVG del set in `src/components/Icons.jsx`; frasi normali.
- **Sì**: un record o un target cambiato resta evidenziato finché non è stato visto (`.seen-new`).
- **No** emoji come icone, testo tutto maiuscolo, verde, gradienti, card annidate, bordi colorati laterali.
- **No** animare `width/height`: usare `transform`. Rispettare `prefers-reduced-motion`.
