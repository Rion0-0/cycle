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

const jp = d =>
  `${d.getMonth()+1}/${d.getDate()}`;

let currentDate = new Date();

let currentYear =
  currentDate.getFullYear();

let currentMonth =
  currentDate.getMonth();

function getStarts(){

  return JSON.parse(
    localStorage.getItem("periodStarts") || "[]"
  ).sort();
}

function getLengths(){

  return JSON.parse(
    localStorage.getItem("periodLengths") || "{}"
  );
}

function avgCycle(){

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

  if(!diffs.length){
    return 33;
  }

  return Math.round(
    diffs.reduce((a,b)=>a+b,0)
    / diffs.length
  );
}

function avgPeriod(){

  const lengths =
    Object.values(getLengths())
    .filter(v=>v>0);

  if(!lengths.length){
    return 6;
  }

  return Math.round(
    lengths.reduce((a,b)=>a+b,0)
    / lengths.length
  );
}

function lastStart(){

  const starts = getStarts();

  return starts.length
    ? fromKey(starts[starts.length-1])
    : null;
}

function predictions(){

  const last = lastStart();

  if(!last) return [];

  const arr = [];

  for(let i=0;i<6;i++){

    const next =
      addDays(last,avgCycle()*(i+1));

    arr.push({

      next,

      nextEnd:
        addDays(
          next,
          avgPeriod()-1
        ),

      ovulation:
        addDays(next,-14),

      fertileStart:
        addDays(next,-19),

      fertileEnd:
        addDays(next,-13),

      pmsStart:
        addDays(next,-7)
    });
  }

  return arr;
}

function mentalWeather(){

  const preds = predictions();

  const today = new Date();

  for(const p of preds){

    if(
      today >= p.pmsStart &&
      today < p.next
    ){

      return {
        icon:"⛈️",
        text:"PMS注意期間",
        note:"ゆっくりめ推奨🌙"
      };
    }

    if(
      today >= p.next &&
      today <= p.nextEnd
    ){

      return {
        icon:"🌧️",
        text:"生理期間",
        note:"やさしく見守り推奨"
      };
    }
  }

  return {
    icon:"☀️",
    text:"比較的安定",
    note:"今日は穏やかめ"
  };
}

function renderSummary(){

  const p =
    predictions()[0];

  if(!p) return;

  document.getElementById(
    "nextPeriod"
  ).textContent =
    jp(p.next);

  const w =
    mentalWeather();

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

  const preds =
    predictions();

  for(let day=1;day<=last.getDate();day++){

    const date =
      new Date(currentYear,currentMonth,day);

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

    const div =
      document.createElement("div");

    div.className = cls;

    div.innerHTML = `
      <button>
        <div class="num">${day}</div>
      </button>
    `;

    cal.appendChild(div);
  }
}

function render(){

  renderSummary();
  renderCalendar();
}

document
.getElementById("prevMonth")
.addEventListener("click",()=>{

  currentMonth--;

  if(currentMonth<0){

    currentMonth = 11;
    currentYear--;
  }

  renderCalendar();
});

document
.getElementById("nextMonth")
.addEventListener("click",()=>{

  currentMonth++;

  if(currentMonth>11){

    currentMonth = 0;
    currentYear++;
  }

  renderCalendar();
});

render();
