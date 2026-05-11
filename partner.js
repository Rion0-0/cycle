import { sharedRef, onSnapshot } from "./firebase.js";

let cloudData = {
  periodStarts: [],
  periodLengths: {},
  symptoms: {},
  watchData: {},
  updatedAt: null
};

let current = new Date();
current.setDate(1);

function pad(n) {
  return String(n).padStart(2, "0");
}

function toKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fromKey(k) {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function jp(d) {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getStarts() {
  return cloudData.periodStarts || [];
}

function getLengths() {
  return cloudData.periodLengths || {};
}

function cycleDiffs() {
  const starts = getStarts().map(fromKey).sort((a, b) => a - b);
  const arr = [];

  for (let i = 1; i < starts.length; i++) {
    arr.push(Math.round((starts[i] - starts[i - 1]) / 86400000));
  }

  return arr;
}

function avgCycle() {
  const arr = cycleDiffs();
  if (!arr.length) return 28;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}

function avgPeriod() {
  const values = Object.values(getLengths()).map(Number);
  if (!values.length) return 5;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

function lastStart() {
  return getStarts().sort().at(-1);
}

function predictionFrom(startKey) {
  const cycle = avgCycle();
  const period = avgPeriod();
  const start = fromKey(startKey);

  const next = addDays(start, cycle);
  const nextEnd = addDays(next, period - 1);
  const ovulation = addDays(next, -14);
  const fertileStart = addDays(ovulation, -5);
  const fertileEnd = addDays(ovulation, 1);

  return { next, nextEnd, ovulation, fertileStart, fertileEnd };
}

function predictions() {
  const start = lastStart();
  if (!start) return [];

  const arr = [];
  let currentStart = start;

  for (let i = 0; i < 6; i++) {
    const p = predictionFrom(currentStart);
    arr.push(p);
    currentStart = toKey(p.next);
  }

  return arr;
}

function mentalWeather(date) {
  const start = lastStart();

  if (!start) {
    return { icon: "☀️", label: "安定" };
  }

  const diff = Math.round((date - fromKey(start)) / 86400000);
  const cycle = avgCycle();
  const day = ((diff % cycle) + cycle) % cycle;

  if (day >= cycle - 7) return { icon: "⛈️", label: "PMS注意" };
  if (day <= 4) return { icon: "🌧️", label: "ゆったり" };

  return { icon: "☀️", label: "比較的安定" };
}

function renderCalendar() {
  const cal = document.getElementById("calendar");
  cal.innerHTML = "";

  document.getElementById("monthLabel").textContent =
    `${current.getFullYear()}年 ${current.getMonth() + 1}月`;

  const firstDay = new Date(current.getFullYear(), current.getMonth(), 1).getDay();
  const lastDate = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "day empty";
    cal.appendChild(empty);
  }

  const starts = getStarts();
  const lengths = getLengths();
  const pred = predictions();

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(current.getFullYear(), current.getMonth(), d);
    const key = toKey(date);

    const cell = document.createElement("div");
    cell.className = "day";
    cell.innerHTML = `<div>${d}</div>`;

    for (const startKey of starts) {
      const startDate = fromKey(startKey);
      const length = Number(lengths[startKey] || 5);
      const endDate = addDays(startDate, length - 1);

      if (date >= startDate && date <= endDate) {
        cell.classList.add("period");
      }
    }

    for (const p of pred) {
      if (key >= toKey(p.next) && key <= toKey(p.nextEnd)) {
        cell.classList.add("predicted");
      }

      if (key === toKey(p.ovulation)) {
        cell.classList.add("ovulation");
      }

      if (key >= toKey(p.fertileStart) && key <= toKey(p.fertileEnd)) {
        cell.classList.add("fertile");
      }
    }

    cal.appendChild(cell);
  }
}

function renderSummary() {
  const p = predictions()[0];

  if (p) {
    document.getElementById("nextPeriod").textContent = jp(p.next);
    document.getElementById("nextRange").textContent = `${jp(p.next)}〜${jp(p.nextEnd)}`;
    document.getElementById("ovulation").textContent = jp(p.ovulation);
  }

  const w = mentalWeather(new Date());
  document.getElementById("mentalWeather").textContent = `${w.icon}${w.label}`;

  document.getElementById("updatedAt").textContent =
    cloudData.updatedAt
      ? `最終更新：${new Date(cloudData.updatedAt).toLocaleString("ja-JP")}`
      : "最終更新：未同期";
}

function render() {
  renderCalendar();
  renderSummary();
}

document.getElementById("prevMonth").onclick = () => {
  current.setMonth(current.getMonth() - 1);
  render();
};

document.getElementById("nextMonth").onclick = () => {
  current.setMonth(current.getMonth() + 1);
  render();
};

onSnapshot(sharedRef, snap => {
  if (!snap.exists()) {
    console.log("共有データなし");
    render();
    return;
  }

  cloudData = snap.data();
  console.log("共有データ更新☁️", cloudData);
  render();
});

render();
