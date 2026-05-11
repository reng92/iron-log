export const BCS_PROMPT = `Analizza questa immagine del report "Storico TotalBody" BCS (Body Composition System) del nutrizionista. Restituisci SOLO JSON valido con un array "visite" contenente TUTTE le visite visibili nel grafico. Per ogni visita: data (YYYY-MM-DD), visita_label (es "Visita 1", "Basale"), peso (kg totale corpo, linea grigia/beige), ffm (Fat Free Mass kg, linea verde), fm (Fat Mass kg, linea arancione), bcm (Body Cell Mass kg, null se assente). Se non riesci a leggere un valore usa null. Formato: {"visite":[{"data":"2025-12-11","visita_label":"Visita 1","peso":92.3,"ffm":60.1,"fm":32.2,"bcm":null},{"data":"2026-05-07","visita_label":"Visita 4","peso":87.0,"ffm":59.4,"fm":27.6,"bcm":null}]}`;

export const BCS_SINGLE_PROMPT = `Analizza questa immagine di un report BCS del nutrizionista e restituisci SOLO JSON valido con i dati della visita. Campi: data (YYYY-MM-DD), visita_label (es "Visita 1"), peso (kg), ffm (Fat Free Mass kg), fm (Fat Mass kg), bcm (Body Cell Mass kg, null se non visibile). Formato: {"data":"2026-05-07","visita_label":"Visita 4","peso":87.0,"ffm":59.4,"fm":27.6,"bcm":null}`;

export const BCS_MULTI_PROMPT = `Hai DUE immagini BCS del nutrizionista. Analizzale entrambe e unisci i dati per data.
IMMAGINE 1 — Grafico "Storico TotalBody": per ogni punto del grafico estrai data (YYYY-MM-DD), visita_label (es "Visita 1", "Basale"), peso (kg, linea grigia/beige), ffm (Fat Free Mass kg, linea verde), fm (Fat Mass kg, linea arancione), bcm (null se assente).
IMMAGINE 2 — Scheda "Anthropometric": per ogni colonna data estrai le misure in cm (usa null se c'è un trattino o il campo manca): braccio_rilassato, braccio_flesso (riga "BRACCIO FLESSO-EST"), vita, addome, fianchi, coscia_max, coscia_med, polpaccio, testa, torace, avambraccio, polso.
Abbina i dati delle due immagini per data (stessa visita) e restituisci SOLO JSON valido senza altro testo:
{"visite":[{"data":"2025-12-11","visita_label":"Visita 1","peso":92.3,"ffm":60.1,"fm":32.2,"bcm":null,"braccio_rilassato":37.0,"braccio_flesso":37.8,"vita":97.0,"addome":108.0,"fianchi":100.0,"coscia_max":null,"coscia_med":60.4,"polpaccio":null,"testa":null,"torace":null,"avambraccio":null,"polso":null}]}`;

export const CIRC_PROMPT = `Analizza questa immagine di misure antropometriche/circonferenze corporee e restituisci SOLO JSON valido con tutti i valori numerici trovati. Usa null per i campi non visibili o con valore 0. I campi possibili sono: testa, torace, braccio_rilassato, avambraccio, braccio_flesso, polso, vita, addome, fianchi, coscia_max, coscia_med, polpaccio. Tutti in cm. Esempio formato: {"testa":null,"torace":null,"braccio_rilassato":35.0,"avambraccio":null,"braccio_flesso":35.5,"polso":null,"vita":96.5,"addome":104.4,"fianchi":96.3,"coscia_max":null,"coscia_med":57.3,"polpaccio":null,"data":"2026-03-10"}. Per il campo data, cerca una data nell'immagine nel formato "giorno mese anno" e convertila in YYYY-MM-DD; se non trovata usa null.`;

export const STATUS_OPTS = ["", "Molto alto", "Alto", "Normale", "Basso", "Molto basso", "Insufficiente", "Buono", "Obiettivo raggiunto"];

export const ZEPP_PROMPT = `Analizza questo screenshot dell'app Zepp Life e restituisci SOLO JSON valido con TUTTI i valori numerici e le etichette di stato presenti. Usa null per i campi non trovati. Esempio formato:{"peso":86.8,"punteggio":46,"tipologia":"Robusto","imc":30.3,"imc_status":"Molto alto","massa_grassa":31.3,"massa_grassa_status":"Alto","acqua":49.1,"acqua_status":"Insufficiente","grasso_viscerale":13,"grasso_viscerale_status":"Alto","muscoli":56.62,"muscoli_status":"Buono","proteine":16.2,"proteine_status":"Normale","metabolismo":1753,"metabolismo_status":"Obiettivo raggiunto","massa_ossea":3.04,"massa_ossea_status":"Normale"}`;

export const GROQ_SCHEDA_PROMPT = `Sei un assistente fitness. L'utente ti fornisce il testo estratto da un PDF di una scheda di allenamento in palestra.

REGOLA FONDAMENTALE: Se la scheda ha più giorni o split (es. "Giorno A", "Giorno B", "Day A", "Day B", "Upper", "Lower", "Push", "Pull", "Legs", "Sessione 1", "Allenamento A"), estrai OGNI giorno come elemento separato nell'array "giorni". Se invece è una singola sessione senza divisioni, mettila tutta in un unico elemento.

Per ogni esercizio includi: riscaldamento, cardio, pesi, stretching — tutto ciò che è presente nel PDF nell'ordine in cui appare.
Per ogni esercizio indica: nome, serie (intero, 1 per cardio), ripetizioni come stringa (es. "8-12", "10", "10 min"), pausa in secondi (default: 90 per pesi, 60 per cardio), note opzionali.

Rispondi SOLO con JSON valido (nessun testo, nessun markdown):
{"nomeScheda":"nome scheda","giorni":[{"nomeGiorno":"Giorno A - Push","esercizi":[{"nome":"Panca Piana","serie":4,"ripetizioni":"8-10","pausa":120,"note":""},{"nome":"Cardio Warm Up","serie":1,"ripetizioni":"10 min","pausa":0,"note":""}]},{"nomeGiorno":"Giorno B - Pull","esercizi":[{"nome":"Trazioni","serie":4,"ripetizioni":"6-8","pausa":120,"note":""}]}]}`;

export const GROQ_PROMPT = `Sei un assistente nutrizionale esperto. Estrai un piano alimentare settimanale dal testo di un PDF. Il PDF può usare uno di questi DUE formati:

FORMATO A — Tabella a colonne: colonne giorni × righe pasti, con eventuali colonne "ALT. PRANZO", "ALT. CENA", "ALT. SPUNTINO" come alternative.

FORMATO B — Schede giornaliere con opzioni: blocchi "GIORNO 1 - LUNEDI", "GIORNO 2 - MARTEDI", ecc. Ogni giorno contiene sezioni di pasto ("COLAZIONE", "PRANZO", "SPUNTINO", "MERENDA", "CENA") e ogni pasto ha più opzioni numerate "OPZIONE A", "OPZIONE B", "OPZIONE C", ... — TUTTE le opzioni di uno stesso pasto sono ALTERNATIVE EQUIVALENTI tra loro.

REGOLE DI ESTRAZIONE:
1. MAPPING GIORNI: 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab, 7=Dom. Includi sempre tutte e 7 le chiavi (anche se vuote).
2. ALTERNATIVE — REGOLA CRITICA: per OGNI opzione di un pasto crea un pasto separato e dai a TUTTE le opzioni dello stesso pasto lo STESSO 'altGroupId' (stringa univoca, es. "g1-colazione", "g3-cena"). NON saltare nessuna opzione: se vedi A, B, C, D, E devi creare 5 pasti con lo stesso altGroupId.
3. NOMI DEI PASTI: se l'opzione ha un titolo descrittivo (es. "OPZIONE A - Riso con tonno e pomodorini") usa nome = "Pranzo — Riso con tonno e pomodorini". Se non c'è titolo, usa la lettera: "Colazione A", "Colazione B", ecc. Mantieni la lingua del PDF.
4. ESTIMAZIONE KCAL (FONDAMENTALE — non lasciare MAI 0): se il PDF non riporta i kcal, STIMALI in base a grammi e alimento. Riferimenti utili:
   - Carboidrati crudi: 100g pasta/riso/avena = 350 kcal
   - Pane: 100g = 270 kcal | fette biscottate: 8g (1 fetta) = 32 kcal | biscotti secchi: ~40 kcal/biscotto
   - Olio EVO: 10g = 90 kcal | miele/marmellata: 20g = 60 kcal
   - Carne magra cruda: 100g pollo/tacchino/manzo magro = 110 kcal | 100g coniglio = 115 kcal
   - Carne grassa: 100g hamburger pollo = 165 kcal | 100g maiale arista = 160 kcal
   - Pesce magro: 100g orata/branzino/merluzzo/sogliola = 100 kcal | tonno naturale sgocciolato 100g = 110 kcal
   - Pesce grasso: 100g salmone = 180 kcal | pesce spada = 130 kcal | tonno fresco = 145 kcal
   - Affettati: 100g bresaola/crudo sgrassato = 150 kcal
   - Uova: 1 uovo (~60g) = 80 kcal | albume: 50g = 25 kcal
   - Formaggi: 100g grana = 390 kcal | mozzarella/fiordilatte = 250 kcal | ricotta = 150 kcal | fiocchi di latte = 100 kcal
   - Yogurt greco bianco: 150g = 90 kcal
   - Frutta secca (mandorle/noci/nocciole/anacardi): 20g = 120 kcal | cioccolato fondente: 20g = 110 kcal
   - Patate cotte: 100g = 85 kcal | legumi cotti: 100g = 110 kcal | piselli: 100g = 80 kcal | mais: 30g = 25 kcal
   - Verdure (grigliate/foglia verde/pomodori/carote/insalata): 100g = 25 kcal | salsa pomodoro/ragù: 1 mestolo (~60g) = 35 kcal
   - Vongole 100g (con guscio): 30 kcal
   Se l'opzione è "PASTO LIBERO" o "OPZIONE LIBERA", crea un pasto unico chiamato "Pasto libero" con un singolo alimento {nome:"Pasto libero", grammi:"", kcal:"800"}. Se l'opzione è "Colazione libera o saltata", crea comunque il pasto vuoto con un alimento {nome:"Colazione libera/saltata", grammi:"", kcal:"0"}.
5. ALIMENTI: per ogni alimento estrai nome, grammi (solo numero come stringa; se il PDF dice "150-200 g" usa la media "175"; se è "1 cucchiaio" mantieni il numero indicato in grammi tra parentesi), e kcal stimati. Includi TUTTI gli alimenti dell'opzione (proteina, carbo, condimento, verdure, frutta, ecc.).
6. ORDINE: i pasti del giorno devono seguire l'ordine naturale Colazione → Pranzo → Spuntino → (Merenda) → Cena.

Rispondi SOLO con JSON valido (NIENTE markdown, NIENTE testo prima o dopo):
{"nomePiano":"Nome del piano","giorniPasti":{"1":[{"nome":"Colazione A","altGroupId":"g1-cola","alimenti":[{"nome":"Fette biscottate","grammi":"32","kcal":"125"},{"nome":"Miele","grammi":"20","kcal":"60"}]},{"nome":"Colazione B","altGroupId":"g1-cola","alimenti":[{"nome":"Biscotti Oro Saiwa","grammi":"","kcal":"320"}]},{"nome":"Pranzo — Riso con tonno e pomodorini","altGroupId":"g1-pranzo","alimenti":[{"nome":"Riso","grammi":"70","kcal":"245"},{"nome":"Tonno al naturale","grammi":"120","kcal":"130"},{"nome":"Pomodorini","grammi":"175","kcal":"35"},{"nome":"Olio EVO","grammi":"10","kcal":"90"}]}],"2":[],"3":[],"4":[],"5":[],"6":[],"7":[]}}`;

export const GROQ_DAY_PROMPT = `Sei un assistente nutrizionale. Ricevi il testo di UN SOLO giorno di un piano alimentare. Il giorno contiene sezioni di pasto ("COLAZIONE", "PRANZO", "SPUNTINO", "MERENDA", "CENA") e ciascun pasto può avere più opzioni alternative "OPZIONE A", "OPZIONE B", "OPZIONE C", ... fino a "OPZIONE I".

REGOLE CRITICHE:
1. ESTRAI OGNI SINGOLA OPZIONE come pasto separato. Se vedi A, B, C, D, E devi creare 5 pasti. Se vedi A-I devi crearne 9. NON saltare nessuna opzione, NON unirle.
2. TUTTE le opzioni dello STESSO pasto devono avere lo STESSO 'altGroupId' (una stringa univoca per pasto, es. "cola", "pranzo", "spunt", "cena").
3. NOME PASTO:
   - Se l'opzione ha un titolo descrittivo (es. "OPZIONE A - Riso con tonno e pomodorini") → nome = "Pranzo — Riso con tonno e pomodorini"
   - Se NON ha titolo (solo "OPZIONE A" e lista alimenti) → nome = "Colazione A", "Colazione B", "Spuntino A", "Spuntino B", ecc.
4. KCAL OBBLIGATORI — STIMALI sempre, MAI 0. Tabella di riferimento:
   - 100g pasta/riso/avena crudi = 350 kcal | 100g pane = 270 kcal | 1 fetta biscottata (~8g) = 32 kcal | 1 biscotto secco = ~40 kcal
   - 10g olio EVO = 90 kcal | 20g miele/marmellata = 60 kcal
   - 100g pollo/tacchino/manzo magro/coniglio crudi = 110 kcal | 100g hamburger pollo = 165 kcal | 100g maiale arista/lonza = 160 kcal
   - 100g pesce magro (orata/branzino/merluzzo/sogliola) = 100 kcal | 100g tonno naturale sgocciolato = 110 kcal
   - 100g salmone = 180 kcal | 100g pesce spada = 130 kcal | 100g tonno fresco = 145 kcal | 100g vongole con guscio = 30 kcal
   - 100g bresaola/crudo sgrassato = 150 kcal | 1 uovo (~60g) = 80 kcal
   - 100g grana = 390 kcal | 100g mozzarella/fiordilatte = 250 kcal | 100g ricotta = 150 kcal
   - 150g yogurt greco bianco = 90 kcal | 20g cioccolato fondente = 110 kcal | 20g frutta secca (mandorle/noci/nocciole/anacardi) = 120 kcal
   - 100g patate cotte = 85 kcal | 100g legumi cotti = 110 kcal | 100g piselli = 80 kcal | 30g mais = 25 kcal
   - 100g verdure (grigliate/foglia verde/pomodori/carote/insalata/melanzane/broccoli/spinaci) = 25 kcal | 1 mestolo salsa pomodoro/ragù (~60g) = 35 kcal | 1 pugno rucola (~15g) = 5 kcal
   - 180g frutta di stagione = 90 kcal | 200-250g macedonia = 110 kcal
5. ALIMENTI: per ogni opzione estrai TUTTI gli alimenti elencati (proteina, carbo, condimento, verdure, frutta, ecc.). Grammi come stringa numerica: se "150-200 g" usa la media "175"; se "1 cucchiaio (10 g)" usa "10"; se "2 cucchiai (30 g)" usa "30"; se "1 ciotola/pugno" senza grammi usa stima ragionevole (insalata 50g, rucola 15g).
6. PASTO LIBERO: se l'opzione è "OPZIONE LIBERA" o "Pasto libero" → crea UN solo pasto {nome:"Pasto libero", altGroupId:"libero", alimenti:[{nome:"Pasto libero",grammi:"",kcal:"800"}]}.
7. COLAZIONE LIBERA/SALTATA: se "Colazione libera o saltata" → crea {nome:"Colazione libera/saltata", altGroupId:"cola", alimenti:[{nome:"Saltata",grammi:"",kcal:"0"}]}.
8. ORDINE: rispetta l'ordine Colazione → Pranzo → Spuntino → (Merenda) → Cena.

Rispondi SOLO con JSON valido, NIENTE markdown, NIENTE testo prima o dopo. Formato:
{"pasti":[{"nome":"Colazione A","altGroupId":"cola","alimenti":[{"nome":"Fette biscottate","grammi":"32","kcal":"128"},{"nome":"Miele","grammi":"20","kcal":"60"}]},{"nome":"Colazione B","altGroupId":"cola","alimenti":[{"nome":"Biscotti Oro Saiwa","grammi":"","kcal":"320"}]},{"nome":"Colazione C","altGroupId":"cola","alimenti":[{"nome":"Biscotti Magretti","grammi":"","kcal":"240"}]},{"nome":"Pranzo — Riso con tonno e pomodorini","altGroupId":"pranzo","alimenti":[{"nome":"Riso","grammi":"70","kcal":"245"},{"nome":"Tonno al naturale","grammi":"120","kcal":"130"},{"nome":"Pomodorini","grammi":"175","kcal":"35"},{"nome":"Olio EVO","grammi":"10","kcal":"90"}]}]}`;

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Barlow',sans-serif;}
.app{--bg:#080808;--sur:#111;--card:#181818;--bdr:#252525;--acc:#1E90FF;--acc2:rgba(30,144,255,.14);--dan:#FF3B30;--dan2:rgba(255,59,48,.12);--ok:#30D158;--txt:#F0F0F0;--dim:#BBBBBB;--mut:#888888;max-width:480px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--txt);transition:background .25s,color .25s;}
.app.light{--bg:#F0F2F5;--sur:#FFFFFF;--card:#FFFFFF;--bdr:#E0E4EC;--acc:#1570EF;--acc2:rgba(21,112,239,.1);--dan:#EF4444;--dan2:rgba(239,68,68,.1);--ok:#059669;--txt:#111827;--dim:#6B7280;--mut:#9CA3AF;}
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:var(--sur);border-top:1px solid var(--bdr);display:flex;z-index:100;}
.nb{flex:1;padding:10px 2px 8px;background:none;border:none;color:var(--mut);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px;font-family:'Barlow',sans-serif;font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;transition:color .15s;}
.nb.on{color:var(--acc);}
.content{flex:1;padding:16px 16px 88px;overflow-y:auto;}
h1.pt{font-family:'Bebas Neue',cursive;font-size:36px;letter-spacing:.05em;line-height:1;}
.sub{font-size:12px;color:var(--dim);margin-top:3px;}
.card{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:16px;margin-bottom:12px;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:11px 16px;border-radius:10px;border:none;cursor:pointer;font-family:'Barlow',sans-serif;font-weight:700;font-size:13px;letter-spacing:.05em;text-transform:uppercase;transition:all .15s;}
.btn-p{background:var(--acc);color:#fff;}.btn-p:hover{opacity:.9;}
.btn-s{background:var(--card);color:var(--txt);border:1px solid var(--bdr);}.btn-s:hover{border-color:var(--acc);color:var(--acc);}
.btn-full{width:100%;}
.bico{padding:7px;border-radius:8px;background:var(--card);border:1px solid var(--bdr);color:var(--dim);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;line-height:0;}
.bico:hover{border-color:var(--acc);color:var(--acc);}.bico.d:hover{border-color:var(--dan);color:var(--dan);}
.lbl{display:block;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--dim);margin-bottom:5px;}
.inp{width:100%;background:var(--sur);border:1px solid var(--bdr);border-radius:8px;padding:10px 13px;color:var(--txt);font-family:'Barlow',sans-serif;font-size:15px;outline:none;transition:border-color .15s;}
.inp:focus{border-color:var(--acc);}.inp::placeholder{color:var(--mut);}
.ig{margin-bottom:14px;}
.tag{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}
.tag-a{background:var(--acc2);color:var(--acc);}.tag-m{background:var(--bdr);color:var(--dim);}.tag-ok{background:rgba(5,150,105,.12);color:var(--ok);}
.exn{font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:.05em;}
.exs{display:flex;gap:12px;margin-top:5px;flex-wrap:wrap;}
.ep{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--dim);}.ep b{color:var(--txt);font-weight:700;}
.set-r{display:grid;grid-template-columns:22px 1fr 1fr 38px 28px;gap:6px;padding:6px 0;border-bottom:1px solid var(--bdr);align-items:center;}.set-r:last-child{border-bottom:none;}
.set-n{font-family:'Bebas Neue',cursive;font-size:20px;color:var(--mut);line-height:1;}.set-n.ok{color:var(--acc);}
.sinp{background:var(--card);border:1px solid var(--bdr);border-radius:6px;padding:7px 4px;color:var(--txt);font-family:'Barlow',sans-serif;font-size:15px;font-weight:700;width:100%;text-align:center;outline:none;transition:border-color .15s;}
.sinp:focus{border-color:var(--acc);}
.sck{width:28px;height:28px;border-radius:50%;border:2px solid var(--bdr);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;margin:0 auto;}
.sck.ok{background:var(--acc);border-color:var(--acc);}
.rest-ov{position:fixed;inset:0;background:rgba(0,0,0,.94);display:flex;align-items:center;justify-content:center;z-index:200;flex-direction:column;gap:12px;cursor:pointer;}
.rest-t{font-family:'Bebas Neue',cursive;font-size:110px;color:var(--acc);line-height:1;}
.rest-l{font-size:13px;color:var(--dim);text-transform:uppercase;letter-spacing:.12em;}
.mu{border:2px dashed var(--bdr);border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px;}.mu:hover{border-color:var(--acc);}
.mpv{width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-top:8px;}
.pbar{height:4px;background:var(--bdr);border-radius:2px;overflow:hidden;margin:8px 0;}
.pfil{height:100%;background:var(--acc);border-radius:2px;transition:width .4s;}
.div{height:1px;background:var(--bdr);margin:16px 0;}
.emp{text-align:center;padding:40px 20px;color:var(--mut);}
.emp-ic{font-size:40px;margin-bottom:10px;}
.emp-t{font-family:'Bebas Neue',cursive;font-size:20px;letter-spacing:.05em;color:var(--dim);margin-bottom:6px;}
.sc{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:16px;margin-bottom:10px;cursor:pointer;transition:border-color .15s;}.sc:hover{border-color:var(--acc);}
.bb{display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:var(--dim);cursor:pointer;font-family:'Barlow',sans-serif;font-size:12px;font-weight:600;padding:0;margin-bottom:14px;text-transform:uppercase;letter-spacing:.07em;transition:color .15s;}.bb:hover{color:var(--acc);}
.mov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:150;display:flex;align-items:flex-end;justify-content:center;}
.mod{background:var(--card);border:1px solid var(--bdr);border-radius:20px 20px 0 0;padding:22px;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;}
.wh{background:linear-gradient(135deg,var(--acc2) 0%,transparent 60%);border:1px solid var(--acc);border-radius:16px;padding:18px;margin-bottom:16px;}
.wt{font-family:'Bebas Neue',cursive;font-size:20px;letter-spacing:.05em;}
.wlv{font-family:'Bebas Neue',cursive;font-size:48px;color:var(--acc);letter-spacing:.05em;line-height:1;}
.st{font-family:'Bebas Neue',cursive;font-size:13px;letter-spacing:.15em;color:var(--mut);text-transform:uppercase;margin-bottom:9px;}
.hg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
.hsc{background:var(--card);border:1px solid var(--bdr);border-radius:14px;padding:14px;}
.hsv{font-family:'Bebas Neue',cursive;font-size:36px;color:var(--acc);letter-spacing:.05em;line-height:1;}
.hsl{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.08em;margin-top:3px;}
.sd{font-family:'Bebas Neue',cursive;font-size:19px;letter-spacing:.05em;}
.sdn{font-size:13px;color:var(--dim);margin-top:2px;}
.ss{display:flex;gap:16px;margin-top:10px;}
.ssv{font-size:13px;color:var(--mut);}.ssv b{display:block;font-size:18px;font-family:'Bebas Neue',cursive;color:var(--acc);letter-spacing:.05em;}
.chip-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:6px;}
.chip{padding:5px 12px;border-radius:20px;border:1px solid var(--bdr);background:none;color:var(--dim);font-family:'Barlow',sans-serif;font-size:12px;cursor:pointer;transition:all .15s;font-weight:600;}
.chip.on{background:var(--acc2);border-color:var(--acc);color:var(--acc);}
.stab-row{display:flex;gap:7px;margin-bottom:18px;overflow-x:auto;padding-bottom:2px;}
.stab{padding:7px 14px;border-radius:20px;border:1px solid var(--bdr);background:none;color:var(--dim);font-family:'Barlow',sans-serif;font-size:11px;cursor:pointer;font-weight:700;letter-spacing:.06em;text-transform:uppercase;transition:all .15s;white-space:nowrap;}
.stab.on{background:var(--acc2);border-color:var(--acc);color:var(--acc);}
.rpe-row{display:flex;gap:5px;flex-wrap:wrap;}
.rpe-btn{width:30px;height:30px;border-radius:6px;border:1px solid var(--bdr);background:none;color:var(--dim);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;font-family:'Barlow',sans-serif;}
.rpe-btn.on{background:var(--acc);border-color:var(--acc);color:#fff;}
.chart-wrap{width:100%;overflow:hidden;border-radius:8px;background:var(--sur);border:1px solid var(--bdr);padding:10px 8px 6px;}
.cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.cmp-card{background:var(--sur);border:1px solid var(--bdr);border-radius:10px;padding:12px;}
.cmp-h{font-size:10px;color:var(--dim);font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px;}
select.inp{appearance:none;cursor:pointer;}
textarea.inp{resize:vertical;min-height:64px;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:var(--bdr);}
@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fi .25s ease;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.pls{animation:pulse 1.5s infinite;}
.day-pill{display:flex;gap:5px;overflow-x:auto;margin-bottom:16px;padding-bottom:4px;}
.dpb{min-width:42px;padding:7px 6px;border-radius:8px;border:1px solid var(--bdr);background:none;color:var(--dim);font-family:'Barlow',sans-serif;font-size:10px;font-weight:700;cursor:pointer;transition:all .15s;text-align:center;white-space:nowrap;flex-shrink:0;}
.dpb.on{background:rgba(48,209,88,.15);border-color:#30D158;color:#30D158;}
.dpb.log{background:rgba(48,209,88,.06);border-color:rgba(48,209,88,.4);color:#30D158;}
.frow{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--bdr);gap:10px;}
.frow:last-child{border-bottom:none;}
.fck{width:26px;height:26px;border-radius:50%;border:2px solid var(--bdr);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;}
.fck.ok{background:#30D158;border-color:#30D158;}
.kcal-sum{background:rgba(48,209,88,.1);border:1px solid rgba(48,209,88,.3);border-radius:10px;padding:12px;margin:12px 0;}
.kcal-bar{height:6px;background:var(--bdr);border-radius:3px;overflow:hidden;margin-top:8px;}
.kcal-fill{height:100%;background:#30D158;border-radius:3px;transition:width .4s;}
.import-step{display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;background:var(--sur);border:1px solid var(--bdr);margin-bottom:8px;}
.import-num{width:24px;height:24px;border-radius:50%;background:var(--acc2);color:var(--acc);font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.spin{display:inline-block;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
.ex-icon{filter:invert(1) brightness(1.8);}
.app.light .ex-icon{filter:none;}
.chat-fab{position:fixed;bottom:85px;right:20px;width:56px;height:56px;border-radius:28px;background:var(--acc);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 15px rgba(30,144,255,.4);cursor:pointer;z-index:100;transition:all .2s;border:none;}
.chat-fab:active{transform:scale(.95);}
.chat-win{position:fixed;inset:0;background:var(--bg);z-index:1100;display:flex;flex-direction:column;animation:slideUp .3s ease;}
@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
.chat-h{padding:16px;border-bottom:1px solid var(--bdr);display:flex;justify-content:space-between;align-items:center;background:var(--sur);}
.chat-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;}
.msg{max-width:85%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.4;animation:fi .2s ease;}
.msg.ai{align-self:flex-start;background:var(--card);border:1px solid var(--bdr);border-bottom-left-radius:4px;}
.msg.user{align-self:flex-end;background:var(--acc);color:#fff;border-bottom-right-radius:4px;}
.chat-f{padding:12px;border-top:1px solid var(--bdr);background:var(--sur);display:flex;gap:8px;}
`;
