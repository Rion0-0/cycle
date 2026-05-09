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

    console.error("Firebase同期失敗",e);
  }
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
