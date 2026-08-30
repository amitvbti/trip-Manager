const KEY="tem_v2_data";
const LEGACY_MEMBERS="tripExpenseMembers", LEGACY_TRIPS="tripExpenseTrips";
let state=loadState(), currentScreen="home", admin=false, currentTripId=null;

function defaultState(){
 return {version:2,members:[],trips:[],expenses:[],categories:["Food","Hotel / Stay","Travel / Fuel","Tickets / Toll","Shopping","Miscellaneous"],settlements:[]};
}
function loadState(){
 try{
  const raw=localStorage.getItem(KEY);
  if(raw) return {...defaultState(),...JSON.parse(raw)};
  const s=defaultState();
  const oldM=JSON.parse(localStorage.getItem(LEGACY_MEMBERS)||"[]");
  const oldT=JSON.parse(localStorage.getItem(LEGACY_TRIPS)||"[]");
  s.members=oldM.map(m=>({...m,id:m.id||m.code}));
  s.trips=oldT.map((t,i)=>({id:t.id||t.code||uid("T"),code:t.code||("T"+String(i+1).padStart(3,"0")),name:t.name||"Trip "+(i+1),tripDate:t.tripDate||t.startDate||"",startDate:t.startDate||"",endDate:t.endDate||"",notes:t.notes||"",source:t.source||"",destinations:t.destinations||((t.destination||"")?[t.destination||""]:[]),transportMode:t.transportMode||"",transportDetails:t.transportDetails||"",vehicleName:t.vehicleName||"",fuelRate:t.fuelRate||"",odometerStart:t.odometerStart||"",odometerEnd:t.odometerEnd||"",status:t.status||"ACTIVE",createdAt:t.createdAt||new Date().toISOString(),lastUpdated:new Date().toISOString(),memberIds:t.memberIds||[]}));
  return s;
 }catch(e){return defaultState()}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function uid(prefix="ID"){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,8)}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function fmt(n){return "₹"+Math.round(Number(n)||0).toLocaleString("en-IN")}
function getTrip(){return state.trips.find(t=>t.id===currentTripId)||state.trips.find(t=>t.status==="ACTIVE")||null}
function activeMembers(t){return (t?.memberIds||[]).map(id=>state.members.find(m=>m.id===id)).filter(Boolean)}
function expensesFor(t){return state.expenses.filter(e=>e.tripId===t.id)}
function showScreen(id){
 if(["manage","accounts","members","settledTrips"].includes(id)&&!admin)return;
 currentScreen=id;
 document.querySelectorAll(".screen").forEach(s=>s.classList.toggle("active",s.id===id));
 document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));
 renderAll();
}
document.addEventListener("click",e=>{
 const b=e.target.closest("[data-screen]");
 if(b){e.preventDefault();showScreen(b.dataset.screen)}
});
document.getElementById("addExpenseBtn").onclick=()=>openExpenseModal();
document.getElementById("addTripBtn").onclick=()=>openTripModal();
document.getElementById("addMemberBtn").onclick=()=>openMemberModal();
document.getElementById("generateReportsBtn").onclick=()=>{showScreen("reports");};
document.getElementById("backupBtn").onclick=backup;
document.getElementById("restoreBtn").onclick=()=>document.getElementById("restoreFile").click();
document.getElementById("restoreFile").onchange=restore;
document.getElementById("modalClose").onclick=closeModal;
window._adminClicks = 0;
document.getElementById("adminTrigger").addEventListener("click", function () {
  window._adminClicks += 1;
  if (window._adminClicks >= 5) {
    admin = true;
    this.classList.add("hidden");
    document.getElementById("adminActions").classList.remove("hidden");
    renderAll();
  }
});
document.getElementById("settleBtn").onclick=settleCurrent;
document.getElementById("tripSearch").oninput=renderTrips;
document.getElementById("memberSearch").oninput=renderMembers;
document.getElementById("universalSearch").oninput=renderSearch;
const navSearch=document.getElementById("navUniversalSearch");
if(navSearch){
  navSearch.addEventListener("focus",()=>showScreen("search"));
  navSearch.addEventListener("input",()=>{
    const q=navSearch.value;
    const main=document.getElementById("universalSearch");
    if(main) main.value=q;
    renderSearch();
    showScreen("search");
  });
}

document.getElementById("modal").onclick=e=>{if(e.target.id==="modal")closeModal()};

function renderAll(){renderHome();renderTrips();renderMembers();renderSettled();renderReports();renderSearch();if(admin)document.getElementById("adminActions").classList.remove("hidden")}
function renderHome(){
 const box=document.getElementById("currentTripHome"), notes=document.getElementById("homeNotes"), ta=document.getElementById("tripNotes");
 const t=getTrip();
 if(!t){box.innerHTML='<div class="trip-card"><div class="trip-head"><div><h3>No Current Trip</h3><p>Create a trip to start.</p></div></div><div class="trip-body"><button class="btn btn-primary" onclick="openTripModal()">＋ ADD TRIP</button></div></div>';notes.classList.add("hidden");document.getElementById("addExpenseBtn").disabled=true;return}
 document.getElementById("addExpenseBtn").disabled=t.status!=="ACTIVE";
 notes.classList.remove("hidden");ta.value=t.notes||"";
 box.innerHTML=`<div class="trip-card"><div class="trip-head" onclick="toggleHomeTrip()" style="cursor:pointer"><div><h3>CURRENT TRIP : ${esc(t.tripDate||t.startDate||"DATE")} - ${esc(t.source||"SOURCE")} ${t.destinations?.length?"TO "+t.destinations.map(esc).join(" TO "):""}</h3><p>${t.status}</p></div><b id="homeChevron">⌄</b></div><div id="homeTripBody" class="trip-body">
 <h4>1. DATE</h4><div>${esc(t.startDate||"")} ${t.endDate?"to "+esc(t.endDate):""}</div>
 <h4>2. DESTINATIONS TO REACH</h4><div class="route">${[t.source,...(t.destinations||[])].filter(Boolean).map((x,i)=>`<div class="route-item">📍 ${esc(x)}${i===0?" (Start)":""}</div>`).join("")}</div>
 <h4>3. MEMBERS IN THIS TRIP</h4>${activeMembers(t).map(m=>`<div class="member-row">👤 ${esc(m.name)}</div>`).join("")}
 <h4>4. OTHER DETAILS</h4><div class="muted">Trip Name: ${esc(t.name)}<br>Transport: ${esc(t.transportMode||"—")}<br>Vehicle: ${esc(t.vehicleName||"—")}<br>Last Updated: ${new Date(t.lastUpdated).toLocaleString()}</div>
 </div></div>`;
 ta.oninput=()=>{t.notes=ta.value;t.lastUpdated=new Date().toISOString();document.getElementById("notesStatus").textContent="Saving…";save();setTimeout(()=>document.getElementById("notesStatus").textContent="Saved",250)}
}
function toggleHomeTrip(){const b=document.getElementById("homeTripBody");if(b)b.classList.toggle("hidden")}
function renderTrips(){
 const q=(document.getElementById("tripSearch")?.value||"").toLowerCase();
 const list=document.getElementById("tripLists");
 const active=state.trips.filter(t=>t.status==="ACTIVE"&&JSON.stringify(t).toLowerCase().includes(q));
 const prev=state.trips.filter(t=>t.status==="SETTLED"&&JSON.stringify(t).toLowerCase().includes(q));
 list.innerHTML=`<h3>Current Trip</h3>${active.map(tripRow).join("")}<h3 style="margin-top:22px">Pinned Trips</h3><div class="muted">No separate pinned trips yet.</div><h3 style="margin-top:22px">Previous Trips</h3>${prev.map(tripRow).join("")}`;
}
function tripRow(t){return `<div class="accordion"><div class="trip-head" onclick="openTripView('${t.id}')"><div><h3>${esc(t.name)}</h3><p>${esc(t.startDate||t.tripDate||"")} → ${esc(t.endDate||"")} · ${t.status}</p></div><b>›</b></div></div>`}
function openTripView(id){currentTripId=id;showScreen("reports")}
function renderMembers(){
 const q=(document.getElementById("memberSearch")?.value||"").toLowerCase();
 const ms=[...state.members].filter(m=>JSON.stringify(m).toLowerCase().includes(q)).sort((a,b)=>(a.status==="Active"?0:1)-(b.status==="Active"?0:1));
 document.getElementById("memberList").innerHTML=ms.map(m=>`<div class="member-card"><div class="member-main"><div><div class="code">${esc(m.code||"")}</div><h3>${esc(m.name)}</h3><div class="muted">${esc(m.mobile||"")} ${m.address?"· "+esc(m.address):""}</div></div><div class="status ${m.status==="Inactive"?"inactive":""}">${esc(m.status)}</div></div><div class="member-actions"><button class="small-btn" onclick="openMemberModal('${m.id}')">Edit</button><button class="small-btn" onclick="toggleMember('${m.id}')">${m.status==="Active"?"Make Inactive":"Activate"}</button></div></div>`).join("")||'<div class="muted">No members.</div>';
}
function renderSettled(){document.getElementById("settledTripList").innerHTML=state.trips.filter(t=>t.status==="SETTLED").map(t=>`<div class="accordion"><div class="trip-head" onclick="this.nextElementSibling.classList.toggle('hidden')"><div><h3>${esc(t.name)}</h3><p>${esc(t.startDate||"")} → ${esc(t.endDate||"")}</p></div><b>⌄</b></div><div class="trip-body hidden"><p>Status: SETTLED</p><div class="member-actions"><button class="small-btn" onclick="openTripView('${t.id}')">View</button><button class="small-btn" onclick="editTrip('${t.id}')">Edit</button><button class="small-btn" onclick="reactivate('${t.id}')">Re-activate</button><button class="small-btn" onclick="deleteTrip('${t.id}')">Delete</button></div></div></div>`).join("")||'<div class="muted">No settled trips.</div>'}
function renderSearch(){
 const q=(document.getElementById("universalSearch")?.value||"").trim().toLowerCase(), box=document.getElementById("searchResults"); if(!q){box.innerHTML="";return}
 const out=[];
 state.trips.forEach(t=>{if(JSON.stringify(t).toLowerCase().includes(q))out.push(`<div class="member-card"><b>TRIP</b><h3>${esc(t.name)}</h3><button class="small-btn" onclick="openTripView('${t.id}')">Open</button></div>`)});
 state.members.forEach(m=>{if(JSON.stringify(m).toLowerCase().includes(q))out.push(`<div class="member-card"><b>MEMBER</b><h3>${esc(m.name)}</h3></div>`)});
 state.expenses.forEach(e=>{if(JSON.stringify(e).toLowerCase().includes(q))out.push(`<div class="expense-card"><b>EXPENSE</b><div>${esc(e.description)} · ${fmt(e.amount)}</div></div>`)});
 box.innerHTML=out.join("")||'<div class="muted">No results.</div>';
}
function renderReports(){
 const t=getTrip(), box=document.getElementById("reportContent"); document.getElementById("reportTripTitle").textContent=t?t.name:"No Current Trip";
 if(!t){box.innerHTML="<div class='muted'>No trip selected.</div>";return}
 const ex=expensesFor(t), mem=activeMembers(t), total=ex.reduce((s,e)=>s+Number(e.amount||0),0);
 const per=mem.length?total/mem.length:0;
 const paid={};mem.forEach(m=>paid[m.id]=0);ex.forEach(e=>paid[e.paidBy]=(paid[e.paidBy]||0)+Number(e.amount||0));
 const rows=mem.map(m=>`<tr><td>${esc(m.name)}</td><td>${fmt(paid[m.id]||0)}</td><td>${fmt(per)}</td><td>${fmt((paid[m.id]||0)-per)}</td></tr>`).join("");
 const cats={};ex.forEach(e=>cats[e.category]=(cats[e.category]||0)+Number(e.amount||0));
 box.innerHTML=`<div class="report-grid"><div class="stat"><small>Total Expense</small><strong>${fmt(total)}</strong></div><div class="stat"><small>Total Persons</small><strong>${mem.length}</strong></div><div class="stat"><small>Per Person</small><strong>${fmt(per)}</strong></div></div>
 <div class="report-section"><h3>Trip Information</h3><div class="member-card">${esc(t.name)} · ${esc(t.startDate||"")} → ${esc(t.endDate||"")}<br>Source: ${esc(t.source||"—")}<br>Transport: ${esc(t.transportMode||"—")} ${t.vehicleName?"· "+esc(t.vehicleName):""}<br>Notes: ${esc(t.notes||"—")}</div></div>
 <div class="report-section"><h3>Person-wise Report</h3><table class="report-table"><tr><th>Person</th><th>Paid</th><th>Share</th><th>Balance</th></tr>${rows}</table></div>
 <div class="report-section"><h3>Category-wise Summary</h3><table class="report-table"><tr><th>Category</th><th>Amount</th><th>%</th></tr>${Object.entries(cats).map(([c,a])=>`<tr><td>${esc(c)}</td><td>${fmt(a)}</td><td>${total?Math.round(a/total*100):0}%</td></tr>`).join("")}</table></div>
 <div class="report-section"><h3>Expenses</h3>${ex.map(expenseCard).join("")||'<div class="muted">No expenses.</div>'}</div>
 <div class="report-section"><h3>Settlement</h3><div class="member-card">${settlementText(t)}</div></div>`;
}
function expenseCard(e){const p=state.members.find(m=>m.id===e.paidBy);return `<div class="expense-card"><div class="expense-top"><div><b>${esc(e.category)}</b><div class="muted">${esc(e.date)} · ${esc(e.description||"")}</div></div><div class="amount">${fmt(e.amount)}</div></div><div class="muted">Paid by: ${esc(p?.name||"Unknown")} · Shared by: ${e.sharedBy?.length||0}</div><div class="expense-actions"><button class="small-btn" onclick="openExpenseModal('${e.id}')">Edit</button><button class="small-btn" onclick="deleteExpense('${e.id}')">Delete</button></div></div>`}
function settlementText(t){
 const mem=activeMembers(t), ex=expensesFor(t), total=ex.reduce((s,e)=>s+Number(e.amount||0),0), share=mem.length?total/mem.length:0, bal={};mem.forEach(m=>bal[m.id]=-(share));
 ex.forEach(e=>{bal[e.paidBy]=(bal[e.paidBy]||0)+Number(e.amount||0)});
 const debt=mem.filter(m=>bal[m.id]<-0.005).map(m=>({m,a:-bal[m.id]})), cred=mem.filter(m=>bal[m.id]>0.005).map(m=>({m,a:bal[m.id]})), out=[];
 let i=0,j=0;while(i<debt.length&&j<cred.length){let x=Math.min(debt[i].a,cred[j].a);out.push(`<div><b>${esc(debt[i].m.name)}</b> pays <b>${esc(cred[j].m.name)}</b> <b>${fmt(Math.ceil(x))}</b></div>`);debt[i].a-=x;cred[j].a-=x;if(debt[i].a<.005)i++;if(cred[j].a<.005)j++}
 return out.join("")||"Everyone has already paid their fair share. No settlement required.";
}
function openModal(title,html){document.getElementById("modalTitle").textContent=title;document.getElementById("modalBody").innerHTML=html;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function openMemberModal(id){
 const m=state.members.find(x=>x.id===id)||{id:"",name:"",mobile:"",address:"",status:"Active"};
 openModal(id?"Edit Member":"Add Member",`<div class="form-grid"><div class="field full"><label>Name *</label><input id="mName" value="${esc(m.name)}"></div><div class="field"><label>Mobile</label><input id="mMobile" value="${esc(m.mobile||"")}"></div><div class="field"><label>Status</label><select id="mStatus"><option ${m.status==="Active"?"selected":""}>Active</option><option ${m.status==="Inactive"?"selected":""}>Inactive</option></select></div><div class="field full"><label>Address</label><input id="mAddress" value="${esc(m.address||"")}"></div></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveMember('${id||""}')">Save</button></div>`)
}
function saveMember(id){
 const name=document.getElementById("mName").value.trim();if(!name)return alert("Please enter member name.");
 if(id){const m=state.members.find(x=>x.id===id);Object.assign(m,{name,mobile:document.getElementById("mMobile").value.trim(),address:document.getElementById("mAddress").value.trim(),status:document.getElementById("mStatus").value})}
 else state.members.push({id:uid("M"),code:"M"+String(state.members.length+1).padStart(3,"0"),name,mobile:document.getElementById("mMobile").value.trim(),address:document.getElementById("mAddress").value.trim(),status:"Active"});
 save();closeModal();renderAll()
}
function toggleMember(id){const m=state.members.find(x=>x.id===id);m.status=m.status==="Active"?"Inactive":"Active";save();renderAll()}
function openTripModal(id){
 const t=state.trips.find(x=>x.id===id)||{name:"",startDate:"",endDate:"",source:"",destinations:[""],notes:"",transportMode:"",transportDetails:"",vehicleName:"",fuelRate:"",odometerStart:"",odometerEnd:"",memberIds:[]};
 const members=state.members.filter(m=>m.status==="Active");
 openModal(id?"Edit Trip":"Add Trip",`<div class="form-grid">
 <div class="field full"><label>Trip Name (optional)</label><input id="tName" value="${esc(t.name)}" placeholder="Leave blank for automatic name"></div>
 <div class="field"><label>Start Date</label><input type="date" id="tStart" value="${esc(t.startDate)}"></div><div class="field"><label>End Date</label><input type="date" id="tEnd" value="${esc(t.endDate)}"></div>
 <div class="field full"><label>Source</label><input id="tSource" value="${esc(t.source||"")}"></div>
 <div class="field full"><label>Destinations (one per line; reorder before saving)</label><textarea id="tDest" rows="4">${esc((t.destinations||[]).join("\n"))}</textarea></div>
 <div class="field full"><label>Trip Members</label><div class="check-list">${members.map(m=>`<label class="check-row"><input type="checkbox" class="tripMember" value="${m.id}" ${(t.memberIds||[]).includes(m.id)?"checked":""}>${esc(m.name)}</label>`).join("")||'<span class="muted">Add members first.</span>'}</div></div>
 <div class="field"><label>Transport Mode</label><select id="tMode"><option value="">Select</option><option>Car</option><option>Bus</option><option>Train</option><option>Flight</option><option>Bike</option><option>Other</option></select></div>
 <div class="field"><label>Vehicle Name</label><input id="tVehicle" value="${esc(t.vehicleName||"")}"></div>
 <div class="field"><label>Fuel Rate (₹/L)</label><input type="number" id="tFuel" min="0" step="0.01" value="${esc(t.fuelRate||"")}"></div>
 <div class="field"><label>Odometer Start</label><input type="number" id="tOdoS" min="0" value="${esc(t.odometerStart||"")}"></div>
 <div class="field"><label>Odometer End</label><input type="number" id="tOdoE" min="0" value="${esc(t.odometerEnd||"")}"></div>
 <div class="field full"><label>Transport Details</label><input id="tDetails" value="${esc(t.transportDetails||"")}"></div>
 <div class="field full"><label>General Notes</label><textarea id="tNotes" rows="5">${esc(t.notes||"")}</textarea></div>
 </div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTrip('${id||""}')">Save Trip</button></div>`);
 document.getElementById("tMode").value=t.transportMode||"";
}
function saveTrip(id){
 const start=document.getElementById("tStart").value,end=document.getElementById("tEnd").value;
 const name=document.getElementById("tName").value.trim()||("Trip "+(state.trips.length+1));
 const members=[...document.querySelectorAll(".tripMember:checked")].map(x=>x.value);
 if(!start||!end)return alert("Start Date and End Date are required.");
 if(end<start)return alert("End Date cannot be before Start Date.");
 if(!members.length)return alert("Select at least one Trip Member.");
 const odoS=document.getElementById("tOdoS").value,odoE=document.getElementById("tOdoE").value;
 if(odoS!==""&&odoE!==""&&Number(odoE)<Number(odoS))return alert("Odometer End cannot be less than Odometer Start.");
 const data={name,startDate:start,endDate:end,tripDate:start,source:document.getElementById("tSource").value.trim(),destinations:document.getElementById("tDest").value.split(/\n+/).map(x=>x.trim()).filter(Boolean),memberIds:members,transportMode:document.getElementById("tMode").value,vehicleName:document.getElementById("tVehicle").value.trim(),fuelRate:document.getElementById("tFuel").value,odometerStart:odoS,odometerEnd:odoE,distanceTravelled:(odoS!==""&&odoE!=="")?Number(odoE)-Number(odoS):"",transportDetails:document.getElementById("tDetails").value.trim(),notes:document.getElementById("tNotes").value,status:"ACTIVE",lastUpdated:new Date().toISOString()};
 if(id)Object.assign(state.trips.find(x=>x.id===id),data);else{if(state.trips.some(x=>x.status==="ACTIVE"))return alert("Only one Current Trip is allowed.");state.trips.push({id:uid("T"),code:"T"+String(state.trips.length+1).padStart(3,"0"),createdAt:new Date().toISOString(),...data})}
 currentTripId=id||state.trips[state.trips.length-1].id;save();closeModal();showScreen("home")
}
function editTrip(id){openTripModal(id)}
function reactivate(id){const t=state.trips.find(x=>x.id===id);if(state.trips.some(x=>x.status==="ACTIVE"))return alert("An active Current Trip already exists.");t.status="ACTIVE";t.lastUpdated=new Date().toISOString();save();renderAll()}
function deleteTrip(id){const t=state.trips.find(x=>x.id===id);if(!confirm("Delete "+t.name+"?"))return;state.trips=state.trips.filter(x=>x.id!==id);state.expenses=state.expenses.filter(x=>x.tripId!==id);save();renderAll()}
function openExpenseModal(id){
 const t=getTrip();if(!t||t.status!=="ACTIVE")return alert("Add Expense is available only for an Active Current Trip.");
 const e=state.expenses.find(x=>x.id===id)||{date:new Date().toISOString().slice(0,10),category:"Food",description:"",amount:"",paidBy:"",sharedBy:t.memberIds||[]};
 const ms=activeMembers(t);
 openModal(id?"Edit Expense":"Add Expense",`<div class="form-grid"><div class="field"><label>Date</label><input type="date" id="eDate" value="${esc(e.date)}"></div><div class="field"><label>Category</label><select id="eCat">${state.categories.map(c=>`<option ${c===e.category?"selected":""}>${esc(c)}</option>`).join("")}</select></div><div class="field full"><label>Description / Remark</label><input id="eDesc" value="${esc(e.description||"")}"></div><div class="field"><label>Amount (₹) *</label><input type="number" id="eAmt" min="1" step="0.01" value="${esc(e.amount)}"></div><div class="field"><label>Paid By *</label><select id="ePaid">${ms.map(m=>`<option value="${m.id}" ${e.paidBy===m.id?"selected":""}>${esc(m.name)}</option>`).join("")}</select></div><div class="field full"><label>Shared By</label><div class="check-list" id="shareList">${ms.map(m=>`<label class="check-row"><input class="shareMember" type="checkbox" value="${m.id}" ${(e.sharedBy||ms.map(x=>x.id)).includes(m.id)?"checked":""}>${esc(m.name)}</label>`).join("")}</div><div id="shareCounter" class="counter"></div></div></div><div class="form-actions"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveExpense('${id||""}')">Save</button></div>`);
 updateShareCounter();document.querySelectorAll(".shareMember").forEach(x=>x.onchange=updateShareCounter)
}
function updateShareCounter(){const all=document.querySelectorAll(".shareMember").length,sel=document.querySelectorAll(".shareMember:checked").length;const c=document.getElementById("shareCounter");if(c)c.textContent=`${sel} of ${all} members selected`}
function saveExpense(id){
 const t=getTrip(), amount=Number(document.getElementById("eAmt").value);const shared=[...document.querySelectorAll(".shareMember:checked")].map(x=>x.value);
 if(!document.getElementById("eDate").value)return alert("Date is required.");if(!Number.isFinite(amount)||amount<1)return alert("Amount must be ₹1 or more.");if(!shared.length)return alert("At least one member must be selected.");
 const data={tripId:t.id,date:document.getElementById("eDate").value,category:document.getElementById("eCat").value,description:document.getElementById("eDesc").value.trim(),amount,paidBy:document.getElementById("ePaid").value,sharedBy:shared,lastUpdated:new Date().toISOString()};
 if(id)Object.assign(state.expenses.find(x=>x.id===id),data);else state.expenses.push({id:uid("E"),...data});
 save();closeModal();renderAll()
}
function deleteExpense(id){if(!confirm("Delete this expense?"))return;state.expenses=state.expenses.filter(x=>x.id!==id);save();renderAll()}
function settleCurrent(){
 const t=getTrip();if(!t)return alert("No Current Trip.");if(!expensesFor(t).length)return alert("No expenses to settle.");
 if(!confirm("Settle accounts for "+t.name+"?"))return;
 t.status="SETTLED";t.firstSettledAt=t.firstSettledAt||new Date().toISOString();t.lastUpdated=new Date().toISOString();save();renderAll()
}
function backup(){
 const payload={...state,backupFormat:"trip-expense-manager-json",backupVersion:2,exportedAt:new Date().toISOString()};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="trip-expense-manager-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href)
}
async function restore(e){
 const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(d.backupFormat!=="trip-expense-manager-json")throw new Error("Invalid backup file.");if(!confirm("Restoring this backup will replace the current app data. Continue?"))return;state={...defaultState(),...d};save();renderAll();alert("Backup restored successfully.")}catch(err){alert("Restore failed: "+err.message)}e.target.value=""
}
function exportExcel(){
 if(typeof XLSX==="undefined")return alert("Excel library could not be loaded. Please try again while connected to the internet.");
 const wb=XLSX.utils.book_new(),t=getTrip();const add=(name,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),name);
 add("Trips",state.trips.map(t=>({...t,totalPersons:activeMembers(t).length,totalExpense:expensesFor(t).reduce((s,e)=>s+Number(e.amount||0),0),perPersonExpense:activeMembers(t).length?expensesFor(t).reduce((s,e)=>s+Number(e.amount||0),0)/activeMembers(t).length})));
 add("Members",state.members);add("Expenses",state.expenses);add("Expense Shares",state.expenses.flatMap(e=>(e.sharedBy||[]).map(memberId=>({expenseId:e.id,memberId,shareAmount:Number(e.amount||0)/(e.sharedBy||[]).length}))));add("Settlements",state.settlements);add("Categories",state.categories.map(name=>({categoryId:name,name})));add("Reports",state.trips.map(t=>({tripId:t.id,totalExpense:expensesFor(t).reduce((s,e)=>s+Number(e.amount||0),0),totalPersons:activeMembers(t).length,perPersonExpense:activeMembers(t).length?expensesFor(t).reduce((s,e)=>s+Number(e.amount||0),0)/activeMembers(t).length})));
 XLSX.writeFile(wb,"trip-expense-manager-export.xlsx")
}
document.getElementById("generateReportsBtn").addEventListener("click",()=>{showScreen("reports");setTimeout(()=>window.print(),300)});
window.addEventListener("beforeprint",()=>{document.body.classList.add("printing")});window.addEventListener("afterprint",()=>document.body.classList.remove("printing"));
renderAll();
