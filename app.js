const SEED_PERIODS = [
  "2025-05-14","2025-06-18","2025-07-21","2025-08-23","2025-09-25",
  "2025-10-23","2025-11-24","2025-12-29","2026-02-04","2026-03-10","2026-04-07"
];

const SEED_LENGTHS = {
  "2025-05-14":6, "2025-06-18":7, "2025-07-21":5, "2025-08-23":6,
  "2025-09-25":5, "2025-10-23":2, "2025-11-24":7, "2025-12-29":4,
  "2026-02-04":5, "2026-03-10":7, "2026-04-07":6
};

const DEFAULT_CYCLE = 33;
const DEFAULT_PERIOD = 6;
const VARIANCE = 4;

const pad = n => String(n).padStart(2,"0");
const toKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const fromKey = s => {
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y, m-1, d);
};
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate()+days);
  return d;
};
const jp = d => `${d.getMonth()+1}/${d.getDate()}`;

function init(){
  if(!localStorage.getItem("periodStarts")){
    localStorage.setItem("periodStarts", JSON.stringify(SEED_PERIODS));
  }
  if(!localStorage.getItem("periodLengths")){
    localStorage.setItem("periodLengths", JSON.stringify(SEED_LENGTHS));
  }
  if(!localStorage.getItem("symptoms")){
    localStorage.setItem("symptoms", JSON.stringify({}));
  }
}

function getStarts(){
  return JSON.parse(localStorage.getItem("periodStarts") || "[]").sort();
}
function setStarts(v){
  localStorage.setItem("periodStarts", JSON.stringify([...new Set(v)].sort()));
}
function getLengths(){
  return JSON.parse(localStorage.getItem("periodLengths") || "{}");
}
function setLengths(v){
  localStorage.setItem("periodLengths", JSON.stringify(v));
}
function getSymptoms(){
  return JSON.parse(localStorage.getItem("symptoms") || "{}");
}
function setSymptoms(v){
  localStorage.setItem("symptoms", JSON.stringify(v));
}

let now = new Date();
let currentYear = now.getFullYear();
let currentMonth = now.getMonth();
let selectedKey = toKey(now);

function cycleDiffs(){
  const starts = getStarts();
  const diffs = [];
  for(let i=1;i<starts.length;i++){
    const diff = Math.round((fromKey(starts[i]) - fromKey(starts[i-1])) / 86400000);
    if(diff > 15 && diff < 60) diffs.push(diff);
  }
  return diffs;
}

function avg(arr, fallback){
  if(!arr.length) return fallback;
  return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
}

function avgCycle(){ return avg(cycleDiffs(), DEFAULT_CYCLE); }
function avgPeriod(){
  const vals = Object.values(getLengths()).filter(n => Number(n) > 0);
  return avg(vals, DEFAULT_PERIOD);
}

function lastStart(){
  const starts = getStarts();
  return starts.length ? fromKey(starts[starts.length-1]) : null;
}

function predictions(){
  const last = lastStart();
  const cycle = avgCycle();
  if(!last) return null;

  const next = addDays(last, cycle);
  const ovulation = addDays(next, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);
  const pmsStart = addDays(next, -7);
  const nextEnd = addDays(next, avgPeriod()-1);

  return {last, cycle, next, ovulation, fertileStart, fertileEnd, pmsStart, nextEnd};
}

function mentalWeatherFor(date){
  const p = predictions();
  if(!p) return {icon:"🌤️", title:"くもり晴れ", note:"記録が増えるほど予報が育つよ"};
  const key = toKey(date);

  // period actual or predicted
  const starts = getStarts();
  const lengths = getLengths();
  for(const s of starts){
    const start = fromKey(s);
    const len = lengths[s] || avgPeriod();
    if(date >= start && date <= addDays(start, len-1)){
      return {icon:"🌧️", title:"雨", note:"生理中。予定は詰めすぎず、あったかくしてこ"};
    }
  }

  if(date >= p.next && date <= p.nextEnd){
    return {icon:"🌧️", title:"雨予報", note:"生理予定期間。無理しない前提でいこ"};
  }

  if(date >= p.pmsStart && date < p.next){
    return {icon:"⛈️", title:"雷雨注意", note:"生理前。情緒・眠気・頭痛にやさしく警戒"};
  }

  if(date >= p.fertileStart && date <= p.fertileEnd){
    return {icon:"🌦️", title:"変わりやすい空", note:"妊娠可能性の目安期間。体調変化に注意"};
  }

  if(toKey(date) === toKey(p.ovulation)){
    return {icon:"🌤️", title:"くもり晴れ", note:"排卵予測日。下腹部や眠気が出る人もいる日"};
  }

  return {icon:"☀️", title:"晴れ", note:"比較的安定しやすい目安の日"};
}

function renderSummary(){
  const p = predictions();
  if(!p) return;
  document.getElementById("nextPeriod").textContent = jp(p.next);
  document.getElementById("nextRange").textContent = `${jp(addDays(p.next,-VARIANCE))}〜${jp(addDays(p.next,VARIANCE))}ごろ`;
  document.getElementById("ovulation").textContent = jp(p.ovulation);

  const w = mentalWeatherFor(new Date());
  document.getElementById("mentalWeather").textContent = `${w.icon} ${w.title}`;
  document.getElementById("weatherNote").textContent = w.note;
}

function renderCalendar(){
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";
  document.getElementById("monthLabel").textContent = `${currentYear}年 ${currentMonth+1}月`;

  const first = new Date(currentYear, currentMonth, 1);
  const last = new Date(currentYear, currentMonth+1, 0);
  for(let i=0;i<first.getDay();i++) cal.appendChild(document.createElement("div"));

  const starts = getStarts();
  const lengths = getLengths();
  const symptoms = getSymptoms();
  const p = predictions();

  for(let day=1; day<=last.getDate(); day++){
    const date = new Date(currentYear, currentMonth, day);
    const key = toKey(date);
    let cls = "day";
    let marks = [];

    for(const s of starts){
      const start = fromKey(s);
      const len = lengths[s] || avgPeriod();
      if(date >= start && date <= addDays(start, len-1)){
        cls += " period";
        marks.push("🩸");
      }
    }

    if(p){
      if(date >= p.next && date <= p.nextEnd){
        cls += " predicted";
        marks.push("予");
      }
      if(date >= p.fertileStart && date <= p.fertileEnd){
        cls += " fertile";
        marks.push("可");
      }
      if(key === toKey(p.ovulation)){
        cls += " ovulation";
        marks.push("卵");
      }
    }

    if(symptoms[key]?.length) cls += " has-symptom";
    if(key === selectedKey) cls += " selected";
    if(key === toKey(new Date())) cls += " today";

    const div = document.createElement("div");
    div.className = cls;
    div.innerHTML = `<button data-date="${key}"><div class="num">${day}</div><div class="marks">${marks.join(" ")}</div></button>`;
    cal.appendChild(div);
  }

  document.querySelectorAll("[data-date]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      selectedKey = btn.dataset.date;
      render();
    });
  });
}

function renderSelected(){
  const date = fromKey(selectedKey);
  const w = mentalWeatherFor(date);
  document.getElementById("selectedLabel").textContent = `${date.getMonth()+1}/${date.getDate()}`;
  const symptoms = getSymptoms()[selectedKey] || [];
  const starts = getStarts();
  const isPeriod = starts.includes(selectedKey);
  document.getElementById("dayDetail").innerHTML = `
    <strong>${jp(date)} のメンタル天気：${w.icon} ${w.title}</strong><br>
    ${w.note}<br><br>
    生理開始記録：${isPeriod ? "あり 🩸" : "なし"}<br>
    症状：${symptoms.length ? symptoms.join(" / ") : "記録なし"}
  `;
}

function renderStats(){
  const diffs = cycleDiffs();
  const starts = getStarts();
  const p = predictions();
  document.getElementById("stats").innerHTML = `
    平均周期：<strong>${avgCycle()}日</strong>（記録上 ${Math.min(...diffs)}〜${Math.max(...diffs)}日）<br>
    平均月経：<strong>${avgPeriod()}日</strong><br>
    記録済み開始日：${starts.length}件<br>
    次回予測：${p ? jp(p.next) : "--"}（±${VARIANCE}日目安）
  `;
}

function togglePeriod(){
  let starts = getStarts();
  const lengths = getLengths();
  if(starts.includes(selectedKey)){
    starts = starts.filter(s=>s!==selectedKey);
    delete lengths[selectedKey];
  }else{
    starts.push(selectedKey);
    lengths[selectedKey] = avgPeriod();
  }
  setStarts(starts);
  setLengths(lengths);
  render();
}

function toggleSymptom(symptom){
  const symptoms = getSymptoms();
  if(!symptoms[selectedKey]) symptoms[selectedKey] = [];
  if(symptoms[selectedKey].includes(symptom)){
    symptoms[selectedKey] = symptoms[selectedKey].filter(s=>s!==symptom);
  }else{
    symptoms[selectedKey].push(symptom);
  }
  if(!symptoms[selectedKey].length) delete symptoms[selectedKey];
  setSymptoms(symptoms);
  render();
}

function render(){
  renderSummary();
  renderCalendar();
  renderSelected();
  renderStats();
}

document.getElementById("prevMonth").addEventListener("click",()=>{
  currentMonth--;
  if(currentMonth<0){currentMonth=11;currentYear--;}
  renderCalendar();
});
document.getElementById("nextMonth").addEventListener("click",()=>{
  currentMonth++;
  if(currentMonth>11){currentMonth=0;currentYear++;}
  renderCalendar();
});
document.getElementById("periodToggle").addEventListener("click", togglePeriod);
document.querySelectorAll("[data-symptom]").forEach(btn=>{
  btn.addEventListener("click",()=>toggleSymptom(btn.dataset.symptom));
});
document.getElementById("resetSeed").addEventListener("click",()=>{
  if(confirm("記録を初期データに戻す？追加した記録は消えるよ。")){
    localStorage.setItem("periodStarts", JSON.stringify(SEED_PERIODS));
    localStorage.setItem("periodLengths", JSON.stringify(SEED_LENGTHS));
    localStorage.setItem("symptoms", JSON.stringify({}));
    selectedKey = toKey(new Date());
    render();
  }
});

init();
render();
