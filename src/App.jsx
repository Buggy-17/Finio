import { useState, useMemo, useEffect, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";

/* ── LOCAL STORAGE ──────────────────────────────────────────── */
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

/* ── PASTEL DESIGN TOKENS ───────────────────────────────────── */
const P = {
  bg:        "#f5f3ff",
  card:      "#ffffff",
  border:    "#ede9fe",
  text:      "#1e1b4b",
  muted:     "#9ca3af",
  soft:      "#f9f7ff",
  income:    "#059669",
  incomeBg:  "#ecfdf5",
  expense:   "#dc2626",
  expenseBg: "#fef2f2",
  savings:   "#7c3aed",
  savingsBg: "#f5f3ff",
  invest:    "#0891b2",
  investBg:  "#ecfeff",
  debt:      "#ea580c",
  debtBg:    "#fff7ed",
  loan:      "#7c3aed",
  shadow:    "0 2px 16px rgba(124,58,237,0.07)",
  shadowMd:  "0 4px 24px rgba(124,58,237,0.12)",
};

const iStyle = {
  width:"100%", padding:"11px 14px", border:`1.5px solid ${P.border}`,
  borderRadius:12, fontSize:14, outline:"none", background:P.soft,
  boxSizing:"border-box", fontFamily:"inherit", color:P.text,
  transition:"border-color .15s",
};

/* ── INITIAL DATA ───────────────────────────────────────────── */
const initTransactions = [
  { id:1, type:"income",  category:"Salary",       amount:5200, date:"2026-03-01", note:"Monthly salary" },
  { id:2, type:"expense", category:"Housing",       amount:1400, date:"2026-03-02", note:"Rent" },
  { id:3, type:"expense", category:"Food",          amount:320,  date:"2026-03-05", note:"Groceries" },
  { id:4, type:"expense", category:"Transport",     amount:120,  date:"2026-03-07", note:"Monthly pass" },
  { id:5, type:"income",  category:"Freelance",     amount:800,  date:"2026-03-10", note:"Design project" },
  { id:6, type:"expense", category:"Entertainment", amount:90,   date:"2026-03-12", note:"Streaming & dining" },
  { id:7, type:"expense", category:"Utilities",     amount:150,  date:"2026-03-15", note:"Electric & internet" },
  { id:8, type:"expense", category:"Shopping",      amount:230,  date:"2026-03-18", note:"Clothing" },
];
const initDebts = [
  { id:1, type:"Credit Card",   name:"Visa Platinum",      balance:4800,  rate:22.9, minPay:120, color:"#dc2626" },
  { id:2, type:"Personal Loan", name:"Bank Personal Loan", balance:12500, rate:14.5, minPay:280, color:"#ea580c" },
  { id:3, type:"Car Loan",      name:"Toyota Finance",     balance:18400, rate:7.9,  minPay:420, color:"#d97706" },
];
const initSavings = [
  { id:1, name:"Emergency Fund", target:10000, current:6200, color:"#7c3aed" },
  { id:2, name:"Vacation",        target:3000,  current:1450, color:"#f59e0b" },
  { id:3, name:"New Laptop",      target:2000,  current:900,  color:"#059669" },
];
const initInvestments = [
  { id:1, name:"S&P 500 ETF", ticker:"VOO", amount:8400, gain: 12.4, color:"#7c3aed" },
  { id:2, name:"Tech Fund",   ticker:"QQQ", amount:3200, gain: -2.1, color:"#db2777" },
  { id:3, name:"Bonds",       ticker:"BND", amount:2100, gain:  3.8, color:"#0891b2" },
];
const initBudgets = [
  { id:1, category:"Housing",       limit:1500, color:"#dc2626" },
  { id:2, category:"Food",          limit:400,  color:"#f97316" },
  { id:3, category:"Transport",     limit:200,  color:"#eab308" },
  { id:4, category:"Entertainment", limit:150,  color:"#8b5cf6" },
  { id:5, category:"Shopping",      limit:300,  color:"#0891b2" },
  { id:6, category:"Utilities",     limit:200,  color:"#059669" },
];

const DEFAULT_EXPENSE_CATS = ["Housing","Food","Transport","Health","Entertainment","Shopping","Utilities","Loan","Slice Pay","HDFC","Other"];
const DEFAULT_INCOME_CATS  = ["Salary","Freelance","Business","Rental","Other"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PIE_COLORS = ["#a78bfa","#f9a8d4","#6ee7b7","#93c5fd","#fcd34d","#fb923c","#c4b5fd","#34d399"];

const fmt  = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const fmtd = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(n);

/* ── AVALANCHE ──────────────────────────────────────────────── */
function calcAvalanche(debts, extraMonthly) {
  if (!debts.length) return [];
  let balances = debts.map(d => ({ ...d, remaining: d.balance }));
  const sorted = [...balances].sort((a,b) => b.rate - a.rate);
  const schedule = [];
  let month = 0;
  while (balances.some(d => d.remaining > 0) && month < 360) {
    month++;
    let extra = extraMonthly;
    const entry = { month, debts:{} };
    for (const d of balances) {
      if (d.remaining <= 0) continue;
      const interest = +(d.remaining * d.rate / 100 / 12).toFixed(2);
      const pay = Math.min(d.minPay, d.remaining + interest);
      d.remaining = Math.max(0, d.remaining + interest - pay);
      entry.debts[d.id] = { paid:pay, remaining:d.remaining, interest };
    }
    for (const d of sorted) {
      if (extra <= 0) break;
      const live = balances.find(b => b.id === d.id);
      if (live.remaining <= 0) continue;
      const payment = Math.min(extra, live.remaining);
      live.remaining = Math.max(0, live.remaining - payment);
      entry.debts[d.id].paid += payment;
      extra -= payment;
    }
    schedule.push({ ...entry, snapshot: balances.map(b => ({ id:b.id, remaining:b.remaining })) });
    if (balances.every(d => d.remaining <= 0)) break;
  }
  return schedule;
}

/* ── UI COMPONENTS ──────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(30,27,75,0.25)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)" }}>
      <div style={{ background:P.card,borderRadius:"24px 24px 0 0",padding:"8px 24px 32px",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -12px 48px rgba(124,58,237,0.15)" }}>
        <div style={{ width:36,height:4,background:P.border,borderRadius:99,margin:"12px auto 20px" }}/>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <span style={{ fontSize:17,fontWeight:700,color:P.text }}>{title}</span>
          <button onClick={onClose} style={{ background:P.soft,border:"none",width:32,height:32,borderRadius:99,cursor:"pointer",fontSize:16,color:P.muted,display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontSize:11,fontWeight:700,color:P.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.6px" }}>{label}</div>
      {children}
    </div>
  );
}

function Pill({ color, bg, children }) {
  return <span style={{ fontSize:9,fontWeight:700,color,background:bg,padding:"3px 9px",borderRadius:99,textTransform:"uppercase",letterSpacing:"0.5px" }}>{children}</span>;
}

function ProgressBar({ pct, color, h=7 }) {
  return (
    <div style={{ height:h,background:P.border,borderRadius:99,overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,pct)}%`,height:"100%",background:color,borderRadius:99,transition:"width .6s cubic-bezier(.4,0,.2,1)" }}/>
    </div>
  );
}

function Card({ children, style={} }) {
  return <div style={{ background:P.card,borderRadius:20,padding:18,boxShadow:P.shadow,...style }}>{children}</div>;
}

function KpiCard({ label, value, color, bg, sub }) {
  return (
    <div style={{ background:bg||P.card,borderRadius:20,padding:"16px 18px",boxShadow:P.shadow }}>
      <div style={{ fontSize:11,color:P.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:22,fontWeight:800,color,letterSpacing:"-0.5px",fontFamily:"'DM Mono',monospace" }}>{value}</div>
      {sub && <div style={{ fontSize:11,color:P.muted,marginTop:3 }}>{sub}</div>}
    </div>
  );
}

/* ── SWIPEABLE TRANSACTION ROW ──────────────────────────────── */
function SwipeRow({ tx, onDelete, onEdit }) {
  const [offset, setOffset] = useState(0);
  const [swiped, setSwiped] = useState(false);
  const startX = useRef(null);

  const catColor = tx.type === "income" ? P.income : P.expense;
  const catBg    = tx.type === "income" ? P.incomeBg : P.expenseBg;

  const handleStart = e => { startX.current = (e.touches ? e.touches[0].clientX : e.clientX); };
  const handleMove  = e => {
    if (startX.current === null) return;
    const dx = (e.touches ? e.touches[0].clientX : e.clientX) - startX.current;
    if (dx < 0) setOffset(Math.max(dx, -80));
  };
  const handleEnd = () => {
    if (offset < -40) { setOffset(-80); setSwiped(true); }
    else { setOffset(0); setSwiped(false); }
    startX.current = null;
  };

  return (
    <div style={{ position:"relative",borderRadius:16,overflow:"hidden",marginBottom:8 }}>
      {/* Delete bg */}
      <div style={{ position:"absolute",inset:0,background:"#fef2f2",display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:16,borderRadius:16 }}>
        <button onClick={onDelete} style={{ background:"#dc2626",border:"none",color:"#fff",borderRadius:10,padding:"6px 12px",fontSize:12,fontWeight:700,cursor:"pointer" }}>Delete</button>
      </div>
      {/* Row */}
      <div
        onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}
        onMouseDown={handleStart}  onMouseMove={handleMove}  onMouseUp={handleEnd}
        style={{ transform:`translateX(${offset}px)`,transition:startX.current?undefined:"transform .25s ease",background:P.card,borderRadius:16,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"grab",userSelect:"none",boxShadow:P.shadow }}
      >
        <div style={{ display:"flex",alignItems:"center",gap:11,flex:1,minWidth:0 }}>
          <div style={{ width:38,height:38,background:catBg,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
            <span style={{ fontSize:16 }}>{tx.type==="income" ? "💰" : getCatEmoji(tx.category)}</span>
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:13,fontWeight:600,color:P.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis" }}>{tx.note||tx.category}</div>
            <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:2 }}>
              <Pill color={catColor} bg={catBg}>{tx.category}</Pill>
              <span style={{ fontSize:10,color:P.muted }}>{tx.date}</span>
            </div>
          </div>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8,flexShrink:0 }}>
          <span style={{ fontSize:15,fontWeight:800,fontFamily:"'DM Mono',monospace",color:catColor }}>
            {tx.type==="income"?"+":"-"}{fmt(tx.amount)}
          </span>
          <button onClick={()=>onEdit(tx)} style={{ background:P.soft,border:"none",width:28,height:28,borderRadius:8,cursor:"pointer",fontSize:12,color:P.muted }}>✏️</button>
        </div>
      </div>
    </div>
  );
}

function getCatEmoji(cat) {
  const map = { Housing:"🏠",Food:"🍔",Transport:"🚗",Health:"💊",Entertainment:"🎬",Shopping:"🛍",Utilities:"⚡",Loan:"🏦","Slice Pay":"💳",HDFC:"🏦",Salary:"💼",Freelance:"💻",Business:"📊",Rental:"🏘",Other:"📌" };
  return map[cat] || "📌";
}

/* ── NAV ────────────────────────────────────────────────────── */
const NAV = [
  { id:"overview",     emoji:"🏠", label:"Home" },
  { id:"transactions", emoji:"↕️",  label:"Txns" },
  { id:"budgets",      emoji:"📊", label:"Budget" },
  { id:"savings",      emoji:"🎯", label:"Savings" },
  { id:"investments",  emoji:"📈", label:"Invest" },
  { id:"debt",         emoji:"🔥", label:"Debt" },
];

/* ══════════════════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [tab, setTab]               = useState("overview");
  const [transactions, setTx]       = useState(() => load("finio_transactions", initTransactions));
  const [savings, setSavings]       = useState(() => load("finio_savings", initSavings));
  const [debts, setDebts]           = useState(() => load("finio_debts", initDebts));
  const [extra, setExtra]           = useState(() => load("finio_extra", 300));
  const [customExpCats, setExpCats] = useState(() => load("finio_exp_cats", []));
  const [customIncCats, setIncCats] = useState(() => load("finio_inc_cats", []));

  const [showAddTx,    setAddTx]    = useState(false);
  const [showAddDebt,  setAddDebt]  = useState(false);
  const [showAddSav,   setAddSav]   = useState(false);
  const [showReset,    setShowReset]= useState(false);
  const [editTx,       setEditTx]   = useState(null);
  const [showNewCat,   setShowNewCat] = useState(false);
  const [newCatName,   setNewCatName] = useState("");
  const [newCatType,   setNewCatType] = useState("expense");

  const [search,   setSearch]   = useState("");
  const [txFilter, setTxFilter] = useState("all");

  const expCats = [...DEFAULT_EXPENSE_CATS, ...customExpCats];
  const incCats = [...DEFAULT_INCOME_CATS,  ...customIncCats];

  const blankTx = { type:"expense", category:"Food", amount:"", date:new Date().toISOString().split("T")[0], note:"" };
  const [nTx,   setNTx]   = useState(blankTx);
  const [nDebt, setNDebt] = useState({ type:"Credit Card",name:"",balance:"",rate:"",minPay:"",color:"#dc2626" });
  const [nSav,  setNSav]  = useState({ name:"",target:"",current:"",color:"#7c3aed" });

  /* auto-save */
  useEffect(()=>save("finio_transactions",transactions),[transactions]);
  useEffect(()=>save("finio_savings",savings),[savings]);
  useEffect(()=>save("finio_debts",debts),[debts]);
  useEffect(()=>save("finio_extra",extra),[extra]);
  useEffect(()=>save("finio_exp_cats",customExpCats),[customExpCats]);
  useEffect(()=>save("finio_inc_cats",customIncCats),[customIncCats]);

  /* derived */
  const totalIncome   = useMemo(()=>transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),[transactions]);
  const totalExpenses = useMemo(()=>transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0),[transactions]);
  const balance       = totalIncome - totalExpenses;
  const totalDebt     = debts.reduce((s,d)=>s+d.balance,0);
  const totalInvested = initInvestments.reduce((s,i)=>s+i.amount,0);

  const schedule   = useMemo(()=>calcAvalanche(debts,extra),[debts,extra]);
  const debtFreeMo = schedule.length;

  const expByCat = useMemo(()=>{
    const map={};
    transactions.filter(t=>t.type==="expense").forEach(t=>{map[t.category]=(map[t.category]||0)+t.amount;});
    return Object.entries(map).map(([name,value])=>({name,value}));
  },[transactions]);

  const monthlyData = useMemo(()=>{
    const map={};
    transactions.forEach(t=>{
      const m=new Date(t.date).getMonth();
      if(!map[m]) map[m]={month:MONTHS[m],income:0,expenses:0};
      t.type==="income"?(map[m].income+=t.amount):(map[m].expenses+=t.amount);
    });
    return Object.values(map);
  },[transactions]);

  const filteredTx = useMemo(()=>
    transactions
      .filter(t=>txFilter==="all"||t.type===txFilter)
      .filter(t=>!search||t.note?.toLowerCase().includes(search.toLowerCase())||t.category.toLowerCase().includes(search.toLowerCase()))
      .sort((a,b)=>new Date(b.date)-new Date(a.date)),
  [transactions,txFilter,search]);

  const debtChart = useMemo(()=>{
    const pts=[];
    for(let i=0;i<=Math.min(debtFreeMo,60);i++){
      const snap=i===0?debts.map(d=>({id:d.id,remaining:d.balance})):schedule[i-1]?.snapshot||[];
      const e={month:i===0?"Now":`M${i}`};
      debts.forEach(d=>{const s=snap.find(x=>x.id===d.id);e[d.name]=s?+s.remaining.toFixed(0):0;});
      pts.push(e);
    }
    return pts;
  },[schedule,debts,debtFreeMo]);

  /* actions */
  const saveTx = () => {
    if(!nTx.amount||isNaN(nTx.amount)) return;
    if(editTx) {
      setTx(p=>p.map(t=>t.id===editTx.id?{...nTx,id:editTx.id,amount:parseFloat(nTx.amount)}:t));
      setEditTx(null);
    } else {
      setTx(p=>[...p,{...nTx,id:Date.now(),amount:parseFloat(nTx.amount)}]);
    }
    setNTx(blankTx);
    setAddTx(false);
  };

  const openEdit = (tx) => {
    setEditTx(tx);
    setNTx({...tx, amount:String(tx.amount)});
    setAddTx(true);
  };

  const deleteTx = id => setTx(p=>p.filter(t=>t.id!==id));

  const saveDebt = () => {
    if(!nDebt.name||!nDebt.balance||!nDebt.rate) return;
    setDebts(p=>[...p,{...nDebt,id:Date.now(),balance:parseFloat(nDebt.balance),rate:parseFloat(nDebt.rate),minPay:parseFloat(nDebt.minPay||0)}]);
    setNDebt({type:"Credit Card",name:"",balance:"",rate:"",minPay:"",color:"#dc2626"});
    setAddDebt(false);
  };

  const saveSaving = () => {
    if(!nSav.name||!nSav.target) return;
    setSavings(p=>[...p,{...nSav,id:Date.now(),target:parseFloat(nSav.target),current:parseFloat(nSav.current||0)}]);
    setNSav({name:"",target:"",current:"",color:"#7c3aed"});
    setAddSav(false);
  };

  const addCustomCat = () => {
    if(!newCatName.trim()) return;
    if(newCatType==="expense") setExpCats(p=>[...p,newCatName.trim()]);
    else setIncCats(p=>[...p,newCatName.trim()]);
    setNewCatName(""); setShowNewCat(false);
  };

  const resetAll = () => {
    setTx([]); setSavings([]); setDebts([]); setExtra(300);
    ["finio_transactions","finio_savings","finio_debts","finio_extra","finio_exp_cats","finio_inc_cats"].forEach(k=>localStorage.removeItem(k));
    setExpCats([]); setIncCats([]);
    setShowReset(false);
  };

  const currentCats = nTx.type==="expense" ? expCats : incCats;

  /* ── RENDER ────────────────────────────────────────────────── */
  return (
    <div style={{ fontFamily:"'DM Sans','Nunito',system-ui,sans-serif",background:P.bg,minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:80,color:P.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* ── TOP BAR ── */}
      <div style={{ background:"rgba(255,255,255,0.85)",backdropFilter:"blur(12px)",borderBottom:`1px solid ${P.border}`,padding:"14px 20px",position:"sticky",top:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <div style={{ width:34,height:34,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 2px 8px rgba(124,58,237,0.35)" }}>
            <span style={{ color:"#fff",fontWeight:800,fontSize:16 }}>$</span>
          </div>
          <span style={{ fontWeight:800,fontSize:18,letterSpacing:"-0.5px",background:"linear-gradient(135deg,#7c3aed,#a78bfa)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>Finio</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ fontSize:12,color:P.muted,fontWeight:500 }}>{new Date().toLocaleDateString("en-US",{month:"short",year:"numeric"})}</span>
          <button onClick={()=>setShowReset(true)} style={{ background:P.soft,border:`1px solid ${P.border}`,cursor:"pointer",width:32,height:32,borderRadius:10,fontSize:15,color:P.muted,display:"flex",alignItems:"center",justifyContent:"center" }}>⚙︎</button>
        </div>
      </div>

      <div style={{ padding:"20px 16px" }}>

        {/* ════ OVERVIEW ════ */}
        {tab==="overview" && <>
          {/* Hero balance card */}
          <div style={{ background:"linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)",borderRadius:24,padding:"24px 22px",marginBottom:14,boxShadow:"0 8px 32px rgba(124,58,237,0.3)",color:"#fff" }}>
            <div style={{ fontSize:12,fontWeight:600,opacity:0.75,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px" }}>Net Balance</div>
            <div style={{ fontSize:38,fontWeight:800,letterSpacing:"-1px",fontFamily:"'DM Mono',monospace",marginBottom:16 }}>{fmt(balance)}</div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
              <div style={{ background:"rgba(255,255,255,0.15)",borderRadius:14,padding:"10px 14px" }}>
                <div style={{ fontSize:11,opacity:0.75,marginBottom:2 }}>Income</div>
                <div style={{ fontSize:17,fontWeight:800,fontFamily:"'DM Mono',monospace" }}>{fmt(totalIncome)}</div>
              </div>
              <div style={{ background:"rgba(255,255,255,0.15)",borderRadius:14,padding:"10px 14px" }}>
                <div style={{ fontSize:11,opacity:0.75,marginBottom:2 }}>Expenses</div>
                <div style={{ fontSize:17,fontWeight:800,fontFamily:"'DM Mono',monospace" }}>{fmt(totalExpenses)}</div>
              </div>
            </div>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            <KpiCard label="Total Debt"   value={fmt(totalDebt)}     color={P.debt}    bg={P.debtBg}    />
            <KpiCard label="Invested"     value={fmt(totalInvested)} color={P.invest}  bg={P.investBg}  />
            <KpiCard label="Total Saved"  value={fmt(savings.reduce((s,g)=>s+g.current,0))} color={P.savings} bg={P.savingsBg} />
            <KpiCard label="Debt-Free In" value={`${debtFreeMo} mo`} color={P.debt}    bg={P.debtBg}    />
          </div>

          <Card style={{ marginBottom:14,padding:"18px 16px 10px" }}>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:14,color:P.text }}>Income vs Expenses</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:10,fill:P.muted }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10,fill:P.muted }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v/1000}k`}/>
                <Tooltip formatter={v=>fmtd(v)} contentStyle={{ borderRadius:12,border:`1px solid ${P.border}`,fontSize:12,background:P.card }}/>
                <Bar dataKey="income"   fill="#6ee7b7" radius={[6,6,0,0]}/>
                <Bar dataKey="expenses" fill="#fca5a5" radius={[6,6,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>Spending Breakdown</div>
            <div style={{ display:"flex",alignItems:"center",gap:14 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={expByCat} cx="50%" cy="50%" innerRadius={32} outerRadius={54} dataKey="value" paddingAngle={4}>
                    {expByCat.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {expByCat.map((c,i)=>(
                  <div key={c.name} style={{ display:"flex",justifyContent:"space-between",marginBottom:6,alignItems:"center" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                      <div style={{ width:8,height:8,borderRadius:3,background:PIE_COLORS[i%PIE_COLORS.length],flexShrink:0 }}/>
                      <span style={{ fontSize:11,color:P.muted }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize:11,fontWeight:700,fontFamily:"'DM Mono',monospace" }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>Savings Goals</div>
            {savings.map(g=>{
              const pct=Math.min(100,Math.round(g.current/g.target*100));
              return (
                <div key={g.id} style={{ marginBottom:14 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                    <span style={{ fontSize:13,fontWeight:600 }}>{g.name}</span>
                    <span style={{ fontSize:11,color:P.muted,fontFamily:"'DM Mono',monospace" }}>{fmt(g.current)}/{fmt(g.target)}</span>
                  </div>
                  <ProgressBar pct={pct} color={g.color}/>
                  <div style={{ fontSize:10,color:P.muted,marginTop:3 }}>{pct}% complete</div>
                </div>
              );
            })}
          </Card>
        </>}

        {/* ════ TRANSACTIONS ════ */}
        {tab==="transactions" && <>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <h2 style={{ margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.5px" }}>Transactions</h2>
            <div style={{ display:"flex",gap:8 }}>
              <button onClick={()=>{setShowNewCat(true);}} style={{ padding:"8px 12px",background:P.savingsBg,color:P.savings,border:`1.5px solid ${P.border}`,borderRadius:11,fontSize:12,fontWeight:700,cursor:"pointer" }}>+ Category</button>
              <button onClick={()=>{setEditTx(null);setNTx(blankTx);setAddTx(true);}} style={{ padding:"8px 14px",background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(124,58,237,0.3)" }}>+ Add</button>
            </div>
          </div>

          <div style={{ position:"relative",marginBottom:10 }}>
            <span style={{ position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontSize:14,color:P.muted }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search transactions…" style={{ ...iStyle,paddingLeft:36 }}/>
          </div>

          <div style={{ display:"flex",gap:7,marginBottom:16 }}>
            {["all","income","expense"].map(f=>(
              <button key={f} onClick={()=>setTxFilter(f)} style={{ flex:1,padding:"9px",borderRadius:12,border:"none",background:txFilter===f?"linear-gradient(135deg,#7c3aed,#a78bfa)":P.card,color:txFilter===f?"#fff":P.muted,fontSize:12,cursor:"pointer",fontWeight:700,textTransform:"capitalize",boxShadow:txFilter===f?"0 2px 8px rgba(124,58,237,0.3)":P.shadow }}>
                {f==="all"?"All":f==="income"?"💚 Income":"🔴 Expense"}
              </button>
            ))}
          </div>

          <div style={{ marginBottom:8,fontSize:11,color:P.muted,fontWeight:600 }}>← Swipe left to delete · tap ✏️ to edit</div>

          {filteredTx.length===0 && (
            <div style={{ textAlign:"center",color:P.muted,fontSize:13,padding:"40px 0" }}>
              <div style={{ fontSize:36,marginBottom:8 }}>📭</div>
              No transactions found
            </div>
          )}
          {filteredTx.map(t=>(
            <SwipeRow key={t.id} tx={t} onDelete={()=>deleteTx(t.id)} onEdit={openEdit}/>
          ))}

          {/* Add/Edit Modal */}
          {showAddTx && (
            <Modal title={editTx?"Edit Transaction":"Add Transaction"} onClose={()=>{setAddTx(false);setEditTx(null);setNTx(blankTx);}}>
              <Field label="Type">
                <div style={{ display:"flex",gap:8 }}>
                  {["expense","income"].map(t=>(
                    <button key={t} onClick={()=>setNTx(p=>({...p,type:t,category:(t==="expense"?expCats:incCats)[0]}))} style={{ flex:1,padding:10,borderRadius:11,border:`1.5px solid ${nTx.type===t?P.savings:P.border}`,background:nTx.type===t?P.savingsBg:P.soft,color:nTx.type===t?P.savings:P.muted,fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"capitalize" }}>
                      {t==="income"?"💚 Income":"🔴 Expense"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Category">
                <select value={nTx.category} onChange={e=>setNTx(p=>({...p,category:e.target.value}))} style={iStyle}>
                  {currentCats.map(c=><option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Amount ($)">
                <input type="number" placeholder="0.00" value={nTx.amount} onChange={e=>setNTx(p=>({...p,amount:e.target.value}))} style={iStyle}/>
              </Field>
              <Field label="Date">
                <input type="date" value={nTx.date} onChange={e=>setNTx(p=>({...p,date:e.target.value}))} style={iStyle}/>
              </Field>
              <Field label="Note">
                <input placeholder="e.g. Monthly grocery run" value={nTx.note} onChange={e=>setNTx(p=>({...p,note:e.target.value}))} style={iStyle}/>
              </Field>
              <div style={{ display:"flex",gap:10,marginTop:8 }}>
                <button onClick={()=>{setAddTx(false);setEditTx(null);setNTx(blankTx);}} style={{ flex:1,padding:13,border:`1.5px solid ${P.border}`,borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:700 }}>Cancel</button>
                <button onClick={saveTx} style={{ flex:2,padding:13,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700,boxShadow:"0 2px 8px rgba(124,58,237,0.3)" }}>
                  {editTx?"Save Changes":"Add Transaction"}
                </button>
              </div>
            </Modal>
          )}

          {/* Add Custom Category Modal */}
          {showNewCat && (
            <Modal title="Add Custom Category" onClose={()=>setShowNewCat(false)}>
              <Field label="Category Type">
                <div style={{ display:"flex",gap:8,marginBottom:4 }}>
                  {["expense","income"].map(t=>(
                    <button key={t} onClick={()=>setNewCatType(t)} style={{ flex:1,padding:10,borderRadius:11,border:`1.5px solid ${newCatType===t?P.savings:P.border}`,background:newCatType===t?P.savingsBg:P.soft,color:newCatType===t?P.savings:P.muted,fontWeight:700,fontSize:13,cursor:"pointer",textTransform:"capitalize" }}>
                      {t==="income"?"💚 Income":"🔴 Expense"}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Category Name">
                <input placeholder="e.g. Gym, Netflix, Zomato…" value={newCatName} onChange={e=>setNewCatName(e.target.value)} style={iStyle}/>
              </Field>
              <div style={{ display:"flex",gap:10,marginTop:8 }}>
                <button onClick={()=>setShowNewCat(false)} style={{ flex:1,padding:13,border:`1.5px solid ${P.border}`,borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:700 }}>Cancel</button>
                <button onClick={addCustomCat} style={{ flex:2,padding:13,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700 }}>Add Category</button>
              </div>
            </Modal>
          )}
        </>}

        {/* ════ BUDGETS ════ */}
        {tab==="budgets" && <>
          <h2 style={{ margin:"0 0 16px",fontSize:20,fontWeight:800,letterSpacing:"-0.5px" }}>Monthly Budgets</h2>
          <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:16 }}>
            {initBudgets.map(b=>{
              const spent=transactions.filter(t=>t.type==="expense"&&t.category===b.category).reduce((s,t)=>s+t.amount,0);
              const pct=Math.min(100,Math.round(spent/b.limit*100));
              const over=spent>b.limit;
              return (
                <Card key={b.id} style={{ border:over?`1.5px solid ${b.color}55`:undefined }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14,fontWeight:700 }}>{getCatEmoji(b.category)} {b.category}</div>
                      <div style={{ fontSize:11,color:P.muted,marginTop:2 }}>Limit {fmt(b.limit)}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:19,fontWeight:800,fontFamily:"'DM Mono',monospace",color:over?P.expense:P.text }}>{fmt(spent)}</div>
                      {over&&<Pill color="#fff" bg={P.expense}>Over Budget</Pill>}
                    </div>
                  </div>
                  <ProgressBar pct={pct} color={over?P.expense:b.color} h={8}/>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:6 }}>
                    <span style={{ fontSize:11,color:P.muted }}>{pct}% used</span>
                    <span style={{ fontSize:11,fontWeight:700,color:over?P.expense:P.income }}>{over?`-${fmt(spent-b.limit)} over`:`${fmt(b.limit-spent)} left`}</span>
                  </div>
                </Card>
              );
            })}
          </div>
          <Card style={{ padding:"18px 16px 10px" }}>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:12 }}>Budget vs Actual</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={initBudgets.map(b=>({name:b.category,Budget:b.limit,Spent:transactions.filter(t=>t.type==="expense"&&t.category===b.category).reduce((s,t)=>s+t.amount,0)}))} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:9,fill:P.muted }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10,fill:P.muted }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                <Tooltip formatter={v=>fmtd(v)} contentStyle={{ borderRadius:12,border:`1px solid ${P.border}`,fontSize:12 }}/>
                <Bar dataKey="Budget" fill="#ddd6fe" radius={[5,5,0,0]}/>
                <Bar dataKey="Spent"  fill="#fca5a5" radius={[5,5,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>}

        {/* ════ SAVINGS ════ */}
        {tab==="savings" && <>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <h2 style={{ margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.5px" }}>Savings Goals</h2>
            <button onClick={()=>setAddSav(true)} style={{ padding:"8px 14px",background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(124,58,237,0.3)" }}>+ Goal</button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            <KpiCard label="Total Saved"   value={fmt(savings.reduce((s,g)=>s+g.current,0))} color={P.savings} bg={P.savingsBg}/>
            <KpiCard label="Avg. Progress" value={savings.length?`${Math.round(savings.reduce((s,g)=>s+(g.current/g.target*100),0)/savings.length)}%`:"—"} color={P.income} bg={P.incomeBg}/>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {savings.map(g=>{
              const pct=Math.min(100,Math.round(g.current/g.target*100));
              return (
                <Card key={g.id}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                      <div style={{ width:12,height:12,borderRadius:4,background:g.color,boxShadow:`0 0 0 3px ${g.color}33` }}/>
                      <span style={{ fontSize:14,fontWeight:700 }}>{g.name}</span>
                    </div>
                    <span style={{ fontSize:12,fontFamily:"'DM Mono',monospace" }}>
                      <span style={{ color:g.color,fontWeight:800 }}>{fmt(g.current)}</span>
                      <span style={{ color:P.muted }}> / {fmt(g.target)}</span>
                    </span>
                  </div>
                  <ProgressBar pct={pct} color={g.color} h={9}/>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:6 }}>
                    <span style={{ fontSize:11,color:P.muted }}>{pct}% complete</span>
                    <span style={{ fontSize:11,color:P.muted }}>{fmt(g.target-g.current)} to go</span>
                  </div>
                </Card>
              );
            })}
          </div>
          {showAddSav && (
            <Modal title="New Savings Goal" onClose={()=>setAddSav(false)}>
              <Field label="Goal Name"><input placeholder="e.g. Emergency Fund" value={nSav.name} onChange={e=>setNSav(p=>({...p,name:e.target.value}))} style={iStyle}/></Field>
              <Field label="Target ($)"><input type="number" placeholder="0" value={nSav.target} onChange={e=>setNSav(p=>({...p,target:e.target.value}))} style={iStyle}/></Field>
              <Field label="Saved So Far ($)"><input type="number" placeholder="0" value={nSav.current} onChange={e=>setNSav(p=>({...p,current:e.target.value}))} style={iStyle}/></Field>
              <Field label="Color"><input type="color" value={nSav.color} onChange={e=>setNSav(p=>({...p,color:e.target.value}))} style={{ ...iStyle,padding:4,height:42,cursor:"pointer" }}/></Field>
              <div style={{ display:"flex",gap:10,marginTop:8 }}>
                <button onClick={()=>setAddSav(false)} style={{ flex:1,padding:13,border:`1.5px solid ${P.border}`,borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:700 }}>Cancel</button>
                <button onClick={saveSaving} style={{ flex:2,padding:13,background:"linear-gradient(135deg,#7c3aed,#a78bfa)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700 }}>Create</button>
              </div>
            </Modal>
          )}
        </>}

        {/* ════ INVESTMENTS ════ */}
        {tab==="investments" && <>
          <h2 style={{ margin:"0 0 16px",fontSize:20,fontWeight:800,letterSpacing:"-0.5px" }}>Investments</h2>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            <KpiCard label="Portfolio" value={fmt(totalInvested)}  color={P.invest}  bg={P.investBg}/>
            <KpiCard label="Est. Gain" value={fmt(initInvestments.reduce((s,i)=>s+(i.amount*i.gain/100),0))} color={P.income} bg={P.incomeBg}/>
          </div>
          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>Allocation</div>
            <div style={{ display:"flex",alignItems:"center",gap:16 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={initInvestments.map(i=>({name:i.ticker,value:i.amount}))} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="value" paddingAngle={4}>
                    {initInvestments.map(i=><Cell key={i.id} fill={i.color}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {initInvestments.map(i=>(
                  <div key={i.id} style={{ display:"flex",justifyContent:"space-between",marginBottom:8,alignItems:"center" }}>
                    <div style={{ display:"flex",alignItems:"center",gap:7 }}>
                      <div style={{ width:8,height:8,borderRadius:3,background:i.color }}/>
                      <span style={{ fontSize:12,fontWeight:500 }}>{i.ticker}</span>
                    </div>
                    <span style={{ fontSize:11,color:i.gain>=0?P.income:P.expense,fontWeight:800 }}>{i.gain>=0?"+":""}{i.gain}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            {initInvestments.map(inv=>(
              <Card key={inv.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:11 }}>
                  <div style={{ width:42,height:42,background:inv.color+"22",borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",border:`1.5px solid ${inv.color}33` }}>
                    <span style={{ fontSize:10,fontWeight:800,color:inv.color }}>{inv.ticker}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:700 }}>{inv.name}</div>
                    <div style={{ fontSize:11,color:P.muted }}>{inv.ticker}</div>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:15,fontWeight:800,fontFamily:"'DM Mono',monospace" }}>{fmt(inv.amount)}</div>
                  <div style={{ fontSize:12,fontWeight:700,color:inv.gain>=0?P.income:P.expense }}>{inv.gain>=0?"▲":"▼"} {Math.abs(inv.gain)}%</div>
                </div>
              </Card>
            ))}
          </div>
        </>}

        {/* ════ DEBT CLEAROFF ════ */}
        {tab==="debt" && <>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <h2 style={{ margin:0,fontSize:20,fontWeight:800,letterSpacing:"-0.5px" }}>Debt Clearoff</h2>
            <button onClick={()=>setAddDebt(true)} style={{ padding:"8px 14px",background:"linear-gradient(135deg,#ea580c,#fb923c)",color:"#fff",border:"none",borderRadius:11,fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:"0 2px 8px rgba(234,88,12,0.3)" }}>+ Debt</button>
          </div>

          {/* Strategy banner */}
          <div style={{ background:"linear-gradient(135deg,#fff7ed,#ffedd5)",border:`1.5px solid #fed7aa`,borderRadius:18,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12 }}>
            <div style={{ width:40,height:40,background:"linear-gradient(135deg,#ea580c,#fb923c)",borderRadius:13,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 8px rgba(234,88,12,0.3)" }}>
              <span style={{ fontSize:18 }}>⬆</span>
            </div>
            <div>
              <div style={{ fontSize:13,fontWeight:700,color:"#9a3412" }}>Avalanche Strategy Active</div>
              <div style={{ fontSize:11,color:"#c2410c",marginTop:1,lineHeight:1.4 }}>Highest interest rate first — saves the most money</div>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:14 }}>
            {[
              { label:"Total Debt",   value:fmt(totalDebt),                         color:P.debt,   bg:P.debtBg },
              { label:"Debt-Free",    value:`${debtFreeMo} mo`,                      color:P.savings,bg:P.savingsBg },
              { label:"Min/Month",    value:fmt(debts.reduce((s,d)=>s+d.minPay,0)), color:P.muted,  bg:P.card },
            ].map(k=>(
              <div key={k.label} style={{ background:k.bg,borderRadius:16,padding:"13px 12px",boxShadow:P.shadow }}>
                <div style={{ fontSize:10,color:P.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4 }}>{k.label}</div>
                <div style={{ fontSize:15,fontWeight:800,color:k.color,fontFamily:"'DM Mono',monospace" }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Slider */}
          <Card style={{ marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
              <span style={{ fontSize:13,fontWeight:700 }}>Extra Monthly Payment</span>
              <span style={{ fontSize:15,fontWeight:800,color:P.debt,fontFamily:"'DM Mono',monospace" }}>{fmt(extra)}</span>
            </div>
            <input type="range" min={0} max={2000} step={50} value={extra} onChange={e=>setExtra(Number(e.target.value))} style={{ width:"100%",accentColor:"#ea580c",cursor:"pointer" }}/>
            <div style={{ display:"flex",justifyContent:"space-between",marginTop:4 }}>
              <span style={{ fontSize:10,color:P.muted }}>$0</span>
              <span style={{ fontSize:10,color:P.muted }}>$2,000</span>
            </div>
            <div style={{ marginTop:12,padding:"10px 14px",background:P.debtBg,borderRadius:12,fontSize:12,color:P.debt,fontWeight:600,lineHeight:1.5,border:`1px solid #fed7aa` }}>
              💡 With <strong>{fmt(extra)}</strong> extra/mo → debt-free in <strong>{debtFreeMo} months</strong>
            </div>
          </Card>

          {/* Debt cards */}
          <div style={{ fontSize:11,color:P.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10 }}>Avalanche Payoff Order</div>
          <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:14 }}>
            {[...debts].sort((a,b)=>b.rate-a.rate).map((d,idx)=>{
              const paidOffSnap=schedule.findIndex(s=>(s.snapshot.find(x=>x.id===d.id)?.remaining||1)===0);
              const paidOffMonth=paidOffSnap>=0?paidOffSnap+1:debtFreeMo;
              const lastSnap=schedule.length?schedule[schedule.length-1].snapshot.find(x=>x.id===d.id):null;
              const pctPaid=lastSnap?Math.min(100,Math.round(((d.balance-(lastSnap.remaining||0))/d.balance)*100)):0;
              const isFocus=idx===0;
              return (
                <Card key={d.id} style={{ borderLeft:`4px solid ${d.color}`,paddingRight:44,position:"relative" }}>
                  <div style={{ position:"absolute",top:14,right:14,width:26,height:26,background:isFocus?"linear-gradient(135deg,#ea580c,#fb923c)":"#f3f0ff",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:isFocus?"0 2px 8px rgba(234,88,12,0.3)":undefined }}>
                    <span style={{ fontSize:11,fontWeight:800,color:isFocus?"#fff":P.muted }}>#{idx+1}</span>
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:4 }}>
                      <Pill color={d.color} bg={d.color+"18"}>{d.type}</Pill>
                      {isFocus&&<Pill color="#fff" bg="linear-gradient(135deg,#ea580c,#fb923c)">Focus Now</Pill>}
                    </div>
                    <div style={{ fontSize:15,fontWeight:800 }}>{d.name}</div>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12 }}>
                    {[{l:"Balance",v:fmt(d.balance)},{l:"APR",v:`${d.rate}%`},{l:"Min/mo",v:fmt(d.minPay)}].map(x=>(
                      <div key={x.l} style={{ background:P.soft,borderRadius:10,padding:"7px 9px" }}>
                        <div style={{ fontSize:9,color:P.muted,fontWeight:700,marginBottom:2 }}>{x.l}</div>
                        <div style={{ fontSize:12,fontWeight:800,fontFamily:"'DM Mono',monospace" }}>{x.v}</div>
                      </div>
                    ))}
                  </div>
                  <ProgressBar pct={pctPaid} color={d.color} h={7}/>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:6,alignItems:"center" }}>
                    <span style={{ fontSize:10,color:P.muted }}>Paid off ~month {paidOffMonth}</span>
                    <button onClick={()=>setDebts(p=>p.filter(x=>x.id!==d.id))} style={{ fontSize:10,color:P.expense,background:"none",border:"none",cursor:"pointer",padding:0,fontWeight:700 }}>✕ Remove</button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Chart */}
          {debtChart.length>1&&(
            <Card style={{ padding:"18px 16px 10px" }}>
              <div style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>Debt Reduction Trajectory</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={debtChart}>
                  <defs>
                    {debts.map(d=>(
                      <linearGradient key={d.id} id={`g${d.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={d.color} stopOpacity={0.2}/>
                        <stop offset="95%" stopColor={d.color} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={P.border} vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:9,fill:P.muted }} axisLine={false} tickLine={false} interval={Math.max(1,Math.floor(debtChart.length/5))}/>
                  <YAxis tick={{ fontSize:9,fill:P.muted }} axisLine={false} tickLine={false} tickFormatter={v=>`$${Math.round(v/1000)}k`}/>
                  <Tooltip formatter={v=>fmtd(v)} contentStyle={{ borderRadius:12,border:`1px solid ${P.border}`,fontSize:11 }}/>
                  {debts.map(d=><Area key={d.id} type="monotone" dataKey={d.name} stroke={d.color} strokeWidth={2} fill={`url(#g${d.id})`}/>)}
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display:"flex",gap:12,marginTop:8,flexWrap:"wrap" }}>
                {debts.map(d=>(
                  <div key={d.id} style={{ display:"flex",alignItems:"center",gap:5 }}>
                    <div style={{ width:8,height:8,borderRadius:3,background:d.color }}/>
                    <span style={{ fontSize:10,color:P.muted }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {showAddDebt && (
            <Modal title="Add Debt" onClose={()=>setAddDebt(false)}>
              <Field label="Type"><select value={nDebt.type} onChange={e=>setNDebt(p=>({...p,type:e.target.value}))} style={iStyle}>{["Credit Card","Personal Loan","Car Loan"].map(t=><option key={t}>{t}</option>)}</select></Field>
              <Field label="Name"><input placeholder="e.g. Visa Platinum" value={nDebt.name} onChange={e=>setNDebt(p=>({...p,name:e.target.value}))} style={iStyle}/></Field>
              <Field label="Current Balance ($)"><input type="number" placeholder="0" value={nDebt.balance} onChange={e=>setNDebt(p=>({...p,balance:e.target.value}))} style={iStyle}/></Field>
              <Field label="Annual Interest Rate (%)"><input type="number" placeholder="0.0" value={nDebt.rate} onChange={e=>setNDebt(p=>({...p,rate:e.target.value}))} style={iStyle}/></Field>
              <Field label="Min Monthly Payment ($)"><input type="number" placeholder="0" value={nDebt.minPay} onChange={e=>setNDebt(p=>({...p,minPay:e.target.value}))} style={iStyle}/></Field>
              <Field label="Color"><input type="color" value={nDebt.color} onChange={e=>setNDebt(p=>({...p,color:e.target.value}))} style={{ ...iStyle,padding:4,height:44,cursor:"pointer" }}/></Field>
              <div style={{ display:"flex",gap:10,marginTop:8 }}>
                <button onClick={()=>setAddDebt(false)} style={{ flex:1,padding:13,border:`1.5px solid ${P.border}`,borderRadius:12,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:700 }}>Cancel</button>
                <button onClick={saveDebt} style={{ flex:2,padding:13,background:"linear-gradient(135deg,#ea580c,#fb923c)",color:"#fff",border:"none",borderRadius:12,cursor:"pointer",fontSize:14,fontWeight:700 }}>Add Debt</button>
              </div>
            </Modal>
          )}
        </>}

      </div>

      {/* ── RESET MODAL ── */}
      {showReset && (
        <div style={{ position:"fixed",inset:0,background:"rgba(30,27,75,0.3)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:400,backdropFilter:"blur(4px)" }}>
          <div style={{ background:P.card,borderRadius:"24px 24px 0 0",padding:"8px 24px 36px",width:"100%",maxWidth:480,boxShadow:"0 -12px 48px rgba(124,58,237,0.2)" }}>
            <div style={{ width:36,height:4,background:P.border,borderRadius:99,margin:"12px auto 24px" }}/>
            <div style={{ width:56,height:56,background:"#fef2f2",borderRadius:18,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:26 }}>🗑️</div>
            <div style={{ textAlign:"center",marginBottom:24 }}>
              <div style={{ fontSize:18,fontWeight:800,marginBottom:8 }}>Clear All Data?</div>
              <div style={{ fontSize:13,color:P.muted,lineHeight:1.6 }}>This permanently deletes all transactions, savings goals, debts and custom categories. This cannot be undone.</div>
            </div>
            <button onClick={resetAll} style={{ width:"100%",padding:15,background:"linear-gradient(135deg,#dc2626,#f87171)",color:"#fff",border:"none",borderRadius:14,fontSize:15,fontWeight:800,cursor:"pointer",marginBottom:10,boxShadow:"0 4px 16px rgba(220,38,38,0.3)" }}>Yes, Delete Everything</button>
            <button onClick={()=>setShowReset(false)} style={{ width:"100%",padding:15,background:P.soft,color:P.text,border:"none",borderRadius:14,fontSize:15,fontWeight:700,cursor:"pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(255,255,255,0.92)",backdropFilter:"blur(12px)",borderTop:`1px solid ${P.border}`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom)" }}>
        {NAV.map(n=>{
          const active=tab===n.id;
          const isDebt=n.id==="debt";
          return (
            <button key={n.id} onClick={()=>setTab(n.id)} style={{ flex:1,padding:"10px 0 12px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
              <span style={{ fontSize:18,filter:active?undefined:"grayscale(0.5) opacity(0.5)" }}>{n.emoji}</span>
              <span style={{ fontSize:9,fontWeight:800,letterSpacing:"0.3px",textTransform:"uppercase",color:active?(isDebt?"#ea580c":P.savings):P.muted }}>{n.label}</span>
              {active&&<div style={{ width:18,height:3,borderRadius:99,background:isDebt?"#ea580c":"linear-gradient(90deg,#7c3aed,#a78bfa)",marginTop:1 }}/>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
