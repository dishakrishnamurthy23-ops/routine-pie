(function(){
const $=s=>document.querySelector(s);
const NS="http://www.w3.org/2000/svg";
const LS="routine-pie-v1";
const COLORS=CONFIG.colors.map(c=>c.name);
CONFIG.colors.forEach(c=>document.documentElement.style.setProperty("--c-"+c.name,c.hex));
const EMOJIS=CONFIG.doodles;
const WEEKDAYS=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
let S=null, tab="day", openId=null, dirty=false, saver=null, saveMode="checking", timer=null, confirmDel=null;

try{const h=location.hash.slice(1);if(["day","week","month","year"].includes(h))tab=h;else{const t=localStorage.getItem(LS+"-tab");if(t)tab=t;}}catch(e){}

/* ---------- helpers ---------- */
const uid=()=>Math.random().toString(36).slice(2,9);
const pad=n=>String(n).padStart(2,"0");
const dkey=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const toMin=t=>{const[a,b]=(t||"0:0").split(":").map(Number);return (a||0)*60+(b||0)};
const fmt=m=>{m=((m%1440)+1440)%1440;let h=Math.floor(m/60),mm=m%60,ap=h<12?"AM":"PM";h=h%12||12;return h+(mm?":"+pad(mm):"")+" "+ap};
const dur=m=>{const h=Math.floor(m/60),mm=m%60;return (h?h+"h ":"")+(mm||!h?mm+"m":"")};
const col=c=>"var(--c-"+(COLORS.includes(c)?c:"sky")+")";
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const el=(tag,attrs,parent)=>{const e=document.createElementNS(NS,tag);for(const k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e};
const P=(r,a)=>[r*Math.cos(a*Math.PI/180),r*Math.sin(a*Math.PI/180)];
function arc(r0,r1,a0,a1){
  if(a1-a0>=359.9)a1=a0+359.9;
  const L=a1-a0>180?1:0,[x0,y0]=P(r1,a0),[x1,y1]=P(r1,a1),[x2,y2]=P(r0,a1),[x3,y3]=P(r0,a0);
  return `M${x0} ${y0} A${r1} ${r1} 0 ${L} 1 ${x1} ${y1} L${x2} ${y2} A${r0} ${r0} 0 ${L} 0 ${x3} ${y3}Z`;
}
function sortedDay(){return [...S.day.slices].sort((a,b)=>toMin(a.start)-toMin(b.start))}
function nowMin(){const d=new Date();return d.getHours()*60+d.getMinutes()}
function curDaySlice(){
  const n=nowMin();
  return S.day.slices.find(s=>{let a=toMin(s.start),b=toMin(s.end);if(b<=a)b+=1440;return (n>=a&&n<b)||(n+1440>=a&&n+1440<b)});
}
function curIndex(){
  const d=new Date();
  if(tab==="week")return (d.getDay()+6)%7;
  if(tab==="month")return Math.min(4,Math.floor((d.getDate()-1)/7));
  if(tab==="year")return d.getMonth();
  return -1;
}
function handFrac(){
  const d=new Date(),dayFrac=(d.getHours()*60+d.getMinutes())/1440;
  if(tab==="day")return dayFrac;
  if(tab==="week")return (((d.getDay()+6)%7)+dayFrac)/7;
  if(tab==="month"){const days=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();const wk=Math.min(4,Math.floor((d.getDate()-1)/7));
    const start=wk*7+1,end=wk<4?wk*7+7:days;return (wk+((d.getDate()-start)+dayFrac)/Math.max(1,end-start+1))/5;}
  const daysIn=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();return (d.getMonth()+(d.getDate()-1+dayFrac)/daysIn)/12;
}
function doneToday(){return S.day.done[dkey(new Date())]||[]}
function habitsDoneToday(){return S.day.hdone[dkey(new Date())]||[]}
function habitChips(s){
  const hs=s.habits||[];if(!hs.length)return "";
  const hd=habitsDoneToday();
  return `<div class="habits">${hs.map(h=>{const on=hd.includes(h.id);
    return `<label class="hab${on?" on":""}"><input type="checkbox" class="chk hchk" data-hab="${h.id}" ${on?"checked":""}><span>${esc(h.t)||"habit"}</span></label>`}).join("")}</div>`;
}

/* ---------- wheel ---------- */
function wrapLines(text,max){
  const words=String(text).split(/\s+/);if(text.length<=max||words.length<2)return [text];
  let best=[text],bd=1e9;
  for(let i=1;i<words.length;i++){const a=words.slice(0,i).join(" "),b=words.slice(i).join(" "),d=Math.max(a.length,b.length);if(d<bd){bd=d;best=[a,b]}}
  return best;
}
function drawWheel(){
  const svg=$("#wheel");svg.innerHTML="";
  const defs=el("defs",{},svg);
  // colored-pencil hatch
  const pat=el("pattern",{id:"hatch",width:"6",height:"6",patternUnits:"userSpaceOnUse",patternTransform:"rotate(35)"},defs);
  el("line",{x1:"0",y1:"0",x2:"0",y2:"6",stroke:"#ffffff","stroke-width":"1.6","stroke-opacity":".35"},pat);
  const f=el("filter",{id:"wobble",x:"-5%",y:"-5%",width:"110%",height:"110%"},defs);
  el("feTurbulence",{type:"fractalNoise",baseFrequency:"0.035",numOctaves:"2",seed:"4"},f);
  el("feDisplacementMap",{in:"SourceGraphic",scale:"3.5"},f);

  const R0=36,R1=178,segs=[];
  if(tab==="day"){
    for(const s of S.day.slices){let a=toMin(s.start),b=toMin(s.end);if(b<=a)b+=1440;if(b-a<=0)continue;
      segs.push({s,a0:a/1440*360-90,a1:b/1440*360-90,label:s.label});}
  }else{
    const arr=S[tab].slices,n=arr.length;
    arr.forEach((s,i)=>segs.push({s,a0:i/n*360-90,a1:(i+1)/n*360-90,label:s.title||s.label}));
  }
  // background disc (shows uncovered hours)
  el("circle",{r:R1,class:"gap"},svg);
  const gSlices=el("g",{filter:"url(#wobble)"},svg);
  const gText=el("g",{},svg);
  const ci=curIndex(),cur=tab==="day"?curDaySlice():null,done=tab==="day"?doneToday():[];
  segs.forEach((g,i)=>{
    const isCur=tab==="day"?(cur&&cur.id===g.s.id):i===ci;
    const grp=el("g",{class:"slice-g"+(openId===g.s.id?" sel":""),tabindex:"0",role:"button","aria-label":(g.s.label||"")+" "+(g.label||"")},gSlices);
    const d=arc(R0,R1,g.a0,g.a1);
    el("path",{d,class:"slice",fill:col(g.s.color)},grp);
    el("path",{d,fill:"url(#hatch)","pointer-events":"none"},grp);
    if(isCur)el("path",{d:arc(R1+2,R1+9,g.a0,g.a1),fill:"var(--accent)"},grp);
    const go=()=>{openId=g.s.id;confirmDel=null;renderSide();drawWheel();const r=document.querySelector(`[data-row="${g.s.id}"]`);if(r)r.scrollIntoView({block:"nearest",behavior:"smooth"})};
    grp.addEventListener("click",go);grp.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();go()}});
    // text
    const span=g.a1-g.a0,mid=(g.a0+g.a1)/2,lab=g.label||"",isDone=done.includes(g.s.id);
    const tg=el("g",{class:isDone?"dim":""},gText);
    if(span>=40){
      const rr=span>120?98:108,[x,y]=P(rr,mid),lines=wrapLines(lab,11);
      const width=Math.min(rr*span*Math.PI/180*.75,150),longest=Math.max(...lines.map(l=>l.length),1);
      const fs=Math.max(12,Math.min(span>120?34:22,width/(longest*.5)));
      const em=el("text",{x,y:y-fs*(lines.length/2)-6,"text-anchor":"middle","font-size":Math.min(30,fs+8),class:"semo"},tg);em.textContent=g.s.emoji||"";
      lines.forEach((l,k)=>{const t=el("text",{x,y:y+fs*.35+(k-(lines.length-1)/2)*fs*1.05+6,"text-anchor":"middle","font-size":fs,class:"stxt"},tg);t.textContent=l});
    }else{
      const arcW=110*span*Math.PI/180;
      let fs=Math.min(17,arcW*.62),txt=lab;
      if(fs>=7.5){
        const maxLen=Math.floor(95/(fs*.48));if(txt.length>maxLen)txt=txt.slice(0,maxLen-1)+"…";
        const flip=mid>90&&mid<270,rot=flip?mid+180:mid,[x,y]=P(100,mid);
        const t=el("text",{x,y,"text-anchor":"middle","dominant-baseline":"central","font-size":fs,class:"stxt",transform:`rotate(${rot} ${x} ${y})`},tg);t.textContent=txt;
      }
      if(arcW>14){const [ex,ey]=P(158,mid);const em=el("text",{x:ex,y:ey,"text-anchor":"middle","dominant-baseline":"central","font-size":Math.min(20,arcW*.75),class:"semo"},tg);em.textContent=g.s.emoji||""}
    }
    if(isDone){const [cx,cy]=P(158,mid);const c=el("text",{x:cx+10,y:cy-10,"font-size":"18",fill:"var(--slice-ink)","text-anchor":"middle"},gText);c.textContent="✔"}
  });
  el("circle",{r:R1,class:"outer",filter:"url(#wobble)"},svg);
  // ring labels
  if(tab==="day"){
    for(let h=0;h<24;h++){const a=h/24*360-90,[x,y]=P(201,a),[x1,y1]=P(R1,a),[x2,y2]=P(R1+6,a);
      el("line",{x1,y1,x2,y2,stroke:"var(--ink)","stroke-width":"1.5"},svg);
      const t=el("text",{x,y,"text-anchor":"middle","dominant-baseline":"central",class:"ring-num"},svg);t.textContent=(h%12)||12;
      if(h===0||h===12){const [sx,sy]=P(222,a);const s=el("text",{x:sx,y:sy,"text-anchor":"middle","dominant-baseline":"central",class:"ring-num small"},svg);s.textContent=h?"noon":"midnight"}
    }
    const [mx,my]=P(222,0);el("text",{x:mx,y:my,"text-anchor":"middle","dominant-baseline":"central",class:"ring-num small"},svg).textContent="6 AM";
    const [ex,ey]=P(222,180);el("text",{x:ex,y:ey,"text-anchor":"middle","dominant-baseline":"central",class:"ring-num small"},svg).textContent="6 PM";
  }else{
    segs.forEach(g=>{const mid=(g.a0+g.a1)/2,[x,y]=P(203,mid);
      const t=el("text",{x,y,"text-anchor":"middle","dominant-baseline":"central",class:"ring-num","font-size":tab==="year"?"16":"18"},svg);t.textContent=g.s.label;
      const [x1,y1]=P(R1,g.a0),[x2,y2]=P(R1+8,g.a0);el("line",{x1,y1,x2,y2,stroke:"var(--ink)","stroke-width":"1.5"},svg)});
  }
  // hand + hub
  const ha=handFrac()*360-90,[hx,hy]=P(R1+14,ha);
  el("line",{x1:"0",y1:"0",x2:hx,y2:hy,class:"hand"},svg);
  el("circle",{cx:hx,cy:hy,r:"5",class:"handtip"},svg);
  el("circle",{r:R0,class:"hub",filter:"url(#wobble)"},svg);
  const d=new Date();let l1,l2;
  if(tab==="day"){const t=fmt(nowMin()).split(" ");l1=t[0];l2=t[1]}
  else if(tab==="week"){l1=WEEKDAYS[d.getDay()];l2="today"}
  else if(tab==="month"){l1=MONTHS[d.getMonth()].slice(0,3);l2=String(d.getFullYear())}
  else{l1=String(d.getFullYear());l2="year"}
  el("text",{y:"-2","text-anchor":"middle","font-size":l1.length>4?"17":"21",class:"hubtxt"},svg).textContent=l1;
  el("text",{y:"16","text-anchor":"middle","font-size":"12",class:"hubtxt"},svg).textContent=l2;
}

/* ---------- side panel ---------- */
function swatchHTML(s){return `<div class="swatches" role="group" aria-label="Colour">${COLORS.map(c=>`<button type="button" data-color="${c}" aria-label="${c}" aria-pressed="${s.color===c}" style="background:${col(c)}"></button>`).join("")}</div>`}
function emojiHTML(s){return `<div class="emojis" role="group" aria-label="Doodle">${EMOJIS.map(e=>`<button type="button" data-emoji="${e}" aria-pressed="${s.emoji===e}">${e}</button>`).join("")}</div>`}

function renderNow(){
  const box=$("#nowCard"),d=new Date();
  if(tab==="day"){
    const c=curDaySlice(),n=nowMin(),done=doneToday(),total=S.day.slices.length;
    let html=`<h2>Right now</h2>`;
    if(c){let a=toMin(c.start),b=toMin(c.end);if(b<=a)b+=1440;let nn=n<a?n+1440:n;const pct=Math.round((nn-a)/(b-a)*100);
      html+=`<div class="big"><span class="emo">${esc(c.emoji)}</span><div><div class="lbl">${esc(c.label)}</div><div class="meta">${fmt(a)} to ${fmt(b)} · ${dur(b-nn)} left</div></div></div><div class="bar"><i style="width:${pct}%"></i></div>`;
      if(c.note)html+=`<div class="meta">✎ ${esc(c.note)}</div>`;
      html+=habitChips(c);
    }else html+=`<div class="meta">Nothing planned for this time. Free slot!</div>`;
    const ups=sortedDay().filter(s=>!(c&&s.id===c.id)).map(s=>({s,diff:(toMin(s.start)-n+1440)%1440||1440})).sort((a,b)=>a.diff-b.diff).slice(0,2);
    if(ups.length)html+=`<div class="next next-list">${ups.map((u,k)=>`<div>${k?"Then":"Up next"}: <b>${esc(u.s.emoji)} ${esc(u.s.label)}</b> at ${fmt(toMin(u.s.start))} (in ${dur(u.diff)})</div>`).join("")}</div>`;
    const allH=S.day.slices.flatMap(s=>s.habits||[]),hd=habitsDoneToday().filter(id=>allH.some(h=>h.id===id)).length;
    // last 7 days
    html+=`<div class="streak"><span>Blocks done: ${done.length}/${total}${allH.length?` · Habits: ${hd}/${allH.length}`:""}</span>`;
    for(let i=6;i>=0;i--){const day=new Date(d);day.setDate(d.getDate()-i);const k=dkey(day),cnt=(S.day.done[k]||[]).length,p=total?Math.min(100,cnt/total*100):0;
      html+=`<span class="dot${i===0?" today":""}" title="${k}: ${cnt}/${total}"><i style="height:${p}%"></i><span>${WEEKDAYS[day.getDay()][0]}</span></span>`}
    html+=`</div>`;
    box.innerHTML=html;return;
  }
  const i=curIndex(),s=S[tab].slices[i];
  const label={week:"This week, today is",month:"This month, you are in",year:"This year, you are in"}[tab];
  const items=s?s.items||[]:[],dn=items.filter(x=>x.d).length;
  const all=S[tab].slices.flatMap(x=>x.items||[]),adn=all.filter(x=>x.d).length;
  box.innerHTML=`<h2>${label}</h2>`+(s?`<div class="big"><span class="emo">${esc(s.emoji)}</span><div><div class="lbl">${esc(s.label)}${s.title?": "+esc(s.title):""}</div><div class="meta">${tab==="month"?MONTHS[d.getMonth()]+" "+d.getFullYear()+" · ":""}${dn}/${items.length} tasks ticked</div></div></div>`:"")+
    `<div class="bar"><i style="width:${all.length?Math.round(adn/all.length*100):0}%"></i></div><div class="meta">${adn} of ${all.length} tasks done across the whole ${tab}</div>`;
}

function renderRows(){
  const ul=$("#rows");ul.innerHTML="";
  const isDay=tab==="day",list=isDay?sortedDay():S[tab].slices,done=doneToday(),ci=curIndex(),cur=isDay?curDaySlice():null;
  list.forEach((s,i)=>{
    const li=document.createElement("li");const open=openId===s.id;
    const isCur=isDay?(cur&&cur.id===s.id):i===ci;
    li.className="row"+(open?" open":"")+(isCur?" cur":"")+(isDay&&done.includes(s.id)?" done":"");li.dataset.row=s.id;
    if(isDay){
      let a=toMin(s.start),b=toMin(s.end);if(b<=a)b+=1440;
      li.innerHTML=`<div class="head"><span class="sw" style="background:${col(s.color)}">${esc(s.emoji)}</span><span class="txt"><span class="t1">${esc(s.label)||"Untitled"}</span><span class="t2">${fmt(a)} to ${fmt(b)} · ${dur(b-a)}</span></span><input type="checkbox" class="chk" id="chk-${s.id}" aria-label="Done today" ${done.includes(s.id)?"checked":""}></div>`+(open?"":habitChips(s));
    }else{
      const items=s.items||[],dn=items.filter(x=>x.d).length;
      li.innerHTML=`<div class="head"><span class="sw" style="background:${col(s.color)}">${esc(s.emoji)}</span><span class="txt"><span class="t1">${esc(s.label)}${s.title?" · "+esc(s.title):""}</span><span class="t2">${items.length?dn+"/"+items.length+" done":"no tasks yet"}</span></span></div>`+
        (!open&&items.length?`<div class="sub-items">${items.slice(0,3).map(x=>(x.d?"☑ ":"☐ ")+esc(x.t)).join("<br>")}${items.length>3?"<br>…":""}</div>`:"");
    }
    if(open)li.appendChild(editor(s));
    li.querySelector(".head").addEventListener("click",e=>{if(e.target.closest(".chk"))return;openId=open?null:s.id;confirmDel=null;renderSide();drawWheel()});
    const ck=li.querySelector(".chk");
    if(ck)ck.addEventListener("change",()=>{const k=dkey(new Date());const arr=new Set(S.day.done[k]||[]);ck.checked?arr.add(s.id):arr.delete(s.id);S.day.done[k]=[...arr];changed(true);renderNow();li.classList.toggle("done",ck.checked);drawWheel()});
    ul.appendChild(li);
  });
  $("#addBtn").textContent=isDay?"+ Add a time block":"";$("#addBtn").hidden=!isDay;
  $("#listTitle").textContent={day:"Today's blocks",week:"Days of the week",month:"Weeks of the month",year:"Months of the year"}[tab];
  $("#hint").textContent=isDay?"Tap a slice or a row to edit it. Tick a block when it's done today. Starter blocks are examples, change them to yours.":"Tap a slice or a row to rename it, recolour it and add tasks. Starter goals are examples.";
}

function editor(s){
  const isDay=tab==="day",box=document.createElement("div");box.className="edit";
  box.innerHTML=(isDay?`<div><label for="lbl-${s.id}">What</label><input type="text" id="lbl-${s.id}" value="${esc(s.label)}" maxlength="40"></div>
    <div class="two"><div><label for="st-${s.id}">Starts</label><input type="time" step="900" id="st-${s.id}" value="${esc(s.start)}"></div><div><label for="en-${s.id}">Ends</label><input type="time" step="900" id="en-${s.id}" value="${esc(s.end)}"></div></div>`
    :`<div><label for="ttl-${s.id}">Theme for ${esc(s.label)}</label><input type="text" id="ttl-${s.id}" value="${esc(s.title)}" maxlength="30"></div>`)+
    `<div><label>Colour</label>${swatchHTML(s)}</div><div><label>Doodle</label>${emojiHTML(s)}</div>`+
    (isDay?`<div><label for="nt-${s.id}">Note</label><textarea id="nt-${s.id}" maxlength="200">${esc(s.note)}</textarea></div>
      <div><label>Mini habits in this block (ticked fresh every day)</label><ul class="items">${(s.habits||[]).map(h=>`<li><input type="text" data-ht="${h.id}" id="ht-${h.id}" value="${esc(h.t)}" maxlength="40"><button type="button" class="btn ghost x" data-hrm="${h.id}" aria-label="Remove habit">✕</button></li>`).join("")}
        <li><input type="text" id="newh-${s.id}" placeholder="e.g. Drink water, then press Enter" maxlength="40"><button type="button" class="btn x" id="newhb-${s.id}">Add</button></li></ul></div>`
      :`<div><label>Tasks</label><ul class="items">${(s.items||[]).map(it=>`<li><input type="checkbox" class="chk" data-it="${it.id}" id="ic-${it.id}" aria-label="Done" ${it.d?"checked":""}><input type="text" data-itt="${it.id}" id="it-${it.id}" value="${esc(it.t)}" maxlength="80"><button type="button" class="btn ghost x" data-rm="${it.id}" aria-label="Remove task">✕</button></li>`).join("")}
        <li><input type="text" id="new-${s.id}" placeholder="Add a task and press Enter" maxlength="80"><button type="button" class="btn x" id="newb-${s.id}">Add</button></li></ul></div>`)+
    `<div class="acts">`+(isDay?(confirmDel===s.id?`<span>Delete this block? <button type="button" class="btn" data-del="yes">Yes, delete</button> <button type="button" class="btn ghost" data-del="no">Keep</button></span>`:`<button type="button" class="btn ghost" data-del="ask">🗑 Delete block</button>`):(`<button type="button" class="btn ghost" data-clear="1">Untick all</button>`))+`<button type="button" class="btn primary" data-close="1">Done</button></div>`;
  const on=(sel,ev,fn)=>{const e=box.querySelector(sel);if(e)e.addEventListener(ev,fn)};
  on(`#lbl-${s.id}`,"input",e=>{s.label=e.target.value;changed();drawWheel();renderNow()});
  on(`#ttl-${s.id}`,"input",e=>{s.title=e.target.value;changed();drawWheel();renderNow()});
  on(`#st-${s.id}`,"change",e=>{if(e.target.value){s.start=e.target.value;changed();rerender()}});
  on(`#en-${s.id}`,"change",e=>{if(e.target.value){s.end=e.target.value;changed();rerender()}});
  on(`#nt-${s.id}`,"input",e=>{s.note=e.target.value;changed();renderNow()});
  box.querySelectorAll("[data-color]").forEach(b=>b.addEventListener("click",()=>{s.color=b.dataset.color;changed();rerender()}));
  box.querySelectorAll("[data-emoji]").forEach(b=>b.addEventListener("click",()=>{s.emoji=b.dataset.emoji;changed();rerender()}));
  box.querySelectorAll("[data-it]").forEach(c=>c.addEventListener("change",()=>{const it=s.items.find(x=>x.id===c.dataset.it);if(it){it.d=c.checked;changed(true);renderNow();drawWheel()}}));
  box.querySelectorAll("[data-itt]").forEach(c=>c.addEventListener("input",()=>{const it=s.items.find(x=>x.id===c.dataset.itt);if(it){it.t=c.value;changed()}}));
  box.querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",()=>{s.items=s.items.filter(x=>x.id!==b.dataset.rm);changed();rerender()}));
  const add=()=>{const inp=box.querySelector(`#new-${s.id}`);const v=inp.value.trim();if(!v)return;(s.items=s.items||[]).push({id:uid(),t:v,d:false});changed();rerender();const n=document.getElementById("new-"+s.id);if(n)n.focus()};
  box.querySelectorAll("[data-ht]").forEach(c=>c.addEventListener("input",()=>{const h=(s.habits||[]).find(x=>x.id===c.dataset.ht);if(h){h.t=c.value;changed();renderNow()}}));
  box.querySelectorAll("[data-hrm]").forEach(b=>b.addEventListener("click",()=>{s.habits=s.habits.filter(x=>x.id!==b.dataset.hrm);changed();rerender()}));
  const addH=()=>{const inp=box.querySelector(`#newh-${s.id}`);const v=inp.value.trim();if(!v)return;(s.habits=s.habits||[]).push({id:uid(),t:v});changed();rerender();const n=document.getElementById("newh-"+s.id);if(n)n.focus()};
  on(`#newh-${s.id}`,"keydown",e=>{if(e.key==="Enter"){e.preventDefault();addH()}});
  on(`#newhb-${s.id}`,"click",addH);
  on(`#new-${s.id}`,"keydown",e=>{if(e.key==="Enter"){e.preventDefault();add()}});
  on(`#newb-${s.id}`,"click",add);
  box.querySelectorAll("[data-del]").forEach(b=>b.addEventListener("click",()=>{const v=b.dataset.del;
    if(v==="ask")confirmDel=s.id;else if(v==="no")confirmDel=null;else{S.day.slices=S.day.slices.filter(x=>x.id!==s.id);openId=null;confirmDel=null;changed()}rerender()}));
  on("[data-clear]","click",()=>{(s.items||[]).forEach(x=>x.d=false);changed(true);rerender()});
  on("[data-close]","click",()=>{openId=null;rerender();flushSoon()});
  return box;
}

function grow(t){t.style.height="auto";t.style.height=t.scrollHeight+"px"}
let delNote=null;
function renderNotes(){
  const ul=$("#notesList");ul.innerHTML="";const ns=S[tab].notes;
  if(!ns.length){ul.innerHTML=`<li class="empty-notes">No notes yet. Tap "+ Add note" for reminders like "Fridays 7 to 11 → church".</li>`;return}
  ns.forEach((n,i)=>{
    const li=document.createElement("li");li.className="sticky";li.style.setProperty("--tilt",(i%2?1.1:-1.1)+"deg");
    li.innerHTML=`<span class="star">★</span><textarea rows="1" id="note-${n.id}" maxlength="300" aria-label="Note" placeholder="Write a note">${esc(n.t)}</textarea><button type="button" class="btn ghost x" aria-label="Delete note">${delNote===n.id?"Delete?":"✕"}</button>`;
    const ta=li.querySelector("textarea"),b=li.querySelector("button");
    ta.addEventListener("input",()=>{n.t=ta.value;grow(ta);changed()});
    ta.addEventListener("blur",flushSoon);
    b.addEventListener("click",()=>{if(!n.t.trim()||delNote===n.id){S[tab].notes=ns.filter(x=>x.id!==n.id);delNote=null;changed()}else delNote=n.id;renderNotes()});
    ul.appendChild(li);requestAnimationFrame(()=>grow(ta));
  });
}
function renderSide(){renderNow();renderRows();renderNotes()}
function rerender(){renderSide();drawWheel()}
function render(){
  document.querySelectorAll(".tab").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===tab));
  $("#title-word").textContent={day:"Daily",week:"Weekly",month:"Monthly",year:"Yearly"}[tab];
  const who=$("#who");if(document.activeElement!==who)who.value=S.name||"My";sizeWho();
  const d=new Date();$("#todayDate").textContent=WEEKDAYS[d.getDay()]+", "+d.getDate()+" "+MONTHS[d.getMonth()]+" "+d.getFullYear();
  rerender();
}
function sizeWho(){const w=$("#who");w.style.width=Math.max(1,(w.value||"").length)+.6+"ch"}

/* ---------- saving ---------- */
function status(msg,showBtn){const p=$("#savePill");p.hidden=!msg;$("#saveMsg").textContent=msg||"";$("#saveNow").hidden=!showBtn}
function changed(quick){
  dirty=true;S.updatedAt=Date.now();
  try{localStorage.setItem(LS,JSON.stringify(S))}catch(e){}
  dirty=false;status("Saved ✓");clearTimeout(timer);timer=setTimeout(()=>status(""),1500);return;
}
function flushSoon(){if(dirty){clearTimeout(timer);timer=setTimeout(save,600)}}
function prune(){const cut=new Date();cut.setDate(cut.getDate()-60);const ck=dkey(cut);for(const k in S.day.done)if(k<ck)delete S.day.done[k];for(const k in S.day.hdone)if(k<ck)delete S.day.hdone[k]}
async function save(){
  clearTimeout(timer);if(!dirty)return;
  if(!saver){status(saveMode==="local"?"Saved ✓":"Saving…");if(saveMode==="local")setTimeout(()=>{if(!dirty)status("")},1500);if(saveMode==="local")dirty=false;return}
  prune();status("Saving…");const snapshot=JSON.stringify(S,null,1);
  try{await saver.publish({"state.json":{content:snapshot,contentType:"application/json"}});dirty=false;
    try{localStorage.removeItem(LS)}catch(e){}status("Saved ✓");setTimeout(()=>{if(!dirty)status("")},1800)}
  catch(e){const c=e&&e.code;
    if(c==="conflict"){status("Updated on another device, reloading…")}
    else if(["not_writer","not_granted","consent_required","capability_disabled","capability_removed","not_declared","read_only_path"].includes(c)){saveMode="ro";saver=null;status("Saving isn't available here. Changes stay on this device.")}
    else if(c==="rate_limited"){timer=setTimeout(save,8000);status("Saving shortly…")}
    else{status("Couldn't save. Will try again.",true);timer=setTimeout(save,6000+Math.random()*3000)}}
}
$("#saveNow").addEventListener("click",save);

/* ---------- events ---------- */
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;openId=null;confirmDel=null;try{localStorage.setItem(LS+"-tab",tab)}catch(e){}flushSoon();render()}));
$("#who").addEventListener("input",e=>{S.name=e.target.value.slice(0,14);sizeWho();changed()});
$("#who").addEventListener("blur",flushSoon);
$("#addNote").addEventListener("click",()=>{const n={id:uid(),t:""};S[tab].notes.push(n);delNote=null;renderNotes();const t=document.getElementById("note-"+n.id);if(t)t.focus()});
document.addEventListener("change",e=>{
  const c=e.target.closest&&e.target.closest(".hchk");if(!c)return;
  const k=dkey(new Date()),set=new Set(S.day.hdone[k]||[]);c.checked?set.add(c.dataset.hab):set.delete(c.dataset.hab);S.day.hdone[k]=[...set];
  changed(true);renderNow();renderRows();
});
$("#addBtn").addEventListener("click",()=>{
  const ss=sortedDay();let st="12:00";
  const c=curDaySlice();if(c)st=c.end;
  const s={id:uid(),label:"New block",start:st,end:fmt24(toMin(st)+60),color:COLORS[S.day.slices.length%COLORS.length],emoji:"🌟",note:""};
  S.day.slices.push(s);openId=s.id;changed();rerender();
  const r=document.getElementById("lbl-"+s.id);if(r){r.focus();r.select()}
});
function fmt24(m){m=((m%1440)+1440)%1440;return pad(Math.floor(m/60))+":"+pad(m%60)}
document.addEventListener("visibilitychange",()=>{if(document.hidden)save();else if(S)render()});
setInterval(()=>{if(S&&!document.hidden&&!openId){renderNow();drawWheel()}},60000);

/* ---------- boot ---------- */
async function boot(){
  let server=null;
  server=JSON.parse(JSON.stringify(CONFIG.starter));
  let local=null;try{local=JSON.parse(localStorage.getItem(LS)||"null")}catch(e){}
  S=local||server;
  if(!S){$("#rows").innerHTML="<li>Couldn't load the planner data. Refresh to try again.</li>";return}
  
  for(const k of ["day","week","month","year"]){
    S[k]=S[k]||{slices:[]};
    if(!Array.isArray(S[k].notes)){S[k].notes=(S[k].note||"").trim()?[{id:uid(),t:S[k].note}]:[];delete S[k].note}
  }
  S.day.done=S.day.done||{};S.day.hdone=S.day.hdone||{};
  S.day.slices.forEach(s=>{if(!Array.isArray(s.habits))s.habits=[]});
  if(!S.habitsSeeded){
    const ex={"Wake up & freshen up":["Drink water","Stretch 5 min"],"GATE DA study":["Revise yesterday's formulas"],"Walk & tea":["Walk 30 min"],"Wind down":["Phone away","Plan tomorrow"]};
    S.day.slices.forEach(s=>{if(ex[s.label]&&!s.habits.length)s.habits=ex[s.label].map(t=>({id:uid(),t}))});
    S.habitsSeeded=true;
  }
  render();
  saveMode="local";
}
document.getElementById("exportBtn").addEventListener("click",()=>{
  const b=new Blob([JSON.stringify(S,null,1)],{type:"application/json"});const a=document.createElement("a");
  a.href=URL.createObjectURL(b);a.download="routine-backup-"+dkey(new Date())+".json";document.body.appendChild(a);a.click();a.remove();
  document.getElementById("backupMsg").textContent="Backup downloaded to your Downloads folder.";
});
document.getElementById("importFile").addEventListener("change",e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const d=JSON.parse(r.result);if(!d.day||!d.week)throw 0;localStorage.setItem(LS,JSON.stringify(d));location.reload()}
    catch(err){document.getElementById("backupMsg").textContent="That file isn't a planner backup."}};r.readAsText(f);
});
boot();

/* ---------- install as an app ---------- */
let installEvt=null;
const instBtn=document.getElementById("installBtn");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installEvt=e;instBtn.hidden=false});
instBtn.addEventListener("click",async()=>{if(!installEvt)return;installEvt.prompt();await installEvt.userChoice;installEvt=null;instBtn.hidden=true});
window.addEventListener("appinstalled",()=>{instBtn.hidden=true});
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
})();
