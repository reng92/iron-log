// Iron Log — mondo "Etichetta & Batteria"
// Pannelli come etichette nutrizionali (regole nere spesse/sottili, cifre tabulari),
// guscio verde da confezione, batterie NutrInform per i valori del giorno.
export const THEME_CSS = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
html,body{background:#0A0D12;}
body{font-family:'Archivo Variable',system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;}
button,input,select,textarea{font-family:inherit;}

.app{
  --fb:'Archivo Variable',system-ui,sans-serif;
  --fd:'Archivo Variable',system-ui,sans-serif;
  --pk:#0F2A5E; --pk2:#1B3F82; --pk-ink:#EEF3FF; --pk-dim:#A8BBE4;
  --bg:#0A0D12; --sur:#12161D; --card:#151A22; --bdr:#272E3A; --rule:#EEF2F8;
  --txt:#F1F4F9; --dim:#B2BACA; --mut:#8A93A6;
  --acc:#5B97FF; --acc2:rgba(91,151,255,.15); --acc-ink:#061230;
  --ok:#5B97FF; --wat:#3CC6E8; --wat2:rgba(60,198,232,.14);
  --dan:#FF5A5F; --dan2:rgba(255,90,95,.13); --warn:#F2A33A;
  --safe-t:max(env(safe-area-inset-top),var(--safe-area-inset-top,0px));
  --safe-b:max(env(safe-area-inset-bottom),var(--safe-area-inset-bottom,0px));
  max-width:480px;margin:0 auto;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;
  background:var(--bg);color:var(--txt);font-family:var(--fb);font-size:15px;line-height:1.4;
  font-variant-numeric:tabular-nums;transition:background .25s,color .25s;
}
.app.light{
  --pk:#163C88; --pk2:#2250AC; --pk-ink:#F3F6FF; --pk-dim:#BCCBEE;
  --bg:#E9EDF3; --sur:#FFFFFF; --card:#FFFFFF; --bdr:#D3D9E3; --rule:#0B0D12;
  --txt:#0B0D12; --dim:#454E5E; --mut:#646E82;
  --acc:#1F5FD6; --acc2:rgba(31,95,214,.10); --acc-ink:#FFFFFF;
  --ok:#1F5FD6; --wat:#0B88AE; --wat2:rgba(11,136,174,.10);
  --dan:#C8102E; --dan2:rgba(200,16,46,.09); --warn:#B76A00;
}
.app ::selection{background:var(--acc);color:var(--acc-ink);}
.app :focus-visible{outline:2px solid var(--acc);outline-offset:2px;}
.app input{caret-color:var(--acc);}

/* Testi con display inline legacy: grottesco condensato pesante */
.app [style*="--fd"]{font-stretch:75%;font-weight:800;letter-spacing:-.005em !important;}

/* ── Guscio ── */
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:var(--pk);display:flex;z-index:100;padding-bottom:var(--safe-b);}
.nb{flex:1;min-height:58px;padding:9px 2px 7px;background:none;border:none;color:var(--pk-dim);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:11px;font-weight:600;letter-spacing:.01em;position:relative;transition:color .15s;}
.nb::before{content:"";position:absolute;top:0;left:22%;right:22%;height:3px;background:var(--pk-ink);transform:scaleX(0);transition:transform .25s cubic-bezier(.2,.8,.2,1);}
.nb.on{color:var(--pk-ink);}
.nb.on::before{transform:scaleX(1);}
.nb:active{opacity:.7;}
.content{flex:1;padding:16px 16px calc(84px + var(--safe-b));padding-top:calc(16px + var(--safe-t));overflow-y:auto;}

h1.pt{font-family:var(--fd);font-stretch:75%;font-weight:800;font-size:34px;letter-spacing:-.01em;line-height:.95;}
.sub{font-size:13px;color:var(--dim);margin-top:4px;}

/* ── Contenitori ── */
.card{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:16px;margin-bottom:12px;}
.sc{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:16px;margin-bottom:10px;cursor:pointer;transition:border-color .15s;}
.mov{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:150;display:flex;align-items:flex-end;justify-content:center;animation:fade .2s ease-out;}
.mod{background:var(--sur);border-radius:16px 16px 0 0;box-shadow:0 -12px 32px -16px rgba(0,0,0,.5);padding:22px 20px calc(22px + var(--safe-b));width:100%;max-width:480px;max-height:88vh;overflow-y:auto;animation:sheet .32s cubic-bezier(.2,.9,.25,1);}
@keyframes sheet{from{transform:translateY(40px);opacity:.4}to{transform:none;opacity:1}}
@keyframes fade{from{opacity:0}to{opacity:1}}

/* ── Controlli ── */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:11px 16px;border-radius:10px;border:none;cursor:pointer;font-weight:700;font-size:14px;letter-spacing:.01em;transition:transform .12s,background .15s,border-color .15s,color .15s,opacity .15s;}
.btn:active{transform:scale(.97);}
.btn:disabled{opacity:.45;cursor:default;transform:none;}
.btn-p{background:var(--acc);color:var(--acc-ink);}
.btn-s{background:var(--card);color:var(--txt);border:1px solid var(--bdr);}
.btn-full{width:100%;}
.bico{min-width:40px;min-height:40px;padding:8px;border-radius:10px;background:var(--card);border:1px solid var(--bdr);color:var(--dim);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;line-height:0;}
.bico:active{transform:scale(.94);}
.bb{display:inline-flex;align-items:center;gap:6px;min-height:40px;background:none;border:none;color:var(--dim);cursor:pointer;font-size:14px;font-weight:600;padding:0;margin-bottom:10px;}
@media (hover:hover){
  .btn-p:hover{opacity:.92;}
  .btn-s:hover,.bico:hover{border-color:var(--acc);color:var(--acc);}
  .bico.d:hover{border-color:var(--dan);color:var(--dan);}
  .sc:hover{border-color:var(--acc);}
  .bb:hover{color:var(--acc);}
  .mu:hover{border-color:var(--acc);}
}
.lbl{display:block;font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--dim);margin-bottom:6px;}
.inp{width:100%;min-height:44px;background:var(--sur);border:1px solid var(--bdr);border-radius:10px;padding:10px 13px;color:var(--txt);font-size:16px;outline:none;transition:border-color .15s;}
.inp:focus{border-color:var(--acc);}.inp::placeholder{color:var(--mut);}
select.inp{appearance:none;cursor:pointer;}
textarea.inp{resize:vertical;min-height:64px;}
.ig{margin-bottom:14px;}
.tag{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:6px;font-size:12px;font-weight:700;}
.tag-a{background:var(--acc2);color:var(--acc);}.tag-m{background:var(--bdr);color:var(--dim);}.tag-ok{background:var(--acc2);color:var(--ok);}

/* Sottoschede: controllo segmentato */
.stab-row{display:flex;gap:4px;margin-bottom:16px;overflow-x:auto;padding:4px;background:var(--card);border:1px solid var(--bdr);border-radius:12px;scrollbar-width:none;}
.stab-row::-webkit-scrollbar{display:none;}
.stab{flex:1;min-height:38px;padding:8px 12px;border-radius:9px;border:none;background:none;color:var(--dim);font-size:13px;cursor:pointer;font-weight:700;transition:background .2s,color .2s;white-space:nowrap;}
.stab.on{background:var(--txt);color:var(--bg);}
.chip-row{display:flex;flex-wrap:wrap;gap:7px;margin-top:6px;}
.chip{min-height:34px;padding:6px 12px;border-radius:8px;border:1px solid var(--bdr);background:none;color:var(--dim);font-size:13px;cursor:pointer;transition:all .15s;font-weight:600;}
.chip.on{background:var(--acc2);border-color:var(--acc);color:var(--acc);}

/* ── Titoli e numeri legacy ── */
.st{font-size:13px;font-weight:800;letter-spacing:.01em;color:var(--txt);margin:18px 0 8px;padding-bottom:6px;border-bottom:3px solid var(--rule);}
.wt,.sd,.exn{font-family:var(--fd);font-stretch:75%;font-weight:800;letter-spacing:-.005em;}
.wt{font-size:22px;}.sd{font-size:20px;}.exn{font-size:22px;}
.wlv,.hsv{font-family:var(--fd);font-stretch:75%;font-weight:800;color:var(--txt);line-height:1;}
.wlv{font-size:48px;}.hsv{font-size:34px;}
.wh{background:var(--card);border:2px solid var(--rule);border-radius:12px;padding:18px;margin-bottom:16px;}
.hg{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
.hsc{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:14px;}
.hsl{font-size:12px;color:var(--mut);margin-top:4px;}
.sdn{font-size:13px;color:var(--dim);margin-top:2px;}
.ss{display:flex;gap:16px;margin-top:10px;}
.ssv{font-size:13px;color:var(--mut);}.ssv b{display:block;font-size:20px;font-family:var(--fd);font-stretch:75%;font-weight:800;color:var(--txt);}
.exs{display:flex;gap:12px;margin-top:5px;flex-wrap:wrap;}
.ep{display:flex;align-items:center;gap:4px;font-size:13px;color:var(--dim);}.ep b{color:var(--txt);font-weight:700;}

/* ── Allenamento live ── */
.set-r{display:grid;grid-template-columns:24px 1fr 1fr 40px 32px;gap:6px;padding:6px 0;border-bottom:1px solid var(--bdr);align-items:center;}.set-r:last-child{border-bottom:none;}
.set-n{font-family:var(--fd);font-stretch:75%;font-weight:800;font-size:20px;color:var(--mut);line-height:1;}.set-n.ok{color:var(--acc);}
.sinp{background:var(--sur);border:1px solid var(--bdr);border-radius:8px;min-height:44px;padding:7px 4px;color:var(--txt);font-size:17px;font-weight:700;width:100%;text-align:center;outline:none;transition:border-color .15s;font-variant-numeric:tabular-nums;}
.sinp:focus{border-color:var(--acc);}
.sck{width:32px;height:32px;border-radius:8px;border:2px solid var(--bdr);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;margin:0 auto;color:var(--acc-ink);}
.sck.ok{background:var(--acc);border-color:var(--acc);}
.rest-ov{position:fixed;inset:0;background:var(--pk);display:flex;align-items:center;justify-content:center;z-index:200;flex-direction:column;gap:12px;cursor:pointer;color:var(--pk-ink);}
.rest-t{font-family:var(--fd);font-stretch:62%;font-weight:900;font-size:128px;color:var(--pk-ink);line-height:1;}
.rest-l{font-size:14px;color:var(--pk-dim);font-weight:600;}
.rpe-row{display:flex;gap:5px;flex-wrap:wrap;}
.rpe-btn{width:36px;height:36px;border-radius:8px;border:1px solid var(--bdr);background:none;color:var(--dim);font-size:13px;font-weight:700;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;}
.rpe-btn.on{background:var(--acc);border-color:var(--acc);color:var(--acc-ink);}

/* ── Varie ── */
.mu{border:2px dashed var(--bdr);border-radius:10px;padding:16px;text-align:center;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px;}
.mpv{width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-top:8px;}
.pbar,.kcal-bar{height:8px;background:var(--bdr);border-radius:2px;overflow:hidden;margin:8px 0;}
.pfil,.kcal-fill{height:100%;background:var(--acc);border-radius:2px;}
.div{height:1px;background:var(--bdr);margin:16px 0;}
.emp{text-align:center;padding:40px 20px;color:var(--mut);}
.emp-ic{font-size:36px;margin-bottom:10px;}
.emp-t{font-family:var(--fd);font-stretch:75%;font-weight:800;font-size:22px;color:var(--txt);margin-bottom:6px;}
.chart-wrap{width:100%;overflow:hidden;border-radius:10px;background:var(--sur);border:1px solid var(--bdr);padding:10px 8px 6px;}
.cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.cmp-card{background:var(--sur);border:1px solid var(--bdr);border-radius:10px;padding:12px;}
.cmp-h{font-size:12px;color:var(--dim);font-weight:700;margin-bottom:6px;}
.day-pill{display:flex;gap:5px;overflow-x:auto;margin-bottom:16px;padding-bottom:4px;}
.dpb{min-width:44px;min-height:40px;padding:7px 6px;border-radius:8px;border:1px solid var(--bdr);background:none;color:var(--dim);font-size:12px;font-weight:700;cursor:pointer;transition:all .15s;text-align:center;white-space:nowrap;flex-shrink:0;}
.dpb.on{background:var(--txt);border-color:var(--txt);color:var(--bg);}
.dpb.log{border-color:var(--acc);color:var(--acc);}
.frow{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--bdr);gap:10px;}
.frow:last-child{border-bottom:none;}
.fck{width:28px;height:28px;border-radius:8px;border:2px solid var(--bdr);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;color:var(--acc-ink);}
.fck.ok{background:var(--acc);border-color:var(--acc);}
.kcal-sum{background:var(--card);border:2px solid var(--rule);border-radius:10px;padding:12px;margin:12px 0;}
.import-step{display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;background:var(--sur);border:1px solid var(--bdr);margin-bottom:8px;}
.import-num{width:24px;height:24px;border-radius:6px;background:var(--acc2);color:var(--acc);font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.spin{display:inline-block;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.fi{animation:fi .28s cubic-bezier(.2,.8,.2,1);}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.pls{animation:pulse 1.5s infinite;}
.ex-icon{filter:invert(1) brightness(1.8);}
.app.light .ex-icon{filter:none;}
.app ::-webkit-scrollbar{width:4px;height:4px;}.app ::-webkit-scrollbar-thumb{background:var(--bdr);border-radius:2px;}

/* ═══ Etichetta: componenti della Home "Oggi" ═══ */
.pack{margin:calc(-16px - var(--safe-t)) -16px 0;padding:calc(18px + var(--safe-t)) 16px 40px;background:var(--pk);color:var(--pk-ink);}
.pack-top{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;}
.pack-hi{font-stretch:75%;font-weight:850;font-size:40px;line-height:.92;letter-spacing:-.015em;}
.pack-date{font-size:14px;color:var(--pk-dim);margin-top:6px;font-weight:500;}
.pack-chip{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:5px 10px;border-radius:6px;background:rgba(255,255,255,.12);font-size:13px;font-weight:700;color:var(--pk-ink);}
.pack-av{width:44px;height:44px;border-radius:50%;border:2px solid var(--pk-ink);background:var(--pk2);color:var(--pk-ink);display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;flex-shrink:0;padding:0;}
.pack-av img{width:100%;height:100%;object-fit:cover;}

.lab{position:relative;background:var(--sur);color:var(--txt);border:2px solid var(--rule);border-radius:6px;padding:12px 14px 10px;margin-bottom:14px;}
.lab.lift{margin-top:-28px;box-shadow:0 10px 24px -12px rgba(0,0,0,.45);}
.lab-h{display:flex;justify-content:space-between;align-items:baseline;gap:8px;}
.lab-t{font-stretch:75%;font-weight:900;font-size:28px;line-height:1;letter-spacing:-.01em;}
.lab-meta{font-size:12px;color:var(--dim);text-align:right;}
.r8{height:8px;background:var(--rule);margin:8px -14px 0;}
.r4{height:4px;background:var(--rule);margin:0 -14px;}
.r1{height:1px;background:var(--rule);opacity:.9;}
.lab-cols{display:flex;justify-content:space-between;font-size:12px;font-weight:700;padding:5px 0;border-bottom:1px solid var(--rule);}
.lab-row{padding:10px 0;border-bottom:1px solid var(--rule);}
.lab-row:last-child{border-bottom:none;}
.lab-line{display:flex;justify-content:space-between;align-items:baseline;gap:10px;}
.lab-k{font-size:16px;font-weight:800;}
.lab-v{font-size:16px;font-weight:800;white-space:nowrap;}
.lab-v small{font-size:13px;font-weight:500;color:var(--dim);}
.lab-src{font-size:12px;color:var(--mut);margin-top:6px;}
.lab-foot{font-size:11.5px;color:var(--dim);padding-top:8px;line-height:1.4;}
.lab-act{display:flex;gap:6px;margin-top:10px;}
.lab-act .btn{flex:1;min-height:40px;padding:8px 6px;font-size:14px;}

/* Batteria NutrInform */
.bat{display:flex;align-items:center;gap:8px;margin-top:8px;}
.bat-body{position:relative;flex:1;height:22px;border:2px solid var(--txt);border-radius:4px;padding:2px;}
.bat-body::after{content:"";position:absolute;right:-6px;top:5px;width:4px;height:8px;background:var(--txt);border-radius:0 2px 2px 0;}
.bat-fill{width:100%;height:100%;border-radius:1px;background:var(--acc);transform-origin:left center;transition:transform .7s cubic-bezier(.2,.8,.2,1),background-color .3s;}
.bat-fill.wat{background:var(--wat);}
.bat-fill.over{background:var(--dan);}
.bat-fill.empty{background:transparent;}
.bat-pct{min-width:46px;text-align:right;font-weight:800;font-size:15px;}

/* Righe allenamento / pasto */
.wk{display:flex;align-items:center;gap:12px;}
.wk-ic{width:44px;height:44px;border-radius:10px;background:var(--txt);color:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.wk-ic.rest{background:var(--bdr);color:var(--dim);}
.wk-name{font-stretch:80%;font-weight:850;font-size:20px;line-height:1.05;}
.wk-sub{font-size:13px;color:var(--dim);margin-top:2px;}

.ing{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px solid var(--bdr);font-size:15px;}
.ing:last-of-type{border-bottom:none;}
.ing b{font-weight:800;white-space:nowrap;}
.ing.done{color:var(--mut);text-decoration:line-through;text-decoration-thickness:1px;}

/* Settimana: tabella a segni con scala fissa */
.wtab{width:100%;border-collapse:collapse;font-size:12px;}
.wtab th{font-weight:800;padding:4px 0 6px;text-align:center;color:var(--dim);}
.wtab th.today{color:var(--txt);}
.wtab td{text-align:center;padding:5px 0;border-top:1px solid var(--bdr);}
.wtab td.k{text-align:left;font-weight:700;font-size:13px;color:var(--txt);white-space:nowrap;padding-right:6px;}
.wtab td.today,.wtab th.today{background:var(--acc2);}
.mk{display:inline-block;width:8px;height:8px;border-radius:2px;border:1.5px solid var(--mut);vertical-align:middle;}
.mk.on{width:14px;height:14px;border:none;background:var(--txt);}
.mk.part{width:11px;height:11px;border:none;background:var(--mut);}
.mk.fut{border-color:var(--bdr);}

.seen-new{animation:newpulse 2.4s ease-in-out infinite;}
@keyframes newpulse{0%,100%{box-shadow:0 0 0 0 var(--acc2)}50%{box-shadow:0 0 0 6px var(--acc2)}}

/* ═══ Allenamento live: un esercizio per schermata ═══ */
.live{display:flex;flex-direction:column;min-height:100vh;min-height:100dvh;}
.live-top{position:sticky;top:0;z-index:20;background:var(--pk);color:var(--pk-ink);padding:calc(10px + var(--safe-t)) 16px 10px;}
.live-bar{display:flex;align-items:center;gap:10px;}
.live-x{width:40px;height:40px;border-radius:10px;border:1px solid rgba(255,255,255,.25);background:none;color:var(--pk-ink);display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;}
.live-name{flex:1;font-stretch:80%;font-weight:800;font-size:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.live-time{font-stretch:75%;font-weight:900;font-size:28px;letter-spacing:-.01em;}
.live-prog{display:flex;align-items:center;gap:10px;margin-top:8px;font-size:13px;font-weight:700;color:var(--pk-dim);}
.live-prog-b{flex:1;height:10px;border:2px solid var(--pk-ink);border-radius:3px;padding:1px;}
.live-prog-f{height:100%;background:var(--pk-ink);transform-origin:left center;transition:transform .5s cubic-bezier(.2,.8,.2,1);}
.live-dots{display:flex;gap:6px;margin-top:10px;}
.live-dot{flex:1;height:6px;border-radius:2px;border:none;background:rgba(255,255,255,.22);cursor:pointer;padding:0;transition:background .2s;}
.live-dot.ok{background:var(--pk-dim);}
.live-dot.on{background:var(--pk-ink);}
.live-dot.end{flex:0 0 18px;}
.pager{flex:1;display:flex;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;}
.pager::-webkit-scrollbar{display:none;}
.page{flex:0 0 100%;scroll-snap-align:start;scroll-snap-stop:always;padding:16px 16px calc(24px + var(--safe-b));overflow-y:auto;}
.live-count{font-size:13px;font-weight:700;color:var(--dim);}
.live-ex{font-stretch:75%;font-weight:900;font-size:34px;line-height:.98;letter-spacing:-.01em;margin-top:4px;}
.live-meta{display:flex;align-items:center;gap:4px;font-size:14px;color:var(--dim);margin-top:6px;}
.live-meta svg{width:16px;height:16px;}
.live-note{font-size:14px;color:var(--txt);margin-top:8px;padding:8px 10px;background:var(--acc2);border-radius:8px;}
.live-prev{font-size:14px;color:var(--dim);margin-top:8px;}
.live-prev b{color:var(--txt);font-weight:800;margin-right:4px;}
.live-head{display:grid;grid-template-columns:44px 1fr 1fr 52px 52px;gap:8px;font-size:12px;font-weight:800;padding:8px 0 6px;border-bottom:1px solid var(--rule);text-align:center;}
.live-head span:first-child{text-align:left;}
.live-set{display:grid;grid-template-columns:44px 1fr 1fr 52px 52px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--bdr);transition:background .2s;}
.live-set .sinp{min-height:52px;font-size:20px;}
.live-n{font-stretch:75%;font-weight:900;font-size:26px;color:var(--mut);}
.live-set.done .live-n{color:var(--acc);}
.live-set.done .sinp{border-color:transparent;background:var(--acc2);}
.live-rpe{height:52px;border-radius:8px;border:1px solid var(--bdr);background:var(--sur);color:var(--mut);font-size:16px;font-weight:800;cursor:pointer;}
.live-rpe.on{border-color:var(--acc);color:var(--acc);background:var(--acc2);}
.live-ck{height:52px;border-radius:10px;border:2px solid var(--bdr);background:none;color:var(--mut);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s,border-color .15s,transform .12s;}
.live-ck:active{transform:scale(.94);}
.live-ck.ok{background:var(--acc);border-color:var(--acc);color:var(--acc-ink);}
.live-rpe-pick{padding:10px 0 4px;}
.live-rpe-pick .rpe-btn{width:auto;flex:1;height:44px;font-size:16px;}
.live-hint{font-size:12px;color:var(--mut);margin-top:6px;}
.live-nav{display:flex;gap:8px;}
.live-nav .btn{flex:1;min-height:50px;}
.live-sum{display:flex;justify-content:space-between;gap:10px;width:100%;padding:11px 0;border:none;border-bottom:1px solid var(--bdr);background:none;color:var(--txt);font-size:15px;text-align:left;cursor:pointer;}
.live-sum b{white-space:nowrap;}
.live-sum b span{color:var(--mut);font-weight:500;}
.rest-bat{width:220px;height:22px;border:3px solid var(--pk-ink);border-radius:5px;padding:3px;}
.rest-bat div{height:100%;background:var(--pk-ink);transform-origin:left center;transition:transform 1s linear;}
.rest-act{display:flex;gap:10px;margin-top:18px;}
.rest-act .btn{min-width:110px;background:rgba(255,255,255,.14);color:var(--pk-ink);}

/* Righe storico (peso ecc.) */
.hrow-w{border-bottom:1px solid var(--bdr);}
.hrow-w:last-child{border-bottom:none;}
.hrow{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;padding:8px 0;border:none;background:none;color:var(--txt);text-align:left;cursor:pointer;font-size:15px;}
.hrow svg{color:var(--mut);transition:transform .2s;flex-shrink:0;}
.hrow[aria-expanded=true] svg{transform:rotate(90deg);}
.hrow-d{flex:1;display:flex;align-items:center;flex-wrap:wrap;gap:2px;}
.hrow-v{font-weight:800;font-size:17px;white-space:nowrap;display:flex;align-items:baseline;gap:8px;}
.hrow-v small{font-size:13px;font-weight:700;color:var(--mut);min-width:36px;text-align:right;}
.hrow-v small.dn{color:var(--acc);}
.hrow-v small.up{color:var(--warn);}
.hrow-w > div{padding-bottom:12px;}

@media (prefers-reduced-motion:reduce){
  .app *,.app *::before,.app *::after{animation-duration:.01ms !important;transition-duration:.01ms !important;}
}
`;
