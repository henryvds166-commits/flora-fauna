const C=window.FLORA;
const DB_NAME=C.dbName,DB_VERSION=2;
/* Two sections share one database. 'flora' keeps the original store name so existing observations are preserved. */
const SEC={
 flora:{store:'observations',noun:'flora',eyebrow:'FLORA LOG',title:'Flora observations',icon:'#i-flora',season:true,ph:{commonNameEn:'e.g. King protea',commonNameAf:'e.g. Koningsprotea',family:'e.g. Proteaceae',genus:'e.g. Protea',species:'e.g. cynaroides',locality:'Where was it found? Habitat, altitude, number of plants, specimen description',notes:'Identification notes, references, pollinators, observations'}},
 fauna:{store:'fauna',noun:'fauna',eyebrow:'FAUNA LOG',title:'Fauna observations',icon:'#i-fauna',season:false,ph:{commonNameEn:'e.g. Lion',commonNameAf:'e.g. Leeu',family:'e.g. Felidae',genus:'e.g. Panthera',species:'e.g. leo',locality:'Where was it seen? Habitat, behaviour, number of animals, specimen details',notes:'Identification notes, references, behaviour, observations'}}
};
let cur='flora';
const $=id=>document.getElementById(id);
let db,data={flora:[],fauna:[]},groupMode='family',viewMode='cards',currentPhotos=[];
const recs=()=>data[cur];const store=()=>SEC[cur].store;
const closedFamilies=new Set(),closedGenera=new Set(),closedDates=new Set();
try{viewMode=localStorage.getItem('floraView')||'cards';groupMode=localStorage.getItem('floraGroup')||'family';cur=localStorage.getItem('floraSection')==='fauna'?'fauna':'flora';}catch{}

/* ---------- storage (IndexedDB) ---------- */
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{for(const s of Object.values(SEC))if(!req.result.objectStoreNames.contains(s.store))req.result.createObjectStore(s.store,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function allRecords(st=store()){return new Promise((resolve,reject)=>{const r=db.transaction(st,'readonly').objectStore(st).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function saveRecord(rec,st=store()){return new Promise((resolve,reject)=>{const tx=db.transaction(st,'readwrite');tx.objectStore(st).put(rec);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}
function deleteRecord(id,st=store()){return new Promise((resolve,reject)=>{const tx=db.transaction(st,'readwrite');tx.objectStore(st).delete(id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}

/* ---------- helpers ---------- */
const escapeHTML=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const todayISO=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
function fmtDate(d){if(!d)return'Date not recorded';const dt=new Date(d+'T00:00:00');return isNaN(dt)?escapeHTML(d):dt.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}
function sciName(r){const g=(r.genus||'').trim(),s=(r.species||'').trim();return g&&s?g+' '+s:g?g+' sp.':s||'Unidentified';}
const emptyLast=(a,b)=>!a?1:!b?-1:a.localeCompare(b);
const byNewest=(a,b)=>(b.dateObserved||'').localeCompare(a.dateObserved||'')||sciName(a).localeCompare(sciName(b));
const photosOf=r=>Array.isArray(r.photos)&&r.photos.length?r.photos:(r.photo?[r.photo]:[]);
const MAX_PHOTOS=12;
const commonLine=r=>[r.commonNameEn,r.commonNameAf].filter(Boolean).map(escapeHTML).join(' · ');
const iconFor=()=>`<svg class="ico" viewBox="0 0 512 512" aria-hidden="true"><use href="${SEC[cur].icon}"/></svg>`;

/* ---------- init ---------- */
async function init(){
  document.title=C.name;$('brandName').textContent=C.short;$('brandTag').textContent=C.tagline;$('heroTitle').innerHTML=C.hero;$('footerName').textContent=C.footer;$('footerNote').textContent=C.disclaimer;if(C.copyright)$('copyright').textContent=C.copyright;
  db=await openDB();data.flora=await allRecords('observations');data.fauna=await allRecords('fauna');await migratePhotos();applySection();render();storageInfo();updateConnection();
}
async function migratePhotos(){
  for(const sec of Object.keys(SEC))for(const r of data[sec]){if(r.photo!==undefined&&!(Array.isArray(r.photos)&&r.photos.length&&!r.photo)){r.photos=photosOf(r);delete r.photo;await saveRecord(r,SEC[sec].store);}}
}
function updateConnection(){const on=navigator.onLine;$('connection').textContent=on?'Online · local log ready':'Offline · local log ready';$('dot').style.background=on?'#8ac69b':'#e2b65f';}
addEventListener('online',updateConnection);addEventListener('offline',updateConnection);

/* ---------- sections (flora / fauna) ---------- */
function applySection(){
  const s=SEC[cur];
  $('tabFlora').classList.toggle('active',cur==='flora');$('tabFauna').classList.toggle('active',cur==='fauna');
  $('tabFlora').setAttribute('aria-selected',cur==='flora');$('tabFauna').setAttribute('aria-selected',cur==='fauna');
  $('sectionEyebrow').textContent=s.eyebrow;$('sectionTitle').textContent=s.title;$('addLabel').textContent='Add '+s.noun+' observation';$('csvSection').textContent=s.noun;
  $('seasonField').classList.toggle('hidden',!s.season);
  for(const k of ['commonNameEn','commonNameAf','family','genus','species','locality','notes'])$(k).placeholder=s.ph[k];
  $('search').placeholder='Search '+s.noun+' by name, family, genus, species, place or notes';
}
function setSection(name){
  if(name===cur)return;cur=name;setPref('floraSection',cur);
  $('search').value='';$('familyFilter').value='';$('genusFilter').value='';
  closedFamilies.clear();closedGenera.clear();closedDates.clear();
  applySection();render();
}
$('tabFlora').onclick=()=>setSection('flora');$('tabFauna').onclick=()=>setSection('fauna');

/* ---------- rendering ---------- */
function cardHTML(r){
  return `<article class="obs-card" data-id="${r.id}" tabindex="0" role="button" aria-label="Edit ${escapeHTML(sciName(r))}">
  <div class="obs-image">${photosOf(r).length?`<img src="${photosOf(r)[0]}" alt="${escapeHTML(sciName(r))}" loading="lazy">`:iconFor()}${photosOf(r).length>1?`<span class="photobadge">&#128247; ${photosOf(r).length}</span>`:''}</div>
  <div class="obs-body"><h3>${escapeHTML(sciName(r))}</h3>
  ${commonLine(r)?`<div class="common">${commonLine(r)}</div>`:''}
  <div class="obs-meta">${fmtDate(r.dateObserved)}${r.family?' · '+escapeHTML(r.family):''}</div>
  ${r.floweringSeason?`<span class="tag">✿ ${escapeHTML(r.floweringSeason)}</span>`:''}
  ${r.locality?`<div class="obs-note">${escapeHTML(r.locality)}</div>`:''}
  ${r.notes?`<div class="obs-note"><em>${escapeHTML(r.notes)}</em></div>`:''}
  <div class="card-actions"><button class="smallbtn" type="button" data-edit="${r.id}">Edit</button></div></div></article>`;
}
function rowHTML(r){
  return `<div class="obs-row" data-id="${r.id}" tabindex="0" role="button" aria-label="Edit ${escapeHTML(sciName(r))}">
  <div class="row-thumb">${photosOf(r).length?`<img src="${photosOf(r)[0]}" alt="" loading="lazy">`:iconFor()}</div>
  <div class="row-main"><strong>${escapeHTML(sciName(r))}</strong>${commonLine(r)?`<span class="common">${commonLine(r)}</span>`:''}
  <span class="row-sub">${fmtDate(r.dateObserved)}${r.floweringSeason?' · ✿ '+escapeHTML(r.floweringSeason):''}${r.locality?' · '+escapeHTML(r.locality.replace(/\s+/g,' ')):''}</span></div>
  <button class="smallbtn" type="button" data-edit="${r.id}">Edit</button></div>`;
}
const itemsHTML=list=>list.length?`<div class="${viewMode==='cards'?'obs-grid':'obs-list'}">${list.map(viewMode==='cards'?cardHTML:rowHTML).join('')}</div>`:'';
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;

function render(){
  renderBackupBanner();
  $('viewCards').classList.toggle('active',viewMode==='cards');$('viewList').classList.toggle('active',viewMode==='list');
  $('groupFamily').classList.toggle('active',groupMode==='family');$('groupDate').classList.toggle('active',groupMode==='date');
  const q=$('search').value.trim().toLowerCase();
  const records=recs();
  $('floraTabCount').textContent=data.flora.length;$('faunaTabCount').textContent=data.fauna.length;
  const families=[...new Set(records.map(r=>r.family).filter(Boolean))].sort();
  const oldF=$('familyFilter').value;
  $('familyFilter').innerHTML='<option value="">All families</option>'+families.map(f=>`<option>${escapeHTML(f)}</option>`).join('');
  $('familyFilter').value=families.includes(oldF)?oldF:'';
  const fam=$('familyFilter').value;
  const genera=[...new Set(records.filter(r=>!fam||r.family===fam).map(r=>r.genus).filter(Boolean))].sort();
  const oldG=$('genusFilter').value;
  $('genusFilter').innerHTML='<option value="">All genera</option>'+genera.map(g=>`<option>${escapeHTML(g)}</option>`).join('');
  $('genusFilter').value=genera.includes(oldG)?oldG:'';
  const gen=$('genusFilter').value;
  const filtered=records.filter(r=>{
    const hay=[r.commonNameEn,r.commonNameAf,r.family,r.genus,r.species,sciName(r),r.dateObserved,r.locality,r.floweringSeason,r.notes].join(' ').toLowerCase();
    return(!q||hay.includes(q))&&(!fam||r.family===fam)&&(!gen||r.genus===gen);
  });
  $('obsCount').textContent=records.length;
  $('familyCount').textContent=families.length;
  $('genusCount').textContent=new Set(records.map(r=>norm(r.genus)).filter(Boolean)).size;
  $('speciesCount').textContent=new Set(records.filter(r=>r.species).map(r=>norm(r.genus+' '+r.species))).size;
  $('photoCount').textContent=records.reduce((n,r)=>n+photosOf(r).length,0);
  const filtering=!!(q||fam||gen);
  if(!filtered.length){$('obsGrid').innerHTML=`<div class="empty">${records.length?'No matching observations. Try another search or filter.':`No ${SEC[cur].noun} observations yet. Tap “Add ${SEC[cur].noun} observation” to record your first one.`}</div>`;return;}
  if(groupMode==='date'){
    const by=new Map();
    for(const r of filtered){const k=(r.dateObserved||'').slice(0,7);if(!by.has(k))by.set(k,[]);by.get(k).push(r);}
    $('obsGrid').innerHTML=[...by.keys()].sort((a,b)=>!a?1:!b?-1:b.localeCompare(a)).map(k=>{
      const list=by.get(k).sort(byNewest);
      const label=k?new Date(k+'-01T00:00:00').toLocaleDateString('en-GB',{month:'long',year:'numeric'}):'Date not recorded';
      return `<details class="date-group" data-dkey="${escapeHTML(k)}"${closedDates.has(k)&&!filtering?'':' open'}><summary><span class="fam-name">${escapeHTML(label)}</span><span class="fam-count">${plural(list.length,'observation','observations')}</span></summary><div class="date-body">${itemsHTML(list)}</div></details>`;
    }).join('');
    return;
  }
  const byFam=new Map();
  for(const r of filtered){const f=r.family||'',g=r.genus||'';if(!byFam.has(f))byFam.set(f,new Map());const gm=byFam.get(f);if(!gm.has(g))gm.set(g,[]);gm.get(g).push(r);}
  $('obsGrid').innerHTML=[...byFam.keys()].sort(emptyLast).map(f=>{
    const gm=byFam.get(f),gkeys=[...gm.keys()].sort(emptyLast),count=[...gm.values()].reduce((n,a)=>n+a.length,0);
    const body=gkeys.map(g=>{const key=f+'|'+g,list=gm.get(g).sort(byNewest);
      return `<details class="genus-group" data-gkey="${escapeHTML(key)}"${closedGenera.has(key)&&!filtering?'':' open'}><summary class="genus-title"><span>${g?escapeHTML(g):'Genus not specified'}</span><span class="fam-count">${plural(list.length,'observation','observations')}</span></summary>${itemsHTML(list)}</details>`;}).join('');
    return `<details class="family-group" data-family="${escapeHTML(f)}"${closedFamilies.has(f)&&!filtering?'':' open'}><summary><span class="fam-name">${f?escapeHTML(f):'Family not specified'}</span><span class="fam-count">${plural(gkeys.length,'genus','genera')} · ${plural(count,'observation','observations')}</span></summary><div class="family-body">${body}</div></details>`;
  }).join('');
}
$('obsGrid').addEventListener('toggle',e=>{
  const d=e.target;if(!d.matches)return;
  const flip=(set,key)=>d.open?set.delete(key):set.add(key);
  if(d.matches('details.family-group'))flip(closedFamilies,d.dataset.family);
  else if(d.matches('details.genus-group'))flip(closedGenera,d.dataset.gkey);
  else if(d.matches('details.date-group'))flip(closedDates,d.dataset.dkey);
},true);
$('obsGrid').addEventListener('click',e=>{if(e.target.closest('summary'))return;const el=e.target.closest('[data-id]');if(el)openForm(recs().find(r=>r.id===el.dataset.id));});
$('obsGrid').addEventListener('keydown',e=>{if(e.key!=='Enter'||e.target.tagName==='BUTTON')return;const el=e.target.closest('[data-id]');if(el)openForm(recs().find(r=>r.id===el.dataset.id));});
$('expandAll').onclick=()=>{closedFamilies.clear();closedGenera.clear();closedDates.clear();render();};
$('collapseAll').onclick=()=>{recs().forEach(r=>{closedFamilies.add(r.family||'');closedGenera.add((r.family||'')+'|'+(r.genus||''));closedDates.add((r.dateObserved||'').slice(0,7));});render();};
const setPref=(k,v)=>{try{localStorage.setItem(k,v);}catch{}};
$('viewCards').onclick=()=>{viewMode='cards';setPref('floraView',viewMode);render();};
$('viewList').onclick=()=>{viewMode='list';setPref('floraView',viewMode);render();};
$('groupFamily').onclick=()=>{groupMode='family';setPref('floraGroup',groupMode);render();};
$('groupDate').onclick=()=>{groupMode='date';setPref('floraGroup',groupMode);render();};
$('search').oninput=render;$('familyFilter').onchange=render;$('genusFilter').onchange=render;

/* ---------- add / edit form ---------- */
function renderPhotos(){
  const n=currentPhotos.length;
  $('photoGrid').innerHTML=currentPhotos.map((src,i)=>`<div class="thumb"><img src="${src}" alt="Photograph ${i+1}" data-view="${i}"><button type="button" class="thumbdel" data-del="${i}" aria-label="Delete photograph ${i+1}">&times;</button></div>`).join('');
  $('photoEmpty').classList.toggle('hidden',n>0);
  $('removeAllPhotos').classList.toggle('hidden',n<2);
  $('photoCountLabel').textContent=n?`(${n})`:'';
}
$('photoGrid').addEventListener('click',e=>{
  const del=e.target.closest('[data-del]'),view=e.target.closest('[data-view]');
  if(del){if(confirm('Delete this photograph?')){currentPhotos.splice(+del.dataset.del,1);renderPhotos();}}
  else if(view){$('photoLarge').src=currentPhotos[+view.dataset.view];$('photoDialog').showModal();}
});
$('removeAllPhotos').onclick=()=>{if(confirm('Delete all '+currentPhotos.length+' photographs from this observation?')){currentPhotos=[];renderPhotos();}};
$('closePhoto').onclick=()=>$('photoDialog').close();
$('photoDialog').addEventListener('click',e=>{if(e.target===$('photoDialog'))$('photoDialog').close();});
async function addFiles(files){
  let failed=0;
  for(const f of files){
    if(currentPhotos.length>=MAX_PHOTOS){alert(`Up to ${MAX_PHOTOS} photographs can be kept per observation.`);break;}
    try{currentPhotos.push(await fileToDataURL(f));renderPhotos();}catch{failed++;}
  }
  if(failed)alert(failed+' image(s) could not be read. Please try another photograph.');
}
$('photo').onchange=async e=>{const fs=[...e.target.files];e.target.value='';await addFiles(fs);};
$('camNative').onchange=async e=>{const fs=[...e.target.files];e.target.value='';await addFiles(fs);if(fs.length){$('cameraDialog').close();}};

/* ---------- in-app camera (opens the phone or laptop camera directly) ---------- */
let camStream=null,camFacing='environment',camShots=0;
function stopCamera(){if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null;}const v=$('camVideo');v.srcObject=null;$('camShoot').disabled=true;}
function showCamErr(msg){const e=$('camErr');e.textContent=msg;e.classList.remove('hidden');$('camFallback').classList.remove('hidden');$('camShoot').disabled=true;}
async function startCamera(){
  stopCamera();$('camErr').classList.add('hidden');$('camFallback').classList.add('hidden');
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){showCamErr('The live camera is not available here (it needs a secure https link). Use the button below to open your camera app instead.');return;}
  try{
    camStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:camFacing},width:{ideal:1920},height:{ideal:1440}},audio:false});
    const v=$('camVideo');v.srcObject=camStream;await v.play().catch(()=>{});
    const front=(camStream.getVideoTracks()[0].getSettings().facingMode||camFacing)==='user';
    v.classList.toggle('mirror',front);
    $('camShoot').disabled=false;
    const cams=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');
    $('camSwitch').classList.toggle('hidden',cams.length<2);
  }catch(err){
    const n=err&&err.name;
    showCamErr(n==='NotAllowedError'||n==='SecurityError'?'Camera permission was blocked. Tap the lock icon next to the web address, allow Camera for this site, then tap Take photo again. Or use the button below.':n==='NotFoundError'||n==='OverconstrainedError'?'No camera was found on this device. You can pick a photo instead.':'The camera could not be started. Use the button below to open your camera app instead.');
  }
}
$('takePhoto').onclick=()=>{
  if(currentPhotos.length>=MAX_PHOTOS){alert(`Up to ${MAX_PHOTOS} photographs can be kept per observation.`);return;}
  camShots=0;$('camCount').textContent='0';$('cameraDialog').showModal();startCamera();
};
$('camShoot').onclick=()=>{
  const v=$('camVideo');if(!v.videoWidth)return;
  if(currentPhotos.length>=MAX_PHOTOS){alert(`Up to ${MAX_PHOTOS} photographs can be kept per observation.`);return;}
  const s=Math.min(1,1400/Math.max(v.videoWidth,v.videoHeight)),c=document.createElement('canvas');
  c.width=Math.round(v.videoWidth*s);c.height=Math.round(v.videoHeight*s);c.getContext('2d').drawImage(v,0,0,c.width,c.height);
  currentPhotos.push(c.toDataURL('image/jpeg',.82));renderPhotos();camShots++;$('camCount').textContent=camShots;
  const st=document.querySelector('.camstage');st.classList.add('flash');setTimeout(()=>st.classList.remove('flash'),180);
};
$('camSwitch').onclick=()=>{camFacing=camFacing==='environment'?'user':'environment';startCamera();};
$('camDone').onclick=$('camClose').onclick=()=>$('cameraDialog').close();
$('cameraDialog').addEventListener('close',stopCamera);
function refreshLists(){
  const records=recs();
  const opt=a=>a.map(v=>`<option value="${escapeHTML(v)}">`).join('');
  $('familyList').innerHTML=opt([...new Set(records.map(r=>r.family).filter(Boolean))].sort());
  const fam=$('family').value.trim().toLowerCase();
  const pool=records.filter(r=>!fam||(r.family||'').toLowerCase()===fam);
  $('genusList').innerHTML=opt([...new Set((pool.length?pool:records).map(r=>r.genus).filter(Boolean))].sort());
  const g=norm($('genus').value);
  $('speciesList').innerHTML=opt([...new Set(records.filter(r=>g&&norm(r.genus)===g).map(r=>r.species).filter(Boolean))].sort());
}
function suggestFamily(genus){
  const g=norm(genus);if(!g)return'';
  const hit=[...recs()].filter(r=>norm(r.genus)===g&&r.family).sort(byNewest)[0];
  return hit?hit.family:'';
}
$('genus').addEventListener('input',()=>{
  const f=$('family');
  if(!f.value.trim()||f.dataset.auto==='1'){const s=suggestFamily($('genus').value);if(s){f.value=s;f.dataset.auto='1';}else if(f.dataset.auto==='1'){f.value='';}}
  refreshLists();
});
function suggestCommon(){
  const g=norm($('genus').value),s=norm($('species').value);if(!g||!s)return;
  const hit=[...recs()].filter(r=>norm(r.genus)===g&&norm(r.species)===s&&(r.commonNameEn||r.commonNameAf)).sort(byNewest)[0];
  if(!hit)return;
  if(!$('commonNameEn').value.trim()&&hit.commonNameEn)$('commonNameEn').value=hit.commonNameEn;
  if(!$('commonNameAf').value.trim()&&hit.commonNameAf)$('commonNameAf').value=hit.commonNameAf;
}
$('species').addEventListener('change',suggestCommon);$('species').addEventListener('blur',suggestCommon);
$('family').addEventListener('input',()=>{$('family').dataset.auto='';refreshLists();});
function openForm(r){
  $('recordForm').reset();$('gpsMsg').textContent='';$('family').dataset.auto='';
  $('recordId').value=r?.id||'';
  $('dialogTitle').textContent=(r?'Edit ':'Add ')+SEC[cur].noun+' observation';
  $('deleteRecord').classList.toggle('hidden',!r);
  $('family').value=r?.family||'';$('genus').value=r?.genus||'';$('species').value=r?.species||'';
  $('dateObserved').value=r?r.dateObserved||'':todayISO();
  $('commonNameEn').value=r?.commonNameEn||'';$('commonNameAf').value=r?.commonNameAf||'';
  $('locality').value=r?.locality||'';$('floweringSeason').value=r?.floweringSeason||'';$('notes').value=r?.notes||'';
  $('photo').value='';currentPhotos=[...photosOf(r||{})];renderPhotos();
  refreshLists();
  $('recordDialog').showModal();
}
$('addRecord').onclick=()=>openForm();
$('closeDialog').onclick=$('cancelDialog').onclick=()=>$('recordDialog').close();
function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(r.error);r.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('bad image'));img.onload=()=>{const s=Math.min(1,1400/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.82));};img.src=r.result;};r.readAsDataURL(file);});}
$('useGps').onclick=()=>{
  const msg=$('gpsMsg');
  if(!navigator.geolocation){msg.textContent='GPS is not available on this device.';return;}
  msg.textContent='Finding position...';
  navigator.geolocation.getCurrentPosition(p=>{
    const t=`GPS ${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)} (±${Math.round(p.coords.accuracy)} m)`;
    const l=$('locality');l.value=l.value.trim()?l.value.trim()+'\n'+t:t;msg.textContent='Position added.';
  },err=>{msg.textContent=err.code===1?'Location permission was denied.':'Could not get a position. Try outdoors.';},{enableHighAccuracy:true,timeout:20000,maximumAge:30000});
};
$('recordForm').onsubmit=async e=>{
  e.preventDefault();
  const genus=$('genus').value.trim(),species=$('species').value.trim();
  if(!genus&&!species){alert('Please enter at least a genus or a species.');$('genus').focus();return;}
  const id=$('recordId').value||crypto.randomUUID();
  const prev=recs().find(r=>r.id===id)||{};
  const rec={id,family:$('family').value.trim(),genus,species,commonNameEn:$('commonNameEn').value.trim(),commonNameAf:$('commonNameAf').value.trim(),dateObserved:$('dateObserved').value,locality:$('locality').value.trim(),notes:$('notes').value.trim(),photos:[...currentPhotos],createdAt:prev.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  if(SEC[cur].season)rec.floweringSeason=$('floweringSeason').value.trim();
  try{await saveRecord(rec);}catch(err){alert('Could not save. The device storage may be full.');return;}
  data[cur]=await allRecords();$('recordDialog').close();render();toast('Observation saved');
};
$('deleteRecord').onclick=async()=>{
  const id=$('recordId').value;if(!id||!confirm('Delete this observation from this device?'))return;
  const old=recs().find(r=>r.id===id),st=store(),sec=cur;
  await deleteRecord(id);data[sec]=await allRecords(st);$('recordDialog').close();render();
  toast('Observation deleted',async()=>{await saveRecord(old,st);data[sec]=await allRecords(st);render();});
};

/* ---------- export / import ---------- */
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$('exportData').onclick=()=>{download(new Blob([JSON.stringify({format:C.exportFormat,version:2,exportedAt:new Date().toISOString(),flora:data.flora,fauna:data.fauna},null,2)],{type:'application/json'}),C.backupFile);markBackup();};
const csvCols=()=>SEC[cur].season?['family','genus','species','commonNameEn','commonNameAf','dateObserved','locality','floweringSeason','notes']:['family','genus','species','commonNameEn','commonNameAf','dateObserved','locality','notes'];
$('exportCsv').onclick=()=>{
  const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const cols=csvCols();
  download(new Blob(['\uFEFF'+[cols.join(','),...recs().map(r=>cols.map(c=>q(r[c])).join(','))].join('\r\n')],{type:'text/csv;charset=utf-8'}),C.backupFile.replace(/\.json$/,'-'+SEC[cur].noun+'.csv'));
  toast('Exported '+SEC[cur].noun+' as CSV (photographs are only included in the JSON backup)');
};
function parseCSV(s){s=s.replace(/^\uFEFF/,'');const rows=[];let row=[],v='',q=false;for(let i=0;i<s.length;i++){const c=s[i];if(q){if(c==='"'&&s[i+1]==='"'){v+='"';i++;}else if(c==='"')q=false;else v+=c;}else if(c==='"')q=true;else if(c===','){row.push(v);v='';}else if(c==='\n'||c==='\r'){if(c==='\r'&&s[i+1]==='\n')i++;row.push(v);rows.push(row);row=[];v='';}else v+=c;}if(v!==''||row.length){row.push(v);rows.push(row);}const head=(rows.shift()||[]).map(h=>h.trim());return rows.filter(r=>r.some(x=>x.trim())).map(r=>Object.fromEntries(head.map((h,i)=>[h,(r[i]||'').trim()])));}
const recKey=r=>norm((r.genus||'')+' '+(r.species||''))+'|'+(r.dateObserved||'')+'|'+norm(r.locality);
async function importInto(sec,rows){
  const st=SEC[sec].store,existing=data[sec];
  const have=new Set(existing.map(recKey)),ids=new Set(existing.map(r=>r.id));
  let added=0,updated=0,skipped=0;
  for(const r of rows){
    if(!r||(!(r.genus||'').trim()&&!(r.species||'').trim())){skipped++;continue;}
    const rec={id:r.id||crypto.randomUUID(),family:(r.family||'').trim(),genus:(r.genus||'').trim(),species:(r.species||'').trim(),commonNameEn:(r.commonNameEn||'').trim(),commonNameAf:(r.commonNameAf||'').trim(),dateObserved:r.dateObserved||'',locality:r.locality||'',notes:r.notes||'',photos:photosOf(r),createdAt:r.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
    if(SEC[sec].season)rec.floweringSeason=r.floweringSeason||'';
    if(ids.has(rec.id)){await saveRecord(rec,st);updated++;continue;}
    if(have.has(recKey(rec))){skipped++;continue;}
    await saveRecord(rec,st);have.add(recKey(rec));ids.add(rec.id);added++;
  }
  data[sec]=await allRecords(st);
  return{added,updated,skipped};
}
$('importFile').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const text=await file.text();const jobs=[];
    if(file.name.toLowerCase().endsWith('.csv')){
      const rows=parseCSV(text).map(r=>{
        let genus=r.genus||'',species=r.species||'';
        if(!genus&&!species&&r.scientificName){const p=r.scientificName.split(/\s+/);genus=p.shift()||'';species=p.join(' ');}
        return{family:r.family,genus,species,commonNameEn:r.commonNameEn||r.commonName||r.english||'',commonNameAf:r.commonNameAf||r.afrikaans||'',dateObserved:r.dateObserved||r.date||'',locality:r.locality||'',floweringSeason:r.floweringSeason||r.flowering||'',notes:r.notes||r.researchNotes||''};
      });
      jobs.push([cur,rows]);
    }else{
      const j=JSON.parse(text);
      if(Array.isArray(j))jobs.push([cur,j]);
      else{
        const flora=j.flora||j.observations||j.records,fauna=j.fauna;
        if(Array.isArray(flora))jobs.push(['flora',flora]);
        if(Array.isArray(fauna))jobs.push(['fauna',fauna]);
        if(!jobs.length)throw new Error('no records');
      }
    }
    let t={added:0,updated:0,skipped:0};
    for(const [sec,rows] of jobs){const r=await importInto(sec,rows);t.added+=r.added;t.updated+=r.updated;t.skipped+=r.skipped;}
    render();
    toast(`Import finished: ${t.added} added, ${t.updated} updated, ${t.skipped} skipped`);
  }catch(err){console.error(err);alert('That file could not be imported. Please choose a JSON backup or a CSV file made by this app.');}
  e.target.value='';
};

/* ---------- backup reminder, storage info, toast ---------- */
function markBackup(){try{localStorage.setItem('floraLastBackup',String(Date.now()));localStorage.removeItem('floraSnooze');}catch{}renderBackupBanner();}
function renderBackupBanner(){
  let last=0,snooze=0;try{last=+localStorage.getItem('floraLastBackup')||0;snooze=+localStorage.getItem('floraSnooze')||0;}catch{}
  const total=data.flora.length+data.fauna.length;
  const days=last?Math.floor((Date.now()-last)/864e5):null;
  const due=total>0&&(days===null||days>=14)&&Date.now()>snooze;
  $('backupBanner').classList.toggle('hidden',!due);
  if(due)$('backupText').textContent=days===null?`You have ${plural(total,'observation','observations')} stored only on this device. Export a backup so you never lose them.`:`Your last backup was ${days} days ago. Export a fresh backup to keep your observations safe.`;
}
$('backupNow').onclick=()=>$('exportData').click();
$('backupLater').onclick=()=>{try{localStorage.setItem('floraSnooze',String(Date.now()+3*864e5));}catch{}renderBackupBanner();};
async function storageInfo(){
  try{
    const ok=navigator.storage?.persist?await navigator.storage.persist():false;
    const e=navigator.storage?.estimate?await navigator.storage.estimate():null;
    $('storageInfo').textContent='Stored on this device'+(e?` · ${(e.usage/1048576).toFixed(1)} MB used`:'')+(ok?' · protected':'');
  }catch{$('storageInfo').textContent='Stored on this device';}
}
let toastTimer;
function toast(msg,undo){
  $('toastMsg').textContent=msg;$('toast').classList.remove('hidden');$('toastUndo').classList.toggle('hidden',!undo);
  $('toastUndo').onclick=async()=>{$('toast').classList.add('hidden');await undo();};
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),undo?8000:3500);
}

/* ---------- Android back button closes the open window instead of leaving the app ---------- */
let dlgPushed=false;
$('recordDialog').addEventListener('close',()=>{if(dlgPushed){dlgPushed=false;history.back();}});
const _showModal=$('recordDialog').showModal.bind($('recordDialog'));
$('recordDialog').showModal=()=>{_showModal();if(!dlgPushed){history.pushState({dlg:1},'');dlgPushed=true;}};
addEventListener('popstate',()=>{
  if($('cameraDialog').open){$('cameraDialog').close();history.pushState({dlg:1},'');dlgPushed=true;return;}
  if($('photoDialog').open){$('photoDialog').close();history.pushState({dlg:1},'');dlgPushed=true;return;}
  if(dlgPushed){dlgPushed=false;if($('recordDialog').open)$('recordDialog').close();}
});

/* ---------- install button (Chrome / Edge on laptop, Chrome on Android) ---------- */
let installEvt=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;$('installApp').classList.remove('hidden');});
addEventListener('appinstalled',()=>{installEvt=null;$('installApp').classList.add('hidden');toast('App installed');});
$('installApp').onclick=async()=>{if(!installEvt)return;installEvt.prompt();await installEvt.userChoice.catch(()=>{});installEvt=null;$('installApp').classList.add('hidden');};

/* ---------- offline support + updates ---------- */
if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  addEventListener('load',()=>navigator.serviceWorker.register('sw.js').then(reg=>{
    const offer=w=>{$('updateBar').classList.remove('hidden');$('updateNow').onclick=()=>w.postMessage('SKIP_WAITING');};
    if(reg.waiting&&navigator.serviceWorker.controller)offer(reg.waiting);
    reg.addEventListener('updatefound',()=>{const w=reg.installing;w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)offer(w);});});
  }).catch(()=>{}));
  /* reload once after an update (not on the very first install) */
  const hadController=!!navigator.serviceWorker.controller;let reloaded=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloaded||!hadController)return;reloaded=true;location.reload();});
}

init().catch(err=>{console.error(err);$('notice').classList.remove('hidden');$('notice').textContent='This browser could not start local storage. Please use a current version of Chrome, Edge, Safari or Firefox (and avoid private browsing).';});
