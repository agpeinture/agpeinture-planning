import { useState, useEffect, useRef } from "react";

// ─── HELPERS ────────────────────────────────────────────────────────────────
const addDays   = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x; };
const getMonday = d => { const x=new Date(d); const day=x.getDay(); x.setDate(x.getDate()-day+(day===0?-6:1)); return x; };
const fmtDate   = d => d.toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
const fmtFull   = d => d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
const getWeekNum= d => {
  const x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));
  x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));
  const y=new Date(Date.UTC(x.getUTCFullYear(),0,1));
  return Math.ceil((((x-y)/86400000)+1)/7);
};
const DAYS   = ['Lun','Mar','Mer','Jeu','Ven','Sam'];
const COLORS = ["#0096C7","#2D6A4F","#E76F51","#7B2D8B","#C1121F","#F4A261","#457B9D","#6D6875","#588157"];
const CATS   = {
  client:   { label:"RDV Client",   color:"#0096C7", bg:"#E0F4FB" },
  livraison:{ label:"Livraison",    color:"#2D6A4F", bg:"#E0F2E9" },
  reunion:  { label:"Réunion",      color:"#7B2D8B", bg:"#F0E6F8" },
  perso:    { label:"Personnel",    color:"#E76F51", bg:"#FDF0EB" },
};
const STATUS = {
  en_cours: { label:"En cours",   color:"#0096C7", bg:"#E0F4FB" },
  termine:  { label:"Terminé",    color:"#2D6A4F", bg:"#E0F2E9" },
  en_attente:{ label:"En attente",color:"#F4A261", bg:"#FEF5E7" },
};

// ─── INITIAL DATA ────────────────────────────────────────────────────────────
const INIT_WORKERS = [
  {id:1,name:"Marco",  initials:"MA",color:"#0096C7"},
  {id:2,name:"Pierre", initials:"PI",color:"#2D6A4F"},
  {id:3,name:"Karim",  initials:"KA",color:"#E76F51"},
  {id:4,name:"Remy",   initials:"RE",color:"#7B2D8B"},
  {id:5,name:"Dany",   initials:"DA",color:"#C1121F"},
  {id:6,name:"Mathey", initials:"MT",color:"#F4A261"},
  {id:7,name:"Nabil",  initials:"NA",color:"#457B9D"},
];
const INIT_CHANTIERS = [
  {id:1,name:"Architectonico",address:"Route de Pénesson 6, Aubonne",color:"#0096C7",status:"en_cours",notes:"Peinture intérieure salon + chambres. Couleur RAL 9010. Prévoir 3 couches."},
  {id:2,name:"Nyon 1345",     address:"Nyon",                        color:"#2D6A4F",status:"en_cours",notes:"Façade extérieure. Échafaudage posé. Vérifier joints fenêtres avant application."},
  {id:3,name:"Greco-Claudio", address:"Route de Gland 5",            color:"#7B2D8B",status:"en_cours",notes:""},
  {id:4,name:"Karime",        address:"",                            color:"#E76F51",status:"en_attente",notes:"Devis accepté. Début prévu semaine prochaine."},
];
const INIT_ASSIGN = {
  "Lun-1":{w:[1,2],s:"07:30",e:"17:00"},"Lun-3":{w:[3,7],s:"08:00",e:"16:30"},
  "Mar-1":{w:[1,2],s:"07:30",e:"17:00"},"Mar-3":{w:[4,5],s:"08:00",e:"16:30"},"Mar-4":{w:[3],s:"09:00",e:"12:00"},
  "Mer-1":{w:[1,2],s:"07:30",e:"17:00"},"Mer-2":{w:[6],s:"07:30",e:"16:30"},"Mer-3":{w:[3],s:"08:00",e:"16:00"},
  "Jeu-1":{w:[6,7],s:"07:30",e:"17:00"},"Jeu-2":{w:[2],s:"07:30",e:"16:30"},"Jeu-3":{w:[1],s:"08:00",e:"16:00"},"Jeu-4":{w:[4,5],s:"09:00",e:"17:00"},
  "Ven-1":{w:[1,2],s:"07:30",e:"17:00"},"Ven-3":{w:[3,7],s:"08:00",e:"16:30"},
};
const INIT_EVENTS = [
  {id:1,title:"RDV Client Pam",    date:"2026-05-05",s:"12:00",e:"13:30",cat:"client",  notes:"Repas — discussion devis nouvelle villa"},
  {id:2,title:"Livraison peinture",date:"2026-05-06",s:"07:00",e:"08:00",cat:"livraison",notes:"Route de Gland — vérifier quantités"},
  {id:3,title:"Ostéopathe",        date:"2026-05-06",s:"08:30",e:"09:30",cat:"perso",   notes:""},
  {id:4,title:"Remy Di Meglio",    date:"2026-05-07",s:"08:00",e:"12:00",cat:"client",  notes:"Visite chantier avenue de la gare"},
  {id:5,title:"Dany - bilan",      date:"2026-05-07",s:"08:30",e:"09:00",cat:"reunion", notes:"Point hebdo équipe"},
  {id:6,title:"Nabil - devis",     date:"2026-05-04",s:"10:30",e:"11:30",cat:"client",  notes:"Route d'Aubonne"},
];

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function App() {
  const [tab,        setTab]        = useState("planning");
  const [workers,    setWorkers]    = useState(INIT_WORKERS);
  const [chantiers,  setChantiers]  = useState(INIT_CHANTIERS);
  const [assign,     setAssign]     = useState(INIT_ASSIGN);
  const [events,     setEvents]     = useState(INIT_EVENTS);
  const [weekOff,    setWeekOff]    = useState(0);
  const [activeCell, setActiveCell] = useState(null);
  const [modal,      setModal]      = useState(null);
  const [evModal,    setEvModal]    = useState(null); // null | 'new' | event obj
  const [newName,    setNewName]    = useState("");
  const [newAddr,    setNewAddr]    = useState("");
  const [evForm,     setEvForm]     = useState({title:"",date:"",s:"",e:"",cat:"client",notes:""});
  const [notesOpen,  setNotesOpen]  = useState(null); // chantier id
  const popupRef = useRef(null);

  const today   = new Date();
  const monday  = getMonday(new Date(today));
  monday.setDate(monday.getDate() + weekOff*7);
  const dates   = DAYS.map((_,i)=>addDays(monday,i));
  const weekNum = getWeekNum(monday);

  const K      = (day,cid)=>`${day}-${cid}`;
  const cell   = (day,cid)=>assign[K(day,cid)]||{w:[],s:"07:30",e:"17:00"};
  const asgnd  = (day,cid)=>cell(day,cid).w.map(id=>workers.find(w=>w.id===id)).filter(Boolean);
  const updCell= (day,cid,p)=>setAssign(prev=>({...prev,[K(day,cid)]:{...cell(day,cid),...p}}));
  const togW   = (day,cid,wid)=>{const c=cell(day,cid);updCell(day,cid,{w:c.w.includes(wid)?c.w.filter(x=>x!==wid):[...c.w,wid]});};

  useEffect(()=>{
    if(!activeCell)return;
    const fn=e=>{if(popupRef.current&&!popupRef.current.contains(e.target))setActiveCell(null);};
    document.addEventListener("mousedown",fn);
    return()=>document.removeEventListener("mousedown",fn);
  },[activeCell]);

  const addWorker=()=>{
    if(!newName.trim())return;
    const initials=newName.trim().split(" ").map(s=>s[0]).join("").slice(0,2).toUpperCase();
    setWorkers([...workers,{id:Date.now(),name:newName.trim(),initials,color:COLORS[workers.length%COLORS.length]}]);
    setNewName("");setModal(null);
  };
  const addChantier=()=>{
    if(!newName.trim())return;
    setChantiers([...chantiers,{id:Date.now(),name:newName.trim(),address:newAddr.trim(),color:COLORS[(chantiers.length+4)%COLORS.length],status:"en_attente",notes:""}]);
    setNewName("");setNewAddr("");setModal(null);
  };
  const updChantier=(id,patch)=>setChantiers(prev=>prev.map(c=>c.id===id?{...c,...patch}:c));

  const workerSched=wid=>{
    const res={};
    DAYS.forEach(day=>chantiers.forEach(ch=>{const c=cell(day,ch.id);if(c.w.includes(wid)){if(!res[day])res[day]=[];res[day].push({ch,s:c.s,e:c.e});}}));
    return res;
  };

  const weekEvents=dates.map(d=>{
    const ds=d.toISOString().slice(0,10);
    return events.filter(ev=>ev.date===ds).sort((a,b)=>a.s.localeCompare(b.s));
  });

  const saveEvent=()=>{
    if(!evForm.title.trim()||!evForm.date)return;
    if(evModal==="new"){ setEvents([...events,{...evForm,id:Date.now()}]); }
    else { setEvents(events.map(ev=>ev.id===evModal.id?{...evModal,...evForm}:ev)); }
    setEvModal(null);
  };
  const delEvent=id=>setEvents(events.filter(ev=>ev.id!==id));

  const openNewEv=(date="")=>{
    setEvForm({title:"",date,s:"08:00",e:"09:00",cat:"client",notes:""});
    setEvModal("new");
  };

  // ─ THEME ─
  const BRAND="#0096C7"; const DARK="#023E58"; const NAV="#012A3D";

  // ─── TAB BUTTON ─────────────────────────────────────────────────────────
  const TabBtn=({id,icon,label})=>(
    <button onClick={()=>setTab(id)}
      style={{display:"flex",alignItems:"center",gap:8,padding:"14px 24px",background:"transparent",border:"none",borderBottom:tab===id?`3px solid ${BRAND}`:"3px solid transparent",color:tab===id?"white":"#6B8FA0",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Montserrat',sans-serif",transition:"all 0.15s",whiteSpace:"nowrap"}}>
      <span style={{fontSize:16}}>{icon}</span>{label}
    </button>
  );

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Inter:wght@400;500;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        textarea{font-family:'Inter',sans-serif;resize:vertical}
        input,select{font-family:'Inter',sans-serif}
        @media print{.noprint{display:none!important}body{background:white}}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#f1f1f1}
        ::-webkit-scrollbar-thumb{background:#0096C755;border-radius:3px}
      `}</style>

      <div style={{fontFamily:"'Inter',sans-serif",background:"#EEF6FB",minHeight:"100vh"}}>

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <div style={{background:DARK}}>
          <div style={{padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:62}}>
            {/* Logo */}
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMgAAAB3CAYAAABGxA8+AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyhpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuNi1jMDY3IDc5LjE1Nzc0NywgMjAxNS8wMy8zMC0yMzo0MDo0MiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTUgKE1hY2ludG9zaCkiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6QTM3Q0ExNzNEQTdEMTFFNkFGMkY4MUFBODVGN0ExMDYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6QTM3Q0ExNzREQTdEMTFFNkFGMkY4MUFBODVGN0ExMDYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBMzdDQTE3MURBN0QxMUU2QUYyRjgxQUE4NUY3QTEwNiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBMzdDQTE3MkRBN0QxMUU2QUYyRjgxQUE4NUY3QTEwNiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pk1rIMQAAF8USURBVHja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" alt="AG Peinture"
                style={{height:48,objectFit:"contain"}} />
              <div style={{width:1,height:36,background:BRAND+"44"}}/>
              <div>
                <div style={{fontFamily:"'Montserrat',sans-serif",color:"white",fontWeight:800,fontSize:14,letterSpacing:1,textTransform:"uppercase"}}>Tableau de bord</div>
                <div style={{color:BRAND,fontSize:10,letterSpacing:2,fontWeight:600,textTransform:"uppercase"}}>Gestion d'équipe & agenda</div>
              </div>
            </div>
            {/* Header actions */}
            <div style={{display:"flex",gap:8,alignItems:"center"}} className="noprint">
              <button onClick={()=>window.print()}
                style={{background:NAV,color:BRAND,border:`1px solid ${BRAND}`,borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                🖨 Imprimer
              </button>
              {tab==="planning"&&<>
                <button onClick={()=>{setNewName("");setModal("worker");}}
                  style={{background:BRAND,color:"white",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'Montserrat',sans-serif"}}>
                  + Ouvrier
                </button>
                <button onClick={()=>{setNewName("");setNewAddr("");setModal("chantier");}}
                  style={{background:NAV,color:"white",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                  + Chantier
                </button>
              </>}
              {tab==="agenda"&&
                <button onClick={()=>openNewEv()}
                  style={{background:BRAND,color:"white",border:"none",borderRadius:8,padding:"8px 14px",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'Montserrat',sans-serif"}}>
                  + RDV / Événement
                </button>
              }
            </div>
          </div>
          {/* Tabs */}
          <div style={{display:"flex",paddingLeft:20,borderTop:`1px solid ${BRAND}22`}}>
            <TabBtn id="planning" icon="🏗️" label="Planning Équipe"/>
            <TabBtn id="agenda"   icon="📅" label="Agenda Personnel"/>
            <TabBtn id="chantiers"icon="🏠" label="Chantiers & Notes"/>
          </div>
        </div>

        {/* ══ WEEK NAV (planning + agenda) ════════════════════════════════ */}
        {(tab==="planning"||tab==="agenda")&&(
          <div style={{background:NAV,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:`3px solid ${BRAND}`}} className="noprint">
            <button onClick={()=>setWeekOff(w=>w-1)}
              style={{background:"transparent",border:`1px solid ${BRAND}`,color:BRAND,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>
              ← Semaine préc.
            </button>
            <div style={{textAlign:"center"}}>
              <div style={{fontFamily:"'Montserrat',sans-serif",color:"white",fontWeight:800,fontSize:13}}>
                Semaine {weekNum} — {dates[0].toLocaleDateString('fr-FR',{day:'numeric',month:'long'})} au {dates[5].toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}
              </div>
              {weekOff!==0&&<button onClick={()=>setWeekOff(0)} style={{background:"transparent",border:"none",color:BRAND,cursor:"pointer",fontSize:11,textDecoration:"underline",marginTop:2}}>↩ Cette semaine</button>}
            </div>
            <button onClick={()=>setWeekOff(w=>w+1)}
              style={{background:"transparent",border:`1px solid ${BRAND}`,color:BRAND,borderRadius:8,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>
              Semaine suiv. →
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB : PLANNING
        ══════════════════════════════════════════════════════════════════ */}
        {tab==="planning"&&(
          <div style={{padding:20}}>
            {/* Worker chips */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {workers.map(w=>{
                const days=Object.keys(workerSched(w.id)).length;
                return(
                  <div key={w.id} style={{display:"flex",alignItems:"center",gap:7,background:"white",borderRadius:20,padding:"5px 12px 5px 5px",border:`1px solid ${w.color}40`,boxShadow:"0 1px 4px rgba(0,60,90,0.08)"}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:w.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:800,color:"white"}}>{w.initials}</div>
                    <span style={{fontSize:12,fontWeight:600,color:"#333"}}>{w.name}</span>
                    <span style={{fontSize:10,fontWeight:700,color:BRAND}}>{days}j</span>
                  </div>
                );
              })}
            </div>

            {/* Grid */}
            <div style={{background:"white",borderRadius:14,overflow:"visible",boxShadow:"0 4px 28px rgba(0,60,90,0.12)"}}>
              {/* Header row */}
              <div style={{display:"grid",gridTemplateColumns:"200px repeat(6,1fr)",borderBottom:`2px solid ${BRAND}`}}>
                <div style={{padding:"14px 16px",background:DARK,borderRadius:"14px 0 0 0",display:"flex",alignItems:"center"}}>
                  <span style={{fontFamily:"'Montserrat',sans-serif",color:BRAND,fontSize:10,letterSpacing:2,textTransform:"uppercase",fontWeight:800}}>Chantier</span>
                </div>
                {DAYS.map((day,i)=>(
                  <div key={day} style={{padding:"12px 8px",textAlign:"center",background:DARK,borderLeft:"1px solid #034A68",borderRadius:i===5?"0 14px 0 0":0}}>
                    <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:800,fontSize:13,color:i===5?"#F4A261":"white"}}>{day}</div>
                    <div style={{fontSize:11,color:BRAND,marginTop:2}}>{fmtDate(dates[i])}</div>
                  </div>
                ))}
              </div>

              {/* Chantier rows */}
              {chantiers.map((ch,ci)=>(
                <div key={ch.id} style={{display:"grid",gridTemplateColumns:"200px repeat(6,1fr)",borderBottom:ci<chantiers.length-1?"1px solid #E4F2F8":"none"}}>
                  {/* Label */}
                  <div style={{padding:"10px 14px",borderRight:"2px solid #E4F2F8",display:"flex",gap:10,alignItems:"flex-start"}}>
                    <div style={{width:4,borderRadius:4,background:ch.color,alignSelf:"stretch",flexShrink:0}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:DARK}}>{ch.name}</div>
                      {ch.address&&<div style={{fontSize:10,color:"#888",marginTop:1}}>{ch.address}</div>}
                      <div style={{display:"flex",alignItems:"center",gap:6,marginTop:4}}>
                        <span style={{fontSize:9,fontWeight:700,color:STATUS[ch.status].color,background:STATUS[ch.status].bg,padding:"1px 7px",borderRadius:10}}>{STATUS[ch.status].label}</span>
                        <button onClick={()=>setNotesOpen(notesOpen===ch.id?null:ch.id)}
                          style={{background:"transparent",border:"none",cursor:"pointer",fontSize:10,color:ch.notes?"#0096C7":"#CCC",padding:0,fontWeight:600}}>
                          {ch.notes?"📝":"+note"}
                        </button>
                      </div>
                      {notesOpen===ch.id&&(
                        <textarea value={ch.notes} onChange={e=>updChantier(ch.id,{notes:e.target.value})}
                          placeholder="Notes sur ce chantier..."
                          style={{marginTop:6,width:"100%",minHeight:70,padding:"6px 8px",border:`1px solid ${BRAND}55`,borderRadius:7,fontSize:11,color:"#333",outline:"none",background:"#F6FBFF"}}/>
                      )}
                    </div>
                  </div>

                  {/* Day cells */}
                  {DAYS.map((day,di)=>{
                    const asgn=asgnd(day,ch.id);
                    const c=cell(day,ch.id);
                    const isAct=activeCell?.day===day&&activeCell?.cid===ch.id;
                    const isTod=dates[di].toDateString()===today.toDateString();
                    return(
                      <div key={day}
                        style={{borderLeft:"1px solid #E4F2F8",padding:"8px",position:"relative",minHeight:72,background:isAct?"#E5F5FF":isTod?"#F0FAFF":asgn.length>0?"#FAFCFE":"white",cursor:"pointer",transition:"background 0.12s"}}
                        onClick={()=>setActiveCell(isAct?null:{day,cid:ch.id})}>
                        {isTod&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:BRAND}}/>}
                        <div style={{display:"flex",flexWrap:"wrap",gap:3,paddingTop:isTod?3:0}}>
                          {asgn.map(w=>(
                            <div key={w.id} title={w.name}
                              style={{width:28,height:28,borderRadius:"50%",background:w.color,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:8,fontWeight:800,boxShadow:"0 1px 4px rgba(0,0,0,0.18)"}}>
                              {w.initials}
                            </div>
                          ))}
                          {asgn.length===0&&<div style={{width:28,height:28,borderRadius:"50%",border:"1.5px dashed #C8E6F0",display:"flex",alignItems:"center",justifyContent:"center",color:"#C8E6F0",fontSize:17}}>+</div>}
                        </div>
                        {asgn.length>0&&c.s&&<div style={{marginTop:3,fontSize:9,color:BRAND,fontWeight:700}}>{c.s}–{c.e}</div>}
                        {asgn.length>0&&<div style={{marginTop:1,fontSize:8,color:"#999"}}>{asgn.map(w=>w.name).join(", ")}</div>}

                        {/* POPUP */}
                        {isAct&&(
                          <div ref={popupRef} onClick={e=>e.stopPropagation()}
                            style={{position:"absolute",top:"calc(100% + 6px)",left:di>=4?"auto":"50%",right:di>=4?0:"auto",transform:di>=4?"none":"translateX(-50%)",background:"white",border:`1.5px solid ${BRAND}`,borderRadius:12,boxShadow:"0 16px 48px rgba(0,60,90,0.22)",zIndex:300,padding:14,minWidth:230}}>
                            <div style={{fontFamily:"'Montserrat',sans-serif",fontSize:11,fontWeight:800,color:DARK,letterSpacing:1,marginBottom:10,borderBottom:`1px solid ${BRAND}22`,paddingBottom:8}}>
                              {day} · {ch.name}
                            </div>
                            <div style={{display:"flex",gap:8,marginBottom:12}}>
                              {[["DÉBUT","s"],["FIN","e"]].map(([lbl,f])=>(
                                <div key={f} style={{flex:1}}>
                                  <div style={{fontSize:9,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:3}}>{lbl}</div>
                                  <input type="time" value={c[f]} onChange={ev=>updCell(day,ch.id,{[f]:ev.target.value})}
                                    style={{width:"100%",padding:"7px 8px",border:`1.5px solid ${BRAND}`,borderRadius:7,fontSize:13,color:DARK,fontWeight:600,outline:"none"}}/>
                                </div>
                              ))}
                            </div>
                            <div style={{fontSize:9,color:"#888",fontWeight:700,letterSpacing:1,marginBottom:6}}>OUVRIERS</div>
                            {workers.map(w=>{
                              const on=(c.w||[]).includes(w.id);
                              return(
                                <div key={w.id} onClick={()=>togW(day,ch.id,w.id)}
                                  style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:8,cursor:"pointer",background:on?`${w.color}15`:"transparent",marginBottom:2,border:on?`1.5px solid ${w.color}55`:"1.5px solid transparent",transition:"all 0.1s"}}>
                                  <div style={{width:26,height:26,borderRadius:"50%",background:w.color,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:9,fontWeight:800}}>{w.initials}</div>
                                  <span style={{fontSize:13,fontWeight:on?700:400,color:on?DARK:"#666",flex:1}}>{w.name}</span>
                                  {on&&<span style={{color:BRAND,fontSize:13,fontWeight:700}}>✓</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Chantier stats */}
            <div style={{marginTop:16,display:"flex",gap:10,flexWrap:"wrap"}}>
              {chantiers.map(ch=>{
                const wSet=new Set();DAYS.forEach(day=>cell(day,ch.id).w.forEach(id=>wSet.add(id)));
                const tot=DAYS.reduce((a,day)=>a+cell(day,ch.id).w.length,0);
                return(
                  <div key={ch.id} style={{background:"white",borderRadius:10,padding:"10px 14px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 1px 6px rgba(0,60,90,0.08)"}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:ch.color}}/>
                    <div>
                      <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:700,fontSize:12,color:DARK}}>{ch.name}</div>
                      <div style={{fontSize:10,color:"#888"}}>{wSet.size} ouvrier{wSet.size!==1?"s":""} · {tot} affectation{tot!==1?"s":""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB : AGENDA
        ══════════════════════════════════════════════════════════════════ */}
        {tab==="agenda"&&(
          <div style={{padding:20}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12}}>
              {DAYS.slice(0,6).map((day,di)=>{
                const date=dates[di];
                const isTod=date.toDateString()===today.toDateString();
                const evs=weekEvents[di];
                const ds=date.toISOString().slice(0,10);
                return(
                  <div key={day} style={{background:"white",borderRadius:12,overflow:"hidden",boxShadow:"0 2px 12px rgba(0,60,90,0.09)",minHeight:280}}>
                    {/* Day header */}
                    <div style={{padding:"12px 14px",background:isTod?BRAND:DARK,borderBottom:`2px solid ${isTod?BRAND+"88":BRAND+"33"}`}}>
                      <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:800,fontSize:14,color:"white"}}>{day}</div>
                      <div style={{fontSize:11,color:isTod?"rgba(255,255,255,0.85)":BRAND}}>{fmtDate(date)}</div>
                    </div>
                    {/* Events */}
                    <div style={{padding:8,minHeight:200}}>
                      {evs.map(ev=>{
                        const cat=CATS[ev.cat]||CATS.client;
                        return(
                          <div key={ev.id} onClick={()=>{setEvForm({...ev});setEvModal(ev);}}
                            style={{background:cat.bg,borderLeft:`3px solid ${cat.color}`,borderRadius:7,padding:"7px 10px",marginBottom:6,cursor:"pointer",transition:"opacity 0.1s"}}
                            onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
                            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                            <div style={{fontSize:11,fontWeight:700,color:cat.color,marginBottom:1}}>{ev.title}</div>
                            <div style={{fontSize:10,color:"#888"}}>{ev.s} – {ev.e}</div>
                            {ev.notes&&<div style={{fontSize:9,color:"#999",marginTop:3,lineHeight:1.4}}>{ev.notes}</div>}
                          </div>
                        );
                      })}
                      {/* Add button */}
                      <button onClick={()=>openNewEv(ds)}
                        style={{width:"100%",padding:"7px",background:"transparent",border:"1.5px dashed #C8E6F0",borderRadius:8,cursor:"pointer",color:"#C8E6F0",fontSize:18,marginTop:4,transition:"all 0.1s"}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=BRAND;e.currentTarget.style.color=BRAND;}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="#C8E6F0";e.currentTarget.style.color="#C8E6F0";}}>
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{marginTop:16,display:"flex",gap:10,flexWrap:"wrap"}}>
              {Object.entries(CATS).map(([k,c])=>(
                <div key={k} style={{display:"flex",alignItems:"center",gap:7,background:"white",borderRadius:8,padding:"6px 12px",boxShadow:"0 1px 4px rgba(0,60,90,0.07)"}}>
                  <div style={{width:10,height:10,borderRadius:2,background:c.color}}/>
                  <span style={{fontSize:11,fontWeight:600,color:"#555"}}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB : CHANTIERS
        ══════════════════════════════════════════════════════════════════ */}
        {tab==="chantiers"&&(
          <div style={{padding:20}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(340px,1fr))",gap:16}}>
              {chantiers.map(ch=>(
                <div key={ch.id} style={{background:"white",borderRadius:14,overflow:"hidden",boxShadow:"0 2px 14px rgba(0,60,90,0.1)"}}>
                  <div style={{background:`linear-gradient(135deg,${ch.color},${ch.color}AA)`,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:800,fontSize:17,color:"white"}}>{ch.name}</div>
                      {ch.address&&<div style={{fontSize:11,color:"rgba(255,255,255,0.8)",marginTop:3}}>📍 {ch.address}</div>}
                    </div>
                    <select value={ch.status} onChange={e=>updChantier(ch.id,{status:e.target.value})}
                      style={{background:"rgba(255,255,255,0.2)",color:"white",border:"1.5px solid rgba(255,255,255,0.5)",borderRadius:8,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",outline:"none"}}>
                      {Object.entries(STATUS).map(([k,v])=><option key={k} value={k} style={{color:"#333",background:"white"}}>{v.label}</option>)}
                    </select>
                  </div>
                  <div style={{padding:"16px 20px"}}>
                    {/* Stats */}
                    <div style={{display:"flex",gap:12,marginBottom:14}}>
                      {DAYS.map(day=>{
                        const a=asgnd(day,ch.id);
                        return a.length>0?(
                          <div key={day} style={{textAlign:"center"}}>
                            <div style={{fontSize:9,fontWeight:700,color:"#AAA",marginBottom:4}}>{day}</div>
                            <div style={{display:"flex",gap:2,justifyContent:"center"}}>
                              {a.map(w=><div key={w.id} style={{width:18,height:18,borderRadius:"50%",background:w.color}} title={w.name}/>)}
                            </div>
                          </div>
                        ):null;
                      })}
                    </div>
                    {/* Notes */}
                    <div style={{fontSize:10,fontWeight:700,color:"#AAA",letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Notes</div>
                    <textarea value={ch.notes} onChange={e=>updChantier(ch.id,{notes:e.target.value})}
                      placeholder="Ajouter des notes sur ce chantier (matériaux, couleurs, instructions...)"
                      style={{width:"100%",minHeight:90,padding:"10px 12px",border:"1.5px solid #E4F2F8",borderRadius:10,fontSize:12,color:"#333",outline:"none",background:"#FAFCFE",lineHeight:1.6}}/>
                  </div>
                </div>
              ))}
              {/* Add chantier card */}
              <button onClick={()=>{setNewName("");setNewAddr("");setModal("chantier");}}
                style={{background:"white",borderRadius:14,border:"2px dashed #C8E6F0",minHeight:180,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",color:"#AAA",boxShadow:"none",fontFamily:"'Inter',sans-serif",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=BRAND;e.currentTarget.style.color=BRAND;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#C8E6F0";e.currentTarget.style.color="#AAA";}}>
                <span style={{fontSize:28}}>+</span>
                <span style={{fontSize:13,fontWeight:600}}>Ajouter un chantier</span>
              </button>
            </div>
          </div>
        )}

        {/* ══ MODAL : Worker / Chantier ════════════════════════════════════ */}
        {modal&&(
          <div style={{position:"fixed",inset:0,background:"rgba(2,20,35,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500}}
            onClick={()=>setModal(null)}>
            <div style={{background:"white",borderRadius:16,padding:28,minWidth:360,boxShadow:"0 24px 60px rgba(0,0,0,0.3)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                <div style={{width:5,height:28,borderRadius:3,background:BRAND}}/>
                <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:800,fontSize:18,color:DARK}}>
                  {modal==="worker"?"Ajouter un ouvrier":"Ajouter un chantier"}
                </div>
              </div>
              <input value={newName} onChange={e=>setNewName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&(modal==="worker"?addWorker():addChantier())}
                placeholder={modal==="worker"?"Prénom":"Nom du chantier"} autoFocus
                style={{width:"100%",padding:"12px 14px",border:`1.5px solid #CDE8F5`,borderRadius:10,fontSize:14,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
              {modal==="chantier"&&(
                <input value={newAddr} onChange={e=>setNewAddr(e.target.value)}
                  placeholder="Adresse (optionnel)"
                  style={{width:"100%",padding:"12px 14px",border:`1.5px solid #CDE8F5`,borderRadius:10,fontSize:14,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
              )}
              <div style={{display:"flex",gap:10,marginTop:8}}>
                <button onClick={()=>setModal(null)} style={{flex:1,padding:"12px",border:"1.5px solid #E5E5E5",borderRadius:10,cursor:"pointer",background:"white",fontSize:13,fontWeight:600,color:"#666"}}>Annuler</button>
                <button onClick={modal==="worker"?addWorker:addChantier}
                  style={{flex:1,padding:"12px",background:BRAND,color:"white",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Montserrat',sans-serif"}}>Ajouter</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MODAL : Event (Agenda) ════════════════════════════════════════ */}
        {evModal!==null&&(
          <div style={{position:"fixed",inset:0,background:"rgba(2,20,35,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500}}
            onClick={()=>setEvModal(null)}>
            <div style={{background:"white",borderRadius:16,padding:28,minWidth:380,boxShadow:"0 24px 60px rgba(0,0,0,0.3)"}} onClick={e=>e.stopPropagation()}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:5,height:28,borderRadius:3,background:CATS[evForm.cat]?.color||BRAND}}/>
                  <div style={{fontFamily:"'Montserrat',sans-serif",fontWeight:800,fontSize:18,color:DARK}}>
                    {evModal==="new"?"Nouvel événement":"Modifier l'événement"}
                  </div>
                </div>
                {evModal!=="new"&&(
                  <button onClick={()=>{delEvent(evModal.id);setEvModal(null);}}
                    style={{background:"#FEE2E2",color:"#C1121F",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:11,fontWeight:700}}>
                    🗑 Supprimer
                  </button>
                )}
              </div>
              {/* Category */}
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                {Object.entries(CATS).map(([k,c])=>(
                  <button key={k} onClick={()=>setEvForm({...evForm,cat:k})}
                    style={{padding:"5px 12px",borderRadius:20,border:`1.5px solid ${evForm.cat===k?c.color:"#E5E5E5"}`,background:evForm.cat===k?c.bg:"white",color:evForm.cat===k?c.color:"#888",fontSize:11,fontWeight:700,cursor:"pointer"}}>
                    {c.label}
                  </button>
                ))}
              </div>
              <input value={evForm.title} onChange={e=>setEvForm({...evForm,title:e.target.value})}
                placeholder="Titre de l'événement" autoFocus
                style={{width:"100%",padding:"11px 14px",border:"1.5px solid #CDE8F5",borderRadius:10,fontSize:14,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
              <input type="date" value={evForm.date} onChange={e=>setEvForm({...evForm,date:e.target.value})}
                style={{width:"100%",padding:"11px 14px",border:"1.5px solid #CDE8F5",borderRadius:10,fontSize:14,marginBottom:10,boxSizing:"border-box",outline:"none"}}/>
              <div style={{display:"flex",gap:10,marginBottom:10}}>
                {[["Début","s"],["Fin","e"]].map(([lbl,f])=>(
                  <div key={f} style={{flex:1}}>
                    <div style={{fontSize:10,color:"#888",fontWeight:700,marginBottom:4}}>{lbl}</div>
                    <input type="time" value={evForm[f]} onChange={e=>setEvForm({...evForm,[f]:e.target.value})}
                      style={{width:"100%",padding:"10px 12px",border:"1.5px solid #CDE8F5",borderRadius:10,fontSize:14,outline:"none"}}/>
                  </div>
                ))}
              </div>
              <textarea value={evForm.notes} onChange={e=>setEvForm({...evForm,notes:e.target.value})}
                placeholder="Notes (optionnel)"
                style={{width:"100%",padding:"11px 14px",border:"1.5px solid #CDE8F5",borderRadius:10,fontSize:13,marginBottom:14,boxSizing:"border-box",outline:"none",minHeight:70}}/>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setEvModal(null)} style={{flex:1,padding:"12px",border:"1.5px solid #E5E5E5",borderRadius:10,cursor:"pointer",background:"white",fontSize:13,fontWeight:600,color:"#666"}}>Annuler</button>
                <button onClick={saveEvent}
                  style={{flex:1,padding:"12px",background:CATS[evForm.cat]?.color||BRAND,color:"white",border:"none",borderRadius:10,cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Montserrat',sans-serif"}}>
                  {evModal==="new"?"Ajouter":"Enregistrer"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
