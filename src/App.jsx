import { useState, useMemo, useEffect } from "react";

/* ── LOCAL STORAGE HELPERS ──────────────────────────────────── */
function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";

/* ── DESIGN TOKENS ─────────────────────────────────────────── */
const C = {
  bg: "#f7f6f3",
  card: "#ffffff",
  border: "#ebe9e4",
  text: "#18181b",
  muted: "#8a8580",
  income: "#16a34a",
  expense: "#e11d48",
  savings: "#2563eb",
  invest: "#7c3aed",
  debt: "#c2410c",
  debtLight: "#fff7ed",
  accent: "#0ea5e9",
};

const iStyle = {
  width: "100%", padding: "10px 13px", border: `1.5px solid #ebe9e4`,
  borderRadius: 10, fontSize: 14, outline: "none", background: "#f7f6f3",
  boxSizing: "border-box", fontFamily: "inherit", color: "#18181b",
};

/* ── SAMPLE DATA ────────────────────────────────────────────── */
const initTransactions = [
  { id: 1, type: "income",  category: "Salary",        amount: 5200, date: "2026-03-01", note: "Monthly salary" },
  { id: 2, type: "expense", category: "Housing",        amount: 1400, date: "2026-03-02", note: "Rent" },
  { id: 3, type: "expense", category: "Food",           amount: 320,  date: "2026-03-05", note: "Groceries" },
  { id: 4, type: "expense", category: "Transport",      amount: 120,  date: "2026-03-07", note: "Monthly pass" },
  { id: 5, type: "income",  category: "Freelance",      amount: 800,  date: "2026-03-10", note: "Design project" },
  { id: 6, type: "expense", category: "Entertainment",  amount: 90,   date: "2026-03-12", note: "Streaming & dining" },
  { id: 7, type: "expense", category: "Utilities",      amount: 150,  date: "2026-03-15", note: "Electric & internet" },
  { id: 8, type: "expense", category: "Shopping",       amount: 230,  date: "2026-03-18", note: "Clothing" },
];

const initDebts = [
  { id: 1, type: "Credit Card",   name: "Visa Platinum",      balance: 4800,  rate: 22.9, minPay: 120, color: "#e11d48" },
  { id: 2, type: "Personal Loan", name: "Bank Personal Loan", balance: 12500, rate: 14.5, minPay: 280, color: "#ea580c" },
  { id: 3, type: "Car Loan",      name: "Toyota Finance",     balance: 18400, rate: 7.9,  minPay: 420, color: "#d97706" },
];

const initSavings = [
  { id: 1, name: "Emergency Fund", target: 10000, current: 6200, color: "#2563eb" },
  { id: 2, name: "Vacation",        target: 3000,  current: 1450, color: "#f59e0b" },
  { id: 3, name: "New Laptop",      target: 2000,  current: 900,  color: "#10b981" },
];

const initInvestments = [
  { id: 1, name: "S&P 500 ETF", ticker: "VOO", amount: 8400, gain:  12.4, color: "#7c3aed" },
  { id: 2, name: "Tech Fund",   ticker: "QQQ", amount: 3200, gain:  -2.1, color: "#db2777" },
  { id: 3, name: "Bonds",       ticker: "BND", amount: 2100, gain:   3.8, color: "#0891b2" },
];

const initBudgets = [
  { id: 1, category: "Housing",       limit: 1500, color: "#e11d48" },
  { id: 2, category: "Food",          limit: 400,  color: "#f97316" },
  { id: 3, category: "Transport",     limit: 200,  color: "#eab308" },
  { id: 4, category: "Entertainment", limit: 150,  color: "#8b5cf6" },
  { id: 5, category: "Shopping",      limit: 300,  color: "#06b6d4" },
  { id: 6, category: "Utilities",     limit: 200,  color: "#10b981" },
];

const CATS = {
  expense: ["Housing","Food","Transport","Health","Entertainment","Shopping","Utilities","Other"],
  income:  ["Salary","Freelance","Business","Rental","Other"],
};
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PIE_COLORS = ["#e11d48","#f97316","#eab308","#16a34a","#06b6d4","#2563eb","#7c3aed","#db2777"];

const fmt  = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n);
const fmtd = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2}).format(n);

/* ── AVALANCHE CALCULATOR ───────────────────────────────────── */
function calcAvalanche(debts, extraMonthly) {
  if (!debts.length) return [];
  let balances = debts.map(d => ({ ...d, remaining: d.balance }));
  const sorted = [...balances].sort((a, b) => b.rate - a.rate);
  const schedule = [];
  let month = 0;
  const MAX = 360;
  while (balances.some(d => d.remaining > 0) && month < MAX) {
    month++;
    let extra = extraMonthly;
    const entry = { month, debts: {} };
    for (const d of balances) {
      if (d.remaining <= 0) continue;
      const interest = +(d.remaining * d.rate / 100 / 12).toFixed(2);
      const pay = Math.min(d.minPay, d.remaining + interest);
      d.remaining = Math.max(0, d.remaining + interest - pay);
      entry.debts[d.id] = { paid: pay, remaining: d.remaining, interest };
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
    schedule.push({ ...entry, snapshot: balances.map(b => ({ id: b.id, remaining: b.remaining })) });
    if (balances.every(d => d.remaining <= 0)) break;
  }
  return schedule;
}

/* ── COMPONENTS ─────────────────────────────────────────────── */
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.35)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:200,backdropFilter:"blur(2px)" }}>
      <div style={{ background:"#fff",borderRadius:"20px 20px 0 0",padding:24,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 -8px 40px rgba(0,0,0,0.18)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <span style={{ fontSize:16,fontWeight:700 }}>{title}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#8a8580",padding:0 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ProgressBar({ pct, color, h = 7 }) {
  return (
    <div style={{ height:h,background:"#ebe9e4",borderRadius:99,overflow:"hidden" }}>
      <div style={{ width:`${Math.min(100,pct)}%`,height:"100%",background:color,borderRadius:99,transition:"width .5s" }} />
    </div>
  );
}

function Card({ children, style = {} }) {
  return <div style={{ background:"#fff",border:"1px solid #ebe9e4",borderRadius:16,padding:"18px 18px",...style }}>{children}</div>;
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:11,fontWeight:700,color:"#8a8580",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.5px" }}>{label}</div>
      {children}
    </div>
  );
}

/* ── NAV ────────────────────────────────────────────────────── */
const NAV = [
  { id:"overview",     icon:"◎", label:"Overview" },
  { id:"transactions", icon:"↕", label:"Txns" },
  { id:"budgets",      icon:"◧", label:"Budgets" },
  { id:"savings",      icon:"◈", label:"Savings" },
  { id:"investments",  icon:"◆", label:"Invest" },
  { id:"debt",         icon:"⬡", label:"Debt" },
];

/* ═══════════════════════════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [tab, setTab]             = useState("overview");
  const [transactions, setTx]     = useState(() => load("finio_transactions", initTransactions));
  const [savings, setSavings]     = useState(() => load("finio_savings", initSavings));
  const [debts, setDebts]         = useState(() => load("finio_debts", initDebts));
  const [extra, setExtra]         = useState(() => load("finio_extra", 300));

  // Auto-save to localStorage whenever data changes
  useEffect(() => save("finio_transactions", transactions), [transactions]);
  useEffect(() => save("finio_savings", savings), [savings]);
  useEffect(() => save("finio_debts", debts), [debts]);
  useEffect(() => save("finio_extra", extra), [extra]);
  const [search, setSearch]       = useState("");
  const [txFilter, setTxFilter]   = useState("all");
  const [showAddTx, setAddTx]     = useState(false);
  const [showAddDebt, setAddDebt] = useState(false);
  const [showAddSav, setAddSav]   = useState(false);

  const [nTx,  setNTx]  = useState({ type:"expense",category:"Food",amount:"",date:new Date().toISOString().split("T")[0],note:"" });
  const [nDebt,setNDebt]= useState({ type:"Credit Card",name:"",balance:"",rate:"",minPay:"",color:"#e11d48" });
  const [nSav, setNSav] = useState({ name:"",target:"",current:"",color:"#2563eb" });

  /* derived */
  const totalIncome   = useMemo(()=>transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),[transactions]);
  const totalExpenses = useMemo(()=>transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0),[transactions]);
  const balance       = totalIncome - totalExpenses;
  const totalDebt     = debts.reduce((s,d)=>s+d.balance,0);
  const totalInvested = initInvestments.reduce((s,i)=>s+i.amount,0);

  const schedule     = useMemo(()=>calcAvalanche(debts,extra),[debts,extra]);
  const debtFreeMo   = schedule.length;

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
      .filter(t=>!search||t.note.toLowerCase().includes(search.toLowerCase())||t.category.toLowerCase().includes(search.toLowerCase()))
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

  const saveTx = () => {
    if(!nTx.amount||isNaN(nTx.amount)) return;
    setTx(p=>[...p,{...nTx,id:Date.now(),amount:parseFloat(nTx.amount)}]);
    setNTx({type:"expense",category:"Food",amount:"",date:new Date().toISOString().split("T")[0],note:""});
    setAddTx(false);
  };
  const saveDebt = () => {
    if(!nDebt.name||!nDebt.balance||!nDebt.rate) return;
    setDebts(p=>[...p,{...nDebt,id:Date.now(),balance:parseFloat(nDebt.balance),rate:parseFloat(nDebt.rate),minPay:parseFloat(nDebt.minPay||0)}]);
    setNDebt({type:"Credit Card",name:"",balance:"",rate:"",minPay:"",color:"#e11d48"});
    setAddDebt(false);
  };
  const saveSaving = () => {
    if(!nSav.name||!nSav.target) return;
    setSavings(p=>[...p,{...nSav,id:Date.now(),target:parseFloat(nSav.target),current:parseFloat(nSav.current||0)}]);
    setNSav({name:"",target:"",current:"",color:"#2563eb"});
    setAddSav(false);
  };

  return (
    <div style={{ fontFamily:"'DM Sans','Nunito',system-ui,sans-serif",background:"#f7f6f3",minHeight:"100vh",maxWidth:480,margin:"0 auto",paddingBottom:76,color:"#18181b" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"/>

      {/* TOP BAR */}
      <div style={{ background:"#fff",borderBottom:"1px solid #ebe9e4",padding:"14px 20px",position:"sticky",top:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:9 }}>
          <div style={{ width:30,height:30,background:"#18181b",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:"#fff",fontWeight:700,fontSize:15 }}>$</span>
          </div>
          <span style={{ fontWeight:700,fontSize:17,letterSpacing:"-0.4px" }}>Finio</span>
        </div>
        <span style={{ fontSize:12,color:"#8a8580" }}>{new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"})}</span>
      </div>

      <div style={{ padding:"20px 16px" }}>

        {/* ════════════ OVERVIEW ════════════ */}
        {tab==="overview" && <>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            {[
              {label:"Balance",   value:fmt(balance),       color:balance>=0?"#16a34a":"#e11d48"},
              {label:"Income",    value:fmt(totalIncome),   color:"#16a34a"},
              {label:"Expenses",  value:fmt(totalExpenses), color:"#e11d48"},
              {label:"Total Debt",value:fmt(totalDebt),     color:"#c2410c"},
            ].map(k=>(
              <Card key={k.label}>
                <div style={{ fontSize:11,color:"#8a8580",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:5 }}>{k.label}</div>
                <div style={{ fontSize:22,fontWeight:700,color:k.color,letterSpacing:"-0.5px",fontFamily:"'DM Mono',monospace" }}>{k.value}</div>
              </Card>
            ))}
          </div>

          <Card style={{ marginBottom:14,padding:"18px 16px 10px" }}>
            <div style={{ fontSize:13,fontWeight:600,marginBottom:14 }}>Income vs Expenses</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={monthlyData} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebe9e4" vertical={false}/>
                <XAxis dataKey="month" tick={{ fontSize:10,fill:"#8a8580" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10,fill:"#8a8580" }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v/1000}k`}/>
                <Tooltip formatter={v=>fmtd(v)} contentStyle={{ borderRadius:9,border:"1px solid #ebe9e4",fontSize:12 }}/>
                <Bar dataKey="income"   fill="#16a34a" radius={[4,4,0,0]}/>
                <Bar dataKey="expenses" fill="#e11d48" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:13,fontWeight:600,marginBottom:14 }}>Spending Breakdown</div>
            <div style={{ display:"flex",alignItems:"center",gap:14 }}>
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={expByCat} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                    {expByCat.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {expByCat.map((c,i)=>(
                  <div key={c.name} style={{ display:"flex",justifyContent:"space-between",marginBottom:5 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <div style={{ width:7,height:7,borderRadius:2,background:PIE_COLORS[i%PIE_COLORS.length] }}/>
                      <span style={{ fontSize:11,color:"#8a8580" }}>{c.name}</span>
                    </div>
                    <span style={{ fontSize:11,fontWeight:600,fontFamily:"'DM Mono',monospace" }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <div style={{ fontSize:13,fontWeight:600,marginBottom:12 }}>Savings Goals</div>
            {savings.map(g=>{
              const pct=Math.min(100,Math.round(g.current/g.target*100));
              return (
                <div key={g.id} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}>
                    <span style={{ fontSize:12,fontWeight:500 }}>{g.name}</span>
                    <span style={{ fontSize:11,color:"#8a8580",fontFamily:"'DM Mono',monospace" }}>{fmt(g.current)}/{fmt(g.target)}</span>
                  </div>
                  <ProgressBar pct={pct} color={g.color}/>
                  <div style={{ fontSize:10,color:"#8a8580",marginTop:2 }}>{pct}%</div>
                </div>
              );
            })}
          </Card>
        </>}

        {/* ════════════ TRANSACTIONS ════════════ */}
        {tab==="transactions" && <>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <h2 style={{ margin:0,fontSize:18,fontWeight:700,letterSpacing:"-0.4px" }}>Transactions</h2>
            <button onClick={()=>setAddTx(true)} style={{ padding:"8px 15px",background:"#18181b",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer" }}>+ Add</button>
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search…" style={{ ...iStyle,marginBottom:10 }}/>
          <div style={{ display:"flex",gap:8,marginBottom:14 }}>
            {["all","income","expense"].map(f=>(
              <button key={f} onClick={()=>setTxFilter(f)} style={{ flex:1,padding:"8px",borderRadius:9,border:`1.5px solid ${txFilter===f?"#18181b":"#ebe9e4"}`,background:txFilter===f?"#18181b":"#fff",color:txFilter===f?"#fff":"#8a8580",fontSize:12,cursor:"pointer",fontWeight:600,textTransform:"capitalize" }}>{f}</button>
            ))}
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
            {filteredTx.length===0 && <div style={{ textAlign:"center",color:"#8a8580",fontSize:13,padding:32 }}>No transactions found</div>}
            {filteredTx.map(t=>(
              <Card key={t.id} style={{ padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:13,fontWeight:600 }}>{t.note||"—"}</div>
                  <div style={{ fontSize:11,color:"#8a8580",marginTop:2 }}>{t.category} · {t.date}</div>
                </div>
                <span style={{ fontSize:14,fontWeight:700,fontFamily:"'DM Mono',monospace",color:t.type==="income"?"#16a34a":"#e11d48" }}>
                  {t.type==="income"?"+":"-"}{fmt(t.amount)}
                </span>
              </Card>
            ))}
          </div>
          {showAddTx&&(
            <Modal title="Add Transaction" onClose={()=>setAddTx(false)}>
              <Field label="Type"><select value={nTx.type} onChange={e=>setNTx(p=>({...p,type:e.target.value,category:CATS[e.target.value][0]}))} style={iStyle}>{["income","expense"].map(t=><option key={t}>{t}</option>)}</select></Field>
              <Field label="Category"><select value={nTx.category} onChange={e=>setNTx(p=>({...p,category:e.target.value}))} style={iStyle}>{CATS[nTx.type].map(c=><option key={c}>{c}</option>)}</select></Field>
              <Field label="Amount ($)"><input type="number" placeholder="0.00" value={nTx.amount} onChange={e=>setNTx(p=>({...p,amount:e.target.value}))} style={iStyle}/></Field>
              <Field label="Date"><input type="date" value={nTx.date} onChange={e=>setNTx(p=>({...p,date:e.target.value}))} style={iStyle}/></Field>
              <Field label="Note"><input placeholder="Optional" value={nTx.note} onChange={e=>setNTx(p=>({...p,note:e.target.value}))} style={iStyle}/></Field>
              <div style={{ display:"flex",gap:10,marginTop:6 }}>
                <button onClick={()=>setAddTx(false)} style={{ flex:1,padding:12,border:"1.5px solid #ebe9e4",borderRadius:10,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:600 }}>Cancel</button>
                <button onClick={saveTx} style={{ flex:1,padding:12,background:"#18181b",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:600 }}>Add</button>
              </div>
            </Modal>
          )}
        </>}

        {/* ════════════ BUDGETS ════════════ */}
        {tab==="budgets" && <>
          <h2 style={{ margin:"0 0 16px",fontSize:18,fontWeight:700,letterSpacing:"-0.4px" }}>Monthly Budgets</h2>
          <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:16 }}>
            {initBudgets.map(b=>{
              const spent=transactions.filter(t=>t.type==="expense"&&t.category===b.category).reduce((s,t)=>s+t.amount,0);
              const pct=Math.min(100,Math.round(spent/b.limit*100));
              const over=spent>b.limit;
              return (
                <Card key={b.id} style={{ border:over?`1.5px solid ${b.color}66`:undefined }}>
                  <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:14,fontWeight:600 }}>{b.category}</div>
                      <div style={{ fontSize:11,color:"#8a8580" }}>Limit {fmt(b.limit)}</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:18,fontWeight:700,fontFamily:"'DM Mono',monospace",color:over?"#e11d48":"#18181b" }}>{fmt(spent)}</div>
                      {over&&<div style={{ fontSize:10,color:"#e11d48",fontWeight:700 }}>OVER BUDGET</div>}
                    </div>
                  </div>
                  <ProgressBar pct={pct} color={over?"#e11d48":b.color}/>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:5 }}>
                    <span style={{ fontSize:11,color:"#8a8580" }}>{pct}% used</span>
                    <span style={{ fontSize:11,color:over?"#e11d48":"#16a34a",fontWeight:600 }}>{over?`-${fmt(spent-b.limit)} over`:`${fmt(b.limit-spent)} left`}</span>
                  </div>
                </Card>
              );
            })}
          </div>
          <Card style={{ padding:"18px 16px 10px" }}>
            <div style={{ fontSize:13,fontWeight:600,marginBottom:12 }}>Budget vs Actual</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={initBudgets.map(b=>({name:b.category,Budget:b.limit,Spent:transactions.filter(t=>t.type==="expense"&&t.category===b.category).reduce((s,t)=>s+t.amount,0)}))} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ebe9e4" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize:9,fill:"#8a8580" }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize:10,fill:"#8a8580" }} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}`}/>
                <Tooltip formatter={v=>fmtd(v)} contentStyle={{ borderRadius:9,border:"1px solid #ebe9e4",fontSize:12 }}/>
                <Bar dataKey="Budget" fill="#ebe9e4" radius={[4,4,0,0]}/>
                <Bar dataKey="Spent"  fill="#e11d48" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>}

        {/* ════════════ SAVINGS ════════════ */}
        {tab==="savings" && <>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <h2 style={{ margin:0,fontSize:18,fontWeight:700,letterSpacing:"-0.4px" }}>Savings Goals</h2>
            <button onClick={()=>setAddSav(true)} style={{ padding:"8px 15px",background:"#18181b",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer" }}>+ Goal</button>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            {[
              {label:"Total Saved",   value:fmt(savings.reduce((s,g)=>s+g.current,0)),color:"#2563eb"},
              {label:"Avg. Progress", value:`${Math.round(savings.reduce((s,g)=>s+(g.current/g.target*100),0)/savings.length)}%`,color:"#16a34a"},
            ].map(k=>(
              <Card key={k.label}>
                <div style={{ fontSize:11,color:"#8a8580",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4 }}>{k.label}</div>
                <div style={{ fontSize:22,fontWeight:700,color:k.color,fontFamily:"'DM Mono',monospace" }}>{k.value}</div>
              </Card>
            ))}
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            {savings.map(g=>{
              const pct=Math.min(100,Math.round(g.current/g.target*100));
              return (
                <Card key={g.id}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                      <div style={{ width:10,height:10,borderRadius:3,background:g.color }}/>
                      <span style={{ fontSize:14,fontWeight:600 }}>{g.name}</span>
                    </div>
                    <span style={{ fontSize:12,fontFamily:"'DM Mono',monospace" }}>
                      <span style={{ color:g.color,fontWeight:700 }}>{fmt(g.current)}</span>
                      <span style={{ color:"#8a8580" }}> / {fmt(g.target)}</span>
                    </span>
                  </div>
                  <ProgressBar pct={pct} color={g.color} h={8}/>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:5 }}>
                    <span style={{ fontSize:11,color:"#8a8580" }}>{pct}% complete</span>
                    <span style={{ fontSize:11,color:"#8a8580" }}>{fmt(g.target-g.current)} to go</span>
                  </div>
                </Card>
              );
            })}
          </div>
          {showAddSav&&(
            <Modal title="New Savings Goal" onClose={()=>setAddSav(false)}>
              <Field label="Goal Name"><input placeholder="e.g. Emergency Fund" value={nSav.name} onChange={e=>setNSav(p=>({...p,name:e.target.value}))} style={iStyle}/></Field>
              <Field label="Target ($)"><input type="number" placeholder="0" value={nSav.target} onChange={e=>setNSav(p=>({...p,target:e.target.value}))} style={iStyle}/></Field>
              <Field label="Saved So Far ($)"><input type="number" placeholder="0" value={nSav.current} onChange={e=>setNSav(p=>({...p,current:e.target.value}))} style={iStyle}/></Field>
              <Field label="Color"><input type="color" value={nSav.color} onChange={e=>setNSav(p=>({...p,color:e.target.value}))} style={{ ...iStyle,padding:4,height:40,cursor:"pointer" }}/></Field>
              <div style={{ display:"flex",gap:10,marginTop:6 }}>
                <button onClick={()=>setAddSav(false)} style={{ flex:1,padding:12,border:"1.5px solid #ebe9e4",borderRadius:10,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:600 }}>Cancel</button>
                <button onClick={saveSaving} style={{ flex:1,padding:12,background:"#18181b",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:600 }}>Create</button>
              </div>
            </Modal>
          )}
        </>}

        {/* ════════════ INVESTMENTS ════════════ */}
        {tab==="investments" && <>
          <h2 style={{ margin:"0 0 16px",fontSize:18,fontWeight:700,letterSpacing:"-0.4px" }}>Investments</h2>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14 }}>
            {[
              {label:"Portfolio", value:fmt(totalInvested), color:"#7c3aed"},
              {label:"Est. Gain", value:fmt(initInvestments.reduce((s,i)=>s+(i.amount*i.gain/100),0)), color:"#16a34a"},
            ].map(k=>(
              <Card key={k.label}>
                <div style={{ fontSize:11,color:"#8a8580",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4 }}>{k.label}</div>
                <div style={{ fontSize:22,fontWeight:700,color:k.color,fontFamily:"'DM Mono',monospace" }}>{k.value}</div>
              </Card>
            ))}
          </div>
          <Card style={{ marginBottom:14 }}>
            <div style={{ fontSize:13,fontWeight:600,marginBottom:14 }}>Allocation</div>
            <div style={{ display:"flex",alignItems:"center",gap:16 }}>
              <ResponsiveContainer width={110} height={110}>
                <PieChart>
                  <Pie data={initInvestments.map(i=>({name:i.ticker,value:i.amount}))} cx="50%" cy="50%" innerRadius={28} outerRadius={50} dataKey="value" paddingAngle={4}>
                    {initInvestments.map(i=><Cell key={i.id} fill={i.color}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex:1 }}>
                {initInvestments.map(i=>(
                  <div key={i.id} style={{ display:"flex",justifyContent:"space-between",marginBottom:7 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                      <div style={{ width:7,height:7,borderRadius:2,background:i.color }}/>
                      <span style={{ fontSize:12 }}>{i.ticker}</span>
                    </div>
                    <span style={{ fontSize:11,color:i.gain>=0?"#16a34a":"#e11d48",fontWeight:700 }}>{i.gain>=0?"+":""}{i.gain}%</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
            {initInvestments.map(inv=>(
              <Card key={inv.id} style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 16px" }}>
                <div style={{ display:"flex",alignItems:"center",gap:11 }}>
                  <div style={{ width:38,height:38,background:inv.color+"22",borderRadius:11,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ fontSize:9,fontWeight:800,color:inv.color }}>{inv.ticker}</span>
                  </div>
                  <div>
                    <div style={{ fontSize:13,fontWeight:600 }}>{inv.name}</div>
                    <div style={{ fontSize:11,color:"#8a8580" }}>{inv.ticker}</div>
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:15,fontWeight:700,fontFamily:"'DM Mono',monospace" }}>{fmt(inv.amount)}</div>
                  <div style={{ fontSize:11,fontWeight:700,color:inv.gain>=0?"#16a34a":"#e11d48" }}>{inv.gain>=0?"▲":"▼"} {Math.abs(inv.gain)}%</div>
                </div>
              </Card>
            ))}
          </div>
        </>}

        {/* ════════════ DEBT CLEAROFF ════════════ */}
        {tab==="debt" && <>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
            <h2 style={{ margin:0,fontSize:18,fontWeight:700,letterSpacing:"-0.4px" }}>Debt Clearoff</h2>
            <button onClick={()=>setAddDebt(true)} style={{ padding:"8px 15px",background:"#c2410c",color:"#fff",border:"none",borderRadius:10,fontSize:13,fontWeight:600,cursor:"pointer" }}>+ Debt</button>
          </div>

          {/* Avalanche badge */}
          <div style={{ background:"#fff7ed",border:"1.5px solid #fed7aa",borderRadius:14,padding:"12px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:11 }}>
            <div style={{ width:34,height:34,background:"#c2410c",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0 }}>
              <span style={{ color:"#fff",fontSize:16 }}>⬆</span>
            </div>
            <div>
              <div style={{ fontSize:12,fontWeight:700,color:"#c2410c" }}>Avalanche Strategy Active</div>
              <div style={{ fontSize:11,color:"#9a3412",marginTop:1 }}>Tackle highest interest rate first — minimizes total interest paid</div>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:14 }}>
            {[
              {label:"Total Debt",   value:fmt(totalDebt),                              color:"#c2410c"},
              {label:"Debt-Free In", value:`${debtFreeMo} mo`,                          color:"#2563eb"},
              {label:"Min/Month",    value:fmt(debts.reduce((s,d)=>s+d.minPay,0)),      color:"#8a8580"},
            ].map(k=>(
              <Card key={k.label} style={{ padding:"13px 12px" }}>
                <div style={{ fontSize:10,color:"#8a8580",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px",marginBottom:4 }}>{k.label}</div>
                <div style={{ fontSize:16,fontWeight:700,color:k.color,fontFamily:"'DM Mono',monospace",letterSpacing:"-0.3px" }}>{k.value}</div>
              </Card>
            ))}
          </div>

          {/* Extra slider */}
          <Card style={{ marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
              <span style={{ fontSize:13,fontWeight:600 }}>Extra Monthly Payment</span>
              <span style={{ fontSize:14,fontWeight:700,color:"#c2410c",fontFamily:"'DM Mono',monospace" }}>{fmt(extra)}</span>
            </div>
            <input type="range" min={0} max={2000} step={50} value={extra} onChange={e=>setExtra(Number(e.target.value))} style={{ width:"100%",accentColor:"#c2410c",cursor:"pointer" }}/>
            <div style={{ display:"flex",justifyContent:"space-between",marginTop:4 }}>
              <span style={{ fontSize:10,color:"#8a8580" }}>$0</span>
              <span style={{ fontSize:10,color:"#8a8580" }}>$2,000</span>
            </div>
            <div style={{ marginTop:10,padding:"9px 13px",background:"#fff7ed",borderRadius:10,fontSize:12,color:"#c2410c",fontWeight:500,lineHeight:1.4 }}>
              💡 With <strong>{fmt(extra)}</strong> extra/mo → debt-free in <strong>{debtFreeMo} months</strong>. Total min payments: <strong>{fmt(debts.reduce((s,d)=>s+d.minPay,0))}/mo</strong>
            </div>
          </Card>

          {/* Payoff order */}
          <div style={{ fontSize:11,color:"#8a8580",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:10 }}>Avalanche Payoff Order</div>
          <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:14 }}>
            {[...debts].sort((a,b)=>b.rate-a.rate).map((d,idx)=>{
              const paidOffSnap = schedule.findIndex(s=>( s.snapshot.find(x=>x.id===d.id)?.remaining||1)===0);
              const paidOffMonth = paidOffSnap>=0 ? paidOffSnap+1 : debtFreeMo;
              const lastSnap = schedule.length ? schedule[schedule.length-1].snapshot.find(x=>x.id===d.id) : null;
              const pctPaid = lastSnap ? Math.min(100,Math.round(((d.balance-(lastSnap.remaining||0))/d.balance)*100)) : 0;
              const isFocus = idx===0;
              return (
                <Card key={d.id} style={{ borderLeft:`4px solid ${d.color}`,position:"relative",paddingRight:42 }}>
                  <div style={{ position:"absolute",top:12,right:14,width:24,height:24,background:isFocus?"#c2410c":"#f0efec",borderRadius:99,display:"flex",alignItems:"center",justifyContent:"center" }}>
                    <span style={{ fontSize:11,fontWeight:800,color:isFocus?"#fff":"#8a8580" }}>#{idx+1}</span>
                  </div>

                  <div style={{ marginBottom:8 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3 }}>
                      <span style={{ fontSize:9,fontWeight:700,color:d.color,background:d.color+"18",padding:"2px 8px",borderRadius:99,textTransform:"uppercase",letterSpacing:"0.4px" }}>{d.type}</span>
                      {isFocus&&<span style={{ fontSize:9,fontWeight:700,color:"#fff",background:"#c2410c",padding:"2px 8px",borderRadius:99 }}>FOCUS NOW</span>}
                    </div>
                    <div style={{ fontSize:15,fontWeight:700 }}>{d.name}</div>
                  </div>

                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10 }}>
                    {[
                      {l:"Balance",  v:fmt(d.balance)},
                      {l:"APR",      v:`${d.rate}%`},
                      {l:"Min/mo",   v:fmt(d.minPay)},
                    ].map(x=>(
                      <div key={x.l}>
                        <div style={{ fontSize:10,color:"#8a8580",fontWeight:600 }}>{x.l}</div>
                        <div style={{ fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace" }}>{x.v}</div>
                      </div>
                    ))}
                  </div>

                  <ProgressBar pct={pctPaid} color={d.color} h={6}/>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:5,alignItems:"center" }}>
                    <span style={{ fontSize:10,color:"#8a8580" }}>Paid off ~month {paidOffMonth}</span>
                    <button onClick={()=>setDebts(p=>p.filter(x=>x.id!==d.id))} style={{ fontSize:10,color:"#8a8580",background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline" }}>Remove</button>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Debt trajectory chart */}
          {debtChart.length>1&&(
            <Card style={{ padding:"18px 16px 10px" }}>
              <div style={{ fontSize:13,fontWeight:600,marginBottom:14 }}>Debt Reduction Trajectory</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={debtChart}>
                  <defs>
                    {debts.map(d=>(
                      <linearGradient key={d.id} id={`g${d.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={d.color} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={d.color} stopOpacity={0}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ebe9e4" vertical={false}/>
                  <XAxis dataKey="month" tick={{ fontSize:9,fill:"#8a8580" }} axisLine={false} tickLine={false} interval={Math.max(1,Math.floor(debtChart.length/5))}/>
                  <YAxis tick={{ fontSize:9,fill:"#8a8580" }} axisLine={false} tickLine={false} tickFormatter={v=>`$${Math.round(v/1000)}k`}/>
                  <Tooltip formatter={v=>fmtd(v)} contentStyle={{ borderRadius:9,border:"1px solid #ebe9e4",fontSize:11 }}/>
                  {debts.map(d=>(
                    <Area key={d.id} type="monotone" dataKey={d.name} stroke={d.color} strokeWidth={2} fill={`url(#g${d.id})`}/>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
              <div style={{ display:"flex",gap:12,marginTop:8,flexWrap:"wrap" }}>
                {debts.map(d=>(
                  <div key={d.id} style={{ display:"flex",alignItems:"center",gap:5 }}>
                    <div style={{ width:8,height:8,borderRadius:2,background:d.color }}/>
                    <span style={{ fontSize:10,color:"#8a8580" }}>{d.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {showAddDebt&&(
            <Modal title="Add Debt" onClose={()=>setAddDebt(false)}>
              <Field label="Type"><select value={nDebt.type} onChange={e=>setNDebt(p=>({...p,type:e.target.value}))} style={iStyle}>{["Credit Card","Personal Loan","Car Loan"].map(t=><option key={t}>{t}</option>)}</select></Field>
              <Field label="Name"><input placeholder="e.g. Visa Platinum" value={nDebt.name} onChange={e=>setNDebt(p=>({...p,name:e.target.value}))} style={iStyle}/></Field>
              <Field label="Current Balance ($)"><input type="number" placeholder="0" value={nDebt.balance} onChange={e=>setNDebt(p=>({...p,balance:e.target.value}))} style={iStyle}/></Field>
              <Field label="Annual Interest Rate (%)"><input type="number" placeholder="0.0" value={nDebt.rate} onChange={e=>setNDebt(p=>({...p,rate:e.target.value}))} style={iStyle}/></Field>
              <Field label="Min Monthly Payment ($)"><input type="number" placeholder="0" value={nDebt.minPay} onChange={e=>setNDebt(p=>({...p,minPay:e.target.value}))} style={iStyle}/></Field>
              <Field label="Color"><input type="color" value={nDebt.color} onChange={e=>setNDebt(p=>({...p,color:e.target.value}))} style={{ ...iStyle,padding:4,height:40,cursor:"pointer" }}/></Field>
              <div style={{ display:"flex",gap:10,marginTop:6 }}>
                <button onClick={()=>setAddDebt(false)} style={{ flex:1,padding:12,border:"1.5px solid #ebe9e4",borderRadius:10,background:"transparent",cursor:"pointer",fontSize:14,fontWeight:600 }}>Cancel</button>
                <button onClick={saveDebt} style={{ flex:1,padding:12,background:"#c2410c",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontSize:14,fontWeight:600 }}>Add Debt</button>
              </div>
            </Modal>
          )}
        </>}

      </div>

      {/* BOTTOM NAV */}
      <div style={{ position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"#fff",borderTop:"1px solid #ebe9e4",display:"flex",zIndex:100 }}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setTab(n.id)} style={{ flex:1,padding:"10px 0 13px",background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3 }}>
            <span style={{ fontSize:16,color:tab===n.id?(n.id==="debt"?"#c2410c":"#18181b"):"#8a8580" }}>{n.icon}</span>
            <span style={{ fontSize:9,fontWeight:700,letterSpacing:"0.4px",textTransform:"uppercase",color:tab===n.id?(n.id==="debt"?"#c2410c":"#18181b"):"#8a8580" }}>{n.label}</span>
            {tab===n.id&&<div style={{ width:16,height:2.5,borderRadius:99,background:n.id==="debt"?"#c2410c":"#18181b" }}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
