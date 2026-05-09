const SEED_PERIODS = [
  "2025-05-14","2025-06-18","2025-07-21","2025-08-23",
  "2025-09-25","2025-10-23","2025-11-24","2025-12-29",
  "2026-02-04","2026-03-10","2026-04-07"
];

const SEED_LENGTHS = {
  "2025-05-14":6,
  "2025-06-18":7,
  "2025-07-21":5,
  "2025-08-23":6,
  "2025-09-25":5,
  "2025-10-23":2,
  "2025-11-24":7,
  "2025-12-29":4,
  "2026-02-04":5,
  "2026-03-10":7,
  "2026-04-07":6
};

const VARIANCE = 4;
const DEFAULT_CYCLE = 33;
const DEFAULT_PERIOD = 6;

const pad = n => String(n).padStart(2,"0");

const toKey = d =>
  `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const fromKey = s => {
  const [y,m,d] = s.split("-").map(Number);
  return new Date(y,m-1,d);
};

const addDays = (date,days)=>{
  const d = new Date(date);
  d.setDate(d.getDate()+days);
  return d;
};

const jp = d => `${d.getMonth()+1}/${d.getDate()}`;

function init(){

  if(!localStorage.getItem("periodStarts")){
    localStorage.setItem(
      "periodStarts",
      JSON.stringify(SEED_PERIODS)
    );
  }

  if(!localStorage.getItem("periodLengths")){
    localStorage.setItem(
      "periodLengths",
      JSON.stringify(SEED_LENGTHS)
    );
  }

  if(!localStorage.getItem("symptoms")){
    localStorage.setItem(
      "symptoms",
      JSON.stringify({})
    );
  }

  if(!localStorage.getItem("watchData")){
    localStorage.setItem(
      "watchData",
      JSON.stringify({})
    );
  }
}

function getStarts(){
  return JSON.parse(
    localStorage.getItem("periodStarts") || "[]"
  ).sort();
}

function setStarts(v){
  localStorage.setItem(
    "periodStarts",
    JSON.stringify([...new Set(v)].sort())
  );
}

function getLengths(){
  return JSON.parse(
    localStorage.getItem("periodLengths") || "{}"
  );
}

function setLengths(v){
  localStorage.setItem(
    "periodLengths",
    JSON.stringify(v)
  );
}

function getSymptoms(){
  return JSON.parse(
    localStorage.getItem("symptoms") || "{}"
  );
}

function setSymptoms(v){
  localStorage.setItem(
    "symptoms",
    JSON.stringify(v)
  );
}

function getWatch(){
  return JSON.parse(
    localStorage.getItem("watchData") || "{}"
  );
}

function setWatch(v){
  localStorage.setItem(
    "watchData",
    JSON.stringify(v)
  );
}

let now = new Date();

let currentYear = now.getFullYear();
let currentMonth = now.getMonth();

let selectedKey = toKey(now);

function cycleDiffs(){

  const starts = getStarts();
  const diffs = [];

  for(let i=1;i<starts.length;i++){

    const diff =
      Math.round(
        (
          fromKey(starts[i]) -
          fromKey(starts[i-1])
        ) / 86400000
      );

    if(diff > 15 && diff < 60){
      diffs.push(diff);
    }
  }

  return diffs;
}

function avg(arr,fallback){

  if(!arr.length) return fallback;

  return Math.round(
    arr.reduce((a,b)=>a+b,0)/arr.length
  );
}

function avgCycle(){
  return avg(cycleDiffs(),DEFAULT_CYCLE);
}

function avgPeriod(){

  const vals =
    Object.values(getLengths())
    .filter(v=>v>0);

  return avg(vals,DEFAULT_PERIOD);
}

function lastStart(){

  const starts = getStarts();

  return starts.length
    ? fromKey(starts[starts.length-1])
    : null;
}

function predictionFrom(start,n=0){

  const cycle = avgCycle();
  const period = avgPeriod();

  const next =
    addDays(start, cycle*(n+1));

  return {
    next,
    nextEnd:addDays(next,period-1),
    ovulation:addDays(next,-14),
    fertileStart:addDays(next,-19),
    fertileEnd:addDays(next,-13),
    pmsStart:addDays(next,-7)
  };
}

function predictions(){

  const last = lastStart();

  if(!last) return [];

  const arr = [];

  for(let i=0;i<6;i++){
    arr.push(predictionFrom(last,i));
  }

  return arr;
}

function mentalWeather(date){

  const preds = predictions();

  for(const p of preds){

    if(
      date >= p.pmsStart &&
      date < p.next
    ){
      return {
        icon:"⛈️",
        text:"雷雨注意",
        note:"PMS期間。情緒ゆらぎ注意"
      };
    }

    if(
      date >= p.next &&
      date <= p.nextEnd
    ){
      return {
        icon:"🌧️",
        text:"雨",
        note:"生理期間。無理しすぎ注意"
      };
    }
  }

  return {
    icon:"☀️",
    text:"晴れ",
    note:"比較的安定しやすい日"
  };
}

function renderSummary(){

  const p = predictions()[0];

  if(!p) return;

  document.getElementById(
    "nextPeriod"
  ).textContent = jp(p.next);

  document.getElementById(
    "nextRange"
  ).textContent =
    `${jp(addDays(p.next,-VARIANCE))}
    〜
    ${jp(addDays(p.next,VARIANCE))}`;

  document.getElementById(
    "ovulation"
  ).textContent =
    jp(p.ovulation);

  const w =
    mentalWeather(new Date());

  document.getElementById(
    "mentalWeather"
  ).textContent =
    `${w.icon} ${w.text}`;

  document.getElementById(
    "weatherNote"
  ).textContent =
    w.note;
}

function renderCalendar(){

  const cal =
    document.getElementById("calendar");

  cal.innerHTML = "";

  document.getElementById(
    "monthLabel"
  ).textContent =
    `${currentYear}年 ${currentMonth+1}月`;

  const first =
    new Date(currentYear,currentMonth,1);

  const last =
    new Date(currentYear,currentMonth+1,0);

  for(let i=0;i<first.getDay();i++){
    cal.appendChild(document.createElement("div"));
  }

  const symptoms = getSymptoms();
  const watch = getWatch();
  const preds = predictions();

  for(let day=1;day<=last.getDate();day++){

    const date =
      new Date(currentYear,currentMonth,day);

    const key = toKey(date);

    let cls = "day";

    for(const p of preds){

      if(
        date >= p.next &&
        date <= p.nextEnd
      ){
        cls += " predicted";
      }

      if(
        date >= p.fertileStart &&
        date <= p.fertileEnd
      ){
        cls += " fertile";
      }

      if(
        key === toKey(p.ovulation)
      ){
        cls += " ovulation";
      }

      if(
        date >= p.pmsStart &&
        date < p.next
      ){
        cls += " pms";
      }
    }

    if(symptoms[key]?.length){
      cls += " has-symptom";
    }

    if(watch[key]){
      cls += " has-watch";
    }

    if(key === selectedKey){
      cls += " selected";
    }

    const div =
      document.createElement("div");

    div.className = cls;

    div.innerHTML = `
      <button data-date="${key}">
        <div class="num">${day}</div>
      </button>
    `;

    cal.appendChild(div);
  }

  document
  .querySelectorAll("[data-date]")
  .forEach(btn=>{

    btn.addEventListener("click",()=>{

      selectedKey =
        btn.dataset.date;

      render();
    });
  });

  document.getElementById(
    "selectedLabel"
  ).textContent =
    selectedKey.replaceAll("-","/");
}

function renderSelected(){

  const symptoms =
    getSymptoms()[selectedKey] || [];

  const watch =
    getWatch()[selectedKey];

  const date =
    fromKey(selectedKey);

  const w =
    mentalWeather(date);

  let watchHtml = "";

  if(watch){

    watchHtml = `
      <div class="watch-box">

        🌡️ 手首温度：
        ${watch.temp ?? "--"}

        <br>

        ❤️ 心拍：
        ${watch.heartRate ?? "--"}

        <br>

        👣 歩数：
        ${watch.steps ?? "--"}

        <br>

        💤 睡眠：
        ${watch.sleep ?? "--"}

      </div>
    `;
  }

  document.getElementById(
    "dayDetail"
  ).innerHTML = `

    <strong>
      ${jp(date)}
      ${w.icon}
      ${w.text}
    </strong>

    <br><br>

    ${w.note}

    <br><br>

    症状：
    ${
      symptoms.length
      ? symptoms.join(" / ")
      : "記録なし"
    }

    ${watchHtml}
  `;
}

function renderStats(){

  document.getElementById(
    "stats"
  ).innerHTML = `

    平均周期：
    ${avgCycle()}日

    <br>

    平均月経：
    ${avgPeriod()}日

    <br>

    記録数：
    ${getStarts().length}件
  `;
}

async function syncToCloud(){

  if(
    typeof firebaseFns === "undefined" ||
    typeof db === "undefined"
  ){
    return;
  }

  const data = {

    periodStarts:getStarts(),
    periodLengths:getLengths(),
    symptoms:getSymptoms(),
    watchData:getWatch()

  };

  try{

    await firebaseFns.setDoc(

      firebaseFns.doc(
        db,
        "cycles",
        "shared"
      ),

      data

    );

    console.log("同期完了☁️");

  }

  catch(e){

    console.error(
      "Firebase同期失敗",
      e
    );
  }
}

function togglePeriod(){

  let starts = getStarts();

  const lengths = getLengths();

  if(starts.includes(selectedKey)){

    starts =
      starts.filter(s=>s!==selectedKey);

    delete lengths[selectedKey];
  }

  else{

    starts.push(selectedKey);

    lengths[selectedKey] =
      avgPeriod();
  }

  setStarts(starts);
  setLengths(lengths);

  syncToCloud();

  render();
}

function toggleSymptom(symptom){

  const symptoms =
    getSymptoms();

  if(!symptoms[selectedKey]){
    symptoms[selectedKey] = [];
  }

  if(
    symptoms[selectedKey]
    .includes(symptom)
  ){

    symptoms[selectedKey] =
      symptoms[selectedKey]
      .filter(s=>s!==symptom);
  }

  else{

    symptoms[selectedKey]
    .push(symptom);
  }

  setSymptoms(symptoms);

  syncToCloud();

  render();
}

function parseWatchText(text){

  const data = {};

  const lines =
    text
    .split(/\n|,/)
    .map(v=>v.trim())
    .filter(Boolean);

  for(const line of lines){

    const normalized =
      line.replace(/[：=]/g,":");

    const [k,...rest] =
      normalized.split(":");

    const val =
      rest.join(":").trim();

    const num =
      Number(
        (val.match(/-?\d+(\.\d+)?/) || [])[0]
      );

    if(/温度/.test(k)){
      data.temp = num;
    }

    if(/心拍/.test(k)){
      data.heartRate = num;
    }

    if(/歩数/.test(k)){
      data.steps = num;
    }

    if(/睡眠/.test(k)){
      data.sleep = num;
    }
  }

  return data;
}

async function pasteWatch(){

  try{

    const text =
      await navigator.clipboard.readText();

    document.getElementById(
      "watchInput"
    ).value = text;
  }

  catch(e){

    alert(
      "Safariで貼り付け許可が必要かも！"
    );
  }
}

function saveWatch(){

  const text =
    document
    .getElementById("watchInput")
    .value
    .trim();

  if(!text){

    alert("空だよ！");
    return;
  }

  const watch =
    getWatch();

  watch[selectedKey] =
    parseWatchText(text);

  setWatch(watch);

  syncToCloud();

  render();
}

function render(){

  renderSummary();
  renderCalendar();
  renderSelected();
  renderStats();
}

document
.getElementById("prevMonth")
.addEventListener("click",()=>{

  currentMonth--;

  if(currentMonth<0){
    currentMonth=11;
    currentYear--;
  }

  renderCalendar();
});

document
.getElementById("nextMonth")
.addEventListener("click",()=>{

  currentMonth++;

  if(currentMonth>11){
    currentMonth=0;
    currentYear++;
  }

  renderCalendar();
});

document
.getElementById("periodToggle")
.addEventListener(
  "click",
  togglePeriod
);

document
.querySelectorAll("[data-symptom]")
.forEach(btn=>{

  btn.addEventListener(
    "click",
    ()=>toggleSymptom(btn.dataset.symptom)
  );
});

document
.getElementById("pasteWatch")
?.addEventListener(
  "click",
  pasteWatch
);

document
.getElementById("saveWatch")
?.addEventListener(
  "click",
  saveWatch
);

document
.getElementById("resetSeed")
?.addEventListener("click",()=>{

  if(confirm("初期データに戻す？")){

    localStorage.clear();

    init();
    render();
  }
});

init();
render();
