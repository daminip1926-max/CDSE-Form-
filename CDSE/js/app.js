
function autoResize(el) {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
}

/* PDF.js needs a worker script to actually parse/render PDF files — without
   one, getDocument() fails silently (which is why PDF annexure previews
   showed "could not render preview"). We bundle the worker offline as
   base64 (PDF_WORKER_B64, from data/pdf-worker-b64.js) and turn it into a
   real Worker via a Blob URL, so no network fetch is ever needed. */
(function setupPdfWorker(){
  try{
    if(typeof pdfjsLib === 'undefined' || typeof PDF_WORKER_B64 === 'undefined') return;
    const bin = atob(PDF_WORKER_B64);
    const bytes = new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], {type:'application/javascript'});
    pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
  }catch(e){
    console.warn('Could not set up the PDF.js worker — PDF previews may fail.', e);
  }
})();
/* ============================= HELPERS ============================= */
let FID = 0;
function nid(){ return 'f'+(FID++); }
/* Per-field fallback text for empty fields — use a field's own
   data-empty-text override if set (see field(..., {emptyText:'...'})),
   otherwise the standard "Not available". */
function emptyTextFor(el){
  if(el && el.dataset && el.dataset.emptyText) return el.dataset.emptyText;
  // No explicit override — build a field-specific fallback from the field's
  // own label ("District — Not available") instead of a generic blanket
  // "Not available" everywhere.
  const wrap = el ? el.closest('.field') : null;
  const labelEl = wrap ? wrap.querySelector('label') : null;
  let labelText = labelEl ? labelEl.textContent.replace(/\s+/g,' ').trim() : '';
  labelText = labelText.replace(/\s*auto\s*$/i, '').trim(); // strip the "auto" badge text
  return labelText ? `${labelText} — Not available` : 'Not available';
}

function field(label, opts={}){
  const id = nid();
  const type = opts.type || 'text';
  const af = opts.autofill;
  const kv = opts.keepVisible ? ' data-keep-visible="1"' : '';
  const wrapOpen = af ? `<div class="field field-autofilled" data-autofill-wrap="${af}"${kv}>` : `<div class="field">`;
  const badge = af ? `<span class="autofill-badge">auto</span>` : '';
  // Per-field override for the fallback text used when this field is left
  // empty (Word export, print, and blanket autofill-time fill). Falls back
  // to the global default ("Not available") wherever this isn't set.
  const et = opts.emptyText ? ` data-empty-text="${opts.emptyText.replace(/"/g,'&quot;')}"` : '';
  if(type==='textarea'){
  const esc = (opts.value||'').replace(/</g,'&lt;');
  return `${wrapOpen}
    <label>${label}${badge}</label>
    <textarea
      data-field="${id}"${et}
      ${af?`data-autofill="${af}"`:''}
      placeholder="${opts.ph||''}"
      oninput="autoResize(this)"
    >${esc}</textarea>
  </div>`;
}
  if(type==='select'){
    // Kept as a real dropdown only when explicitly requested (Hazard
    // Classification); every other select was converted to a plain editable
    // text field per request — structural controls like Main Dam Type are
    // handled separately and are unaffected either way.
    if(opts.keepDropdown){
      const options = (opts.options||[]).map(o=>`<option value="${o}">${o}</option>`).join('');
      const elId = opts.id ? ` id="${opts.id}"` : '';
      return `${wrapOpen}<label>${label}${badge}</label><select data-field="${id}"${elId}${et} ${af?`data-autofill="${af}"`:''}><option value="">-- select --</option>${options}</select></div>`;
    }
    return `${wrapOpen}<label>${label}${badge}</label><input type="text" data-field="${id}"${et} ${af?`data-autofill="${af}"`:''} placeholder="${opts.ph||''}" value="${(opts.value||'').replace(/"/g,'&quot;')}"></div>`;
  }
  if(type==='multiselect'){
    return `${wrapOpen}<label>${label}${badge}</label><textarea data-field="${id}"${et} ${af?`data-autofill="${af}"`:''} placeholder="${opts.ph||'Enter values, separated by commas'}" oninput="autoResize(this)"></textarea></div>`;
  }
  return `${wrapOpen}<label>${label}${badge}</label><input type="text" data-field="${id}"${opts.id?` id="${opts.id}"`:''}${et} ${af?`data-autofill="${af}"`:''} placeholder="${opts.ph||''}" value="${(opts.value||'').replace(/"/g,'&quot;')}"></div>`;
}

function row(...fields){ return `<div class="row">${fields.join('')}</div>`; }

function note(text){ return `<div class="note">${text}</div>`; }
function subhead(text, cond){ return `<div class="subhead${cond?` cond ${cond}`:''}">${text}</div>`; }
function subsubhead(text, extraClass){ return `<div class="subsubhead${extraClass?' '+extraClass:''}">${text}</div>`; }
function statictext(html, extraClass){ return `<div class="statictext${extraClass?' '+extraClass:''}">${html}</div>`; }
function checkboxList(items){
  return `<div class="checklist-list">${items.map(t=>`<label class="chk-item"><input type="checkbox" data-field="${nid()}"><span>${t}</span></label>`).join('')}</div>`;
}
function selectAddField(label, options, defaultValue){
  const id = nid();
  const esc = (defaultValue||'').replace(/</g,'&lt;');
  return `<div class="field">
    <label>${label}</label>
    <textarea data-field="${id}" oninput="autoResize(this)" placeholder="Type the applicable recommendation(s) here, one per line">${esc}</textarea>
  </div>`;
}
function addSelectTag(sel){
  const val = sel.value;
  if(!val) return;
  const wrap = sel.closest('.select-add-field');
  const list = wrap.querySelector('.tag-list');
  const existing = Array.from(list.querySelectorAll('.tag-item')).map(el=>el.dataset.value);
  if(existing.includes(val)){ sel.value=''; return; }
  const tag = document.createElement('div');
  tag.className = 'tag-item';
  tag.dataset.value = val;
  tag.innerHTML = `<span>${val}</span><button type="button" class="tag-remove" onclick="removeSelectTag(this)">&times;</button>`;
  list.appendChild(tag);
  sel.value = '';
  syncSelectTags(wrap);
}
function removeSelectTag(btn){
  const wrap = btn.closest('.select-add-field');
  btn.closest('.tag-item').remove();
  syncSelectTags(wrap);
}
function syncSelectTags(wrap){
  const hidden = wrap.querySelector('.select-add-hidden');
  const items = Array.from(wrap.querySelectorAll('.tag-item')).map(el=>el.dataset.value);
  hidden.value = items.join('\n');
}

/* Observations / Repercussions / Recommendations triad */
function obsBlock(title, considerText, defaults){
  defaults = defaults || {};
  return `<div class="block">
    <div class="subsubhead">${title}</div>
    ${considerText?note(considerText):''}
    ${field('Observations', {type:'textarea', value:defaults.obs})}
    ${field('Repercussions, if the issue is not addressed (if any)', {type:'textarea', value:defaults.rep})}
    ${field('Recommendations (if any)', {type:'textarea', value:defaults.rec})}
  </div>`;
}

/* "Review of design data" style table: rows = [ [particular, designDefault, currentDefault], ... ] */
function designDataTable(rows){
  let body = rows.map((r,i)=>{
    const [particular, dDefault, cDefault, remarkDefault] = r;
    return `<tr>
      <td style="text-align:center">${i+1}</td>
      <td>${particular}</td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" ${dDefault==='NA'?'placeholder="NA"':''}>${dDefault||''}</textarea></td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" ${cDefault==='NA'?'placeholder="NA"':''} >${cDefault==='NA'?'NA':''}</textarea></td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" placeholder="${remarkDefault||''}"></textarea></td>
    </tr>`;
  }).join('');
  return `<table class="data"><thead><tr><th style="width:32px">Sl.No</th><th>Particular</th><th>Design Stage Value</th><th>Current Value</th><th>Remarks</th></tr></thead><tbody>${body}</tbody></table>`;
}

/* generic editable table with custom headers and row count */
function genTable(headers, nRows, selectCols={}){
  const thead = `<tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr>`;
  let rows='';
  for(let i=0;i<nRows;i++){
    let tds = headers.map((h,ci)=>{
      if(ci===0) return `<td style="text-align:center">${i+1}</td>`;
      if(selectCols[ci]) return `<td><textarea data-field="${nid()}" oninput="autoResize(this)" placeholder="${selectCols[ci].join(' / ')}"></textarea></td>`;
      return `<td><textarea data-field="${nid()}" oninput="autoResize(this)"></textarea></td>`;
    }).join('');
    rows += `<tr>${tds}</tr>`;
  }
  return {html:`<table class="data"><thead>${thead}</thead><tbody class="tbody-${nid()}">${rows}</tbody></table>`};
}

function checklistTable(items, cond){
  let rows = items.map(it=>{
    if(it.header) return `<tr><td colspan="2" style="background:var(--blue-light);font-weight:700;color:var(--navy2)">${it.header}</td></tr>`;
    return `<tr><td>${it.label}</td><td style="width:70px;text-align:center"><input type="checkbox" data-field="${nid()}"></td></tr>`;
  }).join('');
  return `<div class="${cond?`cond ${cond}`:''}"><table class="data"><thead><tr><th>Component Inspected</th><th style="width:70px">Tick</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

/* Component section builder used heavily in Chapter 6 (returns full HTML) */
function componentSection(opts){
  // opts: {title, cond, note, typeFieldLabel, designRows, bodyMaterialOptions, bodyMaterialLabel, bodyMaterialDefault, bodyMaterialObsDefaults, extraSimpleFields:[], obsItems:[{title,consider,defaults}] }
  let html = `<div class="cond ${opts.cond||''}"><div class="subhead">${opts.title}</div>`;
  if(opts.note) html += note(opts.note);
  if(opts.typeFieldLabel) html += field(opts.typeFieldLabel, {value:opts.typeFieldDefault});
  if(opts.designRows) { html += subsubhead('Review of design data'); html += designDataTable(opts.designRows); }
  if(opts.bodyMaterialOptions){
    html += subsubhead(opts.bodyMaterialLabel || 'Body material');
    html += field('Material type', {type:'select', options:opts.bodyMaterialOptions, value:opts.bodyMaterialDefault});
    html += obsBlock('Observations on the body material','', opts.bodyMaterialObsDefaults).replace('Observations on the body material','Body material — Observations, Repercussions &amp; Recommendations');
  }
  (opts.extraSimpleFields||[]).forEach(f=>{ html += field(f.label, f.opts||{}); });
  (opts.obsItems||[]).forEach(item=>{ html += obsBlock(item.title, item.consider, item.defaults); });
  html += `</div>`;
  return html;
}

/* ============================= COLOR AUTO-FILLED & PRE-FILLED DATA ============================= */
function colorFilledFieldsPurple() {
  document.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach(el => {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if(type === 'checkbox' || type === 'radio' || type === 'file') return;
    
    if(el.value && el.value.trim() !== '') {
      el.style.color = 'purple';
    }

    if (!el.dataset.colorBound) {
      el.addEventListener('input', function(e) {
        if (e.isTrusted) { 
          this.style.color = ''; 
        }
      });
      el.dataset.colorBound = "true";
    }
  });
}

setTimeout(colorFilledFieldsPurple, 200);

/* ============================= ANNEXURES (metadata + inline reference tags) ============================= */
const annexCoreMeta = [
  {id:'regCDSE', name:'Regulations related to CDSE made under the Act'},
  {id:'ipoeOrder', name:'IPoE Constitution Order'},
  {id:'coiDeclaration', name:'Conflict of Interest Declarations (IPoE Members)'}
];
function annexRefHtml(id){
  return `<div class="field"><span class="annexref" data-annex-id="${id}">Attached in Annexure <b class="annexroman"></b></span></div>`;
}

/* ============================= CONTENT BUILD ============================= */
const chapters = [];
function addChapter(no, title, bodyHtml){
  chapters.push({no, title, bodyHtml});
}

/* ---------- COVER PAGE ---------- */
function photoBox(label){
  const id = nid();
  return `<div class="photobox"><b>${label}</b><input type="file" accept="image/*" data-field="${id}" onchange="previewPhoto(this)"><div class="thumbwrap"><img alt=""></div></div>`;
}
let coverHtml = `<div class="cover">
  <img class="goi-emblem" alt="Government of India Emblem" src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg">
  <div class="ministry">Government of India — Ministry of Jal Shakti</div>
  <div class="ministry">Department of Water Resources, River Development and Ganga Rejuvenation</div>
  <div class="ministry">National Dam Safety Authority</div>
  <h2>Comprehensive Dam Safety Evaluation (CDSE)</h2>
  <div class="sub2">Report for a Specified Dam</div>

 
  <div class="field" style="max-width:420px;margin:10px auto">
  <label>Document No.</label>
  <input type="text" data-field="${nid()}" id="coverDocNo"
  placeholder="e.g. 1/MH293LH3309/CDSE/2026/WRD" >
</div> 
  <div class="damtitle" id="coverDamName">DAM</div>
  <div class="damtitle" id="coverDamPIC">PIC</div>
  <div class="cover-tagline" style="font-weight:600;color:var(--navy2);font-size:13.5px">Comprehensive Dam Safety Evaluation Report</div>

  <div class="cover-hero-wrap" title="Click to upload/replace this photo" onclick="document.getElementById('coverHeroFileInput').click()">
    <img class="cover-hero-img" alt="Dam" id="coverHeroImg" src="https://static.wixstatic.com/media/7473be_162ff6f3e39f4e0fa1c7e8560f081cb1~mv2.png/v1/fill/w_250,h_250,al_c,usm_0.66_1.00_0.01/7473be_162ff6f3e39f4e0fa1c7e8560f081cb1~mv2.png">
    <div class="cover-hero-overlay no-print">&#128247; Click to replace photo</div>
  </div>
  <input type="file" id="coverHeroFileInput" accept="image/*" style="display:none" onchange="replaceCoverHeroImage(this)">
  <div class="row" style="max-width:520px;margin:0 auto">
  ${field('Office Address', {
    type:'textarea',
    autofill:'CE Mail',
    attrs:'oninput="autoResize(this)"'
  })}
</div>

  <div class="row" style="max-width:520px;margin:0 auto">
    ${field('Tel (Office)',{autofill:'Head of DSU Mobile'})}
    ${field('E-mail', {autofill:'CE Add'})}
  </div>
  <div class="row" style="max-width:420px;margin:0 auto">
    ${field('Report Year', {value:'2026'})}
  </div>
</div>`;

/* ---------- CHAPTER 1 ---------- */
let ch1 = subhead('1.1 Objective of CDSE');
ch1 += statictext(`The CDSE is:
  <ul><li>A holistic, periodic safety reassessment</li>
  <li>Intended to re-validate design assumptions against current knowledge</li>
  <li>A decision-support document for: continued operation, remedial measures, further detailed studies, risk-informed prioritisation</li></ul>`, 'section-box');
ch1 += subhead('1.2 Provision under the Dam Safety Act, 2021');
ch1 += subsubhead('1.2.1 Section 38');
ch1 += statictext(`The owner of a specified dam shall cause a comprehensive dam safety evaluation through an Independent Panel of Experts, for determining the condition of the dam and its reservoir. The first CDSE for an existing specified dam shall be conducted within five years of commencement of the Act, and thereafter at intervals specified by the Regulations. The CDSE shall consist of, but not be limited to:
  <ul>
    <li>(a) review of design, construction, operation, maintenance and performance data</li>
    <li>(b) hydrologic/hydraulic assessment including design floods</li>
    <li>(c) seismic safety assessment including site-specific seismic parameters where required</li>
    <li>(d) evaluation of O&amp;M and inspection procedures</li>
    <li>(e) evaluation of any other hazard-causing condition</li>
  </ul>`, 'statute-text');
ch1 += subsubhead('1.2.2 Section 39');
ch1 += statictext(`CDSE is compulsory in case of:
  <ul>
    <li>(a) major modification to the original structure or design criteria</li>
    <li>(b) discovery of an unusual condition at the dam or reservoir rim</li>
    <li>(c) an extreme hydrological or seismic event</li>
  </ul>`, 'statute-text');
ch1 += subsubhead('1.2.3 Section 40');
ch1 += statictext(`The owner shall report CDSE results to the SDSO, including assessment of condition, emergency-measure recommendations, remedial-measure recommendations, recommendations for further studies, and recommendations for improved routine maintenance/inspection. Where remedial action is recommended, the SDSO shall pursue the owner to ensure timely completion; unresolved matters go to the SDSO and, failing agreement, to the NDSA.`, 'statute-text');
ch1 += subhead('1.3 Regulatory Purpose of CDSE');
ch1 += statictext(`The CDSE is a statutory obligation under Chapter IX (Sections 38–40) of the Dam Safety Act, 2021, and is read together with: hazard classification (Sec. 17), pre/post-monsoon &amp; special inspections (Sec. 31), instrumentation (Sec. 32), hydro-meteorological &amp; seismological stations (Sec. 33–34), inflow forecasting/EAP/risk assessment (Sec. 35–36).`, 'section-box');
ch1 += subhead('1.4 Regulations related to the Comprehensive Dam Safety Evaluation made under the Act');
ch1 += annexRefHtml('regCDSE');
addChapter(1, 'Objective and Regulatory Context of CDSE', ch1);

/* ---------- CHAPTER 2 ---------- */
let ch2 = statictext(`Regulations to constitute the Independent Panel of Experts (IPoE) are enclosed as Annexure. A signed declaration by each member of the IPoE, confirming no conflict of interest, is enclosed as Annexure. The order constituting the IPoE, along with its Terms of Reference and scope of work, is to be printed / attached here.`);
ch2 += annexRefHtml('ipoeOrder');
ch2 += field('Terms of Reference / Scope of Work (summary)', {type:'textarea'});
addChapter(2, 'Constitution of Independent Panel of Experts (IPoE)', ch2);

/* ---------- CHAPTER 3 ---------- */
let ch3 = statictext(`The Panel shall record confirmation that the structure qualifies as a "specified dam" under Section 4(x) of the Dam Safety Act, 2021 (height above 15 m; or 10–15 m with crest length ≥ 500 m, or reservoir capacity ≥ 1 MCM, or maximum flood discharge ≥ 2000 m³/s, or specially difficult foundation, or unusual design), and shall state the basis of classification. Where CDSE has been triggered under Section 39, this shall also be recorded.`);


ch3 += subhead('Project Details');
ch3 += row(field('PIC (Project Identification Code)', {autofill:'PIC', keepVisible:true}), field('Name of Dam', {autofill:'Name of Dam', keepVisible:true, id:'coverDamInput'}));
ch3 += row(field('River', {autofill:'River'}), field('State', {autofill:'State'}));
ch3 += row(field('District', {autofill:'District'}), field('Location', {id:'locationLatLongInput', ph:'Latitude, Longitude'}));
ch3 += row(field('Ownership / Owning Agency', {autofill:'Dam Owner', keepVisible:true}), field('Dam Type', {ph:'e.g. Gravity / Earthen / Composite / Barrage', autofill:'Type of Dam', keepVisible:true}));


ch3 += row(field('Dam Incharge Name ', {autofill:'Dam Incharge Name', keepVisible:true}), field('Designation'));
ch3 += row(field('Email ID', {autofill:'Dam Incharge Email', keepVisible:true}), field('Contact No', {autofill:'Dam Incharge No', keepVisible:true}));

ch3 += row(field('Hazard Classification', {type:'select', keepDropdown:true, id:'hazardClassificationInput', options:['Extreme','High','Significant','Low']}), field('Purpose of the Dam', {autofill:'Purpose'}));

ch3 += subhead('Salient Features of the Dam');
ch3 += subsubhead('I. Main Dam');
ch3 += row(field('Type', {autofill:'Type of Dam'}), field('Total length of Main Dam (m)', {autofill:'Dam Length(m)'}));
ch3 += row(field('Length of Embankment Dam (m)'), field('Length of Masonry/Concrete Dam (m)'));
ch3 += row(field('Top width of Embankment Dam (m)'), field('Top width of Masonry/Concrete Dam (m)'));
ch3 += row(field('Elevation of top of Embankment Dam (m)'), field('Elevation of top of Masonry/Concrete Dam (m)'));
ch3 += row(field('Elevation of top of Upstream Solid Parapet Wall (m)'), field('Height of Embankment Dam above Lowest River Bed Level (m)', {autofill:'Height above Lowest Foundation Level(m)'}));
ch3 += row(field('Height of Masonry/Concrete Dam above deepest foundation level (m)', {autofill:'Height above Lowest Foundation Level(m)'}), field('Lowest River Bed Elevation (m)'));
ch3 += field('Deepest Foundation Elevation (m)');

ch3 += `<div class="cond saddle">`;
ch3 += subsubhead('II. Saddle Dam');
ch3 += row(field('Type'), field('Length of Saddle Dam (m)'));
ch3 += row(field('Top width of Saddle Dam (m)'), field('Elevation of top of Saddle Dam (m)'));
ch3 += row(field('Elevation of top of Upstream Solid Parapet Wall (m)'), field('Height of Saddle Dam above Lowest Bed Level / deepest foundation level (m)'));
ch3 += `</div>`;

ch3 += subsubhead('III. Main Spillway');
ch3 += row(field('Type of Spillway'), field('Length of Spillway (m)'));
ch3 += row(field('Location of Spillway (Central / Left Flank / Right Flank / Saddle; chainage)'), field('Spillway Crest Level (m)'));
ch3 += row(field('Number of Bays/Spillways'), field('Number &amp; thickness of Piers (m)'));
ch3 += row(field('Total Discharging Capacity at FRL &amp; MWL (m³/s)', {autofill:'Designed Spillway Capacity(m3/s)'}), field('Design head used for spillway crest profile (m)'));
ch3 += field('Type of Energy Dissipation Arrangement');
ch3 += `<div class="cond gated">`;
ch3 += subsubhead('Main Spillway — Gate Details (applicable if gated)');
ch3 += row(field('Type of Spillway Gate'), field('Size of Spillway Gate — Width (m) / Height (m)'));
ch3 += row(field('Type of Hoist (Rope Drum / Hydraulic)'), field('Hoist Capacity of Spillway Gates (MT)'));
ch3 += row(field('Hoist Operation (Manual / Electrical / Remote Control)'), field('Number of Sets of Stop-logs'));
ch3 += row(field('Number of Stop Log Units per Set &amp; Size'), field('Number of Gantry Crane(s) for Stop Log Gates'));
ch3 += field('Gantry Crane Capacity (MT)');
ch3 += `</div>`;

ch3 += `<div class="cond aux">`;
ch3 += subsubhead('IV. Auxiliary Spillway');
ch3 += row(field('Type of Spillway'), field('Length of Spillway (m)'));
ch3 += row(field('Location of Spillway'), field('Spillway Crest Level (m)'));
ch3 += row(field('Number of Bays/Spillways'), field('Number &amp; thickness of Piers'));
ch3 += row(field('Total Discharging Capacity at FRL &amp; MWL (m³/s)'), field('Design head used for spillway crest profile (m)'));
ch3 += field('Type of Energy Dissipation Arrangement');
ch3 += `<div class="cond gated">`;
ch3 += subsubhead('Auxiliary Spillway — Gate Details (applicable if gated)');
ch3 += row(field('Type of Spillway Gate'), field('Size of Spillway Gate — Width (m) / Height (m)'));
ch3 += row(field('Type of Hoist'), field('Hoist Capacity of Spillway Gates (MT)'));
ch3 += row(field('Hoist Operation'), field('Number of Sets of Stop-logs'));
ch3 += row(field('Number of Stop Log Units per Set &amp; Size'), field('Number of Gantry Crane(s)'));
ch3 += field('Gantry Crane Capacity (MT)');
ch3 += `</div></div>`;

ch3 += `<div class="cond fuse">`;
ch3 += subsubhead('V. Fuse Plug');
ch3 += row(field('Location'), field('Length (m)'));
ch3 += row(field('Crest Level (m)'), field('Top Width (m)'));
ch3 += field('Discharging Capacity at MWL (m³/s)');
ch3 += `</div>`;

ch3 += `<div class="cond concrete">`;
ch3 += subsubhead('VI. Sluice Arrangement (in Concrete and Masonry Dams)');
ch3 += row(field('No. of Sluices &amp; Sill Level (m)'), field('Size of Sluice — Width (m) / Height (m) / Dia. (m)'));
ch3 += row(field('Discharging Capacity of Sluice at FRL (m³/s)'), field('Type of Service Gate'));
ch3 += row(field('Size of Service Gate — Width (m) / Height (m)'), field('Type of Hoist for Service Gates'));
ch3 += row(field('Hoist Capacity of Service Gates (MT)'), field('Hoist Operation (Manual/Electrical/Remote Control)'));
ch3 += row(field('Type of Emergency Gate'), field('Size of Emergency Gate — Width (m) / Height (m)'));
ch3 += row(field('Type of Hoist for Emergency Gates'), field('Hoist Capacity of Emergency Gates (MT)'));
ch3 += field('Hoist Operation (Manual/Electrical)');
ch3 += `</div>`;

ch3 += subsubhead('VII. Outlet Works (in Embankment, Concrete &amp; Masonry Dams)');
ch3 += row(field('Location'), field('Number'));
ch3 += row(field('Sill Level (m)'), field('Size — Width (m) / Height (m) / Dia. (m)'));
ch3 += row(field('Discharging Capacity (m³/s)'), field('Type of Service Gate'));
ch3 += row(field('Size of Service Gate'), field('Type of Hoist for Service Gates'));
ch3 += row(field('Hoist Capacity of Service Gates (MT)'), field('Hoist Operation (Manual/Electrical/Both)'));
ch3 += row(field('Type of Emergency Gate'), field('Size of Emergency Gate'));
ch3 += row(field('Type of Hoist for Emergency Gates'), field('Hoist Capacity of Emergency Gates (MT) / Operation'));

ch3 += subsubhead('Reservoir Features');
ch3 += row(field('Catchment Area at Dam Site (km²)', {autofill:'Catchment Area (km2)'}), field('Maximum Water Level (m)', {autofill:'Max. Water Level(m)'}));
ch3 += row(field('Minimum Draw Down Level (m)'));
ch3 += row(field('Dead Storage Level (m)'), field('Live Storage Capacity (Mm³)', {autofill:'Live Storage Capacity(MCM)'}));
ch3 += row(field('Gross Storage Capacity at FRL (Mm³)', {autofill:'Gross Storage Capacity(MCM)'}), field('Reservoir Spread Area at FRL (km²)', {autofill:'Reservoir Surface-Area(MWL)(km2)'}));

ch3 += subsubhead('Construction Aspects');
ch3 += row(field('Date of Starting Construction', {type:'date'}), field('Date of Completion', {type:'date'}));
ch3 += row(field('Designing Agency'), field('Construction Agency'));
ch3 += field('Construction Cost (₹ in Lakh)');

ch3 += subsubhead('Operational Aspects');
ch3 += row(field('Date of First Full Impoundment (MM/YYYY)'), field('Pre &amp; Post Monsoon Inspection carried out? (Y/N)', {type:'select', options:['Yes','No']}));
ch3 += field('Major recommendations of dam safety inspection &amp; compliance status', {type:'textarea'});
ch3 += field('Any operational failure in the past', {type:'textarea'});
ch3 += field('Any other past dam incident', {type:'textarea'});
ch3 += row(field('O&amp;M Manual — Year of Publication'), field('Emergency Action Plan — Year of Publication'));

ch3 += subsubhead('Instrumentation Aspects');
ch3 += note('Data records and other information, including pictures, can be included in Appendix II-D.');
const instrumentList = ['Water Level Sensor','Plumb Bob','Inclinometer','Stressmeters','Strainmeters','Toe Drain','Drain Wells','V-Notches','Pressure Gauges','Accelerograph','SCADA','Surveillance','Rain Gauge (ORG)','Rain Gauge (SRRG)','Other'];
{
  let rows = instrumentList.map((name, i) => {
    return `<tr>
      <td style="text-align:center; font-size: 16px;">${i+1}</td>
      <td style="font-family: 'Times New Roman', Times, serif; font-size: 16px;">${name}</td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" placeholder="Y/N" style="font-family: 'Times New Roman', Times, serif; font-size: 16px; text-align:center;"></textarea></td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" style="font-family: 'Times New Roman', Times, serif; font-size: 16px;"></textarea></td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" style="font-family: 'Times New Roman', Times, serif; font-size: 16px;"></textarea></td>
    </tr>`;
  }).join('');
  
  ch3 += `<table class="data">
    <thead>
      <tr>
        <th style="width:50px; text-align:center; font-size: 16px;">Sl.No</th>
        <th style="font-size: 16px;">Name of Instrument</th>
        <th style="width:90px; text-align:center; font-size: 16px;">Working Status</th>
        <th style="font-size: 16px;">Year of Installation</th>
        <th style="font-size: 16px;">No. of Years data available</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}
ch3 += field('Summary on adequacy and justification for additional instrumentation', {type:'textarea'});

ch3 += subhead('Methodology and Scope of the Evaluation');
ch3 += statictext(`As per Section 40(2) of the Act, CDSE is carried out through: (i) review and analysis of available design, construction, operation, maintenance, instrumentation and performance records; (ii) detailed visual inspection of the dam, appurtenant structures and reservoir rim; (iii) review of past inspection and previous CDSE reports; and, where required, (iv) non-destructive testing, material sampling and supplementary field investigations.`);

ch3 += field('Dates of site inspection, reservoir level &amp; conditions, members present, methods/equipment used, and any limitations', {
  type: 'textarea', 
  value: '(1) Detailed visual inspection of the dam, appurtenant structures and reservoir rim;\n(2) Review of past inspection and RRSSD reports;\n(3) Review and analysis of available data, salient features;\n(4) Discussion with project officials on design, construction, operation, maintenance, instrumentation and performance records.'
});
ch3 += subhead('Documents and Data Reviewed');
ch3 += field('List of documents/data reviewed (as-built drawings, design memoranda, design-flood/seismic studies, geotechnical reports, grouting records, instrumentation records, inspection reports, O&amp;M Manual, EAP, sedimentation surveys, previous CDSE reports, DHARMA entry, etc.) with dates and sources', {type:'textarea', value:'Inspection Reports (Pre- and Post), EAP For Sunny Day Condition, & O&M manual'});
ch3 += field('Data gaps — essential documents unavailable and their implications', {type:'textarea', value:'Data on as-built drawings, design memoranda, design-flood/seismic studies, geotechnical reports, grouting records, instrumentation records, were not available'});

ch3 += subhead('Background History of the Dam');
ch3 += subsubhead('Design and construction history');
ch3 += field('Comprehensive history of modifications, incidents, and major events affecting the dam', {type:'textarea'});
ch3 += subsubhead('Current operation and reservoir regime');
ch3 += field('Details', {type:'textarea', value:'No deviation in reservoir regime and is an ungated Dam'});
ch3 += subsubhead('Previous CDSE(s)');
ch3 += field('Review of status of previous evaluation recommendations and completion status', {type:'textarea', value:'No'});
ch3 += subsubhead('Hazard potential classification');
ch3 += statictext('The hazard potential/vulnerability classification shall be assigned per Section 17 of the Dam Safety Act, 2021 and shall be consistent with the classification recorded by the SDSO.');
ch3 += row(field('Assigned Classification', {type:'select', keepDropdown:true, id:'assignedClassificationInput', options:['Extreme','High','Significant','Low']}), field('Basis / Remarks', {autofill:'PAR Value'}));

addChapter(3, 'Project Description and Background', ch3);

/* ---------- CHAPTER 4 ---------- */
const embankmentItems = ['Upstream Slope','Downstream Slope','Abutments','Crest','Seepage Areas','Internal Drainage','Relief Drains'];
const concreteItems = ['Upstream Face','Downstream Face','Abutments','Crests'];
const spillwayItems = ['Approach Channel','Stilling Basin','Discharge Channel','Control Features','Erosion Protection','Side Slopes'];
const inletItems = ['Inlet &amp; Outlets','Stilling Basin','Discharge Channel','Trash Racks','Emergency Systems'];
const generalItems = ['Reservoir Surface','Shoreline','Mechanical Systems','Electrical Systems','Upstream Watershed','Downstream Floodplains'];

function checklistBlock(header, items, cond, defaultChecked){
  let rows = `<tr><td colspan="2" style="background:var(--blue-light);font-weight:700;color:var(--navy2)">${header}</td></tr>`;
  rows += items.map(label=>`<tr><td>${label}</td><td style="width:70px;text-align:center"><input type="checkbox" data-field="${nid()}"${defaultChecked?' checked':''}></td></tr>`).join('');
  return `<div class="${cond?`cond ${cond}`:''}">${rows}</div>`;
}
let ch4 = `<table class="data"><thead><tr><th>Component Inspected</th><th style="width:70px">Ticked</th></tr></thead><tbody>
${checklistBlock('EMBANKMENT DAM', embankmentItems, 'earthen', true)}
${checklistBlock('CONCRETE DAM', concreteItems, 'concrete')}
${checklistBlock('SPILLWAYS', spillwayItems, null, true)}
${checklistBlock('INLETS, OUTLETS AND DRAINS', inletItems)}
${checklistBlock('GENERAL AREAS', generalItems, null, true)}
</tbody></table>`;
addChapter(4, 'Checklist of Components of the Project Evaluated', ch4);

/* ---------- CHAPTER 5 ---------- */
let ch5 = statictext('This section shall explicitly compare original design assumptions with current standards.');
ch5 += subhead('Hydrology');
ch5 += note('Review of IDF/PMF as per latest BIS/CWC guidelines · Spillway adequacy under revised criteria · Identification of design obsolescence, if any');
ch5 += field('Findings', {type:'textarea', value:'Hydrological Review not carried out.'});
ch5 += subhead('Seismic Parameters');
ch5 += note('Review of seismic zone, PGA, spectra · Requirement/outcome of site-specific studies · Adequacy of seismic load combinations');
ch5 += field('Findings', {type:'textarea', value:'Seismic parameter not carried out.'});
ch5 += subhead('Structural and Geotechnical Design');
ch5 += note('Review of stability criteria, uplift assumptions, drainage effectiveness · Margins reduced due to ageing or revised loads');
ch5 += field('Findings', {type:'textarea', value:'Structural and Geotechnical Design not available'});
ch5 += field('Statement: original design assumptions are / are not consistent with current codal and professional practice', {type:'select', options:['Consistent','Not Consistent','Partly Consistent'], value:'Consistent'});
ch5 += subhead('Applicable Codes, Standards and Guidelines');
ch5 += statictext('Re-validation to reference applicable BIS codes (IS 1893 seismic, IS 6512 gravity dams, IS 7894 earth dams, IS 11223 freeboard), relevant CWC guidelines, O&amp;M Manual 2018, EAP 2016, and NDSA Regulations/Guidelines. Specific editions applied shall be listed; departures justified under Section 26(2).');
ch5 += field('Codes/editions applied &amp; departures, if any', {type:'textarea', value:'Applicable as per the regulation, guidelines, and direction of the NDA'});
addChapter(5, 'Design Re-Validation Against Current Standards', ch5);

/* ---------- CHAPTER 6 ---------- */
let ch6 = '';

ch6 += componentSection({
  title:'Ungated Spillway', cond:'ungated',
  typeFieldLabel:'Type of ungated spillway (Ogee / Chute / Flushbar, etc.)',
  typeFieldDefault:'Waste Weir',
  designRows:[
    ['Design Inflow Value (Cumec) (PMF/SPF/Return Period Flood)','',''],
    ['Design Outflow value (Cumec) considering routing effect','',''],
    ['Overflow spillway length (m)','',''],
    ['Freeboard (m)','',''],
    ['Max observed outflow (cumec)','NA',''],
    ['Design Seismic parameter','','NA'],
    ['Current Seismic parameter as per latest IS code/NDSA Regulations','NA',''],
    ['Maximum Tail Water Level','','']
  ],
  bodyMaterialLabel:'Spillway body material',
  bodyMaterialOptions:['Concrete','Masonry','Composite (Masonry+Concrete)'],
  bodyMaterialObsDefaults:{
    obs:'Body material is in satisfactory condition. Minor surface weathering observed. No abnormal seepage observed. No sign of structural distress observed.',
    rep:'No significant immediate safety implications are anticipated. Surface deterioration may slowly increase safety risks. The service life of the spillway may be reduced. Delayed repairs may necessitate major rehabilitation in the future.',
    rec:'As given in Chapter 14.'
  },
  extraSimpleFields:[{label:'Spillway Location (Within main dam / Separate as waste weir, etc.)', opts:{value:'Separate as waste weir.'}}],
  obsItems:[
    {title:'Spillway Crest', consider:'Consider length, damage, vegetation, blockage, etc.', defaults:{
      obs:'Body material is in satisfactory condition. Minor surface weathering observed. No abnormal seepage observed. No sign of structural distress observed.',
      rep:'No significant immediate safety implications are anticipated. Surface deterioration may slowly increase safety risks. The service life of the spillway may be reduced. Delayed repairs may necessitate major rehabilitation in the future.',
      rec:'As given in Chapter 14.'
    }},
    {title:'Spillway Downstream Profile', consider:'Consider profile, damage, vegetation, blockage, etc.', defaults:{
      obs:'Body material is in satisfactory condition. Minor surface weathering observed. No abnormal seepage observed. No sign of structural distress observed.',
      rep:'No significant immediate safety implications are anticipated. Surface deterioration may slowly increase safety risks. The service life of the spillway may be reduced. Delayed repairs may necessitate major rehabilitation in the future.',
      rec:'As given in Chapter 14.'
    }},
    {title:'Energy Dissipation Arrangement', consider:'Consider length, damage, vegetation, blockage, training wall, end sill/bucket, apron, channel encroachment, etc.', defaults:{
      obs:'Body material is in satisfactory condition. Minor surface weathering observed. No abnormal seepage observed. No sign of structural distress observed.',
      rep:'No significant immediate safety implications are anticipated. Surface deterioration may slowly increase safety risks. The service life of the spillway may be reduced. Delayed repairs may necessitate major rehabilitation in the future.',
      rec:'As given in Chapter 14.'
    }}
  ]
});

ch6 += componentSection({
  title:'Gated Spillway', cond:'gated',
  typeFieldLabel:'Type of gated spillway (Ogee / Chute, etc.)',
  designRows:[
    ['Design Inflow Value (Cumec) (PMF/SPF/Return Period Flood)','',''],
    ['Design Outflow value (Cumec) considering routing effect','',''],
    ['Functional gates (No.)','',''],
    ['Freeboard (m)','',''],
    ['Max observed outflow (cumec)','NA',''],
    ['Design Seismic parameter','','NA'],
    ['Current Seismic parameter as per latest IS code/NDSA Regulations','NA',''],
    ['Availability of stop-log gates','',''],
    ['Functional River Sluice Gates','',''],
    ['Maximum Tail Water Level','',''],
    ['Full Reservoir Level (m)','','']
  ],
  bodyMaterialLabel:'Spillway body material',
  bodyMaterialOptions:['Concrete','Masonry','Composite (Masonry+Concrete)'],
  extraSimpleFields:[{label:'Spillway Location (Within main dam / Separate as waste weir, etc.)'}],
  obsItems:[
    {title:'Spillway Crest / Bridge Deck', consider:'Consider length, material damage, vegetation, blockage, settlement, parapet wall, control room location, tilt, etc.'},
    {title:'Spillway Downstream Profile', consider:'Consider profile, damage, vegetation, blockage, seepage, etc.'},
    {title:'Energy Dissipation Arrangement', consider:'Consider length, damage, vegetation, blockage, training wall, end sill/bucket, apron, channel encroachment, plunge pool, impact of increased design flood, etc.'},
    {title:'Gate Hoisting Arrangement', consider:'Consider electrical/mechanical efficacy, general condition.'},
    {title:'Gantry Crane Arrangement', consider:''},
    {title:'Lifting Beam &amp; Counterweight', consider:'Consider general condition and efficacy.'},
    {title:'Trunnion Beam &amp; Walkway', consider:'Consider general condition and efficacy.'},
    {title:'Gates, Seals and Embedded Parts', consider:'Consider general condition and efficacy.'},
    {title:'River Sluice Gates, Seals and Embedded Parts', consider:''}
  ]
});

ch6 += componentSection({
  title:'Foundation Gallery and other Galleries', cond:'concrete',
  designRows:[
    ['Accessibility by Lift (state whether galleries were/are accessible by lift or not)','',''],
    ['Availability of access from Downstream','',''],
    ['Functional Pumps available to drain out water (No.)','',''],
    ['Capacity of all pumps (HP)','',''],
    ['Max observed Seepage flow in the galleries (cumec)','','']
  ],
  bodyMaterialLabel:'Galleries body material',
  bodyMaterialOptions:['Concrete','Masonry','Composite (Masonry+Concrete)'],
  obsItems:[
    {title:'Gallery Location (Elevation, m)', consider:''},
    {title:'Foundation Drains', consider:'Consider spacing, condition (flowing/choked — numbers), condition of connection to gallery drain, last cleaning date, etc.'},
    {title:'Block Joint Drains', consider:'Consider spacing, condition (flowing/choked — numbers), condition of connection to gallery drain, last cleaning date, etc.'},
    {title:'Form Drains', consider:'Consider spacing, condition (flowing/choked — numbers), condition of connection to gallery drain, last cleaning date, etc.'},
    {title:'General Condition of the Gallery', consider:'Consider access, movement, lighting, ventilation, damage, seepage/leaching on walls and roof.'},
    {title:'Sump', consider:'Consider capacity, pumping arrangement, protection.'}
  ]
});

ch6 += componentSection({
  title:'Non-Overflow Concrete/Masonry Block', cond:'concrete',
  designRows:[
    ['Design Inflow Value (Cumec)','',''],
    ['Design Outflow value (Cumec) considering routing effect','',''],
    ['Full Reservoir Level (m)','',''],
    ['Freeboard (m)','',''],
    ['Design Seismic parameter','','NA'],
    ['Current Seismic parameter as per latest IS code/NDSA Regulations','NA',''],
    ['Maximum Tail Water Level','',''],
    ['Maximum Water Level','','']
  ],
  bodyMaterialLabel:'Dam body material',
  bodyMaterialOptions:['Concrete','Masonry','Composite (Masonry+Concrete)'],
  obsItems:[
    {title:'Crest', consider:'Consider material damage, vegetation, blockage, settlement, parapet wall, control room location, tilt, etc.'},
    {title:'Downstream Profile', consider:'Consider profile, damage, vegetation, blockage, body seepage, access to toe area, etc.'},
    {title:'Stability of Block as per latest codal provision', consider:''}
  ]
});

ch6 += componentSection({
  title:'Non-Overflow Earthen/Rockfill Block', cond:'earthen',
  designRows:[
    ['Design Inflow Value (Cumec)','',''],
    ['Design Outflow value (Cumec) considering routing effect','',''],
    ['Full Reservoir Level (m)','',''],
    ['Freeboard (m)','',''],
    ['Design Seismic parameter','','NA'],
    ['Current Seismic parameter as per latest IS code/NDSA Regulations','NA',''],
    ['Maximum Tail Water Level','',''],
    ['Maximum Water Level','','']
  ],
  bodyMaterialLabel:'Dam body material',
  bodyMaterialOptions:['Homogeneous Earth','Zoned Earth','Rockfill with Central Core','CFRD'],
  bodyMaterialDefault:'Homogeneous Earth',
  bodyMaterialObsDefaults:{
    obs:'Body material is in satisfactory condition. Minor surface weathering observed. No abnormal seepage observed. No sign of structural distress observed. Vegetation observed.',
    rep:'No significant immediate safety implications are anticipated. Surface deterioration may slowly increase safety risks. The service life of the spillway may be reduced. Delayed repairs may necessitate major rehabilitation in the future.',
    rec:'As given in Chapter 14.'
  },
  obsItems:[
    {title:'Crest', consider:'Consider material damage, vegetation, blockage, settlement, parapet wall, control room location, tilt, etc.', defaults:{
      obs:'The top surface of the dam is undulating. Bushes have come up at some locations on the top of the dam. Minor settlement at some locations has been observed. There is no provision of a parapet wall in its upstream. There is no control room on the top of the dam. There is no longitudinal drain at the dam top to safely discharge runoff.',
      rep:'No significant immediate safety implications are anticipated.',
      rec:'As given in Chapter 14.'
    }},
    {title:'Downstream Slope', consider:'Consider profile, damage, vegetation, blockage, body seepage, surface drainage, access, etc.', defaults:{
      obs:'Body material is in satisfactory condition. Minor surface weathering observed. No abnormal seepage observed. No sign of structural distress observed. Vegetation observed.',
      rep:'No significant immediate safety implications are anticipated. Surface deterioration may slowly increase safety risks. The service life of the spillway may be reduced. Delayed repairs may necessitate major rehabilitation in the future.',
      rec:'As given in Chapter 14.'
    }},
    {title:'Upstream Slope', consider:'Consider profile, damage, vegetation, blockage, body seepage, riprap, access, etc.', defaults:{
      obs:'Body material is in satisfactory condition. Minor surface weathering observed. No abnormal seepage observed. No sign of structural distress observed.',
      rep:'No significant immediate safety implications are anticipated. Surface deterioration may slowly increase safety risks. The service life of the spillway may be reduced. Delayed repairs may necessitate major rehabilitation in the future.',
      rec:'As given in Chapter 14.'
    }},
    {title:'Downstream Toe Drain', consider:'Consider profile, damage, vegetation, blockage, body seepage, measurement, access to toe area, etc.', defaults:{
      obs:'Satisfactory condition. Minor surface weathering observed.',
      rep:'No significant immediate safety implications are anticipated.',
      rec:'As given in Chapter 14.'
    }},
    {title:'Recommendation on the Possibility of Failure', consider:'Consider piping through dam body, piping through foundation, overtopping, etc.', defaults:{
      obs:'No significant immediate safety implications are anticipated. Consider piping through dam body, piping through foundation, overtopping, etc.',
      rep:'Surface deterioration may slowly increase safety risks.',
      rec:'As given in Chapter 14.'
    }},
    {title:'Filters', consider:'Consider profile, damage, vegetation, blockage, etc.', defaults:{
      obs:'Could not be inspected.',
      rep:'No comments.',
      rec:'Toe drain of the drain to be maintained.'
    }}
  ]
});

ch6 += componentSection({
  title:'Barrage', cond:'barrage',
  designRows:[
    ['Design Inflow Value (Cumec)','',''],
    ['Design Outflow value (Cumec) considering routing effect','',''],
    ['Functional gates (No.)','',''],
    ['Full Reservoir/Pond Level (m)','',''],
    ['Freeboard (m)','',''],
    ['Design Seismic parameter','','NA'],
    ['Current Seismic parameter as per latest IS code/NDSA Regulations','NA',''],
    ['Maximum Tail Water Level','','']
  ],
  obsItems:[
    {title:'Pier', consider:''},
    {title:'Bridge Deck', consider:''},
    {title:'Foundation', consider:''},
    {title:'Energy Dissipation Arrangement', consider:''},
    {title:'Gate Hoisting Arrangement', consider:'Consider electrical/mechanical efficacy, general condition.'},
    {title:'Gantry Crane Arrangement', consider:''},
    {title:'Lifting Beam &amp; Counterweight', consider:'Consider general condition and efficacy.'},
    {title:'Trunnion Beam &amp; Walkway', consider:'Consider general condition and efficacy.'},
    {title:'Gates, Seals and Embedded Parts', consider:'Consider general condition and efficacy.'}
  ]
});

ch6 += componentSection({
  title:'Saddle Dam (Gated/Ungated)', cond:'saddle',
  note:'This clause will be filled separately for each saddle dam present.',
  designRows:[
    ['Design Inflow Value (Cumec)','',''],
    ['Design Outflow value (Cumec) considering routing effect','',''],
    ['Full Reservoir Level (m)','',''],
    ['Freeboard (m)','',''],
    ['Design Seismic parameter','','NA'],
    ['Current Seismic parameter as per latest IS code/NDSA Regulations','NA',''],
    ['Maximum Tail Water Level','',''],
    ['Maximum Water Level','','']
  ],
  bodyMaterialLabel:'Dam body material',
  bodyMaterialOptions:['Homogeneous Earth','Zoned Earth','Rockfill with Central Core','CFRD','Concrete','Masonry','Composite (Masonry+Concrete)'],
  obsItems:[
    {title:'Crest', consider:'Consider material damage, vegetation, blockage, settlement, parapet wall, control room location, tilt, etc.'},
    {title:'Downstream Slope', consider:'Consider profile, damage, vegetation, blockage, body seepage, surface drainage, access, etc.'},
    {title:'Upstream Slope', consider:'Consider profile, damage, vegetation, blockage, body seepage, riprap, access, etc.'},
    {title:'Downstream Toe Drain', consider:'Consider profile, damage, vegetation, blockage, body seepage, measurement, access to toe area, etc.'},
    {title:'Stability of Block as per latest codal provision', consider:'Stability analysis as per current practices. Minimum detail for seismic safety: mandatory site-specific seismic parameters; explicit statement on analysis method used (pseudo-static/linear dynamic/advanced) and key assumptions/limitations. Conclusion: overall safety for all load conditions per relevant BIS code, including seismic safety, is adequate / conditionally adequate / not adequate under current criteria.'},
    {title:'Recommendation on the Possibility of Failure', consider:'Consider piping through dam body, piping through foundation, overtopping, etc.'},
    {title:'Filters', consider:'Consider profile, damage, vegetation, blockage, etc.'}
  ]
});

ch6 += subhead('Water Conduits, Intake Structures, Penstocks/Tunnels and River Training Works');
ch6 += statictext('Section 4(c) of the Dam Safety Act, 2021 includes low-level outlet structures and water conduits (tunnels, pipelines, penstocks through the dam/abutments/reservoir rim), hydro-mechanical equipment, and energy dissipation/river training structures as appurtenant structures. Where present, the Panel shall inspect, review and report on the intake structure and trash-racks, low-level/scour outlets, head-race and tail-race tunnels, penstocks and pipelines, surge arrangements, and river training/bank protection works.');
ch6 += obsBlock('Water Conduits / Intake / Penstocks / River Training — Observations, Repercussions &amp; Recommendations','', {
  obs:'The conduit was observed to be structurally sound and reasonably leak-proof, with no seepage observed around the conduit.',
  rep:'No immediate adverse condition was identified from the inspection.',
  rec:'As given in Chapter 14'
});

ch6 += subhead('Reservoir Rim, Reservoir Slopes and Landslide/GLOF Susceptibility');
ch6 += statictext('The reservoir and reservoir rim form part of the dam under Sections 4(c) and 4(e) of the Act; distress at the reservoir rim is a recognised dam-safety concern under Section 4(i). The Panel shall assess reservoir rim/slope stability, potential for reservoir-triggered landslides and impulse waves, sedimentation affecting live storage, and — for dams in Himalayan/glacial regions — GLOF susceptibility and early-warning adequacy.');
ch6 += obsBlock('Reservoir Rim / Slopes / GLOF Susceptibility — Observations, Repercussions &amp; Recommendations','', {
  obs:'The reservoir was reported to be in generally satisfactory condition during inspection. The observed reservoir level was considered normal for the prevailing operating condition. No significant decline in water quality affecting dam safety was reported. No excessive sediment deposition affecting dam safety was observed, and floating debris was not considered a safety concern.',
  rep:'No immediate adverse condition was identified from the inspection.',
  rec:'As given in Chapter 14'
});

addChapter(6, 'Inspection, Review and Analysis of Different Components', ch6);

/* ---------- CHAPTER 7 ---------- */
let ch7 = statictext('List of mandatory instruments as per the Regulations published vide Gazette Notification dated 24.04.2024.');
ch7 += subhead('Summary of instruments installed with data availability and performance');
{
  const instr = ['Water Level Sensor','Plumb Bob','Inclinometer','Stressmeters','Strainmeters','Toe Drain','Drain Wells','V-Notches','Pressure Gauges','Accelerograph','SCADA','Surveillance','Rain Gauge (ORG)','Rain Gauge (SRRG)'];
  const instrDefaults = {
    'Water Level Sensor': {min:'One', installed:'One', year:'Not Available', working:'Y', period:'Maintained in Register'}
  };
  let rows = instr.map((name,i)=>{
    const d = instrDefaults[name] || {};
    return `<tr><td style="text-align:center">${i+1}</td><td>${name}</td><td><input type="text" data-field="${nid()}" placeholder="Min. required" value="${d.min||''}"></td><td><input type="text" data-field="${nid()}" placeholder="No. installed" value="${d.installed||''}"></td><td><input type="text" data-field="${nid()}" placeholder="Year" value="${d.year||''}"></td><td style="text-align:center"><input type="text" data-field="${nid()}" placeholder="Y/N" style="text-align:center" value="${d.working||''}"></td><td><input type="text" data-field="${nid()}" placeholder="Period" value="${d.period||''}"></td></tr>`;
  }).join('');
  ch7 += `<table class="data"><thead><tr><th>Sl.No</th><th>Name of Instrument</th><th>Min. no. required (NDSA-2021)</th><th>No. installed at site</th><th>Year of Installation</th><th style="width:60px">Working Status</th><th>Period for which data available</th></tr></thead><tbody>${rows}</tbody></table>`;
}
ch7 += subhead('Data storage, analysis, and dissemination methods');
ch7 += note('Trend plots for 5–10 years (or full available period). Correlation with design threshold min/max values, reservoir levels, major events (floods, earthquakes). Clear statements on instrument reliability and data gaps/implications.');
ch7 += field('Details', {type:'textarea', value:'Maintained in Registers'});
ch7 += subhead('Recommendation on Instrumentation for Dam Health');
ch7 += field('Major recommendations and a forward-looking Instrumentation Improvement Plan', {type:'textarea', value:'Instrumentation for Dam Health As per Regulation and Data to be maintained in digital Form as per Log Book'});
addChapter(7, 'Instrumentation & Performance Interpretation', ch7);

/* ---------- CHAPTER 8 ---------- */
const ch8Options = ['Structural safety is satisfactory.','Geotechnical safety is satisfactory.','Seepage condition is satisfactory.','Static loading analysis satisfactory.','Seismic loading analysis satisfactory.','Thermal loading analysis satisfactory.','Combined loading analysis satisfactory.','Loading combinations comply with latest BIS/CWC guidelines.','Loading combinations require reassessment.','Structural analysis requires updating.','Dam stability satisfactory under all loading conditions.','Gravity dam sliding stability satisfactory.','Gravity dam overturning stability satisfactory.','Gravity dam stresses within permissible limits.','Gravity dam stability requires detailed evaluation.','Embankment slope stability satisfactory.','Upstream slope stability satisfactory.','Downstream slope stability satisfactory.','Slope stability requires reassessment.','Filters and transition zones functioning satisfactorily.','Filters require rehabilitation.','Internal drainage functioning satisfactorily.','Internal drainage requires improvement.','Arch dam stresses within permissible limits.','Arch dam abutments satisfactory.','Arch dam requires detailed structural assessment.','Foundation bearing capacity satisfactory.','Foundation settlement within acceptable limits.','No differential settlement observed.','Differential settlement observed.','Foundation requires geotechnical investigation.','Uplift pressure within permissible limits.','Uplift pressure requires reassessment.','Drainage gallery functioning satisfactorily.','Drainage gallery requires cleaning.','Drainage holes functioning satisfactorily.','Drainage holes blocked.','Seepage within permissible limits.','Localized seepage observed.','Excessive seepage observed.','Seepage requires detailed investigation.','No signs of piping observed.','Potential piping observed.','No signs of instability observed.','Minor deformation observed.','Significant deformation observed.','Ageing effects insignificant.','Ageing effects observed.','Detailed structural evaluation recommended.','Detailed geotechnical investigation recommended.','Remedial measures recommended.','No immediate remedial measures required.','Not Applicable.'];
const ch81Options = ['Field investigations carried out.','Field investigations not carried out.','Detailed investigation recommended.','Visual inspection completed.','NDT carried out.','NDT not carried out.','Rebound Hammer Test carried out.','Ultrasonic Pulse Velocity (UPV) Test carried out.','Half-Cell Potential Test carried out.','Carbonation Test carried out.','NDT results satisfactory.','NDT indicates material deterioration.','Core sampling carried out.','Core sampling not carried out.','Core strength satisfactory.','Core strength below design requirement.','Additional core testing recommended.','Concrete quality satisfactory.','Concrete deterioration observed.','Honeycombing/spalling observed.','Cracks require detailed investigation.','Foundation drilling carried out.','Foundation drilling not carried out.','Foundation conditions satisfactory.','Weak foundation strata identified.','Additional geotechnical investigation recommended.','Lugeon permeability test carried out.','Lugeon test not carried out.','Foundation permeability within acceptable limits.','High permeability observed.','Permeability requires reassessment.','Grouting carried out.','Grouting not required.','Additional grouting recommended.','Grouting effectiveness satisfactory.','Grouting effectiveness requires verification.','Drainage holes functioning satisfactorily.','Drainage holes partially blocked.','Drainage holes require cleaning.','Drainage holes require rehabilitation.','Drainage gallery functioning satisfactorily.','Drainage gallery requires maintenance.','Foundation drainage satisfactory.','Foundation drainage requires improvement.','Material properties satisfactory.','Material deterioration due to ageing observed.','Material testing indicates satisfactory performance.','Further laboratory testing recommended.','Further field investigations recommended.','No immediate remedial measures required.','Remedial measures recommended.','Not Applicable.'];
let ch8 = statictext('Structural and geotechnical safety evaluation using appropriate loading combinations (static, seismic, thermal, combined). For gravity dams: sliding/overturning stability, foundation contact pressures, stress distribution. For embankment dams: slope stability (incl. rapid drawdown, steady-state seepage), critical slip surfaces, pore pressure, filters/transitions, internal stability. For arch dams: radial/tangential stress, thrust line, abutment stability. Foundation assessment: bearing capacity, settlement, uplift pressure and drainage effectiveness.');
ch8 += note('Select all applicable statements from the dropdown below (repeat to add more).');
ch8 += selectAddField('Structural, geotechnical &amp; seepage safety — findings', ch8Options, 'Structural safety is satisfactory.');
ch8 += field('Additional remarks / details, if any', {type:'textarea', value:'Seepage to be monitored measured for monsoon and pre monsoon V notches to be installed at drains.'});
ch8 += subhead('Field Investigations and Material Testing');
ch8 += statictext('Where age/condition/data adequacy warrant: NDT (UPV, rebound hammer), core extraction and strength testing, foundation drilling, permeability (Lugeon) testing, and assessment of grouting/drainage effectiveness.');
ch8 += selectAddField('Scope, results and interpretation of investigations', ch81Options);
ch8 += field('Additional remarks / details, if any', {type:'textarea', value:'Dam is structurally safe, so no material testing is recommended.'});
addChapter(8, 'Structural, Geotechnical and Seepage Safety Evaluation', ch8);

/* ---------- CHAPTER 9 ---------- */
const ch9Options = ['Seismic hazard characterization completed.','Seismic hazard characterization not carried out.','Seismic Zone verified as per IS 1893.','Site-specific seismic study carried out.','Site-specific seismic study not carried out.','Site-specific seismic study recommended.','Peak Ground Acceleration (PGA) adopted as per latest BIS.','PGA requires reassessment.','Response spectra adopted as per latest BIS.','Response spectra require updating.','Time-history analysis carried out.','Time-history analysis not carried out.','Design Basis Earthquake (DBE) verified.','Maximum Credible Earthquake (MCE) verified.','Original design earthquake requires reassessment.','Seismic design complies with latest BIS/CWC guidelines.','Seismic design requires updating.','Seismic source characterization completed.','Seismic source characterization requires updating.','Foundation conditions satisfactory under seismic loading.','Foundation requires detailed geotechnical assessment.','No liquefaction potential identified.','Liquefaction assessment carried out.','Liquefaction assessment recommended.','Liquefaction potential requires investigation.','Pore pressure conditions satisfactory.','Pore pressure monitoring recommended.','Structural response under earthquake loading satisfactory.','Structural response requires detailed evaluation.','Dam stability satisfactory under seismic loading.','Dam stability requires reassessment.','Appurtenant structures satisfactory.','Spillway performance satisfactory.','Outlet works satisfactory.','Intake structure satisfactory.','Bridge/access structures satisfactory.','Appurtenant structures require rehabilitation.','No abnormal post-earthquake seepage expected.','Post-earthquake seepage monitoring recommended.','Reservoir operation can continue after inspection.','Post-earthquake special inspection required.','Outlet gates and valves remain operable after earthquake.','Operability of gates requires verification.','Emergency Action Plan (EAP) available.','EAP requires updating.','EAP activation procedures established.','Post-earthquake emergency response procedures require strengthening.','Detailed seismic evaluation recommended.','Seismic strengthening recommended.','No immediate seismic remedial measures required.','Not Applicable.'];
const ch9OverallOptions = ['Seismic safety is satisfactory.','Seismic safety is satisfactory with minor deficiencies.','Seismic safety requires detailed review as per latest BIS/CWC guidelines.','Existing seismic design requires reassessment using current seismic criteria.','Site-specific seismic study is recommended.','Seismic load combinations require verification.','No significant seismic safety concerns observed during inspection.','Seismic strengthening measures are recommended.','Further detailed structural and seismic evaluation is required.','Overall seismic safety is considered adequate for continued operation with routine monitoring.','Overall seismic safety is considered adequate subject to implementation of recommended remedial measures.','Overall seismic safety cannot be confirmed due to insufficient investigation/data.','Not Applicable.'];
let ch9 = statictext('Seismic hazard characterisation (IS 1893 zoning, site-specific studies, PGA/spectral ordinates/time histories), DBE and MCE definition per NCSDP guidelines compared with original design earthquake, seismic source characterisation, foundation assessment (material properties, dynamic parameters, liquefaction potential, pore pressure, dam-foundation interaction), structural response for gravity/embankment/arch dams, appurtenant structures (spillway gates) performance/jamming risk, post-earthquake aspects (seepage, operability, emergency drawdown, instrumentation, EAP activation). Overall conclusion: Adequate / Conditionally Adequate / Not Adequate under DBE and MCE.');
ch9 += note('Select all applicable statements from the dropdown below (repeat to add more).');
ch9 += selectAddField('Seismic safety evaluation — findings', ch9Options, 'Seismic hazard characterization not carried out.');
ch9 += field('Additional remarks / details, if any', {type:'textarea', value:'As per the recommendation in Chapter 14'});
ch9 += subhead('Overall Statement');
ch9 += selectAddField('Overall statement (select all that apply)', ch9OverallOptions, 'Seismic safety is satisfactory.');
ch9 += row(
  field('Seismological station established? (Sec. 34 — dams ≥30m or notified seismic zone)', {type:'select', options:['Yes','No','Not Applicable'], value:'No'}),
  field('Working status', {value:'No'})
);
ch9 += field('Availability and use of strong-motion records in this evaluation', {type:'textarea', value:'No (Seismic parameters to be reviewed)'});
ch9 += field('Overall Seismic Safety Conclusion', {type:'select', options:['Adequate','Conditionally Adequate','Not Adequate']});
addChapter(9, 'Seismic Safety Evaluation', ch9);

/* ---------- CHAPTER 10 ---------- */
const ch10HydroOptions = ['Hydrological review completed.','Hydrological review not carried out.','Hydrological data compilation completed.','Historical streamflow records available.','Historical streamflow records partially available.','Historical streamflow records unavailable.','Flood history compiled.','Flood history partially available.','Flood history unavailable.','Rainfall records available.','IMD rainfall data utilized.','Updated rainfall analysis carried out.','Climate change impacts not assessed.','Climate change impacts considered.','Climate change assessment recommended.','Catchment characteristics reviewed.','Catchment characteristics unchanged.','Catchment characteristics require updating.','Flood estimation carried out using Standard Project Storm (SPS).','Flood estimation carried out using Probable Maximum Precipitation (PMP).','Flood estimation carried out using PMF methodology.','Flood estimation carried out using regional flood frequency analysis.','Flood estimation methodology requires updating.','Updated design flood estimated.','Original design flood remains valid.','Original design flood requires reassessment.','Design flood complies with latest CWC guidelines.','Design flood does not comply with latest CWC guidelines.','Spillway capacity adequate.','Spillway capacity marginally adequate.','Spillway capacity inadequate.','Reservoir routing analysis carried out.','Reservoir routing analysis requires updating.','No overtopping risk identified.','Potential overtopping risk identified.','Flood routing satisfactory.','Flood routing requires reassessment.','Hydrological safety satisfactory.','Detailed hydrological study recommended.','No immediate hydrological remedial measures required.','Not Applicable.'];
const ch10SpillwayOptions = ['Spillway capacity adequate.','Spillway capacity marginally adequate.','Spillway capacity inadequate.','Spillway safely passes the design flood.','Spillway requires capacity reassessment.','Spillway structural condition satisfactory.','Minor repairs to spillway required.','Major rehabilitation of spillway required.','Energy dissipation arrangement satisfactory.','Energy dissipation arrangement requires improvement.','No cavitation damage observed.','Cavitation damage observed.','Approach channel satisfactory.','Approach channel requires desilting.','Discharge channel satisfactory.','Discharge channel requires improvement.','Training walls satisfactory.','Training walls require repair.','No obstruction in spillway.','Debris removal required.','Gate operation satisfactory.','Gates not applicable (Ungated Spillway).','Gate operation requires improvement.','Emergency spillway available.','Emergency spillway not available.','No immediate remedial measures required.','Spillway upgrading recommended.','Not Applicable.'];
const ch10ReservoirOptions = ['Reservoir behaviour during extreme floods evaluated.','Reservoir behaviour not evaluated.','Maximum Water Level (MWL) within design limits.','Maximum Water Level (MWL) requires reassessment.','Freeboard adequate.','Freeboard marginally adequate.','Freeboard inadequate.','Freeboard requires reassessment.','No overtopping risk identified.','Low overtopping risk.','Moderate overtopping risk.','High overtopping risk.','Potential overtopping under revised design flood.','Reservoir routing satisfactory.','Reservoir routing requires updating.','Spillway capacity adequate for extreme floods.','Spillway capacity marginally adequate.','Spillway capacity inadequate.','Flood attenuation satisfactory.','Flood attenuation requires reassessment.','Dam crest elevation adequate.','Dam crest elevation requires review.','Wave run-up within permissible limits.','Wave run-up requires reassessment.','Emergency spillway not required.','Emergency spillway recommended.','No significant downstream flood risk identified.','Downstream flood impacts require assessment.','Climate change impacts considered.','Climate change assessment recommended.','Periodic hydrological review recommended.','No immediate remedial measures required.','Remedial measures recommended.','Not Applicable.'];
const ch10SedimentOptions = ['Reservoir sedimentation study carried out.','Reservoir sedimentation study not carried out.','Recent bathymetric survey available.','Bathymetric survey requires updating.','Sediment profile assessed.','Sediment profile not available.','Sedimentation within expected limits.','Moderate sedimentation observed.','Heavy sedimentation observed.','Excessive sedimentation observed.','Trap efficiency satisfactory.','Trap efficiency requires reassessment.','Trap efficiency not evaluated.','Gross storage capacity unaffected.','Gross storage capacity marginally reduced.','Gross storage capacity significantly reduced.','Live storage capacity unaffected.','Live storage capacity reduced.','Dead storage substantially occupied by sediment.','Reservoir operation not affected by sedimentation.','Reservoir operation marginally affected.','Reservoir operation significantly affected.','Spillway operation not affected.','Outlet works affected by sediment deposition.','Intake affected by sediment deposition.','Catchment erosion control measures adequate.','Catchment treatment recommended.','Desilting measures recommended.','Sediment monitoring programme recommended.','Periodic sedimentation survey recommended.','No immediate remedial measures required.','Sediment management plan recommended.','Not Applicable.'];
let ch10 = statictext('Compilation/analysis of hydrologic data (streamflow, flood history, climate change impacts). Flood estimation via annual maximum flood series / design storm approaches (SPS, PMP) to determine inflow design flood and return period, compared with original design basis.');
ch10 += note('Select all applicable statements from the dropdown below (repeat to add more).');
ch10 += selectAddField('Hydrologic data compilation &amp; design flood estimation', ch10HydroOptions, 'Hydrological review not carried out.');
ch10 += subhead('Spillway Adequacy &amp; Performance');
ch10 += statictext('Spillway adequacy/performance via capacity assessment and flood-routing studies; structural and non-structural flood mitigation measures; residual flood risk and uncertainties.');
ch10 += selectAddField('Spillway adequacy &amp; performance; flood routing; residual flood risk', ch10SpillwayOptions, 'Spillway capacity adequate.');
ch10 += subhead('Reservoir Behaviour during Extreme Floods');
ch10 += selectAddField('Reservoir behaviour during extreme floods (MWL, freeboard, overtopping risk)', ch10ReservoirOptions, 'No overtopping risk identified.');
ch10 += subhead('Reservoir Sedimentation Study');
ch10 += selectAddField('Reservoir sedimentation study (sediment profile, trap efficiency, storage/operational impact)', ch10SedimentOptions, 'Reservoir sedimentation study not carried out.');
ch10 += subhead('Key Findings and Recommendations');
ch10 += field('Hydrologic and hydraulic evaluation — key findings and recommendations', {type:'textarea', value:'Hydrologic review to be done'});
addChapter(10, 'Hydrologic and Hydraulic Evaluation of the Dam', ch10);

/* ---------- CHAPTER 11 ---------- */
const ch11OMOptions = ['Budgeting is inadequate for timely safety works and must be enhanced.','Staffing levels are insufficient, trained personnel must be appointed.','Instrumentation and monitoring facilities are absent or outdated, immediate installation is required.','Communication and warning systems are inadequate, reliable devices must be provided.','Operation arrangements are weak, gate mechanisms and manuals need updating.','Inspections are irregular, systematic and periodic inspections must be enforced.','Maintenance is poor, urgent repair and preventive measures are required.'];
const ch11EAPOptions = ['Development and approval of the EAP is incomplete and requires immediate updating.','Hazard scenarios have not been fully identified or documented.','Activation criteria are unclear and must be defined.','Notification and warning systems are inadequate or absent.','Evacuation routes are not identified and need to be prepared.','Emergency drawdown arrangements are not tested or documented.','Roles and responsibilities of staff are not clearly assigned.','Inter-agency coordination is weak and requires strengthening.','EAP exercises and testing have not been conducted.','Training of staff and stakeholders is insufficient.','Strengths and weaknesses of the current plan are not analyzed.','Recommended improvements are pending and must be implemented.'];
const ch11RRCOptions = ['The existing reservoir rule curve has not been prepared or reviewed in recent years and requires immediate updating.','The revision status of operating rules is outdated and must be aligned with current BIS/CWC/NDSA guidelines.','The downstream channel carrying capacity has not been assessed or is inadequate, requiring hydraulic review.','Flood cushion provision, both static and dynamic, is insufficient or unverified and must be re-evaluated.'];
const ch11ForecastOptions = ['Compliance with Sections 35–37 is incomplete and requires immediate attention.','An action plan with clear timelines must be prepared if non-compliance is observed.','The methodology used for hydrological and safety assessments is outdated and must be updated.','Extended Hydrological Prediction for 3-day and 7-day forecasts is not implemented and should be adopted.','GLOF (Glacial Lake Outburst Flood) alert methods, if applicable, are absent and must be established.'];
const ch11PreparednessOptions = ['Preparedness for extreme flood events is adequate.','Preparedness for extreme flood events requires strengthening.','Preparedness for extreme seismic events is adequate.','Preparedness for extreme seismic events requires strengthening.','Emergency response mechanisms are tested and functional.','Emergency response mechanisms require testing/mock drills.','Coordination with downstream authorities/communities is adequate.','Coordination with downstream authorities/communities requires strengthening.','Resources (manpower, equipment, communication) for emergency response are adequate.','Resources for emergency response are inadequate and require augmentation.','Overall preparedness for extreme events is satisfactory.','Overall preparedness for extreme events needs significant improvement.'];
const ch11WaterQualityOptions = ['Monitoring frequency is irregular or absent, parameters not defined.','Upstream polluting sources are not identified or controlled.','Dilution and mixing issues are not assessed, water quality deterioration observed.','Instrumentation for water quality monitoring is missing or outdated.','Corrective measures and periodic testing are required to meet BIS/CWC standards.'];
const ch11RiskOptions = ['Hazard and consequence assessment not prepared or outdated.','Inundation mapping absent or incomplete.','Population and property at risk not identified.','Integration with Emergency Action Plan weak or missing.','Prioritisation of remedial measures not documented.'];
let ch11 = '';
ch11 += subhead('Review of Safety Plans Timelines');
ch11 += field('Details', {type:'textarea', value:'EAP and O&M to be updated regularly, and inspection carried out within the time limits'});
ch11 += subhead('Review of Operation &amp; Maintenance Manual (O&amp;M Manual)');
ch11 += row(field('Prepared as per CWC "O&amp;M Manual Guidelines, 2018"?', {type:'select', options:['Yes','No'], value:'Yes'}), field('Uploaded in DHARMA?', {type:'select', options:['Yes','No'], value:'Yes'}));
ch11 += selectAddField('Review comments — budgeting, staffing, instrumentation/monitoring, communication/warning, operation, inspections, maintenance', ch11OMOptions);
ch11 += field('Remarks', {type:'textarea', value:'Sufficient budgeting provision to be made with consultation with SDSO, sanctioned staff to be filled, instrumentation/monitoring as per regulations, communication/ and early warning systems as per EAP.'});
ch11 += subhead('Review of Emergency Action Plan (EAP)');
ch11 += row(field('Prepared as per CWC "EAP Guidelines, 2016"?', {type:'select', options:['Yes','No'], value:'Yes'}), field('Overall adequacy of EAP', {type:'select', options:['Adequate','Needs Improvement','Inadequate'], value:'Needs Improvement'}));
ch11 += selectAddField('Review comments — development/approval, hazard scenarios, activation criteria, notification/warning, evacuation, emergency drawdown, roles &amp; responsibilities, inter-agency coordination, EAP exercises/testing, training, strengths/weaknesses, recommended improvements', ch11EAPOptions, 'Hazard scenarios have not been fully identified or documented.');
ch11 += field('Remarks', {type:'textarea', value:'EAP for sunny day conditions is available; EAP has per guidelines to be prepared.'});
ch11 += subhead('Review of Reservoir Rule Curve (RRC)');
ch11 += selectAddField('Existing RRC review; revision status; d/s channel carrying capacity; flood cushion provision', ch11RRCOptions);
ch11 += field('Additional details', {type:'textarea', value:'Not applicable'});
ch11 += subhead('Inflow Flood Forecasting, Warning and Communication System');
ch11 += note('Consider: action plan with assigned timelines, flood-release communication system, Inflow Flood Forecasting methodology, Extended Hydrological Prediction (EHP 3 &amp; 7 days), GLOF alert method (if applicable).');
ch11 += selectAddField('Compliance with Sections 35–37; methodology; Extended Hydrological Prediction; GLOF alert method', ch11ForecastOptions);
ch11 += field('Additional details', {type:'textarea', value:'Not available'});
ch11 += subhead('Adequacy of preparedness for extreme events');
ch11 += selectAddField('Preparedness for extreme flood/seismic events, emergency response, coordination and resources', ch11PreparednessOptions);
ch11 += field('Roles, responsibilities, training, action plans, communications, resources — details', {type:'textarea', value:'Roles, responsibilities, training, action plans, communications, resources as per EAP'});
ch11 += subhead('Review of reservoir water quality');
ch11 += selectAddField('Monitoring frequency/parameters, upstream polluting sources, dilution issues', ch11WaterQualityOptions);
ch11 += field('Additional details', {type:'textarea', value:'No water quality issue'});
ch11 += subhead('Risk Assessment (Section 35(2) of the Dam Safety Act, 2021)');
ch11 += selectAddField('Hazard/consequence assessment, inundation mapping, population/property at risk, integration with EAP, prioritisation of remedial measures', ch11RiskOptions);
ch11 += field('Additional details', {type:'textarea', value:'RRSSD Completed for the Dam, Low risk Found'});
ch11 += subhead('Review of Compliance with Statutory Obligations of the Owner (Sections 28, 30–37)');
{
  const obligations = [
    ['Dam Safety Unit constituted within O&M establishment (Sec. 30)', 'Complied', 'Dam operation and maintenance arrangements exist; constitution of DSU is as per the Act.'],
    ['Pre-monsoon, post-monsoon and special inspections carried out (Sec. 31)', 'Complied', 'Inspection records for the available review period were examined.'],
    ['Minimum instrumentation installed and readings analysed (Sec. 32)', 'Not Complied', 'Dependable quantitative instrumentation and long-term monitoring records could not be demonstrated during the CDSE.'],
    ['Hydro-meteorological station established (Sec. 33)', 'Not Complied', 'Basic hydrological information is available; dedicated hydro-meteorological arrangements require verification.'],
    ['Seismological station established, where applicable (Sec. 34)', 'Not Complied', 'No dedicated seismological station was available for review.'],
    ['Inflow forecasting & emergency flood warning system; periodic risk assessment (Sec. 35)', 'Partly Complied', 'RRSSD completed; dedicated inflow forecasting and warning system not available.'],
    ['Emergency Action Plan prepared and periodically updated (Sec. 36)', 'Partly Complied', 'EAP prepared; periodic updating, field verification and mock exercises are required.'],
    ['O&M establishment, trained staff and O&M Manual maintained (Sec. 28)', 'Partly Complied', 'O&M Manual available; periodic updating, implementation and strengthening of monitoring arrangements are recommended.']
  ];

  let rows = obligations.map(([o,status,remark],i) => {
    return `<tr>
      <td style="text-align:center; font-size: 16px;">${i+1}</td>
      <td style="font-family: 'Times New Roman', Times, serif; font-size: 16px;">${o}</td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" style="font-family: 'Times New Roman', Times, serif; font-size: 16px;">${status}</textarea></td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" style="font-family: 'Times New Roman', Times, serif; font-size: 16px;">${remark}</textarea></td>
    </tr>`;
  }).join('');
  
  ch11 += `<table class="data">
    <thead>
      <tr>
        <th style="width:40px; text-align:center; font-size: 16px;">Sl.</th>
        <th style="font-size: 16px;">Statutory Obligation</th>
        <th style="width:140px; font-size: 16px;">Status</th>
        <th style="font-size: 16px;">Remarks</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}
addChapter(11, 'Dam Safety Plans & Emergency Preparedness', ch11);
/* ---------- CHAPTER 12 ---------- */
const ch12Options = ['Detailed safety evaluation completed.','Detailed safety evaluation based on visual inspection and available records.','Main dam condition satisfactory.','Spillway condition satisfactory.','Outlet works satisfactory.','Intake structure satisfactory.','Training walls satisfactory.','Energy dissipation arrangements satisfactory.','Toe drains functioning satisfactorily.','Internal drainage satisfactory.','Crest condition satisfactory.','Upstream slope satisfactory.','Downstream slope satisfactory.','Abutments satisfactory.','Foundation condition satisfactory.','Minor maintenance deficiencies observed.','Moderate deficiencies observed requiring repairs.','Major deficiencies observed requiring rehabilitation.','No significant structural distress observed.','Localized deterioration observed.','No abnormal deformation observed.','No abnormal seepage observed.','Seepage within permissible limits.','Vegetation requires removal.','Erosion requires repair.','Instrumentation installed and operational.','Instrumentation partially available.','Instrumentation not installed.','Instrumentation data available for analysis.','Instrumentation data partially available.','Instrumentation data unavailable.','Instrumentation readings within acceptable limits.','No abnormal instrumentation trends observed.','Instrumentation indicates stable performance.','Long-term monitoring recommended.','Structural analysis reviewed.','Hydrological analysis reviewed.','Seismic analysis reviewed.','Geotechnical analysis reviewed.','Stability analysis reviewed.','Design review completed.','Design review requires updating.','Routine maintenance adequate.','Preventive maintenance recommended.','Detailed investigation recommended.','Periodic inspections should continue.','No immediate remedial measures required.','Not Applicable.'];

let ch12 = statictext('Summary of inspection of different components, instrumentation data and analysis performed.');
// 12.1 Integrated Safety Review
ch12 += subhead('Integrated Safety Review');
ch12 += field('Remarks', {
  type: 'textarea', 
  value: 'The principal safety issues are not confined to one discipline. The observed bulging requires structural and deformation assessment; seepage requires foundation/drainage/uplift assessment; the historical grouting information requires review of foundation treatment; hydrology and spillway adequacy require current verification; and seismic safety remains unverified. These issues are interconnected through foundation condition, uplift, structural response and reservoir loading.'
});

// 12.2 Key Deficiencies
ch12 += subhead('Key Deficiencies');
{
  const deficiencies = [
    ['Localized bulging observed during Panel visit', 'Cause and progression not established'],
    ['Localized seepage observed; no dependable trend', 'Quantitative monitoring not demonstrated'],
    ['Instrumentation inventory/data/calibration inadequate', 'Limits quantitative safety assessment'],
    ['Foundation/grouting effectiveness not verified', 'Historical records incomplete; later grouting history requires verification'],
    ['Updated structural stability analysis', 'Current loading combinations not independently verified'],
    ['Seismic safety evaluation', 'Current parameters/analysis not available'],
    ['Final hydrology, routing and spillway verification', 'Revised calculation is preliminary'],
    ['EAP completion and field testing', 'Current EAP exists but remains partially populated'],
    ['O&M and maintenance records', 'Historical systematic records incomplete'],
    ['Communication/access limitations', 'Dedicated inflow flood forecasting/flood-warning arrangements are not established; emergency communication procedures require strengthening.']
  ];

  let rows = deficiencies.map(([def, basis], i) => {
    return `<tr>
      <td style="text-align:center; font-size: 16px;">${i+1}</td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" style="font-family: 'Times New Roman', Times, serif; font-size: 16px; width: 100%;">${def}</textarea></td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" style="font-family: 'Times New Roman', Times, serif; font-size: 16px; width: 100%;">${basis}</textarea></td>
    </tr>`;
  }).join('');
  
  ch12 += `<table class="data">
    <thead>
      <tr>
        <th style="width:50px; text-align:center; font-size: 16px;">Sl. No.</th>
        <th style="font-size: 16px;">Deficiency</th>
        <th style="font-size: 16px;">Basis</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// 12.3 Engineering Judgement
ch12 += subhead('Engineering Judgement');
ch12 += field('Remarks', {
  type: 'textarea', 
  value: 'The present evidence supports continued controlled operation only with enhanced surveillance and prompt completion of the above actions. The observed bulging and seepage are not to be dismissed as routine ageing without establishing their extent, source, trend and structural significance.'
});

addChapter(12, 'Detailed Safety and Design Evaluation', ch12);


/* ---------- CHAPTER 13 ---------- */
let ch13 = '';
{
  const cats = [
    [
      'I', 
      'Unsafe; immediate action required', 
      'Not applicable. No evidence of imminent or uncontrolled failure requiring emergency intervention was observed during the CDSE.'
    ],
    [
      'II', 
      'Conditionally Safe; remedial / verification measures required', 
      'Not proposed. Although certain investigations and improvements are recommended, the observed deficiencies do not presently warrant classification as Category II.'
    ],
    [
      'III', 
      'Safe for continued operation', 
      'Category III – Safe for Continued Operation is proposed. Based on the available design and construction records, inspection findings and Panel observations, no imminent or uncontrolled failure condition requiring immediate cessation of operation was identified. The localized bulging and seepage observed during the Panel inspection require further investigation and quantitative monitoring; however, based on the evidence presently available, these observations do not establish an immediate unsafe operating condition. Continued operation is therefore recommended under the existing approved operating provisions, subject to enhanced surveillance and timely implementation of the recommendations of this CDSE.'
    ]
  ];

  let rows = cats.map(([cat, classification, application]) => {
    return `<tr>
      <td style="text-align:center; font-size: 16px; font-family: 'Times New Roman', Times, serif;">
        <label style="font-weight:bold; cursor:pointer;">
          <input type="radio" name="safetyCategory" data-field="${nid()}" data-safety-cat="${cat}" onchange="onSafetyCategoryChange(this)"${cat==='III'?' checked':''}> ${cat}
        </label>
      </td>
      <td style="font-family: 'Times New Roman', Times, serif; font-size: 16px;">${classification}</td>
      <td><textarea data-field="${nid()}" oninput="autoResize(this)" style="font-family: 'Times New Roman', Times, serif; font-size: 16px; width: 100%; resize: none; overflow: hidden;">${application}</textarea></td>
    </tr>`;
  }).join('');

  ch13 += `<table class="data">
    <thead>
      <tr>
        <th style="width:70px; text-align:center; font-size: 16px;">Category</th>
        <th style="width:180px; font-size: 16px;">Classification</th>
        <th style="font-size: 16px;">Application to the Dam</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

// Add the detailed paragraph below the table

ch13 += note('These categories are different from the category assigned during scheduled Pre &amp; Post Monsoon Inspection. Where classified Category II, the IPoE shall specify interim operating restrictions (max reservoir level, spillway/outlet discharge limits) consistent with Section 24(4), to be monitored by SDSO until reclassification.');

ch13 += `<div class="field" id="interimRestrictionsWrap" style="display:none">
    <label>Interim operating restrictions (if Category II)</label>
    <textarea data-field="${nid()}" oninput="autoResize(this)"></textarea>
  </div>`;

addChapter(13, 'Overall Safety Classification', ch13);

/* ---------- CHAPTER 14 ---------- */
let ch14 = '';
ch14 += subhead('Summary of Findings');
ch14 += statictext('Per Section 40(2), findings shall set out: (a) assessment of structure condition; (b) recommendations for emergency measures; (c) recommendations for remedial measures/actions (design, construction, O&amp;M, inspection); (d) recommendations for additional studies/investigations; (e) recommendations for improvements in routine maintenance and inspection.');

// Added the requested text as the default value for 'Summary of findings'
ch14 += field('Summary of findings', {
  type: 'textarea', 
  value: 'In the absence of the required historical records, design documents, inspection records, instrumentation data and other relevant dam safety documents, a comprehensive assessment of the structural and functional safety of the dam could not be fully established. Based on the available information and field observations, the present condition of the dam and its appurtenant structures shall be assessed through detailed inspection.\n\nThe Dam Owner shall compile and furnish all available design, construction, hydrological, geological, structural, operational, maintenance and previous inspection records. Detailed studies/investigations shall be carried out, wherever required, to establish the adequacy and safety of the dam.\n\nAny deficiencies identified during inspection shall be addressed through appropriate emergency measures, remedial measures and corrective actions, as applicable. The adequacy of design, construction, operation and maintenance practices shall be reviewed. Routine maintenance and periodic inspection shall be strengthened, and appropriate dam safety instrumentation and monitoring arrangements shall be provided/maintained wherever required.\n\nThe EAP, Dam Break Analysis (DBA), hydrological studies, structural safety assessment and other mandatory dam safety studies shall be completed/updated as per the applicable Dam Safety Guidelines and statutory requirements. All findings, recommendations and actions shall be documented and incorporated into the final Dam Safety Record.'
});

ch14 += subhead('Regulatory Recommendations to SDSO/NDSA');

// Renamed from 'Additional regulatory recommendations, if any' to 'Standard recommendations'
ch14 += field('Standard recommendations', {
  type: 'textarea', 
  value: 'Based on the available records and visual inspections, the dam and its principal components are generally in satisfactory physical condition. The reservoir, upstream and downstream slopes, dam crest, abutment contacts, downstream drainage, toe drain, approach channel, access roads and intake/outlet structure were generally observed to be in good condition. No significant seepage, boiling, sinkholes, animal burrows or major visible distress were reported during the inspection.\nThe ungated spillway was also structurally sound. No evidence of active distress was observed during the latest inspection. Continued surveillance of the repaired spillway is nevertheless required.'
});

ch14 += subhead('Proposed Timeline for Next CDSE');
ch14 += field('Proposed date / interval', {value: 'As per Regulation by NDSA'});

ch14 += subhead('Prioritised Recommendations and Action Plan');
ch14 += note('Classify each recommendation as Immediate, Short-term or Long-term, with responsible agency and target timeline, for SDSO/NDSA monitoring under Section 40(3).');
ch14 += `<table class="data" id="actionPlanTable"><thead><tr><th style="width:36px">Sl.No</th><th>Recommendation</th><th style="width:110px">Priority</th><th>Responsibility</th><th style="width:120px">Target Timeline</th></tr></thead><tbody id="actionPlanBody"></tbody></table>`;
ch14 += `<button class="addrow-btn" onclick="addActionPlanRow()">+ Add Recommendation Row</button>`;

addChapter(14, 'Conclusions and Recommendations', ch14);
/* ---------- CERTIFICATION ---------- */
let certHtml = `
<div class="damtitle" id="certDamName" style="text-align:Center;margin:0 0 12px">DAM</div>
<div class="damtitle" id="certPIC" style="text-align:Center;margin:0 0 12px">PIC</div>
`;
certHtml += statictext('<b>CDSE Report Certification by Independent Panel of Experts</b><br>We hereby certify that this evaluation was conducted consistent with generally accepted engineering practices and the applicable NDSA CDSE Regulations and Guidelines. This certification represents professional engineering opinion regarding current safety condition and does not guarantee future performance. The findings, interpretations and recommendations are those of the IPoE and are free from the influence of the Dam Owner.');
certHtml += `<table class="data" id="ipoeTable"><thead><tr><th style="width:36px">Sl.No</th><th>Name</th><th>Designation / Discipline</th><th>Signature</th></tr></thead><tbody id="ipoeBody"></tbody></table>`;
certHtml += `<button class="addrow-btn" onclick="addIpoeRow()">+ Add IPoE Member</button>`;
certHtml += statictext('This is to certify that the submitted CDSE Report for this  dam has been perused, due diligence and necessary appraisal done, and necessary suggestions given by SDSO/NDSA have been incorporated in the final CDSE Report. The dam owner has been directed to implement the suggestions/recommendations and submit a time-bound action plan for monitoring implementation. This CDSE Report is to be considered published.');
certHtml += row(field('Signature of Head SDSO — Name'), field('Date', {type:'date'}));
certHtml += note('This shall be treated as a mandatory framework for all CDSEs conducted under the Dam Safety Act, 2021. Non-compliance with this framework shall render the CDSE report incomplete for regulatory purposes.');

/* ---------- ANNEXURES ---------- */
function annexBlockHtml(id, name, removable){
  return `<div class="annex-block" id="annex-${id}" data-annex-id="${id}">
    <div class="annex-block-head">
      <span class="annex-roman-badge">Annexure <span class="annexroman-label"></span></span>
      ${removable ? `<button type="button" class="annex-remove-btn" onclick="removeAnnexure('${id}')">Remove</button>` : ''}
    </div>
    <div class="field"><label>Name of Document / Annexure Title</label><input type="text" data-field="${nid()}" class="annex-name-input" value="${name||''}" placeholder="e.g. Geotechnical Investigation Report"></div>
    <div class="annex-pages" id="annex-pages-${id}"></div>
    <button type="button" class="addrow-btn" onclick="addAnnexPage('${id}')">+ Add Document</button>
  </div>`;
}
let annexHtml = statictext('All supporting documents referenced in this report as "Annexure" are attached below, in order. Provide a name for each document and use "Add Document" to attach the scanned page(s)/file(s). Use "Add More" to attach additional annexures not referenced elsewhere in the report.');
annexHtml += `<div id="annexureList">`;
annexCoreMeta.forEach(a=>{ annexHtml += annexBlockHtml(a.id, a.name, false); });
annexHtml += `</div>`;
annexHtml += `<button type="button" class="addrow-btn" onclick="addNewAnnexure()">+ Add More Annexures</button>`;

/* ============================= RENDER ============================= */
const mainEl = document.getElementById('mainContent');
const tocEl = document.getElementById('toc');

let tocHtml = `<a href="#cover" onclick="closeTocOnMobile()">Cover Page</a>`;
mainEl.innerHTML += `<div class="chapter" id="cover"><div class="chapter-head">Cover Page</div><div class="chapter-body">${coverHtml}</div></div>`;

chapters.forEach(ch=>{
  const anchor = 'ch'+ch.no;
  tocHtml += `<a href="#${anchor}" onclick="closeTocOnMobile()">Chapter ${ch.no}: ${ch.title}</a>`;
  mainEl.innerHTML += `<div class="chapter" id="${anchor}"><div class="chapter-head"><span class="chnum">${ch.no}</span><span>${ch.title}</span></div><div class="chapter-body">${ch.bodyHtml}</div></div>`;
});
tocHtml += `<a href="#certification" onclick="closeTocOnMobile()">Certification</a>`;
mainEl.innerHTML += `<div class="chapter" id="certification"><div class="chapter-head">Certification</div><div class="chapter-body">${certHtml}</div></div>`;

tocHtml += `<a href="#annexures" onclick="closeTocOnMobile()">Annexures</a>`;
mainEl.innerHTML += `<div class="chapter" id="annexures"><div class="chapter-head">Annexures</div><div class="chapter-body">${annexHtml}</div></div>`;

/* ---------- ANNEXURE — PHOTOGRAPHS (moved from the cover page; auto-displays every uploaded photo) ---------- */
let annexPhotoHtml = statictext('Photographs of the dam and its key components, uploaded below, are reproduced automatically in this Annexure.');
annexPhotoHtml += `<div class="photogrid" style="max-width:100%;margin:0 auto">
    ${photoBox('Photograph of the Dam')}
    ${photoBox('Photograph of Spillway / Energy Dissipating Arrangement')}
    ${photoBox('Photograph of Foundation Gallery')}
    ${photoBox('Photograph of Critical Component (if any)')}
    ${photoBox('Additional Photograph 1 (if any)')}
    ${photoBox('Additional Photograph 2 (if any)')}
  </div>`;
tocHtml += `<a href="#annexPhotos" onclick="closeTocOnMobile()">Annexure — Photographs</a>`;
mainEl.innerHTML += `<div class="chapter" id="annexPhotos"><div class="chapter-head">Annexure — Photographs</div><div class="chapter-body">${annexPhotoHtml}</div></div>`;

tocEl.innerHTML = `<div class="toclabel">TABLE OF CONTENTS</div>` + tocHtml;
renumberAnnexures();

/* ============================= DYNAMIC ROWS ============================= */
function addActionPlanRow(recommendation, priority, responsibility, timeline){
  const tbody = document.getElementById('actionPlanBody');
  const i = tbody.children.length+1;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td style="text-align:center">${i}</td>
    <td><input type="text" data-field="${nid()}" value="${recommendation||''}"></td>
    <td><input type="text" data-field="${nid()}" placeholder="Immediate / Short-term / Long-term" value="${priority||''}"></td>
    <td><input type="text" data-field="${nid()}" value="${responsibility||''}"></td>
    <td><input type="text" data-field="${nid()}" value="${timeline||''}"></td>`;
  tbody.appendChild(tr);
}
function addIpoeRow(){



  const tbody = document.getElementById('ipoeBody');
  const i = tbody.children.length+1;
  const tr = document.createElement('tr');
  tr.innerHTML = `<td style="text-align:center">${i}</td>
    <td><input type="text" data-field="${nid()}"></td>
    <td><input type="text" data-field="${nid()}"></td>
    <td><input type="text" data-field="${nid()}" placeholder="(sign)"></td>`;
  tbody.appendChild(tr);
}
addActionPlanRow('Hydrologic/design flood revalidation','Immediate','Dam Owner','12 months');
addActionPlanRow('Seismic safety evaluation','Short-term','Dam Owner','12 months');
addActionPlanRow('Seepage measurement arrangement','Immediate','Dam Owner','12 months');
addActionPlanRow('Reservoir routing & spillway hydraulics','Long-term','Dam Owner','12 months');
addIpoeRow(); addIpoeRow(); addIpoeRow();

/* ---------- Top-of-page quick access: Date of Visit + Add IPoE Member ---------- */
(function setupTopQuickFields(){
  const quickDate = document.getElementById('dateOfVisitQuickInput');
  const canonicalDate = document.getElementById('certDateOfVisitInput');
  if(quickDate && canonicalDate){
    quickDate.addEventListener('input', ()=>{ canonicalDate.value = quickDate.value; });
    canonicalDate.addEventListener('input', ()=>{ quickDate.value = canonicalDate.value; });
  }
  const quickReservoir = document.getElementById('reservoirLevelQuickInput');
  const canonicalReservoir = document.getElementById('reservoirLevelInput');
  if(quickReservoir && canonicalReservoir){
    quickReservoir.value = canonicalReservoir.value;
    quickReservoir.addEventListener('input', ()=>{ canonicalReservoir.value = quickReservoir.value; });
    canonicalReservoir.addEventListener('input', ()=>{ quickReservoir.value = canonicalReservoir.value; });
  }
})();
function addIpoeMemberFromTop(){
  const nameEl = document.getElementById('ipoeNameInput');
  const desigEl = document.getElementById('ipoeDesigInput');
  const name = (nameEl.value||'').trim();
  const desig = (desigEl.value||'').trim();
  if(!name && !desig) return;
  const tbody = document.getElementById('ipoeBody');
  // Reuse the first row whose Name cell is still blank or just holds the
  // "Not available" placeholder, instead of always adding a brand-new row —
  // so entries land in row 1, 2, 3... in order rather than piling up at the end.
  const isPlaceholder = v => { const t = (v||'').trim(); return t === '' || t.toLowerCase() === 'not available'; };
  let targetRow = Array.from(tbody.children).find(tr=>{
    const nameInput = tr.querySelectorAll('input[data-field]')[0];
    return nameInput && isPlaceholder(nameInput.value);
  });
  if(!targetRow){
    addIpoeRow();
    targetRow = tbody.lastElementChild;
  }
  const inputs = targetRow.querySelectorAll('input[data-field]');
  if(inputs[0]) inputs[0].value = name;
  if(inputs[1]) inputs[1].value = desig;
  const listEl = document.getElementById('ipoeQuickList');
  const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  listEl.innerHTML += `<div>&#8226; ${esc(name)}${desig ? ' — '+esc(desig) : ''}</div>`;
  nameEl.value = ''; desigEl.value = '';
  nameEl.focus();
}

/* ============================= ANNEXURES — dynamic behaviour ============================= */
let annexExtraCount = 0;
function toRoman(num){
  const map = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let res='';
  for(const [v,s] of map){ while(num>=v){ res+=s; num-=v; } }
  return res||'I';
}
function renumberAnnexures(){
  const blocks = document.querySelectorAll('#annexureList .annex-block');
  blocks.forEach((b,i)=>{
    const roman = toRoman(i+1);
    const id = b.dataset.annexId;
    const label = b.querySelector('.annexroman-label');
    if(label) label.textContent = roman;
    document.querySelectorAll(`.annexref[data-annex-id="${id}"] .annexroman`).forEach(s=> s.textContent = roman);
  });
}
function addAnnexPage(id){
  const wrap = document.getElementById('annex-pages-'+id);
  const n = wrap.children.length+1;
  const div = document.createElement('div');
  div.className = 'annex-page';
  div.innerHTML = `<div class="field"><label>Document ${n} — Upload File (image / PDF)</label>
      <input type="file" accept="image/*,.pdf" data-field="${nid()}" onchange="previewAnnexFile(this)"></div>
    <img alt="" class="single-img">
    <div class="pdf-pages"></div>
    <div class="filepill"></div>
    <button type="button" class="addrow-btn" style="background:#fde8e8;color:#8a2020;margin-top:8px;" onclick="this.parentElement.remove()">Remove Document</button>`;
  wrap.appendChild(div);
}
async function previewAnnexFile(input){
  const page = input.closest('.annex-page');
  const img = page.querySelector('img.single-img');
  const pdfWrap = page.querySelector('.pdf-pages');
  const pill = page.querySelector('.filepill');
  const file = input.files[0];

  img.style.display='none'; img.src='';
  pdfWrap.innerHTML='';
  pill.style.display='none'; pill.textContent='';

  if(!file) return;

  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  if(file.type.startsWith('image/')){
    const reader = new FileReader();
    reader.onload = e => { img.src = e.target.result; img.style.display='block'; };
    reader.readAsDataURL(file);
  } else if(isPdf){
    if(!window.pdfjsLib){
      pill.textContent = '\u{1F4C4} ' + file.name + ' (PDF preview library failed to load — file still attached)';
      pill.style.display='block';
      return;
    }
    pill.textContent = 'Rendering PDF pages…';
    pill.style.display='block';
    try{
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({data:buf}).promise;
      for(let i=1;i<=pdf.numPages;i++){
        const pdfPage = await pdf.getPage(i);
        const viewport = pdfPage.getViewport({scale:1.8});
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await pdfPage.render({canvasContext:canvas.getContext('2d'), viewport}).promise;
        const pimg = document.createElement('img');
        pimg.className = 'pdf-page-img';
        pimg.alt = file.name + ' — page ' + i;
        pimg.src = canvas.toDataURL('image/jpeg', 0.85);
        pdfWrap.appendChild(pimg);
      }
      pill.style.display='none';
    } catch(err){
      pill.textContent = '\u{1F4C4} ' + file.name + ' (could not render preview — file still attached)';
      pill.style.display='block';
    }
  } else {
    pill.textContent = '\u{1F4C4} ' + file.name;
    pill.style.display='block';
  }
}
function addNewAnnexure(){
  annexExtraCount++;
  const id = 'extra'+annexExtraCount;
  const div = document.createElement('div');
  div.innerHTML = annexBlockHtml(id, '', true);
  document.getElementById('annexureList').appendChild(div.firstElementChild);
  renumberAnnexures();
}
function removeAnnexure(id){
  const el = document.getElementById('annex-'+id);
  if(el && confirm('Remove this annexure entry?')){ el.remove(); renumberAnnexures(); }
}

/* ============================= DAM DATASET AUTOFILL (PIC / Reports.csv) ============================= */
let csvIndex = {};
let csvHeaders = [];
function indexDamRows(headers, rows){
  csvHeaders = headers;
  csvIndex = {};
  const picI = headers.indexOf('PIC'), nameI = headers.indexOf('Name of Dam');
  const dl = document.getElementById('picDataList');
  let opts = '';
  rows.forEach(r=>{
    const pic = (r[picI]||'').trim();
    if(!pic) return;
    const obj = {};
    headers.forEach((h,i)=> obj[h]=r[i]);
    csvIndex[pic.toUpperCase()] = obj;
    opts += `<option value="${pic} — ${(r[nameI]||'').replace(/"/g,'')}">`;
  });
  if(dl) dl.innerHTML = opts;
  const statusEl = document.getElementById('autofillStatus');
  if(statusEl){
    statusEl.textContent = `Dataset ready: ${Object.keys(csvIndex).length.toLocaleString('en-IN')} dam records loaded. Type a PIC or dam name above and click "Fetch & Auto-fill".`;
    statusEl.classList.add('ok');
  }
}
function parseCSV(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for(let i=0;i<text.length;i++){
    const c = text[i];
    if(inQuotes){
      if(c === '"'){
        if(text[i+1] === '"'){ field+='"'; i++; } else inQuotes = false;
      } else field += c;
    } else {
      if(c === '"') inQuotes = true;
      else if(c === ','){ row.push(field); field=''; }
      else if(c === '\n'){ row.push(field); rows.push(row); row=[]; field=''; }
      else if(c === '\r'){ /* skip */ }
      else field += c;
    }
  }
  if(field.length || row.length){ row.push(field); rows.push(row); }
  return rows;
}
function loadDamCSV(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const rows = parseCSV(e.target.result);
      const headers = rows[0].map(h=>h.trim());
      const data = rows.slice(1).filter(r=>r.length>1);
      indexDamRows(headers, data);
      alert('Dataset updated from ' + file.name + ' — ' + data.length + ' rows loaded.');
    }catch(err){ alert('Could not read this CSV file.'); }
  };
  reader.readAsText(file);
}
function doAutofillFromSearch(){
  const raw = (document.getElementById('picSearchInput').value||'').trim();
  if(!raw){ alert('Type a PIC or dam name first, then pick a suggestion.'); return; }
  const pic = raw.split(' — ')[0].trim().toUpperCase();
  let row = csvIndex[pic];
  if(!row){
    // fallback: try matching by dam name (case-insensitive contains)
    const nameQuery = raw.toLowerCase();
    row = Object.values(csvIndex).find(r => (r['Name of Dam']||'').toLowerCase() === nameQuery || (r['Name of Dam']||'').toLowerCase().includes(nameQuery));
  }
  if(!row){ alert('No matching dam found for "'+raw+'". Please check the PIC / dam name, or fill the details manually.'); return; }
  autofillFromRow(row);

}


/* ============================= COLOR AUTO-FILLED & PRE-FILLED DATA ============================= */
function colorFilledFieldsPurple() {
  document.querySelectorAll('input[data-field], textarea[data-field], select[data-field]').forEach(el => {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if(type === 'checkbox' || type === 'radio' || type === 'file') return;
    
    const val = el.value ? el.value.trim() : '';
    
    // Agar box mein kuch likha hai, AUR usme "Not available" nahi likha hai, tabhi purple karo
    if(val !== '' && !val.includes('Not available')) {
      el.style.color = 'purple';
    } else {
      // Agar "Not available" hai, toh black (default) hi rakho
      el.style.color = '';
    }

    // Agar user khud type kare, toh color wapas normal kar do
    if (!el.dataset.colorBound) {
      el.addEventListener('input', function(e) {
        if (e.isTrusted) { 
          this.style.color = ''; 
        }
      });
      el.dataset.colorBound = "true";
    }
  });
}

setTimeout(colorFilledFieldsPurple, 200);



function autofillFromRow(row){
   let serialNo = Object.keys(csvIndex).indexOf(row['PIC']) + 1;

  updateDocumentNo(row, serialNo);

  // Location field combines two dataset columns (Latitude + Longitude) that
  // the generic single-key [data-autofill] mechanism below can't express.
  const locEl = document.getElementById('locationLatLongInput');
  if(locEl){
    const lat = (row['Latitude']||'').toString().trim();
    const lng = (row['Longitude']||'').toString().trim();
    locEl.value = (lat && lng) ? `${lat}, ${lng}` : (lat || lng || emptyTextFor(locEl));
  }

  document.querySelectorAll('[data-autofill]').forEach(el=>{
    const key = el.dataset.autofill;
    const val = row[key];
    if(val !== undefined && val !== null && String(val).trim() !== ''){
      if(el.tagName === 'SELECT'){
        const match = Array.from(el.options).find(o=>o.value.toLowerCase()===String(val).trim().toLowerCase());
        el.value = match ? match.value : el.value;
      } else {
        el.value = val;
      }
    } else {
      // Dataset has no value for this field — pre-fill "Not available" as a
      // real, editable value so it's visible immediately; the user can just
      // type over it if they have the actual figure.
      if(el.tagName !== 'SELECT') el.value = emptyTextFor(el);
    }
  });
  // Fields with no connection to the dataset at all (most of Chapters 3+,
  // e.g. spillway/outlet-works dimensions) never get touched above — fill
  // every other still-empty field in the report the same way, so the whole
  // report is pre-filled and reviewable rather than showing blank boxes.
  document.querySelectorAll('.chapter input[data-field], .chapter textarea[data-field], .cover input[data-field], .cover textarea[data-field]').forEach(el=>{
    const type = (el.getAttribute('type')||'').toLowerCase();
    if(type==='checkbox' || type==='radio' || type==='file' || type==='date') return;
    if(!el.value || !el.value.trim()) el.value = emptyTextFor(el);
  });
  // Sync top controls (dam type / gated-ungated) where recognisable
  const typeVal = (row['Type of Dam']||'').toLowerCase();
  if(typeVal.includes('earthen') || typeVal.includes('rockfill')) document.getElementById('ctrlDamType').value = 'earthen';
  else if(typeVal.includes('concrete') || typeVal.includes('masonry')) document.getElementById('ctrlDamType').value = 'concrete';
  else if(typeVal.includes('composite')) document.getElementById('ctrlDamType').value = 'composite';
  else if(typeVal.includes('barrage')) document.getElementById('ctrlDamType').value = 'barrage';
  if((row['Gated']||'').trim().toLowerCase()==='yes'){ document.getElementById('ctrlGated').checked = true; document.getElementById('ctrlUngated').checked=false; }
  else if((row['Ungated']||'').trim().toLowerCase()==='yes'){ document.getElementById('ctrlUngated').checked = true; document.getElementById('ctrlGated').checked=false; }
  onSpillwayChange();
  applyConditions();
  updateCoverTitle(row['Name of Dam'] || '');
  updatePICTitle(row['PIC'] || '');
  // Reservoir Level was just set programmatically above (via [data-autofill]),
  // which doesn't fire an 'input' event — push its value into the top quick
  // box explicitly so the two stay in sync after autofill too.
  const reservoirCanonical = document.getElementById('reservoirLevelInput');
  const reservoirQuick = document.getElementById('reservoirLevelQuickInput');
  if(reservoirCanonical && reservoirQuick) reservoirQuick.value = reservoirCanonical.value;
                let s1 = Object.keys(csvIndex).indexOf(row['PIC']) + 1;

  updateDocumentNo(row, s1);
  docNoEdited = false;
  // updateDocNoFromSerial();
  const coverInput = document.getElementById('coverDamInput');
  if(coverInput && !coverInput.value) coverInput.value = row['Name of Dam']||'';
  const statusEl = document.getElementById('autofillStatus');
  if(statusEl){ statusEl.textContent = `Auto-filled from dataset: ${row['Name of Dam']||''} (PIC: ${row['PIC']||''}). All fields below are shown and ready to edit.`; statusEl.classList.add('ok'); }

  // 👇 ADDED THIS LINE AT THE END 👇
  if (typeof colorFilledFieldsPurple === 'function') {
    colorFilledFieldsPurple();
  }
}
const DAM_HEADERS=["Sr.No", "PIC", "Name of Dam", "SDSO Name", "State", "Dam Incharge", "Dam Owner", "Latitude", "Longitude", "Year of Commission", "Type of Dam", "River Basin", "River Sub Basin", "River", "Nearest City", "District", "Seismic Zone", "Height above Lowest Foundation Level(m)", "Dam Length(m)", "Gross Storage Capacity(MCM)", "Reservoir Area(103 m2)", "Live Storage Capacity(MCM)", "Purpose", "Designed Spillway Capacity(m3/s)", "Max. Water Level(m)", "Full Reservoir Level(m)", "Gated", "Ungated", "Head of DSU Name", "Head of DSU Email", "Head of DSU Mobile", "Total Hydropower installed capacity", "Flood Cushion (MWL-FRL)(MCM)", "Catchment Area (km2)", "Reservoir Surface-Area(MWL)(km2)", "Available FreeBoard(m)", "Sub Dam Type", "Rule curve Available", "Design Inflow Flood (m3/s)", "Inflow Design Flood Year", "Has inflow Design Flood reviewed(Year of Review)", "Dead Storage Volume (m3/s)", "Type of Spillway(quantity)", "Spillway Type(Max. Discharge Capacity  in m3/s)", "Energy Dissipation structure Types", "Design discharge of EDA(m3/s)", "HRT available (No. of HRT if available)", "Deaign discharge per unit intake", "Type of gate ( Quantity)", "Valve Type (Quantity)", "Road type((Number of access road))", "Tunnel available", "Max. Design Discharge of tunnel(m3/s)", "Gallery / Shaft Type (Top Elevation level in m)", "Geotechnical Instruments(Installed/Total Type)", "Geodetic Instruments(Installed/Total Type)", "Hydrometeorological Instruments(Installed/Total Type)", "Seismic Instruments(Installed/Total Type)", "Other Instruments(Installed/Total Type)", "EAP Reports available (Yes/No)", "O&M (Yes/No)", "EWS-Hooter System", "EWS-Sign board-(YES/NO)", "EWS-Flood forecast", "EWS-Glacial lake outburst floo", "Is the display board installed at the dam site?-(YES/NO)", "Dam Safety Act, 2021 Display Board-(YES/NO)", "Rule Curve Display Board-(YES/NO)", "Independent Panel of Experts (IPoE)-(YES/NO)", "Dam Visited-(YES/NO)", "PAR Value", "CE Mail", "CE Add"];
/* Load the dam dataset. Prefer the live Excel file (data/dam-database.xlsx) via
   fetch — this only works when the page is served over http:// (a local server),
   since browsers block fetch() of local files opened directly (file://). If that
   fetch fails for any reason (no server running, opened by double-click, etc.),
   fall back to the dataset bundled as a plain JS array in data/dam-data.js, which
   always works with zero setup. */
(async function loadDamDataset(){
  const statusEl = document.getElementById('autofillStatus');
  try{
    if(typeof XLSX === 'undefined') throw new Error('XLSX library not loaded');
    const resp = await fetch('data/dam-database.xlsx');
    if(!resp.ok) throw new Error('HTTP ' + resp.status);
    const buf = await resp.arrayBuffer();
    const wb = XLSX.read(buf, {type:'array'});
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows2d = XLSX.utils.sheet_to_json(sheet, {header:1, raw:false, defval:''});
    const headers = rows2d[0];
    const dataRows = rows2d.slice(1).filter(r => r.some(v => (v||'').toString().trim() !== ''));
    indexDamRows(headers, dataRows);
    console.log('Dam dataset: loaded live from data/dam-database.xlsx via fetch (' + dataRows.length + ' rows). Edit that file and refresh to update.');
  }catch(e){
    console.warn('Could not fetch data/dam-database.xlsx (no local server, or opened via file:///content://) — using the bundled dataset instead.', e);
    if(typeof DAM_ROWS !== 'undefined'){
      indexDamRows(DAM_HEADERS, DAM_ROWS);
    } else if(statusEl){
      statusEl.textContent = 'Dataset unavailable — could not load the Excel file and no bundled fallback was found.';
    }
  }
})();

/* ============================= CONDITIONAL LOGIC ============================= */
function applyConditions(){
  const damType = document.getElementById('ctrlDamType').value;
  const ungated = document.getElementById('ctrlUngated').checked;
  const gated = document.getElementById('ctrlGated').checked;
  const saddle = document.getElementById('ctrlSaddle').checked;
  const aux = document.getElementById('ctrlAux').checked;
  const fuse = document.getElementById('ctrlFuse').checked;

  const active = new Set();
  if(damType==='concrete') active.add('concrete');
  if(damType==='earthen') active.add('earthen');
  if(damType==='composite'){ active.add('concrete'); active.add('earthen'); }
  if(damType==='barrage') active.add('barrage');
  if(ungated) active.add('ungated');
  if(gated) active.add('gated');
  if(saddle) active.add('saddle');
  if(aux) active.add('aux');
  if(fuse) active.add('fuse');

  document.querySelectorAll('.cond').forEach(el=>{
    const classes = Array.from(el.classList).filter(c=>c!=='cond'&&c!=='hidden');
    const show = classes.some(c=>active.has(c));
    el.classList.toggle('hidden', !show);
  });
  if(typeof numberContent === 'function') numberContent();
}
// function updateDocumentNo(row, serial) {
//   const pic = (row['PIC'] || '').trim();

//   const text = serial + '/' + pic + '/CDSE/2026/WRD';

//   const el = document.getElementById('coverDocNo');
//   if (el) el.value = text;
// }
function updateDocumentNo(row, serialNo) {
  const pic = (row['PIC'] || '').trim();

  console.log("Serial:", serialNo, "PIC:", pic);

  const text = serialNo + '/' + pic + '/CDSE/2026/WRD';

  const el = document.getElementById('coverDocNo');
  if (el) el.value = text;
}
function updateCoverTitle(v){
  v = (v || '').trim();

  const text = v ? (v.toUpperCase() + ' DAM') : 'DAM';

  const damEl = document.getElementById('coverDamName');
  if (damEl) damEl.textContent = text;

  const certEl = document.getElementById('certDamName');
  if (certEl) certEl.textContent = text;
}
function updatePICTitle(v) {
  v = (v || '').trim();

  // Subscript numbers ko normal numbers me convert karo
  v = v.replace(/[₀₁₂₃₄₅₆₇₈₉]/g, function(c) {
    return '0123456789'['₀₁₂₃₄₅₆₇₈₉'.indexOf(c)];
  });

  const picEl = document.getElementById('coverDamPIC');
  if (picEl) picEl.textContent = v;

  const certPIC = document.getElementById('certPIC');
  if (certPIC) certPIC.textContent = v;
}

/* Document No. auto-generation: <Dam Serial No>/PIC OF DAM/CDSE/2026/WRD.
   Stays in sync with the Serial No. field unless the user has typed into
   the Document No. field directly (tracked via docNoEdited). */
let docNoEdited = false;
function markDocNoEdited(){ docNoEdited = true; }
function updateDocNoFromSerial(){
  const serialEl = document.getElementById('coverSerialNo');
  const docNoEl = document.getElementById('coverDocNo');
  if(!serialEl || !docNoEl) return;
  if(docNoEdited) return;
  const serial = (serialEl.value||'').trim();
  docNoEl.value = serial ? (serial + '/PIC OF DAM/CDSE/2026/WRD') : '';
}
function previewPhoto(input){
  const img = input.parentElement.querySelector('.thumbwrap img');
  const file = input.files[0];
  if(!file){ img.style.display='none'; img.src=''; return; }
  const reader = new FileReader();
  reader.onload = e => { img.src = e.target.result; img.style.display='block'; };
  reader.readAsDataURL(file);
}

/* Let the user click the cover-page dam photo to upload their own image,
   replacing the default placeholder photo shown there. */
function replaceCoverHeroImage(input){
  const file = input.files[0];
  if(!file) return;
  const img = document.getElementById('coverHeroImg');
  const reader = new FileReader();
  reader.onload = e => { if(img) img.src = e.target.result; };
  reader.readAsDataURL(file);
}

/* Show "Not available" in place of any empty text/textarea/date field while
   printing (so blank fields don't print as empty boxes), and restore the
   actual (empty) value afterwards so the on-screen editable form is unaffected. */
let __emptyFieldsFilledForPrint = [];
let __emptySelectsFilledForPrint = [];
function fillEmptyFieldsForPrint(){
  __emptyFieldsFilledForPrint = [];
  document.querySelectorAll('.chapter input[data-field], .chapter textarea[data-field], .cover input[data-field], .cover textarea[data-field]').forEach(el=>{
    const type = (el.getAttribute('type')||'').toLowerCase();
    if(type==='checkbox' || type==='radio' || type==='file') return;
    if(!el.value || !el.value.trim()){
      el.value = emptyTextFor(el);
      el.classList.add('print-not-available');
      __emptyFieldsFilledForPrint.push(el);
    }
  });
  __emptySelectsFilledForPrint = [];
  document.querySelectorAll('.chapter select[data-field], .cover select[data-field]').forEach(sel=>{
    if(!sel.value){
      const opt = document.createElement('option');
      opt.value = '__print_na__';
      opt.textContent = emptyTextFor(sel);
      sel.appendChild(opt);
      sel.value = '__print_na__';
      sel.classList.add('print-not-available');
      __emptySelectsFilledForPrint.push(sel);
    }
  });
}
function restoreEmptyFieldsAfterPrint(){
  __emptyFieldsFilledForPrint.forEach(el=>{
    el.value = '';
    el.classList.remove('print-not-available');
  });
  __emptyFieldsFilledForPrint = [];
  __emptySelectsFilledForPrint.forEach(sel=>{
    sel.value = '';
    sel.classList.remove('print-not-available');
    const opt = sel.querySelector('option[value="__print_na__"]');
    if(opt) opt.remove();
  });
  __emptySelectsFilledForPrint = [];
}

/* Only include the "Annexure — Photographs" page in Print/PDF when at least one
   photo has actually been uploaded there — an all-empty page is not printed.
   Hooked to beforeprint so this applies whether printing via our button,
   Ctrl+P, or the browser's own print menu. */
function updateAnnexPhotosPrintVisibility(){
  const annexPhotos = document.getElementById('annexPhotos');
  if(!annexPhotos) return;
  const hasPhoto = Array.from(annexPhotos.querySelectorAll('.photobox .thumbwrap img'))
    .some(img => img.src && img.style.display !== 'none');
  annexPhotos.classList.toggle('no-photos', !hasPhoto);
}
function printReport(){
  window.print();
}
window.addEventListener('beforeprint', () => {
  updateAnnexPhotosPrintVisibility();
  fillEmptyFieldsForPrint();
});
window.addEventListener('afterprint', () => {
  const annexPhotos = document.getElementById('annexPhotos');
  if(annexPhotos) annexPhotos.classList.remove('no-photos');
  restoreEmptyFieldsAfterPrint();
});

/* ============================= SPILLWAY RADIO (single-select) ============================= */
function onSpillwayChange(){
  document.getElementById('lblUngated').classList.toggle('active', document.getElementById('ctrlUngated').checked);
  document.getElementById('lblGated').classList.toggle('active', document.getElementById('ctrlGated').checked);
  applyConditions();
}

/* Chapter 13 — show the "Interim operating restrictions" box only when
   Category II is selected; hide (and leave untouched) for Category I/III.
   Category II auto-selects "Significant", Category III auto-selects "Low"
   as the working Hazard Classification in Chapter 3 (editable — the IPoE
   can override it either way). */
function onSafetyCategoryChange(radioEl){
  const wrap = document.getElementById('interimRestrictionsWrap');
  const cat = radioEl.dataset.safetyCat;
  if(wrap) wrap.style.display = (cat === 'II') ? 'block' : 'none';
  const hazardValue = cat === 'II' ? 'Significant' : (cat === 'III' ? 'Low' : null);
  if(hazardValue){
    const hazard = document.getElementById('hazardClassificationInput');
    const assigned = document.getElementById('assignedClassificationInput');
    if(hazard) hazard.value = hazardValue;
    if(assigned) assigned.value = hazardValue;
  }
}

/* ============================= MOBILE NAV ============================= */
function toggleToc(){
  document.getElementById('toc').classList.toggle('open');
  document.getElementById('tocBackdrop').classList.toggle('open');
}
function closeTocOnMobile(){
  if(window.innerWidth <= 900){
    document.getElementById('toc').classList.remove('open');
    document.getElementById('tocBackdrop').classList.remove('open');
  }
}

/* ============================= EXPORT / IMPORT ============================= */
function buildDataObject(){
  const data = {};
  document.querySelectorAll('[data-field]').forEach(el=>{
    if(el.type==='file') return;
    if(el.type==='checkbox') data[el.dataset.field]=el.checked;
    else if(el.type==='radio'){ if(el.checked) data[el.dataset.field]=true; }
    else data[el.dataset.field]=el.value;
  });
  data.__controls = {
    damType: document.getElementById('ctrlDamType').value,
    ungated: document.getElementById('ctrlUngated').checked,
    gated: document.getElementById('ctrlGated').checked,
    saddle: document.getElementById('ctrlSaddle').checked,
    aux: document.getElementById('ctrlAux').checked,
    fuse: document.getElementById('ctrlFuse').checked
  };
  return data;
}
function exportJSON(){
  const data = buildDataObject();
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const damEl = document.getElementById('coverDamInput');
  a.download = ((damEl && damEl.value) || 'CDSE_Report')+'_data.json';
  a.click();
}

/* ============================= WORD (.docx) EXPORT — real, editable, professional docx built in-browser ============================= */
function wxVisible(el){
  const cs = window.getComputedStyle(el);
  return cs.display !== 'none' && cs.visibility !== 'hidden';
}
function wxTxt(el){ return el.textContent.replace(/\s+/g,' ').trim(); }

function wxRichParts(el){
  const parts = [];
  function walk(node, boldCtx){
    node.childNodes.forEach(n=>{
      if(n.nodeType === 3){
        const t = n.textContent.replace(/\s+/g,' ');
        if(t.trim()) parts.push({type:'text', text:t, bold: boldCtx});
      } else if(n.nodeType === 1){
        const tag = n.tagName.toLowerCase();
        if(tag === 'ul' || tag === 'ol'){
          const items = Array.from(n.children).filter(li=>li.tagName==='LI').map(li=>wxTxt(li));
          parts.push({type:'list', ordered: tag==='ol', items});
        } else if(tag === 'b' || tag === 'strong'){
          walk(n, true);
        } else if(tag === 'br'){
          parts.push({type:'break'});
        } else {
          walk(n, boldCtx);
        }
      }
    });
  }
  walk(el, false);
  return parts;
}

function wxFieldInfo(fieldEl){
  const label = fieldEl.querySelector('label');
  let labelText = '';
  if(label){
    const clone = label.cloneNode(true);
    const badge = clone.querySelector('.autofill-badge');
    if(badge) badge.remove();
    labelText = wxTxt(clone);
  }
  let input = fieldEl.querySelector('input, select, textarea');
  let inputType = 'text', options = null, value = '', checked = null;
  if(input){
    const tag = input.tagName.toLowerCase();
    if(tag === 'select'){
      inputType = 'select';
      options = Array.from(input.options).map(o=>o.textContent.trim());
      value = input.value ? input.options[input.selectedIndex].textContent.trim() : '';
    } else if(tag === 'textarea'){
      inputType = 'textarea'; value = input.value || '';
    } else if(input.type === 'checkbox'){
      inputType = 'checkbox'; checked = input.checked;
    } else if(input.type === 'radio'){
      inputType = 'radio'; checked = input.checked;
    } else if(input.type === 'file'){
      inputType = 'file';
    } else if(input.type === 'date'){
      inputType = 'date'; value = input.value || '';
    } else {
      inputType = 'text'; value = input.value || '';
    }
  }
  return {label: labelText, inputType, options, value, checked, emptyText: input && input.dataset ? input.dataset.emptyText : undefined};
}

function wxTableInfo(tableEl){
  const headers = Array.from(tableEl.querySelectorAll('thead th')).map(th=>wxTxt(th));
  const rows = Array.from(tableEl.querySelectorAll('tbody tr')).map(tr=>{
    return Array.from(tr.children).map(td=>{
      const inp = td.querySelector('input,select,textarea');
      if(inp){
        if(inp.tagName.toLowerCase()==='select'){
          const v = inp.value ? inp.options[inp.selectedIndex].textContent.trim() : '';
          return {blank:true, kind:'select', value:v};
        }
        if(inp.type === 'checkbox') return {blank:true, kind:'checkbox', checked: inp.checked};
        return {blank:true, kind:'text', value: inp.value || ''};
      }
      return {text: wxTxt(td)};
    });
  });
  return {headers, rows};
}

function wxImgDataFromEl(imgEl, maxW){
  if(!imgEl || !imgEl.src || imgEl.src.indexOf('data:') !== 0) return null;
  const m = /^data:image\/(png|jpeg|jpg|gif);base64,(.*)$/i.exec(imgEl.src);
  if(!m) return null;
  let type = m[1].toLowerCase();
  if(type === 'jpeg') type = 'jpg';
  const b64 = m[2];
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  let w = imgEl.naturalWidth || 280, h = imgEl.naturalHeight || 210;
  const cap = maxW || 280;
  if(w > cap){ h = Math.round(h * (cap / w)); w = cap; }
  return {data: bytes, type, width: w, height: h};
}
function wxPhotoImageData(photoboxEl){
  const img = photoboxEl.querySelector('.thumbwrap img');
  return wxImgDataFromEl(img, 280);
}

function wxWalkContainer(root){
  const blocks = [];
  function recurse(el){
    Array.from(el.children).forEach(child=>{
      if(!wxVisible(child)) return;
      if(child.classList.contains('autofillbox')) return;
      if(child.matches && child.matches('.tablewrap')){
        const table = child.querySelector('table.data');
        if(table) blocks.push({type:'table', ...wxTableInfo(table)});
        return;
      }
      if(child.tagName === 'TABLE' && child.classList.contains('data')){
        blocks.push({type:'table', ...wxTableInfo(child)});
        return;
      }
      if(child.classList.contains('checklist-list')){
        const items = Array.from(child.querySelectorAll('.chk-item')).map(it=>{
          const cb = it.querySelector('input[type=checkbox]');
          return {label: wxTxt(it), checked: cb ? cb.checked : false};
        });
        blocks.push({type:'checklist', items});
        return;
      }
      if(child.classList.contains('quotebox')){
        blocks.push({type:'quotebox', parts: wxRichParts(child)});
        return;
      }
      if(child.classList.contains('statictext')){
        const variant = child.classList.contains('statute-text') ? 'statute' : (child.classList.contains('section-box') ? 'section' : 'plain');
        blocks.push({type:'statictext', variant, parts: wxRichParts(child)});
        return;
      }
      if(child.classList.contains('subhead')){
        blocks.push({type:'subhead', text: wxTxt(child)});
        return;
      }
      if(child.classList.contains('subsubhead')){
        blocks.push({type:'subsubhead', text: wxTxt(child)});
        return;
      }
      if(child.classList.contains('field') && !child.classList.contains('select-add-field')){
        const aref = child.querySelector(':scope > .annexref');
        if(aref){ blocks.push({type:'annexref', text: wxTxt(aref)}); return; }
        blocks.push({type:'field', ...wxFieldInfo(child)});
        return;
      }
      if(child.classList.contains('annexref')){
        blocks.push({type:'annexref', text: wxTxt(child)});
        return;
      }
      if(child.classList.contains('note')){
        blocks.push({type:'note', text: wxTxt(child)});
        return;
      }
      if(child.classList.contains('photogrid')){
        const boxes = Array.from(child.querySelectorAll('.photobox')).map(pb=>({
          label: wxTxt(pb.querySelector('b')),
          image: wxPhotoImageData(pb)
        }));
        blocks.push({type:'photogrid', boxes});
        return;
      }
      if(child.classList.contains('annex-block')){
        const nameInput = child.querySelector('.annex-name-input');
        const title = nameInput ? nameInput.value.trim() : '';
        const romanEl = child.querySelector('.annexroman-label');
        const roman = romanEl ? romanEl.textContent.trim() : '';
        const files = [];
        child.querySelectorAll('.annex-page').forEach(page=>{
          const single = page.querySelector('img.single-img');
          if(single && wxVisible(single) && single.src){
            const img = wxImgDataFromEl(single, 480);
            if(img) files.push({type:'image', image:img});
          }
          page.querySelectorAll('.pdf-page-img').forEach(pimg=>{
            const img = wxImgDataFromEl(pimg, 480);
            if(img) files.push({type:'image', image:img});
          });
          const pill = page.querySelector('.filepill');
          if(pill && wxVisible(pill) && pill.textContent.trim() && !files.length){
            files.push({type:'text', text: pill.textContent.trim()});
          }
        });
        blocks.push({type:'annexblock', title, roman, files});
        return;
      }
      if(child.classList.contains('tag-list')) return;
      recurse(child);
    });
  }
  recurse(root);
  return blocks;
}

/* Dedicated walker for the Cover Page only — it needs to mirror the on-screen title-page
   layout (centered label-over-box fields, big DAM/PIC headings, Tel/E-mail side by side)
   instead of the plain label|value table used for the rest of the report. */
function wxWalkCoverContainer(root){
  const blocks = [];
  Array.from(root.children).forEach(child=>{
    if(!wxVisible(child)) return;
    if(child.classList.contains('autofillbox')) return;
    if(child.tagName === 'IMG') return; // emblem/hero handled separately
    if(child.classList.contains('damtitle')){
      blocks.push({type:'damtitle', text: wxTxt(child)});
      return;
    }
    if(child.classList.contains('cover-tagline')){
      blocks.push({type:'covertagline', text: wxTxt(child)});
      return;
    }
    if(child.classList.contains('row')){
      const fields = Array.from(child.querySelectorAll(':scope > .field')).map(f=>wxFieldInfo(f));
      if(fields.length) blocks.push({type:'fieldrow', fields});
      return;
    }
    if(child.classList.contains('field') && !child.classList.contains('select-add-field')){
      blocks.push({type:'coverfield', ...wxFieldInfo(child)});
      return;
    }
    // Anything else on the cover (rare) — fall back to normal extraction
    blocks.push(...wxWalkContainer((()=>{ const wrap=document.createElement('div'); wrap.appendChild(child.cloneNode(true)); return wrap; })()));
  });
  return blocks;
}

/* Fetch a same-page <img> (emblem, hero dam photo, etc.) as raw bytes so it can be
   embedded in the Word doc. These are remote/static images that live outside the
   normal .photobox upload flow, so wxWalkContainer never picked them up before —
   which is why they showed on the printed PDF cover but were missing from Word. */
async function wxImgElToBytes(imgEl){
  if(!imgEl || !imgEl.src) return null;
  try{
    // SVG can't be embedded as raster bytes in docx (ImageRun needs png/jpg/gif/bmp) —
    // rasterize it through a canvas first instead of skipping it.
    const rasterizeViaCanvas = () => new Promise((resolve)=>{
      try{
        const w = imgEl.naturalWidth || 160, h = imgEl.naturalHeight || 160;
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx2d = canvas.getContext('2d');
        const tmp = new Image();
        tmp.crossOrigin = 'anonymous';
        tmp.onload = () => {
          ctx2d.drawImage(tmp, 0, 0, w, h);
          canvas.toBlob((blob)=>{
            if(!blob){ resolve(null); return; }
            blob.arrayBuffer().then(buf=>resolve({data:new Uint8Array(buf), type:'png', width:w, height:h})).catch(()=>resolve(null));
          }, 'image/png');
        };
        tmp.onerror = () => resolve(null);
        tmp.src = imgEl.src;
      }catch(e){ resolve(null); }
    });
    if(imgEl.src.indexOf('data:') === 0){
      const m = /^data:image\/(png|jpeg|jpg|gif|svg\+xml);base64,(.*)$/i.exec(imgEl.src);
      if(!m) return null;
      if(m[1].toLowerCase() === 'svg+xml') return rasterizeViaCanvas();
      const bin = atob(m[2]);
      const bytes = new Uint8Array(bin.length);
      for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
      let type = m[1].toLowerCase(); if(type==='jpeg') type='jpg';
      return {data:bytes, type, width:imgEl.naturalWidth||160, height:imgEl.naturalHeight||160};
    }
    const resp = await fetch(imgEl.src);
    if(!resp.ok) return null;
    const ct = (resp.headers.get('content-type')||'').toLowerCase();
    if(ct.includes('svg') || imgEl.src.toLowerCase().endsWith('.svg')) return rasterizeViaCanvas();
    const buf = await resp.arrayBuffer();
    let type = 'png';
    if(ct.includes('jpeg')) type='jpg'; else if(ct.includes('png')) type='png';
    return {data:new Uint8Array(buf), type, width:imgEl.naturalWidth||160, height:imgEl.naturalHeight||160};
  }catch(e){
    console.warn('wxImgElToBytes failed for', imgEl.src, e);
    return null;
  }
}

async function wxExtractReportData(){
  const coverEl = document.querySelector('#cover .cover');
  const coverBlocks = coverEl ? wxWalkCoverContainer(coverEl) : [];
  const coverEmblemEl = coverEl ? coverEl.querySelector('img.goi-emblem') : null;
  const coverHeroEl = coverEl ? coverEl.querySelector('img.cover-hero-img') : null;
  const frontCoverEl = document.getElementById('frontCoverImg');
  const coverEmblem = await wxImgElToBytes(coverEmblemEl);
  const coverHero = await wxImgElToBytes(coverHeroEl);
  const frontCover = await wxImgElToBytes(frontCoverEl);
  const chapters = Array.from(document.querySelectorAll('.chapter')).filter(c=>c.id !== 'cover').map(c=>{
    const head = c.querySelector('.chapter-head');
    const numEl = head ? head.querySelector('.chnum') : null;
    const num = numEl ? numEl.textContent.trim() : null;
    let title = head ? head.textContent.trim() : '';
    if(num) title = title.replace(num, '').trim();
    const body = c.querySelector('.chapter-body');
    const blocks = body ? wxWalkContainer(body) : [];
    return {id: c.id, num, title, blocks};
  });
  return {coverBlocks, coverEmblem, coverHero, frontCover, chapters};
}

/* ---------- docx document builder ---------- */
function wxBuildDocxDocument(data){
  const {
    Document, Paragraph, TextRun, AlignmentType, Table, TableRow, TableCell,
    WidthType, BorderStyle, ShadingType, Header, Footer, PageNumber,
    NumberFormat, PageBreak, VerticalAlign, ImageRun
  } = docx;

  const NAVY='0B2545', NAVY2='13315C', ACCENT='B5842A', BLUE_LIGHT='EAF1FB',
        SECTION_BG='F3F1E7', STATUTE_BG='FDF7D6', BORDER_C='D8D2C2',
        TEXT_C='1C2530', MUTED='5B6B82', WHITE='FFFFFF';
  const FONT_SERIF='Times New Roman', FONT_SANS='Times New Roman';
  const PAGE_W=11906, PAGE_H=16838, MARGIN=850, CONTENT_W = PAGE_W - 2*MARGIN;

  function cleanHeadingText(t){ return t.replace(/^(\d+(?:\.\d+)*)\s+\1\s+/, '$1 '); }
  function thinBorder(color, size){ return { style: BorderStyle.SINGLE, size: size||4, color: color||BORDER_C }; }
  function noBorder(){ return { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }; }

  function chapterHeadBlock(num, title){
    return new Table({
      width: {size: CONTENT_W, type: WidthType.DXA}, columnWidths: [CONTENT_W],
      borders: {top:noBorder(),bottom:noBorder(),left:noBorder(),right:noBorder(),insideHorizontal:noBorder(),insideVertical:noBorder()},
      rows: [ new TableRow({ children: [ new TableCell({
        width: {size: CONTENT_W, type: WidthType.DXA},
        shading: {fill: NAVY2, type: ShadingType.CLEAR, color:'auto'},
        margins: {top:160,bottom:160,left:220,right:220}, verticalAlign: VerticalAlign.CENTER,
        children: [ new Paragraph({ spacing:{after:0}, children: [
          ...(num ? [new TextRun({text:`${num}  `, bold:true, color:ACCENT, size:30, font:FONT_SERIF})] : []),
          new TextRun({text:title, bold:true, color:WHITE, size:26, font:FONT_SERIF})
        ]})]
      })]})]
    });
  }
  function subheadPara(text){
    text = cleanHeadingText(text);
    return new Paragraph({
      spacing:{before:260, after:120}, shading:{fill:BLUE_LIGHT,type:ShadingType.CLEAR,color:'auto'},
      border:{left:{style:BorderStyle.SINGLE,size:24,color:ACCENT,space:8}}, indent:{left:20},
      children:[new TextRun({text, bold:true, color:NAVY2, size:23, font:FONT_SANS})]
    });
  }
  function subsubheadPara(text){
    text = cleanHeadingText(text);
    return new Paragraph({
      spacing:{before:200, after:90}, border:{bottom:{style:BorderStyle.SINGLE,size:4,color:BORDER_C,space:3}},
      children:[new TextRun({text, bold:true, color:NAVY, size:20, font:FONT_SANS})]
    });
  }
  function partsToParagraphs(parts, opts){
    opts = opts || {};
    const segments = []; let runs = [];
    function flush(){ if(runs.length){ segments.push({kind:'text', runs}); runs=[]; } }
    parts.forEach(p=>{
      if(p.type==='text') runs.push(new TextRun({text:p.text, bold:!!p.bold, size:20, color:TEXT_C, font:FONT_SANS}));
      else if(p.type==='break') flush();
      else if(p.type==='list'){ flush(); segments.push({kind:'list', items:p.items}); }
    });
    flush();
    const paras = []; const boxed = !!opts.box;
    segments.forEach((seg, segIdx)=>{
      const isFirst = segIdx===0, isLast = segIdx===segments.length-1;
      if(seg.kind==='text'){
        paras.push(new Paragraph({
          spacing:{ before: boxed && isFirst ? 120:0, after: boxed && isLast ? 160:90 },
          shading: opts.shading, border: opts.border, indent: opts.indent, children: seg.runs
        }));
      } else if(seg.kind==='list'){
        seg.items.forEach((it,i)=>{
          const lastItemOfSeg = i===seg.items.length-1;
          paras.push(new Paragraph({
            numbering:{reference:'static-bullets', level:0},
            spacing:{ before: boxed && isFirst && i===0 ? 120:0, after: boxed && isLast && lastItemOfSeg ? 160:40 },
            shading: opts.shading, indent: opts.indent ? {left:(opts.indent.left||0)+300} : {left:300},
            children:[new TextRun({text:it, size:20, color:TEXT_C, font:FONT_SANS})]
          }));
        });
      }
    });
    return paras;
  }
  function statictextBlock(block){
    if(block.variant==='statute' || block.variant==='section'){
      const fill = block.variant==='statute' ? STATUTE_BG : SECTION_BG;
      return partsToParagraphs(block.parts, {
        box:true, shading:{fill,type:ShadingType.CLEAR,color:'auto'},
        border:{left:{style:BorderStyle.SINGLE,size:24,color:ACCENT,space:8}}, indent:{left:40}
      });
    }
    return partsToParagraphs(block.parts, {});
  }
  function quoteboxBlock(block){
    return partsToParagraphs(block.parts, {
      box:true, shading:{fill:'F7F9FC',type:ShadingType.CLEAR,color:'auto'},
      border:{left:{style:BorderStyle.SINGLE,size:20,color:NAVY2,space:8}}, indent:{left:40}
    });
  }
  function notePara(text){
    return new Paragraph({spacing:{after:120}, children:[new TextRun({text, italics:true, size:17, color:MUTED, font:FONT_SANS})]});
  }
  function annexrefPara(text){
    return new Paragraph({spacing:{after:140}, children:[new TextRun({text, bold:true, size:19, color:NAVY2, font:FONT_SANS})]});
  }
  /* Government-report style answer line: bold label, colon, value inline (or on its own
     line for long answers), with a single hairline rule underneath — no boxes, no tables. */
  function ruleBorder(){
    return { bottom:{style:BorderStyle.SINGLE, size:4, color:BORDER_C, space:2} };
  }
  function answerLine(label, value, opts){
    opts = opts || {};
    const text = value ? String(value) : '';
    const longForm = opts.longForm || (text && text.length > 70);
    const labelRun = new TextRun({text: label + (label ? ' : ' : ''), bold:true, size:19, color:NAVY2, font:FONT_SANS});
    if(!longForm){
      return new Paragraph({
        spacing:{before:60, after:120},
        border: ruleBorder(),
        children: text ? [labelRun, new TextRun({text, size:19, color:TEXT_C, font:FONT_SANS})]
                       : [labelRun]
      });
    }
    const out = [];
    out.push(new Paragraph({spacing:{before:60, after:40}, children:[labelRun]}));
    out.push(new Paragraph({
      spacing:{after:120}, border: ruleBorder(),
      children: text ? [new TextRun({text, size:19, color:TEXT_C, font:FONT_SANS})] : []
    }));
    return out;
  }
  function fieldBlock(f){
    const out = [];
    if(f.inputType==='checkbox' || f.inputType==='radio'){
      out.push(new Paragraph({spacing:{after:100}, children:[new TextRun({text:`${f.checked?'\u2611':'\u2610'}  ${f.label}`, size:20, color:TEXT_C, font:FONT_SANS})]}));
      return out;
    }
    if(f.inputType==='file'){
      const lines = answerLine(f.label, '');
      out.push(...(Array.isArray(lines) ? lines : [lines]));
      return out;
    }
    if(f.inputType==='select' && f.options && f.options.length){
      const lines = answerLine(f.label, f.value);
      out.push(...(Array.isArray(lines) ? lines : [lines]));
      return out;
    }
    const lines = answerLine(f.label, f.value);
    out.push(...(Array.isArray(lines) ? lines : [lines]));
    return out;
  }
  /* Professional two-column "Field : Value" table used for every group of consecutive
     fields within a section — replaces the old underline-only answer lines with a
     properly bordered, aligned, government-report-style data table. */
  function fieldValueText(f){
    if(f.inputType==='checkbox' || f.inputType==='radio') return f.checked ? 'Yes' : 'No';
    if(f.inputType==='file') return '(Document attached — refer Annexure)';
    const v = (f.value||'').toString().trim();
    if(v) return v;
    if(f.emptyText) return f.emptyText;
    const labelText = (f.label||'').replace(/\s*auto\s*$/i,'').trim();
    return labelText ? `${labelText} — Not available` : 'Not available';
  }
  function fieldsTableBlock(fields){
    const labelW = Math.max(2200, Math.floor(CONTENT_W*0.30));
    const valueW = CONTENT_W - labelW;
    const rows = fields.map((f,i)=>{
      const zebra = i % 2 === 1;
      return new TableRow({
        cantSplit:true,
        children:[
          new TableCell({
            width:{size:labelW, type:WidthType.DXA},
            shading:{fill:BLUE_LIGHT, type:ShadingType.CLEAR, color:'auto'},
            margins:{top:110,bottom:110,left:180,right:150},
            verticalAlign: VerticalAlign.CENTER,
            children:[new Paragraph({alignment:AlignmentType.LEFT, spacing:{after:0}, children:[
              new TextRun({text:f.label||'', bold:true, size:20, color:NAVY2, font:FONT_SANS})
            ]})]
          }),
          new TableCell({
            width:{size:valueW, type:WidthType.DXA},
            shading: zebra ? {fill:'FAFBFD', type:ShadingType.CLEAR, color:'auto'} : undefined,
            margins:{top:110,bottom:110,left:180,right:150},
            verticalAlign: VerticalAlign.CENTER,
            children:[new Paragraph({alignment:AlignmentType.LEFT, spacing:{after:0}, children:[
              new TextRun({text:fieldValueText(f), size:21, color:TEXT_C, font:FONT_SANS})
            ]})]
          })
        ]
      });
    });
    return new Table({
      width:{size:CONTENT_W, type:WidthType.DXA}, columnWidths:[labelW,valueW],
      borders:{top:thinBorder(NAVY2,6),bottom:thinBorder(NAVY2,6),left:thinBorder(NAVY2,6),right:thinBorder(NAVY2,6),insideHorizontal:thinBorder(BORDER_C,4),insideVertical:thinBorder(BORDER_C,4)},
      rows
    });
  }
  /* ---------- Cover Page specific renderers (title-page look: centered label-over-box) ---------- */
  function coverFieldBox(f, widthDXA){
    const w = widthDXA || Math.floor(CONTENT_W*0.55);
    return [
      new Paragraph({alignment:AlignmentType.CENTER, spacing:{before:140, after:20}, children:[
        new TextRun({text:f.label||'', size:17, color:MUTED, font:FONT_SANS})
      ]}),
      new Paragraph({alignment:AlignmentType.CENTER, spacing:{after:0}, children:[
        new TextRun({text:fieldValueText(f), size:20, bold:true, color:TEXT_C, font:FONT_SANS})
      ]})
    ];
  }
  function renderCoverBlocks(blocks){
    const out = [];
    blocks.forEach(b=>{
      if(b.type==='coverfield'){
        out.push(...coverFieldBox(b, Math.floor(CONTENT_W*0.55)));
      } else if(b.type==='fieldrow'){
        const n = b.fields.length;
        const cellW = Math.floor(CONTENT_W/Math.max(n,1));
        out.push(new Table({
          width:{size:CONTENT_W, type:WidthType.DXA}, columnWidths:b.fields.map(()=>cellW),
          borders:{top:noBorder(),bottom:noBorder(),left:noBorder(),right:noBorder(),insideHorizontal:noBorder(),insideVertical:noBorder()},
          rows:[new TableRow({children:b.fields.map(f=>new TableCell({
            width:{size:cellW, type:WidthType.DXA},
            children: coverFieldBox(f, Math.floor(cellW*0.85))
          }))})]
        }));
        out.push(new Paragraph({spacing:{after:0}, children:[]}));
      } else if(b.type==='damtitle'){
        out.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{before:200, after:40}, children:[
          new TextRun({text:b.text||'', bold:true, size:30, color:NAVY, font:FONT_SERIF})
        ]}));
      } else if(b.type==='covertagline'){
        out.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{before:60, after:200}, children:[
          new TextRun({text:b.text||'', bold:true, size:19, color:NAVY2, font:FONT_SANS})
        ]}));
      } else if(b.type==='field'){
        out.push(...coverFieldBox(b, Math.floor(CONTENT_W*0.55)));
      }
      // any other stray block types on the cover fall through silently — cover is
      // meant to stay a clean title page, not a data table.
    });
    return out;
  }
  function photogridBlock(boxes){
    const out = [];
    for(let i=0;i<boxes.length;i+=2){
      const cellW = Math.floor(CONTENT_W/2);
      const pair = [boxes[i], boxes[i+1]].filter(Boolean);
      const cells = pair.map(b=>{
        const content = [ new Paragraph({spacing:{after:60}, children:[new TextRun({text:b.label, bold:true, size:17, color:NAVY2, font:FONT_SANS})]}) ];
        if(b.image){
          content.push(new Paragraph({spacing:{after:60}, children:[ new ImageRun({data:b.image.data, type:b.image.type, transformation:{width:b.image.width, height:b.image.height}}) ]}));
        } else {
          content.push(new Paragraph({spacing:{after:0}, children:[new TextRun({text:'[ space for photograph ]', italics:true, size:15, color:MUTED, font:FONT_SANS})]}));
          content.push(new Paragraph({spacing:{after:400}, children:[]}));
        }
        return new TableCell({
          width:{size:cellW, type:WidthType.DXA}, margins:{top:100,bottom:100,left:100,right:100},
          borders:{top:thinBorder(),bottom:thinBorder(),left:thinBorder(),right:thinBorder()}, children: content
        });
      });
      out.push(new Table({
        width:{size:CONTENT_W, type:WidthType.DXA}, columnWidths: pair.length===2 ? [cellW,cellW] : [CONTENT_W],
        borders:{top:noBorder(),bottom:noBorder(),left:noBorder(),right:noBorder(),insideHorizontal:noBorder(),insideVertical:noBorder()},
        rows:[new TableRow({children:cells})]
      }));
      out.push(new Paragraph({spacing:{after:120}, children:[]}));
    }
    return out;
  }
  function checklistBlock(items){
    const nCols = 2, colW = [CONTENT_W-1200, 1200];
    const headerRow = new TableRow({tableHeader:true, children:[
      new TableCell({width:{size:colW[0],type:WidthType.DXA}, shading:{fill:BLUE_LIGHT,type:ShadingType.CLEAR,color:'auto'}, margins:{top:80,bottom:80,left:100,right:100}, children:[new Paragraph({children:[new TextRun({text:'Component Inspected', bold:true, size:17, color:NAVY2, font:FONT_SANS})]})]}),
      new TableCell({width:{size:colW[1],type:WidthType.DXA}, shading:{fill:BLUE_LIGHT,type:ShadingType.CLEAR,color:'auto'}, margins:{top:80,bottom:80,left:100,right:100}, children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:'Tick', bold:true, size:17, color:NAVY2, font:FONT_SANS})]})]})
    ]});
    const rows = [headerRow];
    items.forEach(it=>{
      rows.push(new TableRow({children:[
        new TableCell({width:{size:colW[0],type:WidthType.DXA}, margins:{top:70,bottom:70,left:100,right:100}, children:[new Paragraph({children:[new TextRun({text:it.label, size:17, color:TEXT_C, font:FONT_SANS})]})]}),
        new TableCell({width:{size:colW[1],type:WidthType.DXA}, margins:{top:70,bottom:70,left:100,right:100}, children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text: it.checked ? '\u2611' : '\u2610', size:18, color:TEXT_C, font:FONT_SANS})]})]})
      ]}));
    });
    return new Table({
      width:{size:CONTENT_W, type:WidthType.DXA}, columnWidths: colW,
      borders:{top:thinBorder(),bottom:thinBorder(),left:thinBorder(),right:thinBorder(),insideHorizontal:thinBorder(),insideVertical:thinBorder()},
      rows
    });
  }
  function tableBlock(t){
    const nCols = t.headers.length; const colW = Math.floor(CONTENT_W/nCols);
    const colWidths = new Array(nCols).fill(colW);
    const headerRow = new TableRow({tableHeader:true, children:t.headers.map((h,i)=> new TableCell({
      width:{size:colWidths[i], type:WidthType.DXA}, shading:{fill:BLUE_LIGHT,type:ShadingType.CLEAR,color:'auto'},
      margins:{top:80,bottom:80,left:100,right:100}, children:[new Paragraph({children:[new TextRun({text:h, bold:true, size:17, color:NAVY2, font:FONT_SANS})]})]
    }))});
    const rows = [headerRow];
    t.rows.forEach(r=>{
      if(r.length===1 && r[0].text !== undefined){
        rows.push(new TableRow({children:[new TableCell({
          columnSpan:nCols, width:{size:CONTENT_W, type:WidthType.DXA}, shading:{fill:BLUE_LIGHT,type:ShadingType.CLEAR,color:'auto'},
          margins:{top:60,bottom:60,left:100,right:100}, children:[new Paragraph({children:[new TextRun({text:r[0].text, bold:true, size:17, color:NAVY2, font:FONT_SANS})]})]
        })]}));
        return;
      }
      rows.push(new TableRow({children:r.map((cell,i)=>{
        let text = '', align = AlignmentType.LEFT;
        if(cell.text !== undefined) text = cell.text;
        else if(cell.blank){
          if(cell.kind==='checkbox'){ text = cell.checked ? '\u2611' : '\u2610'; align = AlignmentType.CENTER; }
          else text = cell.value || '';
        }
        return new TableCell({
          width:{size: colWidths[i]||colW, type:WidthType.DXA}, margins:{top:80,bottom:80,left:100,right:100},
          children:[new Paragraph({alignment:align, children:[new TextRun({text, size:17, color:TEXT_C, font:FONT_SANS})]})]
        });
      })}));
    });
    return new Table({
      width:{size:CONTENT_W, type:WidthType.DXA}, columnWidths: colWidths,
      borders:{top:thinBorder(),bottom:thinBorder(),left:thinBorder(),right:thinBorder(),insideHorizontal:thinBorder(),insideVertical:thinBorder()},
      rows
    });
  }
  function annexBlockRenderer(b){
    const out = [];
    out.push(new Paragraph({spacing:{before:160,after:80}, children:[
  new TextRun({text:`Annexure ${b.roman||''}`, bold:true, size:19, color:ACCENT, font:FONT_SANS}),
      new TextRun({text: b.title ? `  —  ${b.title}` : '', bold:true, size:19, color:NAVY, font:FONT_SANS})
    ]}));
    if(!b.files || !b.files.length){
      out.push(new Paragraph({spacing:{after:200}, children:[
        new TextRun({text:'(No document attached)', italics:true, size:17, color:MUTED, font:FONT_SANS})
      ]}));
      return out;
    }
    b.files.forEach(f=>{
      if(f.type==='image' && f.image){
        // ImageRun here takes plain pixel-like values (same convention as
        // photogridBlock/coverHero elsewhere in this file) — cap width to
        // the page's content width, converted from DXA to the same units.
        const maxW = Math.floor(CONTENT_W/15);
        let w = f.image.width || 480, h = f.image.height || 360;
        if(w > maxW){ h = Math.round(h * (maxW/w)); w = maxW; }
        out.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{after:160}, children:[
          new ImageRun({data:f.image.data, type:f.image.type, transformation:{width:w, height:h}})
        ]}));
      } else if(f.type==='text'){
        out.push(new Paragraph({spacing:{after:160}, children:[
          new TextRun({text:'\u{1F4C4} ' + f.text + ' (attached — file type cannot be previewed inline; refer to the original file)', italics:true, size:17, color:TEXT_C, font:FONT_SANS})
        ]}));
      }
    });
    return out;
  }
  function renderBlocks(blocks){
    const out = [];
    let fieldBuf = [];
    function flushFields(){
      if(fieldBuf.length){
        out.push(fieldsTableBlock(fieldBuf));
        out.push(new Paragraph({spacing:{after:180}, children:[]}));
        fieldBuf = [];
      }
    }
    blocks.forEach(b=>{
      if(b.type==='field'){ fieldBuf.push(b); return; }
      flushFields();
      if(b.type==='subhead') out.push(subheadPara(b.text));
      else if(b.type==='subsubhead') out.push(subsubheadPara(b.text));
      else if(b.type==='statictext') out.push(...statictextBlock(b));
      else if(b.type==='quotebox') out.push(...quoteboxBlock(b));
      else if(b.type==='note') out.push(notePara(b.text));
      else if(b.type==='annexref') out.push(annexrefPara(b.text));
      else if(b.type==='table'){ out.push(tableBlock(b)); out.push(new Paragraph({spacing:{after:160}, children:[]})); }
      else if(b.type==='checklist'){ out.push(checklistBlock(b.items)); out.push(new Paragraph({spacing:{after:160}, children:[]})); }
      else if(b.type==='photogrid') out.push(...photogridBlock(b.boxes));
      else if(b.type==='annexblock') out.push(...annexBlockRenderer(b));
    });
    flushFields();
    return out;
  }

  const children = [];
  if(data.frontCover){
    const fw = Math.min(560, data.frontCover.width||560);
    const fh = Math.round(fw * ((data.frontCover.height||fw)/(data.frontCover.width||fw)));
    children.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{before:1200,after:0}, children:[
      new ImageRun({data:data.frontCover.data, type:data.frontCover.type, transformation:{width:fw, height:fh}})
    ]}));
    children.push(new Paragraph({children:[new PageBreak()]}));
  }
  if(data.coverEmblem){
    children.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{after:80}, children:[
      new ImageRun({data:data.coverEmblem.data, type:data.coverEmblem.type, transformation:{width:70, height:70}})
    ]}));
  }
  children.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{after:40}, children:[new TextRun({text:'GOVERNMENT OF INDIA — MINISTRY OF JAL SHAKTI', size:18, color:NAVY2, font:FONT_SANS})]}));
  children.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{after:40}, children:[new TextRun({text:'Department of Water Resources, River Development and Ganga Rejuvenation', size:18, color:NAVY2, font:FONT_SANS})]}));
  children.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{after:220}, children:[new TextRun({text:'National Dam Safety Authority', size:18, color:NAVY2, font:FONT_SANS})]}));
  children.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{after:40}, children:[new TextRun({text:'Comprehensive Dam Safety Evaluation (CDSE)', bold:true, size:40, color:'0F5C34', font:FONT_SERIF})]}));
  // children.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{after:300}, children:[new TextRun({text:'Report for a Specified Dam', size:21, color:NAVY2, font:FONT_SANS})]}));
  const isOfficeAddrBlock = b => {
    if((b.type==='coverfield'||b.type==='field') && /office address/i.test(b.label||'')) return true;
    if(b.type==='fieldrow' && (b.fields||[]).some(f=>/office address/i.test(f.label||''))) return true;
    return false;
  };
  const officeAddrIdx = data.coverBlocks.findIndex(isOfficeAddrBlock);
  const coverBlocksBeforeImg = officeAddrIdx >= 0 ? data.coverBlocks.slice(0, officeAddrIdx) : data.coverBlocks;
  const coverBlocksAfterImg = officeAddrIdx >= 0 ? data.coverBlocks.slice(officeAddrIdx) : [];
  children.push(...renderCoverBlocks(coverBlocksBeforeImg));
  if(data.coverHero){
    const hw = Math.min(220, data.coverHero.width||220);
    const hh = Math.round(hw * ((data.coverHero.height||hw)/(data.coverHero.width||hw)));
    children.push(new Paragraph({alignment:AlignmentType.CENTER, spacing:{before:120,after:120}, children:[
      new ImageRun({data:data.coverHero.data, type:data.coverHero.type, transformation:{width:hw, height:hh}})
    ]}));
  }
  children.push(...renderCoverBlocks(coverBlocksAfterImg));
  children.push(new Paragraph({children:[new PageBreak()]}));

  data.chapters.forEach((ch, idx)=>{
    children.push(chapterHeadBlock(ch.num, ch.title));
    // children.push(new Paragraph({spacing:{after:120}, children:[]}));
    children.push(...renderBlocks(ch.blocks));
    if(idx < data.chapters.length-1) children.push(new Paragraph({children:[new PageBreak()]}));
  });

  return new Document({
    numbering:{config:[{reference:'static-bullets', levels:[{level:0, format:NumberFormat.BULLET, text:'\u2022', alignment:AlignmentType.LEFT, style:{paragraph:{indent:{left:460,hanging:260}}}}]}]},
    styles:{default:{document:{run:{font:FONT_SANS, size:20, color:TEXT_C}}}},
    sections:[{
      properties:{page:{size:{width:PAGE_W,height:PAGE_H}, margin:{top:MARGIN+700, bottom:MARGIN+500, left:MARGIN, right:MARGIN, header:400, footer:300}}},
      headers:{default: new Header({children:[ new Table({
        width:{size:CONTENT_W, type:WidthType.DXA}, columnWidths:[CONTENT_W],
        borders:{top:noBorder(),bottom:noBorder(),left:noBorder(),right:noBorder(),insideHorizontal:noBorder(),insideVertical:noBorder()},
        rows:[new TableRow({children:[new TableCell({
          width:{size:CONTENT_W, type:WidthType.DXA}, shading:{fill:NAVY,type:ShadingType.CLEAR,color:'auto'}, margins:{top:120,bottom:120,left:200,right:200},
          children:[
            new Paragraph({spacing:{after:20}, children:[new TextRun({text:'Comprehensive Dam Safety Evaluation (CDSE) Report', bold:true, color:WHITE, size:20, font:FONT_SANS})]}),
          new Paragraph({children:[new TextRun({text:'Government of India · National Dam Safety Authority · Research Wing, Western Region, Pune', color:'B7C4DA', size:14, font:FONT_SANS})]})
          ]
        })]})]
      })]})},
      footers:{default: new Footer({children:[ new Paragraph({
        alignment:AlignmentType.CENTER, border:{top:{style:BorderStyle.SINGLE,size:4,color:BORDER_C,space:4}},
        children:[
          new TextRun({text:'CDSE Report', size:14, color:MUTED, font:FONT_SANS}),
          new TextRun({text:'   |   Page ', size:14, color:MUTED, font:FONT_SANS}),
          new TextRun({children:[PageNumber.CURRENT], size:14, color:MUTED, font:FONT_SANS}),
          new TextRun({text:' of ', size:14, color:MUTED, font:FONT_SANS}),
          new TextRun({children:[PageNumber.TOTAL_PAGES], size:14, color:MUTED, font:FONT_SANS})
        ]
      })]})},
      children
    }]
  });
}

async function downloadWord(){
  const btn = document.querySelector('.controls button[onclick="downloadWord()"]');
  const originalLabel = btn ? btn.innerHTML : null;
  if(btn){ btn.disabled = true; btn.innerHTML = '⏳ Preparing Word file…'; }
  try{
    if(typeof docx === 'undefined'){
      alert('Word export library abhi load nahi zali — internet connection check karke thoda wait karun try pun karo.');
      return;
    }
    const data = await wxExtractReportData();
    const doc = wxBuildDocxDocument(data);
    const blob = await docx.Packer.toBlob(doc);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const damEl = document.getElementById('coverDamInput');
    const safeName = ((damEl && damEl.value) || 'CDSE_Report').replace(/[^a-z0-9]+/gi,'_');
    a.download = safeName + '_CDSE_Report.docx';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
  } catch(err){
    console.error(err);
    alert('Word file banate samay error aayi: ' + (err && err.message ? err.message : err));
  } finally {
    if(btn){ btn.disabled = false; btn.innerHTML = originalLabel; }
  }
}

function nearestChapterTitle(el){
  const chap = el.closest('.chapter');
  if(!chap) return '';
  const head = chap.querySelector('.chapter-head');
  return head ? head.textContent.trim() : '';
}

function nearestSectionTitle(el){
  let node = el;
  while(node){
    let sib = node.previousElementSibling;
    while(sib){
      if(sib.classList && (sib.classList.contains('subhead') || sib.classList.contains('subsubhead'))){
        return sib.textContent.replace(/\s+/g,' ').trim();
      }
      sib = sib.previousElementSibling;
    }
    node = node.parentElement;
    if(node && node.classList && node.classList.contains('chapter-body')) break;
  }
  return '';
}

function labelFor(el){
  const fieldWrap = el.closest('.field');
  if(fieldWrap){
    const lbl = fieldWrap.querySelector('label');
    if(lbl) return lbl.textContent.replace(/\s+/g,' ').trim();
  }
  const photobox = el.closest('.photobox');
  if(photobox){
    const b = photobox.querySelector('b');
    if(b) return b.textContent.replace(/\s+/g,' ').trim();
  }
  const td = el.closest('td');
  if(td){
    const tr = td.closest('tr');
    const table = td.closest('table');
    const idx = Array.prototype.indexOf.call(tr.children, td);
    let colName = '';
    if(table){
      const headRow = table.querySelector('thead tr') || table.querySelector('tr');
      if(headRow && headRow.children[idx]) colName = headRow.children[idx].textContent.replace(/\s+/g,' ').trim();
    }
    const rowLabel = tr.children[0] ? tr.children[0].textContent.replace(/\s+/g,' ').trim() : '';
    return (rowLabel ? rowLabel+' - ' : '') + (colName || 'Value');
  }
  return el.getAttribute('placeholder') || el.id || 'Field';
}
// Chapter label for a field — falls back to "Cover Page" for anything on the
// cover (which sits outside .chapter) instead of leaving it blank.
function chapterLabelFor(el){
  const chap = nearestChapterTitle(el);
  if(chap) return chap;
  if(el.closest('#cover')) return 'Cover Page';
  return 'General';
}
// The top-of-form configuration controls (dam type, gated/ungated, saddle dam,
// auxiliary spillway, fuse plug) don't carry data-field, so they were being
// dropped entirely from the Excel/labeled export — add them explicitly.
function configRows(){
  const damTypeSel = document.getElementById('ctrlDamType');
  const damTypeLabel = damTypeSel ? damTypeSel.options[damTypeSel.selectedIndex].textContent.trim() : '';
  const ungated = document.getElementById('ctrlUngated');
  const gated = document.getElementById('ctrlGated');
  const saddle = document.getElementById('ctrlSaddle');
  const aux = document.getElementById('ctrlAux');
  const fuse = document.getElementById('ctrlFuse');
  const damNameEl = document.getElementById('coverDamInput');
  const damName = damNameEl ? damNameEl.value : '';
  return [
    {chapter:'Cover', section:'', field:'Dam Name', value: damName},
    {chapter:'Configuration', section:'', field:'Main Dam Type', value: damTypeLabel},
    {chapter:'Configuration', section:'', field:'Spillway', value: gated && gated.checked ? 'Gated' : 'Ungated'},
    {chapter:'Configuration', section:'', field:'Saddle Dam Present', value: saddle && saddle.checked ? 'Yes' : 'No'},
    {chapter:'Configuration', section:'', field:'Auxiliary Spillway', value: aux && aux.checked ? 'Yes' : 'No'},
    {chapter:'Configuration', section:'', field:'Fuse Plug', value: fuse && fuse.checked ? 'Yes' : 'No'}
  ];
}

// Builds a human-readable {label: value} object suitable for Excel/Sheet columns
function buildLabeledDataObject(){
  const out = {};
  const seen = {};
  configRows().forEach(r=>{ out[[r.chapter,r.field].filter(Boolean).join(' | ')] = r.value; });
  document.querySelectorAll('[data-field]').forEach(el=>{
    let val;
    if(el.type === 'file'){
      val = (el.files && el.files[0]) ? 'Uploaded: ' + el.files[0].name : 'Not uploaded';
    } else if(el.type === 'checkbox'){ val = el.checked ? 'Yes' : 'No'; }
    else if(el.type === 'radio'){ if(!el.checked) return; const lbl = el.closest('label'); val = lbl ? lbl.textContent.replace(/\s+/g,' ').trim() : el.value; }
    else { val = el.value; }
    if(val === '' || val == null) return;
    const chap = chapterLabelFor(el);
    const sect = nearestSectionTitle(el);
    let key = [chap, sect, labelFor(el)].filter(Boolean).join(' | ');
    if(!key) key = 'Field';
    if(seen[key] != null){ seen[key]++; key = key + ' #' + seen[key]; } else { seen[key] = 1; }
    out[key] = val;
  });
  return out;
}

// Same traversal as buildLabeledDataObject, but kept as structured rows
// (Chapter, Section, Field, Value) instead of a flattened key string — this is
// what actually gets written into the Excel/CSV columns.
function buildLabeledRows(){
  const rows = [...configRows()];
  const seen = {};
  document.querySelectorAll('[data-field]').forEach(el=>{
    let val;
    if(el.type === 'file'){
      val = (el.files && el.files[0]) ? 'Uploaded: ' + el.files[0].name : 'Not uploaded';
    } else if(el.type === 'checkbox'){ val = el.checked ? 'Yes' : 'No'; }
    else if(el.type === 'radio'){ if(!el.checked) return; const lbl = el.closest('label'); val = lbl ? lbl.textContent.replace(/\s+/g,' ').trim() : el.value; }
    else { val = el.value; }
    if(val === '' || val == null) return;
    const chap = chapterLabelFor(el);
    const sect = nearestSectionTitle(el);
    let field = labelFor(el);
    const dupKey = [chap, sect, field].join(' | ');
    if(seen[dupKey] != null){ seen[dupKey]++; field = field + ' #' + seen[dupKey]; } else { seen[dupKey] = 1; }
    rows.push({chapter: chap, section: sect, field, value: String(val)});
  });
  return rows;
}
function csvCell(v){
  v = (v==null ? '' : String(v)).replace(/\r?\n/g,' ');
  if(/[",]/.test(v)) v = '"' + v.replace(/"/g,'""') + '"';
  return v;
}
function buildCsvString(){
  const rows = buildLabeledRows();
  const lines = ['Chapter,Section,Field,Value'];
  rows.forEach(r=> lines.push([csvCell(r.chapter), csvCell(r.section), csvCell(r.field), csvCell(r.value)].join(',')));
  return '\uFEFF' + lines.join('\r\n'); // BOM so Excel opens UTF-8 (Hindi/Devanagari safe) correctly
}
function excelFileName(){
  const damEl = document.getElementById('coverDamInput');
  const safeName = ((damEl && damEl.value) || 'CDSE_Report').replace(/[^a-z0-9]+/gi,'_');
  return safeName + '_CDSE_Data.csv';
}
function exportExcel(){
  const csv = buildCsvString();
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = excelFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

/* ---------- Submit to Google Drive (via Google Apps Script Web App) ---------- */
// 1. Deploy the Apps Script (see setup guide provided separately) as a Web App.
// 2. Paste the deployment URL below, replacing the placeholder.
const DRIVE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzPxCe-HbnYB0psqdDEGrISvitzg4HirWx7LdSJ6Szey0N1q5b2lYAYz0f0vTxXAqvCNg/exec";

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = ()=> resolve(r.result.split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function collectAnnexFiles(){
  const inputs = Array.from(document.querySelectorAll('input[type=file][data-field]')).filter(i=>i.files && i.files[0]);
  const out = [];
  for(const input of inputs){
    const file = input.files[0];
    const base64 = await fileToBase64(file);
    let label = file.name;
    const block = input.closest('.annex-block');
    const nameField = block ? block.querySelector('.annex-name-input') : null;
    if(nameField && nameField.value) label = nameField.value + ' - ' + file.name;
    out.push({fieldId: input.dataset.field, fileName: file.name, label, mimeType: file.type || 'application/octet-stream', base64});
  }
  return out;
}

async function submitToDrive(overwrite){
  const status = document.getElementById('driveSubmitStatus');
  if(!DRIVE_SCRIPT_URL || DRIVE_SCRIPT_URL.indexOf('PASTE_YOUR')===0){
    status.textContent = 'Google Drive link abhi set nahi hai — pehle setup karo.';
    status.style.color = '#b23b2e';
    return;
  }
  const btn = document.getElementById('driveSubmitBtn');
  const damEl = document.getElementById('coverDamInput');
  const damNameEl = document.getElementById('coverDamInput');
  const damName = (damNameEl && damNameEl.value && damNameEl.value.trim()) || 'CDSE_Report';
  btn.disabled = true;
  status.style.color = 'var(--navy2)';
  status.textContent = 'Saving to Google Drive…';
  try{
    const data = buildDataObject();
    const labeledData = buildLabeledDataObject();
    const files = await collectAnnexFiles();
    // Also drop an Excel-ready CSV into the same files[] array — since the
    // Apps Script already writes every entry in files[] to Drive, this rides
    // along automatically without needing any change on the Drive/script side.
    const csvBase64 = btoa(unescape(encodeURIComponent(buildCsvString())));
    files.push({fieldId:'excel_export', fileName: excelFileName(), label:'CDSE Data (Excel/CSV)', mimeType:'text/csv', base64: csvBase64});
    const reportId = damName.replace(/[^a-z0-9]+/gi,'_') + '_' + new Date().toISOString().slice(0,10);
    const picEl = document.querySelector('[data-autofill="PIC"]');
    const pic = (picEl && picEl.value || '').trim();
    const resp = await fetch(DRIVE_SCRIPT_URL, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action:'save', pic, overwrite: !!overwrite, damName, reportId, timestamp:new Date().toISOString(), data, labeledData, files})
    });
    const result = await resp.json();
    if(result && result.status === 'exists'){
      btn.disabled = false;
      status.textContent = '';
      const confirmReplace = confirm(`A report for PIC "${pic}" kalready exists in Google Drive.\nDo you want to replace it?.`);
      if(confirmReplace) return submitToDrive(true);
      return;
    }
    status.style.color = '#2f7a3f';
    status.textContent = '✅ Saved to Google Drive';
    refreshDriveReportList();
  } catch(err){
    console.error(err);
    status.style.color = '#b23b2e';
    status.textContent = '⚠ Save fail hua — internet check karo, dubara try karo';
  } finally {
    btn.disabled = false;
    setTimeout(()=>{ status.textContent=''; }, 8000);
  }
}
/* Shared by importJSON (local file) and loadFromDriveByPic (Google Drive) —
   applies a previously-saved data object back onto the live form fields. */
function applyDataObject(data){
  document.querySelectorAll('[data-field]').forEach(el=>{
    const v = data[el.dataset.field];
    if(v===undefined) return;
    if(el.type==='checkbox') el.checked = !!v;
    else if(el.type==='radio'){ if(v) el.checked = true; }
    else {
      el.value = v;
      // Auto-resize textareas after loading data
      if(el.tagName.toLowerCase()==='textarea') {
        autoResize(el);
      }
    }
  });
  if(data.__controls){
    document.getElementById('ctrlDamType').value = data.__controls.damType||'concrete';
    document.getElementById('ctrlUngated').checked = !!data.__controls.ungated;
    document.getElementById('ctrlGated').checked = !!data.__controls.gated;
    document.getElementById('ctrlSaddle').checked = !!data.__controls.saddle;
    document.getElementById('ctrlAux').checked = !!data.__controls.aux;
    document.getElementById('ctrlFuse').checked = !!data.__controls.fuse;
  }
  updateCoverTitle((document.getElementById('coverDamInput')||{}).value || '');
  onSpillwayChange();
}
function importJSON(evt){
  const file = evt.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try{
      const data = JSON.parse(e.target.result);
      applyDataObject(data);
      alert('Data loaded successfully.');
    }catch(err){ alert('Invalid file.'); }
  };
  reader.readAsText(file);
}

/* ---------- Load a previously-submitted report back from Google Drive, by PIC ---------- */
/* Populate the "Load Saved Report" dropdown with every dam that has a
   saved submission on Drive — called once on page load, and again after
   every successful Submit (so a just-saved report shows up immediately). */
async function refreshDriveReportList(){
  const sel = document.getElementById('driveLoadPicSelect');
  if(!sel) return;
  if(!DRIVE_SCRIPT_URL || DRIVE_SCRIPT_URL.indexOf('PASTE_YOUR')===0){
    sel.innerHTML = '<option value="">Google Drive not set up yet</option>';
    return;
  }
  try{
    const resp = await fetch(DRIVE_SCRIPT_URL, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action:'list'})
    });
    const result = await resp.json();
    const items = (result && result.items) || [];
    if(!items.length){
      sel.innerHTML = '<option value="">No saved reports yet</option>';
      return;
    }
    sel.innerHTML = '<option value="">-- Select a saved dam --</option>' +
      items.map(it => `<option value="${(it.pic||'').replace(/"/g,'&quot;')}">${(it.pic||'')}${it.damName ? ' — '+it.damName : ''}</option>`).join('');
  }catch(err){
    console.warn('Could not load saved-report list from Drive', err);
    sel.innerHTML = '<option value="">Could not load list — check internet</option>';
  }
}
window.addEventListener('load', refreshDriveReportList);

async function loadFromDriveByPic(){
  const picSelect = document.getElementById('driveLoadPicSelect');
  const status = document.getElementById('driveSubmitStatus');
  const pic = (picSelect && picSelect.value || '').trim();
  if(!pic){ picSelect && picSelect.focus(); return; }
  if(!DRIVE_SCRIPT_URL || DRIVE_SCRIPT_URL.indexOf('PASTE_YOUR')===0){
    status.textContent = 'Google Drive link is not set up yet — please set it up first.';
    status.style.color = '#b23b2e';
    return;
  }
  const btn = document.getElementById('driveLoadBtn');
  btn.disabled = true;
  status.style.color = 'var(--navy2)';
  status.textContent = 'Loading previous submission from Google Drive…';
  try{
    const resp = await fetch(DRIVE_SCRIPT_URL, {
      method:'POST',
      headers:{'Content-Type':'text/plain;charset=utf-8'},
      body: JSON.stringify({action:'load', pic})
    });
    const result = await resp.json();
    if(result && result.found && result.data){
      applyDataObject(result.data);
      status.style.color = '#2f7a3f';
      status.textContent = `✅ Loaded saved report for PIC ${pic} (last saved ${result.timestamp || ''})`;
    } else {
      status.style.color = '#b23b2e';
      status.textContent = `No saved report found on Drive for PIC ${pic}.`;
    }
  } catch(err){
    console.error(err);
    status.style.color = '#b23b2e';
    status.textContent = '⚠️ Load failed — Please check your internet connection and try again.';
  } finally {
    btn.disabled = false;
    setTimeout(()=>{ status.textContent=''; }, 10000);
  }
}

/* ============================= AUTO-NUMBERING (1.1, 1.2, 1.2.1 style) ============================= */
function numberContent(){
  chapters.forEach(ch=>{
    const body = document.querySelector('#ch'+ch.no+' .chapter-body');
    if(!body) return;
    let subCount = 0, subsubCount = 0;
    body.querySelectorAll('.subhead, .subsubhead').forEach(el=>{
      // Strip any previous number so this can be re-run whenever the
      // dam-type/gated/saddle toggles change which sections are visible.
      const old = el.querySelector(':scope > .numlabel');
      if(old) old.remove();
      // Skip sections currently hidden by a conditional (.cond.hidden)
      // ancestor — numbering should only count what the reader can
      // actually see, so visible sections are always contiguous (no
      // "6.1, 6.5, 6.8..." gaps from hidden dam-type-specific sections).
      if(el.closest('.cond.hidden')) return;
      if(el.classList.contains('subhead')){
        subCount++; subsubCount = 0;
        el.insertAdjacentHTML('afterbegin', `<span class="num numlabel">${ch.no}.${subCount}</span> `);
      } else {
        subsubCount++;
        el.insertAdjacentHTML('afterbegin', `<span class="num numlabel">${ch.no}.${subCount}.${subsubCount}</span> `);
      }
    });
  });
}
numberContent();

applyConditions(); // also re-runs numberContent() internally, keeping numbers gap-free

// Category III starts pre-selected in Chapter 13 — apply its default
// Hazard Classification ("Low") and box visibility on first load, same as
// if the user had clicked it themselves.
(function initDefaultSafetyCategory(){
  const preChecked = document.querySelector('input[name="safetyCategory"]:checked');
  if(preChecked) onSafetyCategoryChange(preChecked);
})();

// Textareas pre-filled with default text (via value="...") never fire the
// 'input' event that normally triggers autoResize() — so they render at a
// small fixed height and cut the text off, especially in print. Size every
// textarea to fit its actual content once, right after the report is built.
(function fitAllTextareasToContent(){
  document.querySelectorAll('textarea').forEach(autoResize);
})();
window.addEventListener('beforeprint', () => {
  document.querySelectorAll('textarea').forEach(autoResize);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Offline mode unavailable (service worker failed):', err);
    });
  });
}
/* ============================= PRELOAD LOCAL ANNEXURES FROM FOLDER (SAFE MODE) ============================= */
window.addEventListener('load', () => {
  // Page load hone ke 1.5 seconds baad chalega taaki main page crash na ho
  setTimeout(async () => {
    try {
      // 👇 Apne Annexure ke titles aur file ke naam yahan likhein 👇
      const myLocalAnnexures = [
        { 
          id: 'preload1', 
          name: 'Geotechnical Investigation Report', 
          filePath: 'document/geo_report.pdf', 
          fileName: 'geo_report.pdf' 
        },
        { 
          id: 'preload2', 
          name: 'Hydrology Data', 
          filePath: 'document/hydro_data.pdf', 
          fileName: 'hydro_data.pdf' 
        }
      ];

      const annexList = document.getElementById('annexureList');
      if (!annexList) return; // Agar annexure section nahi mila toh ruk jaye

      for (const annx of myLocalAnnexures) {
        // 1. Naya Annexure box UI mein create karein
        const div = document.createElement('div');
        div.innerHTML = annexBlockHtml(annx.id, annx.name, true);
        annexList.appendChild(div.firstElementChild);
        renumberAnnexures();

        // 2. Folder se file ko fetch karein
        const response = await fetch(annx.filePath);
        if (!response.ok) {
          console.warn('File not found in folder:', annx.filePath);
          continue; // Agar file nahi mili, toh error na de, agli file pe jaye
        }
        
        const blob = await response.blob();
        const file = new File([blob], annx.fileName, { type: blob.type || 'application/pdf' });

        // 3. File ko Annexure section mein attach karein
        const wrap = document.getElementById('annex-pages-' + annx.id);
        const pageDiv = document.createElement('div');
        pageDiv.className = 'annex-page';
        
        const fieldId = nid();
        pageDiv.innerHTML = `<div class="field"><label>Document — ${annx.fileName}</label>
            <input type="file" accept="image/*,.pdf" data-field="${fieldId}" style="display:none;"></div>
          <img alt="" class="single-img">
          <div class="pdf-pages"></div>
          <div class="filepill"></div>
          <button type="button" class="addrow-btn" style="background:#fde8e8;color:#8a2020;margin-top:8px;" onclick="this.parentElement.remove()">Remove Document</button>`;
        wrap.appendChild(pageDiv);

        // 4. Input element mein file assign karein
        const input = pageDiv.querySelector('input[type="file"]');
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;

        // 5. Preview generate karein
        if (typeof previewAnnexFile === 'function') {
          await previewAnnexFile(input);
        }
      }
    } catch (err) {
      console.warn("Preload Annexure Error:", err);
    }
  }, 1500);
});
/* ============================= FAQ MODAL SCRIPTS ============================= */
function openFaqModal() {
  const modal = document.getElementById('faqModal');
  if (modal) modal.style.display = 'flex';
}

function closeFaqModal() {
  const modal = document.getElementById('faqModal');
  if (modal) modal.style.display = 'none';
}

function toggleFaqAnswer(headerEl) {
  const ansDiv = headerEl.nextElementSibling;
  const plusSpan = headerEl.querySelector('span:last-child');
  
  if (ansDiv.style.display === 'none' || !ansDiv.style.display) {
    ansDiv.style.display = 'block';
    plusSpan.textContent = '−';
  } else {
    ansDiv.style.display = 'none';
    plusSpan.textContent = '+';
  }
}

// Close modal if user clicks outside the modal box
window.addEventListener('click', (event) => {
  const modal = document.getElementById('faqModal');
  if (event.target === modal) {
    closeFaqModal();
  }
});