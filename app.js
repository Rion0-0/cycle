import { sharedRef, setDoc, getDoc } from "./firebase.js";

let current = new Date();
current.setDate(1);

let selected = new Date();
let selectedKey = toKey(selected);

function getStarts() {
  return JSON.parse(localStorage.getItem("periodStarts") || "[]");
}

function setStarts(v) {
  localStorage.setItem("periodStarts", JSON.stringify(v));
}

function getLengths() {
  return JSON.parse(localStorage.getItem("periodLengths") || "{}");
}

function setLengths(v) {
  localStorage.setItem("periodLengths", JSON.stringify(v));
}

function getSymptoms() {
  return JSON.parse(localStorage.getItem("symptoms") || "{}");
}

function setSymptoms(v) {
  localStorage.setItem("symptoms", JSON.stringify(v));
}

function getWatch() {
  return JSON.parse(localStorage.getItem("watchData") || "{}");
}

function setWatch(v) {
  localStorage.setItem("watchData", JSON.stringify(v));
}

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

async function syncToCloud() {
  console.log("syncToCloud 呼ばれたよ☁️");

  const data = {
    periodStarts: getStarts(),
    periodLengths: getLengths(),
    symptoms: getSymptoms(),
    watchData: getWatch(),
    updatedAt: new Date().toISOString()
  };

  console.log("Firestoreに送るデータ:", data);

  try {
    await setDoc(sharedRef, data);
    console.log("同期完了☁️");
  } catch (error) {
    console.error("同期失敗🔥", error);
  }
}

async function loadFromCloud() {
  try {
    const snap = await getDoc(sharedRef);

    if (!snap.exists()) {
      console.log("Firestoreにまだデータなし");
      return;
    }

    const data = snap.data();

    setStarts(data.periodStarts || []);
    setLengths(data.periodLengths || {});
    setSymptoms(data.symptoms || {});
    setWatch(data.watchData || {});

    console.log("Firestoreから読み込み完了☁️", data);
  } catch (error) {
    console.error("読み込み失敗🔥", error);
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
    `最終更新：${new Date().toLocaleString("ja-JP")}`;
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
  const symptoms = getSymptoms();
  const watch = getWatch();
  const pred = predictions();

  for (let d = 1; d <= lastDate; d++) {
    const date = new Date(current.getFullYear(), current.getMonth(), d);
    const key = toKey(date);

    const cell = document.createElement("button");
    cell.className = "day";
    cell.innerHTML = `<div>${d}</div>`;

    if (key === selectedKey) cell.classList.add("selected");

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

    if (symptoms[key]) cell.classList.add("has-symptom");
    if (watch[key]) cell.classList.add("has-watch");

    cell.onclick = () => {
      selected = date;
      selectedKey = key;
      render();
    };

    cal.appendChild(cell);
  }
}

function renderDetail() {
  document.getElementById("selectedLabel").textContent = selectedKey;

  const symptoms = getSymptoms();
  const watch = getWatch();

  document.getElementById("dayDetail").innerHTML = `
    <p>症状：${symptoms[selectedKey]?.join("、") || "なし"}</p>
    <p>Watch：</p>
    <pre>${watch[selectedKey] ? JSON.stringify(watch[selectedKey], null, 2) : "記録なし"}</pre>
  `;
}

function renderStats() {
  document.getElementById("stats").innerHTML = `
    <p>平均周期：${avgCycle()}日</p>
    <p>平均生理期間：${avgPeriod()}日</p>
    <p>記録回数：${getStarts().length}回</p>
  `;
}

function markPeriodStart() {
  const starts = getStarts();
  const lengths = getLengths();

  if (!starts.includes(selectedKey)) {
    starts.push(selectedKey);
    starts.sort();
    lengths[selectedKey] = avgPeriod();
  }

  setStarts(starts);
  setLengths(lengths);

  syncToCloud();
  render();
}

function markPeriodEnd() {
  const starts = getStarts().sort();

  if (!starts.length) {
    alert("先に生理開始日を記録してね！");
    return;
  }

  const startKey = starts.at(-1);
  const startDate = fromKey(startKey);
  const endDate = fromKey(selectedKey);

  if (endDate < startDate) {
    alert("終了日は開始日より後の日付を選んでね！");
    return;
  }

  const length = Math.round((endDate - startDate) / 86400000) + 1;
  const lengths = getLengths();

  lengths[startKey] = length;
  setLengths(lengths);

  syncToCloud();
  render();
}

function cancelPeriod() {
  const starts = getStarts();
  const lengths = getLengths();

  const newStarts = starts.filter(startKey => {
    const startDate = fromKey(startKey);
    const length = Number(lengths[startKey] || 5);
    const endDate = addDays(startDate, length - 1);
    const selectedDate = fromKey(selectedKey);

    const isInsidePeriod =
      selectedDate >= startDate && selectedDate <= endDate;

    if (isInsidePeriod) {
      delete lengths[startKey];
      return false;
    }

    return true;
  });

  setStarts(newStarts);
  setLengths(lengths);

  syncToCloud();
  render();
}
function toggleSymptom(symptom) {
  const symptoms = getSymptoms();

  if (!symptoms[selectedKey]) symptoms[selectedKey] = [];

  if (symptoms[selectedKey].includes(symptom)) {
    symptoms[selectedKey] = symptoms[selectedKey].filter(s => s !== symptom);

    if (!symptoms[selectedKey].length) {
      delete symptoms[selectedKey];
    }
  } else {
    symptoms[selectedKey].push(symptom);
  }

  setSymptoms(symptoms);
  syncToCloud();
  render();
}

function saveWatch() {
  const input = document.getElementById("watchInput");
  const text = input.value.trim();

  if (!text) return;

  const watch = getWatch();

  watch[selectedKey] = {
    raw: text
  };

  setWatch(watch);
  input.value = "";

  syncToCloud();
  render();
}

function bindEvents() {
  document.getElementById("prevMonth").onclick = () => {
    current.setMonth(current.getMonth() - 1);
    render();
  };

  document.getElementById("nextMonth").onclick = () => {
    current.setMonth(current.getMonth() + 1);
    render();
  };

  document.getElementById("periodStartBtn").onclick = markPeriodStart;
  document.getElementById("periodEndBtn").onclick = markPeriodEnd;
  document.getElementById("saveWatch").onclick = saveWatch;

  document.querySelectorAll(".symptoms button").forEach(btn => {
    btn.onclick = () => toggleSymptom(btn.dataset.symptom);
  });
}

function render() {
  renderSummary();
  renderCalendar();
  renderDetail();
  renderStats();
}

await loadFromCloud();
bindEvents();
render();
