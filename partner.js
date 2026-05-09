import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA8eQWqxpxfMG8LEQgssRzcMJbn93JA5zg",
  authDomain: "cycle-counter.firebaseapp.com",
  projectId: "cycle-counter",
  storageBucket: "cycle-counter.firebasestorage.app",
  messagingSenderId: "466749972992",
  appId: "1:466749972992:web:80de09778ad7926c28aee5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let current = new Date();
current.setDate(1);

let shared = {
  periodStarts: [],
  periodLengths: {},
  symptoms: {},
  watchData: {},
  updatedAt: null
};

function pad(n){
  return String(n).padStart(2, "0");
}

function toKey(d){
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

function fromKey(k){
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n){
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function jp(d){
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function avgCycle(){
  const starts = [...(shared.periodStarts || [])].sort();

  if(starts.length < 2){
    return 33;
  }

  const diffs = [];

  for(let i = 1; i < starts.length; i++){
    const diff = Math.round((fromKey(starts[i]) - fromKey(starts[i - 1])) / 86400000);

    if(diff >= 15 && diff <= 60){
      diffs.push(diff);
    }
  }

  if(!diffs.length){
    return 33;
  }

  return Math.round(diffs.reduce((a,b)=>a+b,0) / diffs.length);
}

function avgPeriod(){
  const vals = Object.values(shared.periodLengths || {}).filter(v => Number(v) > 0);

  if(!vals.length){
    return 6;
  }

  return Math.round(vals.reduce((a,b)=>a+b,0) / vals.length);
}

function lastStart(){
  const starts = [...(shared.periodStarts || [])].sort();
  return starts.at(-1) || null;
}

function predictions(){
  const last = lastStart();

  if(!last){
    return [];
  }

  const arr = [];
  let base = fromKey(last);

  for(let i = 0; i < 6; i++){
    const next = addDays(base, avgCycle());
    const nextEnd = addDays(next, avgPeriod() - 1);
    const ovulation = addDays(next, -14);
    const fertileStart = addDays(ovulation, -5);
    const fertileEnd = addDays(ovulation, 1);
    const pmsStart = addDays(next, -7);

    arr.push({
      next,
      nextEnd,
      ovulation,
      fertileStart,
      fertileEnd,
      pmsStart
    });

    base = next;
  }

  return arr;
}

function mentalWeather(date){
  for(const p of predictions()){
    if(date >= p.next && date <= p.nextEnd){
      return {
        icon: "🌧️",
        label: "生理期間",
        note: "ゆっくり見守り推奨"
      };
    }

    if(date >= p.pmsStart && date < p.next){
      return {
        icon: "⛈️",
        label: "PMS注意",
        note: "情緒ゆらぎ注意"
      };
    }
  }

  return {
    icon: "☀️",
    label: "比較的安定",
    note: "穏やかモード"
  };
}

function renderSummary(){
  const p = predictions()[0];

  if(!p){
    return;
  }

  document.getElementById("nextPeriod").textContent = jp(p.next);
  document.getElementById("nextRange").textContent = `${jp(p.next)}〜${jp(p.nextEnd)}`;
  document.getElementById("ovulation").textContent = jp(p.ovulation);

  const weather = mentalWeather(new Date());

  document.getElementById("mentalWeather").textContent = `${weather.icon} ${weather.label}`;
  document.getElementById("weatherNote").textContent = weather.note;

  const updatedEl = document.getElementById("updatedAt");

  if(updatedEl){
    updatedEl.textContent = shared.updatedAt
      ? `最終更新：${new Date(shared.updatedAt).toLocaleString("ja-JP")}`
      : "最終更新：--";
  }
}

function renderCalendar(){
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";

  document.getElementById("monthLabel").textContent =
    `${current.getFullYear()}年 ${current.getMonth()+1}月`;

  const firstDay = new Date(current.getFullYear(), current.getMonth(), 1).getDay();
  const lastDate = new Date(current.getFullYear(), current.getMonth()+1, 0).getDate();

  for(let i = 0; i < firstDay; i++){
    const empty = document.createElement("div");
    empty.className = "day empty";
    cal.appendChild(empty);
  }

  const preds = predictions();

  for(let d = 1; d <= lastDate; d++){
    const date = new Date(current.getFullYear(), current.getMonth(), d);
    const key = toKey(date);

    const cell = document.createElement("button");
    cell.className = "day";
    cell.innerHTML = `<div class="day-number">${d}</div>`;

    if((shared.periodStarts || []).includes(key)){
      cell.classList.add("period");
    }

    for(const p of preds){
      if(date >= p.next && date <= p.nextEnd){
        cell.classList.add("predicted");
      }

      if(key === toKey(p.ovulation)){
        cell.classList.add("ovulation");
      }

      if(date >= p.fertileStart && date <= p.fertileEnd){
        cell.classList.add("fertile");
      }
    }

    if(shared.symptoms && shared.symptoms[key]){
      cell.classList.add("has-symptom");
    }

    if(shared.watchData && shared.watchData[key]){
      cell.classList.add("has-watch");
    }

    cal.appendChild(cell);
  }
}

function render(){
  renderSummary();
  renderCalendar();
}

document.getElementById("prevMonth").onclick = () => {
  current.setMonth(current.getMonth() - 1);
  render();
};

document.getElementById("nextMonth").onclick = () => {
  current.setMonth(current.getMonth() + 1);
  render();
};

onSnapshot(doc(db, "cycles", "shared"), (snap) => {
  if(!snap.exists()){
    return;
  }

  shared = snap.data();
  render();
  console.log("partner synced", shared);
});
