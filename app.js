let current =
  new Date();

current.setDate(1);

let selected =
  new Date();

let selectedKey =
  toKey(selected);

/* =========================
   storage
========================= */

function getStarts(){

  return JSON.parse(
    localStorage.getItem(
      "periodStarts"
    ) || "[]"
  );
}

function setStarts(v){

  localStorage.setItem(
    "periodStarts",
    JSON.stringify(v)
  );
}

function getLengths(){

  return JSON.parse(
    localStorage.getItem(
      "periodLengths"
    ) || "{}"
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
    localStorage.getItem(
      "symptoms"
    ) || "{}"
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
    localStorage.getItem(
      "watchData"
    ) || "{}"
  );
}

function setWatch(v){

  localStorage.setItem(
    "watchData",
    JSON.stringify(v)
  );
}

/* =========================
   util
========================= */

function pad(n){

  return String(n)
    .padStart(2,"0");
}

function toKey(d){

  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function fromKey(k){

  const [y,m,d] =
    k.split("-");

  return new Date(y,m-1,d);
}

function addDays(d,n){

  const x =
    new Date(d);

  x.setDate(
    x.getDate()+n
  );

  return x;
}

function jp(d){

  return `${d.getMonth()+1}/${d.getDate()}`;
}

/* =========================
   cycle
========================= */

function cycleDiffs(){

  const starts =
    getStarts()
    .map(fromKey)
    .sort((a,b)=>a-b);

  const arr = [];

  for(let i=1;i<starts.length;i++){

    arr.push(
      Math.round(
        (starts[i]-starts[i-1])
        /86400000
      )
    );
  }

  return arr;
}

function avgCycle(){

  const arr =
    cycleDiffs();

  if(!arr.length){
    return 28;
  }

  return Math.round(
    arr.reduce((a,b)=>a+b,0)
    /arr.length
  );
}

function avgPeriod(){

  const lengths =
    Object.values(
      getLengths()
    );

  if(!lengths.length){
    return 5;
  }

  return Math.round(
    lengths.reduce((a,b)=>a+b,0)
    /lengths.length
  );
}

function lastStart(){

  const starts =
    getStarts()
    .sort();

  return starts.at(-1);
}

function predictionFrom(startKey){

  const cycle =
    avgCycle();

  const period =
    avgPeriod();

  const start =
    fromKey(startKey);

  const next =
    addDays(start,cycle);

  const nextEnd =
    addDays(next,period-1);

  const ovulation =
    addDays(next,-14);

  const fertileStart =
    addDays(ovulation,-5);

  const fertileEnd =
    addDays(ovulation,+1);

  return {

    next,
    nextEnd,
    ovulation,
    fertileStart,
    fertileEnd
  };
}

function predictions(){

  const start =
    lastStart();

  if(!start){
    return [];
  }

  const arr = [];

  let currentStart =
    start;

  for(let i=0;i<6;i++){

    const p =
      predictionFrom(currentStart);

    arr.push(p);

    currentStart =
      toKey(p.next);
  }

  return arr;
}

/* =========================
   weather
========================= */

function mentalWeather(date){

  const start =
    lastStart();

  if(!start){

    return {
      icon:"☀️",
      label:"安定"
    };
  }

  const diff =
    Math.round(
      (date-fromKey(start))
      /86400000
    );

  const cycle =
    avgCycle();

  const day =
    ((diff%cycle)+cycle)%cycle;

  if(day>=cycle-7){

    return {
      icon:"⛈️",
      label:"PMS注意"
    };
  }

  if(day<=4){

    return {
      icon:"🌧️",
      label:"ゆったり"
    };
  }

  return {
    icon:"☀️",
    label:"比較的安定"
  };
}

/* =========================
   firebase
========================= */

async function syncToCloud(){

  if(
    typeof firebaseFns ===
    "undefined"
  ){
    return;
  }

  const data = {

    periodStarts:getStarts(),
    periodLengths:getLengths(),
    symptoms:getSymptoms(),
    watchData:getWatch(),

    updatedAt:
      new Date()
      .toISOString()
  };

  await firebaseFns.setDoc(

    firebaseFns.doc(
      db,
      "cycles",
      "shared"
    ),

    data
  );
}

/* =========================
   summary
========================= */

function renderSummary(){

  const p =
    predictions()[0];

  if(!p){
    return;
  }

  const nextPeriodEl =
    document.getElementById(
      "nextPeriod"
    );

  if(nextPeriodEl){

    nextPeriodEl.textContent =
      jp(p.next);
  }

  const nextRangeEl =
    document.getElementById(
      "nextRange"
    );

  if(nextRangeEl){

    nextRangeEl.textContent =
      `${jp(p.next)}〜${jp(p.nextEnd)}`;
  }

  const ovulationEl =
    document.getElementById(
      "ovulation"
    );

  if(ovulationEl){

    ovulationEl.textContent =
      jp(p.ovulation);
  }

  const w =
    mentalWeather(
      new Date()
    );

  const weatherEl =
    document.getElementById(
      "mentalWeather"
    );

  if(weatherEl){

    weatherEl.textContent =
      `${w.icon}${w.label}`;
  }

  const weatherNoteEl =
    document.getElementById(
      "weatherNote"
    );

  if(weatherNoteEl){

    weatherNoteEl.textContent =
      w.label;
  }

  const updatedEl =
    document.getElementById(
      "updatedAt"
    );

  if(updatedEl){

    updatedEl.textContent =
      `最終更新：${new Date().toLocaleString("ja-JP")}`;
  }
}

/* =========================
   calendar
========================= */

function renderCalendar(){

  const cal =
    document.getElementById(
      "calendar"
    );

  if(!cal){
    return;
  }

  cal.innerHTML = "";

  const monthLabel =
    document.getElementById(
      "monthLabel"
    );

  if(monthLabel){

    monthLabel.textContent =
      `${current.getFullYear()}年 ${current.getMonth()+1}月`;
  }

  const firstDay =
    new Date(
      current.getFullYear(),
      current.getMonth(),
      1
    ).getDay();

  const lastDate =
    new Date(
      current.getFullYear(),
      current.getMonth()+1,
      0
    ).getDate();

  for(let i=0;i<firstDay;i++){

    const empty =
      document.createElement(
        "div"
      );

    empty.className =
      "day empty";

    cal.appendChild(empty);
  }

  for(let d=1;d<=lastDate;d++){

    const date =
      new Date(
        current.getFullYear(),
        current.getMonth(),
        d
      );

    const key =
      toKey(date);

    const cell =
      document.createElement(
        "button"
      );

    cell.className =
      "day";

    cell.innerHTML =
      `<div class="day-number">${d}</div>`;

    if(key===selectedKey){

      cell.classList.add(
        "selected"
      );
    }

  const starts =
  getStarts();

const lengths =
  getLengths();

for(const startKey of starts){

  const startDate =
    fromKey(startKey);

  const length =
    lengths[startKey] || 5;

  const endDate =
    addDays(
      startDate,
      length - 1
    );

  if(
    date >= startDate &&
    date <= endDate
  ){

    cell.classList.add(
      "period"
    );
  }
}
    for(const p of predictions()){

      if(
        key>=toKey(p.next)
        &&
        key<=toKey(p.nextEnd)
      ){

        cell.classList.add(
          "predicted"
        );
      }

      if(
        key===toKey(
          p.ovulation
        )
      ){

        cell.classList.add(
          "ovulation"
        );
      }

      if(
        key>=toKey(
          p.fertileStart
        )
        &&
        key<=toKey(
          p.fertileEnd
        )
      ){

        cell.classList.add(
          "fertile"
        );
      }
    }

    const symptoms =
      getSymptoms();

    if(symptoms[key]){

      cell.classList.add(
        "has-symptom"
      );
    }

    const watch =
      getWatch();

    if(watch[key]){

      cell.classList.add(
        "has-watch"
      );
    }

    cell.onclick = ()=>{

      selected =
        date;

      selectedKey =
        key;

      render();
    };

    cal.appendChild(cell);
  }
}

/* =========================
   detail
========================= */

function renderDetail(){

  const label =
    document.getElementById(
      "selectedLabel"
    );

  if(label){

    label.textContent =
      selectedKey;
  }

  const detail =
    document.getElementById(
      "dayDetail"
    );

  if(!detail){
    return;
  }

  const symptoms =
    getSymptoms();

  const watch =
    getWatch();

  detail.innerHTML = `

    <p>
      症状：
      ${
        symptoms[selectedKey]
        ?.join("、 ")
        || "なし"
      }
    </p>

    <p>
      Watch：
    </p>

    <pre>
${
  watch[selectedKey]
  ? JSON.stringify(
      watch[selectedKey],
      null,
      2
    )
  : "記録なし"
}
    </pre>

  `;
}
/* =========================
   stats
========================= */

function renderStats(){

  const stats =
    document.getElementById(
      "stats"
    );

  if(!stats){
    return;
  }

  stats.innerHTML = `

    <p>
      平均周期：
      ${avgCycle()}日
    </p>

    <p>
      平均生理期間：
      ${avgPeriod()}日
    </p>

    <p>
      記録回数：
      ${getStarts().length}回
    </p>

  `;
}
/* =========================
   actions
========================= */

function markPeriodStart(){
  let starts = getStarts();
  const lengths = getLengths();

  if(!starts.includes(selectedKey)){
    starts.push(selectedKey);
    lengths[selectedKey] = avgPeriod();
  }

  setStarts(starts);
  setLengths(lengths);

  syncToCloud();
  render();
}

function markPeriodEnd(){
  const starts = getStarts().sort();

  if(!starts.length){
    alert("先に生理開始日を記録してね！");
    return;
  }

  const lastStart = starts[starts.length - 1];
  const startDate = fromKey(lastStart);
  const endDate = fromKey(selectedKey);

  if(endDate < startDate){
    alert("終了日は開始日より後の日付を選んでね！");
    return;
  }

  const length =
    Math.round((endDate - startDate) / 86400000) + 1;

  const lengths = getLengths();
  lengths[lastStart] = length;

  setLengths(lengths);

  syncToCloud();
  render();
}

function toggleSymptom(symptom){

  const symptoms =
    getSymptoms();

  if(!symptoms[selectedKey]){

    symptoms[selectedKey] =
      [];
  }

  if(
    symptoms[selectedKey]
    .includes(symptom)
  ){

    symptoms[selectedKey] =
      symptoms[selectedKey]
      .filter(
        s=>s!==symptom
      );
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

  return {
    raw:text
  };
}

function saveWatch(){

  const input =
    document.getElementById(
      "watchInput"
    );

  if(!input){
    return;
  }

  const text =
    input.value.trim();

  if(!text){
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

/* =========================
   bind
========================= */

const prevBtn =
  document.getElementById(
    "prevMonth"
  );

if(prevBtn){

  prevBtn.onclick = ()=>{

    current.setMonth(
      current.getMonth()-1
    );

    render();
  };
}

const nextBtn =
  document.getElementById(
    "nextMonth"
  );

if(nextBtn){

  nextBtn.onclick = ()=>{

    current.setMonth(
      current.getMonth()+1
    );

    render();
  };
}

const periodStartBtn =
  document.getElementById("periodStartBtn");

if(periodStartBtn){
  periodStartBtn.onclick = markPeriodStart;
}

const periodEndBtn =
  document.getElementById("periodEndBtn");

if(periodEndBtn){
  periodEndBtn.onclick = markPeriodEnd;
}

document
.querySelectorAll(
  ".symptoms button"
)
.forEach(btn=>{

  btn.onclick = ()=>{

    toggleSymptom(
      btn.dataset.symptom
    );
  };
});

const saveWatchBtn =
  document.getElementById(
    "saveWatch"
  );

if(saveWatchBtn){

  saveWatchBtn.onclick =
    saveWatch;
}

/* =========================
   render
========================= */

function render(){

  renderSummary();

  renderCalendar();

  renderDetail();

  renderStats();
}
