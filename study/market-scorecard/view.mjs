const names = ["us", "usq", "sox"];
let selected = "us";
const read = async (file, json = false) => {
  const response = await fetch(new URL(file, import.meta.url), {cache: "no-cache"});
  if (!response.ok) throw new Error(file);
  return json ? response.json() : response.text();
};
export async function mount(host) {
  const [template, style, ...values] = await Promise.all([
    read("view.html"), read("scorecard.css"), ...names.map(k => read(k + ".json", true))
  ]);
  if (!host.isConnected) return;
  const screen = document.createElement("div");
  const root = screen.attachShadow({mode:"open"});
  root.innerHTML = `<style>${style}</style>${template}`;
  draw(root, Object.fromEntries(names.map((k, i) => [k, values[i]])));
  host.replaceChildren(screen);
}
function draw(root, DATA) {
const SPEC6=[
 {k:"s1",p:"p1",idx:"①",nm:"중장기 Trend",inv:false,mode:"abs",q:{us:"미국 시장의 큰 상승추세가 살아 있는가?",usq:"나스닥100의 큰 상승추세가 살아 있는가?"}},
 {k:"s2",p:"p2",idx:"②",nm:"단기 Trend",inv:false,mode:"abs",q:{us:"최근 1~3주에도 상승 방향성이 유지되는가?",usq:"최근 1~3주에도 상승 방향성이 유지되는가?"}},
 {k:"s3",p:"p3",idx:"③",nm:"Breadth",inv:false,mode:"abs",q:{us:"S&P500 중 많은 종목이 함께 상승하는가?",usq:"나스닥100 중 많은 종목이 함께 상승하는가?"}},
 {k:"s4",p:"p4",idx:"④",nm:"Breakout 지속성",inv:false,mode:"payoff",q:{us:"돌파주를 사면 5일 뒤에도 벌고 있는가?",usq:"돌파주를 사면 5일 뒤에도 벌고 있는가?"}},
 {k:"s5",p:"p5",idx:"⑤",nm:"Rotation 강도",inv:true,mode:"abs",q:{us:"주도 섹터가 자주 바뀌는가? (높을수록 Choppy)",usq:"주도 섹터가 자주 바뀌는가? (높을수록 Choppy)"}},
 {k:"s6",p:"p6",idx:"⑥",nm:"Mean-Reversion",inv:false,mode:"payoff",q:{us:"추세주가 눌렸을 때 사면 반등하는가?",usq:"추세주가 눌렸을 때 사면 반등하는가?"}},
];
const CARRY={k:"s7",p:"p7",idx:"⑦",nm:"섹터 모멘텀 캐리",inv:false,mode:"payoff",
  q:{us:"주도 섹터를 따라가면 돈이 되는가?",usq:"주도 섹터를 따라가면 돈이 되는가?"}};
const MK={
 us:{key:"us",label:"미국 S&P 500",short:"S&P 500",col:"--us",soft:"--us-soft",
     specs:SPEC6.concat([CARRY]), aux:false, split:false, chk:"two",
     px:"spy", px2:"qqq", pxLabel:"S&P 500 (SPY)", px2Label:"QQQ", sectorLabel:"섹터", relBase:"SPY"},
 usq:{key:"usq",label:"미국 나스닥100",short:"나스닥100",col:"--usq",soft:"--usq-soft",
     specs:SPEC6.concat([CARRY]), aux:false, split:false, chk:"one",
     px:"qqq", px2:null, pxLabel:"나스닥100 (QQQ)", px2Label:"", sectorLabel:"섹터", relBase:"QQQ"},
 sox:{key:"sox",label:"미국 필라델피아 반도체",short:"SOX",col:"--sox",soft:"--sox-soft",
     specs:SPEC6.concat([CARRY]), chk:"one", px:"sox", px2:null, pxLabel:"필라델피아 반도체 (SOX)",
     sectorLabel:"미국 11개 섹터", relBase:"SOX"},
};
const NA={c:"--muted",t:"--tint-mid",label:"N/A"};
const L5=["강함","양호","중립","약함","취약"];
const CS=[["--s-good","--tint-good"],["--s-ok","--tint-ok"],["--s-mid","--tint-mid"],["--s-weak","--tint-weak"],["--s-bad","--tint-bad"]];
const mk=(cuts)=>cuts.map((m,i)=>({min:m,c:CS[i][0],t:CS[i][1],label:L5[i]}));
/* 모든 지표를 0~10 원점수 하나로 읽는다. 5.0 = 중립선 (④⑥⑦은 손익분기) */
const TREND_BANDS=mk([7.5,6.0,4.0,2.5,-1]);   /* ①②③⑤ — 조건 충족·비율형 */
const PAYOFF_BANDS=mk([6.5,5.5,4.5,3.5,-1]);  /* ④⑥⑦ — 5.0 중립 중심 */
const PCT_BANDS=mk([75,55,45,25,-1]);
function band(p,inv){ if(p==null) return NA; return PCT_BANDS.find(b=>(inv?100-p:p)>=b.min); }
/* 역방향(⑤)은 10-v 로 뒤집어 "높을수록 좋음"으로 통일 */
function gv(s,row){ const v=row[s.k]; if(v==null) return null; return s.inv?10-v:v; }
function bandOf(s,row){ const x=gv(s,row); if(x==null) return NA;
  return (s.mode==="payoff"?PAYOFF_BANDS:TREND_BANDS).find(b=>x>=b.min); }
function fillOf(s,row){ const x=gv(s,row); return x==null?0:x*10; }
/* 백분위는 보조 정보 — 성과형(④⑥⑦)에만 보조줄에 남긴다 */
function tagOf(s,row){ if(s.mode!=="payoff") return ""; const p=row[s.p];
  return p==null?"":"p"+p.toFixed(0); }
const HOT6=85;  /* ⑥ 과열 경고선 — 검증에서 이 구간 눌림목 승률이 오히려 낮았다 */
const hot=L=>L.p6!=null&&L.p6>=HOT6;
const REGIME_C={"Power Trend":"--s-good","Uptrend":"--s-ok","Neutral":"--s-mid",
                "Downtrend":"--s-weak","Severe Downtrend":"--s-bad"};
const chip=r=>r.choppy?` <span style="font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:var(--s-weak);background:var(--tint-weak);border-radius:2px;padding:1px 5px;vertical-align:middle">CHOPPY</span>`:"";
const MKS=names;
const CMPS=MKS;
root.getElementById("cmp").style.setProperty("--cmpn",CMPS.length);
root.getElementById("cmptitle").textContent=CMPS.map(k=>MK[k].short).join(" · ")+" 한눈에";
const SVG="http://www.w3.org/2000/svg";
function el(t,a){const e=document.createElementNS(SVG,t);for(const k in a)e.setAttribute(k,a[k]);return e;}
const tip=root.getElementById("tip");
function showTip(ev,txt){tip.textContent=txt;tip.style.opacity=1;
  tip.style.left=Math.min(ev.clientX+12,innerWidth-tip.offsetWidth-8)+"px";
  tip.style.top=(ev.clientY-tip.offsetHeight-10)+"px";}
function hideTip(){tip.style.opacity=0;}

/* ---------- 헤더 ---------- */
root.getElementById("meta").innerHTML=
 CMPS.map(k=>`<span class="chip ${k}">${MK[k].short} ${DATA[k].asof}${k==="us"&&DATA.us.quality&&DATA.us.quality.startsWith("잠정")?" 잠정":""}</span>`).join("")+
 `<span class="chip">백분위 기준 ${DATA.us.pct_base_days}거래일</span>`;

/* ---------- 비교 스트립 ---------- */
root.getElementById("cmp").innerHTML=CMPS.map(k=>{
  const M=MK[k], D=DATA[k], L=D.latest, rc=REGIME_C[L.regime]||"--s-mid";
  const bars=M.specs.map(s=>{
    const v=L[s.k], b=bandOf(s,L);
    return `<div class="brow"><span class="bi">${s.idx}</span><span class="bn">${s.nm}</span>
      <span class="bt"><i style="width:${fillOf(s,L)}%;background:var(${b.c})"></i><u></u></span>
      <span class="bv" style="color:var(${b.c})">${v==null?"—":v.toFixed(1)}</span></div>`;}).join("");
  return `<div class="cmpcol">
    <div class="cmphead"><span class="mk" style="color:var(${M.col})">${M.label}</span>
      <span class="as">${L.date} · ${D.n_universe}종목</span></div>
    <div class="verdicts">
      <div class="vrow"><span class="lb">국면</span><span class="vv" style="color:var(${rc})">${L.regime}</span>${chip(L)}</div>
      <div class="vrow"><span class="lb">④×⑥</span><span class="vq">${L.quad}</span></div>
    </div>
    <div class="bars">${bars}</div>
    ${hot(L)?`<div class="cau">⑥ 눌림목 점수 상위 백분위 · p${L.p6.toFixed(0)}</div>`:""}
    </div>`;}).join("");

(function(){
  const nm={s1:"중장기 Trend",s2:"단기 Trend",s3:"Breadth",s4:"Breakout 지속성",s5:"Rotation",s6:"Mean-Reversion",s7:"섹터 캐리"};
  const out=[];
  const NW=["","한","두","세","네","다섯"][CMPS.length]||CMPS.length;
  /* 받침이 있으면 "이", 없으면 "가" */
  const ga=w=>{const c=w.charCodeAt(w.length-1);
    return w+((c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28!==0)?"이":"가");};
  let big=null,spread=0,hi="",lo="";
  Object.keys(nm).forEach(k=>{
    const vs=CMPS.map(m=>({m,v:gv({k,inv:k==="s5"},DATA[m].latest)})).filter(x=>x.v!=null);
    if(vs.length<2) return;
    vs.sort((a,b)=>b.v-a.v);
    const d=vs[0].v-vs[vs.length-1].v;
    if(d>spread){spread=d;big=k;hi=MK[vs[0].m].short;lo=MK[vs[vs.length-1].m].short;}});
  if(big) out.push(`${NW} 시장 격차가 가장 큰 지표는 <b>${nm[big]}</b> — <b>${hi}</b>${ga(hi).slice(hi.length)} 가장 높고 <b>${lo}</b>${ga(lo).slice(lo.length)} 가장 낮다(${spread.toFixed(1)}점 차).`);
  const qs={};
  CMPS.forEach(m=>{const q=DATA[m].latest.quad;(qs[q]=qs[q]||[]).push(MK[m].short);});
  const ent=Object.entries(qs);
  if(ent.length===1) out.push(`④×⑥ 사분면은 <b>${NW} 시장 모두 "${ent[0][0]}"</b> — 같은 전략 국면이다.`);
  else out.push(`사분면: ${ent.map(([q,ms])=>`<b>${ms.join("·")}</b> ${q}`).join(" / ")}.`);
  root.getElementById("gapnote").innerHTML=out.join(" ");
})();

/* ---------- 탭 ---------- */
(function(){
  const tb=root.getElementById("tabs");
  tb.innerHTML=MKS.map((k,i)=>`<button class="${k}" role="tab" data-k="${k}" aria-selected="${i===0}">${MK[k].label} 상세</button>`).join("");
  tb.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return; sel(b.dataset.k);});
  function sel(k){selected=k;MKS.forEach(x=>{
    tb.querySelector(`button[data-k="${x}"]`).setAttribute("aria-selected",String(x===k));
    root.getElementById(x+"_strategy").hidden=x!==k;
    root.getElementById("pane_"+x).hidden=(x!==k);});}
  MKS.forEach(renderMarket);
  MKS.forEach(x=>root.getElementById("strategies").append(root.getElementById(x+"_strategy")));
  tb.addEventListener("keydown",e=>{
    if (!["ArrowLeft","ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    sel(MKS[(MKS.indexOf(selected)+(e.key==="ArrowLeft"?-1:1)+MKS.length)%MKS.length]);
    tb.querySelector('[aria-selected="true"]').focus();
  });
  sel(selected);
})();

/* ---------- 시장별 상세 렌더 ---------- */
function renderMarket(k){
 const M=MK[k], D=DATA[k], L=D.latest, H=D.history, N=H.length, P="#"+k+"_";
 root.getElementById("pane_"+k).innerHTML=`
  <div class="grid6" id="${k}_cards"></div>
  <section><div class="shead"><h2>최근 10영업일</h2><div class="note">전부 원점수 · 5.0 = 중립선 · ⑤는 역방향(막대·색 반전)</div></div>
    <div class="scroll" id="${k}_tbl"></div></section>
  <section id="${k}_strategy"><div class="shead"><h2>돌파 × 눌림목</h2>
      <div class="note">${M.label} · ${D.asof} · ${L.quad} · 최근 120거래일${D.membership ? ` · 구성표 ${D.membership.asof}` : ""}</div></div>
    <div class="two"><div><svg id="${k}_quad" viewBox="0 0 420 380" role="img" aria-label="돌파 대 눌림목 4분면"></svg></div>
      <div id="${k}_quadtbl"></div></div>
    <details class="foot"><summary>국면 구간 · 최근 120거래일</summary>
      <div class="scroll" id="${k}_periods"></div></details></section>
  <section><div class="shead"><h2>최근 1년 추이</h2><div class="note">지표별 개별 차트 · 점선 = 5.0 중립선 · 커서를 올리면 전 지표 동시 판독</div></div>
    <div class="readout" id="${k}_readout">&nbsp;</div>
    <div class="sm" id="${k}_sm"></div>
    <div style="margin-top:18px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
        <span style="font-size:12px;font-weight:500">${M.pxLabel} 종가 · 하단 띠 = 일별 국면 분류</span>
        <span class="num" id="${k}_pxval" style="font-size:12px"></span></div>
      <svg id="${k}_chart" viewBox="0 0 1120 190" role="img" aria-label="지수 및 국면 분류 추이"></svg>
      <div id="${k}_legend" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11.5px;color:var(--muted)"></div>
    </div></section>
  <div class="two">
    <section><div class="shead"><h2>① ② 지수 체크리스트</h2><div class="note">${M.chk==="two"?"SPY · QQQ 각 5점":"조건 5개 × 2점 = 10점"}</div></div>
      <div class="scroll" id="${k}_chk"></div></section>
    <section><div class="shead"><h2>⑤ ${M.sectorLabel} 5일 상대수익률</h2><div class="note">vs ${M.relBase}, %p</div></div>
      <svg id="${k}_sect" viewBox="0 0 420 300" role="img" aria-label="상대수익률"></svg></section>
  </div>`;

 /* 카드 */
 root.getElementById(k+"_cards").innerHTML=M.specs.map(s=>{
  const v=L[s.k],p=L[s.p],b=bandOf(s,L),q=gv(s,L),aux=s.k==="s8";
  const prev=H.length>6?H[H.length-6][s.k]:null, dlt=(v!=null&&prev!=null)?v-prev:null;
  let sub="";
  if(s.k==="s3") sub=`20DMA 위 ${L.a20}% · 50DMA 위 ${L.a50}%`;
  if(s.k==="s4"&&L.e4) sub=`n=${L.e4.n} · 생존 ${L.e4.hit}% · 5일 ${L.e4.avg_ret>0?"+":""}${L.e4.avg_ret}%`;
  if(s.k==="s6"&&L.e6) sub=`n=${L.e6.n} · 반등 ${L.e6.hit}% · 5일 ${L.e6.avg_ret>0?"+":""}${L.e6.avg_ret}%`;
  if(s.k==="s5") sub=`ρ=${L.rho} · Top3 유지 ${L.top3_keep}/3 · 섹터분산 σ=${L.disp}%p`;
  if(s.k==="s7") sub=`21일 평균 캐리 ${L.carry_avg>0?"+":""}${L.carry_avg}%p · 플러스 비율 ${L.carry_hit}%`;
  if(s.k==="s1"||s.k==="s2"){const dd=(s.k==="s1"?L.d1:L.d2);
    sub=M.chk==="two"?`SPY ${dd.SPY.score} · QQQ ${dd.QQQ.score}`:`${M.pxLabel} 조건 ${dd.raw}/5 × 2`;}
  return `<article class="card${aux?" aux":""}">
   <div class="top"><div class="nm"><span class="idx">${s.idx}</span>${s.nm}</div>
     ${s.inv?`<span class="inv" style="color:var(${M.col});border:1px solid var(${M.col})">역방향</span>`
            :(aux?`<span class="inv" style="color:var(${M.col});border:1px solid var(${M.col})">참고</span>`:"")}</div>
   <div class="q">${k==="sox" ? (s.q.sox || s.q.usq.replace("나스닥100","SOX")) : s.q[k]}</div>
   <div class="scoreline"><span class="v" style="color:var(${b.c})">${v==null?"—":v.toFixed(1)}</span><span class="d">/10</span>
     ${(dlt!=null&&Math.abs(dlt)>=0.05)?`<span class="d">${dlt>0?"▲":"▼"} ${Math.abs(dlt).toFixed(1)}</span>`:`<span class="d">—</span>`}
     <span style="flex:1"></span><span class="state" style="color:var(${b.c});background:var(${b.t})">${b.label}</span></div>
   <div class="meter"><i style="width:${fillOf(s,L)}%;background:var(${b.c})"></i><u style="left:50%"></u></div>
   <div class="sub"><span>${tagOf(s,L)?tagOf(s,L)+" · ":""}${sub}</span></div>
   ${(k!=="sox"&&s.k==="s6"&&p!=null&&p>=HOT6)?`<div class="cau">⚠ <b>과열 구간</b> (p${HOT6} 이상) — 검증상 이 구간에서 새로 나온 눌림목 신호는
     승률이 오히려 낮았다(미국 p80~100 48.2% vs 그 외 54~56%). 반등이 이미 상당 부분 진행됐을 가능성.</div>`:""}
   </article>`;}).join("");

 /* 10영업일 */
 (function(){const rows=H.slice(-10);
  const cell=(sp,row)=>{const v=row[sp.k]; if(v==null)return `<td class="n" style="color:var(--muted)">—</td>`;
   const b=bandOf(sp,row);
   return `<td class="n" style="color:var(${b.c});background:var(${b.t});font-weight:500">${v.toFixed(1)}</td>`;};
  const body=rows.map((r,i)=>{const last=i===rows.length-1;
   return `<tr${last?' style="font-weight:600;background:var(--surface2)"':''}>
     <td class="num" style="white-space:nowrap">${r.date}</td>
     ${M.specs.map(sp=>cell(sp,r)).join("")}
     <td style="white-space:nowrap;color:var(${REGIME_C[r.regime]||"--s-mid"});font-weight:600">${r.regime}${chip(r)}</td>
     <td style="white-space:nowrap;color:var(--ink2)">${r.quad}</td>
     <td class="n">${r[M.px]}</td></tr>`;}).join("");
  root.getElementById(k+"_tbl").innerHTML=`<table class="t10" style="min-width:${M.aux?900:840}px">
   <thead><tr><th>날짜</th>${M.specs.map(s=>`<th style="text-align:right">${s.idx}</th>`).join("")}
   <th>국면</th><th>④×⑥ 사분면</th><th style="text-align:right">${M.pxLabel}</th></tr></thead><tbody>${body}</tbody></table>
   <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:var(--muted);font-family:var(--mono)">
   ${M.specs.map(s=>`<span>${s.idx} ${s.nm}</span>`).join("")}</div>`;})();

 /* 4분면 */
 (function(){const svg=root.getElementById(k+"_quad"),W=420,Hh=380,m={l:44,r:14,t:14,b:40},TH=5;
  const x=v=>m.l+(v/10)*(W-m.l-m.r), y=v=>Hh-m.b-(v/10)*(Hh-m.t-m.b);
  [["--tint-mid",0,TH,TH,10],["--tint-good",TH,10,TH,10],["--tint-bad",0,TH,0,TH],["--tint-weak",TH,10,0,TH]]
   .forEach(([c,x0,x1,y0,y1])=>svg.appendChild(el("rect",{x:x(x0),y:y(y1),width:x(x1)-x(x0),height:y(y0)-y(y1),fill:`var(${c})`})));
  [["눌림목 우위",0.3,9.6,"start"],["양방향 우호",9.7,9.6,"end"],["관망 · 축소",0.3,0.4,"start"],["돌파 우위",9.7,0.4,"end"]]
   .forEach(([t,cx,cy,anc])=>{const n=el("text",{x:x(cx),y:y(cy),"text-anchor":anc,"font-size":10,fill:"var(--muted)","font-family":"var(--mono)"});n.textContent=t;svg.appendChild(n);});
  [0,2,4,5,6,8,10].forEach(v=>{
   svg.appendChild(el("line",{x1:x(v),x2:x(v),y1:m.t,y2:Hh-m.b,stroke:"var(--line)","stroke-width":v===TH?1.5:.6}));
   svg.appendChild(el("line",{x1:m.l,x2:W-m.r,y1:y(v),y2:y(v),stroke:"var(--line)","stroke-width":v===TH?1.5:.6}));
   const a=el("text",{x:x(v),y:Hh-m.b+15,"text-anchor":"middle","font-size":9.5,fill:"var(--muted)","font-family":"var(--mono)"});a.textContent=v;svg.appendChild(a);
   const b2=el("text",{x:m.l-7,y:y(v)+3.5,"text-anchor":"end","font-size":9.5,fill:"var(--muted)","font-family":"var(--mono)"});b2.textContent=v;svg.appendChild(b2);});
  {const hs=H.filter(r=>r.p6!=null&&r.p6>=85).map(r=>r.s6).sort((a,b)=>a-b);
   if(hs.length){const h6=hs[0];
    svg.appendChild(el("line",{x1:m.l,x2:W-m.r,y1:y(h6),y2:y(h6),stroke:"var(--s-weak)","stroke-width":1.2,"stroke-dasharray":"4 3",opacity:.85}));
    const hl=el("text",{x:W-m.r-2,y:y(h6)-4,"text-anchor":"end","font-size":9,fill:"var(--s-weak)","font-family":"var(--mono)"});
    hl.textContent=`⑥ 과열선 ≈ ${h6.toFixed(1)}`; svg.appendChild(hl);}}
  const xl=el("text",{x:(m.l+W-m.r)/2,y:Hh-6,"text-anchor":"middle","font-size":10.5,fill:"var(--ink2)"});xl.textContent="④ Breakout 지속성 (원점수 · 5.0=중립)";svg.appendChild(xl);
  const yl=el("text",{x:-((m.t+Hh-m.b)/2),y:12,"text-anchor":"middle","font-size":10.5,fill:"var(--ink2)",transform:"rotate(-90)"});yl.textContent="⑥ Mean-Reversion (원점수)";svg.appendChild(yl);
  const trail=H.slice(-120), defined=r=>r.s4!=null&&r.s6!=null, tr=trail.filter(defined);
  if(!tr.length) return;
  svg.appendChild(el("path",{d:trail.map((r,i)=>defined(r)?`${i&&defined(trail[i-1])?"L":"M"}${x(r.s4).toFixed(1)},${y(r.s6).toFixed(1)}`:"").join(""),fill:"none",stroke:"var(--muted)","stroke-width":1,opacity:.35}));
  tr.forEach((r,i)=>{const c=el("circle",{cx:x(r.s4),cy:y(r.s6),r:2.2,fill:"var(--muted)",opacity:(0.08+0.52*i/tr.length).toFixed(2)});
   c.addEventListener("mousemove",e=>showTip(e,`${r.date}\n④ ${r.s4.toFixed(1)}\n⑥ ${r.s6.toFixed(1)}`));
   c.addEventListener("mouseleave",hideTip);svg.appendChild(c);});
  if (!defined(L)) return;
  const last=L;
  svg.appendChild(el("circle",{cx:x(last.s4),cy:y(last.s6),r:7.5,fill:"var(--surface)"}));
  svg.appendChild(el("circle",{cx:x(last.s4),cy:y(last.s6),r:5,fill:`var(${PAYOFF_BANDS.find(b=>Math.max(last.s4,last.s6)>=b.min).c})`}));
  const near=last.s4>7.8, hi=last.s6>8.8;
  const t=el("text",{x:x(last.s4)+(near?-11:11),y:hi?y(last.s6)+18:y(last.s6)-8,
    "text-anchor":near?"end":"start","font-size":10.5,"font-weight":600,fill:"var(--ink)","font-family":"var(--mono)"});
  t.textContent=last.date;svg.appendChild(t);})();

 const periods=[];
 for(const row of H.slice(-120)){
   const tail=periods.at(-1);
   if(tail && tail.label===row.quad){ tail.end=row.date; tail.count++; }
   else periods.push({start:row.date,end:row.date,count:1,label:row.quad});
 }
 root.getElementById(k+"_periods").innerHTML=`<table><thead><tr><th>시작</th><th>종료</th><th>거래일</th><th>돌파 × 눌림목 판정</th></tr></thead><tbody>${periods.reverse().map(r=>`<tr><td>${r.start}</td><td>${r.end}</td><td>${r.count}</td><td>${r.label}</td></tr>`).join("")}</tbody></table>`;
 (function(){const e4=L.e4,e6=L.e6;
  const sample=(e,n)=>e?`${e.n}건 / ${e.window}일`:n!=null?`${n}건 / 63일 (8건 미만)`:"—";
  root.getElementById(k+"_quadtbl").innerHTML=`<table>
   <thead><tr><th>이벤트 통계</th><th style="text-align:right">④ 돌파</th><th style="text-align:right">⑥ 눌림목</th></tr></thead><tbody>
   <tr><td>표본 수 / 관측 구간</td><td class="n">${sample(e4,L.n4_63)}</td><td class="n">${sample(e6,L.n6_63)}</td></tr>
   <tr><td>5일 후 성공률</td><td class="n">${e4?e4.hit+"%":"—"}</td><td class="n">${e6?e6.hit+"%":"—"}</td></tr>
   <tr><td>5일 평균수익률</td>
     <td class="n" style="color:var(${(e4&&e4.avg_ret>=0)?"--s-ok":"--s-bad"})">${e4?(e4.avg_ret>0?"+":"")+e4.avg_ret+"%":"—"}</td>
     <td class="n" style="color:var(${(e6&&e6.avg_ret>=0)?"--s-ok":"--s-bad"})">${e6?(e6.avg_ret>0?"+":"")+e6.avg_ret+"%":"—"}</td></tr>
   <tr><td>점수 / 백분위</td><td class="n" style="font-weight:600">${e4?e4.score.toFixed(2):"—"} <span style="color:var(--muted);font-size:10px">p${L.p4??"—"}</span></td>
       <td class="n" style="font-weight:600">${e6?e6.score.toFixed(2):"—"} <span style="color:var(--muted);font-size:10px">p${L.p6??"—"}</span></td></tr></tbody></table>
   <p style="color:var(--muted);font-size:12px;margin:14px 0 0;line-height:1.65">
    <b style="color:var(--ink2)">돌파 정의</b> — 종가가 직전 50거래일 최고가를 상향 돌파 + 당일 거래량이 50일 평균의
    <b style="color:var(${M.col})">1.5배</b> 초과.
    동일 종목 5거래일 내 중복 제거.<br>
    <b style="color:var(--ink2)">눌림목 정의</b> — 50DMA&gt;200DMA이고 종가&gt;200DMA인 종목의 RSI(5)&lt;30.<br>
    두 지표 모두 5거래일 forward 관측이 필요해 <b style="color:var(--ink2)">최근 5거래일 신호는 미반영</b>이다.</p>`;})();

 /* small multiples */
 const PW=1120,PH=150,PM={l:36,r:16,t:12,b:20};
 const px=i=>PM.l+(i/(N-1))*(PW-PM.l-PM.r), py=v=>PH-PM.b-(v/10)*(PH-PM.t-PM.b);
 root.getElementById(k+"_sm").innerHTML=M.specs.map(s=>`
  <div class="panel"><div class="plabel">
   <span>${s.idx} ${s.nm}${s.inv?` <span style="color:var(${M.col});font-size:10px">역방향</span>`:""}</span>
   <span class="num" id="${k}_pv_${s.k}" style="color:var(${bandOf(s,L).c})">${L[s.k]==null?"—":L[s.k].toFixed(1)}</span></div>
  <svg id="${k}_p_${s.k}" viewBox="0 0 ${PW} ${PH}" style="width:100%;display:block"></svg></div>`).join("");
 M.specs.forEach(s=>{const svg=root.getElementById(`${k}_p_${s.k}`),col=`var(${bandOf(s,L).c})`;
  svg.appendChild(el("rect",{x:PM.l,y:py(10),width:PW-PM.l-PM.r,height:py(0)-py(10),fill:"var(--surface2)"}));
  [0,2.5,5,7.5,10].forEach(v=>{svg.appendChild(el("line",{x1:PM.l,x2:PW-PM.r,y1:py(v),y2:py(v),
    stroke:v===5?"var(--muted)":"var(--line)","stroke-width":v===5?1:.6,"stroke-dasharray":v===5?"4 3":"",opacity:v===5?.55:1}));
   const t=el("text",{x:PM.l-6,y:py(v)+3.5,"text-anchor":"end","font-size":9,fill:"var(--muted)","font-family":"var(--mono)"});
   t.textContent=v; svg.appendChild(t);});
  H.forEach((r,i)=>{if(i%21===0||i===N-1){
   svg.appendChild(el("line",{x1:px(i),x2:px(i),y1:PM.t,y2:py(0),stroke:"var(--line)","stroke-width":.5}));
   const t=el("text",{x:px(i),y:PH-6,"text-anchor":i===N-1?"end":"middle","font-size":9,fill:"var(--muted)","font-family":"var(--mono)"});
   t.textContent=r.date.slice(2,7); svg.appendChild(t);}});
  const segments=[];
  H.forEach((r,i)=>{if(r[s.k]!=null){
   if(!i || H[i-1][s.k]==null) segments.push([]);
   segments.at(-1).push([px(i),py(r[s.k])]);
  }});
  for(const pts of segments){
   const d=pts.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
   svg.appendChild(el("path",{d:d+`L${pts.at(-1)[0]},${py(0)}L${pts[0][0]},${py(0)}Z`,fill:col,opacity:.12}));
   svg.appendChild(el("path",{d,fill:"none",stroke:col,"stroke-width":1.8,"stroke-linejoin":"round","stroke-linecap":"round"}));
  }
  if(L[s.k]!=null) svg.appendChild(el("circle",{cx:px(N-1),cy:py(L[s.k]),r:4,fill:col,stroke:"var(--surface)","stroke-width":2}));
  svg.appendChild(el("line",{id:`${k}_g_${s.k}`,x1:0,x2:0,y1:PM.t,y2:py(0),stroke:"var(--ink)","stroke-width":1,opacity:0}));});
 (function(){const host=root.getElementById(k+"_sm"),ro=root.getElementById(k+"_readout");
  host.addEventListener("mousemove",ev=>{
   const r=root.getElementById(`${k}_p_s1`).getBoundingClientRect();
   let i=Math.round((((ev.clientX-r.left)/r.width*PW)-PM.l)/(PW-PM.l-PM.r)*(N-1));
   i=Math.max(0,Math.min(N-1,i)); if(isNaN(i))return; const row=H[i];
   M.specs.forEach(s=>{const g=root.getElementById(`${k}_g_${s.k}`); if(!g)return;
    g.setAttribute("x1",px(i));g.setAttribute("x2",px(i));g.setAttribute("opacity",.45);
    const c=root.getElementById(`${k}_pv_${s.k}`);
    c.textContent=row[s.k]==null?"—":row[s.k].toFixed(1);
    c.style.color=`var(${bandOf(s,row).c})`;});
   ro.textContent=`${row.date}   ${row.regime}${row.choppy?" (Choppy)":""} / ${row.quad}   ·   ${M.pxLabel} ${row[M.px]}   ·   20DMA 위 ${row.a20}%`;});
  host.addEventListener("mouseleave",()=>{M.specs.forEach(s=>{const g=root.getElementById(`${k}_g_${s.k}`); if(g)g.setAttribute("opacity",0);
   const c=root.getElementById(`${k}_pv_${s.k}`);c.textContent=L[s.k]==null?"—":L[s.k].toFixed(1);
   c.style.color=`var(${bandOf(s,L).c})`;});ro.innerHTML="&nbsp;";});})();

 /* 지수 차트 */
 (function(){const svg=root.getElementById(k+"_chart"),W=1120,Hh=190,m={l:52,r:10,t:10,b:34},rib=22,plotB=Hh-m.b-rib-6;
  const vals=H.map(r=>r[M.px]),lo=Math.min(...vals),hi=Math.max(...vals),pad=(hi-lo)*.08;
  const x=i=>m.l+(i/(N-1))*(W-m.l-m.r), y=v=>plotB-((v-(lo-pad))/((hi+pad)-(lo-pad)))*(plotB-m.t);
  [0,.25,.5,.75,1].forEach(f=>{const v=(lo-pad)+f*((hi+pad)-(lo-pad));
   svg.appendChild(el("line",{x1:m.l,x2:W-m.r,y1:y(v),y2:y(v),stroke:"var(--line)","stroke-width":.7}));
   const t=el("text",{x:m.l-6,y:y(v)+3.5,"text-anchor":"end","font-size":9.5,fill:"var(--muted)","font-family":"var(--mono)"});t.textContent=v.toFixed(0);svg.appendChild(t);});
  H.forEach((r,i)=>{const w=(W-m.l-m.r)/(N-1)+.9;
   svg.appendChild(el("rect",{x:x(i)-w/2,y:Hh-m.b-rib,width:w,height:rib,fill:`var(${REGIME_C[r.regime]||"--s-mid"})`,opacity:r.regime==="Neutral"?.35:.9}));
   if(r.choppy) svg.appendChild(el("rect",{x:x(i)-w/2,y:Hh-m.b-rib-5,width:w,height:4,fill:"var(--s-weak)",opacity:.9}));});
  svg.appendChild(el("path",{d:H.map((r,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(r[M.px]).toFixed(1)}`).join(""),fill:"none",stroke:"var(--ink)","stroke-width":1.5,"stroke-linejoin":"round"}));
  svg.appendChild(el("circle",{cx:x(N-1),cy:y(H[N-1][M.px]),r:3.6,fill:"var(--ink)",stroke:"var(--surface)","stroke-width":2}));
  H.forEach((r,i)=>{if(i%21===0||i===N-1){
   const t=el("text",{x:x(i),y:Hh-6,"text-anchor":i===N-1?"end":"middle","font-size":9.5,fill:"var(--muted)","font-family":"var(--mono)"});t.textContent=r.date.slice(2,7);svg.appendChild(t);
   svg.appendChild(el("line",{x1:x(i),x2:x(i),y1:m.t,y2:plotB,stroke:"var(--line)","stroke-width":.5}));}});
  const hit=el("rect",{x:m.l,y:m.t,width:W-m.l-m.r,height:Hh-m.t-m.b,fill:"transparent"});
  const vlab=root.getElementById(k+"_pxval");
  hit.addEventListener("mousemove",ev=>{const r=svg.getBoundingClientRect();
   let i=Math.round((((ev.clientX-r.left)/r.width*W)-m.l)/(W-m.l-m.r)*(N-1));
   i=Math.max(0,Math.min(N-1,i));const row=H[i];
   showTip(ev,`${row.date}\n${M.pxLabel} ${row[M.px]}${M.px2?`\n${M.px2Label} ${row[M.px2]}`:""}\n${row.regime}${row.choppy?" (Choppy)":""}`);
   vlab.textContent=`${row.date}  ${row[M.px]}`;});
  hit.addEventListener("mouseleave",()=>{hideTip();vlab.textContent=`${D.asof}  ${H[N-1][M.px]}`;});
  svg.appendChild(hit); vlab.textContent=`${D.asof}  ${H[N-1][M.px]}`;
  root.getElementById(k+"_legend").innerHTML=Object.entries(REGIME_C).map(([kk,v])=>
   `<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:11px;height:11px;background:var(${v});display:inline-block;border-radius:2px"></i>${kk}</span>`).join("")
   +`<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:11px;height:4px;background:var(--s-weak);display:inline-block"></i>Choppy (⑤≥6, 띠 위 얇은 선)</span>`;})();

 /* 섹터/업종 막대 */
 (function(){const svg=root.getElementById(k+"_sect"),W=420,Hh=300,m={l:80,r:38,t:6,b:22};
  const ent=Object.entries(D.sector_rel).sort((a,b)=>b[1]-a[1]);
  if(!ent.length) return;
  const mx=Math.max(...ent.map(e=>Math.abs(e[1])))*1.15||1;
  const x=v=>m.l+((v+mx)/(2*mx))*(W-m.l-m.r), bh=(Hh-m.t-m.b)/ent.length, top3=new Set(L.top3||[]);
  svg.appendChild(el("line",{x1:x(0),x2:x(0),y1:m.t,y2:Hh-m.b,stroke:"var(--line)","stroke-width":1}));
  ent.forEach(([kk,v],i)=>{const yc=m.t+i*bh,h=Math.max(bh-7,6),pos=v>=0;
   svg.appendChild(el("rect",{x:pos?x(0):x(v),y:yc+3,width:Math.max(Math.abs(x(v)-x(0)),1),height:h,rx:2,fill:`var(${pos?"--s-ok":"--s-bad"})`,opacity:top3.has(kk)?1:.5}));
   const t=el("text",{x:m.l-8,y:yc+h/2+7,"text-anchor":"end","font-size":10.5,fill:top3.has(kk)?"var(--ink)":"var(--muted)","font-weight":top3.has(kk)?600:400});t.textContent=kk;svg.appendChild(t);
   const n=el("text",{x:pos?x(v)+5:x(v)-5,y:yc+h/2+7,"text-anchor":pos?"start":"end","font-size":10,fill:"var(--ink2)","font-family":"var(--mono)"});n.textContent=(v>0?"+":"")+v.toFixed(1);svg.appendChild(n);});
  const c=el("text",{x:W/2,y:Hh-5,"text-anchor":"middle","font-size":10,fill:"var(--muted)"});
  c.textContent=`진하게 = 이번 주 Top 3 · 직전 주 대비 ${L.top3_keep}개 유지 (ρ=${L.rho})`;svg.appendChild(c);})();

 /* 체크리스트 */
 (function(){const rows=[];
  if(M.chk==="two"){
   const mk=(title,det)=>{rows.push(`<tr><td colspan="3" style="padding-top:12px;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(${M.col});border-bottom:1px solid var(--line)">${title}</td></tr>`);
    Object.keys(det.SPY.checks).forEach(kk=>{
     const f=v=>typeof v==="number"?(v===1?'<span class="tick yes">●●</span>':v===.5?'<span class="tick" style="color:var(--s-weak)">●○</span>':'<span class="tick no">○○</span>')
                                   :(v?'<span class="tick yes">✓</span>':'<span class="tick no">✗</span>');
     rows.push(`<tr><td>${kk}</td><td class="n">${f(det.SPY.checks[kk])}</td><td class="n">${f(det.QQQ.checks[kk])}</td></tr>`);});
    rows.push(`<tr><td style="font-weight:600">소계</td><td class="n" style="font-weight:600">${det.SPY.score}</td><td class="n" style="font-weight:600">${det.QQQ.score}</td></tr>`);};
   mk("① 중장기 Trend",L.d1); mk("② 단기 Trend",L.d2);
   root.getElementById(k+"_chk").innerHTML=`<table><thead><tr><th>조건</th><th style="text-align:right">SPY</th><th style="text-align:right">QQQ</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  } else {
   const mk=(title,det)=>{rows.push(`<tr><td colspan="2" style="padding-top:12px;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(${M.col});border-bottom:1px solid var(--line)">${title}</td></tr>`);
    Object.entries(det.checks).forEach(([kk,v])=>{
     const f=typeof v==="number"?(v===1?'<span class="tick yes">●●</span>':v===.5?'<span class="tick" style="color:var(--s-weak)">●○</span>':'<span class="tick no">○○</span>')
                                :(v?'<span class="tick yes">✓</span>':'<span class="tick no">✗</span>');
     rows.push(`<tr><td>${kk}</td><td class="n">${f}</td></tr>`);});
    rows.push(`<tr><td style="font-weight:600">소계</td><td class="n" style="font-weight:600">${det.raw} / 5 → ${(det.raw*2).toFixed(1)}점</td></tr>`);};
   mk("① 중장기 Trend",L.d1); mk("② 단기 Trend",L.d2);
   root.getElementById(k+"_chk").innerHTML=`<table><thead><tr><th>조건</th><th style="text-align:right">${M.pxLabel}</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  }})();
}
}
