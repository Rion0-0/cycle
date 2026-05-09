import {
  initializeApp
}
from
"https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
  getFirestore,
  doc,
  onSnapshot
}
from
"https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {

  apiKey:
  "AIzaSyA8eQWqxpxfMG8LEQgssRzcMJbn93JA5zg",

  authDomain:
  "cycle-counter.firebaseapp.com",

  projectId:
  "cycle-counter",

  storageBucket:
  "cycle-counter.firebasestorage.app",

  messagingSenderId:
  "466749972992",

  appId:
  "1:466749972992:web:80de09778ad7926c28aee5"
};

const app =
  initializeApp(firebaseConfig);

const db =
  getFirestore(app);

const pad = n =>
  String(n).padStart(2,"0");

const toKey = d =>
  `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const fromKey = s => {

  const [y,m,d] =
    s.split("-").map(Number);

  return new Date(y,m-1,d);
};

const addDays = (date,days)=>{

  const d = new Date(date);

  d.setDate(
    d.getDate()+days
  );

  return d;
};

const jp = d =>
  `${d.getMonth()+1}/${d.getDate()}`;

const DEFAULT_CYCLE = 33;
const DEFAULT_PERIOD = 6;

let now = new Date();

let currentYear =
  now.getFullYear();

let currentMonth =
  now.getMonth();

function getStarts(){

  return JSON.parse(
    localStorage.getItem(
      "periodStarts"
    ) || "[]"
  ).sort();
}

function getLengths(){

  return JSON.parse(
    localStorage.getItem(
      "periodLengths"
    ) || "{}"
  );
}

function getSymptoms(){

  return JSON.parse(
    localStorage.getItem(
      "symptoms"
    ) || "{}"
  );
}

function getWatch(){

  return JSON.parse(
    localStorage.getItem(
      "watchData"
    ) || "{}"
  );
}

function avg(arr,fallback){

  if(!arr.length){
    return fallback;
  }

  return Math.round(

    arr.reduce(
      (a,b)=>a+b,
      0
    ) / arr.length
  );
}

function cycleDiffs(){

  const starts =
    getStarts();

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

function avgCycle(){

  return avg(
    cycleDiffs(),
    DEFAULT_CYCLE
  );
}

function avgPeriod(){

  return avg(

    Object.values(
      getLengths()
    ),

    DEFAULT_PERIOD
  );
}

function lastStart(){

  const starts =
    getStarts();

  if(!starts.length){
    return null;
  }

  return fromKey(
    starts[starts.length-1]
  );
}

function predictionFrom(start,n=0){

  const cycle =
    avgCycle();

  const period =
    avgPeriod();

  const next =
    addDays(
      start,
      cycle*(n+1)
    );

  return {

    next,

    nextEnd:
      addDays(
        next,
        period-1
      ),

    ovulation:
      addDays(
        next,
        -14
      ),

    fertileStart:
      addDays(
        next,
        -19
      ),

    fertileEnd:
      addDays(
        next,
        -13
      ),

    pmsStart:
      addDays(
        next,
        -7
      )
  };
}

function predictions(){

  const last =
    lastStart();

  if(!last){
    return [];
  }

  const arr = [];

  for(let i=0;i<6;i++){

    arr.push(
      predictionFrom(last,i)
    );
  }

  return arr;
}

function mentalWeather(date){

  const preds =
    predictions();

  for(const p of preds){

    if(
      date >= p.pmsStart &&
      date < p.next
    ){

      return {

        icon:"⛈️",

        text:"PMS注意",

        note:
        "情緒ゆらぎ注意"
      };
    }

    if(
      date >= p.next &&
      date <= p.nextEnd
    ){

      return {

        icon:"🌧️",

        text:"生理期間",

        note:
        "ゆっくり過ごしてね"
      };
    }
  }

  return {

    icon:"☀️",

    text:"比較的安定",

    note:
    "穏やかモード"
  };
}

function renderSummary(){

  const p =
    predictions()[0];

  if(!p){
    return;
  }

  document.getElementById(
    "nextPeriod"
  ).textContent =
    jp(p.next);

  document.getElementById(
    "nextRange"
  ).textContent =
    `${jp(p.next)}〜${jp(p.nextEnd)}`;

  document.getElementById(
    "ovulation"
  ).textContent =
    jp(p.ovulation);

  const w =
    mentalWeather(
      new Date()
    );

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
    document.getElementById(
      "calendar"
    );

  cal.innerHTML = "";

  document.getElementById(
    "monthLabel"
  ).textContent =
    `${currentYear}年 ${currentMonth+1}月`;

  const first =
    new Date(
      currentYear,
      currentMonth,
      1
    );

  const last =
    new Date(
      currentYear,
      currentMonth+1,
      0
    );

  for(
    let i=0;
    i<first.getDay();
    i++
  ){

    cal.appendChild(
      document.createElement("div")
    );
  }

  const symptoms =
    getSymptoms();

  const watch =
    getWatch();

  const preds =
    predictions();

  for(
    let day=1;
    day<=last.getDate();
    day++
  ){

    const date =
      new Date(
        currentYear,
        currentMonth,
        day
      );

    const key =
      toKey(date);

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
        key === toKey(
          p.ovulation
        )
      ){
        cls += " ovulation";
      }
    }

    if(
      symptoms[key]?.length
    ){
      cls += " has-symptom";
    }

    if(
      watch[key]
    ){
      cls += " has-watch";
    }

    const div =
      document.createElement("div");

    div.className = cls;

    div.innerHTML = `

      <div class="num">
        ${day}
      </div>
    `;

    cal.appendChild(div);
  }
}

function render(){

  renderSummary();
  renderCalendar();
}

document
.getElementById(
  "prevMonth"
)
?.addEventListener(
  "click",
  ()=>{

    currentMonth--;

    if(currentMonth<0){

      currentMonth=11;
      currentYear--;
    }

    render();
  }
);

document
.getElementById(
  "nextMonth"
)
?.addEventListener(
  "click",
  ()=>{

    currentMonth++;

    if(currentMonth>11){

      currentMonth=0;
      currentYear++;
    }

    render();
  }
);

onSnapshot(

  doc(
    db,
    "cycles",
    "shared"
  ),

  snapshot=>{

    const data =
      snapshot.data();

    if(!data){
      return;
    }

    localStorage.setItem(

      "periodStarts",

      JSON.stringify(
        data.periodStarts || []
      )
    );

    localStorage.setItem(

      "periodLengths",

      JSON.stringify(
        data.periodLengths || {}
      )
    );

    localStorage.setItem(

      "symptoms",

      JSON.stringify(
        data.symptoms || {}
      )
    );

    localStorage.setItem(

      "watchData",

      JSON.stringify(
        data.watchData || {}
      )
    );
if(data.updatedAt){

  const d =
    new Date(data.updatedAt);

  document.getElementById(
    "updatedAt"
  ).textContent =

    `最終更新：
    ${d.getMonth()+1}/${d.getDate()}
    ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
}
    render();

    console.log(
      "リアルタイム同期✨"
    );
  }
);
