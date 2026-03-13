import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
const SUPABASE_URL = "https://ilvlyocxcbmdwrvnhynp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlsdmx5b2N4Y2JtZHdydm5oeW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODY0NjMsImV4cCI6MjA4ODk2MjQ2M30.KXUtvvIrml3oZyHy6g_zeSK8dt2APXNWqK_4-BUN4To";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const db = {
  async get(table) {
    const { data } = await supabase.from(table).select("*");
    return data ? data.map(r => r.data) : [];
  },
  async setSchede(schede) {
    await supabase.from("schede").delete().neq("id","__none__");
    if (schede.length > 0)
      await supabase.from("schede").insert(schede.map(s => ({ id: s.id, data: s })));
  },
  async addSessione(sess) {
    await supabase.from("sessioni").insert({ id: sess.id, data: sess });
  },
  async deleteSessione(id) {
    await supabase.from("sessioni").delete().eq("id", id);
  }
};

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const formatDur = (s) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60; return h?`${h}h ${m}m`:(m?`${m}m ${sec}s`:`${sec}s`); };
const fmtDate = (d) => new Date(d).toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short',year:'numeric'});

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@300;400;500;600;700&display=swap');
:root{--bg:#080808;--sur:#111;--card:#181818;--bdr:#252525;--acc:#1E90FF;--acc2:rgba(30,144,255,.14);--dan:#FF3B30;--dan2:rgba(255,59,48,.12);--ok:#30D158;--txt:#F0F0F0;--dim:#BBBBBB;--mut:#888888;}
*{box-sizing:border-box;margin:0;padding:0;}
body{background:var(--bg);color:var(--txt);font-family:'Barlow',sans-serif;}
.app{max-width:480px;margin:0 auto;min-height:100vh;display:flex;flex-direction:column;background:var(--bg);}
.nav{position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:var(--sur);border-top:1px solid var(--bdr);display:flex;z-index:100;}
.nb{flex:1;padding:12px 6px 10px;background:none;border:none;color:var(--mut);cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;font-family:'Barlow',sans-serif;font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;transition:color .15s;}
.nb.on{color:var(--acc);}
.content{flex:1;padding:16px 16px 90px;overflow-y:auto;}
h1.pt{font-family:'Bebas Neue',cursive;font-size:38px;letter-spacing:.05em;line-height:1;}
.sub{font-size:12px;color:var(--dim);margin-top:3px;}
.card{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:16px;margin-bottom:12px;}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:12px 18px;border-radius:10px;border:none;cursor:pointer;font-family:'Barlow',sans-serif;font-weight:700;font-size:13px;letter-spacing:.05em;text-transform:uppercase;transition:all .15s;}
.btn-p{background:var(--acc);color:#000;}.btn-p:hover{opacity:.9;}
.btn-s{background:var(--card);color:var(--txt);border:1px solid var(--bdr);}.btn-s:hover{border-color:var(--acc);color:var(--acc);}
.btn-full{width:100%;}
.bico{padding:7px;border-radius:8px;background:var(--card);border:1px solid var(--bdr);color:var(--dim);cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:all .15s;line-height:0;}
.bico:hover{border-color:var(--acc);color:var(--acc);}.bico.d:hover{border-color:var(--dan);color:var(--dan);}
.lbl{display:block;font-size:11px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--dim);margin-bottom:5px;}
.inp{width:100%;background:var(--sur);border:1px solid var(--bdr);border-radius:8px;padding:10px 13px;color:var(--txt);font-family:'Barlow',sans-serif;font-size:15px;outline:none;transition:border-color .15s;}
.inp:focus{border-color:var(--acc);}.inp::placeholder{color:var(--mut);}
.ig{margin-bottom:14px;}
.tag{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;}
.tag-a{background:var(--acc2);color:var(--acc);}.tag-m{background:var(--bdr);color:var(--dim);}
.exn{font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:.05em;}
.exs{display:flex;gap:12px;margin-top:5px;flex-wrap:wrap;}
.ep{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--dim);font-weight:500;}.ep b{color:var(--txt);font-weight:700;}
.set-r{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--bdr);}.set-r:last-child{border-bottom:none;}
.set-n{font-family:'Bebas Neue',cursive;font-size:26px;color:var(--mut);width:28px;text-align:center;line-height:1;}.set-n.ok{color:var(--acc);}
.sinp{background:var(--card);border:1px solid var(--bdr);border-radius:6px;padding:8px;color:var(--txt);font-family:'Barlow',sans-serif;font-size:16px;font-weight:700;width:68px;text-align:center;outline:none;}
.sinp:focus{border-color:var(--acc);}
.sck{margin-left:auto;width:32px;height:32px;border-radius:50%;border:2px solid var(--bdr);background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;flex-shrink:0;}
.sck.ok{background:var(--acc);border-color:var(--acc);}
.rest-ov{position:fixed;inset:0;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;z-index:200;flex-direction:column;gap:12px;cursor:pointer;}
.rest-t{font-family:'Bebas Neue',cursive;font-size:120px;color:var(--acc);line-height:1;}
.rest-l{font-size:13px;color:var(--dim);text-transform:uppercase;letter-spacing:.12em;}
.mu{border:2px dashed var(--bdr);border-radius:10px;padding:18px;text-align:center;cursor:pointer;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px;}.mu:hover{border-color:var(--acc);}
.mpv{width:100%;max-height:180px;object-fit:cover;border-radius:8px;margin-top:8px;}
.pbar{height:4px;background:var(--bdr);border-radius:2px;overflow:hidden;margin:8px 0;}
.pfil{height:100%;background:var(--acc);border-radius:2px;transition:width .4s;}
.div{height:1px;background:var(--bdr);margin:16px 0;}
.emp{text-align:center;padding:48px 20px;color:var(--mut);}
.emp-ic{font-size:44px;margin-bottom:12px;}
.emp-t{font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:.05em;color:var(--dim);margin-bottom:6px;}
.sc{background:var(--card);border:1px solid var(--bdr);border-radius:12px;padding:16px;margin-bottom:10px;cursor:pointer;transition:border-color .15s;}.sc:hover{border-color:var(--acc);}
.bb{display:inline-flex;align-items:center;gap:6px;background:none;border:none;color:var(--dim);cursor:pointer;font-family:'Barlow',sans-serif;font-size:12px;font-weight:600;padding:0;margin-bottom:14px;text-transform:uppercase;letter-spacing:.07em;transition:color .15s;}.bb:hover{color:var(--acc);}
.mov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:150;display:flex;align-items:flex-end;justify-content:center;}
.mod{background:var(--card);border:1px solid var(--bdr);border-radius:20px 20px 0 0;padding:22px;width:100%;max-width:480px;max-height:88vh;overflow-y:auto;}
.wh{background:linear-gradient(135deg,var(--acc2) 0%,transparent 60%);border:1px solid var(--acc);border-radius:16px;padding:18px;margin-bottom:18px;}
.wt{font-family:'Bebas Neue',cursive;font-size:22px;letter-spacing:.05em;}
.wlv{font-family:'Bebas Neue',cursive;font-size:52px;color:var(--acc);letter-spacing:.05em;line-height:1;}
.st{font-family:'Bebas Neue',cursive;font-size:13px;letter-spacing:.15em;color:var(--mut);text-transform:uppercase;margin-bottom:9px;}
.hg{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:18px;}
.hsc{background:var(--card);border:1px solid var(--bdr);border-radius:14px;padding:14px;}
.hsv{font-family:'Bebas Neue',cursive;font-size:42px;color:var(--acc);letter-spacing:.05em;line-height:1;}
.hsl{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.08em;margin-top:3px;}
.sd{font-family:'Bebas Neue',cursive;font-size:19px;letter-spacing:.05em;}
.sdn{font-size:13px;color:var(--dim);margin-top:2px;}
.ss{display:flex;gap:18px;margin-top:10px;}
.ssv{font-size:13px;color:var(--mut);}.ssv b{display:block;font-size:20px;font-family:'Bebas Neue',cursive;color:var(--acc);letter-spacing:.05em;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:var(--bdr);}
@keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fi .25s ease;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}.pls{animation:pulse 1.5s infinite;}
select.inp{appearance:none;}textarea.inp{resize:vertical;min-height:72px;}
`;

const Ico = ({d,size=20,fill="none",sw=1.8}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d)?d.map((p,i)=><path key={i} d={p}/>):<path d={d}/>}
  </svg>
);
const IcHome=()=><Ico d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10"/>;
const IcBook=()=><Ico d={["M4 19.5A2.5 2.5 0 016.5 17H20","M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"]}/>;
const IcHistory=()=><Ico d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>;
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

export default function App() {
  const [tab, setTab] = useState("home");
  const [schede, setSchede] = useState([]);
  const [sessioni, setSessioni] = useState([]);
  const [subview, setSubview] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const sc = await db.get("schede"); setSchede(sc||[]);
      const ss = await db.get("sessioni");
      setSessioni((ss||[]).sort((a,b)=>new Date(b.data)-new Date(a.data)));
      setLoaded(true);
    })();
  }, []);

  const saveSchede = async (s) => { setSchede(s); await db.setSchede(s); };
  const addSessione = async (s) => {
    const next = [s, ...sessioni]; setSessioni(next);
    await db.addSessione(s);
  };
  const delSessione = async (id) => {
    setSessioni(p => p.filter(s=>s.id!==id));
    await db.deleteSessione(id);
  };

  if (!loaded) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#080808"}}>
      <style>{CSS}</style>
      <div className="pls" style={{fontFamily:"'Bebas Neue',cursive",fontSize:32,color:"#1E90FF",letterSpacing:".1em"}}>CARICAMENTO...</div>
    </div>
  );

  if (subview?.type==="scheda-edit") return <div className="app"><style>{CSS}</style><SchedaEdit scheda={subview.data} onSave={(sc)=>{const next=sc.id?schede.map(s=>s.id===sc.id?sc:s):[...schede,{...sc,id:genId()}];saveSchede(next);setSubview(null);}} onBack={()=>setSubview(null)}/></div>;
  if (subview?.type==="allenamento") return <div className="app"><style>{CSS}</style><Allenamento scheda={subview.data} onComplete={(s)=>{addSessione(s);setSubview(null);setTab("storico");}} onBack={()=>setSubview(null)}/></div>;
  if (subview?.type==="sessione") return <div className="app"><style>{CSS}</style><SessioneDetail sessione={subview.data} onBack={()=>setSubview(null)}/></div>;

  return (
    <div className="app">
      <style>{CSS}</style>
      <div className="content fi">
        {tab==="home" && <Home schede={schede} sessioni={sessioni} onStart={sc=>setSubview({type:"allenamento",data:sc})} onGoSchede={()=>setTab("schede")}/>}
        {tab==="schede" && <Schede schede={schede} onNew={()=>setSubview({type:"scheda-edit",data:{nome:"",esercizi:[]}})} onEdit={sc=>setSubview({type:"scheda-edit",data:sc})} onDelete={id=>saveSchede(schede.filter(s=>s.id!==id))} onStart={sc=>setSubview({type:"allenamento",data:sc})}/>}
        {tab==="storico" && <Storico sessioni={sessioni} onDetail={s=>setSubview({type:"sessione",data:s})} onDelete={delSessione}/>}
      </div>
      <nav className="nav">
        {[["home","HOME",<IcHome/>],["schede","SCHEDE",<IcBook/>],["storico","STORICO",<IcHistory/>]].map(([t,l,ic])=>(
          <button key={t} className={`nb${tab===t?" on":""}`} onClick={()=>setTab(t)}>{ic}<span>{l}</span></button>
        ))}
      </nav>
    </div>
  );
}

function Home({schede,sessioni,onStart,onGoSchede}) {
  const [pick,setPick]=useState(false);
  const totKg=sessioni.reduce((a,s)=>a+s.esercizi.reduce((b,e)=>b+e.serie.reduce((c,sr)=>c+(sr.completata?(+sr.kg||0)*(+sr.reps||0):0),0),0),0);
  const last=sessioni[0];
  return (
    <>
      <div style={{paddingTop:20,paddingBottom:8,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div><h1 className="pt">RENATO'S<br/>WORKOUT</h1><p className="sub">Diario di allenamento</p></div>
        <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:12,color:"var(--dim)",textAlign:"right",letterSpacing:".1em"}}>{new Date().toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}</div>
      </div>
      <div className="hg" style={{marginTop:18}}>
        {[[sessioni.length,"Sessioni"],[schede.length,"Schede"],[Math.round(totKg/1000)||0,"Tonnellate"],[sessioni.length?Math.round(sessioni.reduce((a,s)=>a+(s.durata||0),0)/sessioni.length):0,"Min avg"]].map(([v,l])=>(
          <div key={l} className="hsc"><div className="hsv">{v}</div><div className="hsl">{l}</div></div>
        ))}
      </div>
      {schede.length>0
        ? <button className="btn btn-p btn-full" style={{fontSize:16,padding:"16px",marginBottom:18}} onClick={()=>setPick(true)}><IcPlay/> INIZIA ALLENAMENTO</button>
        : <button className="btn btn-s btn-full" style={{marginBottom:18}} onClick={onGoSchede}><IcPlus/> CREA LA TUA PRIMA SCHEDA</button>
      }
      {last && (
        <div className="card" style={{borderLeft:"3px solid var(--acc)"}}>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,letterSpacing:".05em"}}>{last.schedaNome}</div><div style={{fontSize:12,color:"var(--dim)"}}>{fmtDate(last.data)}</div></div>
            <div className="tag tag-a">{last.durata||0}min</div>
          </div>
          <div style={{display:"flex",gap:14,marginTop:10,flexWrap:"wrap"}}>
            {last.esercizi.slice(0,4).map(e=><span key={e.esercizioId} style={{fontSize:12,color:"var(--dim)"}}><b style={{color:"var(--txt)"}}>{e.nome}</b> {e.serie.filter(s=>s.completata).length}/{e.serie.length}</span>)}
          </div>
        </div>
      )}
      {pick && (
        <div className="mov" onClick={()=>setPick(false)}>
          <div className="mod" onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
              <span style={{fontFamily:"'Bebas Neue',cursive",fontSize:22,letterSpacing:".05em"}}>SCEGLI SCHEDA</span>
              <button className="bico" onClick={()=>setPick(false)}><IcClose/></button>
            </div>
            {schede.map(sc=>(
              <div key={sc.id} className="sc" onClick={()=>{setPick(false);onStart(sc);}}>
                <div className="sd">{sc.nome}</div>
                <div className="sdn">{sc.esercizi?.length||0} esercizi</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

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
            <div><div style={{fontFamily:"'Bebas Neue',cursive",fontSize:24,letterSpacing:".05em"}}>{sc.nome}</div>
            <div style={{fontSize:12,color:"var(--dim)",marginTop:3}}>{sc.esercizi?.length||0} esercizi</div></div>
            <div style={{display:"flex",gap:7}}>
              <button className="bico" onClick={()=>onEdit(sc)}><IcEdit/></button>
              <button className="bico d" onClick={()=>{if(confirm(`Eliminare "${sc.nome}"?`))onDelete(sc.id);}}><IcTrash/></button>
            </div>
          </div>
          {sc.esercizi?.length>0&&<div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>{sc.esercizi.map(e=><span key={e.id} className="tag tag-m">{e.nome}</span>)}</div>}
          <button className="btn btn-s btn-full" style={{marginTop:12}} onClick={()=>onStart(sc)}><IcPlay/> ALLENA ORA</button>
        </div>
      ))}
    </>
  );
}

function SchedaEdit({scheda:init,onSave,onBack}) {
  const [nome,setNome]=useState(init.nome||"");
  const [esercizi,setEsercizi]=useState(init.esercizi||[]);
  const [modal,setModal]=useState(null);
  const applyModal=(e)=>{
    if(!e.nome.trim())return alert("Inserisci il nome dell'esercizio");
    if(modal.mode==="new") setEsercizi(p=>[...p,{...e,id:genId()}]);
    else setEsercizi(p=>p.map((x,i)=>i===modal.idx?{...e}:x));
    setModal(null);
  };
  const moveEx=(i,dir)=>{const a=[...esercizi];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];setEsercizi(a);};
  return (
    <>
      <div className="content fi">
        <button className="bb" onClick={onBack}><IcChevL/> Schede</button>
        <h1 className="pt" style={{marginBottom:18}}>{init.id?"MODIFICA":"NUOVA"}<br/>SCHEDA</h1>
        <div className="ig"><label className="lbl">Nome scheda</label><input className="inp" placeholder="es. Full Body A, Push Day…" value={nome} onChange={e=>setNome(e.target.value)}/></div>
        <div className="div"/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div className="st" style={{margin:0}}>ESERCIZI ({esercizi.length})</div>
          <button className="btn btn-s" onClick={()=>setModal({mode:"new",data:{nome:"",serie:3,ripetizioni:"10",pausa:90,note:"",mediaUrl:"",mediaType:null}})}><IcPlus/> AGGIUNGI</button>
        </div>
        {esercizi.length===0?(
          <div className="emp" style={{padding:"30px 0"}}><div style={{fontSize:13,color:"var(--dim)"}}>Nessun esercizio ancora</div></div>
        ):esercizi.map((e,i)=>(
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
                  <button className="bico" style={{padding:3}} onClick={()=>moveEx(i,-1)} disabled={i===0}><Ico d="M18 15l-6-6-6 6" size={14}/></button>
                  <button className="bico" style={{padding:3}} onClick={()=>moveEx(i,+1)} disabled={i===esercizi.length-1}><Ico d="M6 9l6 6 6-6" size={14}/></button>
                </div>
                <button className="bico" onClick={()=>setModal({mode:"edit",data:{...e},idx:i})}><IcEdit/></button>
                <button className="bico d" onClick={()=>setEsercizi(p=>p.filter((_,j)=>j!==i))}><IcTrash/></button>
              </div>
            </div>
          </div>
        ))}
        <div className="div"/>
        <button className="btn btn-p btn-full" onClick={()=>{if(!nome.trim())return alert("Inserisci un nome");onSave({...init,nome:nome.trim(),esercizi});}}><IcCheck/> SALVA SCHEDA</button>
      </div>
      {modal&&<EsercizioModal init={modal.data} mode={modal.mode} onSave={applyModal} onClose={()=>setModal(null)}/>}
    </>
  );
}

function EsercizioModal({init,mode,onSave,onClose}) {
  const [d,setD]=useState({...init});
  const fileRef=useRef();
  const upd=(k,v)=>setD(p=>({...p,[k]:v}));
  const handleFile=(e)=>{
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

function Allenamento({scheda,onComplete,onBack}) {
  const [sets,setSets]=useState(scheda.esercizi.map(e=>({
    esercizioId:e.id,nome:e.nome,pausa:e.pausa,mediaUrl:e.mediaUrl,mediaType:e.mediaType,note:e.note,
    serie:Array.from({length:e.serie},(_,i)=>({idx:i,kg:"",reps:e.ripetizioni||"",completata:false}))
  })));
  const [elapsed,setElapsed]=useState(0);
  const [rest,setRest]=useState(null);
  const [noteSess,setNoteSess]=useState("");
  const [mediaOpen,setMediaOpen]=useState(null);
  const tiRef=useRef();const reRef=useRef();
  useEffect(()=>{tiRef.current=setInterval(()=>setElapsed(p=>p+1),1000);return()=>clearInterval(tiRef.current);},[]);
  useEffect(()=>{
    if(rest&&rest.rem>0){reRef.current=setTimeout(()=>setRest(p=>p?{...p,rem:p.rem-1}:null),1000);}
    else if(rest&&rest.rem===0)setRest(null);
    return()=>clearTimeout(reRef.current);
  },[rest]);
  const updSet=(ei,si,k,v)=>setSets(p=>p.map((e,i)=>i!==ei?e:{...e,serie:e.serie.map((s,j)=>j!==si?s:{...s,[k]:v})}));
  const completeSet=(ei,si)=>{
    const e=sets[ei];const s=e.serie[si];const ok=!s.completata;
    updSet(ei,si,"completata",ok);
    if(ok&&e.pausa>0)setRest({rem:e.pausa,total:e.pausa,nome:e.nome});
  };
  const done=sets.reduce((a,e)=>a+e.serie.filter(s=>s.completata).length,0);
  const total=sets.reduce((a,e)=>a+e.serie.length,0);
  const finisci=()=>{
    clearInterval(tiRef.current);
    onComplete({id:genId(),data:new Date().toISOString(),schedaId:scheda.id,schedaNome:scheda.nome,durata:Math.round(elapsed/60),note:noteSess,esercizi:sets.map(e=>({esercizioId:e.esercizioId,nome:e.nome,serie:e.serie.map(s=>({reps:s.reps,kg:s.kg,completata:s.completata}))}))});
  };
  return (
    <>
      <div className="content fi">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:16,marginBottom:16}}>
          <button className="bb" style={{margin:0}} onClick={()=>{if(confirm("Interrompere?"))onBack();}}><IcClose/> ESCI</button>
          <div className="pls" style={{fontFamily:"'Bebas Neue',cursive",fontSize:13,color:"var(--acc)",letterSpacing:".1em"}}>● LIVE</div>
        </div>
        <div className="wh">
          <div className="wt">{scheda.nome}</div>
          <div className="wlv">{formatDur(elapsed)}</div>
          <div style={{fontSize:12,color:"var(--dim)",marginTop:4}}>{done}/{total} serie completate</div>
          <div className="pbar"><div className="pfil" style={{width:`${total?Math.round(done/total*100):0}%`}}/></div>
        </div>
        {sets.map((ex,ei)=>(
          <div key={ex.esercizioId} className="card" style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div><div className="exn">{ex.nome}</div>{ex.note&&<div style={{fontSize:11,color:"var(--dim)",fontStyle:"italic",marginTop:2}}>{ex.note}</div>}</div>
              <div style={{display:"flex",gap:6}}>
                {ex.pausa>0&&<div className="tag tag-m"><IcTimer/> {ex.pausa}s</div>}
                {ex.mediaUrl&&<button className="bico" onClick={()=>setMediaOpen(ex)}><IcImg/></button>}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 32px",gap:8,marginBottom:6,fontSize:10,color:"var(--dim)",fontWeight:700,letterSpacing:".07em",textTransform:"uppercase"}}>
              <div>#</div><div style={{textAlign:"center"}}>KG</div><div style={{textAlign:"center"}}>REPS</div><div/>
            </div>
            {ex.serie.map((s,si)=>(
              <div key={si} className="set-r">
                <div className={`set-n${s.completata?" ok":""}`}>{si+1}</div>
                <div style={{flex:1,display:"flex",gap:8}}>
                  <div style={{textAlign:"center"}}><input className="sinp" type="number" min="0" step="0.5" placeholder="—" value={s.kg} onChange={e=>updSet(ei,si,"kg",e.target.value)} disabled={s.completata}/><div style={{fontSize:10,color:"var(--mut)",textAlign:"center",marginTop:2,textTransform:"uppercase",letterSpacing:".05em"}}>kg</div></div>
                  <div style={{textAlign:"center"}}><input className="sinp" type="text" placeholder={s.reps} value={s.reps} onChange={e=>updSet(ei,si,"reps",e.target.value)} disabled={s.completata}/><div style={{fontSize:10,color:"var(--mut)",textAlign:"center",marginTop:2,textTransform:"uppercase",letterSpacing:".05em"}}>reps</div></div>
                </div>
                <button className={`sck${s.completata?" ok":""}`} onClick={()=>completeSet(ei,si)}>{s.completata&&<IcCheck/>}</button>
              </div>
            ))}
          </div>
        ))}
        <div className="ig"><label className="lbl">Note sessione</label><textarea className="inp" rows={3} placeholder="Come ti sei sentito? Osservazioni…" value={noteSess} onChange={e=>setNoteSess(e.target.value)}/></div>
        <button className="btn btn-p btn-full" style={{fontSize:15,padding:16}} onClick={finisci}><IcCheck/> TERMINA ALLENAMENTO</button>
      </div>
      {rest&&(
        <div className="rest-ov" onClick={()=>setRest(null)}>
          <div className="rest-l">RECUPERO — {rest.nome}</div>
          <div className="rest-t">{rest.rem}</div>
          <div style={{width:200,height:4,background:"var(--bdr)",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:"var(--acc)",borderRadius:2,transition:"width 1s linear",width:`${(rest.rem/rest.total)*100}%`}}/></div>
          <div className="rest-l">tocca per saltare</div>
        </div>
      )}
      {mediaOpen&&(
        <div className="rest-ov" onClick={()=>setMediaOpen(null)}>
          <div style={{padding:20,width:"100%",maxWidth:480}} onClick={e=>e.stopPropagation()}>
            <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:18,letterSpacing:".05em",marginBottom:12,textAlign:"center"}}>{mediaOpen.nome}</div>
            {mediaOpen.mediaType==="image"&&<img src={mediaOpen.mediaUrl} style={{width:"100%",borderRadius:12,maxHeight:400,objectFit:"contain"}}/>}
            {mediaOpen.mediaType==="url"&&<div style={{background:"var(--card)",borderRadius:12,padding:20,textAlign:"center"}}><a href={mediaOpen.mediaUrl} target="_blank" rel="noopener noreferrer" style={{color:"var(--acc)",fontSize:14}}>Apri video esterno →</a></div>}
            <button className="btn btn-s btn-full" style={{marginTop:14}} onClick={()=>setMediaOpen(null)}>CHIUDI</button>
          </div>
        </div>
      )}
    </>
  );
}

function Storico({sessioni,onDetail,onDelete}) {
  return (
    <>
      <div style={{paddingTop:20,paddingBottom:16}}>
        <h1 className="pt">STORICO<br/>ALLENAMENTI</h1>
        <p className="sub">{sessioni.length} sessioni registrate</p>
      </div>
      {sessioni.length===0?(
        <div className="emp"><div className="emp-ic">📊</div><div className="emp-t">Nessuna sessione</div><p style={{fontSize:13}}>Completa un allenamento per vedere qui le statistiche</p></div>
      ):sessioni.map(s=>{
        const tot=s.esercizi.reduce((a,e)=>a+e.serie.filter(sr=>sr.completata).length,0);
        const vol=s.esercizi.reduce((a,e)=>a+e.serie.reduce((b,sr)=>b+(sr.completata?(+sr.kg||0)*(+sr.reps||0):0),0),0);
        return (
          <div key={s.id} className="sc" onClick={()=>onDetail(s)}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div><div className="sd">{s.schedaNome}</div><div className="sdn">{fmtDate(s.data)}</div></div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div className="tag tag-a">{s.durata||0}min</div>
                <button className="bico d" onClick={e=>{e.stopPropagation();if(confirm("Eliminare?"))onDelete(s.id);}}><IcTrash/></button>
              </div>
            </div>
            <div className="ss">
              <div className="ssv"><b>{s.esercizi.length}</b>Esercizi</div>
              <div className="ssv"><b>{tot}</b>Serie ok</div>
              <div className="ssv"><b>{Math.round(vol)}</b>Vol (kg×r)</div>
            </div>
            {s.note&&<div style={{fontSize:12,color:"var(--dim)",marginTop:8,fontStyle:"italic",borderTop:"1px solid var(--bdr)",paddingTop:8}}>{s.note}</div>}
          </div>
        );
      })}
    </>
  );
}

function SessioneDetail({sessione:s,onBack}) {
  return (
    <div className="content fi">
      <button className="bb" onClick={onBack}><IcChevL/> Storico</button>
      <div style={{marginBottom:18}}><h1 className="pt">{s.schedaNome}</h1><p className="sub">{fmtDate(s.data)} · {s.durata||0} min</p></div>
      <div className="hg" style={{marginBottom:18}}>
        {[[s.esercizi.length,"Esercizi"],[s.esercizi.reduce((a,e)=>a+e.serie.filter(sr=>sr.completata).length,0),"Serie OK"],[Math.round(s.esercizi.reduce((a,e)=>a+e.serie.reduce((b,sr)=>b+(sr.completata?(+sr.kg||0)*(+sr.reps||0):0),0),0)),"Volume"],[s.durata||0,"Minuti"]].map(([v,l])=>(
          <div key={l} className="hsc"><div className="hsv">{v}</div><div className="hsl">{l}</div></div>
        ))}
      </div>
      {s.note&&<div className="card" style={{marginBottom:16,borderLeft:"3px solid var(--acc)"}}><div className="st" style={{marginBottom:4}}>NOTE</div><p style={{fontSize:14,color:"var(--dim)",fontStyle:"italic"}}>{s.note}</p></div>}
      <div className="st">ESERCIZI</div>
      {s.esercizi.map((ex,i)=>{
        const best=Math.max(...ex.serie.filter(sr=>sr.completata&&sr.kg).map(sr=>+sr.kg||0),0);
        return (
          <div key={i} className="card" style={{marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div className="exn">{ex.nome}</div>
              {best>0&&<div className="tag tag-a">max {best}kg</div>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr",gap:4,fontSize:10,color:"var(--dim)",fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",marginBottom:6}}>
              <div>#</div><div>KG</div><div>REPS</div><div>STATO</div>
            </div>
            {ex.serie.map((sr,j)=>(
              <div key={j} style={{display:"grid",gridTemplateColumns:"28px 1fr 1fr 1fr",gap:4,padding:"6px 0",borderTop:"1px solid var(--bdr)",alignItems:"center"}}>
                <div style={{fontFamily:"'Bebas Neue',cursive",fontSize:20,color:sr.completata?"var(--acc)":"var(--mut)"}}>{j+1}</div>
                <div style={{fontWeight:700,fontSize:15}}>{sr.kg||"—"}</div>
                <div style={{fontWeight:700,fontSize:15}}>{sr.reps||"—"}</div>
                <div style={{fontSize:11,color:sr.completata?"var(--ok)":"var(--mut)"}}>{sr.completata?"✓ OK":"—"}</div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
