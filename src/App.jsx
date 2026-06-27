import { useState, useEffect, useRef } from "react";

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const C = {
  navy:"#0A1628", blue:"#1240B8", red:"#C0392B", green:"#0A7A3D",
  amber:"#B7600A", white:"#FFFFFF", bg:"#F2F5FA", card:"#FFFFFF",
  border:"#DDE3EE", textPri:"#0D1B2A", textSec:"#455068", textMut:"#8A96AB",
  gold:"#B8860B", slate:"#2C3E50",
};
const scoreColor = s => s>=80?C.green:s>=60?C.amber:s>=40?"#E67E22":C.red;
const scoreLabel = (s, lang) => {
  if (lang === "en") return s>=80?"Excellent ✨":s>=60?"Good 👍":s>=40?"Needs Improvement ⚠️":"Critical 🚨";
  return s>=80?"Cemerlang ✨":s>=60?"Baik 👍":s>=40?"Perlu Diperbaiki ⚠️":"Kritikal 🚨";
};

// ─── IN-MEMORY KEY STORAGE ─────────────────────────────────────────────────────
let _memKeys = {};
function loadKeys() { return { ..._memKeys }; }
function saveKeys(keys) { _memKeys = { ...keys }; }

// ─── JSON REPAIR ──────────────────────────────────────────────────────────────
function fixSingleQuotes(s) {
  if (!s.includes("'")) return s;
  const looksLikeSQ = /^\s*\{?\s*'/.test(s) || s.includes("': '") || s.includes("': {");
  if (!looksLikeSQ) return s;
  let result = "", i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "'" && (i === 0 || s[i-1] !== "\\")) {
      let j = i + 1, content = "";
      while (j < s.length) {
        if (s[j] === "\\" && j + 1 < s.length) { content += s[j+1]; j += 2; }
        else if (s[j] === "'") { break; }
        else { content += s[j]; j++; }
      }
      content = content.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      result += '"' + content + '"';
      i = j + 1;
    } else { result += c; i++; }
  }
  return result;
}

function repairJson(raw) {
  let s = raw.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
  const start = s.indexOf("{"), end = s.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1);
  s = s.replace(/,(\s*[}\]])/g, "$1");
  let out = "", inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (esc) { out += c; esc = false; continue; }
    if (c === "\\") { out += c; esc = true; continue; }
    if (c === '"') {
      if (!inStr) { inStr = true; out += c; continue; }
      let j = i + 1;
      while (j < s.length && (s[j] === " " || s[j] === "\t")) j++;
      const nx = s[j] || "";
      if (",]}:".includes(nx) || nx === "\n" || nx === "\r" || nx === "") {
        inStr = false; out += c;
      } else { out += '\\"'; }
      continue;
    }
    if (inStr && (c === "\n" || c === "\r")) { out += " "; continue; }
    out += c;
  }
  s = out;
  if (inStr) s += '"';
  let br = 0, bk = 0, inS = false, es = false;
  for (const c of s) {
    if (es) { es = false; continue; }
    if (c === "\\") { es = true; continue; }
    if (c === '"') { inS = !inS; continue; }
    if (inS) continue;
    if (c === "{") br++; else if (c === "}") br--;
    else if (c === "[") bk++; else if (c === "]") bk--;
  }
  for (let i = 0; i < bk; i++) s += "]";
  for (let i = 0; i < br; i++) s += "}";
  return s;
}

function safeParseJson(txt) {
  const clean = txt.replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/\s*```$/i,"").trim();
  const getBlock = t => { const m = t.match(/\{[\s\S]*\}/); return m ? m[0] : null; };
  const attempts = [
    () => JSON.parse(clean),
    () => JSON.parse(repairJson(clean)),
    () => { const b = getBlock(clean); if (!b) throw 0; return JSON.parse(b); },
    () => { const b = getBlock(clean); if (!b) throw 0; return JSON.parse(repairJson(b)); },
    () => JSON.parse(fixSingleQuotes(clean)),
    () => JSON.parse(repairJson(fixSingleQuotes(clean))),
    () => { const b = getBlock(fixSingleQuotes(clean)); if (!b) throw 0; return JSON.parse(b); },
    () => { const b = getBlock(fixSingleQuotes(clean)); if (!b) throw 0; return JSON.parse(repairJson(b)); },
  ];
  for (const fn of attempts) { try { return fn(); } catch (_) {} }
  throw new Error("JSON parse failed (8 attempts). AI response: " + clean.slice(0, 120) + "…");
}

// ─── AI PROVIDERS ─────────────────────────────────────────────────────────────
// FREE / NO-KEY providers: Claude (handled by artifact), Groq, Mistral, Cohere, Together
const AI_PROVIDERS = {
  claude:   { name:"Claude",       icon:"🤖", color:"#C0392B",  model:"claude-sonnet-4-6",            free:true  },
  gemini3f: { name:"Gemini 3 Flash",icon:"✨", color:"#1A73E8", model:"gemini-3.0-flash",              free:false },
  geminifl: { name:"Gemini 3.1 Flash-Lite",icon:"⚡",color:"#0F9D58",model:"gemini-3.1-flash-lite-preview-06-17",free:false },
  groq:     { name:"Groq (Free)",  icon:"🚀", color:"#F97316", model:"llama-3.3-70b-versatile",       free:true  },
  mistral:  { name:"Mistral (Free)",icon:"🌊",color:"#7C3AED", model:"mistral-small-latest",          free:true  },
  cohere:   { name:"Cohere (Free)",icon:"🧬", color:"#059669",  model:"command-r",                    free:true  },
  grok:     { name:"Grok",         icon:"🌌", color:"#1DA1F2", model:"grok-beta",                     free:false },
  openai:   { name:"OpenAI",       icon:"🧠", color:"#10A37F", model:"gpt-4o-mini",                  free:false },
};

function getAvailableProviders() {
  const keys = loadKeys();
  return Object.keys(AI_PROVIDERS).filter(id => {
    if (id === "claude") return true;
    if (AI_PROVIDERS[id].free) return !!keys[id]; // free-tier but needs key
    return !!keys[id];
  });
}

// ─── FETCH RAW TEXT ───────────────────────────────────────────────────────────
async function fetchRawText(system, user, maxTokens = 2000, provider = "claude") {
  const keys = loadKeys();
  const p = AI_PROVIDERS[provider] || AI_PROVIDERS.claude;

  if (provider === "claude") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:p.model, max_tokens:maxTokens, system, messages:[{role:"user",content:user}] }),
    });
    if (!res.ok) {
      let msg = `Claude HTTP ${res.status}`;
      try { const e = await res.json(); if (e?.error?.message) msg += ` — ${e.error.message}`; } catch(_) {}
      throw new Error(msg);
    }
    const d = await res.json();
    const txt = (d.content||[]).map(b=>b.text||"").join("").trim();
    if (!txt) throw new Error("Claude returned empty response");
    return txt;

  } else if (provider === "gemini3f" || provider === "geminifl") {
    const key = keys.gemini;
    if (!key) throw new Error("Gemini API key missing");
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${p.model}:generateContent?key=${key}`,
      { method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ contents:[{parts:[{text:`${system}\n\n${user}`}]}], generationConfig:{maxOutputTokens:maxTokens} }) }
    );
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const d = await res.json();
    const txt = d.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!txt) throw new Error("Gemini returned empty response");
    return txt;

  } else if (provider === "groq") {
    const key = keys.groq;
    if (!key) throw new Error("Groq API key missing");
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({ model:p.model, max_tokens:maxTokens, messages:[{role:"system",content:system},{role:"user",content:user}] }),
    });
    if (!res.ok) throw new Error(`Groq HTTP ${res.status}`);
    const d = await res.json();
    return d.choices?.[0]?.message?.content || "";

  } else if (provider === "mistral") {
    const key = keys.mistral;
    if (!key) throw new Error("Mistral API key missing");
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({ model:p.model, max_tokens:maxTokens, messages:[{role:"system",content:system},{role:"user",content:user}] }),
    });
    if (!res.ok) throw new Error(`Mistral HTTP ${res.status}`);
    const d = await res.json();
    return d.choices?.[0]?.message?.content || "";

  } else if (provider === "cohere") {
    const key = keys.cohere;
    if (!key) throw new Error("Cohere API key missing");
    const res = await fetch("https://api.cohere.com/v2/chat", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({ model:p.model, max_tokens:maxTokens, system_prompt:system, messages:[{role:"user",content:user}] }),
    });
    if (!res.ok) throw new Error(`Cohere HTTP ${res.status}`);
    const d = await res.json();
    return d.message?.content?.[0]?.text || "";

  } else if (provider === "grok") {
    const key = keys.grok;
    if (!key) throw new Error("Grok API key missing");
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({ model:p.model, max_tokens:maxTokens, messages:[{role:"system",content:system},{role:"user",content:user}] }),
    });
    if (!res.ok) throw new Error(`Grok HTTP ${res.status}`);
    const d = await res.json();
    return d.choices?.[0]?.message?.content || "";

  } else if (provider === "openai") {
    const key = keys.openai;
    if (!key) throw new Error("OpenAI API key missing");
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({ model:p.model, max_tokens:maxTokens, messages:[{role:"system",content:system},{role:"user",content:user}] }),
    });
    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const d = await res.json();
    return d.choices?.[0]?.message?.content || "";
  }
  throw new Error(`Unknown provider: ${provider}`);
}

async function callOneProvider(system, user, maxTokens, provider) {
  const txt = await fetchRawText(system, user, maxTokens, provider);
  return safeParseJson(txt);
}

async function ensembleCall(system, user, maxTokens = 1600) {
  const providers = getAvailableProviders();
  const results = await Promise.allSettled(providers.map(p => callOneProvider(system, user, maxTokens, p)));
  const successes = results.map((r,i) => r.status==="fulfilled"?{provider:providers[i],data:r.value}:null).filter(Boolean);
  if (successes.length === 0) {
    const firstErr = results.find(r=>r.status==="rejected");
    throw new Error(firstErr?.reason?.message || "All AI providers failed");
  }
  if (successes.length === 1) return successes[0].data;
  const SYS_SYNTH = `You are an expert synthesizer. Receive multiple JSON resume analyses and produce ONE best final JSON. Output JSON ONLY. No text, no backticks.`;
  const combinedStr = successes.map(s=>`=== ${s.provider.toUpperCase()} ===\n${JSON.stringify(s.data)}`).join("\n\n");
  const USER_SYNTH = `Analyses from ${successes.length} AI providers:\n\n${combinedStr}\n\nMerge into ONE best final JSON. Numeric scores = weighted average. Text/lists = pick most complete and accurate.`;
  return callOneProvider(SYS_SYNTH, USER_SYNTH, 2000, "claude");
}

function safeResume(raw) {
  return raw.replace(/\\/g," ").replace(/"/g,"'").replace(/[\r\n\t]+/g," | ").replace(/\s{3,}/g,"  ").slice(0,2500).trim();
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Card({ children, style={} }) {
  return (
    <div style={{ background:C.card, borderRadius:16, padding:"16px", marginBottom:14, border:`1px solid ${C.border}`, boxShadow:"0 1px 6px rgba(0,0,0,.05)", ...style }}>
      {children}
    </div>
  );
}

function Btn({ children, onClick, color=C.red, disabled, full=true, small, style:sx={} }) {
  return (
    <button disabled={disabled} onClick={onClick}
      style={{ background:disabled?"#A0AEC0":color, color:"#fff", border:"none", borderRadius:10, padding:small?"9px 16px":"13px 20px", fontSize:small?13:14, fontWeight:700, cursor:disabled?"default":"pointer", width:full?"100%":"auto", letterSpacing:.3, transition:"opacity .15s,transform .1s", ...sx }}
      onMouseDown={e=>{ if(!disabled) e.currentTarget.style.transform="scale(.98)"; }}
      onMouseUp={e=>{ e.currentTarget.style.transform="scale(1)"; }}>
      {children}
    </button>
  );
}

function ErrBox({ msg, onRetry }) {
  if (!msg) return null;
  return (
    <div style={{ background:"#FFF5F5", border:`1.5px solid #FC8181`, borderRadius:12, padding:"12px 14px", marginBottom:12, color:"#C53030", fontSize:13 }}>
      ⚠️ {msg}
      {onRetry && <button onClick={onRetry} style={{ display:"block", marginTop:8, background:C.red, color:"#fff", border:"none", borderRadius:8, padding:"7px 16px", fontSize:13, fontWeight:700, cursor:"pointer" }}>🔄 Retry</button>}
    </div>
  );
}

function Badge({ label, color=C.blue, bg="#EBF8FF" }) {
  return <span style={{ background:bg, color, fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600, whiteSpace:"nowrap" }}>{label}</span>;
}

function SectionHead({ icon, title, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, marginTop:8 }}>
      <span style={{ fontSize:22 }}>{icon}</span>
      <div>
        <div style={{ fontWeight:800, fontSize:16, color:C.textPri }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:C.textMut }}>{sub}</div>}
      </div>
    </div>
  );
}

function LangToggle({ lang, onChange }) {
  return (
    <div style={{ display:"flex", background:"rgba(255,255,255,.12)", borderRadius:8, padding:2, gap:2 }}>
      {[["my","🇲🇾 BM"],["en","🇬🇧 EN"]].map(([l,label])=>(
        <button key={l} onClick={()=>onChange(l)} style={{
          padding:"5px 11px", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer",
          background:lang===l?"#fff":"transparent", color:lang===l?C.navy:"rgba(255,255,255,.75)", transition:"all .2s"
        }}>{label}</button>
      ))}
    </div>
  );
}

function AppHeader({ subtitle, onBack, backLabel, lang, onLangChange }) {
  return (
    <div style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.blue} 100%)` }}>
      <div style={{ padding:"16px 16px 12px", display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:38, height:38, borderRadius:10, background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📋</div>
        <div style={{ flex:1 }}>
          <div style={{ color:"#fff", fontWeight:900, fontSize:17, letterSpacing:-.3 }}>ResumeAI Malaysia</div>
          {subtitle && <div style={{ color:"#93C5FD", fontSize:11, marginTop:1 }}>{subtitle}</div>}
        </div>
        <span style={{ background:"rgba(255,255,255,.1)", color:"#93C5FD", fontSize:9, padding:"3px 8px", borderRadius:20, fontWeight:700 }}>v8.0</span>
        {onLangChange && <LangToggle lang={lang} onChange={onLangChange} />}
        {onBack && (
          <button onClick={onBack} style={{ background:"rgba(255,255,255,.14)", color:"#fff", border:"none", borderRadius:9, padding:"7px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            ‹ {backLabel || "Back"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SETTINGS PANEL ──────────────────────────────────────────────────────────
function SettingsPanel({ onClose, lang }) {
  const [keys, setKeys] = useState(loadKeys());
  const [saved, setSaved] = useState(false);
  const isEN = lang==="en";

  function handleSave() { saveKeys(keys); setSaved(true); setTimeout(()=>setSaved(false), 2200); }

  const freeProviders = [
    { id:"groq",    label:"Groq API Key (Free Tier)", placeholder:"gsk_...", link:"https://console.groq.com/keys", note: isEN?"Free: llama-3.3-70b-versatile, very fast":"Percuma: llama-3.3-70b-versatile, laju" },
    { id:"mistral", label:"Mistral API Key (Free Tier)", placeholder:"...", link:"https://console.mistral.ai/", note: isEN?"Free: mistral-small-latest":"Percuma: mistral-small-latest" },
    { id:"cohere",  label:"Cohere API Key (Free Tier)", placeholder:"...", link:"https://dashboard.cohere.com/api-keys", note: isEN?"Free: command-r (1000 calls/month)":"Percuma: command-r (1000 panggilan/bulan)" },
  ];
  const paidProviders = [
    { id:"gemini",  label:"Gemini API Key", placeholder:"AIza...", link:"https://aistudio.google.com/app/apikey", note: isEN?"Enables Gemini 3 Flash & 3.1 Flash-Lite":"Aktifkan Gemini 3 Flash & 3.1 Flash-Lite" },
    { id:"grok",    label:"Grok API Key",   placeholder:"xai-...",  link:"https://console.x.ai/", note:"" },
    { id:"openai",  label:"OpenAI API Key", placeholder:"sk-...",   link:"https://platform.openai.com/api-keys", note:"" },
  ];
  const available = getAvailableProviders();

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:999, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:600, padding:"22px 20px 36px", boxShadow:"0 -4px 30px rgba(0,0,0,.2)", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:17, color:C.textPri }}>⚙️ {isEN?"API Keys Settings":"Tetapan API Keys"}</div>
          <button onClick={onClose} style={{ background:"#EDF2F7", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:700, color:C.textSec }}>✕</button>
        </div>
        <div style={{ background:"#F0FFF4", border:`1px solid #9AE6B4`, borderRadius:10, padding:"10px 13px", marginBottom:14, fontSize:12, color:"#276749" }}>
          🤖 <strong>{isEN?"Ensemble Mode":"Mod Ensemble"}</strong> — {isEN?"all AI with keys will analyse and results are merged.":"semua AI yang ada keys akan menganalisa dan hasilnya digabungkan."}<br/>
          <strong>{isEN?"Active AI":"AI Aktif"}:</strong> {available.map(a=>AI_PROVIDERS[a].icon+" "+AI_PROVIDERS[a].name).join(", ")}
        </div>

        <div style={{ fontWeight:700, fontSize:12, color:C.textPri, marginBottom:8, marginTop:12, textTransform:"uppercase", letterSpacing:.8 }}>
          🆓 {isEN?"Free AI Providers":"AI Percuma"}
        </div>
        {freeProviders.map(f=>(
          <div key={f.id} style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:13, color:C.textPri, marginBottom:3 }}>
              {AI_PROVIDERS[f.id].icon} {f.label} {keys[f.id]?"✅":""}
            </div>
            {f.note && <div style={{ fontSize:11, color:C.green, marginBottom:4 }}>✓ {f.note}</div>}
            <input type="password" placeholder={f.placeholder} value={keys[f.id]||""} onChange={e=>setKeys(k=>({...k,[f.id]:e.target.value}))}
              style={{ width:"100%", border:`1.5px solid ${keys[f.id]?C.green:C.border}`, borderRadius:9, padding:"10px 13px", fontSize:13, boxSizing:"border-box", fontFamily:"monospace", outline:"none" }} />
            <a href={f.link} target="_blank" rel="noreferrer" style={{ fontSize:11, color:C.blue, marginTop:3, display:"inline-block" }}>
              🔗 {isEN?"Get key here":"Dapatkan key di sini"}
            </a>
          </div>
        ))}

        <div style={{ fontWeight:700, fontSize:12, color:C.textPri, marginBottom:8, marginTop:16, textTransform:"uppercase", letterSpacing:.8 }}>
          💳 {isEN?"Paid AI Providers":"AI Berbayar"}
        </div>
        {paidProviders.map(f=>(
          <div key={f.id} style={{ marginBottom:14 }}>
            <div style={{ fontWeight:700, fontSize:13, color:C.textPri, marginBottom:3 }}>
              {AI_PROVIDERS[f.id].icon} {f.label} {keys[f.id]?"✅":""}
            </div>
            {f.note && <div style={{ fontSize:11, color:C.textSec, marginBottom:4 }}>{f.note}</div>}
            <input type="password" placeholder={f.placeholder} value={keys[f.id]||""} onChange={e=>setKeys(k=>({...k,[f.id]:e.target.value}))}
              style={{ width:"100%", border:`1.5px solid ${keys[f.id]?C.green:C.border}`, borderRadius:9, padding:"10px 13px", fontSize:13, boxSizing:"border-box", fontFamily:"monospace", outline:"none" }} />
            <a href={f.link} target="_blank" rel="noreferrer" style={{ fontSize:11, color:C.blue, marginTop:3, display:"inline-block" }}>
              🔗 {isEN?"Get key here":"Dapatkan key di sini"}
            </a>
          </div>
        ))}

        <button onClick={handleSave} style={{ width:"100%", background:saved?C.green:C.navy, color:"#fff", border:"none", borderRadius:12, padding:"14px", fontSize:15, fontWeight:700, cursor:"pointer", transition:"background .3s" }}>
          {saved ? (isEN?"✅ Saved! Ensemble Updated":"✅ Tersimpan! Ensemble Dikemaskini") : (isEN?"💾 Save Keys":"💾 Simpan Keys")}
        </button>
      </div>
    </div>
  );
}

// ─── ENSEMBLE BAR ─────────────────────────────────────────────────────────────
function EnsembleBar({ onSettings, lang }) {
  const providers = getAvailableProviders();
  const isEN = lang==="en";
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 16px 10px", background:"rgba(0,0,0,.15)", flexWrap:"wrap" }}>
      <span style={{ fontSize:10, color:"#93C5FD", fontWeight:700, marginRight:2 }}>ENSEMBLE:</span>
      {providers.map(id=>(
        <span key={id} style={{ fontSize:11, background:"rgba(255,255,255,.15)", color:"#fff", padding:"3px 9px", borderRadius:20, fontWeight:600 }}>
          {AI_PROVIDERS[id].icon} {AI_PROVIDERS[id].name}
        </span>
      ))}
      <button onClick={onSettings} style={{ marginLeft:"auto", background:"rgba(255,255,255,.1)", color:"#93C5FD", border:"none", borderRadius:20, padding:"4px 11px", fontSize:10, fontWeight:600, cursor:"pointer" }}>
        ⚙️ {isEN?"Manage Keys":"Urus Keys"}
      </button>
    </div>
  );
}

// ─── LOADER ───────────────────────────────────────────────────────────────────
function Loader({ msgs, progress, lang }) {
  const [idx, setIdx] = useState(0);
  const isEN = lang==="en";
  const defaultMsgs = isEN
    ? ["Reading your resume…","Evaluating ATS format & content…","Identifying critical errors…","Matching suitable positions…","Analysing skill gaps…","Almost ready…"]
    : ["Membaca resume anda…","Menilai format & kandungan ATS…","Mengenalpasti kesilapan kritikal…","Mengenalpasti jawatan sesuai…","Menganalisa jurang kemahiran…","Hampir siap…"];
  const list = msgs || defaultMsgs;
  const listLen = list.length;
  useEffect(()=>{ const t=setInterval(()=>setIdx(x=>(x+1)%listLen),2600); return ()=>clearInterval(t); },[listLen]);

  return (
    <div style={{ textAlign:"center", padding:"50px 24px 24px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
      <div style={{ position:"relative", width:68, height:68, margin:"0 auto 20px" }}>
        <div style={{ position:"absolute", inset:0, border:`5px solid ${C.border}`, borderTop:`5px solid ${C.red}`, borderRadius:"50%", animation:"spin 0.9s linear infinite" }} />
        <div style={{ position:"absolute", inset:10, border:`4px solid ${C.border}`, borderTop:`4px solid ${C.navy}`, borderRadius:"50%", animation:"spin 1.5s linear infinite reverse" }} />
      </div>
      <div style={{ fontWeight:700, color:C.textPri, fontSize:16, marginBottom:6, animation:"pulse 2s ease-in-out infinite" }}>{list[idx]}</div>
      <div style={{ color:C.textMut, fontSize:13, marginBottom:20 }}>{isEN?"This takes 15–25 seconds…":"Mengambil masa 15–25 saat…"}</div>
      {progress && (
        <div style={{ background:"#F0F7FF", border:`1px solid #BEE3F8`, borderRadius:12, padding:"14px 16px", textAlign:"left", maxWidth:320, margin:"0 auto" }}>
          <div style={{ fontSize:12, color:C.textSec, fontWeight:700, marginBottom:10 }}>🔄 {isEN?"Analysis Progress (2 stages)":"Proses Analisa (2 peringkat)"}</div>
          {[
            { key:"call1", label: isEN?"📊 ATS Score, Checklist & Fixes":"📊 Skor, Semak ATS & Cadangan Baiki" },
            { key:"call2", label: isEN?"💼 Job Matches & Skill Gaps":"💼 Padanan Kerja & Kemahiran" },
          ].map(({key,label})=>{
            const st = progress[key];
            return (
              <div key={key} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                <span style={{ fontSize:14 }}>{st==="done"?"✅":st==="error"?"❌":"⏳"}</span>
                <span style={{ fontSize:12, color:st==="done"?C.green:st==="error"?C.red:C.textMut, flex:1 }}>{label}</span>
                {st==="loading" && <span style={{ fontSize:10, color:C.textMut }}>{isEN?"processing…":"proses…"}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SCORE RING ───────────────────────────────────────────────────────────────
function ScoreRing({ score, size=130 }) {
  const r=size*.39, circ=2*Math.PI*r, cx=size/2, col=scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display:"block", margin:"0 auto" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="#E2E8F0" strokeWidth="9"/>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={col} strokeWidth="9"
        strokeDasharray={`${(score/100)*circ} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition:"stroke-dasharray 1.4s cubic-bezier(.4,0,.2,1)" }}/>
      <text x={cx} y={cx-6} textAnchor="middle" fontFamily="system-ui" fontSize={size*.22} fontWeight="900" fill={col}>{score}</text>
      <text x={cx} y={cx+12} textAnchor="middle" fontFamily="system-ui" fontSize={size*.09} fill={C.textMut}>/ 100</text>
    </svg>
  );
}

// ─── RESULT COMPONENTS ────────────────────────────────────────────────────────
function HRVerdict({ score, lang }) {
  const isEN = lang==="en";
  const verdicts = isEN ? [
    { min:85, icon:"✅", label:"Strong Candidate", color:C.green, bg:"#F0FFF4", border:"#9AE6B4",
      text:"This resume demonstrates strong professional standards. You are likely to pass initial ATS screening. Proceed to customise per job application." },
    { min:70, icon:"👍", label:"Acceptable", color:"#276749", bg:"#F0FFF4", border:"#9AE6B4",
      text:"Structurally sound but lacking depth. Address critical issues before submitting. Many candidates your level compete for the same roles." },
    { min:55, icon:"⚠️", label:"Requires Revision", color:C.amber, bg:"#FFFBEB", border:"#F6AD55",
      text:"This resume has significant gaps that will likely result in rejection by ATS systems. Do not submit as-is. Action the fixes immediately." },
    { min:0, icon:"🚨", label:"Not Submission-Ready", color:C.red, bg:"#FFF5F5", border:"#FC8181",
      text:"This resume does not meet minimum professional standards. It will be filtered out before a human ever reads it. Rebuild from scratch using the guidance below." },
  ] : [
    { min:85, icon:"✅", label:"Calon Kuat", color:C.green, bg:"#F0FFF4", border:"#9AE6B4",
      text:"Resume ini menunjukkan standard profesional yang kukuh. Kemungkinan besar lulus tapisan ATS awal. Sesuaikan mengikut setiap permohonan kerja." },
    { min:70, icon:"👍", label:"Boleh Diterima", color:"#276749", bg:"#F0FFF4", border:"#9AE6B4",
      text:"Struktur kukuh tetapi kurang mendalam. Atasi isu kritikal sebelum menghantar. Ramai calon pada tahap anda bersaing untuk jawatan yang sama." },
    { min:55, icon:"⚠️", label:"Perlu Semakan", color:C.amber, bg:"#FFFBEB", border:"#F6AD55",
      text:"Resume ini mempunyai jurang ketara yang kemungkinan besar menyebabkan penolakan oleh sistem ATS. Jangan hantar dalam keadaan semasa. Atasi pembetulan segera." },
    { min:0, icon:"🚨", label:"Tidak Sedia Dihantar", color:C.red, bg:"#FFF5F5", border:"#FC8181",
      text:"Resume ini tidak memenuhi piawaian profesional minimum. Ia akan ditapis sebelum mana-mana manusia membacanya. Bina semula dari awal menggunakan panduan di bawah." },
  ];
  const v = verdicts.find(x=>score>=x.min) || verdicts[verdicts.length-1];
  return (
    <div style={{ background:v.bg, border:`1.5px solid ${v.border}`, borderRadius:14, padding:"14px 16px", marginBottom:14 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
        <span style={{ fontSize:20 }}>{v.icon}</span>
        <div>
          <div style={{ fontWeight:800, fontSize:15, color:v.color }}>{isEN?"HR Verdict: ":"Keputusan HR: "}{v.label}</div>
        </div>
      </div>
      <div style={{ fontSize:13, color:C.textSec, lineHeight:1.6, fontStyle:"italic" }}>"{v.text}"</div>
    </div>
  );
}

function ScoreCard({ data, lang }) {
  const col = scoreColor(data.ats_score);
  const isEN = lang==="en";
  return (
    <Card style={{ textAlign:"center", paddingTop:20 }}>
      <ScoreRing score={data.ats_score} />
      <div style={{ fontWeight:800, fontSize:20, color:col, marginTop:8 }}>{scoreLabel(data.ats_score,lang)}</div>
      <div style={{ color:C.textSec, fontSize:13, marginTop:4 }}>{data.ats_verdict}</div>
      <div style={{ marginTop:10 }}><Badge label={data.experience_level} color={C.blue} bg="#EBF8FF"/></div>
      {data.skills_found?.length>0 && (
        <div style={{ textAlign:"left", marginTop:14, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
          <div style={{ fontSize:11, color:C.textMut, fontWeight:700, letterSpacing:.5, marginBottom:8 }}>
            {isEN?"DETECTED SKILLS":"KEMAHIRAN DIKESAN"}
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {data.skills_found.slice(0,14).map(s=><Badge key={s} label={s} color="#276749" bg="#F0FFF4"/>)}
          </div>
        </div>
      )}
    </Card>
  );
}

function JobCard({ job, lang }) {
  const col = job.match_percent>=80?C.green:job.match_percent>=60?C.amber:C.red;
  const isEN = lang==="en";
  return (
    <Card style={{ padding:"14px 15px", marginBottom:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:8 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:15, color:C.textPri }}>{job.title}</div>
          <div style={{ fontSize:12, color:C.textMut, marginTop:2 }}>{job.company_type} · {job.location}</div>
          <div style={{ fontSize:13, color:C.blue, fontWeight:600, marginTop:5 }}>{job.salary_range}</div>
        </div>
        <div style={{ textAlign:"center", minWidth:55 }}>
          <span style={{ fontSize:24, fontWeight:900, color:col }}>{job.match_percent}</span>
          <span style={{ fontSize:13, color:col, fontWeight:700 }}>%</span>
          <div style={{ fontSize:10, color:C.textMut }}>{isEN?"match":"padan"}</div>
        </div>
      </div>
      <div style={{ background:"#EDF2F7", borderRadius:6, height:5, marginTop:10 }}>
        <div style={{ background:col, borderRadius:6, height:5, width:`${job.match_percent}%`, transition:"width 1.2s ease-out" }}/>
      </div>
      <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8 }}>
        {(job.key_skills_matched||[]).slice(0,5).map(s=><Badge key={s} label={s} color={C.blue} bg="#EBF8FF"/>)}
      </div>
    </Card>
  );
}

function FixItem({ item, lang }) {
  const isEN = lang==="en";
  const sev = { "Critical":"#FFF5F5","High":"#FFFAF0","Medium":"#F0FFF4","Kritikal":"#FFF5F5","Tinggi":"#FFFAF0","Sederhana":"#F0FFF4" };
  const sevTxt = { "Critical":C.red,"High":C.amber,"Medium":C.green,"Kritikal":C.red,"Tinggi":C.amber,"Sederhana":C.green };
  return (
    <div style={{ background:sev[item.severity]||"#F7FAFC", borderRadius:12, padding:"13px 14px", marginBottom:9, border:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"flex-start", gap:8, marginBottom:6 }}>
        <span style={{ fontSize:16, marginTop:1 }}>
          {(item.severity==="Critical"||item.severity==="Kritikal")?"🔴":(item.severity==="High"||item.severity==="Tinggi")?"🟡":"🟢"}
        </span>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14, color:C.textPri }}>{item.section}</div>
          <Badge label={item.severity} color={sevTxt[item.severity]||C.green} bg={sev[item.severity]||"#F7FAFC"}/>
        </div>
      </div>
      <div style={{ fontSize:13, color:C.textSec, lineHeight:1.6, marginBottom:8 }}>
        <strong style={{ color:"#C53030" }}>{isEN?"Issue: ":"Masalah: "}</strong>{item.problem}
      </div>
      <div style={{ fontSize:13, color:C.textSec, lineHeight:1.6 }}>
        <strong style={{ color:C.green }}>{isEN?"How to Fix: ":"Cara Betulkan: "}</strong>{item.fix}
      </div>
      {item.example && (
        <div style={{ marginTop:8, background:"#EDF2F7", borderRadius:8, padding:"8px 10px" }}>
          <div style={{ fontSize:11, color:C.textMut, fontWeight:700, marginBottom:3 }}>{isEN?"EXAMPLE:":"CONTOH AYAT:"}</div>
          <div style={{ fontSize:12, color:C.textPri, fontStyle:"italic", lineHeight:1.5 }}>{item.example}</div>
        </div>
      )}
    </div>
  );
}

function SkillGap({ gap, lang }) {
  const isEN = lang==="en";
  const p = {
    "Critical":{ bg:"#FFF5F5", text:C.red },"Kritikal":{ bg:"#FFF5F5", text:C.red },
    "Important":{ bg:"#FFFAF0", text:C.amber },"Penting":{ bg:"#FFFAF0", text:C.amber },
    "Useful":{ bg:"#F0FFF4", text:C.green },"Berguna":{ bg:"#F0FFF4", text:C.green },
  }[gap.importance]||{ bg:"#F7FAFC", text:C.textSec };
  return (
    <div style={{ background:"#fff", borderRadius:12, padding:"13px 14px", marginBottom:9, border:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
        <span style={{ fontWeight:700, fontSize:14, color:C.textPri }}>{gap.skill}</span>
        <Badge label={gap.importance} color={p.text} bg={p.bg}/>
      </div>
      <div style={{ fontSize:12, color:C.textSec, lineHeight:1.5, marginBottom:gap.how_to_learn?6:0 }}>{gap.reason}</div>
      {gap.how_to_learn && (
        <div style={{ fontSize:12, color:C.blue, lineHeight:1.5 }}>
          📚 <strong>{isEN?"How to learn: ":"Cara belajar: "}</strong>{gap.how_to_learn}
        </div>
      )}
    </div>
  );
}

// ─── RESULT TABS ──────────────────────────────────────────────────────────────
function ResultTabs({ data, fileName, onNew, onImprove, lang }) {
  const [tab, setTab] = useState("overview");
  const isEN = lang==="en";
  const tabs = [
    { id:"overview", label: isEN?"📊 Score":"📊 Skor" },
    { id:"fix",      label: isEN?"🔧 Fixes":"🔧 Baiki" },
    { id:"jobs",     label: isEN?"💼 Jobs":"💼 Kerja" },
    { id:"skills",   label: isEN?"📈 Skills":"📈 Kemahiran" },
    { id:"tips",     label: isEN?"💡 Tips":"💡 Tips" },
  ];
  return (
    <div>
      <div style={{ position:"sticky", top:0, zIndex:10, background:C.bg, borderBottom:`1px solid ${C.border}`, padding:"0 16px" }}>
        <div style={{ display:"flex", gap:2, overflowX:"auto", paddingTop:10 }}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{
              flexShrink:0, padding:"9px 12px", border:"none", borderRadius:"10px 10px 0 0",
              fontWeight:700, fontSize:12, cursor:"pointer", transition:"all .2s",
              background:tab===t.id?C.white:"transparent",
              color:tab===t.id?C.red:C.textMut,
              borderBottom:tab===t.id?`2px solid ${C.red}`:"2px solid transparent",
            }}>{t.label}</button>
          ))}
        </div>
      </div>
      <div style={{ padding:"14px 16px 40px", maxWidth:600, margin:"0 auto" }}>
        {fileName && <div style={{ fontSize:11, color:C.textMut, marginBottom:10 }}>📄 {fileName}</div>}

        {tab==="overview" && (
          <>
            <HRVerdict score={data.ats_score} lang={lang}/>
            <ScoreCard data={data} lang={lang}/>
            {data.ats_checklist?.length>0 && (
              <Card>
                <SectionHead icon="✅" title={isEN?"ATS Checklist":"Semak ATS"} sub={isEN?"Automated resume filter check":"Sistem penapis resume automatik"}/>
                {data.ats_checklist.map((item,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"7px 0", borderBottom:i<data.ats_checklist.length-1?`1px solid #F7FAFC`:"none" }}>
                    <span style={{ fontSize:16 }}>{item.pass?"✅":"❌"}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:C.textPri, fontWeight:600 }}>{item.label}</div>
                      {!item.pass && <div style={{ fontSize:11, color:C.red, marginTop:2 }}>{item.note}</div>}
                    </div>
                  </div>
                ))}
              </Card>
            )}
            <Btn onClick={onImprove} color={C.green} style={{ marginBottom:10 }}>✨ {isEN?"Generate Improved Resume":"Jana Versi Resume Diperbaiki"}</Btn>
            <Btn onClick={onNew} color={C.navy}>+ {isEN?"Analyse Another Resume":"Analisa Resume Lain"}</Btn>
          </>
        )}

        {tab==="fix" && (
          <>
            <SectionHead icon="🔧" title={isEN?"Issues to Fix":"Apa Yang Perlu Dibaiki"} sub={isEN?"Prioritised issues with actionable fixes":"Senarai kesilapan dengan cara betulkan"}/>
            {!(data.fixes?.length>0)
              ? <Card><div style={{ textAlign:"center", color:C.textMut, padding:"20px 0" }}>{isEN?"No critical issues detected 🎉":"Tiada isu kritikal dikesan 🎉"}</div></Card>
              : (data.fixes||[]).map((f,i)=><FixItem key={i} item={f} lang={lang}/>)
            }
            <Btn onClick={onImprove} color={C.green}>✨ {isEN?"Generate Improved Resume":"Jana Versi Resume Diperbaiki"}</Btn>
          </>
        )}

        {tab==="jobs" && (
          <>
            <SectionHead icon="💼" title={isEN?"Suitable Positions":"Jawatan Bersesuaian"} sub={isEN?"Based on your skills and experience":"Berdasarkan kemahiran dan pengalaman anda"}/>
            {!(data.job_matches?.length>0)
              ? <Card><div style={{ textAlign:"center", color:C.textMut, padding:"20px 0" }}>{isEN?"No matches detected":"Tiada padanan dikesan"}</div></Card>
              : (data.job_matches||[]).map((j,i)=><JobCard key={i} job={j} lang={lang}/>)
            }
          </>
        )}

        {tab==="skills" && (
          <>
            <SectionHead icon="📈" title={isEN?"Skills to Add":"Kemahiran Perlu Ditambah"} sub={isEN?"Gaps that reduce your chances of being shortlisted":"Untuk tingkatkan peluang dipanggil temuduga"}/>
            {!(data.skill_gaps?.length>0)
              ? <Card><div style={{ textAlign:"center", color:C.textMut, padding:"20px 0" }}>{isEN?"Your skills are well-covered 🎉":"Kemahiran anda sudah mantap 🎉"}</div></Card>
              : (data.skill_gaps||[]).map((g,i)=><SkillGap key={i} gap={g} lang={lang}/>)
            }
          </>
        )}

        {tab==="tips" && (
          <>
            <SectionHead icon="💡" title={isEN?"HR Tips":"Tips Tingkatkan Resume"} sub={isEN?"Professional guidance from a strict HR perspective":"Panduan pakar HR Malaysia"}/>
            <Card style={{ background:`linear-gradient(135deg,${C.navy},${C.blue})`, border:"none" }}>
              {(data.tips||[]).map((t,i)=>(
                <div key={i} style={{ display:"flex", gap:10, marginBottom:12, alignItems:"flex-start" }}>
                  <span style={{ color:"#FFD700", fontWeight:800, fontSize:15, minWidth:22 }}>{i+1}.</span>
                  <span style={{ color:"#CBD5E0", fontSize:13, lineHeight:1.6 }}>{t}</span>
                </div>
              ))}
            </Card>
            <Btn onClick={onNew} color={C.navy}>+ {isEN?"Analyse Another Resume":"Analisa Resume Lain"}</Btn>
          </>
        )}
      </div>
    </div>
  );
}

// ─── IMPROVED RESUME VIEW ─────────────────────────────────────────────────────
function ImprovedResumeView({ content, onBack, lang }) {
  const [copied, setCopied] = useState(false);
  const [copyErr, setCopyErr] = useState("");
  const isEN = lang==="en";

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(content); }
      else {
        const ta = document.createElement("textarea");
        ta.value=content; ta.style.cssText="position:fixed;top:-9999px;left:-9999px;opacity:0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand failed");
      }
      setCopied(true); setTimeout(()=>setCopied(false),2500);
    } catch(e) {
      setCopyErr(isEN?"Cannot auto-copy — press & hold text below and select 'Select All', then copy.":"Tidak dapat salin automatik — tekan & tahan teks di bawah dan pilih 'Salin Semua'.");
      setTimeout(()=>setCopyErr(""),5000);
    }
  }

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui,-apple-system,sans-serif" }}>
      <AppHeader subtitle={isEN?"AI-Improved Resume":"Resume Diperbaiki oleh AI"} onBack={onBack} backLabel={isEN?"Results":"Keputusan"} lang={lang}/>
      <div style={{ padding:"16px 16px 40px", maxWidth:600, margin:"0 auto" }}>
        <Card style={{ background:"linear-gradient(135deg,#F0FFF4,#E6FFFA)", border:`1px solid #9AE6B4` }}>
          <div style={{ fontWeight:700, color:C.green, fontSize:14, marginBottom:4 }}>✅ {isEN?"Resume Improved by AI":"Resume Anda Telah Diperbaiki"}</div>
          <div style={{ fontSize:12, color:C.textSec }}>{isEN?"AI has improved format, content & phrasing. Copy and paste into Word or Google Docs.":"AI telah membaiki format, kandungan & frasa. Salin dan tampal ke Word atau Google Docs."}</div>
        </Card>
        <Btn onClick={copy} color={copied?C.green:C.navy} style={{ marginBottom:copyErr?8:14 }}>
          {copied?(isEN?"✅ Copied!":"✅ Disalin!"):(isEN?"📋 Copy All Text":"📋 Salin Semua Teks")}
        </Btn>
        {copyErr && <div style={{ background:"#FFFAF0", border:`1px solid #F6AD55`, borderRadius:10, padding:"10px 14px", marginBottom:14, color:C.amber, fontSize:12 }}>⚠️ {copyErr}</div>}
        <Card style={{ padding:"18px 16px" }}>
          <pre style={{ fontFamily:"system-ui", fontSize:12, color:C.textPri, whiteSpace:"pre-wrap", lineHeight:1.7, margin:0 }}>{content}</pre>
        </Card>
        <Btn onClick={copy} color={copied?C.green:C.navy} style={{ marginTop:4, marginBottom:10 }}>
          {copied?(isEN?"✅ Copied!":"✅ Disalin!"):(isEN?"📋 Copy All Text":"📋 Salin Semua Teks")}
        </Btn>
        <Btn onClick={onBack} color={C.navy}>‹ {isEN?"Back to Results":"Kembali ke Keputusan"}</Btn>
      </div>
    </div>
  );
}

// ─── ANALYZER ─────────────────────────────────────────────────────────────────
function Analyzer({ onDone, lang, onLangChange }) {
  const [step, setStep]         = useState("upload");
  const [mode, setMode]         = useState("pdf");
  const [text, setText]         = useState("");
  const [fileName, setFileName] = useState("");
  const [err, setErr]           = useState("");
  const [drag, setDrag]         = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [progress, setProgress] = useState({ call1:"waiting", call2:"waiting" });
  const [showSettings, setShowSettings] = useState(false);
  const fileRef = useRef(null);
  const isEN = lang==="en";

  useEffect(()=>{
    if (window.pdfjsLib) { setPdfReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    s.onload = ()=>{
      window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      setPdfReady(true);
    };
    s.onerror = ()=>setPdfReady(false);
    document.head.appendChild(s);
  },[]);

  async function extractPdf(file) {
    for (let i=0;i<60;i++) { if (window.pdfjsLib) break; await new Promise(r=>setTimeout(r,100)); }
    if (!window.pdfjsLib) throw new Error(isEN?"PDF reader failed to load. Please refresh and try again.":"PDF reader gagal dimuatkan. Sila refresh dan cuba semula.");
    let buf;
    try { buf = await file.arrayBuffer(); } catch(e) { throw new Error((isEN?"Failed to read file: ":"Gagal membaca fail: ")+e.message); }
    let pdf;
    try { pdf = await window.pdfjsLib.getDocument({data:new Uint8Array(buf)}).promise; }
    catch(e) {
      if (e.message?.includes("password")) throw new Error(isEN?"PDF is password protected. Please remove the password first.":"PDF dilindungi kata laluan. Sila keluarkan kata laluan dahulu.");
      throw new Error(isEN?"PDF is corrupted or cannot be read.":"PDF rosak atau tidak dapat dibaca.");
    }
    let out = "";
    for (let i=1;i<=Math.min(pdf.numPages,6);i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      let line = "";
      for (const item of content.items) {
        const s = item.str||""; if (!s) continue;
        line += line.endsWith("-")?s.trimStart():(line?" ":"")+s;
      }
      out += line+"\n";
    }
    return out.replace(/\s{3,}/g,"  ").trim();
  }

  async function handleFile(file) {
    setErr("");
    if (!file) { setErr(isEN?"No file selected.":"Tiada fail dipilih."); return; }
    const isPdf = file.type==="application/pdf"||file.name?.toLowerCase().endsWith(".pdf");
    if (!isPdf) { setErr(isEN?"Please select a PDF file only (.pdf).":"Sila pilih fail PDF sahaja (.pdf)."); return; }
    if (file.size>10*1024*1024) { setErr(isEN?"File too large. Maximum 10MB.":"Saiz fail terlalu besar. Maksimum 10MB."); return; }
    if (file.size<500) { setErr(isEN?"PDF file is too small or empty.":"Fail PDF terlalu kecil atau kosong."); return; }
    setFileName(file.name);
    try {
      const extracted = await extractPdf(file);
      if (!extracted||extracted.length<80) {
        setErr(isEN?"Text could not be extracted from this PDF (may be scanned/image). Please use Paste Text mode.":"Teks tidak dapat diekstrak dari PDF ini (mungkin imbasan/imej). Sila guna mod Tampal Teks.");
        return;
      }
      setText(extracted);
      setStep("pdf-ready");
    } catch(e) { setErr((isEN?"Error reading PDF: ":"Ralat membaca PDF: ")+e.message); }
  }

  // ── BILINGUAL STRICT HR SYSTEM PROMPT ──────────────────────────────────────
  function buildSysPrompt() {
    if (isEN) return `You are a strict, professional Senior HR Manager with 15 years of experience screening resumes for competitive Malaysian and international corporations. You have zero tolerance for weak resumes. You have rejected thousands of candidates. Your analysis is blunt, precise, and evidence-based.

OUTPUT RULES (mandatory):
1. Output JSON ONLY — no text, no explanation, no markdown, no backticks.
2. Use double quotes (") for ALL JSON keys and string values.
3. If string content contains double quotes, replace with single quotes (') or remove. Do NOT escape with backslash.
4. NO newline or tab inside string values. Use plain spaces only.
5. All numbers (ats_score, match_percent) must be integers or floats — WITHOUT quotes.
6. JSON must be COMPLETE — ensure all { } and [ ] are closed before output ends.
7. All content in English.`;

    return `Anda adalah Pengurus HR Kanan yang tegas dan profesional dengan 15 tahun pengalaman menapis resume untuk syarikat-syarikat Malaysia dan antarabangsa yang kompetitif. Anda tidak bertolak ansur dengan resume yang lemah. Anda telah menolak ribuan calon. Analisa anda adalah terus terang, tepat, dan berasaskan bukti.

PERATURAN OUTPUT (wajib):
1. Output JSON SAHAJA — tiada teks lain, tiada penerangan, tiada markdown, tiada backtick.
2. Guna tanda petikan berganda (") untuk SEMUA kunci dan nilai string JSON.
3. Jika kandungan nilai string mengandungi tanda petikan berganda, gantikan dengan petikan tunggal (') atau buang. JANGAN escape dengan backslash.
4. DILARANG guna newline atau tab di dalam nilai string. Guna ruang biasa sahaja.
5. Semua nombor (ats_score, match_percent) mesti integer atau float — TANPA petikan.
6. JSON mesti LENGKAP — pastikan semua { } dan [ ] ditutup sebelum output berakhir.
7. Semua teks dalam Bahasa Malaysia.`;
  }

  async function analyze() {
    const resume = text.trim();
    if (!resume||resume.length<80) { setErr(isEN?"Resume too short to analyse. Please paste more text.":"Resume terlalu pendek untuk dianalisa. Sila tampal lebih banyak teks."); return; }
    setErr(""); setStep("analyzing"); setProgress({call1:"loading",call2:"loading"});
    const snip = safeResume(resume);
    const SYS = buildSysPrompt();

    const U1 = isEN
      ? `As a strict HR manager, analyse this resume for the Malaysian and global job market 2025.
RESUME: ${snip}

Return JSON EXACTLY like this — fill only the values based on the actual resume, do not change keys or structure:
{"ats_score":72,"ats_verdict":"Resume requires significant improvement in content and format","experience_level":"Fresh Graduate","skills_found":["Microsoft Office","Communication","Time Management"],"ats_checklist":[{"label":"ATS-compatible format","pass":true,"note":""},{"label":"Complete contact information","pass":false,"note":"Phone number missing"},{"label":"Professional summary or objective present","pass":true,"note":""},{"label":"Work experience structured correctly","pass":true,"note":""},{"label":"Education section present","pass":true,"note":""},{"label":"Skills section present","pass":false,"note":"No dedicated skills section"},{"label":"Industry keywords present","pass":false,"note":"Insufficient technical keywords"}],"fixes":[{"section":"Summary","severity":"Critical","problem":"No professional summary","fix":"Add a 3-sentence summary highlighting your value proposition","example":"Diploma in Business Administration graduate with 2 years of clerical experience."},{"section":"Experience","severity":"High","problem":"No quantified achievements","fix":"Add data and metrics to every responsibility","example":"Managed over 200 client files with 98% accuracy rate."}],"tips":["Use bullet points for every job responsibility","Save resume as PDF before submitting","Name your file professionally e.g. Ahmad_Resume_2025.pdf","Add LinkedIn URL if you have a profile","Tailor your resume to each specific job posting"]}

REPLACE all values above with real analysis based on the provided resume. As a strict HR manager, be critical and precise. Score must reflect true quality.`

      : `Sebagai pengurus HR yang tegas, analisa resume ini untuk pasaran kerja Malaysia 2025.
RESUME: ${snip}

Kembalikan JSON TEPAT seperti ini — isi nilai sahaja berdasarkan resume sebenar, jangan ubah kunci atau struktur:
{"ats_score":72,"ats_verdict":"Resume perlu dipertingkat dari segi kandungan dan format","experience_level":"Fresh Graduate","skills_found":["Microsoft Office","Komunikasi","Pengurusan Masa"],"ats_checklist":[{"label":"Format sesuai ATS","pass":true,"note":""},{"label":"Maklumat hubungi lengkap","pass":false,"note":"Nombor telefon tiada"},{"label":"Ringkasan atau Objektif ada","pass":true,"note":""},{"label":"Pengalaman kerja tersusun","pass":true,"note":""},{"label":"Pendidikan ada","pass":true,"note":""},{"label":"Kemahiran disenaraikan","pass":false,"note":"Tiada seksyen kemahiran"},{"label":"Kata kunci industri ada","pass":false,"note":"Kurang kata kunci teknikal"}],"fixes":[{"section":"Ringkasan","severity":"Kritikal","problem":"Tiada ringkasan profesional","fix":"Tambah 3 ayat ringkasan yang menyerlahkan nilai anda","example":"Graduan Diploma Pentadbiran Perniagaan dengan 2 tahun pengalaman klerikal."},{"section":"Pengalaman","severity":"Tinggi","problem":"Tiada angka atau pencapaian","fix":"Tambah data kuantitatif pada setiap tanggungjawab","example":"Menguruskan lebih 200 fail pelanggan dengan ketepatan 98 peratus."}],"tips":["Gunakan bullet points untuk setiap tanggungjawab kerja","Simpan resume dalam format PDF sebelum hantar","Pastikan nama fail resume profesional contoh Ahmad_Resume_2025.pdf","Tambah LinkedIn URL jika ada profil","Hantar resume yang disesuaikan untuk setiap jawatan"]}

GANTIKAN semua nilai di atas dengan analisa sebenar. Sebagai HR yang tegas, beri penilaian yang kritis dan tepat.`;

    const U2 = isEN
      ? `Based on this resume, suggest suitable positions and skill gaps for the 2025 Malaysian and global job market. RESUME: ${snip.slice(0,1200)}

Return JSON EXACTLY like this:
{"job_matches":[{"title":"Administrative Executive","match_percent":82,"company_type":"GLC","salary_range":"RM 2500 - RM 3500/month","key_skills_matched":["Microsoft Office","Communication"],"location":"Kuala Lumpur"},{"title":"HR Assistant","match_percent":75,"company_type":"MNC","salary_range":"RM 2000 - RM 2800/month","key_skills_matched":["Administration","Communication"],"location":"Petaling Jaya"}],"skill_gaps":[{"skill":"Advanced Microsoft Excel","importance":"Critical","reason":"Required by almost all employers for data analysis","how_to_learn":"Free courses on YouTube, Microsoft Learn, or Coursera Excel certification"},{"skill":"Business English Communication","importance":"Important","reason":"MNCs and GLCs require bilingual communication","how_to_learn":"Duolingo, BBC Learning English podcast, HRDC English@Work classes"}]}

REPLACE all values with real analysis. List 5 job matches and 5 skill gaps. Salary must be realistic for Malaysia 2025. Be critical — match percent must reflect true alignment.`

      : `Berdasarkan resume ini, cadangkan jawatan dan kemahiran. RESUME: ${snip.slice(0,1200)}

Kembalikan JSON TEPAT seperti ini:
{"job_matches":[{"title":"Kerani Am","match_percent":82,"company_type":"GLC","salary_range":"RM 1800 - RM 2500 sebulan","key_skills_matched":["Microsoft Office","Komunikasi"],"location":"Kuala Lumpur"},{"title":"Pembantu Tadbir","match_percent":78,"company_type":"Kerajaan","salary_range":"RM 1500 - RM 2200 sebulan","key_skills_matched":["Pengurusan Fail","Komunikasi"],"location":"Shah Alam"}],"skill_gaps":[{"skill":"Microsoft Excel Lanjutan","importance":"Kritikal","reason":"Hampir semua majikan memerlukan kemahiran Excel untuk analisis data","how_to_learn":"Kursus percuma di YouTube atau MyMOHE, sijil Microsoft Office Specialist"},{"skill":"Kemahiran Bahasa Inggeris Perniagaan","importance":"Penting","reason":"MNC dan GLC memerlukan komunikasi dwibahasa yang lancar","how_to_learn":"Platform Duolingo, kelas English@Work HRDC, podcast BBC Learning English"}]}

GANTIKAN semua nilai di atas dengan analisa sebenar. Senaraikan 5 jawatan dan 5 kemahiran. Gaji realistik. Sebagai HR yang tegas, match percent mesti mencerminkan padanan sebenar.`;

    try {
      const run1 = ensembleCall(SYS,U1,2000).then(r=>{setProgress(p=>({...p,call1:"done"}));return r;}).catch(e=>{setProgress(p=>({...p,call1:"error"}));throw e;});
      const run2 = ensembleCall(SYS,U2,1500).then(r=>{setProgress(p=>({...p,call2:"done"}));return r;}).catch(e=>{setProgress(p=>({...p,call2:"error"}));throw e;});
      const [p1,p2] = await Promise.all([run1,run2]);

      onDone({
        ats_score:      Number(p1.ats_score)||50,
        ats_verdict:    String(p1.ats_verdict||""),
        experience_level: String(p1.experience_level||""),
        skills_found:   Array.isArray(p1.skills_found)?p1.skills_found:[],
        ats_checklist:  Array.isArray(p1.ats_checklist)?p1.ats_checklist:[],
        fixes:          Array.isArray(p1.fixes)?p1.fixes:[],
        tips:           Array.isArray(p1.tips)?p1.tips:[],
        job_matches:    Array.isArray(p2.job_matches)?p2.job_matches:[],
        skill_gaps:     Array.isArray(p2.skill_gaps)?p2.skill_gaps:[],
      }, fileName||"Pasted Text", resume);
    } catch(e) {
      setStep(fileName?"pdf-ready":"upload");
      setErr((isEN?"Analysis error: ":"Ralat analisa: ")+e.message);
    }
  }

  const STEPS = isEN
    ? [["upload","📤","Upload"],["pdf-ready","📄","Review"],["analyzing","⚡","Analyse"]]
    : [["upload","📤","Muat Naik"],["pdf-ready","📄","Semak"],["analyzing","⚡","Analisa"]];

  const exampleEN = `JOHN DOE
Email: john.doe@email.com | Phone: 012-3456789 | Kuala Lumpur

PROFESSIONAL SUMMARY
Recent Business Administration graduate with 2 years of clerical experience seeking opportunities in administration or customer service.

EDUCATION
2019–2022 | Diploma in Business Administration | UiTM Shah Alam
CGPA: 3.20

WORK EXPERIENCE
June 2022 – March 2024 | Administrative Clerk | XYZ Sdn Bhd, KL
- Managed company files and records
- Answered phone calls and client emails
- Assisted in preparing monthly reports

SKILLS
Microsoft Word, Excel, PowerPoint
Communication skills in Malay and English
Team player`;

  const exampleBM = `AHMAD BIN ALI\nEmail: ahmad@gmail.com | Tel: 012-3456789 | Kuala Lumpur\n\nOBJEKTIF\nSeorang graduan baru yang bermotivasi tinggi mencari peluang kerjaya dalam bidang pentadbiran atau perkhidmatan pelanggan.\n\nPENDIDIKAN\n2019 - 2022 | Diploma Pentadbiran Perniagaan | UiTM Shah Alam\nCGPA: 3.20\n\nPENGALAMAN KERJA\nJun 2022 - Mac 2024 | Kerani Am | Syarikat XYZ Sdn Bhd, KL\n- Menguruskan fail dan rekod syarikat\n- Menjawab panggilan telefon dan emel pelanggan\n- Membantu dalam penyediaan laporan bulanan\n\nKEMAHIRAN\nMicrosoft Word, Excel, PowerPoint\nKemahiran komunikasi Bahasa Melayu dan Bahasa Inggeris\nBoleh bekerja dalam pasukan`;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui,-apple-system,sans-serif" }}>
      {showSettings && <SettingsPanel onClose={()=>setShowSettings(false)} lang={lang}/>}

      <div style={{ background:`linear-gradient(135deg,${C.navy} 0%,${C.blue} 100%)` }}>
        <div style={{ padding:"16px 16px 0" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>📋</div>
            <div style={{ flex:1 }}>
              <div style={{ color:"#fff", fontWeight:900, fontSize:18 }}>ResumeAI Malaysia</div>
              <div style={{ color:"#93C5FD", fontSize:11 }}>{isEN?"Free · No Registration · Private":"Percuma · Tiada Pendaftaran · Rahsia Terjamin"}</div>
            </div>
            <span style={{ background:"rgba(255,255,255,.1)", color:"#93C5FD", fontSize:9, padding:"3px 8px", borderRadius:20, fontWeight:700 }}>v8.0</span>
            <LangToggle lang={lang} onChange={onLangChange}/>
          </div>
          <div style={{ display:"flex", alignItems:"center", paddingBottom:14 }}>
            {STEPS.map(([s,icon,label],i)=>(
              <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
                <div style={{ textAlign:"center", flex:1 }}>
                  <div style={{ fontSize:16, opacity:step===s?1:0.3, transition:"opacity .3s" }}>{icon}</div>
                  <div style={{ fontSize:10, color:step===s?"#fff":"#64748B", fontWeight:step===s?700:400 }}>{label}</div>
                </div>
                {i<2 && <div style={{ height:1, width:20, background:"rgba(255,255,255,.15)" }}/>}
              </div>
            ))}
          </div>
          {step==="upload" && (
            <div style={{ display:"flex", gap:6, paddingBottom:14 }}>
              {[["pdf", isEN?"📄 Upload PDF":"📄 Upload PDF"], ["paste", isEN?"📝 Paste Text":"📝 Tampal Teks"]].map(([m,label])=>(
                <button key={m} onClick={()=>{setMode(m);setErr("");}} style={{
                  flex:1, padding:"10px", borderRadius:10, border:"none",
                  fontWeight:600, fontSize:13, cursor:"pointer", transition:"all .2s",
                  background:mode===m?C.red:"rgba(255,255,255,.1)",
                  color:mode===m?"#fff":"#93C5FD",
                }}>{label}</button>
              ))}
            </div>
          )}
        </div>
        <EnsembleBar onSettings={()=>setShowSettings(true)} lang={lang}/>
      </div>

      <div style={{ padding:"16px 16px 40px", maxWidth:600, margin:"0 auto" }}>
        <ErrBox msg={err} onRetry={err&&(step==="upload"||step==="pdf-ready")?analyze:null}/>

        {/* PDF MODE */}
        {step==="upload" && mode==="pdf" && (
          <>
            <div
              onDragOver={e=>{e.preventDefault();setDrag(true);}}
              onDragLeave={()=>setDrag(false)}
              onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
              onClick={()=>pdfReady&&fileRef.current?.click()}
              style={{ background:drag?"#FFF5F5":"#fff", border:`2px dashed ${drag?C.red:C.border}`, borderRadius:16, padding:"44px 24px", textAlign:"center", cursor:pdfReady?"pointer":"default", transition:"all .2s", marginBottom:14, userSelect:"none" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>{pdfReady?"📤":"⏳"}</div>
              <div style={{ fontWeight:700, color:C.textPri, fontSize:16, marginBottom:6 }}>
                {pdfReady?(isEN?"Drag & Drop your Resume PDF":isEN?"Drag & Drop Resume PDF":"Drag & Drop Resume PDF"):(isEN?"Loading PDF Reader…":"Memuatkan PDF Reader…")}
              </div>
              {pdfReady && <div style={{ color:C.textSec, fontSize:13 }}>{isEN?"or":"atau"} <span style={{ color:C.red, fontWeight:600 }}>{isEN?"click to choose file":"klik untuk pilih fail"}</span></div>}
              <div style={{ color:C.textMut, fontSize:11, marginTop:8 }}>PDF {isEN?"only":"sahaja"} · {isEN?"Max":"Maks"} 10MB</div>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display:"none" }} onChange={e=>handleFile(e.target.files[0])}/>
            </div>
            <Card style={{ background:"#F0F7FF", border:`1px solid #BEE3F8` }}>
              <div style={{ fontWeight:700, color:C.blue, fontSize:13, marginBottom:8 }}>💡 {isEN?"Tips for best results":"Tips untuk hasil terbaik"}</div>
              {(isEN
                ? ["PDF from Word or Google Docs is best","1–2 page resume recommended","Ensure PDF has no password protection","Scanned/image PDFs may not extract well"]
                : ["PDF dari Word atau Google Docs dibaca lebih baik","Resume 1-2 halaman adalah yang paling sesuai","Pastikan tiada kata laluan pada PDF","PDF imbasan atau imej mungkin tidak dapat diekstrak"]
              ).map((t,i)=>(
                <div key={i} style={{ fontSize:12, color:C.textSec, marginBottom:4 }}>✓ {t}</div>
              ))}
            </Card>
          </>
        )}

        {/* PASTE MODE */}
        {step==="upload" && mode==="paste" && (
          <>
            <Card>
              <div style={{ fontWeight:700, color:C.textPri, marginBottom:8, fontSize:15 }}>
                {isEN?"Paste Your Resume Text":"Tampal Teks Resume Anda"}
              </div>
              <textarea
                style={{ width:"100%", minHeight:220, border:`2px solid ${C.border}`, borderRadius:10, padding:"12px 13px", fontSize:13, fontFamily:"system-ui", resize:"vertical", outline:"none", color:C.textPri, boxSizing:"border-box", lineHeight:1.7 }}
                placeholder={isEN
                  ? "Paste your full resume content here...\n\nExample:\nName: John Doe\nEmail: john@email.com | Phone: 012-3456789\n\nWork Experience:\n2022–2024 – Clerk at Company ABC\n- Managed files and documents...\n\nEducation:\n2018–2021 – Diploma in Business Admin, UiTM\n\nSkills:\nMicrosoft Office, Communication, Teamwork"
                  : "Tampal kandungan penuh resume anda di sini...\n\nContoh:\nNama: Ahmad bin Ali\nEmail: ahmad@email.com | Tel: 012-3456789\n\nPengalaman Kerja:\n2022-2024 - Kerani di Syarikat ABC\n- Menguruskan fail dan dokumen...\n\nPendidikan:\n2018-2021 - Diploma Pentadbiran Perniagaan, UiTM\n\nKemahiran:\nMicrosoft Office, Pengurusan Masa, Komunikasi"}
                value={text}
                onChange={e=>setText(e.target.value)}
                onFocus={e=>e.target.style.borderColor=C.red}
                onBlur={e=>e.target.style.borderColor=C.border}
              />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                <span style={{ fontSize:11, color:text.length<150?C.red:C.textMut }}>
                  {text.length} {isEN?"characters":"aksara"} {text.length<150?isEN?"(need more text)":"(perlu lebih panjang)":"✓"}
                </span>
                <Btn full={false} onClick={analyze} disabled={text.length<100} small>🚀 {isEN?"Analyse Now":"Analisa Sekarang"}</Btn>
              </div>
            </Card>
            <Card style={{ background:"#FFFAF0", border:`1px solid #F6AD55` }}>
              <div style={{ fontWeight:700, color:C.amber, fontSize:13, marginBottom:8 }}>📝 {isEN?"No resume? Try this example:":"Tiada resume? Cuba contoh ini"}</div>
              <button onClick={()=>setText(isEN?exampleEN:exampleBM)}
                style={{ background:"#FEF3C7", border:`1px solid #F6AD55`, borderRadius:8, padding:"8px 14px", fontSize:12, color:"#92400E", cursor:"pointer", fontWeight:600 }}>
                📋 {isEN?"Use Sample Resume":"Guna Contoh Resume"}
              </button>
            </Card>
          </>
        )}

        {/* PDF READY */}
        {step==="pdf-ready" && (
          <>
            <Card style={{ background:"#F0FFF4", border:`1px solid #9AE6B4` }}>
              <div style={{ fontWeight:700, color:C.green, fontSize:14, marginBottom:4 }}>✅ {isEN?"PDF Successfully Read":"PDF Berjaya Dibaca"}</div>
              <div style={{ fontSize:12, color:C.textSec, marginBottom:4 }}>{fileName}</div>
              <div style={{ fontSize:12, color:C.textSec }}>{text.length} {isEN?"characters extracted":"aksara diekstrak"}</div>
            </Card>
            <Btn onClick={analyze} color={C.red} style={{ marginBottom:10 }}>🚀 {isEN?"Analyse Resume Now":"Analisa Resume Sekarang"}</Btn>
            <Btn onClick={()=>{setStep("upload");setFileName("");setText("");}} color={C.navy}>↩ {isEN?"Choose Another File":"Pilih Fail Lain"}</Btn>
          </>
        )}

        {step==="analyzing" && <Loader progress={progress} lang={lang}/>}

        {step!=="analyzing" && (
          <div style={{ textAlign:"center", color:C.textMut, fontSize:11, marginTop:24, lineHeight:1.7 }}>
            🔒 {isEN?"Your resume is":"Resume anda"} <strong>{isEN?"not stored":"tidak disimpan"}</strong> {isEN?"on any server.":"dalam mana-mana server."}<br/>
            ResumeAI Malaysia v8.0 · {isEN?"Powered by Claude AI · Malaysian Job Market 2025":"Dikuasai Claude AI · Pasaran Kerja Malaysia 2025"}<br/>
            Made with ❤️ {isEN?"for Malaysians":"untuk rakyat Malaysia"}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── IMPROVE SCREEN ───────────────────────────────────────────────────────────
function ImproveScreen({ originalResume, analysisData, cachedResult, onBack, onDone, lang }) {
  const [loading, setLoading] = useState(!cachedResult);
  const [improved, setImproved] = useState(cachedResult || "");
  const [err, setErr] = useState("");
  const didRun = useRef(false);
  const isEN = lang==="en";

  useEffect(()=>{
    if (!cachedResult&&!didRun.current) { didRun.current=true; doImprove(); }
  },[]);

  async function doImprove() {
    setLoading(true); setErr("");
    const fixSummary = (analysisData.fixes||[]).map((f,i)=>`${i+1}. [${f.severity}] ${f.section}: ${f.fix}`).join(" | ");
    const gapSummary = (analysisData.skill_gaps||[])
      .filter(g=>g.importance==="Critical"||g.importance==="Kritikal"||g.importance==="Important"||g.importance==="Penting")
      .map(g=>g.skill).join(", ");
    const safeOriginal = originalResume.replace(/"/g,"'").slice(0,2200);

    const SYS_IMPROVE = isEN
      ? `You are a strict, professional Senior HR and resume writing expert. You have rewritten hundreds of resumes that resulted in successful job placements. Improve the resume and return ONLY the improved resume text. No explanations, no notes, no backticks. Write in professional English. Use strong action verbs, quantify achievements, ensure clean ATS-friendly format.`
      : `Anda pakar penulisan resume Malaysia yang tegas dan profesional. Anda telah menulis semula ratusan resume yang berjaya mendapat pekerjaan. Baiki resume dan kembalikan HANYA teks resume yang diperbaiki. Tiada penjelasan, tiada nota, tiada backtick. Tulis dalam Bahasa Malaysia profesional. Guna power verbs, kuantifikasi pencapaian, pastikan format ATS-friendly.`;

    const prompt = isEN
      ? `ORIGINAL RESUME: ${safeOriginal}

ISSUES TO FIX: ${fixSummary||"No specific issues"}
SKILLS TO ADD: ${gapSummary||"No specific skills"}

INSTRUCTIONS: Replace weak phrases with strong action verbs, add numbers and data where possible, ensure clean and professional format, add professional summary if missing, keep all factual information, write in professional English that will pass ATS screening.`
      : `RESUME ASAL: ${safeOriginal}

ISU PERLU DIBAIKI: ${fixSummary||"Tiada isu spesifik"}
KEMAHIRAN PERLU DITAMBAH: ${gapSummary||"Tiada kemahiran spesifik"}

ARAHAN: Baiki ayat lemah dengan power verbs, tambah angka dan data di mana boleh, pastikan format kemas dan profesional, tambah ringkasan profesional jika tiada, kekalkan semua maklumat benar, tulis dalam Bahasa Malaysia profesional yang lulus tapisan ATS.`;

    try {
      const providers = getAvailableProviders();
      const results = await Promise.allSettled(providers.map(p=>fetchRawText(SYS_IMPROVE,prompt,2000,p)));
      const texts = results.map(r=>r.status==="fulfilled"?r.value:"").filter(t=>t.length>100);

      if (texts.length===0) {
        const firstErr = results.find(r=>r.status==="rejected");
        throw new Error(firstErr?.reason?.message||(isEN?"All AI providers failed to generate resume":"Semua AI gagal menjana resume"));
      }
      if (texts.length===1) { setImproved(texts[0]); onDone(texts[0]); setLoading(false); return; }

      const synth = await fetchRawText(
        isEN
          ? `You are a professional resume synthesis expert. Combine the best versions of the improved resume into ONE final, most polished version. Output ONLY resume text. No explanations, no notes.`
          : `Anda synthesizer pakar resume Malaysia. Gabungkan versi-versi resume terbaik menjadi SATU resume akhir yang paling solid. Output HANYA teks resume. Tiada penjelasan, tiada nota.`,
        `${isEN?"Here are":"Berikut adalah"} ${texts.length} ${isEN?"improved resume versions from different AI:":"versi resume yang dibaiki oleh AI berbeza:"}\n\n${texts.map((t,i)=>`=== VERSION ${i+1} ===\n${t}`).join("\n\n")}\n\n${isEN?"Produce ONE best final resume combining the strengths of all versions above.":"Hasilkan SATU resume akhir terbaik menggabungkan kelebihan semua versi di atas."}`,
        2500, "claude"
      );
      setImproved(synth); onDone(synth); setLoading(false);
    } catch(e) { setErr((isEN?"Error: ":"Ralat: ")+e.message); setLoading(false); }
  }

  const providers = getAvailableProviders();
  const ensembleLabel = providers.length>1
    ? (isEN?`Ensemble of ${providers.length} AI working…`:`Ensemble ${providers.length} AI sedang bekerja…`)
    : (isEN?"Generating Improved Resume…":"Menjana Resume Diperbaiki…");

  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui" }}>
      <AppHeader subtitle={ensembleLabel} lang={lang}/>
      <Loader msgs={isEN
        ? ["Sending to all AI providers…","Improving phrases and sentences…","Adding strong action verbs…","Quantifying achievements…","Combining best versions…","Almost done…"]
        : ["Menghantar ke semua AI…","Membaiki frasa dan ayat…","Menambah power verbs…","Mengkuantifikasi pencapaian…","Menggabungkan versi terbaik…","Hampir siap…"]
      } lang={lang}/>
    </div>
  );

  if (err) return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui" }}>
      <AppHeader subtitle={isEN?"Generate Resume":"Jana Resume"} onBack={onBack} backLabel={isEN?"Results":"Keputusan"} lang={lang}/>
      <div style={{ padding:"16px" }}><ErrBox msg={err} onRetry={doImprove}/></div>
    </div>
  );

  return <ImprovedResumeView content={improved} onBack={onBack} lang={lang}/>;
}

// ─── PUBLISH GUIDE ────────────────────────────────────────────────────────────
function PublishGuide({ onClose, lang }) {
  const isEN = lang==="en";
  const steps = isEN ? [
    { icon:"🔵", title:"Deploy on Vercel (Recommended — Free)", steps:["1. Export this code as ResumeAI.jsx","2. Create a Next.js or Vite + React project","3. Push to GitHub repository","4. Connect GitHub to vercel.com — auto-deploy","5. Your URL: yourapp.vercel.app"], link:"https://vercel.com" },
    { icon:"🟠", title:"Netlify (Free — Drag & Drop)", steps:["1. Build project: npm run build","2. Go to netlify.com → Sites","3. Drag the dist/ folder to deploy","4. Get free .netlify.app domain","5. Custom domain available free"], link:"https://netlify.com" },
    { icon:"🟣", title:"GitHub Pages (Free — Static)", steps:["1. Push code to GitHub","2. Go to Settings → Pages","3. Select branch: main → /root","4. Your URL: username.github.io/repo","5. Free custom domain supported"], link:"https://pages.github.com" },
  ] : [
    { icon:"🔵", title:"Deploy di Vercel (Disyorkan — Percuma)", steps:["1. Export kod ini sebagai ResumeAI.jsx","2. Buat projek Next.js atau Vite + React","3. Push ke repositori GitHub","4. Sambungkan GitHub ke vercel.com — auto-deploy","5. URL anda: yourapp.vercel.app"], link:"https://vercel.com" },
    { icon:"🟠", title:"Netlify (Percuma — Drag & Drop)", steps:["1. Build projek: npm run build","2. Pergi ke netlify.com → Sites","3. Drag folder dist/ untuk deploy","4. Dapat domain percuma .netlify.app","5. Domain custom tersedia percuma"], link:"https://netlify.com" },
    { icon:"🟣", title:"GitHub Pages (Percuma — Statik)", steps:["1. Push kod ke GitHub","2. Pergi ke Settings → Pages","3. Pilih branch: main → /root","4. URL anda: username.github.io/repo","5. Domain custom percuma disokong"], link:"https://pages.github.com" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:999, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:600, padding:"22px 20px 36px", boxShadow:"0 -4px 30px rgba(0,0,0,.2)", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:800, fontSize:17, color:C.textPri }}>🚀 {isEN?"How to Publish This App":"Cara Publish Aplikasi Ini"}</div>
          <button onClick={onClose} style={{ background:"#EDF2F7", border:"none", borderRadius:8, padding:"6px 12px", cursor:"pointer", fontWeight:700, color:C.textSec }}>✕</button>
        </div>
        <div style={{ background:"#EBF8FF", border:`1px solid #BEE3F8`, borderRadius:10, padding:"10px 13px", marginBottom:16, fontSize:12, color:"#2B6CB0" }}>
          💡 {isEN?"All 3 options below are completely free and no credit card required.":"Kesemua 3 pilihan di bawah adalah percuma sepenuhnya dan tiada kad kredit diperlukan."}
        </div>
        {steps.map((s,i)=>(
          <div key={i} style={{ marginBottom:18, background:"#F7FAFC", borderRadius:14, padding:"16px 16px" }}>
            <div style={{ fontWeight:800, fontSize:14, color:C.textPri, marginBottom:10 }}>{s.icon} {s.title}</div>
            {s.steps.map((step,j)=>(
              <div key={j} style={{ fontSize:12, color:C.textSec, marginBottom:5, paddingLeft:4 }}>{step}</div>
            ))}
            <a href={s.link} target="_blank" rel="noreferrer" style={{ fontSize:12, color:C.blue, fontWeight:600, marginTop:6, display:"inline-block" }}>
              🔗 {isEN?"Go to platform →":"Pergi ke platform →"}
            </a>
          </div>
        ))}
        <div style={{ background:"#FFF5F5", border:`1px solid #FC8181`, borderRadius:10, padding:"12px 13px", fontSize:12, color:"#C53030" }}>
          ⚠️ {isEN?"Remember: API keys (Gemini, Grok, etc.) are entered by users at runtime — they are NOT in the source code. Claude API is handled automatically by the Claude artifact system.":"Ingat: API keys (Gemini, Grok, dll.) dimasukkan oleh pengguna pada waktu runtime — ia TIDAK dalam kod sumber. Claude API dikendalikan secara automatik oleh sistem Claude artifact."}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function ResumeAI() {
  const [screen, setScreen]       = useState("upload");
  const [resultData, setResult]   = useState(null);
  const [resultFile, setFile]     = useState("");
  const [originalResume, setOrig] = useState("");
  const [improvedText, setImproved] = useState("");
  const [lang, setLang]           = useState("my");
  const [showPublish, setShowPublish] = useState(false);

  function handleDone(result, file, resumeText) {
    setResult(result); setFile(file); setOrig(resumeText); setScreen("results");
  }

  const isEN = lang==="en";

  if (screen==="upload") return (
    <>
      {showPublish && <PublishGuide onClose={()=>setShowPublish(false)} lang={lang}/>}
      <Analyzer onDone={handleDone} lang={lang} onLangChange={setLang}/>
      <div style={{ textAlign:"center", paddingBottom:24 }}>
        <button onClick={()=>setShowPublish(true)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 14px", fontSize:11, color:C.textMut, cursor:"pointer" }}>
          🚀 {isEN?"How to publish this app":"Cara publish app ini"}
        </button>
      </div>
    </>
  );

  if (screen==="improve") return (
    <ImproveScreen
      originalResume={originalResume}
      analysisData={resultData}
      cachedResult={improvedText||null}
      onBack={()=>setScreen("results")}
      onDone={txt=>setImproved(txt)}
      lang={lang}
    />
  );

  if (screen==="results") return (
    <>
      {showPublish && <PublishGuide onClose={()=>setShowPublish(false)} lang={lang}/>}
      <div style={{ minHeight:"100vh", background:C.bg, fontFamily:"system-ui,-apple-system,sans-serif" }}>
        <AppHeader
          subtitle={isEN?"Resume Analysis Results":"Keputusan Analisa Resume"}
          onBack={()=>setScreen("upload")}
          backLabel={isEN?"Analyse Again":"Analisa Semula"}
          lang={lang}
          onLangChange={setLang}
        />
        <ResultTabs
          data={resultData}
          fileName={resultFile}
          lang={lang}
          onNew={()=>{ setResult(null); setFile(""); setOrig(""); setImproved(""); setScreen("upload"); }}
          onImprove={()=>setScreen("improve")}
        />
        <div style={{ textAlign:"center", paddingBottom:24 }}>
          <button onClick={()=>setShowPublish(true)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 14px", fontSize:11, color:C.textMut, cursor:"pointer" }}>
            🚀 {isEN?"How to publish this app":"Cara publish app ini"}
          </button>
        </div>
      </div>
    </>
  );

  return null;
}
