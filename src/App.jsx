import { useState, useMemo, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";

/* ── STORAGE ────────────────────────────────────────────────── */
function load(key, fb) { try { const v=localStorage.getItem(key); return v?JSON.parse(v):fb; } catch { return fb; } }
function save(key, val) { try { localStorage.setItem(key,JSON.stringify(val)); } catch {} }

/* ── DESIGN ─────────────────────────────────────────────────── */
const P = {
  bg:"#f5f3ff", card:"#fff", border:"#ede9fe", text:"#1e1b4b", muted:"#9ca3af", soft:"#f9f7ff",
  income:"#059669", incomeBg:"#ecfdf5", expense:"#dc2626", expenseBg:"#fef2f2",
  savings:"#7c3aed", savingsBg:"#f5f3ff", invest:"#0891b2", investBg:"#ecfeff",
  debt:"#ea580c", debtBg:"#fff7ed", shadow:"0 2px 16px rgba(124,58,237,0.07)",
};
const iStyle = { width:"100%",padding:"11px 14px",border:`1.5px solid ${P.border}`,borderRadius:12,fontSize:14,outline:"none",background:P.soft,boxSizing:"border-box",fontFamily:"inherit",color:P.text };

/* ── GBP FORMAT ─────────────────────────────────────────────── */
const fmt  = n => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",maximumFractionDigits:0}).format(n);
const fmtd = n => new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP",minimumFractionDigits:2}).format(n);

/* ── SEED DATA ──────────────────────────────────────────────── */
const seedTx = [
  {id:1,type:"income", category:"Salary",       amount:4200,date:"2026-03-01",note:"Monthly salary"},
  {id:2,type:"expense",category:"Housing",      amount:1100,date:"2026-03-02",note:"Rent"},
  {id:3,type:"expense",category:"Food",         amount:280, date:"2026-03-05",note:"Groceries"},
  {id:4,type:"expense",category:"Transport",    amount:95,  date:"2026-03-07",note:"Monthly pass"},
  {id:5,type:"income", category:"Freelance",    amount:650, date:"2026-03-10",note:"Design project"},
  {id:6,type:"expense",category:"Entertainment",amount:75,  date:"2026-03-12",note:"Cinema & dining"},
  {id:7,type:"expense",category:"Utilities",    amount:120, date:"2026-03-15",note:"Electric & internet"},
  {id:8,type:"expense",category:"Shopping",     amount:190, date:"2026-03-18",note:"Clothing"},
];
const seedDebts = [
  {id:1,type:"Credit Card",  name:"Barclaycard",      originalBalance:3800,balance:3800,rate:22.9,minPay:95, color:"#dc2626",paidOff:false,payments:[]},
  {id:2,type:"Personal Loan",name:"Lloyds Personal",  originalBalance:9500,balance:9500,rate:14.5,minPay:220,color:"#ea580c",paidOff:false,payments:[]},
  {id:3,type:"Car Loan",     name:"Toyota Finance",   originalBalance:14200,balance:14200,rate:7.9,minPay:320,color:"#d97706",paidOff:false,payments:[]},
];
const seedSavings = [
  {id:1,name:"Emergency Fund",target:8000, current:5000,color:"#7c3aed"},
  {id:2,name:"Holiday",       target:2500, current:1100,color:"#f59e0b"},
  {id:3,name:"New Laptop",    target:1500, current:700, color:"#059669"},
];
const seedInvestments = [
  {id:1,name:"S&P 500 ETF",ticker:"VUSA",amount:6500,gain:12.4,color:"#7c3aed"},
  {id:2,name:"Tech Fund",   ticker:"EQQQ",amount:2800,gain:-2.1,color:"#db2777"},
  {id:3,name:"Bonds",       ticker:"VGOV",amount:1800,gain:3.8, color:"#0891b2"},
];
const seedBudgets = [
  {id:1,category:"Housing",      limit:1200,color:"#dc2626"},
  {id:2,category:"Food",         limit:320, color:"#f97316"},
  {id:3,category:"Transport",    limit:150, color:"#eab308"},
  {id:4,category:"Entertainment",limit:120, color:"#8b5cf6"},
  {id:5,category:"Shopping",     limit:250, color:"#0891b2"},
  {id:6,category:"Utilities",    limit:160, color:"#059669"},
];

const DEF_EXP = ["Housing","Food","Transport","Health","Entertainment","Shopping","Utilities","Loan","Slice Pay","HDFC","Other"];
const DEF_INC = ["Salary","Freelance","Business","Rental","Other"];
const MONTHS  = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PIES    = ["#a78bfa","#f9a8d4","#6ee7b7","#93c5fd","#fcd34d","#fb923c","#c4b5fd","#34d399"];

function getCatEmoji(c){const m={Housing:"🏠",Food:"🍔",Transport:"🚗",Health:"💊",Entertainment:"🎬",Shopping:"🛍",Utilities:"⚡",Loan:"🏦","Slice Pay":"💳",HDFC:"🏦",Salary:"💼",Freelance:"💻",Business:"📊",Rental:"🏘",Other:"📌"};return m[c]||"📌";}

/* ── AVALANCHE ──────────────────────────────────────────────── */
function calcAvalanche(debts, extra) {
  const active = debts.filter(d=>!d.paidOff && d.balance>0);
  if (!active.length) return [];
  let bals = active.map(d=>({...d,remaining:d.balance}));
  const sorted = [...bals].sort((a,b)=>b.rate-a.rate);
  const schedule=[]; let month=0;
  while (bals.some(d=>d.remaining>0) && month<360) {
    month++; let ex=extra; const entry={month,debts:{}};
    for (const d of bals) {
      if (d.remaining<=0) continue;
      const interest=+(d.remaining*d.rate/100/12).toFixed(2);
      const pay=Math.min(d.minPay,d.remaining+interest);
      d.remaining=Math.max(0,d.remaining+interest-pay);
      entry.debts[d.id]={paid:pay,remaining:d.remaining,interest};
    }
    for (const d of sorted) {
      if (ex<=0) break;
      const live=bals.find(b=>b.id===d.id);
      if (!live||live.remaining<=0) continue;
      const payment=Math.min(ex,live.remaining);
      live.remaining=Math.max(0,live.remaining-payment);
      entry.debts[d.id].paid+=payment; ex-=payment;
    }
    schedule.push({...entry,snapshot:bals.map(b=>({id:b.id,remaining:b.remaining}))});
    if (bals.every(d=>d.remaining<=0)) break;
  }
  return schedule;
}

/* ── UI ATOMS ───────────────────────────────────────────────── */
function Modal({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(30,27,75,0.25)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)"}}>
      <div style={{background:P.card,borderRadius:"24px 24px 0 0",padding:"8px 24px 32px",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -12px 48px rgba(124,58,237,0.15)"}}>
        <div style={{width:36,height:4,background:P.border,borderRadius:99,margin:"12px auto 20px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <span style={{fontSize:17,fontWeight:700,color:P.text}}>{title}</span>
          <button onClick={onClose} style={{background:P.soft,border:"none",width:32,height:32,borderRadius:99,cursor:"pointer",fontSize:15,color:P.muted}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({label,children}){return(<div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:P.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.6px"}}>{label}</div>{children}</div>);}
function Pill({color,bg,children}){return<span style={{fontSize:9,fontWeight:700,color,background:bg,padding:"3px 9px",borderRadius:99,textTransform:"uppercase",letterSpacing:"0.5px"}}>{children}</span>;}
function ProgressBar({pct,color,h=7}){return(<div style={{height:h,background:P.border,borderRadius:99,overflow:"hidden"}}><div style={{width:`${Math.min(100,pct)}%`,height:"100%",background:color,borderRadius:99,transition:"width .6s cubic-bezier(.4,0,.2,1)"}}/></div>);}
function Card({children,style={}}){return<div style={{background:P.card,borderRadius:20,padding:18,boxShadow:P.shadow,...style}}>{children}</div>;}
function KpiCard({label,value,color,bg,sub}){return(<div style={{background:bg||P.card,borderRadius:20,padding:"16px 18px",boxShadow:P.shadow}}><div style={{fontSize:11,color:P.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6}}>{label}</div><div style={{fontSize:22,fontWeight:800,color,letterSpacing:"-0.5px",fontFamily:"'DM Mono',monospace"}}>{value}</div>{sub&&<div style={{fontSize:11,color:P.muted,marginTop:3}}>{sub}</div>}</div>);}

/* ── SWIPE ROW ──────────────────────────────────────────────── */
function SwipeRow({tx,onDelete,onEdit}){
  const [off,setOff]=useState(0); const startX=useRef(null);
  const col=tx.type==="income"?P.income:P.expense;
  const bg=tx.type==="income"?P.incomeBg:P.expenseBg;
  return(
    <div style={{position:"relative",borderRadius:16,overflow:"hidden",marginBottom:8}}>
      <div style={{position:"absolute",inset:0,background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:16,borderRadius:16}}>
        <button onClick={onDelete} style={{background:"#dc2626",border:"none",color:"#fff",borderRadius:10,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Delete</button>
      </div>
      <div
        onTouchStart={e=>{startX.current=e.touches[0].clientX;}}
        onTouchMove={e=>{if(startX.current===null)return;const dx=e.touches[0].clientX-startX.current;if(dx<0)setOff(Math.max(dx,-80));}}
        onTouchEnd={()=>{setOff(off<-40?-80:0);startX.current=null;}}
        style={{transform:`translateX(${off}px)`,transition:startX.current?undefined:"transform .25s ease",background:P.card,borderRadius:16,padding:"13px 14px",display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:P.shadow}}
      >
        <div style={{display:"flex",alignItems:"center",gap:11,flex:1,minWidth:0}}>
          <div style={{width:38,height:38,background:bg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:16}}>{tx.type==="income"?"💰":getCatEmoji(tx.category)}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:13,fontWeight:600,color:P.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{tx.note||tx.category}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2}}>
              <Pill color={col} bg={bg}>{tx.category}</Pill>
              <span style={{fontSize:10,color:P.muted}}>{tx.date}</span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <span style={{fontSize:14,fontWeight:800,fontFamily:"'DM Mono',monospace",color:col}}>{tx.type==="income"?"+":"-"}{fmt(tx.amount)}</span>
          <button onClick={()=>onEdit(tx)} style={{background:P.soft,border:"none",width:28,height:28,borderRadius:8,cursor:"pointer",fontSize:13}}>✏️</button>
        </div>
      </div>
    </div>
  );
}

/* ── NAV ────────────────────────────────────────────────────── */
const NAV=[
  {id:"overview",    emoji:"🏠",label:"Home"},
  {id:"transactions",emoji:"↕️", label:"Txns"},
  {id:"budgets",     emoji:"📊",label:"Budget"},
  {id:"savings",     emoji:"🎯",label:"Savings"},
  {id:"investments", emoji:"📈",label:"Invest"},
  {id:"debt",        emoji:"🔥",label:"Debt"},
];

/* ══════════════════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [tab,setTab]             = useState("overview");
  const [txs,setTxs]             = useState(()=>load("fn_txs",seedTx));
  const [debts,setDebts]         = useState(()=>load("fn_debts",seedDebts));
  const [savings,setSavings]     = useState(()=>load("fn_savings",seedSavings));
  const [extra,setExtra]         = useState(()=>load("fn_extra",300));
  const [expCats,setExpCats]     = useState(()=>load("fn_expc",[]));
  const [incCats,setIncCats]     = useState(()=>load("fn_incc",[]));
  const [search,setSearch]       = useState("");
  const [txFilter,setTxFilter]   = useState("all");
  const [showReset,setShowReset] = useState(false);

  // modals
  const [showAddTx,setShowAddTx]       = useState(false);
  const [editTxData,setEditTxData]     = useState(null);
  const [showAddDebt,setShowAddDebt]   = useState(false);
  const [editDebtData,setEditDebtData] = useState(null);
  const [showPayDebt,setShowPayDebt]   = useState(null); // debt object
  const [showDebtHist,setShowDebtHist] = useState(null); // debt object
  const [showAddSav,setShowAddSav]     = useState(false);
  const [showNewCat,setShowNewCat]     = useState(false);

  const blankTx  = {type:"expense",category:"Food",amount:"",date:new Date().toISOString().split("T")[0],note:""};
  const blankDebt= {type:"Credit Card",name:"",originalBalance:"",balance:"",rate:"",minPay:"",color:"#dc2626",paidOff:false,payments:[]};
  const [nTx,setNTx]   = useState(blankTx);
  const [nDebt,setNDebt]= useState(blankDebt);
  const [nSav,setNSav] = useState({name:"",target:"",current:"",color:"#7c3aed"});
  const [newCatName,setNewCatName]=useState(""); const [newCatType,setNewCatType]=useState("expense");
  const [payAmt,setPayAmt]=useState("");

  // autosave
  useEffect(()=>save("fn_txs",txs),[txs]);
  useEffect(()=>save("fn_debts",debts),[debts]);
  useEffect(()=>save("fn_savings",savings),[savings]);
  useEffect(()=>save("fn_extra",extra),[extra]);
  useEffect(()=>save("fn_expc",expCats),[expCats]);
  useEffect(()=>save("fn_incc",incCats),[incCats]);

  // derived
  const totalIncome   = useMemo(()=>txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),[txs]);
  const totalExpenses = useMemo(()=>txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0),[txs]);
  const balance       = totalIncome - totalExpenses;
  const activeDebts   = debts.filter(d=>!d.paidOff);
  const totalDebt     = activeDebts.reduce((s,d)=>s+d.balance,0);
  const totalInvested = seedInvestments.reduce((s,i)=>s+i.amount,0);

  const schedule   = useMemo(()=>calcAvalanche(activeDebts,extra),[debts,extra]);
  const debtFreeMo = schedule.length;

  const expByCat = useMemo(()=>{
    const map={};
    txs.filter(t=>t.type==="expense").forEach(t=>{map[t.category]=(map[t.category]||0)+t.amount;});
    return Object.entries(map).map(([name,value])=>({name,value}));
  },[txs]);

  const monthlyData = useMemo(()=>{
    const map={};
    txs.forEach(t=>{const m=new Date(t.date).getMonth();if(!map[m])map[m]={month:MONTHS[m],income:0,expenses:0};t.type==="income"?(map[m].income+=t.amount):(map[m].expenses+=t.amount);});
    return Object.values(map);
  },[txs]);

  const filteredTxs = useMemo(()=>
    txs.filter(t=>txFilter==="all"||t.type===txFilter)
       .filter(t=>!search||t.note?.toLowerCase().includes(search.toLowerCase())||t.category.toLowerCase().includes(search.toLowerCase()))
       .sort((a,b)=>new Date(b.date)-new Date(a.date))
  ,[txs,txFilter,search]);

  const debtChart = useMemo(()=>{
    const pts=[];
    for(let i=0;i<=Math.min(debtFreeMo,60);i++){
      const snap=i===0?activeDebts.map(d=>({id:d.id,remaining:d.balance})):schedule[i-1]?.snapshot||[];
      const e={month:i===0?"Now":`M${i}`};
      activeDebts.forEach(d=>{const s=snap.find(x=>x.id===d.id);e[d.name]=s?+s.remaining.toFixed(0):0;});
      pts.push(e);
    }
    return pts;
  },[schedule,debts,debtFreeMo]);

  const allExpCats = [...DEF_EXP,...expCats];
  const allIncCats = [...DEF_INC,...incCats];

  /* ── ACTIONS ── */
  const saveTx = () => {
    if(!nTx.amount||isNaN(nTx.amount)) return;
    const amount = parseFloat(nTx.amount);
    const tx = {...nTx,amount};
    // if category matches a debt name, auto-reduce that debt balance
    const matchedDebt = debts.find(d=>d.name.toLowerCase()===nTx.category.toLowerCase()||nTx.note?.toLowerCase().includes(d.name.toLowerCase()));
    if(editTxData){
      setTxs(p=>p.map(t=>t.id===editTxData.id?{...tx,id:editTxData.id}:t));
    } else {
      setTxs(p=>[...p,{...tx,id:Date.now()}]);
      // auto-link: if category is "Loan","Slice Pay","HDFC" or matches a debt name → offer is handled via linked payment
    }
    setNTx(blankTx); setEditTxData(null); setShowAddTx(false);
  };

  const logDebtPayment = () => {
    const amount = parseFloat(payAmt);
    if(!amount||isNaN(amount)||!showPayDebt) return;
    const d = showPayDebt;
    const newBalance = Math.max(0, d.balance - amount);
    const payment = {id:Date.now(),amount,date:new Date().toISOString().split("T")[0]};
    setDebts(p=>p.map(x=>x.id===d.id?{...x,balance:newBalance,paidOff:newBalance===0,payments:[...x.payments,payment]}:x));
    // also log in transactions automatically
    setTxs(p=>[...p,{id:Date.now()+1,type:"expense",category:"Loan",amount,date:payment.date,note:`Payment: ${d.name}`,linkedDebtId:d.id}]);
    setPayAmt(""); setShowPayDebt(null);
  };

  const saveDebt = () => {
    if(!nDebt.name||!nDebt.balance||!nDebt.rate) return;
    const bal = parseFloat(nDebt.balance);
    if(editDebtData){
      setDebts(p=>p.map(d=>d.id===editDebtData.id?{...d,...nDebt,balance:bal,originalBalance:editDebtData.originalBalance,rate:parseFloat(nDebt.rate),minPay:parseFloat(nDebt.minPay||0)}:d));
    } else {
      setDebts(p=>[...p,{...nDebt,id:Date.now(),originalBalance:bal,balance:bal,rate:parseFloat(nDebt.rate),minPay:parseFloat(nDebt.minPay||0),payments:[],paidOff:false}]);
    }
    setNDebt(blankDebt); setEditDebtData(null); setShowAddDebt(false);
  };

  const openEditDebt = d => { setEditDebtData(d); setNDebt({...d,balance:String(d.balance),rate:String(d.rate),minPay:String(d.minPay)}); setShowAddDebt(true); };

  const markPaidOff = id => setDebts(p=>p.map(d=>d.id===id?{...d,paidOff:true,balance:0}:d));

  const saveSaving = () => {
    if(!nSav.name||!nSav.target) return;
    setSavings(p=>[...p,{...nSav,id:Date.now(),target:parseFloat(nSav.target),current:parseFloat(nSav.current||0)}]);
    setNSav({name:"",target:"",current:"",color:"#7c3aed"}); setShowAddSav(false);
  };

  const addCat = () => {
    if(!newCatName.trim()) return;
    newCatType==="expense"?setExpCats(p=>[...p,newCatName.trim()]):setIncCats(p=>[...p,newCatName.trim()]);
    setNewCatName(""); setShowNewCat(false);
  };

  const resetAll = () => {
    setTxs([]); setDebts([]); setSavings([]); setExtra(300); setExpCats([]); setIncCats([]);
    ["fn_txs","fn_debts","fn_savings","fn_extra","fn_expc","fn_incc"].forEach(k=>localStorage.removeItem(k));
    setShowReset(false);
  };

  /* ── RENDER ── */
  return (
    <div style={{fontFamily:"'DM Sans','Nunito',system-ui,sans-serif",background:P.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:80,color:P.text}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* TOP BAR */}
      <div style={{background:"rgba(255,255,255,0.88)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${P.border}`,padding:"13px 20px",position:"sticky",top:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(124,58,237,0.35)"}}>
            <span style={{color:"#fff",fontWeight:800,fontSize:16}}>£</span>
          </div>
          <span style={{fontWeight:800,fontSize:18,letterSpacing:"-0.5px",background:"linear-gradient(135deg,#7c3aed,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Finio</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:12,color:P.muted,fontWeight:500}}>{new Date().toLocaleDateString("en-GB",{month:"short",year:"numeric"})}</span>
          <button onClick={()=>setShowReset(true)} style={{background:P.soft,border:`1px solid ${P.border}`,cursor:"pointer",width:32,height:32,borderRadius:10,fontSize:14,color:P.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>⚙︎</button>
        </div>
      </div>

      <div style={{padding:"20px 16px"}}>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview"&&<>
          <div style={{background:"linear-gradient(135deg,#7c3aed,#a78bfa)",borderRadius:24,padding:"24px 22px",marginBottom:14,boxShadow:"0 8px 32px rgba(124,58,237,0.3)",color:"#fff"}}>
            <div style={{fontSize:12,fontWeight:600,opacity:.75,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Net Balance</div>
            <div style={{fontSize:38,fontWeight:800,letterSpacing:"-1px",fontFamily:"'DM Mono',monospace",marginBottom:16}}>{fmt(balance)}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div style={{background:"rgba(255,255,255,0.15)",borderRadius:14,padding:"10px 14px"}}><div style={{fontSize:11,opacity:.75,marginBottom:2}}>Income</div><div style={{fontSize:17,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{fmt(totalIncome)}</div></div>
              <div style={{background:"rgba(255,255,255,0.15)",borderRadius:14,padding:"10px 14px"}}><div style={{fontSize:11,opacity:.75,marginBottom:2}}>Expenses</div><div style={{fontSize:17,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{fmt(totalExpenses)}</div></div>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <KpiCard label="Total Debt"   value={fmt(totalDebt)}     color={P.debt}    bg={P.debtBg}/>
            <KpiCard label="Invested"     value={fmt(totalInvested)} color={P.invest}  bg={P.investBg}/>
            <KpiCard label="Total Saved"  value={fmt(savings.reduce((s,g)=>s+g.current,0))} color={P.savings} bg={P.savingsBg}/>
            <KpiCard label="Debt-Free In" value={debtFreeMo?`${debtFreeMo} mo`:"✅ Clear"} color={P.debt} bg={P.debtBg}/>
          </div>
          <Card style={{marginBottom:14,padding:"18px 16px 10px"}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Income vs Expenses</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false}/>
                <XAxis dataKey="month" tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fontSize:10,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>`£${v/1000}k`}/>
                <Tooltip formatter={v=>fmtd(v)} contentStyle={{borderRadius:12,border:`1px solid ${P.border}`,fontSize:12}}/>
                <Bar dataKey="income"   fill="#6ee7b7" radius={[6,6,0,0]}/>
                <Bar dataKey="expenses" fill="#fca5a5" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card style={{marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Spending Breakdown</div>
            <div style={{display:"flex",alignItems:"center",gap:14}}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart><Pie data={expByCat} cx="50%" cy="50%" innerRadius={32} outerRadius={54} dataKey="value" paddingAngle={4}>{expByCat.map((_,i)=><Cell key={i} fill={PIES[i%PIES.length]}/>)}</Pie></PieChart>
              </ResponsiveContainer>
              <div style={{flex:1}}>{expByCat.map((c,i)=>(
                <div key={c.name} style={{display:"flex",justifyContent:"space-between",marginBottom:6,alignItems:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}><div style={{width:8,height:8,borderRadius:3,background:PIES[i%PIES.length]}}/><span style={{fontSize:11,color:P.muted}}>{c.name}</span></div>
                  <span style={{fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{fmt(c.value)}</span>
                </div>
              ))}</div>
            </div>
          </Card>
          <Card>
            <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Savings Goals</div>
            {savings.map(g=>{const pct=Math.min(100,Math.round(g.current/g.target*100));return(
              <div key={g.id} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}><span style={{fontSize:13,fontWeight:600}}>{g.name}</span><span style={{fontSize:11,color:P.muted,fontFamily:"'DM Mono',monospace"}}>{fmt(g.current)}/{fmt(g.target)}</span></div>
                <ProgressBar pct={pct} color={g.color}/><div style={{fontSize:10,color:P.muted,marginTop:3}}>{pct}%</div>
              </div>
            );})}
          </Card>
        </>}

        {/* ══ TRANSACTIONS ══ */}
        {tab==="transactions"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>Transactions</h2>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowNewCat(true)} style={{padding:"8px 12px",background:P.savingsBg,color:P.savings,border:`1.5px solid ${P.border}`,borderRadius:11,fontSize:12,fontWeight:700,cursor:"pointer"}}>+ Cat</button>
              <button onClick={()=>{setEditTxData(null);setNTx(blankTx);setShowAddTx(true);}} style={{padding:"8px 14px",background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(124,58,237,0.3)"}}>+ Add</button>
            </div>
          </div>
          <div style={{position:"relative",marginBottom:10}}>
            <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,color:P.muted}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{...iStyle,paddingLeft:36}}/>
          </div>
          <div style={{display:"flex",gap:7,marginBottom:12}}>
            {["all","income","expense"].map(f=>(
              <button key={f} onClick={()=>setTxFilter(f)} style={{flex:1,padding:"9px",borderRadius:12,border:"none",background:txFilter===f?"linear-gradient(135deg,#7c3aed,#a78bfa)":P.card,color:txFilter===f?"#fff":P.muted,fontSize:12,cursor:"pointer",fontWeight:700,textTransform:"capitalize",boxShadow:txFilter===f?"0 2px 8px rgba(124,58,237,0.3)":P.shadow}}>
                {f==="all"?"All":f==="income"?"💚 Income":"🔴 Expense"}
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:P.muted,marginBottom:8,fontWeight:500}}>← Swipe left to delete · ✏️ to edit</div>
          {filteredTxs.length===0&&<div style={{textAlign:"center",color:P.muted,padding:"40px 0"}}><div style={{fontSize:32,marginBottom:8}}>📭</div>No transactions</div>}
          {filteredTxs.map(t=><SwipeRow key={t.id} tx={t} onDelete={()=>setTxs(p=>p.filter(x=>x.id!==t.id))} onEdit={tx=>{setEditTxData(tx);setNTx({...tx,amount:String(tx.amount)});setShowAddTx(true);}}/>)}

          {showAddTx&&(
            <Modal title={editTxData?"Edit Transaction":"Add Transaction"} onClose={()=>{setShowAddTx(false);setEditTxData(null);setNTx(blankTx);}}>
              <Field label="Type">
                <div style={{display:"flex",gap:8}}>
                  {["expense","income"].map(t=>(
                    <button key={t} onClick={()=>setNTx(p=>({...p,type:t,category:(t==="expense"?allExpCats:allIncCats)[0]}))} style={{flex:1,padding:10,borderRadius:11,border:`1.5px solid ${nTx.type===t?P.savings:P.border}`,background:nTx.type===t?P.savingsBg:P.soft,color:nTx.type===t?P.savings:P.muted,fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"capitalize"}}>
                      {t==="income"?"💚 Income":"🔴 Expense"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Category"><select value={nTx.category} onChange={e=>setNTx(p=>({...p,category:e.target.value}))} style={iStyle}>{(nTx.type==="expense"?allExpCats:allIncCats).map(c=><option key={c}>{c}</option>)}</select></Field>
              <Field label="Amount (£)"><input type="number" placeholder="0.00" value={nTx.amount} onChange={e=>setNTx(p=>({...p,amount:e.target.value}))} style={iStyle}/></Field>
              <Field label="Date"><input type="date" value={nTx.date} onChange={e=>setNTx(p=>({...p,date:e.target.value}))} style={iStyle}/></Field>
              <Field label="Note"><input placeholder="e.g. Weekly shop" value={nTx.note} onChange={e=>setNTx(p=>({...p,note:e.target.value}))} style={iStyle}/></Field>
              <div style={{background:"#fffbeb",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#92400e"}}>
                💡 If this is a <strong>debt payment</strong>, use the Debt tab to log it directly against a specific debt — it will auto-reduce the balance.
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>{setShowAddTx(false);setEditTxData(null);setNTx(blankTx);}} style={{flex:1,padding:13,border:`1.5px solid ${P.border}`,borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:700}}>Cancel</button>
                <button onClick={saveTx} style={{flex:2,padding:13,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700}}>{editTxData?"Save Changes":"Add"}</button>
              </div>
            </Modal>
          )}
          {showNewCat&&(
            <Modal title="Add Custom Category" onClose={()=>setShowNewCat(false)}>
              <Field label="Type"><div style={{display:"flex",gap:8}}>{["expense","income"].map(t=><button key={t} onClick={()=>setNewCatType(t)} style={{flex:1,padding:10,borderRadius:11,border:`1.5px solid ${newCatType===t?P.savings:P.border}`,background:newCatType===t?P.savingsBg:P.soft,color:newCatType===t?P.savings:P.muted,fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"capitalize"}}>{t==="income"?"💚 Income":"🔴 Expense"}</button>)}</div></Field>
              <Field label="Category Name"><input placeholder="e.g. Gym, Netflix…" value={newCatName} onChange={e=>setNewCatName(e.target.value)} style={iStyle}/></Field>
              <div style={{display:"flex",gap:10,marginTop:8}}>
                <button onClick={()=>setShowNewCat(false)} style={{flex:1,padding:13,border:`1.5px solid ${P.border}`,borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:700}}>Cancel</button>
                <button onClick={addCat} style={{flex:2,padding:13,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700}}>Add</button>
              </div>
            </Modal>
          )}
        </>}

        {/* ══ BUDGETS ══ */}
        {tab==="budgets"&&<>
          <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>Monthly Budgets</h2>
          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            {seedBudgets.map(b=>{
              const spent=txs.filter(t=>t.type==="expense"&&t.category===b.category).reduce((s,t)=>s+t.amount,0);
              const pct=Math.min(100,Math.round(spent/b.limit*100)); const over=spent>b.limit;
              return(<Card key={b.id} style={{border:over?`1.5px solid ${b.color}55`:undefined}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <div><div style={{fontSize:14,fontWeight:700}}>{getCatEmoji(b.category)} {b.category}</div><div style={{fontSize:11,color:P.muted,marginTop:2}}>Limit {fmt(b.limit)}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:19,fontWeight:800,fontFamily:"'DM Mono',monospace",color:over?P.expense:P.text}}>{fmt(spent)}</div>{over&&<Pill color="#fff" bg={P.expense}>Over</Pill>}</div>
                </div>
                <ProgressBar pct={pct} color={over?P.expense:b.color} h={8}/>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:11,color:P.muted}}>{pct}% used</span><span style={{fontSize:11,fontWeight:700,color:over?P.expense:P.income}}>{over?`-${fmt(spent-b.limit)} over`:`${fmt(b.limit-spent)} left`}</span></div>
              </Card>);
            })}
          </div>
        </>}

        {/* ══ SAVINGS ══ */}
        {tab==="savings"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>Savings Goals</h2>
            <button onClick={()=>setShowAddSav(true)} style={{padding:"8px 14px",background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(124,58,237,0.3)"}}>+ Goal</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <KpiCard label="Total Saved"   value={fmt(savings.reduce((s,g)=>s+g.current,0))} color={P.savings} bg={P.savingsBg}/>
            <KpiCard label="Avg. Progress" value={savings.length?`${Math.round(savings.reduce((s,g)=>s+g.current/g.target*100,0)/savings.length)}%`:"—"} color={P.income} bg={P.incomeBg}/>
          </div>
          {savings.map(g=>{const pct=Math.min(100,Math.round(g.current/g.target*100));return(
            <Card key={g.id} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:9}}><div style={{width:12,height:12,borderRadius:4,background:g.color,boxShadow:`0 0 0 3px ${g.color}33`}}/><span style={{fontSize:14,fontWeight:700}}>{g.name}</span></div>
                <span style={{fontSize:12,fontFamily:"'DM Mono',monospace"}}><span style={{color:g.color,fontWeight:800}}>{fmt(g.current)}</span><span style={{color:P.muted}}> / {fmt(g.target)}</span></span>
              </div>
              <ProgressBar pct={pct} color={g.color} h={9}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:6}}><span style={{fontSize:11,color:P.muted}}>{pct}%</span><span style={{fontSize:11,color:P.muted}}>{fmt(g.target-g.current)} to go</span></div>
            </Card>
          );})}
          {showAddSav&&(
            <Modal title="New Savings Goal" onClose={()=>setShowAddSav(false)}>
              <Field label="Goal Name"><input placeholder="e.g. Holiday" value={nSav.name} onChange={e=>setNSav(p=>({...p,name:e.target.value}))} style={iStyle}/></Field>
              <Field label="Target (£)"><input type="number" placeholder="0" value={nSav.target} onChange={e=>setNSav(p=>({...p,target:e.target.value}))} style={iStyle}/></Field>
              <Field label="Saved So Far (£)"><input type="number" placeholder="0" value={nSav.current} onChange={e=>setNSav(p=>({...p,current:e.target.value}))} style={iStyle}/></Field>
              <Field label="Colour"><input type="color" value={nSav.color} onChange={e=>setNSav(p=>({...p,color:e.target.value}))} style={{...iStyle,padding:4,height:44,cursor:"pointer"}}/></Field>
              <div style={{display:"flex",gap:10,marginTop:8}}>
                <button onClick={()=>setShowAddSav(false)} style={{flex:1,padding:13,border:`1.5px solid ${P.border}`,borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:700}}>Cancel</button>
                <button onClick={saveSaving} style={{flex:2,padding:13,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700}}>Create</button>
              </div>
            </Modal>
          )}
        </>}

        {/* ══ INVESTMENTS ══ */}
        {tab==="investments"&&<>
          <h2 style={{margin:"0 0 16px",fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>Investments</h2>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            <KpiCard label="Portfolio" value={fmt(totalInvested)} color={P.invest} bg={P.investBg}/>
            <KpiCard label="Est. Gain" value={fmt(seedInvestments.reduce((s,i)=>s+(i.amount*i.gain/100),0))} color={P.income} bg={P.incomeBg}/>
          </div>
          {seedInvestments.map(inv=>(
            <Card key={inv.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px",marginBottom:9}}>
              <div style={{display:"flex",alignItems:"center",gap:11}}>
                <div style={{width:42,height:42,background:inv.color+"22",borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",border:`1.5px solid ${inv.color}33`}}><span style={{fontSize:9,fontWeight:800,color:inv.color}}>{inv.ticker}</span></div>
                <div><div style={{fontSize:13,fontWeight:700}}>{inv.name}</div><div style={{fontSize:11,color:P.muted}}>{inv.ticker}</div></div>
              </div>
              <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{fmt(inv.amount)}</div><div style={{fontSize:12,fontWeight:700,color:inv.gain>=0?P.income:P.expense}}>{inv.gain>=0?"▲":"▼"} {Math.abs(inv.gain)}%</div></div>
            </Card>
          ))}
        </>}

        {/* ══ DEBT CLEAROFF ══ */}
        {tab==="debt"&&<>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <h2 style={{margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>Debt Clearoff</h2>
            <button onClick={()=>{setEditDebtData(null);setNDebt(blankDebt);setShowAddDebt(true);}} style={{padding:"8px 14px",background:"linear-gradient(135deg,#ea580c,#fb923c)",color:"#fff",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(234,88,12,0.3)"}}>+ Debt</button>
          </div>

          {/* Strategy banner */}
          <div style={{background:"linear-gradient(135deg,#fff7ed,#ffedd5)",border:"1.5px solid #fed7aa",borderRadius:18,padding:"12px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,background:"linear-gradient(135deg,#ea580c,#fb923c)",borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:18}}>⬆</div>
            <div><div style={{fontSize:13,fontWeight:700,color:"#9a3412"}}>Avalanche Strategy</div><div style={{fontSize:11,color:"#c2410c",marginTop:1}}>Highest interest first — minimises total interest paid</div></div>
          </div>

          {/* KPIs */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:14}}>
            {[{label:"Total Debt",value:fmt(totalDebt),color:P.debt,bg:P.debtBg},{label:"Debt-Free",value:debtFreeMo?`${debtFreeMo} mo`:"✅",color:P.savings,bg:P.savingsBg},{label:"Min/Month",value:fmt(activeDebts.reduce((s,d)=>s+d.minPay,0)),color:P.muted,bg:P.card}].map(k=>(
              <div key={k.label} style={{background:k.bg,borderRadius:16,padding:"13px 12px",boxShadow:P.shadow}}>
                <div style={{fontSize:10,color:P.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4}}>{k.label}</div>
                <div style={{fontSize:15,fontWeight:800,color:k.color,fontFamily:"'DM Mono',monospace"}}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Extra payment slider */}
          <Card style={{marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,fontWeight:700}}>Extra Monthly Payment</span><span style={{fontSize:15,fontWeight:800,color:P.debt,fontFamily:"'DM Mono',monospace"}}>{fmt(extra)}</span></div>
            <input type="range" min={0} max={2000} step={25} value={extra} onChange={e=>setExtra(Number(e.target.value))} style={{width:"100%",accentColor:"#ea580c",cursor:"pointer"}}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{fontSize:10,color:P.muted}}>£0</span><span style={{fontSize:10,color:P.muted}}>£2,000</span></div>
            <div style={{marginTop:12,padding:"10px 14px",background:P.debtBg,borderRadius:12,fontSize:12,color:P.debt,fontWeight:600,lineHeight:1.5,border:"1px solid #fed7aa"}}>
              💡 With <strong>{fmt(extra)}</strong> extra/mo → debt-free in <strong>{debtFreeMo||"?"} months</strong>
            </div>
          </Card>

          {/* Paid off debts banner */}
          {debts.filter(d=>d.paidOff).length>0&&(
            <div style={{background:P.incomeBg,border:`1.5px solid #a7f3d0`,borderRadius:14,padding:"10px 14px",marginBottom:14,fontSize:12,color:P.income,fontWeight:600}}>
              🎉 {debts.filter(d=>d.paidOff).map(d=>d.name).join(", ")} — fully paid off!
            </div>
          )}

          {/* Debt cards */}
          <div style={{fontSize:11,color:P.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10}}>Avalanche Payoff Order</div>
          {[...activeDebts].sort((a,b)=>b.rate-a.rate).map((d,idx)=>{
            const paidOffSnap=schedule.findIndex(s=>(s.snapshot.find(x=>x.id===d.id)?.remaining||1)===0);
            const paidOffMonth=paidOffSnap>=0?paidOffSnap+1:debtFreeMo;
            const pctPaid=d.originalBalance>0?Math.min(100,Math.round(((d.originalBalance-d.balance)/d.originalBalance)*100)):0;
            const isFocus=idx===0;
            return(
              <Card key={d.id} style={{borderLeft:`4px solid ${d.color}`,marginBottom:10,position:"relative"}}>
                {/* rank badge */}
                <div style={{position:"absolute",top:14,right:14,width:26,height:26,background:isFocus?"linear-gradient(135deg,#ea580c,#fb923c)":"#f3f0ff",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:11,fontWeight:800,color:isFocus?"#fff":P.muted}}>#{idx+1}</span>
                </div>
                <div style={{marginBottom:10,paddingRight:36}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <Pill color={d.color} bg={d.color+"18"}>{d.type}</Pill>
                    {isFocus&&<Pill color="#fff" bg="linear-gradient(135deg,#ea580c,#fb923c)">Focus Now</Pill>}
                  </div>
                  <div style={{fontSize:15,fontWeight:800}}>{d.name}</div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                  {[{l:"Balance",v:fmt(d.balance)},{l:"APR",v:`${d.rate}%`},{l:"Min/mo",v:fmt(d.minPay)}].map(x=>(
                    <div key={x.l} style={{background:P.soft,borderRadius:10,padding:"7px 9px"}}>
                      <div style={{fontSize:9,color:P.muted,fontWeight:700,marginBottom:2}}>{x.l}</div>
                      <div style={{fontSize:12,fontWeight:800,fontFamily:"'DM Mono',monospace"}}>{x.v}</div>
                    </div>
                  ))}
                </div>

                <ProgressBar pct={pctPaid} color={d.color} h={7}/>
                <div style={{fontSize:10,color:P.muted,marginTop:3,marginBottom:12}}>
                  {pctPaid}% paid off · free ~month {paidOffMonth} · {d.payments.length} payment{d.payments.length!==1?"s":""}
                </div>

                {/* Action buttons */}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setShowPayDebt(d);setPayAmt("");}} style={{flex:2,padding:"9px",background:"linear-gradient(135deg,#ea580c,#fb923c)",color:"#fff",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>💳 Log Payment</button>
                  <button onClick={()=>setShowDebtHist(d)} style={{flex:1,padding:"9px",background:P.soft,color:P.muted,border:`1px solid ${P.border}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>📋 History</button>
                  <button onClick={()=>openEditDebt(d)} style={{flex:1,padding:"9px",background:P.soft,color:P.savings,border:`1px solid ${P.border}`,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>✏️ Edit</button>
                </div>
                <button onClick={()=>markPaidOff(d.id)} style={{width:"100%",marginTop:8,padding:"8px",background:P.incomeBg,color:P.income,border:`1px solid #a7f3d0`,borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer"}}>✅ Mark as Paid Off</button>
              </Card>
            );
          })}

          {/* Trajectory chart */}
          {debtChart.length>1&&(
            <Card style={{padding:"18px 16px 10px",marginTop:4}}>
              <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>Debt Reduction Trajectory</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={debtChart}>
                  <defs>{activeDebts.map(d=><linearGradient key={d.id} id={`g${d.id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={d.color} stopOpacity={0.2}/><stop offset="95%" stopColor={d.color} stopOpacity={0}/></linearGradient>)}</defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false}/>
                  <XAxis dataKey="month" tick={{fontSize:9,fill:P.muted}} axisLine={false} tickLine={false} interval={Math.max(1,Math.floor(debtChart.length/5))}/>
                  <YAxis tick={{fontSize:9,fill:P.muted}} axisLine={false} tickLine={false} tickFormatter={v=>`£${Math.round(v/1000)}k`}/>
                  <Tooltip formatter={v=>fmtd(v)} contentStyle={{borderRadius:12,border:`1px solid ${P.border}`,fontSize:11}}/>
                  {activeDebts.map(d=><Area key={d.id} type="monotone" dataKey={d.name} stroke={d.color} strokeWidth={2} fill={`url(#g${d.id})`}/>)}
                </AreaChart>
              </ResponsiveContainer>
              <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
                {activeDebts.map(d=><div key={d.id} style={{display:"flex",alignItems:"center",gap:5}}><div style={{width:8,height:8,borderRadius:3,background:d.color}}/><span style={{fontSize:10,color:P.muted}}>{d.name}</span></div>)}
              </div>
            </Card>
          )}

          {/* Log Payment Modal */}
          {showPayDebt&&(
            <Modal title={`Log Payment — ${showPayDebt.name}`} onClose={()=>setShowPayDebt(null)}>
              <div style={{background:P.debtBg,borderRadius:12,padding:"12px 14px",marginBottom:16,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:13,color:P.muted}}>Current Balance</span>
                <span style={{fontSize:15,fontWeight:800,color:P.debt,fontFamily:"'DM Mono',monospace"}}>{fmt(showPayDebt.balance)}</span>
              </div>
              <Field label="Payment Amount (£)"><input type="number" placeholder="0.00" value={payAmt} onChange={e=>setPayAmt(e.target.value)} style={iStyle}/></Field>
              <div style={{background:"#fffbeb",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#92400e"}}>
                💡 This will automatically reduce the balance and log a transaction in your Transactions tab.
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>setShowPayDebt(null)} style={{flex:1,padding:13,border:`1.5px solid ${P.border}`,borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:700}}>Cancel</button>
                <button onClick={logDebtPayment} style={{flex:2,padding:13,background:"linear-gradient(135deg,#ea580c,#fb923c)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700}}>Log Payment</button>
              </div>
            </Modal>
          )}

          {/* Payment History Modal */}
          {showDebtHist&&(
            <Modal title={`Payment History — ${showDebtHist.name}`} onClose={()=>setShowDebtHist(null)}>
              <div style={{background:P.debtBg,borderRadius:12,padding:"12px 14px",marginBottom:16,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:13,color:P.muted}}>Remaining Balance</span>
                <span style={{fontSize:15,fontWeight:800,color:P.debt,fontFamily:"'DM Mono',monospace"}}>{fmt(showDebtHist.balance)}</span>
              </div>
              {debts.find(d=>d.id===showDebtHist.id)?.payments.length===0&&(
                <div style={{textAlign:"center",color:P.muted,padding:"24px 0",fontSize:13}}><div style={{fontSize:28,marginBottom:8}}>💳</div>No payments logged yet</div>
              )}
              {[...(debts.find(d=>d.id===showDebtHist.id)?.payments||[])].reverse().map(p=>(
                <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:`1px solid ${P.border}`}}>
                  <div><div style={{fontSize:13,fontWeight:600}}>Payment</div><div style={{fontSize:11,color:P.muted,marginTop:2}}>{p.date}</div></div>
                  <span style={{fontSize:14,fontWeight:800,color:P.income,fontFamily:"'DM Mono',monospace"}}>-{fmt(p.amount)}</span>
                </div>
              ))}
              <div style={{marginTop:16,padding:"12px 14px",background:P.soft,borderRadius:12,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,color:P.muted}}>Total Paid</span>
                <span style={{fontSize:14,fontWeight:800,color:P.income,fontFamily:"'DM Mono',monospace"}}>{fmt((debts.find(d=>d.id===showDebtHist.id)?.payments||[]).reduce((s,p)=>s+p.amount,0))}</span>
              </div>
            </Modal>
          )}

          {/* Add/Edit Debt Modal */}
          {showAddDebt&&(
            <Modal title={editDebtData?"Edit Debt":"Add Debt"} onClose={()=>{setShowAddDebt(false);setEditDebtData(null);setNDebt(blankDebt);}}>
              <Field label="Type"><select value={nDebt.type} onChange={e=>setNDebt(p=>({...p,type:e.target.value}))} style={iStyle}>{["Credit Card","Personal Loan","Car Loan","HDFC","Slice Pay","Other"].map(t=><option key={t}>{t}</option>)}</select></Field>
              <Field label="Name"><input placeholder="e.g. Barclaycard" value={nDebt.name} onChange={e=>setNDebt(p=>({...p,name:e.target.value}))} style={iStyle}/></Field>
              <Field label="Current Balance (£)"><input type="number" placeholder="0" value={nDebt.balance} onChange={e=>setNDebt(p=>({...p,balance:e.target.value}))} style={iStyle}/></Field>
              <Field label="Annual Interest Rate (%)"><input type="number" placeholder="0.0" value={nDebt.rate} onChange={e=>setNDebt(p=>({...p,rate:e.target.value}))} style={iStyle}/></Field>
              <Field label="Min Monthly Payment (£)"><input type="number" placeholder="0" value={nDebt.minPay} onChange={e=>setNDebt(p=>({...p,minPay:e.target.value}))} style={iStyle}/></Field>
              <Field label="Colour"><input type="color" value={nDebt.color} onChange={e=>setNDebt(p=>({...p,color:e.target.value}))} style={{...iStyle,padding:4,height:44,cursor:"pointer"}}/></Field>
              <div style={{display:"flex",gap:10,marginTop:8}}>
                <button onClick={()=>{setShowAddDebt(false);setEditDebtData(null);setNDebt(blankDebt);}} style={{flex:1,padding:13,border:`1.5px solid ${P.border}`,borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:700}}>Cancel</button>
                <button onClick={saveDebt} style={{flex:2,padding:13,background:"linear-gradient(135deg,#ea580c,#fb923c)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700}}>{editDebtData?"Save Changes":"Add Debt"}</button>
              </div>
            </Modal>
          )}
        </>}

      </div>

      {/* RESET MODAL */}
      {showReset&&(
        <div style={{position:"fixed",inset:0,background:"rgba(30,27,75,0.3)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400,backdropFilter:"blur(4px)"}}>
          <div style={{background:P.card,borderRadius:"24px 24px 0 0",padding:"8px 24px 36px",width:"100%",maxWidth:480,boxShadow:"0 -12px 48px rgba(124,58,237,0.2)"}}>
            <div style={{width:36,height:4,background:P.border,borderRadius:99,margin:"12px auto 24px"}}/>
            <div style={{width:56,height:56,background:"#fef2f2",borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:26}}>🗑️</div>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:18,fontWeight:800,marginBottom:8}}>Clear All Data?</div>
              <div style={{fontSize:13,color:P.muted,lineHeight:1.6}}>This permanently deletes all transactions, debts, savings and categories.</div>
            </div>
            <button onClick={resetAll} style={{width:"100%",padding:15,background:"linear-gradient(135deg,#dc2626,#f87171)",color:"#fff",border:"none",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:10}}>Yes, Delete Everything</button>
            <button onClick={()=>setShowReset(false)} style={{width:"100%",padding:15,background:P.soft,color:P.text,border:"none",borderRadius:14,fontSize:15,fontWeight:700,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* BOTTOM NAV */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(255,255,255,0.92)",backdropFilter:"blur(12px)",borderTop:`1px solid ${P.border}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)"}}>
        {NAV.map(n=>{const active=tab===n.id;const isDebt=n.id==="debt";return(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{flex:1,padding:"10px 0 12px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <span style={{fontSize:18,filter:active?undefined:"grayscale(0.5) opacity(0.5)"}}>{n.emoji}</span>
            <span style={{fontSize:9,fontWeight:800,letterSpacing:"0.3px",textTransform:"uppercase",color:active?(isDebt?"#ea580c":P.savings):P.muted}}>{n.label}</span>
            {active&&<div style={{width:18,height:3,borderRadius:99,background:isDebt?"#ea580c":"linear-gradient(90deg,#7c3aed,#a78bfa)",marginTop:1}}/>}
          </button>
        );})}
      </div>
    </div>
  );
}
