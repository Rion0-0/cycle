import {

  doc,
  onSnapshot

}
from
"https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

let current =
  new Date();

current.setDate(1);

let data = {

  periodStarts:[],
  periodLengths:{},
  symptoms:{},
  watchData:{},
  updatedAt:null
};

/* ========================= */

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

/* ========================= */

function avgCycle(){

  const starts =
    data.periodStarts
    .map(fromKey)
    .sort((a,b)=>a-b);

  if(starts.length<2){
    return 28;
  }

  const arr = [];

  for(let i=1;i<starts.length;i++){

    arr.push(
      Math.round(
        (starts[i]-starts[i-1])
        /86400000
      )
    );
  }

  return Math.round(
    arr.reduce((a,b)=>a+b,0)
    /arr.length
  );
}

function avgPeriod(){

  const arr =
    Object.values(
      data.periodLengths
    );

  if(!arr.length){
    return 5;
  }

  return Math.round(
    arr.reduce((a,b)=>a+b,0)
    /arr.length
  );
}

function lastStart(){

  return data
    .periodStarts
    .sort()
    .at(-1);
}

function prediction(){

  const start =
    lastStart();

  if(!start){
    return null;
  }

  const cycle =
    avgCycle();

  const period =
    avgPeriod();

  const next =
    addDays(
      fromKey(start),
      cycle
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
      )
  };
}

/* ========================= */

function renderSummary(){

  const p =
    prediction();

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

  document.getElementById(
    "mentalWeather"
  ).textContent =
    "☀️";

  document.getElementById(
    "weatherNote"
  ).textContent =
    "共有中";

  if(data.updatedAt){

    document.getElementById(
      "updatedAt"
    ).textContent =

      `最終更新：
      ${
        new Date(
          data.updatedAt
        ).toLocaleString("ja-JP")
      }`;
  }
}

/* ========================= */

function renderCalendar(){

  const cal =
    document.getElementById(
      "calendar"
    );

  cal.innerHTML = "";

  document.getElementById(
    "monthLabel"
  ).textContent =

    `${current.getFullYear()}年 ${current.getMonth()+1}月`;

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

  const p =
    prediction();

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

    if(
      data.periodStarts
      .includes(key)
    ){

      cell.classList.add(
        "period"
      );
    }

    if(p){

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

    if(
      data.symptoms[key]
    ){

      cell.classList.add(
        "has-symptom"
      );
    }

    if(
      data.watchData[key]
    ){

      cell.classList.add(
        "has-watch"
      );
    }

    cal.appendChild(cell);
  }
}

/* ========================= */

function render(){

  renderSummary();

  renderCalendar();
}

/* ========================= */

document
.getElementById(
  "prevMonth"
)
.onclick = ()=>{

  current.setMonth(
    current.getMonth()-1
  );

  render();
};

document
.getElementById(
  "nextMonth"
)
.onclick = ()=>{

  current.setMonth(
    current.getMonth()+1
  );

  render();
};

/* ========================= */

onSnapshot(

  doc(
    window.db,
    "cycles",
    "shared"
  ),

  (snap)=>{

    if(!snap.exists()){
      return;
    }

    data =
      snap.data();

    render();
  }
);
