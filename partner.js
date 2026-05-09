// =========================
// shared storage
// =========================

const STORAGE_KEY = "cycleData";

// =========================
// load
// =========================

const raw = localStorage.getItem(STORAGE_KEY);

const data = raw
  ? JSON.parse(raw)
  : {
      periods: [
        "2026-05-10"
      ],

      symptoms: {
        "2026-05-09": [
          "頭痛",
          "眠気"
        ]
      },

      watch: {
        "2026-05-09": "⌚"
      },

      updatedAt: null
    };

// =========================
// util
// =========================

function save() {
  data.updatedAt = new Date().toISOString();

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(data)
  );

  render();
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function toKey(date) {
  return `${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}`;
}

function fromKey(key) {
  return new Date(key);
}

function addDays(date, days) {
  const d = new Date(date);

  d.setDate(d.getDate() + days);

  return d;
}

function jp(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// =========================
// cycle prediction
// =========================

function getStarts() {
  return data.periods
    .map(fromKey)
    .sort((a, b) => a - b);
}

function avgCycle() {
  const starts = getStarts();

  if (starts.length < 2) {
    return 28;
  }

  const diffs = [];

  for (let i = 1; i < starts.length; i++) {
    const diff =
      (starts[i] - starts[i - 1]) /
      (1000 * 60 * 60 * 24);

    diffs.push(diff);
  }

  return Math.round(
    diffs.reduce((a, b) => a + b, 0) /
      diffs.length
  );
}

function lastStart() {
  const starts = getStarts();

  return starts[starts.length - 1];
}

function prediction() {
  const last = lastStart();

  if (!last) {
    return null;
  }

  const cycle = avgCycle();

  const next = addDays(last, cycle);

  const nextEnd = addDays(next, 4);

  const ovulation = addDays(next, -14);

  return {
    next,
    nextEnd,
    ovulation
  };
}

// =========================
// mental weather
// =========================

function mentalWeather(today) {
  const p = prediction();

  if (!p) {
    return {
      title: "--",
      note: "--"
    };
  }

  const diff =
    (p.next - today) /
    (1000 * 60 * 60 * 24);

  if (diff <= 3) {
    return {
      title: "☁️PMS注意",
      note: "情緒ゆらぎ注意"
    };
  }

  if (diff <= 10) {
    return {
      title: "🌤比較的安定",
      note: "穏やかモード"
    };
  }

  return {
    title: "🌧ゆったり",
    note: "無理せずいこう"
  };
}

// =========================
// render summary
// =========================

function renderSummary() {
  const p = prediction();

  if (!p) {
    return;
  }

  document.getElementById(
    "nextPeriod"
  ).textContent = jp(p.next);

  document.getElementById(
    "nextRange"
  ).textContent =
    `${jp(p.next)}〜${jp(p.nextEnd)}`;

  document.getElementById(
    "ovulation"
  ).textContent = jp(p.ovulation);

  const weather = mentalWeather(
    new Date()
  );

  document.getElementById(
    "mentalWeather"
  ).textContent = weather.title;

  document.getElementById(
    "weatherNote"
  ).textContent = weather.note;

  const updated =
    document.getElementById(
      "updatedAt"
    );

  if (updated) {
    updated.textContent =
      data.updatedAt
        ? `最終更新：${new Date(
            data.updatedAt
          ).toLocaleString("ja-JP")}`
        : "最終更新：--";
  }
}

// =========================
// calendar
// =========================

let current = new Date();

function renderCalendar() {
  const grid =
    document.getElementById(
      "calendar"
    );

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  const year =
    current.getFullYear();

  const month =
    current.getMonth();

  document.getElementById(
    "monthLabel"
  ).textContent =
    `${year}年 ${month + 1}月`;

  const first = new Date(
    year,
    month,
    1
  );

  const last = new Date(
    year,
    month + 1,
    0
  );

  const startDay =
    first.getDay();

  for (let i = 0; i < startDay; i++) {
    const empty =
      document.createElement("div");

    empty.className =
      "calendar-empty";

    grid.appendChild(empty);
  }

  for (
    let d = 1;
    d <= last.getDate();
    d++
  ) {
    const date = new Date(
      year,
      month,
      d
    );

    const key = toKey(date);

    const cell =
      document.createElement("button");

    cell.className = "day";

    cell.textContent = d;

    if (
      data.periods.includes(key)
    ) {
      cell.classList.add(
        "period"
      );
    }

    if (data.watch[key]) {
      cell.classList.add(
        "watch"
      );
    }

    const p = prediction();

    if (p) {
      const ovKey = toKey(
        p.ovulation
      );

      if (key === ovKey) {
        cell.classList.add(
          "ovulation"
        );
      }

      const fertileStart =
        addDays(
          p.ovulation,
          -5
        );

      const fertileEnd =
        addDays(
          p.ovulation,
          1
        );

      if (
        date >= fertileStart &&
        date <= fertileEnd
      ) {
        cell.classList.add(
          "fertile"
        );
      }
    }

    cell.onclick = () => {
      togglePeriod(key);
    };

    grid.appendChild(cell);
  }
}

// =========================
// actions
// =========================

function togglePeriod(key) {
  const idx =
    data.periods.indexOf(key);

  if (idx >= 0) {
    data.periods.splice(idx, 1);
  } else {
    data.periods.push(key);
  }

  save();
}

// =========================
// render
// =========================

function render() {
  renderSummary();
  renderCalendar();
}

// =========================
// buttons
// =========================

document.getElementById(
  "prevMonth"
).onclick = () => {
  current.setMonth(
    current.getMonth() - 1
  );

  renderCalendar();
};

document.getElementById(
  "nextMonth"
).onclick = () => {
  current.setMonth(
    current.getMonth() + 1
  );

  renderCalendar();
};

// =========================
// init
// =========================

render();
