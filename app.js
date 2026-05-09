const SEED_PERIODS = [
  "2025-05-14","2025-06-18","2025-07-21","2025-08-23","2025-09-25",
  "2025-10-23","2025-11-24","2025-12-29","2026-02-04","2026-03-10","2026-04-07"
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

const DEFAULT_CYCLE = 33;
const DEFAULT_PERIOD = 6;
const VARIANCE = 4;

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
    .filter(n => Number(n) > 0);

  return avg(vals,DEFAULT_PERIOD);
}

function lastStart(){

  const starts = getStarts();

  return starts.length
    ? fromKey(starts[starts.length-1])
    : null;
}

function basePredictionFrom(startDate,n=0){

  const cycle = avgCycle();
  const period = avgPeriod();

  const next =
    addDays(startDate,cycle*(n+1));

  const ovulation =
    addDays(next,-14);

  return {
    next,
    nextEnd:addDays(next,period-1),
    ovulation,
    fertileStart:addDays(ovulation,-5),
    fertileEnd:addDays(ovulation,1),
    pmsStart:addDays(next,-7),
    cycle
  };
}

function predictions(){

  const last = lastStart();

  if(!last) return null;

  return {
    last,
    ...basePredictionFrom(last,0)
  };
}

function parseWatchText(text){

  const data = {};

  const lines =
    text
    .split(/\n|,/)
    .map(x=>x.trim())
    .filter(Boolean);

  for(const line of lines){

    const normalized =
      line.replace(/[：=]/g,":");

    const [k,...rest] =
      normalized.split(":");

    const key = (k||"").trim();

    const val =
      rest.join(":").trim();

    const num =
      Number(
        (val.match(/-?\d+(\.\d+)?/) || [])[0]
      );

    if(/睡眠/i.test(key)){
      data.sleep = num;
    }

    else if(/歩数/i.test(key)){
      data.steps = num;
    }

    else if(/心拍/i.test(key)){
      data.heartRate = num;
    }

    else if(/温度/i.test(key)){
      data.temp = num;
    }
  }

  return data;
}

function mentalWeatherFor(date){

  const p = predictions();

  if(!p){
    return {
      icon:"🌤️",
      title:"くもり晴れ",
      note:"記録が増えるほど予報が育つよ"
    };
  }

  const starts = getStarts();
  const lengths = getLengths();

  for(const s of starts){

    const start = fromKey(s);

    const len =
      lengths[s] || avgPeriod();

    if(
      date >= start &&
      date <= addDays(start,len-1)
    ){
      return {
        icon:"🌧️",
        title:"雨",
        note:"生理中。無理しすぎ注意"
      };
    }
  }

  if(date >= p.pmsStart && date < p.next){

    return {
      icon:"⛈️",
      title:"雷雨注意",
      note:"PMS期間。情緒ゆらぎ注意"
    };
  }

  return {
    icon:"☀️",
    title:"晴れ",
    note:"比較的安定しやすい日"
  };
}

function renderSummary(){

  const p = predictions();

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
    mentalWeatherFor(new Date());

  document.getElementById(
    "mentalWeather"
  ).textContent =
    `${w.icon} ${w.title}`;

  document.getElementById(
    "weatherNote"
  ).textContent =
    w.note;
}

function renderFuture(){

  const last = lastStart();

  const box =
    document.getElementById("futureList");

  if(!last){
    box.innerHTML = "まだ予測できないよ";
    return;
  }

  const weatherList = [
    "☀️ 比較的安定",
    "🌤️ ゆるやかモード",
    "🌦️ 変わりやすい",
    "⛈️ PMS注意"
  ];

  const items = [];

  for(let i=0;i<6;i++){

    const p =
      basePredictionFrom(last,i);

    const monthName =
      `${p.next.getFullYear()}年
      ${p.next.getMonth()+1}月`;

    const weather =
      weatherList[
        Math.min(
          3,
          Math.floor(
            Math.random()*3 +
            (i % 2)
          )
        )
      ];

    items.push(`
      <div class="future-item">

        <strong>${monthName}</strong>

        <small>

          🩸 生理予定：
          ${jp(addDays(p.next,-VARIANCE))}
          〜
          ${jp(addDays(p.next,VARIANCE))}

          <br><br>

          🥚 排卵予測：
          ${jp(p.ovulation)}

          <br><br>

          💞 妊娠可能性：
          ${jp(p.fertileStart)}
          〜
          ${jp(p.fertileEnd)}

          <br><br>

          🌙 メンタル天気：
          ${weather}

        </small>

      </div>
    `);
  }

  box.innerHTML = items.join("");
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

  const starts = getStarts();
  const lengths = getLengths();
  const symptoms = getSymptoms();

  const p = predictions();

  for(let day=1;day<=last.getDate();day++){

    const date =
      new Date(currentYear,currentMonth,day);

    const key = toKey(date);

    let cls = "day";

    let marks = [];

    for(const s of starts){

      const start = fromKey(s);

      const len =
        lengths[s] || avgPeriod();

      if(
        date >= start &&
        date <= addDays(start,len-1)
      ){
        cls += " period";
        marks.push("🩸");
      }
    }

    for(let i=0;i<6;i++){

  const fp =
    basePredictionFrom(
      lastStart(),
      i
    );

  if(
    date >= fp.next &&
    date <= fp.nextEnd
  ){
    cls += " predicted";
  }

  if(
    date >= fp.fertileStart &&
    date <= fp.fertileEnd
  ){
    cls += " fertile";
  }

  if(
    key === toKey(fp.ovulation)
  ){
    cls += " ovulation";
  }

  if(
    date >= fp.pmsStart &&
    date < fp.next
  ){
    cls += " pms";
  }
}

    if(symptoms[key]?.length){
      cls += " has-symptom";
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
        <div class="marks">${marks.join(" ")}</div>
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
}

function renderSelected(){

  const date =
    fromKey(selectedKey);

  const w =
    mentalWeatherFor(date);

  const symptoms =
    getSymptoms()[selectedKey] || [];

  const watch =
    getWatch()[selectedKey];

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
      のメンタル天気：
      ${w.icon} ${w.title}
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

  const diffs = cycleDiffs();

  document.getElementById(
    "stats"
  ).innerHTML = `

    平均周期：
    ${avgCycle()}日

    <br>

    平均月経：
    ${avgPeriod()}日

    <br>

    記録周期数：
    ${diffs.length}
  `;
}

function togglePeriod(){

  let starts = getStarts();

  const lengths = getLengths();

  if(starts.includes(selectedKey)){

    starts =
      starts.filter(
        s=>s!==selectedKey
      );

    delete lengths[selectedKey];
  }

  else{

    starts.push(selectedKey);

    lengths[selectedKey] =
      avgPeriod();
  }

  setStarts(starts);
  setLengths(lengths);

  render();
}

function toggleSymptom(symptom){

  const symptoms = getSymptoms();

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

  if(!symptoms[selectedKey].length){
    delete symptoms[selectedKey];
  }

  setSymptoms(symptoms);

  render();
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
      "貼り付け許可が必要かも！"
    );
  }
}

function saveWatch(){

  const text =
    document.getElementById(
      "watchInput"
    ).value.trim();

  if(!text){
    alert("空だよ！");
    return;
  }

  const watch = getWatch();

  watch[selectedKey] =
    parseWatchText(text);

  setWatch(watch);

  render();
}

function render(){

  renderSummary();
  renderFuture();
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

    localStorage.setItem(
      "periodStarts",
      JSON.stringify(SEED_PERIODS)
    );

    localStorage.setItem(
      "periodLengths",
      JSON.stringify(SEED_LENGTHS)
    );

    localStorage.setItem(
      "symptoms",
      JSON.stringify({})
    );

    localStorage.setItem(
      "watchData",
      JSON.stringify({})
    );

    selectedKey =
      toKey(new Date());

    render();
  }
});

init();
render();
