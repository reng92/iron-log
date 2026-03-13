import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ilvlyocxcbmdwrvnhynp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsdmx5b2N4Y2JtZHdydm5oeW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODY0NjMsImV4cCI6MjA4ODk2MjQ2M30.KXUtvvIrml3oZyHy6g_zeSK8dt2APXNWqK_4-BUN4To";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── UTILS ────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const fmtDur = s => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60; return h?`${h}h ${m}m`:(m?`${m}m ${sc}s`:`${sc}s`); };
const fmtDate = d => new Date(d).toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
const fmtShort = d => new Date(d).toLocaleDateString('it-IT',{day:'numeric',month:'short'});
const fmtIso = (d=new Date()) => { const dt=d instanceof Date?d:new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
const epley = (kg,reps) => +reps===1?+kg:Math.round(+kg*(1+(+reps/30))*10)/10;
const GG = ["Lun","Mar","Mer","Gio","Ven","Sab","Dom"];
const GIORNI_LABEL = ["","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato","Domenica"];
const GIORNI_SHORT = ["","Lun","Mar","Mer","Gio","Ven","Sab","Dom"];

// ─── DB ───────────────────────────────────────────────────
const db = {
  async getSchede() { const {data}=await sb.from("schede").select("*"); return data?data.map(r=>r.data):[]; },
  async setSchede(a) { await sb.from("schede").delete().neq("id","__x__"); if(a.length)await sb.from("schede").insert(a.map(s=>({id:s.id,data:s}))); },
  async getSessioni() { const {data}=await sb.from("sessioni").select("*").order("created_at",{ascending:false}); return data?data.map(r=>r.data):[]; },
  async addSessione(s) { await sb.from("sessioni").insert({id:s.id,data:s}); },
  async delSessione(id) { await sb.from("sessioni").delete().eq("id",id); },
  async getPeso() { const {data}=await sb.from("peso").select("*").order("data",{ascending:true}); return data||[]; },
  async addPeso(p) { await sb.from("peso").insert(p); },
  async delPeso(id) { await sb.from("peso").delete().eq("id",id); },
  async getSettings() { try{ const {data}=await sb.from("impostazioni").select("*").eq("id","settings").single(); return data?.data||{}; }catch{return{};} },
  async saveSettings(s) { await sb.from("impostazioni").upsert({id:"settings",data:s}); },
  
  // -- NUOVE CHIAMATE PER LA DIETA --
  async getPiani() { const {data}=await sb.from("piani_alimentari").select("*"); return data?data.map(r=>r.data):[]; },
  async setPiani(a) { await sb.from("piani_alimentari").delete().neq("id","__x__"); if(a.length)await sb.from("piani_alimentari").insert(a.map(s=>({id:s.id,data:s}))); },
  async getLogDieta() { const {data}=await sb.from("log_dieta").select("*").order("created_at",{ascending:false}); return data?data.map(r=>r.data):[]; },
  async addLogDieta(s) { await sb.from("log_dieta").insert({id:s.id,data:s}); },
  async delLogDieta(id) { await sb.from("log_dieta").delete().eq("id",id); },
  async getBozza() { try{ const {data}=await sb.from("impostazioni").select("*").eq("id","sessione_bozza").single(); return data?.data||null; }catch{return null;} },
  async saveBozza(b) { await sb.from("impostazioni").upsert({id:"sessione_bozza",data:b}); },
  async delBozza() { await sb.from("impostazioni").delete().eq("id","sessione_bozza"); }
};

// ─── CSV EXPORT ───────────────────────────────────────────
const exportCSV = (sessioni) => {
  const rows = [["Data","Scheda","Durata (min)","Esercizio","Serie","KG","Reps","RPE","Completata"]];
  sessioni.forEach(s => s.esercizi.forEach(e => e.serie.forEach((sr,i) => {
    rows.push([new Date(s.data).toLocaleDateString('it-IT'),s.schedaNome,s.durata||0,e.nome,i+1,sr.kg||"",sr.reps||"",sr.rpe||"",sr.completata?"Sì":"No"]);
  })));
  const csv="\ufeff"+rows.map(r=>r.join(";")).join("\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8;"}));
  a.download=`renatos-workout-${fmtIso()}.csv`; a.click();
};

// ─── CSS ──────────────────────────────────────────────────
const CSS = `
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
`;

// ─── ICONS ────────────────────────────────────────────────
const Ico = ({d,size=20,fill="none",sw=1.8,stroke="currentColor"}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d)?d.map((p,i)=><path key={i} d={p}/>):<path d={d}/>}
  </svg>
);
const IcHome=()=><Ico d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10"/>;
const IcBook=()=><Ico d={["M4 19.5A2.5 2.5 0 016.5 17H20","M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"]}/>;
const IcHistory=()=><Ico d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>;
const IcChart=()=><Ico d="M18 20V10M12 20V4M6 20v-6"/>;
const IcWeight=()=><Ico d="M12 2a10 10 0 100 20A10 10 0 0012 2z M12 6a6 6 0 100 12A6 6 0 0012 6z"/>;
const IcPlus=()=><Ico d="M12 5v14M5 12h14"/>;
const IcTrash=()=><Ico d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>;
const IcEdit=()=><Ico d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7 M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>;
const IcCheck=()=><Ico d="M20 6L9 17l-5-5"/>;
const IcChevL=()=><Ico d="M15 18l-6-6 6-6"/>;
const IcClose=()=><Ico d="M18 6L6 18M6 6l12 12"/>;
const IcPlay=()=><Ico d="M5 3l14 9-14 9V3z" fill="currentColor" sw={0}/>;
const IcTimer=()=><Ico d="M12 6v6l4 2 M12 2a10 10 0 100 20A10 10 0 0012 2z"/>;
const IcCamera=()=><Ico d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z M12 17a4 4 0 100-8 4 4 0 000 8z"/>;
const IcImg=()=><Ico d={["M21 15l-5-5L5 21","M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z","M8.5 8.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"]}/>;
const IcSun=()=><Ico d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42 M12 8a4 4 0 100 8 4 4 0 000-8z"/>;
const IcMoon=()=><Ico d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>;
const IcDownload=()=><Ico d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>;
const IcCalc=()=><Ico d={["M5 4a2 2 0 012-2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4z","M9 9h6M9 13h3M9 17h1"]}/>;
const IcArrowUp=(props)=><Ico {...props} d="M18 15l-6-6-6 6"/>;
const IcArrowDown=(props)=><Ico {...props} d="M6 9l6 6 6-6"/>;
const IcApple=()=><Ico d="M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 2V6" />;
const IcUser=()=><Ico d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z"/>;
const IcFile=()=><Ico d={["M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z","M14 2v6h6","M16 13H8M16 17H8M10 9H8"]}/>;
const IcUpload=()=><Ico d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>;

// ─── LINE CHART ───────────────────────────────────────────
function LineChart({ data, color = "#1E90FF", height = 110 }) {
  if (!data || data.length < 2) return (
    <div style={{textAlign:"center",padding:"16px",color:"var(--mut)",fontSize:12}}>Almeno 2 rilevazioni per il grafico</div>
  );
  const W=300,H=height,PL=34,PR=6,PT=14,PB=22;
  const iW=W-PL-PR, iH=H-PT-PB;
  const vals=data.map(d=>+d.y);
  const mn=Math.min(...vals), mx=Math.max(...vals), rng=mx-mn||1;
  const px=i=>PL+i/(data.length-1)*iW;
  const py=v=>PT+(1-(v-mn)/rng)*iH;
  const pts=data.map((d,i)=>`${px(i)},${py(+d.y)}`).join(" ");
  const step=Math.max(1,Math.ceil(data.length/6));
  const yTicks=[mn, mn+rng/2, mx];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block",height}}>
      <polygon points={`${PL},${PT+iH} ${pts} ${px(data.length-1)},${PT+iH}`} fill={color} opacity=".08"/>
      {yTicks.map((v,i)=>(
        <line key={i} x1={PL} x2={W-PR} y1={py(v)} y2={py(v)} stroke="var(--bdr)" strokeWidth=".5"/>
      ))}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      {data.map((d,i)=>(
        <g key={i}>
          <circle cx={px(i)} cy={py(+d.y)} r="3" fill={color}/>
          {i%step===0&&<text x={px(i)} y={H-4} textAnchor="middle" fill="var(--mut)" fontSize="7.5" fontFamily="Barlow,sans-serif">{d.label}</text>}
        </g>
      ))}
      {yTicks.map((v,i)=>(
        <text key={i} x={PL-3} y={py(v)+3} textAnchor="end" fill="var(--mut)" fontSize="7" fontFamily="Barlow,sans-serif">{Math.round(v*10)/10}</text>
      ))}
    </svg>
  );
}

// ─── APP ──────────────────────────────────────────────────
export default function App() {
  // Stati per il PIN
  const [isLogged, setIsLogged] = useState(localStorage.getItem("rw_logged") === "true");
  const [pinInput, setPinInput] = useState("");

  const [tab,setTab]=useState("home");
  const [schede,setSchede]=useState([]);
  const [sessioni,setSessioni]=useState([]);
  const [peso,setPeso]=useState([]);
  const [settings,setSettings]=useState({darkMode:true});
  
  // -- Nuovi stati per la dieta --
  const [piani, setPiani] = useState([]);
  const [logDieta, setLogDieta] = useState([]);

  const [subview,setSubview]=useState(null);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    (async()=>{
    const [sc,ss,ps,st,pa,ld]=await Promise.all([
      db.getSchede().catch(()=>[]),
      db.getSessioni().catch(()=>[]),
      db.getPeso().catch(()=>[]),
      db.getSettings().catch(()=>({})),
      db.getPiani().catch(()=>[]),
      db.getLogDieta().catch(()=>[])
    ]);
    setSchede(sc||[]); setSessioni(ss||[]); setPeso(ps||[]); 
    setSettings({darkMode:true,...st}); 
    setPiani(pa||[]); setLogDieta(ld||[]);
    setLoaded(true);
    })();
  },[]);

  const saveSchede=async s=>{setSchede(s);await db.setSchede(s);};
  const addSessione=async s=>{setSessioni(p=>[s,...p]);await db.addSessione(s);};
  const delSessione=async id=>{setSessioni(p=>p.filter(s=>s.id!==id));await db.delSessione(id);};
  const addPeso=async p=>{setPeso(prev=>[...prev,p].sort((a,b)=>a.data.localeCompare(b.data)));await db.addPeso(p);};
  const delPeso=async id=>{setPeso(p=>p.filter(x=>x.id!==id));await db.delPeso(id);};
  const toggleDark=async()=>{const n={...settings,darkMode:!settings.darkMode};setSettings(n);await db.saveSettings(n);};
  const saveSettings=async n=>{setSettings(n);await db.saveSettings(n);};
  
  // -- Nuove funzioni salvataggio Dieta --
  const savePiani=async p=>{setPiani(p);await db.setPiani(p);};
  const handleAddLogDieta=async l=>{setLogDieta(prev=>[l,...prev]);await db.addLogDieta(l);};
  const handleDelLogDieta=async id=>{setLogDieta(p=>p.filter(x=>x.id!==id));await db.delLogDieta(id);};

  const dark=settings.darkMode!==false;
  const cls=`app${dark?"":" light"}`;

  // SCHERMATA DI BLOCCO PIN
  if (!isLogged) {
    return (
      <div className={cls}>
        <style>{CSS}</style>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: 20 }}>
          <div style={{fontSize: 50, marginBottom: 10}}>🔒</div>
          <h1 className="pt" style={{ textAlign: "center", marginBottom: 8 }}>ACCESSO<br/>RISERVATO</h1>
          <p className="sub" style={{marginBottom: 30}}>Inserisci il PIN per entrare</p>
          
          <input 
            type="password" 
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="••••" 
            className="inp"
            style={{ textAlign: "center", fontSize: 24, letterSpacing: "8px", width: "160px", marginBottom: 20 }}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
          />
          <button 
            className="btn btn-p"
            style={{ width: "160px", padding: "14px" }}
            onClick={() => {
              if (pinInput === "3103") {
                localStorage.setItem("rw_logged", "true");
                setIsLogged(true);
              } else {
                alert("PIN Errato! Riprova.");
                setPinInput("");
              }
            }}
          >
            SBLOCCA
          </button>
        </div>
      </div>
    );
  }

  // CARICAMENTO NORMALE APP
  if(!loaded) return (
    <div className={cls}>
      <style>{CSS}</style>
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",flex:1}}>
        <div className="pls" style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"#1E90FF",letterSpacing:".1em"}}>CARICAMENTO...</div>
      </div>
    </div>
  );

  if(subview?.type==="scheda-edit") return (
    <div className={cls}><style>{CSS}</style>
      <SchedaEdit scheda={subview.data} onSave={sc=>{const n=sc.id?schede.map(s=>s.id===sc.id?sc:s):[...schede,{...sc,id:genId()}];saveSchede(n);setSubview(null);}} onBack={()=>setSubview(null)}/>
    </div>
  );
  if(subview?.type==="allenamento") return (
    <div className={cls}><style>{CSS}</style>
      <Allenamento scheda={subview.data} sessioni={sessioni} onComplete={s=>{addSessione(s);setSubview(null);setTab("storico");}} onBack={()=>setSubview(null)}/>
    </div>
  );
  if(subview?.type==="sessione") return (
    <div className={cls}><style>{CSS}</style>
      <SessioneDetail sessione={subview.data} sessioni={sessioni} onBack={()=>setSubview(null)}/>
    </div>
  );
  
  if(subview?.type==="piano-edit") return (
    <div className={cls}><style>{CSS}</style>
      <PianoEdit 
        piano={subview.data} 
        onSave={p=>{
          const n=p.id ? piani.map(x=>x.id===p.id?p:x) : [...piani,{...p,id:genId()}];
          savePiani(n);
          setSubview(null);
        }} 
        onBack={()=>setSubview(null)}
      />
    </div>
  );
  if(subview?.type==="dieta-log") return (
    <div className={cls}><style>{CSS}</style>
      <DietaLog
        piani={piani}
        logDieta={logDieta}
        onAdd={handleAddLogDieta}
        onDelete={handleDelLogDieta}
        onBack={()=>setSubview(null)}
      />
    </div>
  );

  return (
    <div className={cls}>
      <style>{CSS}</style>
      <div className="content fi">
        {tab==="home"&&<Home schede={schede} sessioni={sessioni} dark={dark} onToggleDark={toggleDark} onStart={sc=>setSubview({type:"allenamento",data:sc})} onGoSchede={()=>setTab("schede")}/>}
        {tab==="schede"&&<Schede schede={schede} onNew={()=>setSubview({type:"scheda-edit",data:{nome:"",giorni:[],esercizi:[]}})} onEdit={sc=>setSubview({type:"scheda-edit",data:sc})} onDelete={id=>saveSchede(schede.filter(s=>s.id!==id))} onStart={sc=>setSubview({type:"allenamento",data:sc})}/>}
        
        {/* -- Nuova Tab Dieta -- */}
        {tab==="dieta"&&<PianiAlimentari piani={piani} logDieta={logDieta} onNew={()=>setSubview({type:"piano-edit",data:{nome:"",durataGiorni:56,pasti:[]}})} onEdit={p=>setSubview({type:"piano-edit",data:p})} onDelete={id=>savePiani(piani.filter(p=>p.id!==id))} onLog={()=>setSubview({type:"dieta-log", data:null})} />}
        
        {tab==="storico"&&<Storico sessioni={sessioni} onDetail={s=>setSubview({type:"sessione",data:s})} onDelete={delSessione}/>}
        {tab==="stats"&&<Stats sessioni={sessioni}/>}
        {tab==="peso"&&<Peso peso={peso} onAdd={addPeso} onDelete={delPeso}/>}
        {tab==="profilo"&&<Profilo settings={settings} peso={peso} onSave={saveSettings}/>}
      </div>
      <nav className="nav">
        {[["home","HOME",<IcHome/>],["schede","SCHEDE",<IcBook/>],["dieta","DIETA",<IcApple/>],["storico","LOG",<IcHistory/>],["stats","STATS",<IcChart/>],["peso","PESO",<IcWeight/>],["profilo","IO",<IcUser/>]].map(([t,l,ic])=>(
          <button key={t} className={`nb${tab===t?" on":""}`} onClick={()=>setTab(t)}>{ic}<span>{l}</span></button>
        ))}
      </nav>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────
function Home({schede,sessioni,dark,onToggleDark,onStart,onGoSchede}) {
  const [pick,setPick]=useState(false);
  const totKg=sessioni.reduce((a,s)=>a+s.esercizi.reduce((b,e)=>b+e.serie.reduce((c,sr)=>c+(sr.completata?(+sr.kg||0)*(+sr.reps||0):0),0),0),0);
  const avgMin=sessioni.length?Math.round(sessioni.reduce((a,s)=>a+(s.durata||0),0)/sessioni.length):0;
  const last=sessioni[0];
  const todayIdx=(new Date().getDay()+6)%7;
  const suggested=schede.find(s=>s.giorni?.includes(todayIdx));

  const records=useMemo(()=>{
    const rec={};
    sessioni.forEach(s=>s.esercizi.forEach(e=>e.serie.filter(sr=>sr.completata&&+sr.kg>0).forEach(sr=>{
      if(!rec[e.nome]||+sr.kg>rec[e.nome].kg) rec[e.nome]={kg:+sr.kg,reps:sr.reps,data:s.data};
    })));
    return Object.entries(rec).sort((a,b)=>b[1].kg-a[1].kg).slice(0,5);
  },[sessioni]);

  return (
    <>
      <div style={{paddingTop:20,paddingBottom:8,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><h1 className="pt">RENATO'S<br/>WORKOUT</h1><p className="sub">{new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}</p></div>
        <button className="bico" onClick={onToggleDark} title="Cambia tema">{dark?<IcSun/>:<IcMoon/>}</button>
      </div>

      <div className="hg" style={{marginTop:14}}>
        {[[sessioni.length,"Sessioni"],[schede.length,"Schede"],[Math.round(totKg/1000)||0,"Ton. totali"],[avgMin,"Min avg"]].map(([v,l])=>(
          <div key={l} className="hsc"><div className="hsv">{v}</div><div className="hsl">{l}</div></div>
        ))}
      </div>

      {suggested&&(
        <div className="card" style={{background:"var(--acc2)",borderColor:"var(--acc)",marginBottom:12}}>
          <div style={{fontSize:11,color:"var(--acc)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",marginBottom:4}}>📅 Oggi — {GG[todayIdx]}</div>
          <div className="sd">{suggested.nome}</div>
          <button className="btn btn-p btn-full" style={{marginTop:10}} onClick={()=>onStart(suggested)}><IcPlay/> ALLENA ORA</button>
        </div>
      )}

      {schede.length>0
        ?<button className="btn btn-p btn-full" style={{fontSize:15,padding:"14px",marginBottom:14}} onClick={()=>setPick(true)}><IcPlay/> INIZIA ALLENAMENTO</button>
        :<button className="btn btn-s btn-full" style={{marginBottom:14}} onClick={onGoSchede}><IcPlus/> CREA LA TUA PRIMA SCHEDA</button>
      }

      {records.length>0&&(
        <>
          <div className="st">🏆 RECORD PERSONALI</div>
          <div className="card" style={{padding:"8px 16px",marginBottom:14}}>
            {records.map(([nome,r])=>(
              <div key={nome} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--bdr)"}}>
                <div><div style={{fontWeight:600,fontSize:14}}>{nome}</div><div style={{fontSize:11,color:"var(--dim)"}}>{fmtShort(r.data)}</div></div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"var(--acc)",letterSpacing:".05em"}}>{r.kg} kg</div>
                  <div style={{fontSize:11,color:"var(--dim)"}}>1RM ~{epley(r.kg,r.reps)} kg</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {last&&(
        <>
          <div className="st">ULTIMO ALLENAMENTO</div>
          <div className="card" style={{borderLeft:"3px solid var(--acc)"}}>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:".05em"}}>{last.schedaNome}</div><div style={{fontSize:12,color:"var(--dim)"}}>{fmtDate(last.data)}</div></div>
              <div className="tag tag-a">{last.durata||0}min</div>
            </div>
            <div style={{display:"flex",gap:12,marginTop:10,flexWrap:"wrap"}}>
              {last.esercizi.slice(0,4).map(e=><span key={e.esercizioId||e.nome} style={{fontSize:12,color:"var(--dim)"}}><b style={{color:"var(--txt)"}}>{e.nome}</b> {e.serie.filter(s=>s.completata).length}/{e.serie.length}</span>)}
            </div>
          </div>
        </>
      )}

      {pick&&(
        <div className="mov" onClick={()=>setPick(false)}>
          <div className="mod" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:".05em"}}>SCEGLI SCHEDA</span>
              <button className="bico" onClick={()=>setPick(false)}><IcClose/></button>
            </div>
            {schede.map(sc=>(
              <div key={sc.id} className="sc" onClick={()=>{setPick(false);onStart(sc);}}>
                <div className="sd">{sc.nome}</div>
                <div className="sdn">{sc.giorni?.length>0?sc.giorni.map(g=>GG[g]).join(", ")+" · ":""}{sc.esercizi?.length||0} esercizi</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// ─── SCHEDE ───────────────────────────────────────────────
function Schede({schede,onNew,onEdit,onDelete,onStart}) {
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",paddingTop:20,paddingBottom:16}}>
        <div><h1 className="pt">LE MIE<br/>SCHEDE</h1><p className="sub">{schede.length} schede</p></div>
        <button className="btn btn-p" onClick={onNew}><IcPlus/> NUOVA</button>
      </div>
      {schede.length===0?(
        <div className="emp"><div className="emp-ic">🏋️</div><div className="emp-t">Nessuna scheda</div>
        <button className="btn btn-p" style={{marginTop:16}} onClick={onNew}><IcPlus/> CREA SCHEDA</button></div>
      ):schede.map(sc=>(
        <div key={sc.id} className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:".05em"}}>{sc.nome}</div>
              {sc.giorni?.length>0&&<div style={{display:"flex",gap:5,marginTop:5}}>{sc.giorni.sort((a,b)=>a-b).map(g=><span key={g} className="tag tag-a">{GG[g]}</span>)}</div>}
              <div style={{fontSize:12,color:"var(--dim)",marginTop:5}}>{sc.esercizi?.length||0} esercizi</div>
            </div>
            <div style={{display:"flex",gap:7}}>
              <button className="bico" onClick={()=>onEdit(sc)}><IcEdit/></button>
              <button className="bico d" onClick={()=>{if(window.confirm(`Eliminare "${sc.nome}"?`))onDelete(sc.id);}}><IcTrash/></button>
            </div>
          </div>
          {sc.esercizi?.length>0&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{sc.esercizi.map(e=><span key={e.id} className="tag tag-m">{e.nome}</span>)}</div>}
          <button className="btn btn-s btn-full" style={{marginTop:12}} onClick={()=>onStart(sc)}><IcPlay/> ALLENA ORA</button>
        </div>
      ))}
    </>
  );
}

// ─── IMAGE COMPRESS ──────────────────────────────────────
const compressImg = (file, maxPx=800, quality=0.72) => new Promise(res => {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const r = Math.min(1, maxPx / Math.max(img.width, img.height));
    const w = Math.round(img.width * r), h = Math.round(img.height * r);
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    cv.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    res(cv.toDataURL("image/jpeg", quality));
  };
  img.src = url;
});

const ZEPP_PROMPT = `Analizza questo screenshot dell'app Zepp Life e restituisci SOLO JSON valido con TUTTI i valori numerici e le etichette di stato presenti. Usa null per i campi non trovati. Esempio formato:{"peso":86.8,"punteggio":46,"tipologia":"Robusto","imc":30.3,"imc_status":"Molto alto","massa_grassa":31.3,"massa_grassa_status":"Alto","acqua":49.1,"acqua_status":"Insufficiente","grasso_viscerale":13,"grasso_viscerale_status":"Alto","muscoli":56.62,"muscoli_status":"Buono","proteine":16.2,"proteine_status":"Normale","metabolismo":1753,"metabolismo_status":"Obiettivo raggiunto","massa_ossea":3.04,"massa_ossea_status":"Normale"}`;

const STATUS_OPTS = ["","Molto alto","Alto","Normale","Basso","Molto basso","Insufficiente","Buono","Obiettivo raggiunto"];

function StatusBadge({label}) {
  if(!label) return null;
  const l = label.toLowerCase();
  const [bg, col] = l.includes("molto alto") ? ["rgba(255,59,48,.15)","var(--dan)"] :
    l.includes("alto") ? ["rgba(255,149,0,.15)","#FF9500"] :
    l.includes("insufficiente") || l.includes("basso") ? ["rgba(255,59,48,.15)","var(--dan)"] :
    ["rgba(48,209,88,.15)","var(--ok)"];
  return <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:bg,color:col,letterSpacing:".05em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{label}</span>;
}

// ─── SCHEDA PDF IMPORT MODAL ──────────────────────────────
const GROQ_SCHEDA_PROMPT = `Sei un assistente fitness. L'utente ti fornisce il testo estratto da un PDF di una scheda di allenamento in palestra.
Estrai TUTTI gli elementi della scheda nell'ordine in cui appaiono, inclusi: riscaldamento (warm-up), cardio iniziale, esercizi con i pesi, cardio finale, defaticamento, stretching — qualunque attività presente nel PDF va inclusa.
Per ogni elemento indica: nome, numero di serie (per cardio usa 1), ripetizioni o durata come stringa (es. "10 min", "8-12", "15"), pausa in secondi tra le serie, note opzionali.
Se la pausa non è specificata usa 60 per cardio/riscaldamento e 90 per esercizi con i pesi. Se le serie non sono specificate usa 3 per esercizi e 1 per cardio.
Non omettere nessuna voce presente nel PDF, anche se sembra generica (es. "Cardio Warm Up 10 min", "Defaticamento").
Rispondi SOLO con JSON valido (nessun testo aggiuntivo, nessun markdown):
{"nomeScheda":"nome della scheda","esercizi":[{"nome":"Cardio Warm Up","serie":1,"ripetizioni":"10 min","pausa":0,"note":""},{"nome":"Panca Piana","serie":4,"ripetizioni":"8-10","pausa":120,"note":""}]}`;

function SchedaPdfImportModal({onApply, onClose}) {
  const [fase, setFase] = useState(1);
  const [apiKey, setApiKey] = useState(()=>localStorage.getItem("groq_key")||"");
  const [file, setFile] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errore, setErrore] = useState("");
  const [parsed, setParsed] = useState(null);

  const analizza = async () => {
    if (!file) return setErrore("Seleziona un file PDF");
    if (!apiKey.trim()) return setErrore("Inserisci la tua Groq API key (console.groq.com)");
    if (!file.name.toLowerCase().endsWith(".pdf")) return setErrore("Il file deve essere un PDF");
    setErrore(""); setFase(2);
    try {
      setLoadingMsg("Lettura del PDF...");
      const testoPdf = await estraiTestoPdf(file);
      if (!testoPdf || testoPdf.length < 20) throw new Error("Testo non estraibile dal PDF. Verifica che non sia solo-immagine.");

      setLoadingMsg("Analisi con Groq AI...");
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {"Content-Type":"application/json","Authorization":`Bearer ${apiKey.trim()}`},
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {role:"system", content: GROQ_SCHEDA_PROMPT},
            {role:"user", content: `Testo della scheda di allenamento:\n\n${testoPdf.slice(0,10000)}`}
          ],
          temperature: 0.1, max_tokens: 4096
        })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>({}));
        throw new Error(err?.error?.message || `Errore Groq: ${resp.status}`);
      }
      const data = await resp.json();
      const testo = data?.choices?.[0]?.message?.content || "";
      const match = testo.match(/\{[\s\S]+\}/);
      if (!match) throw new Error("Il modello non ha restituito JSON valido. Riprova.");
      const obj = JSON.parse(match[0]);
      if (!Array.isArray(obj.esercizi) || obj.esercizi.length === 0) throw new Error("Nessun esercizio trovato nel PDF.");
      localStorage.setItem("groq_key", apiKey.trim());
      setParsed(obj); setFase(3);
    } catch(e) { setErrore(e.message||"Errore sconosciuto"); setFase(1); }
  };

  const applica = () => {
    if (!parsed) return;
    const ex = parsed.esercizi.map(e => ({
      id: genId(),
      nome: String(e.nome||""),
      serie: +e.serie||3,
      ripetizioni: String(e.ripetizioni||"10"),
      pausa: +e.pausa||90,
      note: String(e.note||""),
      mediaUrl: "", mediaType: null
    }));
    onApply({nomeScheda: parsed.nomeScheda||"", esercizi: ex});
    onClose();
  };

  return (
    <div className="mov" onClick={onClose}>
      <div className="mod" onClick={e=>e.stopPropagation()} style={{maxHeight:"90vh"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:".05em"}}>IMPORTA SCHEDA DA PDF</span>
          <button className="bico" onClick={onClose}><IcClose/></button>
        </div>

        {fase===1&&(
          <>
            <div style={{marginBottom:16}}>
              <div className="import-step"><span className="import-num">1</span><span style={{fontSize:13}}>Key gratuita su <b>console.groq.com</b> → API Keys</span></div>
              <div className="import-step"><span className="import-num">2</span><span style={{fontSize:13}}>Carica il PDF della tua scheda di allenamento</span></div>
              <div className="import-step"><span className="import-num">3</span><span style={{fontSize:13}}>LLaMA 3.3 estrae automaticamente esercizi, serie e reps</span></div>
            </div>
            <div className="ig">
              <label className="lbl">Groq API Key{apiKey&&" ✓ salvata"}</label>
              <input className="inp" type="password" placeholder="gsk_..." value={apiKey} onChange={e=>setApiKey(e.target.value)}/>
              <div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>Salvata solo nel tuo browser · Free tier: 14.400 req/giorno</div>
            </div>
            <div className="ig">
              <label className="lbl">PDF scheda allenamento</label>
              <div
                style={{border:"2px dashed var(--bdr)",borderRadius:10,padding:"18px",textAlign:"center",cursor:"pointer",transition:"all .15s",background:file?"var(--acc2)":"none",borderColor:file?"var(--acc)":"var(--bdr)"}}
                onClick={()=>document.getElementById("pdf-scheda-input").click()}
              >
                {file
                  ? <><IcFile/><div style={{fontSize:13,fontWeight:600,marginTop:6,color:"var(--acc)"}}>{file.name}</div><div style={{fontSize:11,color:"var(--dim)",marginTop:2}}>{(file.size/1024).toFixed(0)} KB</div></>
                  : <><IcUpload/><div style={{fontSize:13,color:"var(--dim)",marginTop:6}}>Tocca per selezionare il PDF</div></>
                }
                <input id="pdf-scheda-input" type="file" accept=".pdf,application/pdf" style={{display:"none"}} onChange={e=>{setFile(e.target.files[0]||null);setErrore("");}}/>
              </div>
            </div>
            {errore&&<div style={{color:"var(--dan)",fontSize:13,marginBottom:12,padding:"10px",background:"var(--dan2)",borderRadius:8}}>{errore}</div>}
            <button className="btn btn-p btn-full" onClick={analizza}><IcUpload/> ANALIZZA PDF</button>
          </>
        )}

        {fase===2&&(
          <div style={{textAlign:"center",padding:"32px 16px"}}>
            <div className="spin" style={{fontSize:36,marginBottom:16}}>⚙️</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:".05em",marginBottom:8}}>ANALISI IN CORSO</div>
            <div style={{fontSize:13,color:"var(--dim)",marginBottom:4}}>{loadingMsg}</div>
            <div style={{fontSize:11,color:"var(--mut)"}}>10-20 secondi</div>
          </div>
        )}

        {fase===3&&parsed&&(
          <>
            <div style={{background:"var(--acc2)",border:"1px solid var(--acc)",borderRadius:10,padding:12,marginBottom:16}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"var(--acc)",marginBottom:4}}>✓ {parsed.esercizi.length} ESERCIZI ESTRATTI</div>
              {parsed.nomeScheda&&<div style={{fontSize:13,fontWeight:600}}>{parsed.nomeScheda}</div>}
            </div>
            <div className="st" style={{marginBottom:8}}>ANTEPRIMA ESERCIZI</div>
            <div style={{maxHeight:260,overflowY:"auto"}}>
              {parsed.esercizi.map((e,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--bdr)"}}>
                  <div style={{fontSize:13,fontWeight:600}}>{e.nome}</div>
                  <div style={{fontSize:11,color:"var(--dim)",flexShrink:0,marginLeft:8}}>{e.serie}×{e.ripetizioni} · {e.pausa}s</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:16,display:"flex",gap:8}}>
              <button className="btn btn-s" style={{flex:1}} onClick={()=>{setParsed(null);setFase(1);}}>RIPROVA</button>
              <button className="btn btn-p" style={{flex:2}} onClick={applica}><IcCheck/> APPLICA ALLA SCHEDA</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SCHEDA EDIT ──────────────────────────────────────────
function SchedaEdit({scheda:init,onSave,onBack}) {
  const [nome,setNome]=useState(init.nome||"");
  const [giorni,setGiorni]=useState(init.giorni||[]);
  const [esercizi,setEsercizi]=useState(init.esercizi||[]);
  const [modal,setModal]=useState(null);
  const [pdfModal,setPdfModal]=useState(false);

  const toggleG=g=>setGiorni(p=>p.includes(g)?p.filter(x=>x!==g):[...p,g]);
  const applyModal=e=>{
    if(!e.nome.trim())return alert("Inserisci il nome");
    if(modal.mode==="new") setEsercizi(p=>[...p,{...e,id:genId()}]);
    else setEsercizi(p=>p.map((x,i)=>i===modal.idx?{...e}:x));
    setModal(null);
  };
  const moveEx=(i,dir)=>{const a=[...esercizi],j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];setEsercizi(a);};

  return (
    <>
      <div className="content fi">
        <button className="bb" onClick={onBack}><IcChevL/> Schede</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
          <h1 className="pt">{init.id?"MODIFICA":"NUOVA"}<br/>SCHEDA</h1>
          <button className="btn btn-s" style={{marginTop:6,fontSize:11,gap:5}} onClick={()=>setPdfModal(true)}><IcFile size={14}/> PDF</button>
        </div>
        <div className="ig"><label className="lbl">Nome scheda</label><input className="inp" placeholder="es. Full Body, Push Day…" value={nome} onChange={e=>setNome(e.target.value)}/></div>
        <div className="ig">
          <label className="lbl">Giorni della settimana</label>
          <div className="chip-row">{GG.map((g,i)=><button key={i} className={`chip${giorni.includes(i)?" on":""}`} onClick={()=>toggleG(i)}>{g}</button>)}</div>
        </div>
        <div className="div"/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div className="st" style={{margin:0}}>ESERCIZI ({esercizi.length})</div>
          <button className="btn btn-s" onClick={()=>setModal({mode:"new",data:{nome:"",serie:3,ripetizioni:"10",pausa:90,note:"",mediaUrl:"",mediaType:null}})}><IcPlus/> AGGIUNGI</button>
        </div>
        {esercizi.length===0
          ?<div className="emp" style={{padding:"20px 0"}}><div style={{fontSize:13,color:"var(--dim)"}}>Nessun esercizio ancora</div></div>
          :esercizi.map((e,i)=>(
            <div key={e.id} style={{background:"var(--sur)",border:"1px solid var(--bdr)",borderRadius:10,padding:14,marginBottom:9}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div className="exn">{e.nome}</div>
                  <div className="exs">
                    <div className="ep"><b>{e.serie}</b> serie</div>
                    <div className="ep"><b>{e.ripetizioni}</b> reps</div>
                    <div className="ep"><IcTimer/><b>{e.pausa}s</b></div>
                    {e.mediaUrl&&<div className="ep"><IcImg/><b>Media</b></div>}
                  </div>
                  {e.note&&<div style={{fontSize:11,color:"var(--dim)",fontStyle:"italic",marginTop:4}}>{e.note}</div>}
                </div>
                <div style={{display:"flex",gap:5,marginLeft:8}}>
                  <div style={{display:"flex",flexDirection:"column",gap:3}}>
                    <button className="bico" style={{padding:4}} onClick={()=>moveEx(i,-1)} disabled={i===0}><IcArrowUp size={13}/></button>
                    <button className="bico" style={{padding:4}} onClick={()=>moveEx(i,1)} disabled={i===esercizi.length-1}><IcArrowDown size={13}/></button>
                  </div>
                  <button className="bico" onClick={()=>setModal({mode:"edit",data:{...e},idx:i})}><IcEdit/></button>
                  <button className="bico d" onClick={()=>setEsercizi(p=>p.filter((_,j)=>j!==i))}><IcTrash/></button>
                </div>
              </div>
            </div>
          ))
        }
        <div className="div"/>
        <button className="btn btn-p btn-full" onClick={()=>{if(!nome.trim())return alert("Inserisci un nome");onSave({...init,nome:nome.trim(),giorni,esercizi});}}><IcCheck/> SALVA SCHEDA</button>
      </div>
      {modal&&<EsercizioModal init={modal.data} mode={modal.mode} onSave={applyModal} onClose={()=>setModal(null)}/>}
      {pdfModal&&<SchedaPdfImportModal
        onApply={({nomeScheda,esercizi:ex})=>{
          if(nomeScheda&&!nome.trim()) setNome(nomeScheda);
          else if(nomeScheda) setNome(nomeScheda);
          setEsercizi(ex);
        }}
        onClose={()=>setPdfModal(false)}
      />}
    </>
  );
}

// ─── ESERCIZIO MODAL ──────────────────────────────────────
function EsercizioModal({init,mode,onSave,onClose}) {
  const [d,setD]=useState({...init});
  const fileRef=useRef();
  const upd=(k,v)=>setD(p=>({...p,[k]:v}));
  const handleFile=e=>{
    const f=e.target.files[0];if(!f)return;
    if(f.size>4*1024*1024){alert("Max 4MB");return;}
    const r=new FileReader();r.onload=ev=>upd("mediaUrl",ev.target.result);r.readAsDataURL(f);upd("mediaType","image");
  };
  return (
    <div className="mov" onClick={onClose}>
      <div className="mod" onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:".05em"}}>{mode==="new"?"NUOVO ESERCIZIO":"MODIFICA"}</span>
          <button className="bico" onClick={onClose}><IcClose/></button>
        </div>
        <div className="ig"><label className="lbl">Nome *</label><input className="inp" placeholder="es. Panca Piana, Squat…" value={d.nome} onChange={e=>upd("nome",e.target.value)}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:14}}>
          <div><label className="lbl">Serie</label><input className="inp" type="number" min="1" value={d.serie} onChange={e=>upd("serie",+e.target.value)}/></div>
          <div><label className="lbl">Reps</label><input className="inp" placeholder="10" value={d.ripetizioni} onChange={e=>upd("ripetizioni",e.target.value)}/></div>
          <div><label className="lbl">Pausa (s)</label><input className="inp" type="number" min="0" value={d.pausa} onChange={e=>upd("pausa",+e.target.value)}/></div>
        </div>
        <div className="ig"><label className="lbl">Note / tecnica</label><textarea className="inp" rows={2} value={d.note} onChange={e=>upd("note",e.target.value)} placeholder="Indicazioni tecniche…"/></div>
        <div className="ig">
          <label className="lbl">Video URL (YouTube, Drive…)</label>
          <input className="inp" placeholder="https://…" value={d.mediaType==="url"?d.mediaUrl:""} onChange={e=>{upd("mediaUrl",e.target.value);upd("mediaType","url");}} style={{marginBottom:8}}/>
          <div className="mu" onClick={()=>fileRef.current?.click()}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
            <IcCamera/><span style={{fontSize:13,color:"var(--dim)"}}>Carica foto (max 4MB)</span>
          </div>
          {d.mediaUrl&&d.mediaType==="image"&&<img src={d.mediaUrl} className="mpv" alt="preview"/>}
          {d.mediaUrl&&<button onClick={()=>{upd("mediaUrl","");upd("mediaType",null);}} style={{background:"none",border:"none",color:"var(--dan)",cursor:"pointer",fontSize:12,marginTop:6}}>✕ Rimuovi media</button>}
        </div>
        <button className="btn btn-p btn-full" onClick={()=>onSave(d)}><IcCheck/> {mode==="new"?"AGGIUNGI":"SALVA"}</button>
      </div>
    </div>
  );
}

// ─── ALLENAMENTO ──────────────────────────────────────────
function Allenamento({scheda,sessioni,onComplete,onBack}) {
  const lastSess=sessioni.find(s=>s.schedaId===scheda.id);
  const lastData={};
  if(lastSess) lastSess.esercizi.forEach(e=>{lastData[e.esercizioId||e.nome]=e.serie;});

  const [sets,setSets]=useState(scheda.esercizi.map(e=>{
    const prev=lastData[e.id]||[];
    return {
      esercizioId:e.id,nome:e.nome,pausa:e.pausa,
      mediaUrl:e.mediaUrl,mediaType:e.mediaType,note:e.note,
      serie:Array.from({length:e.serie},(_,i)=>({
        idx:i,
        kg:prev[i]?.kg||"",
        reps:prev[i]?.reps||e.ripetizioni||"",
        rpe:"",completata:false
      }))
    };
  }));

  const [elapsed,setElapsed]=useState(0);
  const [rest,setRest]=useState(null);
  const [noteSess,setNoteSess]=useState("");
  const [mediaOpen,setMediaOpen]=useState(null);
  const [rpeOpen,setRpeOpen]=useState(null);
  const tiRef=useRef(); const reRef=useRef();

  useEffect(()=>{tiRef.current=setInterval(()=>setElapsed(p=>p+1),1000);return()=>clearInterval(tiRef.current);},[]);
  useEffect(()=>{
    if(rest?.rem>0){reRef.current=setTimeout(()=>setRest(p=>p?{...p,rem:p.rem-1}:null),1000);}
    else if(rest?.rem===0){setRest(null);if(navigator.vibrate)navigator.vibrate([300,100,300]);}
    return()=>clearTimeout(reRef.current);
  },[rest]);

  const updSet=(ei,si,k,v)=>setSets(p=>p.map((e,i)=>i!==ei?e:{...e,serie:e.serie.map((s,j)=>j!==si?s:{...s,[k]:v})}));
  const completeSet=(ei,si)=>{
    const e=sets[ei],s=e.serie[si],ok=!s.completata;
    updSet(ei,si,"completata",ok);
    if(ok&&e.pausa>0)setRest({rem:e.pausa,total:e.pausa,nome:e.nome});
  };

  const done=sets.reduce((a,e)=>a+e.serie.filter(s=>s.completata).length,0);
  const total=sets.reduce((a,e)=>a+e.serie.length,0);

  const finisci=()=>{
    clearInterval(tiRef.current);
    onComplete({
      id:genId(),data:new Date().toISOString(),
      schedaId:scheda.id,schedaNome:scheda.nome,
      durata:Math.round(elapsed/60),note:noteSess,
      esercizi:sets.map(e=>({
        esercizioId:e.esercizioId,nome:e.nome,
        serie:e.serie.map(s=>({reps:s.reps,kg:s.kg,rpe:s.rpe,completata:s.completata}))
      }))
    });
  };

  return (
    <>
      <div className="content fi">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:16,marginBottom:16}}>
          <button className="bb" style={{margin:0}} onClick={()=>{if(window.confirm("Interrompere l'allenamento?"))onBack();}}><IcClose/> ESCI</button>
          <div className="pls" style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"var(--acc)",letterSpacing:".1em"}}>● LIVE</div>
        </div>
        <div className="wh">
          <div className="wt">{scheda.nome}</div>
          <div className="wlv">{fmtDur(elapsed)}</div>
          <div style={{fontSize:12,color:"var(--dim)",marginTop:4}}>{done}/{total} serie · {total?Math.round(done/total*100):0}%</div>
          <div className="pbar"><div className="pfil" style={{width:`${total?Math.round(done/total*100):0}%`}}/></div>
        </div>

        {sets.map((ex,ei)=>(
          <div key={ex.esercizioId} className="card" style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div className="exn">{ex.nome}</div>
                {ex.note&&<div style={{fontSize:11,color:"var(--dim)",fontStyle:"italic",marginTop:2}}>{ex.note}</div>}
              </div>
              <div style={{display:"flex",gap:6}}>
                {ex.pausa>0&&<div className="tag tag-m"><IcTimer/>{ex.pausa}s</div>}
                {ex.mediaUrl&&<button className="bico" onClick={()=>setMediaOpen(ex)}><IcImg/></button>}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"22px 1fr 1fr 38px 28px",gap:6,fontSize:10,color:"var(--dim)",fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",marginBottom:6,padding:"0 0 4px",borderBottom:"1px solid var(--bdr)"}}>
              <div>#</div><div style={{textAlign:"center"}}>KG</div><div style={{textAlign:"center"}}>REPS</div><div style={{textAlign:"center"}}>RPE</div><div/>
            </div>

            {ex.serie.map((s,si)=>(
              <div key={si}>
                <div className="set-r">
                  <div className={`set-n${s.completata?" ok":""}`}>{si+1}</div>
                  <div><input className="sinp" type="number" min="0" step="0.5" placeholder="—" value={s.kg} onChange={e=>updSet(ei,si,"kg",e.target.value)}/></div>
                  <div><input className="sinp" type="text" placeholder={s.reps} value={s.reps} onChange={e=>updSet(ei,si,"reps",e.target.value)}/></div>
                  <div style={{textAlign:"center"}}>
                    <button onClick={()=>setRpeOpen(rpeOpen?.ei===ei&&rpeOpen?.si===si?null:{ei,si})} style={{background:s.rpe?"var(--acc2)":"var(--card)",border:`1px solid ${s.rpe?"var(--acc)":"var(--bdr)"}`,borderRadius:6,color:s.rpe?"var(--acc)":"var(--mut)",fontSize:12,fontWeight:700,width:"100%",height:32,cursor:"pointer",fontFamily:"'Barlow',sans-serif"}}>{s.rpe||"—"}</button>
                  </div>
                  <div style={{textAlign:"center"}}>
                    <button className={`sck${s.completata?" ok":""}`} onClick={()=>completeSet(ei,si)}>{s.completata&&<IcCheck/>}</button>
                  </div>
                </div>
                {rpeOpen?.ei===ei&&rpeOpen?.si===si&&(
                  <div style={{background:"var(--sur)",borderRadius:8,padding:"10px 12px",marginTop:4,border:"1px solid var(--bdr)"}}>
                    <div style={{fontSize:11,color:"var(--dim)",marginBottom:8,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase"}}>Difficoltà percepita (RPE)</div>
                    <div className="rpe-row">
                      {[1,2,3,4,5,6,7,8,9,10].map(v=>(
                        <button key={v} className={`rpe-btn${s.rpe===v?" on":""}`} onClick={()=>{updSet(ei,si,"rpe",v);setRpeOpen(null);}}>{v}</button>
                      ))}
                    </div>
                    <div style={{fontSize:10,color:"var(--mut)",marginTop:6}}>1 = facilissimo · 10 = massimo sforzo</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        <div className="ig" style={{marginTop:4}}>
          <label className="lbl">Note sessione</label>
          <textarea className="inp" rows={3} placeholder="Come ti sei sentito? Osservazioni…" value={noteSess} onChange={e=>setNoteSess(e.target.value)}/>
        </div>
        <button className="btn btn-p btn-full" style={{fontSize:15,padding:16}} onClick={finisci}><IcCheck/> TERMINA ALLENAMENTO</button>
      </div>

      {rest&&(
        <div className="rest-ov" onClick={()=>setRest(null)}>
          <div className="rest-l">RECUPERO — {rest.nome}</div>
          <div className="rest-t">{rest.rem}</div>
          <div style={{width:200,height:4,background:"rgba(255,255,255,.1)",borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",background:"var(--acc)",transition:"width 1s linear",width:`${(rest.rem/rest.total)*100}%`}}/>
          </div>
          <div className="rest-l">📳 tocca per saltare</div>
        </div>
      )}
      {mediaOpen&&(
        <div className="rest-ov" onClick={()=>setMediaOpen(null)}>
          <div style={{padding:20,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:".05em",marginBottom:12,textAlign:"center"}}>{mediaOpen.nome}</div>
            {mediaOpen.mediaType==="image"&&<img src={mediaOpen.mediaUrl} style={{width:"100%",borderRadius:12,maxHeight:380,objectFit:"contain"}}/>}
            {mediaOpen.mediaType==="url"&&<div style={{background:"var(--card)",borderRadius:12,padding:20,textAlign:"center"}}><a href={mediaOpen.mediaUrl} target="_blank" rel="noopener noreferrer" style={{color:"var(--acc)",fontSize:14}}>Apri video →</a></div>}
            <button className="btn btn-s btn-full" style={{marginTop:14}} onClick={()=>setMediaOpen(null)}>CHIUDI</button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── STORICO ──────────────────────────────────────────────
function Storico({sessioni,onDetail,onDelete}) {
  return (
    <>
      <div style={{paddingTop:20,paddingBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
          <div><h1 className="pt">STORICO<br/>LOG</h1><p className="sub">{sessioni.length} sessioni</p></div>
          {sessioni.length>0&&<button className="bico" onClick={()=>exportCSV(sessioni)} title="Esporta CSV"><IcDownload/></button>}
        </div>
      </div>
      {sessioni.length===0?(
        <div className="emp"><div className="emp-ic">📊</div><div className="emp-t">Nessuna sessione</div><p style={{fontSize:13}}>Completa un allenamento</p></div>
      ):sessioni.map(s=>{
        const tot=s.esercizi.reduce((a,e)=>a+e.serie.filter(sr=>sr.completata).length,0);
        const vol=s.esercizi.reduce((a,e)=>a+e.serie.reduce((b,sr)=>b+(sr.completata?(+sr.kg||0)*(+sr.reps||0):0),0),0);
        return (
          <div key={s.id} className="sc" onClick={()=>onDetail(s)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div className="sd">{s.schedaNome}</div><div className="sdn">{fmtDate(s.data)}</div></div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div className="tag tag-a">{s.durata||0}min</div>
                <button className="bico d" onClick={e=>{e.stopPropagation();if(window.confirm("Eliminare?"))onDelete(s.id);}}><IcTrash/></button>
              </div>
            </div>
            <div className="ss">
              <div className="ssv"><b>{s.esercizi.length}</b>Eserc.</div>
              <div className="ssv"><b>{tot}</b>Serie OK</div>
              <div className="ssv"><b>{Math.round(vol)}</b>Vol kg×r</div>
            </div>
            {s.note&&<div style={{fontSize:12,color:"var(--dim)",marginTop:8,fontStyle:"italic",borderTop:"1px solid var(--bdr)",paddingTop:8}}>{s.note}</div>}
          </div>
        );
      })}
    </>
  );
}

// ─── SESSIONE DETAIL ──────────────────────────────────────
function SessioneDetail({sessione:s,sessioni,onBack}) {
  const prevSess=sessioni.find(x=>x.schedaId===s.schedaId&&x.id!==s.id&&new Date(x.data)<new Date(s.data));
  return (
    <div className="content fi">
      <button className="bb" onClick={onBack}><IcChevL/> Storico</button>
      <div style={{marginBottom:16}}><h1 className="pt">{s.schedaNome}</h1><p className="sub">{fmtDate(s.data)} · {s.durata||0} min</p></div>
      <div className="hg" style={{marginBottom:14}}>
        {[[s.esercizi.length,"Esercizi"],[s.esercizi.reduce((a,e)=>a+e.serie.filter(sr=>sr.completata).length,0),"Serie OK"],[Math.round(s.esercizi.reduce((a,e)=>a+e.serie.reduce((b,sr)=>b+(sr.completata?(+sr.kg||0)*(+sr.reps||0):0),0),0)),"Volume"],[s.durata||0,"Minuti"]].map(([v,l])=>(
          <div key={l} className="hsc"><div className="hsv">{v}</div><div className="hsl">{l}</div></div>
        ))}
      </div>
      {s.note&&<div className="card" style={{marginBottom:12,borderLeft:"3px solid var(--acc)"}}><div className="st" style={{marginBottom:4}}>NOTE</div><p style={{fontSize:14,color:"var(--dim)",fontStyle:"italic"}}>{s.note}</p></div>}

      {prevSess&&(
        <>
          <div className="st">CONFRONTO CON SESSIONE PRECEDENTE</div>
          <div style={{fontSize:11,color:"var(--dim)",marginBottom:10}}>{fmtDate(prevSess.data)}</div>
          {s.esercizi.map(ex=>{
            const prev=prevSess.esercizi.find(e=>e.nome===ex.nome||e.esercizioId===ex.esercizioId);
            if(!prev)return null;
            const curVol=ex.serie.filter(sr=>sr.completata).reduce((a,sr)=>a+(+sr.kg||0)*(+sr.reps||0),0);
            const prevVol=prev.serie.filter(sr=>sr.completata).reduce((a,sr)=>a+(+sr.kg||0)*(+sr.reps||0),0);
            const delta=curVol-prevVol;
            const curMax=Math.max(...ex.serie.filter(sr=>sr.completata&&sr.kg).map(sr=>+sr.kg),0);
            const prevMax=Math.max(...prev.serie.filter(sr=>sr.completata&&sr.kg).map(sr=>+sr.kg),0);
            return (
              <div key={ex.nome} className="card" style={{marginBottom:8,padding:12}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:".05em",marginBottom:8}}>{ex.nome}</div>
                <div className="cmp-grid">
                  <div className="cmp-card">
                    <div className="cmp-h">QUESTA SESSIONE</div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,color:"var(--acc)"}}>{curMax}kg</div>
                    <div style={{fontSize:11,color:"var(--dim)"}}>{ex.serie.filter(sr=>sr.completata).length} serie · vol {Math.round(curVol)}</div>
                  </div>
                  <div className="cmp-card">
                    <div className="cmp-h">PRECEDENTE</div>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:26,color:"var(--mut)"}}>{prevMax}kg</div>
                    <div style={{fontSize:11,color:"var(--dim)"}}>{prev.serie.filter(sr=>sr.completata).length} serie · vol {Math.round(prevVol)}</div>
                  </div>
                </div>
                {delta!==0&&<div style={{marginTop:8,fontSize:12,fontWeight:700,color:delta>0?"var(--ok)":"var(--dan)"}}>{delta>0?"↑ +":"↓ "}{Math.round(Math.abs(delta))} volume ({delta>0?"+":"-"}{prevVol?Math.round(Math.abs(delta/prevVol)*100):0}%)</div>}
              </div>
            );
          })}
          <div className="div"/>
        </>
      )}

      <div className="st">ESERCIZI</div>
      {s.esercizi.map((ex,i)=>{
        const best=Math.max(...ex.serie.filter(sr=>sr.completata&&sr.kg).map(sr=>+sr.kg),0);
        const bestSr=ex.serie.find(sr=>sr.completata&&+sr.kg===best);
        return (
          <div key={i} className="card" style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="exn">{ex.nome}</div>
              <div style={{textAlign:"right"}}>
                {best>0&&<div className="tag tag-a">max {best}kg</div>}
                {best>0&&bestSr&&<div style={{fontSize:10,color:"var(--dim)",marginTop:2}}>1RM ~{epley(best,bestSr.reps)}kg</div>}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"22px 1fr 1fr 1fr 1fr",gap:4,fontSize:10,color:"var(--dim)",fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",marginBottom:6}}>
              <div>#</div><div>KG</div><div>REPS</div><div>RPE</div><div>OK</div>
            </div>
            {ex.serie.map((sr,j)=>(
              <div key={j} style={{display:"grid",gridTemplateColumns:"22px 1fr 1fr 1fr 1fr",gap:4,padding:"5px 0",borderTop:"1px solid var(--bdr)",alignItems:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,color:sr.completata?"var(--acc)":"var(--mut)"}}>{j+1}</div>
                <div style={{fontWeight:700,fontSize:14}}>{sr.kg||"—"}</div>
                <div style={{fontWeight:700,fontSize:14}}>{sr.reps||"—"}</div>
                <div style={{fontSize:12,color:sr.rpe>=8?"var(--dan)":sr.rpe>=6?"#FF9F0A":"var(--dim)"}}>{sr.rpe||"—"}</div>
                <div style={{fontSize:11,color:sr.completata?"var(--ok)":"var(--mut)"}}>{sr.completata?"✓":"—"}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── STATS ────────────────────────────────────────────────
function Stats({sessioni}) {
  const [stab,setStab]=useState("progressi");
  return (
    <>
      <div style={{paddingTop:20,paddingBottom:16}}><h1 className="pt">STATS &<br/>ANALISI</h1></div>
      <div className="stab-row">
        {[["progressi","📈 Progressi"],["record","🏆 Record"],["freq","📅 Freq."],["1rm","🧮 1RM Calc"]].map(([t,l])=>(
          <button key={t} className={`stab${stab===t?" on":""}`} onClick={()=>setStab(t)}>{l}</button>
        ))}
      </div>
      {stab==="progressi"&&<Progressi sessioni={sessioni}/>}
      {stab==="record"&&<RecordTab sessioni={sessioni}/>}
      {stab==="freq"&&<FreqTab sessioni={sessioni}/>}
      {stab==="1rm"&&<CalcRM/>}
    </>
  );
}

function Progressi({sessioni}) {
  const exNames=useMemo(()=>{const s=new Set();sessioni.forEach(ss=>ss.esercizi.forEach(e=>s.add(e.nome)));return[...s].sort();},[sessioni]);
  const [selEx,setSelEx]=useState(()=>exNames[0]||"");

  const chartKg=useMemo(()=>{
    if(!selEx)return[];
    return sessioni.filter(s=>s.esercizi.some(e=>e.nome===selEx)).map(s=>{
      const ex=s.esercizi.find(e=>e.nome===selEx);
      const maxKg=Math.max(...ex.serie.filter(sr=>sr.completata&&+sr.kg>0).map(sr=>+sr.kg),0);
      return{y:maxKg,label:fmtShort(s.data),data:s.data};
    }).filter(d=>d.y>0).sort((a,b)=>a.data.localeCompare(b.data));
  },[sessioni,selEx]);

  const chartVol=useMemo(()=>{
    if(!selEx)return[];
    return sessioni.filter(s=>s.esercizi.some(e=>e.nome===selEx)).map(s=>{
      const ex=s.esercizi.find(e=>e.nome===selEx);
      const vol=ex.serie.filter(sr=>sr.completata).reduce((a,sr)=>a+(+sr.kg||0)*(+sr.reps||0),0);
      return{y:Math.round(vol),label:fmtShort(s.data),data:s.data};
    }).filter(d=>d.y>0).sort((a,b)=>a.data.localeCompare(b.data));
  },[sessioni,selEx]);

  if(exNames.length===0)return<div className="emp"><div className="emp-ic">📈</div><div className="emp-t">Nessun dato</div><p style={{fontSize:13}}>Completa almeno un allenamento</p></div>;

  const progresso=chartKg.length>=2?Math.round((chartKg[chartKg.length-1].y-chartKg[0].y)*10)/10:0;

  return (
    <>
      <div className="ig">
        <label className="lbl">Seleziona esercizio</label>
        <select className="inp" value={selEx} onChange={e=>setSelEx(e.target.value)}>
          {exNames.map(n=><option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      {chartKg.length>=2?(
        <>
          <div className="st">CARICO MASSIMO (kg)</div>
          <div className="chart-wrap"><LineChart data={chartKg} color="var(--acc)" height={110}/></div>
          <div className="st" style={{marginTop:14}}>VOLUME TOTALE (kg × reps)</div>
          <div className="chart-wrap"><LineChart data={chartVol} color="#30D158" height={100}/></div>
          <div className="hg" style={{marginTop:14}}>
            {[[`${Math.max(...chartKg.map(d=>d.y))}kg`,"Record"],[chartKg.length,"Sessioni"],[`${progresso>0?"+":""}${progresso}kg`,"Progresso"],[Math.round(chartVol.reduce((a,d)=>a+d.y,0)/(chartVol.length||1)),"Vol medio"]].map(([v,l])=>(
              <div key={l} className="hsc"><div className="hsv" style={{fontSize:26}}>{v}</div><div className="hsl">{l}</div></div>
            ))}
          </div>
        </>
      ):<div className="emp" style={{padding:"20px 0"}}><div style={{fontSize:13,color:"var(--dim)"}}>Almeno 2 sessioni con questo esercizio per i grafici</div></div>}
    </>
  );
}

function RecordTab({sessioni}) {
  const records=useMemo(()=>{
    const rec={};
    sessioni.forEach(s=>s.esercizi.forEach(e=>e.serie.filter(sr=>sr.completata&&+sr.kg>0).forEach(sr=>{
      if(!rec[e.nome]||+sr.kg>rec[e.nome].kg) rec[e.nome]={kg:+sr.kg,reps:sr.reps,data:s.data,schedaNome:s.schedaNome};
    })));
    return Object.entries(rec).sort((a,b)=>b[1].kg-a[1].kg);
  },[sessioni]);
  if(records.length===0)return<div className="emp"><div className="emp-ic">🏆</div><div className="emp-t">Nessun record</div></div>;
  return (
    <>
      <div className="st">RECORD PERSONALI</div>
      {records.map(([nome,r],i)=>(
        <div key={nome} className="card" style={{padding:"12px 16px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {i<3&&<span style={{fontSize:18}}>{["🥇","🥈","🥉"][i]}</span>}
              <div style={{fontWeight:700,fontSize:15}}>{nome}</div>
            </div>
            <div style={{fontSize:11,color:"var(--dim)",marginTop:2}}>{fmtDate(r.data)} · {r.schedaNome}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"var(--acc)",letterSpacing:".05em"}}>{r.kg}kg</div>
            <div style={{fontSize:11,color:"var(--dim)"}}>1RM ~{epley(r.kg,r.reps)}kg</div>
          </div>
        </div>
      ))}
    </>
  );
}

function FreqTab({sessioni}) {
  const weekData=useMemo(()=>{
    const weeks={};
    sessioni.forEach(s=>{
      const d=new Date(s.data),mon=new Date(d);
      mon.setDate(d.getDate()-((d.getDay()+6)%7));
      const key=fmtIso(mon); weeks[key]=(weeks[key]||0)+1;
    });
    return Array.from({length:12},(_,i)=>{
      const d=new Date();
      d.setDate(d.getDate()-((d.getDay()+6)%7)-(11-i)*7);
      const key=fmtIso(d);
      return{label:fmtShort(key),y:weeks[key]||0,key};
    });
  },[sessioni]);

  const maxF=Math.max(...weekData.map(w=>w.y),1);
  const totAtt=weekData.filter(w=>w.y>0).length;

  return (
    <>
      <div className="st">FREQUENZA SETTIMANALE (ultim. 12 sett.)</div>
      <div className="chart-wrap"><LineChart data={weekData} color="#FF9F0A" height={100}/></div>
      <div className="hg" style={{marginTop:14}}>
        {[[sessioni.length,"Totale"],[sessioni.length?Math.round(sessioni.length/12*10)/10:0,"Sett. media"],[maxF,"Miglior sett."],[totAtt,"Sett. attive"]].map(([v,l])=>(
          <div key={l} className="hsc"><div className="hsv" style={{fontSize:26}}>{v}</div><div className="hsl">{l}</div></div>
        ))}
      </div>
      <div className="st" style={{marginTop:4}}>BARRE</div>
      <div style={{display:"flex",gap:3,alignItems:"flex-end",height:80,padding:"8px 6px",background:"var(--sur)",borderRadius:8,border:"1px solid var(--bdr)"}}>
        {weekData.map((w,i)=>(
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
            <div style={{width:"100%",background:w.y>0?"var(--acc)":"var(--bdr)",borderRadius:3,height:`${Math.max((w.y/maxF)*50,w.y>0?4:0)}px`,transition:"height .3s"}}/>
            <div style={{fontSize:6.5,color:"var(--mut)",transform:"rotate(-45deg)",transformOrigin:"top center",whiteSpace:"nowrap",height:16}}>{w.label}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function CalcRM() {
  const [kg,setKg]=useState(""); const [reps,setReps]=useState("");
  const rm=kg&&reps&&+reps>=1?epley(+kg,+reps):null;
  const pcts=[100,95,90,85,80,75,70,65,60];
  return (
    <>
      <div className="st">CALCOLATORE 1RM (Formula Epley)</div>
      <div className="card">
        <p style={{fontSize:13,color:"var(--dim)",marginBottom:14}}>Inserisci il peso sollevato e le ripetizioni eseguite per stimare il tuo massimale teorico.</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
          <div><label className="lbl">Kg sollevati</label><input className="inp" type="number" min="0" step="0.5" placeholder="80" value={kg} onChange={e=>setKg(e.target.value)}/></div>
          <div><label className="lbl">Ripetizioni</label><input className="inp" type="number" min="1" max="30" placeholder="8" value={reps} onChange={e=>setReps(e.target.value)}/></div>
        </div>
        {rm&&(
          <>
            <div style={{textAlign:"center",padding:"18px 0",background:"var(--acc2)",borderRadius:10,marginBottom:14,borderBottom:"1px solid var(--bdr)"}}>
              <div style={{fontSize:12,color:"var(--acc)",fontWeight:700,letterSpacing:".1em",textTransform:"uppercase"}}>Massimale stimato</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:58,color:"var(--acc)",letterSpacing:".05em",lineHeight:1.1}}>{rm} kg</div>
            </div>
            <div className="st">PERCENTUALI DI CARICO</div>
            {pcts.map(p=>(
              <div key={p} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid var(--bdr)"}}>
                <div style={{fontSize:13,color:"var(--dim)",fontWeight:600}}>{p}%</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:p===100?"var(--acc)":"var(--txt)",letterSpacing:".05em"}}>{Math.round(rm*p/100*2)/2}</div>
                  <div style={{fontSize:11,color:"var(--dim)"}}>kg</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}

// ─── PESO CORPOREO ────────────────────────────────────────
function Peso({peso,onAdd,onDelete}) {
  const blank = () => ({
    valore:"", data:fmtIso(), nota:"",
    punteggio:"", tipologia:"",
    imc:"", imc_status:"",
    massa_grassa:"", massa_grassa_status:"",
    acqua:"", acqua_status:"",
    grasso_viscerale:"", grasso_viscerale_status:"",
    muscoli:"", muscoli_status:"",
    proteine:"", proteine_status:"",
    metabolismo:"", metabolismo_status:"",
    massa_ossea:"", massa_ossea_status:"",
    foto_fronte:null, foto_retro:null
  });
  const [form,setForm]=useState(blank);
  const [saving,setSaving]=useState(false);
  const [showModal,setShowModal]=useState(false);
  const [expanded,setExpanded]=useState(null);
  const [lightbox,setLightbox]=useState(null);
  const [scanning,setScanning]=useState(false);
  const [apiKey,setApiKeyState]=useState(()=>localStorage.getItem("groq_key")||"");
  const saveApiKey=(v)=>{setApiKeyState(v);localStorage.setItem("groq_key",v);};

  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const handlePhoto=async(key,file)=>{if(!file)return;set(key,await compressImg(file));};

  const scanZepp=async(file)=>{
    if(!apiKey.trim()){alert("Inserisci la Groq API key nel campo qui sopra prima di scansionare.");return;}
    setScanning(true);
    try{
      const b64=await compressImg(file,1200,0.85);
      const resp=await fetch("https://api.groq.com/openai/v1/chat/completions",{
        method:"POST",
        headers:{"Authorization":`Bearer ${apiKey}`,"Content-Type":"application/json"},
        body:JSON.stringify({
          model:"meta-llama/llama-4-scout-17b-16e-instruct",
          messages:[{role:"user",content:[
            {type:"image_url",image_url:{url:b64}},
            {type:"text",text:ZEPP_PROMPT}
          ]}],
          temperature:0,max_tokens:512
        })
      });
      const json=await resp.json();
      const text=json.choices?.[0]?.message?.content||"";
      const match=text.match(/\{[\s\S]*\}/);
      if(match){
        const d=JSON.parse(match[0]);
        setForm(f=>({
          ...f,
          valore:d.peso!=null?String(d.peso):f.valore,
          punteggio:d.punteggio!=null?String(d.punteggio):f.punteggio,
          tipologia:d.tipologia||f.tipologia,
          imc:d.imc!=null?String(d.imc):f.imc, imc_status:d.imc_status||f.imc_status,
          massa_grassa:d.massa_grassa!=null?String(d.massa_grassa):f.massa_grassa, massa_grassa_status:d.massa_grassa_status||f.massa_grassa_status,
          acqua:d.acqua!=null?String(d.acqua):f.acqua, acqua_status:d.acqua_status||f.acqua_status,
          grasso_viscerale:d.grasso_viscerale!=null?String(d.grasso_viscerale):f.grasso_viscerale, grasso_viscerale_status:d.grasso_viscerale_status||f.grasso_viscerale_status,
          muscoli:d.muscoli!=null?String(d.muscoli):f.muscoli, muscoli_status:d.muscoli_status||f.muscoli_status,
          proteine:d.proteine!=null?String(d.proteine):f.proteine, proteine_status:d.proteine_status||f.proteine_status,
          metabolismo:d.metabolismo!=null?String(d.metabolismo):f.metabolismo, metabolismo_status:d.metabolismo_status||f.metabolismo_status,
          massa_ossea:d.massa_ossea!=null?String(d.massa_ossea):f.massa_ossea, massa_ossea_status:d.massa_ossea_status||f.massa_ossea_status,
        }));
      }else{alert("Nessun dato trovato nello screenshot.");}
    }catch(e){alert("Errore scan: "+e.message);}
    setScanning(false);
  };

  const handleAdd=async()=>{
    if(!form.valore)return;
    setSaving(true);
    const n=v=>v!==""&&v!=null?+v:null;
    await onAdd({
      id:genId(),valore:+form.valore,data:form.data,nota:form.nota,
      punteggio:n(form.punteggio),tipologia:form.tipologia||null,
      imc:n(form.imc),imc_status:form.imc_status||null,
      massa_grassa:n(form.massa_grassa),massa_grassa_status:form.massa_grassa_status||null,
      acqua:n(form.acqua),acqua_status:form.acqua_status||null,
      grasso_viscerale:n(form.grasso_viscerale),grasso_viscerale_status:form.grasso_viscerale_status||null,
      muscoli:n(form.muscoli),muscoli_status:form.muscoli_status||null,
      proteine:n(form.proteine),proteine_status:form.proteine_status||null,
      metabolismo:n(form.metabolismo),metabolismo_status:form.metabolismo_status||null,
      massa_ossea:n(form.massa_ossea),massa_ossea_status:form.massa_ossea_status||null,
      foto_fronte:form.foto_fronte||null,foto_retro:form.foto_retro||null,
    });
    setForm(blank());setSaving(false);setShowModal(false);
  };

  const vals=peso.map(p=>+p.valore);
  const mn=vals.length?Math.min(...vals):0;
  const mx=vals.length?Math.max(...vals):0;
  const primo=vals[0]||0;
  const ultimo=vals[vals.length-1]||0;
  const delta=primo?Math.round((ultimo-primo)*10)/10:0;
  const chartData=peso.map(p=>({y:+p.valore,label:fmtShort(p.data)}));
  const hasBody=p=>p.imc!=null||p.massa_grassa!=null||p.acqua!=null||p.muscoli!=null||p.grasso_viscerale!=null||p.proteine!=null||p.metabolismo!=null||p.massa_ossea!=null;

  const MR=({icon,label,value,unit,badge})=>(
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid var(--bdr)"}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:15}}>{icon}</span>
        <div>
          <div style={{fontSize:10,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".06em",fontWeight:700}}>{label}</div>
          <div style={{fontSize:17,fontWeight:700}}>{value}<span style={{fontSize:11,color:"var(--dim)",marginLeft:3}}>{unit}</span></div>
        </div>
      </div>
      <StatusBadge label={badge}/>
    </div>
  );

  const MI=({label,fk,sk,ph,step="0.1"})=>(
    <div style={{marginBottom:10}}>
      <label className="lbl">{label}</label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 130px",gap:6}}>
        <input className="inp" type="number" step={step} placeholder={ph} value={form[fk]} onChange={e=>set(fk,e.target.value)}/>
        <select className="inp" style={{fontSize:11,padding:"10px 6px"}} value={form[sk]} onChange={e=>set(sk,e.target.value)}>
          {STATUS_OPTS.map(o=><option key={o} value={o}>{o||"— stato"}</option>)}
        </select>
      </div>
    </div>
  );

  return (
    <>
      <div style={{paddingTop:20,paddingBottom:16}}>
        <h1 className="pt">PESO<br/>CORPOREO</h1>
        <p className="sub">Traccia peso e composizione corporea</p>
      </div>

      {peso.length>=2&&(
        <>
          <div className="hg">
            {[[`${ultimo}kg`,"Attuale"],[`${mn}kg`,"Min"],[`${mx}kg`,"Max"],[`${delta>0?"+":""}${delta}kg`,"Delta"]].map(([v,l])=>(
              <div key={l} className="hsc">
                <div className="hsv" style={{fontSize:26,color:l==="Delta"?(delta<0?"var(--ok)":delta>0?"var(--dan)":"var(--acc)"):"var(--acc)"}}>{v}</div>
                <div className="hsl">{l}</div>
              </div>
            ))}
          </div>
          <div className="st">ANDAMENTO</div>
          <div className="chart-wrap" style={{marginBottom:16}}><LineChart data={chartData} color="var(--acc)" height={120}/></div>
        </>
      )}

      <button className="btn btn-p btn-full" style={{marginBottom:16}} onClick={()=>setShowModal(true)}><IcPlus/> NUOVA RILEVAZIONE</button>

      {peso.length>0&&(
        <>
          <div className="st">STORICO ({peso.length} rilevazioni)</div>
          {[...peso].reverse().map(p=>{
            const isExp=expanded===p.id;
            return (
              <div key={p.id} className="card" style={{marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setExpanded(isExp?null:p.id)}>
                  <div style={{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0}}>
                    <div>
                      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"var(--acc)",lineHeight:1}}>{p.valore} <span style={{fontSize:13,color:"var(--dim)",fontFamily:"'Barlow',sans-serif",fontWeight:400}}>kg</span></div>
                      <div style={{fontSize:11,color:"var(--dim)",marginTop:1}}>{fmtDate(p.data)}</div>
                    </div>
                    {p.punteggio!=null&&<div style={{background:"var(--acc2)",borderRadius:10,padding:"4px 10px",textAlign:"center",flexShrink:0}}>
                      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"var(--acc)",lineHeight:1}}>{p.punteggio}</div>
                      <div style={{fontSize:9,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".06em"}}>score</div>
                    </div>}
                    {p.tipologia&&<span style={{fontSize:11,fontWeight:700,background:"var(--bdr)",padding:"3px 9px",borderRadius:20,flexShrink:0}}>{p.tipologia}</span>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    {(p.foto_fronte||p.foto_retro)&&<span style={{fontSize:12}}>📷</span>}
                    {hasBody(p)&&<span style={{fontSize:12}}>📊</span>}
                    <span style={{color:"var(--dim)",fontSize:11}}>{isExp?"▲":"▼"}</span>
                  </div>
                </div>

                {isExp&&(
                  <div style={{marginTop:12,borderTop:"1px solid var(--bdr)",paddingTop:12}}>
                    {p.nota&&<div style={{fontSize:13,color:"var(--dim)",marginBottom:10,fontStyle:"italic"}}>"{p.nota}"</div>}

                    {(p.foto_fronte||p.foto_retro)&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                        {p.foto_fronte&&<div>
                          <div className="st" style={{fontSize:9,marginBottom:4}}>FRONTE</div>
                          <img src={p.foto_fronte} alt="Fronte" style={{width:"100%",borderRadius:8,cursor:"pointer",objectFit:"cover",maxHeight:200}} onClick={()=>setLightbox(p.foto_fronte)}/>
                        </div>}
                        {p.foto_retro&&<div>
                          <div className="st" style={{fontSize:9,marginBottom:4}}>RETRO</div>
                          <img src={p.foto_retro} alt="Retro" style={{width:"100%",borderRadius:8,cursor:"pointer",objectFit:"cover",maxHeight:200}} onClick={()=>setLightbox(p.foto_retro)}/>
                        </div>}
                      </div>
                    )}

                    {hasBody(p)&&(
                      <div style={{marginBottom:8}}>
                        <div className="st" style={{marginBottom:4}}>COMPOSIZIONE CORPOREA</div>
                        {p.imc!=null&&<MR icon="⚖️" label="IMC" value={p.imc} badge={p.imc_status}/>}
                        {p.massa_grassa!=null&&<MR icon="🔸" label="Massa grassa" value={p.massa_grassa} unit="%" badge={p.massa_grassa_status}/>}
                        {p.acqua!=null&&<MR icon="💧" label="Acqua" value={p.acqua} unit="%" badge={p.acqua_status}/>}
                        {p.grasso_viscerale!=null&&<MR icon="🔶" label="Grasso viscerale" value={p.grasso_viscerale} badge={p.grasso_viscerale_status}/>}
                        {p.muscoli!=null&&<MR icon="💪" label="Muscoli" value={p.muscoli} unit="kg" badge={p.muscoli_status}/>}
                        {p.proteine!=null&&<MR icon="🥩" label="Proteine" value={p.proteine} unit="%" badge={p.proteine_status}/>}
                        {p.metabolismo!=null&&<MR icon="🔥" label="Metabolismo basale" value={p.metabolismo} unit="kcal" badge={p.metabolismo_status}/>}
                        {p.massa_ossea!=null&&<MR icon="🦴" label="Massa ossea" value={p.massa_ossea} unit="kg" badge={p.massa_ossea_status}/>}
                      </div>
                    )}

                    <button className="btn" style={{marginTop:6,fontSize:12,padding:"7px 14px",color:"var(--dan)",border:"1px solid rgba(255,59,48,.25)",background:"rgba(255,59,48,.07)"}} onClick={()=>{if(window.confirm("Eliminare?"))onDelete(p.id);}}>
                      <IcTrash/> Elimina
                    </button>
                  </div>
                )}

                {!isExp&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
                  <button className="bico d" onClick={e=>{e.stopPropagation();if(window.confirm("Eliminare questa rilevazione?"))onDelete(p.id);}}><IcTrash/></button>
                </div>}
              </div>
            );
          })}
        </>
      )}

      {lightbox&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.96)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setLightbox(null)}>
          <img src={lightbox} alt="foto" style={{maxWidth:"95%",maxHeight:"95vh",objectFit:"contain",borderRadius:8}}/>
          <button style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:18}} onClick={()=>setLightbox(null)}>✕</button>
        </div>
      )}

      {showModal&&(
        <div className="mov" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false);}}>
          <div className="mod">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div className="wt">NUOVA RILEVAZIONE</div>
              <button className="bico" onClick={()=>setShowModal(false)}>✕</button>
            </div>

            {/* Zepp Life scan */}
            <div style={{marginBottom:16}}>
              <label className="lbl" style={{marginBottom:6}}>SCAN ZEPP LIFE — AI COMPILA TUTTO AUTOMATICAMENTE</label>
              {!apiKey&&(
                <div style={{marginBottom:8}}>
                  <label className="lbl" style={{color:"var(--dan)"}}>⚠ GROQ API KEY (richiesta una volta)</label>
                  <div style={{display:"flex",gap:6}}>
                    <input className="inp" type="password" placeholder="gsk_…" style={{flex:1,fontSize:13}} onBlur={e=>e.target.value&&saveApiKey(e.target.value.trim())} onKeyDown={e=>e.key==="Enter"&&e.target.value&&saveApiKey(e.target.value.trim())}/>
                    <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{display:"flex",alignItems:"center",padding:"0 10px",background:"var(--acc2)",border:"1px solid var(--acc)",borderRadius:8,fontSize:11,color:"var(--acc)",fontWeight:700,textDecoration:"none",whiteSpace:"nowrap"}}>Ottieni key</a>
                  </div>
                  <div style={{fontSize:10,color:"var(--mut)",marginTop:3}}>Gratuita su console.groq.com · viene salvata sul dispositivo</div>
                </div>
              )}
              <label style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",border:"1px dashed var(--bdr)",borderRadius:10,cursor:"pointer",color:scanning?"var(--acc)":"var(--dim)",fontSize:13,transition:"all .15s",background:scanning?"var(--acc2)":"transparent"}}>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&scanZepp(e.target.files[0])}/>
                <span style={{fontSize:20}}>{scanning?"⏳":"📊"}</span>
                <div>
                  <div style={{fontWeight:700}}>{scanning?"Analisi in corso…":"Carica screenshot Zepp Life"}</div>
                  <div style={{fontSize:11,color:"var(--mut)",marginTop:1}}>Il modello AI legge tutti i valori e li compila</div>
                </div>
              </label>
            </div>

            <div className="st">PESO E DATA</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div><label className="lbl">Peso (kg)</label><input className="inp" type="number" step="0.1" min="30" placeholder="86.5" value={form.valore} onChange={e=>set("valore",e.target.value)}/></div>
              <div><label className="lbl">Data</label><input className="inp" type="date" value={form.data} onChange={e=>set("data",e.target.value)}/></div>
            </div>

            <div className="st" style={{marginBottom:8}}>COMPOSIZIONE CORPOREA <span style={{fontSize:10,color:"var(--mut)"}}>(OPZIONALE)</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div><label className="lbl">Punteggio corpo</label><input className="inp" type="number" placeholder="46" value={form.punteggio} onChange={e=>set("punteggio",e.target.value)}/></div>
              <div><label className="lbl">Tipologia corporea</label>
                <select className="inp" value={form.tipologia} onChange={e=>set("tipologia",e.target.value)}>
                  <option value="">—</option>
                  {["Magro","Magro muscoloso","Normale","Muscoloso","Robusto","Sovrappeso","Obeso"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <MI label="IMC" fk="imc" sk="imc_status" ph="30.3"/>
            <MI label="Massa grassa (%)" fk="massa_grassa" sk="massa_grassa_status" ph="31.3"/>
            <MI label="Acqua (%)" fk="acqua" sk="acqua_status" ph="49.1"/>
            <MI label="Grasso viscerale" fk="grasso_viscerale" sk="grasso_viscerale_status" ph="13" step="1"/>
            <MI label="Muscoli (kg)" fk="muscoli" sk="muscoli_status" ph="56.62" step="0.01"/>
            <MI label="Proteine (%)" fk="proteine" sk="proteine_status" ph="16.2"/>
            <MI label="Metabolismo basale (kcal)" fk="metabolismo" sk="metabolismo_status" ph="1753" step="1"/>
            <MI label="Massa ossea (kg)" fk="massa_ossea" sk="massa_ossea_status" ph="3.04" step="0.01"/>

            <div className="st" style={{marginTop:4,marginBottom:8}}>FOTO CORPOREE <span style={{fontSize:10,color:"var(--mut)"}}>(OPZIONALE)</span></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              {[["foto_fronte","FRONTE"],["foto_retro","RETRO"]].map(([key,lab])=>(
                <div key={key}>
                  <label className="lbl">{lab}</label>
                  <label style={{display:"flex",alignItems:"center",justifyContent:"center",border:"1px dashed var(--bdr)",borderRadius:8,cursor:"pointer",overflow:"hidden",minHeight:90,background:"var(--sur)"}}>
                    <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handlePhoto(key,e.target.files[0])}/>
                    {form[key]?<img src={form[key]} alt={key} style={{width:"100%",maxHeight:130,objectFit:"cover"}}/>:<span style={{fontSize:26,color:"var(--mut)"}}>+</span>}
                  </label>
                </div>
              ))}
            </div>

            <div style={{marginBottom:14}}>
              <label className="lbl">Nota (opzionale)</label>
              <input className="inp" placeholder="es. mattina a digiuno" value={form.nota} onChange={e=>set("nota",e.target.value)}/>
            </div>

            <button className="btn btn-p btn-full" onClick={handleAdd} disabled={!form.valore||saving}>
              <IcPlus/> {saving?"SALVATAGGIO…":"SALVA RILEVAZIONE"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── PROFILO PERSONALE ────────────────────────────────────
function Profilo({settings, peso, onSave}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [groqKey, setGroqKey] = useState(()=>localStorage.getItem("groq_key")||"");
  const saveGroqKey=(v)=>{setGroqKey(v);localStorage.setItem("groq_key",v.trim());};

  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const openEdit = () => {
    setForm({
      nome: settings.nome||"",
      sesso: settings.sesso||"",
      eta: settings.eta||"",
      altezza: settings.altezza||"",
      foto_profilo: settings.foto_profilo||null,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave({...settings, ...form, eta: form.eta?+form.eta:null, altezza: form.altezza?+form.altezza:null});
    setSaving(false);
    setEditing(false);
  };

  const handleFotoProfilo = async (file) => {
    if(!file) return;
    const b64 = await compressImg(file, 400, 0.8);
    set("foto_profilo", b64);
  };

  // Ultimo peso con dati corpo
  const ultimoPeso = [...peso].reverse().find(p =>
    p.valore != null && (p.imc != null || p.massa_grassa != null || p.punteggio != null)
  ) || [...peso].reverse()[0] || null;

  // Ultime foto corporee
  const ultimeFoto = [...peso].reverse().find(p => p.foto_fronte || p.foto_retro);

  // Bollino salute
  const computeHealth = (p) => {
    if(!p) return null;
    if(p.punteggio != null) {
      const s = +p.punteggio;
      if(s >= 70) return {color:"var(--ok)", bg:"rgba(48,209,88,.12)", label:"Ottimo", score:s};
      if(s >= 55) return {color:"#FF9500", bg:"rgba(255,149,0,.12)", label:"Nella media", score:s};
      return {color:"var(--dan)", bg:"rgba(255,59,48,.12)", label:"Da migliorare", score:s};
    }
    const BAD = ["molto alto","insufficiente","molto basso"];
    const WARN = ["alto","basso"];
    const FIELDS = ["imc_status","massa_grassa_status","acqua_status","grasso_viscerale_status"];
    let bad=0, warn=0;
    FIELDS.forEach(f=>{
      const v=(p[f]||"").toLowerCase();
      if(BAD.some(b=>v.includes(b))) bad++;
      else if(WARN.some(w=>v===w)) warn++;
    });
    if(bad>=2) return {color:"var(--dan)", bg:"rgba(255,59,48,.12)", label:"Da migliorare", score:null};
    if(bad===1||warn>=2) return {color:"#FF9500", bg:"rgba(255,149,0,.12)", label:"Attenzione", score:null};
    if(bad===0&&warn===0&&(p.imc_status||p.massa_grassa_status)) return {color:"var(--ok)", bg:"rgba(48,209,88,.12)", label:"Buono", score:null};
    return null;
  };
  const health = computeHealth(ultimoPeso);

  const altezza = settings.altezza;
  const eta = settings.eta;
  const sesso = settings.sesso;
  const nome = settings.nome;

  // Metriche rilevanti dell'ultimo tracciamento
  const METRICHE = [
    {icon:"⚖️", label:"IMC", vk:"imc", sk:"imc_status", unit:""},
    {icon:"🔸", label:"Massa grassa", vk:"massa_grassa", sk:"massa_grassa_status", unit:"%"},
    {icon:"💧", label:"Acqua", vk:"acqua", sk:"acqua_status", unit:"%"},
    {icon:"🔶", label:"Grasso viscerale", vk:"grasso_viscerale", sk:"grasso_viscerale_status", unit:""},
    {icon:"💪", label:"Muscoli", vk:"muscoli", sk:"muscoli_status", unit:"kg"},
    {icon:"🔥", label:"Metabolismo", vk:"metabolismo", sk:"metabolismo_status", unit:"kcal"},
  ];

  return (
    <>
      <div style={{paddingTop:20,paddingBottom:16,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <h1 className="pt">PROFILO<br/>PERSONALE</h1>
          <p className="sub">Il tuo stato di forma attuale</p>
        </div>
        <button className="bico" onClick={openEdit}><IcEdit/></button>
      </div>

      {/* CARD PROFILO */}
      <div className="card" style={{marginBottom:12}}>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          {/* Avatar */}
          <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",border:"2px solid var(--acc)",flexShrink:0,background:"var(--sur)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:"var(--mut)"}}>
            {settings.foto_profilo
              ? <img src={settings.foto_profilo} alt="profilo" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
              : "👤"}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:".05em",lineHeight:1,marginBottom:4}}>
              {nome||"Il tuo profilo"}
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {sesso&&<span style={{fontSize:11,fontWeight:700,background:"var(--bdr)",padding:"2px 8px",borderRadius:20}}>{sesso==="M"?"♂ Uomo":sesso==="F"?"♀ Donna":sesso}</span>}
              {eta&&<span style={{fontSize:11,fontWeight:700,background:"var(--bdr)",padding:"2px 8px",borderRadius:20}}>{eta} anni</span>}
              {altezza&&<span style={{fontSize:11,fontWeight:700,background:"var(--bdr)",padding:"2px 8px",borderRadius:20}}>{altezza} cm</span>}
            </div>
          </div>
        </div>

        {/* Dati mancanti prompt */}
        {(!nome||!sesso||!eta||!altezza)&&(
          <div style={{marginTop:12,padding:"10px 12px",borderRadius:8,background:"var(--acc2)",border:"1px solid var(--acc)",fontSize:12,color:"var(--dim)"}}>
            ✏️ Completa il profilo con <b style={{color:"var(--txt)"}}>{[!nome&&"nome",!sesso&&"sesso",!eta&&"età",!altezza&&"altezza"].filter(Boolean).join(", ")}</b>
          </div>
        )}
      </div>

      {/* BOLLINO SALUTE */}
      {ultimoPeso&&(
        <div style={{marginBottom:12,padding:16,borderRadius:12,border:`1px solid ${health?.color||"var(--bdr)"}`,background:health?.bg||"var(--card)"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
            <div>
              <div className="st" style={{marginBottom:2}}>STATO DI SALUTE</div>
              <div style={{fontSize:11,color:"var(--dim)"}}>Basato sull'ultima rilevazione · {fmtDate(ultimoPeso.data)}</div>
            </div>
            {health&&(
              <div style={{textAlign:"center"}}>
                {health.score!=null&&<div style={{fontFamily:"'Bebas Neue',cursive",fontSize:36,color:health.color,lineHeight:1}}>{health.score}</div>}
                <div style={{fontSize:11,fontWeight:700,color:health.color,textTransform:"uppercase",letterSpacing:".08em",padding:"3px 10px",borderRadius:20,background:`${health.color}22`,marginTop:2}}>{health.label}</div>
              </div>
            )}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderTop:"1px solid var(--bdr)"}}>
            <div>
              <div style={{fontSize:10,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".06em",fontWeight:700}}>Peso attuale</div>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:28,color:"var(--acc)",lineHeight:1}}>{ultimoPeso.valore} <span style={{fontSize:13,color:"var(--dim)",fontFamily:"'Barlow',sans-serif",fontWeight:400}}>kg</span></div>
            </div>
            {ultimoPeso.tipologia&&<span style={{fontSize:12,fontWeight:700,background:"var(--bdr)",padding:"4px 12px",borderRadius:20}}>{ultimoPeso.tipologia}</span>}
            {altezza&&ultimoPeso.imc==null&&(()=>{
              const bmi = Math.round(ultimoPeso.valore/(altezza/100)**2*10)/10;
              return <div style={{textAlign:"right"}}><div style={{fontSize:10,color:"var(--dim)",textTransform:"uppercase",letterSpacing:".06em",fontWeight:700}}>BMI calc.</div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:"var(--acc)"}}>{bmi}</div></div>;
            })()}
          </div>

          {/* Metriche grid */}
          {METRICHE.some(m=>ultimoPeso[m.vk]!=null)&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10}}>
              {METRICHE.filter(m=>ultimoPeso[m.vk]!=null).map(m=>(
                <div key={m.vk} style={{background:"var(--card)",borderRadius:8,padding:"8px 10px",border:"1px solid var(--bdr)"}}>
                  <div style={{fontSize:10,color:"var(--dim)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:2}}>{m.icon} {m.label}</div>
                  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",gap:4}}>
                    <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:"var(--txt)"}}>{ultimoPeso[m.vk]}<span style={{fontSize:10,color:"var(--dim)",marginLeft:2}}>{m.unit}</span></div>
                    <StatusBadge label={ultimoPeso[m.sk]}/>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TREND PESO */}
      {peso.length>=2&&(()=>{
        const sorted=[...peso].sort((a,b)=>a.data.localeCompare(b.data));
        const first=sorted[0], last=sorted[sorted.length-1];
        const diff=Math.round((+last.valore - +first.valore)*10)/10;
        const good=diff<0;
        return (
          <div className="card" style={{marginBottom:12}}>
            <div className="st" style={{marginBottom:8}}>ANDAMENTO PESO</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[[`${first.valore} kg`,"Inizio",null],[`${last.valore} kg`,"Attuale","var(--acc)"],[`${diff>0?"+":""}${diff} kg`,"Variazione",good?"var(--ok)":"var(--dan)"]].map(([v,l,c])=>(
                <div key={l} style={{textAlign:"center"}}>
                  <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,color:c||"var(--txt)",lineHeight:1}}>{v}</div>
                  <div style={{fontSize:10,color:"var(--mut)",textTransform:"uppercase",letterSpacing:".07em",marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* FOTO PROGRESSO */}
      {ultimeFoto&&(
        <div className="card" style={{marginBottom:12}}>
          <div className="st" style={{marginBottom:8}}>ULTIME FOTO CORPOREE · {fmtDate(ultimeFoto.data)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {ultimeFoto.foto_fronte&&<div>
              <div style={{fontSize:10,color:"var(--dim)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>FRONTE</div>
              <img src={ultimeFoto.foto_fronte} alt="Fronte" style={{width:"100%",borderRadius:8,cursor:"pointer",objectFit:"cover",maxHeight:220}} onClick={()=>setLightbox(ultimeFoto.foto_fronte)}/>
            </div>}
            {ultimeFoto.foto_retro&&<div>
              <div style={{fontSize:10,color:"var(--dim)",fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:4}}>RETRO</div>
              <img src={ultimeFoto.foto_retro} alt="Retro" style={{width:"100%",borderRadius:8,cursor:"pointer",objectFit:"cover",maxHeight:220}} onClick={()=>setLightbox(ultimeFoto.foto_retro)}/>
            </div>}
          </div>
        </div>
      )}

      {!ultimoPeso&&(
        <div className="emp"><div className="emp-ic">📊</div><div className="emp-t">Nessuna rilevazione</div><div style={{fontSize:13,color:"var(--mut)"}}>Aggiungi una rilevazione nel tab PESO per vedere il tuo stato di salute.</div></div>
      )}

      {/* LIGHTBOX */}
      {lightbox&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.96)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}} onClick={()=>setLightbox(null)}>
          <img src={lightbox} alt="foto" style={{maxWidth:"95%",maxHeight:"95vh",objectFit:"contain",borderRadius:8}}/>
          <button style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.15)",border:"none",color:"#fff",borderRadius:"50%",width:36,height:36,cursor:"pointer",fontSize:18}} onClick={()=>setLightbox(null)}>✕</button>
        </div>
      )}

      {/* EDIT MODAL */}
      {editing&&(
        <div className="mov" onClick={e=>{if(e.target===e.currentTarget)setEditing(false);}}>
          <div className="mod">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div className="wt">MODIFICA PROFILO</div>
              <button className="bico" onClick={()=>setEditing(false)}>✕</button>
            </div>

            {/* Foto profilo */}
            <div style={{display:"flex",justifyContent:"center",marginBottom:16}}>
              <label style={{cursor:"pointer",position:"relative"}}>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFotoProfilo(e.target.files[0])}/>
                <div style={{width:80,height:80,borderRadius:"50%",overflow:"hidden",border:"2px dashed var(--acc)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"var(--mut)",background:"var(--sur)"}}>
                  {form.foto_profilo?<img src={form.foto_profilo} alt="profilo" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"👤"}
                </div>
                <div style={{position:"absolute",bottom:0,right:0,background:"var(--acc)",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>✏️</div>
              </label>
            </div>

            <div className="ig"><label className="lbl">Nome</label><input className="inp" placeholder="Il tuo nome" value={form.nome} onChange={e=>set("nome",e.target.value)}/></div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <div>
                <label className="lbl">Sesso</label>
                <select className="inp" value={form.sesso} onChange={e=>set("sesso",e.target.value)}>
                  <option value="">—</option>
                  <option value="M">♂ Uomo</option>
                  <option value="F">♀ Donna</option>
                </select>
              </div>
              <div><label className="lbl">Età</label><input className="inp" type="number" min="10" max="100" placeholder="30" value={form.eta} onChange={e=>set("eta",e.target.value)}/></div>
              <div><label className="lbl">Altezza (cm)</label><input className="inp" type="number" min="100" max="250" placeholder="175" value={form.altezza} onChange={e=>set("altezza",e.target.value)}/></div>
            </div>

            <div style={{marginTop:4,marginBottom:14}}>
              <label className="lbl">GROQ API KEY <span style={{color:"var(--mut)"}}>(per scan Zepp Life)</span></label>
              <div style={{display:"flex",gap:6}}>
                <input className="inp" type="password" placeholder="gsk_…" value={groqKey} style={{flex:1,fontSize:13}} onChange={e=>saveGroqKey(e.target.value)}/>
                {groqKey&&<div style={{display:"flex",alignItems:"center",padding:"0 10px",background:"rgba(48,209,88,.1)",border:"1px solid var(--ok)",borderRadius:8,fontSize:11,color:"var(--ok)",fontWeight:700,whiteSpace:"nowrap"}}>✓ Salvata</div>}
              </div>
              {!groqKey&&<div style={{fontSize:10,color:"var(--mut)",marginTop:3}}>Gratuita su <b>console.groq.com</b> → API Keys</div>}
            </div>

            <button className="btn btn-p btn-full" onClick={handleSave} disabled={saving}>
              <IcCheck/> {saving?"SALVATAGGIO…":"SALVA PROFILO"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ─── DIETA: PIANI ALIMENTARI ──────────────────────────────
function PianiAlimentari({piani, logDieta, onNew, onEdit, onDelete, onLog}) {
  return (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",paddingTop:20,paddingBottom:16}}>
        <div><h1 className="pt">I MIEI<br/>PIANI</h1><p className="sub">{piani.length} piani alimentari</p></div>
        <button className="btn btn-p" onClick={onNew}><IcPlus/> NUOVO</button>
      </div>
      
      {piani.length > 0 && (
        <button className="btn btn-p btn-full" style={{fontSize:15,padding:"14px",marginBottom:14, background:"#30D158"}} onClick={onLog}>
          <IcApple/> TRACCIA PASTI DI OGGI
        </button>
      )}

      {piani.length === 0 ? (
        <div className="emp"><div className="emp-ic">🍎</div><div className="emp-t">Nessun piano</div>
        <button className="btn btn-p" style={{marginTop:16}} onClick={onNew}><IcPlus/> CREA PIANO</button></div>
      ) : piani.map(p => {
        // Calcola kcal per giorno se struttura settimanale
        const hasWeekly=p.giorniPasti&&Object.keys(p.giorniPasti).length>0;
        const kcalPerGiorno=hasWeekly
          ?[1,2,3,4,5,6,7].map(d=>(p.giorniPasti[d]||[]).reduce((a,pst)=>a+pst.alimenti.reduce((b,al)=>b+(+al.kcal||0),0),0))
          :[];
        const maxKcal=kcalPerGiorno.length>0?Math.max(...kcalPerGiorno,1):1;
        return (
          <div key={p.id} className="card" style={{borderLeft:"3px solid #30D158"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:".05em"}}>{p.nome}</div>
                <div style={{fontSize:12,color:"var(--dim)",marginTop:5}}>Piano settimanale · 7 giorni</div>
              </div>
              <div style={{display:"flex",gap:7}}>
                <button className="bico" onClick={()=>onEdit(p)}><IcEdit/></button>
                <button className="bico d" onClick={()=>{if(window.confirm(`Eliminare "${p.nome}"?`))onDelete(p.id);}}><IcTrash/></button>
              </div>
            </div>
            {hasWeekly&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginTop:12}}>
                {[1,2,3,4,5,6,7].map((d,i)=>(
                  <div key={d} style={{textAlign:"center"}}>
                    <div style={{fontSize:9,color:"var(--mut)",fontWeight:700,marginBottom:4}}>{GIORNI_SHORT[d]}</div>
                    <div style={{height:32,background:"var(--bdr)",borderRadius:4,overflow:"hidden",display:"flex",alignItems:"flex-end"}}>
                      <div style={{width:"100%",height:`${Math.round(kcalPerGiorno[i]/maxKcal*100)}%`,background:"#30D158",opacity:.8,borderRadius:4,minHeight:kcalPerGiorno[i]>0?3:0,transition:"height .3s"}}/>
                    </div>
                    <div style={{fontSize:8,color:"var(--dim)",marginTop:3}}>{kcalPerGiorno[i]>0?kcalPerGiorno[i]+"k":"-"}</div>
                  </div>
                ))}
              </div>
            )}
            {!hasWeekly&&p.pasti?.length>0&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{p.pasti.map((pasto,i)=><span key={i} className="tag tag-m">{pasto.nome}</span>)}</div>}
          </div>
        );
      })}
    </>
  );
}

// ─── PIANO EDIT (CREAZIONE DIETA SETTIMANALE) ─────────────
function PianoEdit({piano:init, onSave, onBack}) {
  const [nome,setNome]=useState(init.nome||"");
  const [giorno,setGiorno]=useState(1);
  const [alModal,setAlModal]=useState(null);
  const [pdfModal,setPdfModal]=useState(false);

  // Inizializza giorniPasti: migra vecchio formato o usa giorniPasti esistente
  const initGP=()=>{
    if(init.giorniPasti) return JSON.parse(JSON.stringify(init.giorniPasti));
    const gp={};
    for(let i=1;i<=7;i++) gp[i]=(i===1&&init.pasti?.length>0)?JSON.parse(JSON.stringify(init.pasti)):[];
    return gp;
  };
  const [giorniPasti,setGiorniPasti]=useState(initGP);

  const pastiCorrente=giorniPasti[giorno]||[];
  const setPC=newPasti=>setGiorniPasti(prev=>({...prev,[giorno]:newPasti}));

  const addPasto=()=>{
    const n=prompt("Nome del pasto? (es. Colazione, Spuntino, Pranzo...)");
    if(n&&n.trim()) setPC([...pastiCorrente,{id:genId(),nome:n.trim(),alimenti:[]}]);
  };
  const movePasto=(i,dir)=>{const a=[...pastiCorrente],j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];setPC(a);};
  const delPasto=i=>{if(window.confirm("Eliminare intero pasto?"))setPC(pastiCorrente.filter((_,j)=>j!==i));};
  const copyFromPrev=()=>{
    if(giorno<=1)return;
    const prev=giorniPasti[giorno-1];
    if(!prev||prev.length===0)return alert("Il giorno precedente non ha pasti da copiare");
    if(window.confirm(`Copiare i pasti del Giorno ${giorno-1}?`)){
      setPC(JSON.parse(JSON.stringify(prev)).map(p=>({...p,id:genId(),alimenti:p.alimenti.map(a=>({...a,id:genId()}))})));
    }
  };

  const saveAlimento=al=>{
    if(!al.nome.trim())return alert("Inserisci il nome dell'alimento");
    let np=[...pastiCorrente];
    if(alModal.mode==="new"){
      np=np.map((pst,i)=>i===alModal.pIdx?{...pst,alimenti:[...pst.alimenti,{...al,id:genId()}]}:pst);
    } else {
      np=np.map((pst,i)=>i===alModal.pIdx?{...pst,alimenti:pst.alimenti.map((a,j)=>j===alModal.aIdx?{...al}:a)}:pst);
    }
    setPC(np);
    setAlModal(null);
  };
  const delAlim=(pi,ai)=>setPC(pastiCorrente.map((pst,i)=>i===pi?{...pst,alimenti:pst.alimenti.filter((_,j)=>j!==ai)}:pst));

  const totKcalGiorno=pastiCorrente.reduce((a,p)=>a+p.alimenti.reduce((b,al)=>b+(+al.kcal||0),0),0);
  const totKcalSett=Object.values(giorniPasti).reduce((a,pasti)=>a+pasti.reduce((b,p)=>b+p.alimenti.reduce((c,al)=>c+(+al.kcal||0),0),0),0);

  return (
    <>
      <div className="content fi">
        <button className="bb" onClick={onBack}><IcChevL/> Indietro</button>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
          <h1 className="pt">{init.id?"MODIFICA":"NUOVO"}<br/>PIANO</h1>
          <button className="btn btn-s" style={{marginTop:6,fontSize:11,gap:5}} onClick={()=>setPdfModal(true)}><IcFile size={14}/> PDF</button>
        </div>

        <div className="ig"><label className="lbl">Nome del piano</label><input className="inp" placeholder="es. Massa Invernale, Definizione..." value={nome} onChange={e=>setNome(e.target.value)}/></div>

        <div className="wh" style={{borderColor:"#30D158",background:"rgba(48,209,88,.1)"}}>
          <div className="wt" style={{color:"#30D158"}}>TARGET — {GIORNI_LABEL[giorno].toUpperCase()}</div>
          <div className="wlv" style={{color:"#30D158"}}>{totKcalGiorno} kcal</div>
          <div style={{fontSize:12,color:"var(--dim)",marginTop:4}}>{pastiCorrente.length} pasti · {totKcalSett} kcal totali settimana</div>
        </div>

        <div className="st">GIORNO DELLA SETTIMANA</div>
        <div className="day-pill">
          {[1,2,3,4,5,6,7].map(d=>(
            <button key={d} className={`dpb${giorno===d?" on":""}${giorniPasti[d]?.length>0&&giorno!==d?" log":""}`} onClick={()=>setGiorno(d)}>
              <div>{GIORNI_SHORT[d]}</div>
              <div style={{fontSize:8,marginTop:2}}>G{d}</div>
            </button>
          ))}
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div className="st" style={{margin:0}}>PASTI — {GIORNI_LABEL[giorno].toUpperCase()}</div>
          <div style={{display:"flex",gap:6}}>
            {giorno>1&&<button className="btn btn-s" style={{fontSize:11,padding:"7px 10px"}} onClick={copyFromPrev}>Copia G{giorno-1}</button>}
            <button className="btn btn-s" onClick={addPasto}><IcPlus/> PASTO</button>
          </div>
        </div>

        {pastiCorrente.length===0&&(
          <div className="emp" style={{padding:"20px 0"}}>
            <div style={{fontSize:13,color:"var(--dim)"}}>Nessun pasto per {GIORNI_LABEL[giorno]}</div>
            <div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>Aggiungi pasti o copia dal giorno precedente</div>
          </div>
        )}

        {pastiCorrente.map((p,pi)=>(
          <div key={p.id} className="card" style={{padding:"12px",marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,borderBottom:"1px solid var(--bdr)",paddingBottom:8}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:".05em",color:"#30D158"}}>{p.nome}</div>
              <div style={{display:"flex",gap:4}}>
                <button className="bico" style={{padding:5}} onClick={()=>movePasto(pi,-1)} disabled={pi===0}><IcArrowUp size={14}/></button>
                <button className="bico" style={{padding:5}} onClick={()=>movePasto(pi,1)} disabled={pi===pastiCorrente.length-1}><IcArrowDown size={14}/></button>
                <button className="bico d" style={{padding:5}} onClick={()=>delPasto(pi)}><IcTrash size={14}/></button>
              </div>
            </div>
            {p.alimenti.length===0&&<div style={{fontSize:12,color:"var(--mut)",marginBottom:10,fontStyle:"italic"}}>Nessun alimento.</div>}
            {p.alimenti.map((al,ai)=>(
              <div key={al.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"var(--sur)",padding:"8px 10px",borderRadius:8,marginBottom:6}}>
                <div>
                  <div style={{fontWeight:600,fontSize:14}}>{al.nome}</div>
                  <div style={{fontSize:11,color:"var(--dim)",marginTop:2}}>{al.grammi}g · {al.kcal} kcal</div>
                </div>
                <div style={{display:"flex",gap:4}}>
                  <button className="bico" style={{padding:5,border:"none"}} onClick={()=>setAlModal({mode:"edit",pIdx:pi,aIdx:ai,data:{...al}})}><IcEdit size={14}/></button>
                  <button className="bico d" style={{padding:5,border:"none"}} onClick={()=>delAlim(pi,ai)}><IcTrash size={14}/></button>
                </div>
              </div>
            ))}
            <button className="btn btn-s btn-full" style={{marginTop:6,fontSize:11,padding:"8px"}} onClick={()=>setAlModal({mode:"new",pIdx:pi,data:{nome:"",grammi:"",kcal:""}})}><IcPlus/> AGGIUNGI ALIMENTO</button>
          </div>
        ))}

        <div className="div"/>
        <button className="btn btn-p btn-full" style={{background:"#30D158"}} onClick={()=>{
          if(!nome.trim())return alert("Dai un nome al tuo piano");
          onSave({...init,nome:nome.trim(),durataGiorni:7,pasti:giorniPasti[1]||[],giorniPasti});
        }}><IcCheck/> SALVA PIANO</button>
      </div>
      {alModal&&<AlimentoModal init={alModal.data} mode={alModal.mode} onSave={saveAlimento} onClose={()=>setAlModal(null)}/>}
      {pdfModal&&<PdfImportModal
        onApply={({nomePiano,giorniPasti:gp})=>{
          if(nomePiano&&!nome.trim()) setNome(nomePiano);
          else if(nomePiano) setNome(nomePiano);
          setGiorniPasti(gp);
          setGiorno(1);
        }}
        onClose={()=>setPdfModal(false)}
      />}
    </>
  );
}

// ─── DIETA LOG (TRACKING GIORNALIERO) ─────────────────────
function DietaLog({piani, logDieta, onAdd, onDelete, onBack}) {
  const todayDow=((new Date().getDay()+6)%7)+1; // 1=Lun ... 7=Dom
  const todayIso=fmtIso();
  const [selectedDay,setSelectedDay]=useState(todayDow);
  const [selectedPianoId,setSelectedPianoId]=useState(piani[0]?.id||"");
  const [mangiato,setMangiato]=useState({});
  const [saved,setSaved]=useState(false);

  const piano=piani.find(p=>p.id===selectedPianoId);
  const pastiGiorno=useMemo(()=>{
    if(!piano)return[];
    return piano.giorniPasti?.[selectedDay]||piano.pasti||[];
  },[piano,selectedDay]);

  const existingLog=useMemo(()=>
    logDieta.find(l=>l.data===todayIso&&l.pianoId===selectedPianoId&&l.giornoNumero===selectedDay),
    [logDieta,todayIso,selectedPianoId,selectedDay]
  );

  useEffect(()=>{
    if(existingLog){
      const m={};
      existingLog.pastiLog?.forEach((pasto,pi)=>pasto.alimenti?.forEach((al,ai)=>{if(al.mangiato)m[`${pi}_${ai}`]=true;}));
      setMangiato(m);
    } else {
      setMangiato({});
    }
  },[existingLog]);

  const toggleFood=(pi,ai)=>{const key=`${pi}_${ai}`;setMangiato(prev=>({...prev,[key]:!prev[key]}));};

  const totPreviste=pastiGiorno.reduce((a,p)=>a+p.alimenti.reduce((b,al)=>b+(+al.kcal||0),0),0);
  const totConsumate=pastiGiorno.reduce((a,p,pi)=>a+p.alimenti.reduce((b,al,ai)=>b+(mangiato[`${pi}_${ai}`]?(+al.kcal||0):0),0),0);
  const perc=totPreviste>0?Math.min(100,Math.round(totConsumate/totPreviste*100)):0;

  const daysWithLog=useMemo(()=>{
    const s=new Set();
    logDieta.filter(l=>l.data===todayIso&&l.pianoId===selectedPianoId).forEach(l=>s.add(l.giornoNumero));
    return s;
  },[logDieta,todayIso,selectedPianoId]);

  const handleSave=async()=>{
    if(!piano)return;
    if(existingLog)await onDelete(existingLog.id);
    const log={
      id:genId(),data:todayIso,pianoId:piano.id,pianoNome:piano.nome,
      giornoNumero:selectedDay,totKcalPreviste:totPreviste,totKcalConsumate:totConsumate,
      pastiLog:pastiGiorno.map((p,pi)=>({nome:p.nome,alimenti:p.alimenti.map((al,ai)=>({...al,mangiato:!!mangiato[`${pi}_${ai}`]}))}))
    };
    await onAdd(log);
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  };

  return (
    <div className="content fi">
      <button className="bb" onClick={onBack}><IcChevL/> Indietro</button>
      <h1 className="pt" style={{marginBottom:6}}>TRACKING<br/>DIETA</h1>
      <p className="sub" style={{marginBottom:16}}>{new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}</p>

      {piani.length===0?(
        <div className="emp"><div className="emp-ic">🍎</div><div className="emp-t">Nessun piano creato</div><div style={{fontSize:13,color:"var(--dim)"}}>Crea prima un piano alimentare</div></div>
      ):(
        <>
          {piani.length>1&&(
            <div className="ig">
              <label className="lbl">Piano alimentare</label>
              <select className="inp" value={selectedPianoId} onChange={e=>{setSelectedPianoId(e.target.value);setMangiato({});}}>
                {piani.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
            </div>
          )}

          <div className="st">GIORNO DELLA SETTIMANA</div>
          <div className="day-pill">
            {[1,2,3,4,5,6,7].map(d=>(
              <button key={d} className={`dpb${selectedDay===d?" on":""}${daysWithLog.has(d)&&selectedDay!==d?" log":""}`} onClick={()=>{setSelectedDay(d);setMangiato({});}}>
                <div>{GIORNI_SHORT[d]}</div>
                <div style={{fontSize:8,marginTop:2}}>G{d}</div>
              </button>
            ))}
          </div>

          {totPreviste>0&&(
            <div className="kcal-sum">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <span style={{fontSize:12,fontWeight:700,color:"#30D158",textTransform:"uppercase",letterSpacing:".07em"}}>Calorie {GIORNI_LABEL[selectedDay]}</span>
                <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,color:"#30D158"}}>{totConsumate} / {totPreviste} kcal</span>
              </div>
              <div className="kcal-bar"><div className="kcal-fill" style={{width:perc+"%"}}/></div>
              <div style={{fontSize:11,color:"var(--dim)",marginTop:4}}>{perc}% del target giornaliero</div>
            </div>
          )}

          {pastiGiorno.length===0?(
            <div className="emp" style={{padding:"24px 0"}}>
              <div className="emp-ic">📅</div>
              <div style={{fontSize:13,color:"var(--dim)"}}>Nessun pasto pianificato per {GIORNI_LABEL[selectedDay]}</div>
              <div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>Modifica il piano per aggiungere pasti a questo giorno</div>
            </div>
          ):(
            <>
              <div className="st" style={{marginBottom:10}}>PASTI — {GIORNI_LABEL[selectedDay].toUpperCase()}</div>
              {pastiGiorno.map((pasto,pi)=>{
                const pastoKcal=pasto.alimenti.reduce((a,al)=>a+(+al.kcal||0),0);
                const pastoEaten=pasto.alimenti.reduce((a,al,ai)=>a+(mangiato[`${pi}_${ai}`]?(+al.kcal||0):0),0);
                const tuttiMangiati=pasto.alimenti.length>0&&pasto.alimenti.every((_,ai)=>mangiato[`${pi}_${ai}`]);
                return (
                  <div key={pasto.id||pi} style={{background:"var(--sur)",border:`1px solid ${tuttiMangiati?"#30D158":"var(--bdr)"}`,borderRadius:10,padding:12,marginBottom:10,transition:"border-color .2s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,borderBottom:"1px solid var(--bdr)",paddingBottom:8}}>
                      <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:".05em",color:tuttiMangiati?"#30D158":"var(--txt)"}}>{pasto.nome}{tuttiMangiati&&" ✓"}</div>
                      <div style={{fontSize:11,color:"var(--dim)"}}>{pastoEaten>0?`${pastoEaten} / `:""}{pastoKcal} kcal</div>
                    </div>
                    {pasto.alimenti.map((al,ai)=>{
                      const eaten=!!mangiato[`${pi}_${ai}`];
                      return (
                        <div key={al.id||ai} className="frow">
                          <div style={{flex:1,opacity:eaten?.55:1,transition:"opacity .15s"}}>
                            <div style={{fontWeight:600,fontSize:13,textDecoration:eaten?"line-through":"none"}}>{al.nome}</div>
                            <div style={{fontSize:11,color:"var(--dim)",marginTop:1}}>{al.grammi}g · {al.kcal} kcal</div>
                          </div>
                          <button className={`fck${eaten?" ok":""}`} onClick={()=>toggleFood(pi,ai)}>
                            {eaten&&<Ico d="M20 6L9 17l-5-5" size={12} stroke="#fff" sw={2.5}/>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <button className="btn btn-p btn-full" style={{background:saved?"#059669":"#30D158",marginTop:8,transition:"background .3s"}} onClick={handleSave}>
                {saved?<><Ico d="M20 6L9 17l-5-5" size={16} stroke="#fff" sw={2.5}/> SALVATO!</>:<><IcApple/> SALVA LOG GIORNATA</>}
              </button>
              {existingLog&&<div style={{textAlign:"center",fontSize:11,color:"#30D158",marginTop:8}}>✓ Log già salvato per oggi — il salvataggio sovrascriverà il precedente</div>}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ─── PDF IMPORT MODAL (via Groq + PDF.js) ─────────────────
const GROQ_PROMPT = `Sei un assistente nutrizionale. L'utente ti fornisce il testo estratto da un PDF di un piano alimentare settimanale italiano.
Estrai la struttura per ogni giorno (Giorno 1=Lunedì, Giorno 2=Martedì, ..., Giorno 7=Domenica).
Per ogni giorno identifica i pasti (Colazione, Spuntino Mattina, Pranzo, Spuntino Pomeriggio, Cena, ecc.) e per ogni pasto gli alimenti con grammi e kcal totali per quella porzione.
Se le kcal non sono specificate, stimale ragionevolmente in base ai grammi e al tipo di alimento.
Se il piano alimentare è uguale per tutti i giorni, replicalo per tutti e 7.
Rispondi SOLO con JSON valido (nessun testo aggiuntivo, nessun markdown, nessun backtick):
{"nomePiano":"nome del piano","giorniPasti":{"1":[{"id":"g1p1","nome":"Colazione","alimenti":[{"id":"g1p1a1","nome":"Pane integrale","grammi":"50","kcal":"120"}]}],"2":[...],"3":[...],"4":[...],"5":[...],"6":[...],"7":[...]}}`;

// Carica PDF.js dal CDN la prima volta
const loadPdfJs = () => new Promise((resolve, reject) => {
  if (window.pdfjsLib) return resolve(window.pdfjsLib);
  const script = document.createElement("script");
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  script.onload = () => {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    resolve(window.pdfjsLib);
  };
  script.onerror = () => reject(new Error("Impossibile caricare PDF.js"));
  document.head.appendChild(script);
});

const estraiTestoPdf = async (file) => {
  const pdfjsLib = await loadPdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({data: buffer}).promise;
  let testo = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    testo += content.items.map(it => it.str).join(" ") + "\n";
  }
  return testo.trim();
};

function PdfImportModal({onApply, onClose}) {
  const [fase, setFase] = useState(1); // 1=select, 2=loading, 3=preview
  const [apiKey, setApiKey] = useState(()=>localStorage.getItem("groq_key")||"");
  const [file, setFile] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errore, setErrore] = useState("");
  const [parsed, setParsed] = useState(null);

  const analizza = async () => {
    if (!file) return setErrore("Seleziona un file PDF");
    if (!apiKey.trim()) return setErrore("Inserisci la tua Groq API key");
    if (!file.name.toLowerCase().endsWith(".pdf")) return setErrore("Il file deve essere un PDF");
    setErrore("");
    setFase(2);
    try {
      // Step 1: estrai testo dal PDF con PDF.js
      setLoadingMsg("Lettura del PDF in corso...");
      const testoPdf = await estraiTestoPdf(file);
      if (!testoPdf || testoPdf.length < 50) throw new Error("Non è stato possibile estrarre testo dal PDF. Verifica che non sia un PDF solo-immagine.");

      // Step 2: invia testo a Groq
      setLoadingMsg("Analisi con Groq AI (LLaMA 3)...");
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {"Content-Type":"application/json", "Authorization":`Bearer ${apiKey.trim()}`},
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {role:"system", content: GROQ_PROMPT},
            {role:"user", content: `Ecco il testo estratto dal PDF del piano alimentare:\n\n${testoPdf.slice(0,12000)}`}
          ],
          temperature: 0.1,
          max_tokens: 8192
        })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(()=>({}));
        throw new Error(err?.error?.message || `Errore Groq: ${resp.status}`);
      }
      const data = await resp.json();
      let testo = data?.choices?.[0]?.message?.content || "";

      // Estrai JSON (gestisce anche ```json ... ```)
      const match = testo.match(/\{[\s\S]+\}/);
      if (!match) throw new Error("Il modello non ha restituito JSON valido. Riprova.");
      const obj = JSON.parse(match[0]);
      if (!obj.giorniPasti) throw new Error("Struttura JSON non riconosciuta. Riprova.");

      localStorage.setItem("groq_key", apiKey.trim());
      setParsed(obj);
      setFase(3);
    } catch(e) {
      setErrore(e.message || "Errore sconosciuto");
      setFase(1);
    }
  };

  const applica = () => {
    if (!parsed) return;
    const gp = {};
    for (let d = 1; d <= 7; d++) {
      gp[d] = (parsed.giorniPasti[d] || parsed.giorniPasti[String(d)] || []).map(p => ({
        ...p, id: genId(),
        alimenti: (p.alimenti||[]).map(a => ({...a, id:genId(), grammi:String(a.grammi||""), kcal:String(a.kcal||"")}))
      }));
    }
    onApply({nomePiano: parsed.nomePiano||"", giorniPasti: gp});
    onClose();
  };

  return (
    <div className="mov" onClick={onClose}>
      <div className="mod" onClick={e=>e.stopPropagation()} style={{maxHeight:"90vh"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:".05em"}}>IMPORTA DA PDF</span>
          <button className="bico" onClick={onClose}><IcClose/></button>
        </div>

        {fase===1&&(
          <>
            <div style={{marginBottom:16}}>
              <div className="import-step"><span className="import-num">1</span><span style={{fontSize:13}}>Registrati gratis su <b>console.groq.com</b> (solo email, no carta)</span></div>
              <div className="import-step"><span className="import-num">2</span><span style={{fontSize:13}}>Vai in <b>API Keys</b> e crea una nuova chiave</span></div>
              <div className="import-step"><span className="import-num">3</span><span style={{fontSize:13}}>Carica il PDF — Groq AI (LLaMA 3.1) estrae i pasti automaticamente</span></div>
            </div>

            <div className="ig">
              <label className="lbl">Groq API Key{apiKey&&" ✓ salvata"}</label>
              <input className="inp" type="password" placeholder="gsk_..." value={apiKey} onChange={e=>setApiKey(e.target.value)}/>
              <div style={{fontSize:11,color:"var(--mut)",marginTop:4}}>Salvata solo nel tuo browser · Non va su GitHub · Free tier: 14.400 req/giorno</div>
            </div>

            <div className="ig">
              <label className="lbl">File PDF piano alimentare</label>
              <div
                style={{border:"2px dashed var(--bdr)",borderRadius:10,padding:"18px",textAlign:"center",cursor:"pointer",transition:"all .15s",background:file?"var(--acc2)":"none",borderColor:file?"var(--acc)":"var(--bdr)"}}
                onClick={()=>document.getElementById("pdf-input").click()}
              >
                {file
                  ? <><IcFile/><div style={{fontSize:13,fontWeight:600,marginTop:6,color:"var(--acc)"}}>{file.name}</div><div style={{fontSize:11,color:"var(--dim)",marginTop:2}}>{(file.size/1024).toFixed(0)} KB</div></>
                  : <><IcUpload/><div style={{fontSize:13,color:"var(--dim)",marginTop:6}}>Tocca per selezionare il PDF</div></>
                }
                <input id="pdf-input" type="file" accept=".pdf,application/pdf" style={{display:"none"}} onChange={e=>{setFile(e.target.files[0]||null);setErrore("");}}/>
              </div>
            </div>

            {errore&&<div style={{color:"var(--dan)",fontSize:13,marginBottom:12,padding:"10px",background:"var(--dan2)",borderRadius:8}}>{errore}</div>}
            <button className="btn btn-p btn-full" onClick={analizza}><IcUpload/> ANALIZZA PDF</button>
          </>
        )}

        {fase===2&&(
          <div style={{textAlign:"center",padding:"32px 16px"}}>
            <div className="spin" style={{fontSize:36,marginBottom:16}}>⚙️</div>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:".05em",marginBottom:8}}>ANALISI IN CORSO</div>
            <div style={{fontSize:13,color:"var(--dim)",marginBottom:4}}>{loadingMsg}</div>
            <div style={{fontSize:11,color:"var(--mut)"}}>Può richiedere 10-20 secondi</div>
          </div>
        )}

        {fase===3&&parsed&&(
          <>
            <div style={{background:"rgba(48,209,88,.1)",border:"1px solid #30D158",borderRadius:10,padding:12,marginBottom:16}}>
              <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"#30D158",marginBottom:4}}>✓ ESTRATTO CON SUCCESSO</div>
              {parsed.nomePiano&&<div style={{fontSize:13,fontWeight:600}}>{parsed.nomePiano}</div>}
            </div>

            <div className="st" style={{marginBottom:8}}>ANTEPRIMA STRUTTURA</div>
            {[1,2,3,4,5,6,7].map(d=>{
              const pasti = parsed.giorniPasti[d] || parsed.giorniPasti[String(d)] || [];
              const kcal = pasti.reduce((a,p)=>a+p.alimenti.reduce((b,al)=>b+(+al.kcal||0),0),0);
              return (
                <div key={d} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid var(--bdr)"}}>
                  <div style={{fontSize:13,fontWeight:600}}>{GIORNI_LABEL[d]}</div>
                  <div style={{display:"flex",gap:12,alignItems:"center"}}>
                    <span style={{fontSize:11,color:"var(--dim)"}}>{pasti.length} pasti</span>
                    <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:16,color:"#30D158"}}>{kcal>0?`${kcal} kcal`:"—"}</span>
                  </div>
                </div>
              );
            })}

            <div style={{marginTop:16,display:"flex",gap:8}}>
              <button className="btn btn-s" style={{flex:1}} onClick={()=>{setParsed(null);setFase(1);}}>RIPROVA</button>
              <button className="btn btn-p" style={{flex:2,background:"#30D158"}} onClick={applica}><IcCheck/> APPLICA AL PIANO</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── ALIMENTO MODAL (POPUP INSERIMENTO CIBO) ──────────────
function AlimentoModal({init,mode,onSave,onClose}) {
  const [d,setD]=useState({...init});
  const upd=(k,v)=>setD(p=>({...p,[k]:v}));
  
  return (
    <div className="mov" onClick={onClose}>
      <div className="mod" onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:".05em", color:"#30D158"}}>{mode==="new"?"NUOVO ALIMENTO":"MODIFICA"}</span>
          <button className="bico" onClick={onClose}><IcClose/></button>
        </div>
        
        <div className="ig"><label className="lbl">Nome alimento *</label><input className="inp" placeholder="es. Pollo, Riso Basmati, Uova..." value={d.nome} onChange={e=>upd("nome",e.target.value)}/></div>
        
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div><label className="lbl">Grammi / Qtà</label><input className="inp" type="number" min="0" placeholder="es. 100" value={d.grammi} onChange={e=>upd("grammi",e.target.value)}/></div>
          <div><label className="lbl">Kcal Totali</label><input className="inp" type="number" min="0" placeholder="es. 350" value={d.kcal} onChange={e=>upd("kcal",e.target.value)}/></div>
        </div>
        
        <p style={{fontSize:11, color:"var(--mut)", marginBottom: 18, fontStyle:"italic"}}>
          Inserisci le Kcal totali relative alla porzione che hai indicato. 
        </p>
        
        <button className="btn btn-p btn-full" style={{background:"#30D158"}} onClick={()=>onSave(d)}><IcCheck/> {mode==="new"?"AGGIUNGI":"SALVA"}</button>
      </div>
    </div>
  );
}
