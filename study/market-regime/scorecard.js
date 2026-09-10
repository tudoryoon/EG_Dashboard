const SPEC6=[
 {k:"s1",p:"p1",idx:"①",nm:"중장기 Trend",inv:false,mode:"abs",q:{us:"미국 시장의 큰 상승추세가 살아 있는가?",kr:"KOSPI의 큰 상승추세가 살아 있는가?",cn:"과창판의 큰 상승추세가 살아 있는가?"}},
 {k:"s2",p:"p2",idx:"②",nm:"단기 Trend",inv:false,mode:"abs",q:{us:"최근 1~3주에도 상승 방향성이 유지되는가?",kr:"최근 1~3주에도 상승 방향성이 유지되는가?",cn:"최근 1~3주에도 상승 방향성이 유지되는가?"}},
 {k:"s3",p:"p3",idx:"③",nm:"Breadth",inv:false,mode:"abs",q:{us:"S&P500 중 많은 종목이 함께 상승하는가?",kr:"KRX300 중 많은 종목이 함께 상승하는가?",cn:"과창판 중 많은 종목이 함께 상승하는가?"}},
 {k:"s4",p:"p4",idx:"④",nm:"Breakout 지속성",inv:false,mode:"payoff",q:{us:"돌파주를 사면 5일 뒤에도 벌고 있는가?",kr:"돌파주를 사면 5일 뒤에도 벌고 있는가?",cn:"돌파주를 사면 5일 뒤에도 벌고 있는가?"}},
 {k:"s5",p:"p5",idx:"⑤",nm:"Rotation 강도",inv:true,mode:"abs",q:{us:"주도 섹터가 자주 바뀌는가? (높을수록 Choppy)",kr:"주도 업종이 자주 바뀌는가? (높을수록 Choppy)",cn:"주도 섹터가 자주 바뀌는가? (높을수록 Choppy)"}},
 {k:"s6",p:"p6",idx:"⑥",nm:"Mean-Reversion",inv:false,mode:"payoff",q:{us:"추세주가 눌렸을 때 사면 반등하는가?",kr:"추세주가 눌렸을 때 사면 반등하는가?",cn:"추세주가 눌렸을 때 사면 반등하는가?"}},
];
const CARRY={k:"s7",p:"p7",idx:"⑦",nm:"섹터 모멘텀 캐리",inv:false,mode:"payoff",
  q:{us:"주도 섹터를 따라가면 돈이 되는가?",kr:"주도 업종을 따라가면 돈이 되는가?",cn:"주도 섹터를 따라가면 돈이 되는가?"}};
const AUX={k:"s8",p:"p8",idx:"⑧",nm:"외국인 수급",inv:false,mode:"payoff",
  q:{kr:"외국인 지분율이 오르는 종목이 늘고 있는가? (참고 지표)"}};
const MK={
 us:{key:"us",label:"미국 S&P 500",short:"미국",col:"--us",soft:"--us-soft",
     specs:SPEC6.concat([CARRY]), aux:false, split:false, chk:"two",
     px:"spy", px2:"qqq", pxLabel:"S&P 500 (SPY)", px2Label:"QQQ", sectorLabel:"섹터", relBase:"SPY"},
 kr:{key:"kr",label:"한국 KRX 300",short:"한국",col:"--kr",soft:"--kr-soft",
     specs:SPEC6.concat([CARRY,AUX]), aux:true, split:true, chk:"one",
     px:"kospi", px2:"kosdaq", pxLabel:"KOSPI", px2Label:"KOSDAQ", sectorLabel:"업종", relBase:"KOSPI"},
 cn:{key:"cn",label:"중국 과창판",short:"중국",col:"--cn",soft:"--cn-soft",
     specs:SPEC6.concat([CARRY]), aux:false, split:false, chk:"one",
     px:"star", px2:null, pxLabel:"과창50 ETF", px2Label:"", sectorLabel:"섹터", relBase:"과창50"},
};
const NA={c:"--muted",t:"--tint-mid",label:"N/A"};
const L5=["강함","양호","중립","약함","취약"];
const CS=[["--s-good","--tint-good"],["--s-ok","--tint-ok"],["--s-mid","--tint-mid"],["--s-weak","--tint-weak"],["--s-bad","--tint-bad"]];
const mk=(cuts)=>cuts.map((m,i)=>({min:m,c:CS[i][0],t:CS[i][1],label:L5[i]}));
/* 모든 지표를 0~10 원점수 하나로 읽는다. 5.0 = 중립선 (④⑥⑦⑧은 손익분기) */
const TREND_BANDS=mk([7.5,6.0,4.0,2.5,-1]);   /* ①②③⑤ — 조건 충족·비율형 */
const PAYOFF_BANDS=mk([6.5,5.5,4.5,3.5,-1]);  /* ④⑥⑦⑧ — 5.0 손익분기 중심 */
const PCT_BANDS=mk([75,55,45,25,-1]);
function band(p,inv){ if(p==null) return NA; return PCT_BANDS.find(b=>(inv?100-p:p)>=b.min); }
/* 역방향(⑤)은 10-v 로 뒤집어 "높을수록 좋음"으로 통일 */
function gv(s,row){ const v=row[s.k]; if(v==null) return null; return s.inv?10-v:v; }
function bandOf(s,row){ const x=gv(s,row); if(x==null) return NA;
  return (s.mode==="payoff"?PAYOFF_BANDS:TREND_BANDS).find(b=>x>=b.min); }
function fillOf(s,row){ const x=gv(s,row); return x==null?0:x*10; }
/* 백분위는 보조 정보 — 성과형(④⑥⑦⑧)에만 보조줄에 남긴다 */
function tagOf(s,row){ if(s.mode!=="payoff") return ""; const p=row[s.p];
  return p==null?"":"p"+p.toFixed(0); }
const HOT6=85;  /* ⑥ 과열 경고선 — 검증에서 이 구간 눌림목 승률이 오히려 낮았다 */
const hot=L=>L.p6!=null&&L.p6>=HOT6;
const REGIME_C={"Power Trend":"--s-good","Uptrend":"--s-ok","Neutral":"--s-mid",
                "Downtrend":"--s-weak","Severe Downtrend":"--s-bad"};
const chip=r=>r.choppy?` <span style="font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:var(--s-weak);background:var(--tint-weak);border-radius:2px;padding:1px 5px;vertical-align:middle">CHOPPY</span>`:"";
const MKS=["us","kr","cn"];
const SVG="http://www.w3.org/2000/svg";
function el(t,a){const e=document.createElementNS(SVG,t);for(const k in a)e.setAttribute(k,a[k]);return e;}
const tip=document.getElementById("tip");
function showTip(ev,txt){tip.textContent=txt;tip.style.opacity=1;
  tip.style.left=Math.min(ev.clientX+12,innerWidth-tip.offsetWidth-8)+"px";
  tip.style.top=(ev.clientY-tip.offsetHeight-10)+"px";}
function hideTip(){tip.style.opacity=0;}

/* ---------- 헤더 ---------- */
document.getElementById("meta").innerHTML=
 MKS.map(k=>`<span class="chip ${k}">${MK[k].short} ${DATA[k].asof}${k==="us"&&DATA.us.quality&&DATA.us.quality.startsWith("잠정")?" 잠정":""}</span>`).join("")+
 `<span class="chip">백분위 기준 ${DATA.us.pct_base_days}거래일</span>`+
 `<span class="chip">산출 ${DATA.cn.generated_at}</span>`;

/* ---------- 비교 스트립 ---------- */
document.getElementById("cmp").innerHTML=MKS.map(k=>{
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
    ${hot(L)?`<div class="cau">⚠ ⑥ p${L.p6.toFixed(0)} 과열 — 눌림목은 늦은 신호일 수 있음</div>`:""}
    </div>`;}).join("");

(function(){
  const nm={s1:"중장기 Trend",s2:"단기 Trend",s3:"Breadth",s4:"Breakout 지속성",s5:"Rotation",s6:"Mean-Reversion",s7:"섹터 캐리"};
  const out=[];
  let big=null,spread=0,hi="",lo="";
  Object.keys(nm).forEach(k=>{
    const vs=MKS.map(m=>({m,v:gv({k,inv:k==="s5"},DATA[m].latest)})).filter(x=>x.v!=null);
    if(vs.length<2) return;
    vs.sort((a,b)=>b.v-a.v);
    const d=vs[0].v-vs[vs.length-1].v;
    if(d>spread){spread=d;big=k;hi=MK[vs[0].m].short;lo=MK[vs[vs.length-1].m].short;}});
  if(big) out.push(`세 시장 격차가 가장 큰 지표는 <b>${nm[big]}</b> — <b>${hi}</b>가 가장 높고 <b>${lo}</b>가 가장 낮다(${spread.toFixed(1)}점 차).`);
  const qs={};
  MKS.forEach(m=>{const q=DATA[m].latest.quad;(qs[q]=qs[q]||[]).push(MK[m].short);});
  const ent=Object.entries(qs);
  if(ent.length===1) out.push(`④×⑥ 사분면은 <b>세 시장 모두 "${ent[0][0]}"</b> — 같은 전략 국면이다.`);
  else out.push(`사분면: ${ent.map(([q,ms])=>`<b>${ms.join("·")}</b> ${q}`).join(" / ")}.`);
  document.getElementById("gapnote").innerHTML=out.join(" ");
})();

/* ---------- 탭 ---------- */
(function(){
  const tb=document.getElementById("tabs");
  tb.innerHTML=MKS.map((k,i)=>`<button class="${k}" role="tab" data-k="${k}" aria-selected="${i===0}">${MK[k].label} 상세</button>`).join("");
  tb.addEventListener("click",e=>{const b=e.target.closest("button"); if(!b)return; sel(b.dataset.k);});
  function sel(k){MKS.forEach(x=>{
    tb.querySelector(`button[data-k="${x}"]`).setAttribute("aria-selected",String(x===k));
    document.getElementById("pane_"+x).hidden=(x!==k);});}
  window.__selTab=sel;
})();

/* ---------- 시장별 상세 렌더 ---------- */
function renderMarket(k){
 const M=MK[k], D=DATA[k], L=D.latest, H=D.history, N=H.length, P="#"+k+"_";
 document.getElementById("pane_"+k).innerHTML=`
  <div class="grid6" id="${k}_cards"></div>
  <section><div class="shead"><h2>최근 10영업일</h2><div class="note">전부 원점수 · 5.0 = 중립선 · ⑤는 역방향(막대·색 반전)</div></div>
    <div class="scroll" id="${k}_tbl"></div></section>
  <section><div class="shead"><h2>돌파 × 눌림목 — 어느 전략이 작동하는가</h2>
      <div class="note">축은 원점수 · 5.0 = 손익분기 · 최근 120거래일 궤적</div></div>
    <div class="two"><div><svg id="${k}_quad" viewBox="0 0 420 380" role="img" aria-label="돌파 대 눌림목 4분면"></svg></div>
      <div id="${k}_quadtbl"></div></div></section>
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
    ${M.split?`<section><div class="shead"><h2>③ Breadth — 시장 분리</h2><div class="note">KOSPI ${D.n_kospi} · KOSDAQ ${D.n_kosdaq}</div></div>
      <svg id="${k}_bsplit" viewBox="0 0 520 230" role="img" aria-label="KOSPI KOSDAQ Breadth"></svg>
      <div id="${k}_bnote" style="margin-top:8px;font-size:12px;color:var(--ink2);line-height:1.6"></div></section>`
     :`<section><div class="shead"><h2>① ② 지수 체크리스트</h2><div class="note">SPY · QQQ 각 5점</div></div>
      <div class="scroll" id="${k}_chk"></div></section>`}
    <section><div class="shead"><h2>⑤ ${M.sectorLabel} 5일 상대수익률</h2><div class="note">vs ${M.relBase}, %p</div></div>
      <svg id="${k}_sect" viewBox="0 0 420 300" role="img" aria-label="상대수익률"></svg></section>
  </div>
  ${M.split?`<section><div class="shead"><h2>① ② ${M.pxLabel} 체크리스트</h2><div class="note">조건 5개 × 2점 = 10점</div></div>
    <div class="scroll" id="${k}_chk"></div></section>`:""}`;

 /* 카드 */
 document.getElementById(k+"_cards").innerHTML=M.specs.map(s=>{
  const v=L[s.k],p=L[s.p],b=bandOf(s,L),q=gv(s,L),aux=s.k==="s8";
  const prev=H.length>6?H[H.length-6][s.k]:null, dlt=(v!=null&&prev!=null)?v-prev:null;
  let sub="";
  if(s.k==="s3") sub=M.split?`20DMA 위 ${L.a20}% · KOSPI ${L.b_ks} / KOSDAQ ${L.b_kq}`:`20DMA 위 ${L.a20}% · 50DMA 위 ${L.a50}%`;
  if(s.k==="s4"&&L.e4) sub=`n=${L.e4.n} · 생존 ${L.e4.hit}% · 5일 ${L.e4.avg_ret>0?"+":""}${L.e4.avg_ret}%`;
  if(s.k==="s6"&&L.e6) sub=`n=${L.e6.n} · 반등 ${L.e6.hit}% · 5일 ${L.e6.avg_ret>0?"+":""}${L.e6.avg_ret}%`;
  if(s.k==="s5") sub=`ρ=${L.rho} · Top3 유지 ${L.top3_keep}/3 · 섹터분산 σ=${L.disp}%p`;
  if(s.k==="s7") sub=`21일 평균 캐리 ${L.carry_avg>0?"+":""}${L.carry_avg}%p · 플러스 비율 ${L.carry_hit}%`;
  if(s.k==="s1"||s.k==="s2"){const dd=(s.k==="s1"?L.d1:L.d2);
    sub=M.chk==="two"?`SPY ${dd.SPY.score} · QQQ ${dd.QQQ.score}`:`${M.pxLabel} 조건 ${dd.raw}/5 × 2`;}
  if(s.k==="s8") sub=`외국인 지분율 20일 전 대비 상승 ${L.frn_up}%`;
  return `<article class="card${aux?" aux":""}">
   <div class="top"><div class="nm"><span class="idx">${s.idx}</span>${s.nm}</div>
     ${s.inv?`<span class="inv" style="color:var(${M.col});border:1px solid var(${M.col})">역방향</span>`
            :(aux?`<span class="inv" style="color:var(${M.col});border:1px solid var(${M.col})">참고</span>`:"")}</div>
   <div class="q">${s.q[k]}</div>
   <div class="scoreline"><span class="v" style="color:var(${b.c})">${v==null?"—":v.toFixed(1)}</span><span class="d">/10</span>

     ${(dlt!=null&&Math.abs(dlt)>=0.05)?`<span class="d">${dlt>0?"▲":"▼"} ${Math.abs(dlt).toFixed(1)}</span>`:`<span class="d">—</span>`}
     <span style="flex:1"></span><span class="state" style="color:var(${b.c});background:var(${b.t})">${b.label}</span></div>
   <div class="meter"><i style="width:${fillOf(s,L)}%;background:var(${b.c})"></i><u style="left:50%"></u></div>
   <div class="sub"><span>${tagOf(s,L)?tagOf(s,L)+" · ":""}${sub}</span></div>
   ${(s.k==="s6"&&p!=null&&p>=HOT6)?`<div class="cau">⚠ <b>과열 구간</b> (p${HOT6} 이상) — 검증상 이 구간에서 새로 나온 눌림목 신호는
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
  document.getElementById(k+"_tbl").innerHTML=`<table class="t10" style="min-width:${M.aux?900:840}px">
   <thead><tr><th>날짜</th>${M.specs.map(s=>`<th style="text-align:right">${s.idx}</th>`).join("")}
   <th>국면</th><th>④×⑥ 사분면</th><th style="text-align:right">${M.pxLabel}</th></tr></thead><tbody>${body}</tbody></table>
   <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:10px;font-size:11px;color:var(--muted);font-family:var(--mono)">
   ${M.specs.map(s=>`<span>${s.idx} ${s.nm}</span>`).join("")}</div>`;})();

 /* 4분면 */
 (function(){const svg=document.getElementById(k+"_quad"),W=420,Hh=380,m={l:44,r:14,t:14,b:40},TH=5;
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
  const xl=el("text",{x:(m.l+W-m.r)/2,y:Hh-6,"text-anchor":"middle","font-size":10.5,fill:"var(--ink2)"});xl.textContent="④ Breakout 지속성 (원점수 · 5.0=손익분기)";svg.appendChild(xl);
  const yl=el("text",{x:-((m.t+Hh-m.b)/2),y:12,"text-anchor":"middle","font-size":10.5,fill:"var(--ink2)",transform:"rotate(-90)"});yl.textContent="⑥ Mean-Reversion (원점수)";svg.appendChild(yl);
  const tr=H.slice(-120).filter(r=>r.s4!=null&&r.s6!=null);
  if(!tr.length) return;
  svg.appendChild(el("path",{d:tr.map((r,i)=>`${i?"L":"M"}${x(r.s4).toFixed(1)},${y(r.s6).toFixed(1)}`).join(""),fill:"none",stroke:"var(--muted)","stroke-width":1,opacity:.35}));
  tr.forEach((r,i)=>{const c=el("circle",{cx:x(r.s4),cy:y(r.s6),r:i===tr.length-1?0:2.2,fill:"var(--muted)",opacity:(0.08+0.52*i/tr.length).toFixed(2)});
   c.addEventListener("mousemove",e=>showTip(e,`${r.date}\n④ ${r.s4.toFixed(1)}\n⑥ ${r.s6.toFixed(1)}`));
   c.addEventListener("mouseleave",hideTip);svg.appendChild(c);});
  const last=tr[tr.length-1];
  svg.appendChild(el("circle",{cx:x(last.s4),cy:y(last.s6),r:7.5,fill:"var(--surface)"}));
  svg.appendChild(el("circle",{cx:x(last.s4),cy:y(last.s6),r:5,fill:`var(${PAYOFF_BANDS.find(b=>Math.max(last.s4,last.s6)>=b.min).c})`}));
  const near=last.s4>7.8, hi=last.s6>8.8;
  const t=el("text",{x:x(last.s4)+(near?-11:11),y:hi?y(last.s6)+18:y(last.s6)-8,
    "text-anchor":near?"end":"start","font-size":10.5,"font-weight":600,fill:"var(--ink)","font-family":"var(--mono)"});
  t.textContent=D.asof;svg.appendChild(t);})();

 (function(){const e4=L.e4,e6=L.e6;
  document.getElementById(k+"_quadtbl").innerHTML=`<table>
   <thead><tr><th>이벤트 통계</th><th style="text-align:right">④ 돌파</th><th style="text-align:right">⑥ 눌림목</th></tr></thead><tbody>
   <tr><td>표본 수 (최근 ${e4?e4.window:"-"}거래일)</td><td class="n">${e4?e4.n:"—"}</td><td class="n">${e6?e6.n:"—"}</td></tr>
   <tr><td>5일 후 성공률</td><td class="n">${e4?e4.hit+"%":"—"}</td><td class="n">${e6?e6.hit+"%":"—"}</td></tr>
   <tr><td>5일 평균수익률</td>
     <td class="n" style="color:var(${(e4&&e4.avg_ret>=0)?"--s-ok":"--s-bad"})">${e4?(e4.avg_ret>0?"+":"")+e4.avg_ret+"%":"—"}</td>
     <td class="n" style="color:var(${(e6&&e6.avg_ret>=0)?"--s-ok":"--s-bad"})">${e6?(e6.avg_ret>0?"+":"")+e6.avg_ret+"%":"—"}</td></tr>
   <tr><td>점수 / 백분위</td><td class="n" style="font-weight:600">${e4?e4.score.toFixed(2):"—"} <span style="color:var(--muted);font-size:10px">p${L.p4??"—"}</span></td>
       <td class="n" style="font-weight:600">${e6?e6.score.toFixed(2):"—"} <span style="color:var(--muted);font-size:10px">p${L.p6??"—"}</span></td></tr></tbody></table>
   <p style="color:var(--muted);font-size:12px;margin:14px 0 0;line-height:1.65">
    <b style="color:var(--ink2)">돌파 정의</b> — 종가가 직전 50거래일 최고가를 상향 돌파 + 당일 거래량이 50일 평균의
    <b style="color:var(${M.col})">${k==="kr"?"2.0배":"1.5배"}</b> 이상.${k==="kr"?" 상·하한가 근접봉(일간 ±29% 이상)과 거래정지일 제외.":""}
    동일 종목 5거래일 내 중복 제거.<br>
    <b style="color:var(--ink2)">눌림목 정의</b> — 50DMA&gt;200DMA이고 종가&gt;200DMA인 종목의 RSI(5)&lt;30.<br>
    두 지표 모두 5거래일 forward 관측이 필요해 <b style="color:var(--ink2)">최근 5거래일 신호는 미반영</b>이다.</p>`;})();

 /* small multiples */
 const PW=1120,PH=150,PM={l:36,r:16,t:12,b:20};
 const px=i=>PM.l+(i/(N-1))*(PW-PM.l-PM.r), py=v=>PH-PM.b-(v/10)*(PH-PM.t-PM.b);
 document.getElementById(k+"_sm").innerHTML=M.specs.map(s=>`
  <div class="panel"><div class="plabel">
   <span>${s.idx} ${s.nm}${s.inv?` <span style="color:var(${M.col});font-size:10px">역방향</span>`:""}</span>
   <span class="num" id="${k}_pv_${s.k}" style="color:var(${bandOf(s,L).c})">${L[s.k]==null?"—":L[s.k].toFixed(1)}</span></div>
  <svg id="${k}_p_${s.k}" viewBox="0 0 ${PW} ${PH}" style="width:100%;display:block"></svg></div>`).join("");
 M.specs.forEach(s=>{const svg=document.getElementById(`${k}_p_${s.k}`),col=`var(${bandOf(s,L).c})`;
  svg.appendChild(el("rect",{x:PM.l,y:py(10),width:PW-PM.l-PM.r,height:py(0)-py(10),fill:"var(--surface2)"}));
  [0,2.5,5,7.5,10].forEach(v=>{svg.appendChild(el("line",{x1:PM.l,x2:PW-PM.r,y1:py(v),y2:py(v),
    stroke:v===5?"var(--muted)":"var(--line)","stroke-width":v===5?1:.6,"stroke-dasharray":v===5?"4 3":"",opacity:v===5?.55:1}));
   const t=el("text",{x:PM.l-6,y:py(v)+3.5,"text-anchor":"end","font-size":9,fill:"var(--muted)","font-family":"var(--mono)"});
   t.textContent=v; svg.appendChild(t);});
  H.forEach((r,i)=>{if(i%21===0||i===N-1){
   svg.appendChild(el("line",{x1:px(i),x2:px(i),y1:PM.t,y2:py(0),stroke:"var(--line)","stroke-width":.5}));
   const t=el("text",{x:px(i),y:PH-6,"text-anchor":i===N-1?"end":"middle","font-size":9,fill:"var(--muted)","font-family":"var(--mono)"});
   t.textContent=r.date.slice(2,7); svg.appendChild(t);}});
  const pts=H.map((r,i)=>r[s.k]==null?null:[px(i),py(r[s.k])]).filter(Boolean);
  if(!pts.length) return;
  const d=pts.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join("");
  svg.appendChild(el("path",{d:d+`L${pts[pts.length-1][0].toFixed(1)},${py(0)}L${pts[0][0].toFixed(1)},${py(0)}Z`,fill:col,opacity:.12}));
  svg.appendChild(el("path",{d,fill:"none",stroke:col,"stroke-width":1.8,"stroke-linejoin":"round","stroke-linecap":"round"}));
  const lp=pts[pts.length-1];
  svg.appendChild(el("circle",{cx:lp[0],cy:lp[1],r:4,fill:col,stroke:"var(--surface)","stroke-width":2}));
  svg.appendChild(el("line",{id:`${k}_g_${s.k}`,x1:0,x2:0,y1:PM.t,y2:py(0),stroke:"var(--ink)","stroke-width":1,opacity:0}));});
 (function(){const host=document.getElementById(k+"_sm"),ro=document.getElementById(k+"_readout");
  host.addEventListener("mousemove",ev=>{
   const r=document.getElementById(`${k}_p_s1`).getBoundingClientRect();
   let i=Math.round((((ev.clientX-r.left)/r.width*PW)-PM.l)/(PW-PM.l-PM.r)*(N-1));
   i=Math.max(0,Math.min(N-1,i)); if(isNaN(i))return; const row=H[i];
   M.specs.forEach(s=>{const g=document.getElementById(`${k}_g_${s.k}`); if(!g)return;
    g.setAttribute("x1",px(i));g.setAttribute("x2",px(i));g.setAttribute("opacity",.45);
    const c=document.getElementById(`${k}_pv_${s.k}`);
    c.textContent=row[s.k]==null?"—":row[s.k].toFixed(1);
    c.style.color=`var(${bandOf(s,row).c})`;});
   ro.textContent=`${row.date}   ${row.regime}${row.choppy?" (Choppy)":""} / ${row.quad}   ·   ${M.pxLabel} ${row[M.px]}   ·   20DMA 위 ${row.a20}%`;});
  host.addEventListener("mouseleave",()=>{M.specs.forEach(s=>{const g=document.getElementById(`${k}_g_${s.k}`); if(g)g.setAttribute("opacity",0);
   const c=document.getElementById(`${k}_pv_${s.k}`);c.textContent=L[s.k]==null?"—":L[s.k].toFixed(1);
   c.style.color=`var(${bandOf(s,L).c})`;});ro.innerHTML="&nbsp;";});})();

 /* 지수 차트 */
 (function(){const svg=document.getElementById(k+"_chart"),W=1120,Hh=190,m={l:52,r:10,t:10,b:34},rib=22,plotB=Hh-m.b-rib-6;
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
  const vlab=document.getElementById(k+"_pxval");
  hit.addEventListener("mousemove",ev=>{const r=svg.getBoundingClientRect();
   let i=Math.round((((ev.clientX-r.left)/r.width*W)-m.l)/(W-m.l-m.r)*(N-1));
   i=Math.max(0,Math.min(N-1,i));const row=H[i];
   showTip(ev,`${row.date}\n${M.pxLabel} ${row[M.px]}${M.px2?`\n${M.px2Label} ${row[M.px2]}`:""}\n${row.regime}${row.choppy?" (Choppy)":""}`);
   vlab.textContent=`${row.date}  ${row[M.px]}`;});
  hit.addEventListener("mouseleave",()=>{hideTip();vlab.textContent=`${D.asof}  ${H[N-1][M.px]}`;});
  svg.appendChild(hit); vlab.textContent=`${D.asof}  ${H[N-1][M.px]}`;
  document.getElementById(k+"_legend").innerHTML=Object.entries(REGIME_C).map(([kk,v])=>
   `<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:11px;height:11px;background:var(${v});display:inline-block;border-radius:2px"></i>${kk}</span>`).join("")
   +`<span style="display:inline-flex;align-items:center;gap:5px"><i style="width:11px;height:4px;background:var(--s-weak);display:inline-block"></i>Choppy (⑤≥6, 띠 위 얇은 선)</span>`;})();

 /* Breadth 분리 (한국) */
 if(M.split)(function(){const svg=document.getElementById(k+"_bsplit"),W=520,Hh=230,m={l:32,r:88,t:10,b:26};
  const x=i=>m.l+(i/(N-1))*(W-m.l-m.r), y=v=>Hh-m.b-(v/10)*(Hh-m.t-m.b);
  [0,2.5,5,7.5,10].forEach(v=>{svg.appendChild(el("line",{x1:m.l,x2:W-m.r,y1:y(v),y2:y(v),stroke:"var(--line)","stroke-width":v===5?1:.6,"stroke-dasharray":v===5?"3 3":""}));
   const t=el("text",{x:m.l-5,y:y(v)+3.5,"text-anchor":"end","font-size":8.5,fill:"var(--muted)","font-family":"var(--mono)"});t.textContent=v;svg.appendChild(t);});
  [["b_ks","KOSPI","var(--kr)"],["b_kq","KOSDAQ","var(--s-weak)"]].forEach(([kk,lab,col])=>{
   const pts=H.map((r,i)=>r[kk]==null?null:[x(i),y(r[kk])]).filter(Boolean);
   svg.appendChild(el("path",{d:pts.map((p,i)=>`${i?"L":"M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(""),fill:"none",stroke:col,"stroke-width":1.7,"stroke-linejoin":"round"}));
   const lp=pts[pts.length-1];
   svg.appendChild(el("circle",{cx:lp[0],cy:lp[1],r:3.2,fill:col,stroke:"var(--surface)","stroke-width":2}));
   const t=el("text",{x:lp[0]+7,y:lp[1]+3.5,"font-size":10.5,fill:col,"font-weight":600});t.textContent=`${lab} ${H[N-1][kk].toFixed(1)}`;svg.appendChild(t);});
  H.forEach((r,i)=>{if(i%42===0||i===N-1){const t=el("text",{x:x(i),y:Hh-8,"text-anchor":i===N-1?"end":"middle","font-size":9,fill:"var(--muted)","font-family":"var(--mono)"});t.textContent=r.date.slice(2,7);svg.appendChild(t);}});
  const gap=(L.b_ks-L.b_kq).toFixed(2);
  document.getElementById(k+"_bnote").innerHTML=`KOSPI ${L.b_ks} vs KOSDAQ ${L.b_kq} — 격차 <b style="color:var(${gap>0?"--kr":"--s-weak"})">${gap>0?"+":""}${gap}</b>. `+
   (gap>1?"대형주만 버티고 중소형은 무너진 구조다. 통합 Breadth만 보면 놓친다."
    :gap<-1?"코스닥이 오히려 강하다. 중소형 주도 국면일 수 있다.":"두 시장이 비슷하게 움직이고 있다.");})();

 /* 섹터/업종 막대 */
 (function(){const svg=document.getElementById(k+"_sect"),W=420,Hh=300,m={l:80,r:38,t:6,b:22};
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
   document.getElementById(k+"_chk").innerHTML=`<table><thead><tr><th>조건</th><th style="text-align:right">SPY</th><th style="text-align:right">QQQ</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  } else {
   const mk=(title,det)=>{rows.push(`<tr><td colspan="2" style="padding-top:12px;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(${M.col});border-bottom:1px solid var(--line)">${title}</td></tr>`);
    Object.entries(det.checks).forEach(([kk,v])=>{
     const f=typeof v==="number"?(v===1?'<span class="tick yes">●●</span>':v===.5?'<span class="tick" style="color:var(--s-weak)">●○</span>':'<span class="tick no">○○</span>')
                                :(v?'<span class="tick yes">✓</span>':'<span class="tick no">✗</span>');
     rows.push(`<tr><td>${kk}</td><td class="n">${f}</td></tr>`);});
    rows.push(`<tr><td style="font-weight:600">소계</td><td class="n" style="font-weight:600">${det.raw} / 5 → ${(det.raw*2).toFixed(1)}점</td></tr>`);};
   mk("① 중장기 Trend",L.d1); mk("② 단기 Trend",L.d2);
   document.getElementById(k+"_chk").innerHTML=`<table><thead><tr><th>조건</th><th style="text-align:right">${M.pxLabel}</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
  }})();
}
MKS.forEach(renderMarket);

/* ---------- 방법론 ---------- */
const BH=(labels)=>`<div style="display:flex;flex-wrap:wrap;gap:5px">`+
 labels.map((t,i)=>`<span style="font-size:11px;font-family:var(--mono);padding:2px 7px;border-radius:3px;color:var(${CS[i][0]});background:var(${CS[i][1]})">${t}</span>`).join("")+`</div>`;
const BAND_TREND=BH(["7.5~10 강함","6.0~7.5 양호","4.0~6.0 중립","2.5~4.0 약함","0~2.5 취약"]);
const BAND_PAYOFF=BH(["6.5~10 강함","5.5~6.5 양호","4.5~5.5 중립","3.5~4.5 약함","0~3.5 취약"]);
const MKNAME={us:"미국",kr:"한국",cn:"중국"};
const dtag=(k,txt)=>`<div class="mkdiff"><span class="lbl" style="color:var(--${k});background:var(--${k}-soft)">${MKNAME[k]}</span>${txt}</div>`;
document.getElementById("method").innerHTML=[
 ["①","중장기 Trend","조건 5개","큰 상승추세가 살아 있는가?",
  `<ul><li>종가 &gt; 200DMA</li><li>종가 &gt; 50DMA</li><li>50DMA &gt; 200DMA</li>
   <li>50DMA 상승 — 오늘 &gt; 5거래일 전</li><li>HH/HL 구조 (각 0.5, 합 1)</li></ul>
   <p style="color:var(--muted);font-size:12px">HH/HL은 최근 120거래일에서 좌우 5봉 프랙탈로 스윙 고·저점을 뽑아 판정.</p>`,
  dtag("us","SPY 5점 + QQQ 5점 = 10점")+dtag("kr","KOSPI 단독이라 조건당 2점 = 10점")
  +dtag("cn","과창50 ETF(588000, CNY) 단독 — 과창판지수 직접 조회 경로가 없어 프록시로 쓴다. 조건당 2점")],
 ["②","단기 Trend","조건 5개","최근 1~3주에도 상승 방향성이 유지되는가?",
  `<ul><li>종가 &gt; 5DMA / 10DMA / 20DMA</li><li>5DMA &gt; 10DMA</li><li>10DMA &gt; 20DMA</li></ul>
   <p style="color:var(--muted);font-size:12px">①이 높은데 ②만 낮으면 추세 내 조정, 둘 다 낮으면 추세 훼손.</p>`,
  dtag("kr","한국 일봉은 간밤 미국장을 갭으로 반영하고 시작한다. ②는 상당 부분 미국 지수의 지연 신호다.")
  +dtag("cn","중국은 자본통제로 미국장과의 동조가 한국보다 약하다. 대신 정책 이벤트에 계단식으로 반응한다.")],
 ["③","Breadth","10점","얼마나 많은 종목이 상승에 참여하는가?",
  `<div class="formula">Breadth = (20DMA 상회% + 50DMA 상회%) ÷ 2 ÷ 10</div>
   <p style="color:var(--muted);font-size:12px">수준보다 방향이 중요하다. 지수는 신고가인데 ③이 내려가는 조합이 가장 값진 경고 신호다.</p>`,
  dtag("us","S&P500 구성종목 전체")+dtag("kr","KRX300은 KOSPI·KOSDAQ 혼합이라 시장별로 따로 산출해 격차까지 본다.")
  +dtag("cn","과창판 전 종목. 지수(상위 50)보다 넓은 모집단을 재는 셈이다 — KRX300 vs KOSPI와 같은 관계.")],
 ["④","Breakout 지속성","10점 · 5일 지연","돌파주를 사면 5일 뒤에도 벌고 있는가?",
  `<div class="formula">돌파 = 종가 &gt; 직전 50일 최고가
       AND 거래량 &gt; 50일 평균 × (배수)

점수 = 생존율×10 × 0.6 + 수익률점수 × 0.4
수익률점수 = clip(5 + 2×5일평균수익률%, 0, 10)</div>`,
  dtag("us","거래량 1.5배")+dtag("kr","회전율이 높아 2.0배, 상·하한가 근접봉(±29% 이상)과 거래정지일 제외")
  +dtag("cn","거래량 2.0배. 과창판 가격제한은 <b>±20%</b>(일반 A주 ±10%)라 ±19% 이상 봉을 제외한다.")],
 ["⑤","Rotation 강도","10점 · 역방향","주도 섹터가 계속 주도하는가?",
  `<div class="formula">1. 섹터별 5일 수익률 − 지수 5일 수익률
2. 오늘 순위 vs 5거래일 전 순위의 스피어만 ρ
3. Rotation = (1 − ρ) ÷ 2 × 10
4. 분산 축소: 5 + (Rotation−5) × min(1, σ/σ_ref)
     σ     = 이번 기간 섹터 상대수익률 표준편차
     σ_ref = 과거 누적 중앙값 (expanding)
5. 3일 평활</div>
   <p style="color:var(--muted);font-size:12px">유일한 역방향 지표다. 원점수는 높을수록 나쁘고, 막대와 p는 반전 표시(↕).</p>
   <h4>왜 분산 축소를 넣었나</h4>
   <div class="diff">섹터들이 서로 1%p 안에 몰려 있으면 순위는 잡음이다. 실제로 <b>분산 하위 25%인 날에도 ⑤가 1.0~8.1 사이 아무 값이나 찍었다</b>(미국).
   분산이 평소보다 작으면 판정을 중립(5) 쪽으로 당긴다 — 축소만 하고 증폭은 하지 않는다.
   순위상관 대신 <b>값상관(피어슨)</b>도 시험했으나 둘의 상관이 미국 +0.92 · 한국 +0.90으로 거의 같아 실익이 없었다.
   크기를 제대로 반영하는 역할은 ⑦이 맡는다.</div>`,
  dtag("us","GICS 11개 섹터 ETF (XLK·XLF·XLE 등)")+dtag("kr","KRX300 구성종목을 업종으로 묶어 시총가중 직접 산출. 실제 산출 업종 10개.")
  +dtag("cn","같은 방식이나 <b>과창판은 정보기술·산업재·헬스케어 편중</b>이라 5종목 이상인 섹터가 6개뿐이다. ⑤⑦의 정보량이 다른 두 시장보다 구조적으로 낮다.")],
 ["⑥","Mean-Reversion","10점 · 5일 지연","추세주가 눌렸을 때 사면 반등하는가?",
  `<ul><li>50DMA &gt; 200DMA</li><li>종가 &gt; 200DMA</li><li>RSI(5) &lt; 30 (Wilder)</li></ul>
   <div class="formula">점수 = 성공률×10 × 0.6 + 수익률점수 × 0.4</div>
   <p style="color:var(--muted);font-size:12px">아무 낙폭과대주가 아니라 추세가 살아 있는 종목의 눌림목만 센다.</p>
   <h4>지속성 검증 결과</h4>
   <div class="cau">⑥ 점수는 <b>다음</b> 신호의 성과를 예측하지 못한다. 오히려 약한 역방향이다 —
     화면 백분위 60p 이상에서 나온 눌림목 신호의 승률이 60p 미만보다 <b>3%p 이상 낮았고</b>(미국 51.5% vs 54.8%,
     한국 51.7% vs 55.1%), 미국 최상위 분위(p80~100)는 48.2%로 다른 구간(54~56%)보다 확연히 낮았다.
     ⑥이 높다는 건 반등이 이미 진행됐다는 뜻이므로 <b>p85 이상은 과열 경고로 표시</b>한다.
     표본: 미국 5,952건·한국 3,793건이나 같은 날 신호가 겹쳐 실질 독립 표본은 약 100구간 수준.</div>`,
  dtag("us","동일")+dtag("kr","동일")],
 ["⑦","섹터 모멘텀 캐리","10점 · 실현치","주도 섹터를 따라가면 실제로 돈이 되는가?",
  `<div class="formula">LC = 5거래일 전 상위 2개 섹터를 그대로 들고 갔을 때
     이번 5일 지수 대비 수익률 (%p)

정규화: z = LC ÷ σ    (σ = 섹터 상대수익률 표준편차)
점수  = clip(5 + 5 × (최근 21일 z 평균), 0, 10)</div>
   <p style="color:var(--muted);font-size:12px">계수 5는 눈금 맞추기용이다. z를 21일 평균내면 표준편차가 1/√21로 줄어
   계수 2로는 점수가 4~6에 갇혀 차트가 평평해진다. <b>부호와 손익분기점(5.0)은 그대로다.</b></p>
   <p style="color:var(--muted);font-size:12px">분산이 없으면 LC도 0이 된다 — 순위가 유지돼도 폭이 없으면 캐리가 없다는 점이 구조적으로 반영된다.
   ④⑥과 달리 <b>forward 관측이 필요 없어 지연이 없다</b>(보유 구간이 이미 끝난 값이다).</p>
   <h4>왜 상위 2개인가</h4>
   <div class="diff">k=1~4를 모두 재봤다. <b>k=1은 잡음</b>이다 — 표준편차가 미국 2.72·한국 4.85로 튀어 t값이 −0.15~−0.34에 그친다.
   한국은 <b>k=2에서 신호가 가장 선명하다</b>(LC 평균 −0.163%p vs k=3의 −0.110%p) — 집중할수록 더 크게 깨진다는 뜻으로,
   회전율 높은 시장 성격과 맞는다. 미국은 k=2~4의 평균이 −0.17~−0.19로 거의 같고 k=3~4가 노이즈만 약간 낮다.
   두 방식의 점수 시계열 상관이 미국 0.94·한국 0.93이라 날마다 읽는 값은 사실상 같으므로,
   <b>실제 운용에 더 가까운 2개</b>를 택했다.
   <span style="color:var(--muted)">※ ⑤의 "Top3 유지" 표시는 로테이션 서술용이라 3개 기준 그대로다.</span></div>
   <h4>검증 결과</h4>
   <div class="diff"><b>두 시장 모두 섹터 모멘텀은 5일 지평에서 돈이 되지 않았다.</b>
   상위 2개 기준 LC 평균 미국 −0.174%p · 한국 −0.163%p, 플러스 비율 48.1% / 49.7%.
   게다가 <b>분산이 클수록 더 나빴다</b> — 미국 분산 상위25% 구간이 하위25%보다 확연히 부진했다.
   "주도 섹터가 뚜렷하니 거기 실으라"는 판단은 최소한 이 지평에서 근거가 약하다.</div>`,
  dtag("us","GICS 11개 섹터 ETF · 표시계수 k=5")+dtag("kr","KRX300 업종 10개 · k=5")
  +dtag("cn","과창판 섹터 6개 · <b>k=2</b> — 섹터가 적어 상위 2개가 시장 전체와 가까운 탓에 z가 크게 나온다. k=5를 쓰면 500일 중 205일이 상하한에 걸렸다.")],
 ["⑧","외국인 수급","10점 · 참고 지표","외국인 지분율이 오르는 종목이 늘고 있는가?",
  `<div class="formula">비율 = 외국인소진율이 20거래일 전보다
       높은 종목의 비율 (%)
점수 = clip(5 + 2.5 × (비율÷10 − 5), 0, 10)</div>
   <p style="color:var(--muted);font-size:12px">이 비율은 자연 변동폭이 좁아(표준편차 0.63) 그대로 쓰면 항상 5 근처에 머문다.
   5.0(=절반)을 축으로 2.5배 확대해 표시하고, <b>원비율은 카드 보조줄에 그대로</b> 남긴다.</p>`,
  dtag("us","대응물 없음 — 산출하지 않는다.")+dtag("kr","국면 분류·사분면 판정에는 쓰지 않고 참고로만 둔다.")
  +dtag("cn","후강퉁 수급 데이터 경로가 없어 산출하지 않는다.")],
].map(([i,nm,mx,q,body,diff])=>{const pct=["④","⑥","⑦","⑧"].includes(i);
 return `<article class="mcard">
  <div class="mhead"><span class="midx">${i}</span><h3>${nm}</h3><span class="mmax">${mx}</span></div>
  <div class="mq">${q}</div>${body}
  <h4>해석 — 원점수${pct?" (5.0 = 손익분기)":""}</h4>${pct?BAND_PAYOFF:BAND_TREND}
  <h4>시장별 차이</h4><div style="display:flex;flex-direction:column;gap:5px">${diff}</div></article>`;}).join("")
 + `<article class="mcard"><div class="mhead"><h3>국면 분류 — 지수 이평 배열 기준</h3></div>
   <div class="formula">Power Trend      : 완전 정배열 (종가&gt;20MA&gt;50MA&gt;200MA)
                   &amp; 50MA 상승(5일) &amp; 200MA 상승(21일)
                   &amp; ③ ≥ 5.0
Uptrend          : 종가&gt;200MA &amp; 50MA&gt;200MA
Severe Downtrend : 완전 역배열 (종가&lt;20MA&lt;50MA&lt;200MA)
Downtrend        : 종가&lt;200MA &amp; 50MA&lt;200MA
Neutral          : 그 외 (이평이 엇갈린 전환 구간)

Choppy 플래그 (별도 축) : ⑤ ≥ 6.0</div>
   <p><b>추세 축과 로테이션 축을 분리했다.</b> 이전에는 Choppy가 추세 라벨과 같은 칸에 있어
   상승 구간을 덮어썼다 — 2026년 4~6월 S&amp;P 500이 +14% 오르는 동안 Choppy·Neutral로 찍힌 것이 그 예다.
   지금은 추세를 이평 배열로 판정하고, 로테이션이 심하면 <b>CHOPPY 배지</b>를 덧붙인다.</p>
   <p style="color:var(--muted);font-size:12px">기준 지수는 미국 SPY · 한국 KOSPI · 중국 과창50 ETF(588000).
   ③ 하한 5.0은 두 시장 공통 — breadth 분포가 사실상 같다(중앙값 미국 5.74 / 한국 5.18).</p></article>`
+ `<article class="mcard"><div class="mhead"><h3>④ × ⑥ 사분면</h3></div>
   <div class="formula">경계 = 원점수 5.0 (손익분기)
 ④≥5 &amp; ⑥≥5 → 양방향 우호
 ④≥5 &amp; ⑥&lt;5 → 돌파 추격 우위
 ④&lt;5 &amp; ⑥≥5 → 눌림목 매수 우위
 ④&lt;5 &amp; ⑥&lt;5 → 관망 / 포지션 축소</div>
   <p>④⑥⑦은 산식상 <b>5.0이 손익분기</b>다 — 승률 50%에 5일 수익률 0%면 정확히 5.0이 나온다.
   따라서 5.0 아래는 "그 전략이 최근 실제로 돈을 잃었다"는 뜻이고 시장과 무관하게 성립한다.
   백분위(p)는 "이 시장 평소 대비 어디쯤인가"라는 <b>다른 질문</b>에 답하므로 보조줄에만 남겼다.</p></article>`;

document.getElementById("limits").innerHTML=`<ul>
<li><b>데이터</b> — 미국: S&P500 구성종목 ${DATA.us.n_universe}개 + SPY·QQQ + GICS 11개 섹터 ETF (Nasdaq historical API).
 한국: KRX300 ${DATA.kr.n_universe}개(KOSPI ${DATA.kr.n_kospi} · KOSDAQ ${DATA.kr.n_kosdaq}) + KOSPI·KOSDAQ 지수
 (구성종목 RISE KRX300 ETF PDF, 시세·외국인소진율 Naver Finance).
 중국: 과창판 전 종목 ${DATA.cn.n_universe}개 + 과창50 ETF(588000) — 구성종목·시세·섹터 모두 stockanalysis.com.</li>
<li><b>중국 지수는 프록시다</b> — 과창판지수(000688)를 직접 주는 경로가 이 환경에 없어 <b>화샤 상증과창판50 ETF(588000, CNY)</b>로 대체했다.
 같은 통화·같은 거래시간이라 이평 구조 판정에는 문제없으나, ETF 추적오차와 배당 재투자분이 미세하게 섞인다.</li>
<li><b>기준일이 다르다</b> — 미국 ${DATA.us.asof} / 한국 ${DATA.kr.asof} / 중국 ${DATA.cn.asof}.
 갱신 시각이 시장별로 다르고(미국 07:45 · 한국 16:00 KST) 휴장일도 달라(춘절 등) 하루씩 어긋날 수 있다. 상단 칩에서 각 시장 기준일을 확인할 것.
 ${DATA.us.quality&&DATA.us.quality.startsWith("잠정")?"현재 미국 기준일은 <b>잠정 종가</b>(정식 확정 전)다.":""}</li>
<li><b>읽는 규칙은 하나다</b> — 여덟 지표 전부 0~10 원점수이고 <b>5.0이 중립선</b>이다.
 ①②③⑤는 조건 충족 개수·비율이라 5.0이 절반을 뜻하고, ④⑥⑦⑧은 산식상 5.0이 <b>손익분기</b>다(승률 50% + 수익률 0%).
 5.0 아래면 그 전략이 최근 실제로 손실이었다는 뜻이다.</li>
<li><b>⑦⑧은 눈금을 확대해 표시한다</b> — 두 지표는 산출값의 자연 변동폭이 다른 지표의 1/3 수준이라
 그대로 그리면 차트가 평평해진다. 5.0을 축으로 ⑦은 5배, ⑧은 2.5배 확대했다.
 <b>부호·손익분기점·순위는 변하지 않으며</b>, 원수치(21일 평균 캐리 %p, 외국인 상승 비율 %)는 카드 보조줄에 그대로 있다.</li>
<li><b>백분위(p)는 보조 정보</b> — ④⑥⑦⑧ 보조줄의 p 값은 "이 시장 평소 대비 어디쯤인가"라는 별개 질문에 답한다.
 원점수가 절대적 손익을, p가 상대적 위치를 말한다. 판단은 원점수로 하고 p는 맥락으로 본다.</li>
<li><b>국면 라벨은 예측이 아니라 서술이다</b> — 검증 결과 이평 배열 기준 국면도 다음 21·63일 수익률을 안정적으로 예측하지 못했다.
 한국은 정배열 구간이 비정배열보다 21일 +4.9%p 앞섰지만, 미국은 오히려 −1.8%p로 뒤집혔다.
 라벨은 <b>지금 시장이 어떤 상태인지</b>를 정확히 부르기 위한 것이지, 다음 움직임을 맞히기 위한 것이 아니다.</li>
<li><b>기준선이 움직인다</b> — 백분위 기준이 롤링 2년이므로 시장 성격이 바뀌면 밴드도 함께 이동한다.
 "예전보다 나아졌다"가 아니라 "최근 2년 안에서 어디쯤인가"로 읽어야 한다.</li>
<li><b>시점 불일치</b> — ①②③⑤⑦⑧은 당일 지표이나 <b>④⑥은 5거래일 forward 관측이 필요해 구조적으로 지연</b>된다.
 한 화면에 있지만 같은 시점의 정보가 아니다.</li>
<li><b>표본 하한</b> — ④⑥은 최근 21거래일 표본이 20건 미만이면 63거래일로 확장, 그래도 8건 미만이면 N/A.
 한국은 유니버스가 300종목이라 미국(500종목)보다 표본이 얇아 확장이 더 자주 발동된다.</li>
<li><b>생존편향</b> — 현재 구성종목으로 과거를 채점하므로 ③④는 과거 구간에서 다소 과대평가된다.
 실시간 국면 판단에는 무해하나 임계값을 과거 성과로 최적화하는 데는 쓰지 않는 편이 좋다.</li>
<li><b>시장 간 중복</b> — 한국 일봉은 간밤 미국장을 갭으로 반영하므로 ②는 상당 부분 미국의 지연 신호다.
 중국은 자본통제로 그 동조가 약해 상대적으로 독립적인 신호를 준다.</li>
<li><b>중국은 ⑤⑦의 정보량이 낮다</b> — 과창판은 정보기술 231 · 산업재 137 · 헬스케어 111로 사실상 3개 섹터 시장이다.
 5종목 이상인 섹터가 6개뿐이라 섹터 로테이션 개념 자체가 다른 두 시장보다 약하게 성립한다.</li>
</ul>`;
