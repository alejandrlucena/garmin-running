/* ── DEBUG UTILITY (pon _DB_ON=true para activar logs) ── */
var _DB_ON = false;
function _DB(tag){
  if(!_DB_ON)return;
  var args=Array.prototype.slice.call(arguments,1);
  var t=new Date().toISOString().slice(11,23);
  var p='['+t+']['+tag+']';
  if(args.length&&typeof args[0]==='string'){args[0]=p+' '+args[0];}else{Array.prototype.unshift.call(args,p);}
  console.log.apply(console,args);
}
function toggleEditorCollapse(){
  var el=document.querySelector('.app');
  if(!el)return;
  var collapsed=el.classList.toggle('sidebar-collapsed');
  localStorage.setItem('sidebarCollapsed',collapsed?'1':'');
  _updateCollapseIcons(collapsed);
}
function _updateCollapseIcons(collapsed){
  var btnC=document.getElementById('btn-toggle-collapse');
  var btnE=document.getElementById('btn-toggle-expand');
  var mobile=window.innerWidth<768;
  if(btnC){
    btnC.style.display=collapsed?'none':'flex';
    if(mobile) btnC.textContent='▲';
    else btnC.textContent='◀';
  }
  if(btnE){
    btnE.classList.toggle('expand-btn',collapsed);
    btnE.textContent=mobile?'▼':'▶';
    btnE.style.display=collapsed?'flex':'none';
  }
}
(function(){
  var collapsed=!!localStorage.getItem('sidebarCollapsed');
  if(collapsed){
    var el=document.querySelector('.app');
    if(el) el.classList.add('sidebar-collapsed');
  }
  _updateCollapseIcons(collapsed);
})();
window.addEventListener('resize',function(){
  var el=document.querySelector('.app');
  var collapsed=el&&el.classList.contains('sidebar-collapsed');
  _updateCollapseIcons(collapsed);
});
function _snapRows(actId){
  var rows=[];
  var act=document.getElementById('act-'+actId);
  if(!act)return rows;
  act.querySelectorAll(':scope tbody>tr').forEach(function(tr){
    var st=tr.style||{};
    rows.push({
      id:tr.id||'',
      cls:tr.className,
      lbl:(tr.getAttribute('data-lbl')||'').slice(0,30),
      hideKey:tr.getAttribute('data-hide-key')||'',
      hiddenByClass:tr.classList.contains('row-hidden'),
      hiddenByStyle:st.display==='none',
      hideStack:tr.getAttribute('data-hide-stack')||''
    });
  });
  return rows;
}
function _dumpFullState(label){
  if(!_DB_ON)return;
  var out={label:label,_hiddenRowKeys:Object.assign({},window._hiddenRowKeys||{})};
  document.querySelectorAll('#render-target .actividad[id^="act-"]').forEach(function(act){
    var aid=act.id;
    var rows=_snapRows(aid.replace('act-',''));
    out[aid]={rows:rows};
  });
  _DB('STATE', label, out);
}
/* ── LIMPIEZA DE localStorage AL INICIO (mantiene ajustes) ── */
(function() {
  var keep = {
    'customHRZones':1, 'hr-method':1, 'hr-lactate-value':1,
    'hr-maxhr-value':1, 'hr-fcr-max':1, 'hr-fcr-rest':1, 'hr-zones-input':1,
    'garminConnectorUrl':1, 'garminConnectorAliases':1,
    'garminConnectorUser':1, 'garminDriveUploadUrl':1
  };
  var _keepAdj = function(k){ return k && k.indexOf('garmin-adjust-') === 0; };
  var del = [];
  for (var i = 0; i < localStorage.length; i++) {
    var k = localStorage.key(i);
    if (!keep[k] && !_keepAdj(k)) del.push(k);
  }
  del.forEach(function(k) { localStorage.removeItem(k); });
})();

/* ── GLOBAL CLICK TRACKER ── */
document.addEventListener('click', function(e){
  if(!_DB_ON)return;
  var t=e.target;
  var tag=(t.tagName||'').toLowerCase();
  var txt=(t.textContent||'').trim().slice(0,30);
  var cls=t.className||'';
  var id=t.id||'';
  if(cls.indexOf('phase-pill')>=0){_DB('CLICK','phase-pill "'+txt+'" actId='+(t.getAttribute('data-phase')||''));}
  else if(id==='filter-input'){/* ignore input focus clicks */}
  else if(cls.indexOf('btn-filter-ok')>=0||id==='btn-filter-ok'){_DB('CLICK','filter-btn "'+txt+'"');}
  else if(cls.indexOf('lap-checkbox')>=0||cls.indexOf('checkbox')>=0){_DB('CLICK','checkbox row='+(t.closest('tr')?t.closest('tr').id:'?'));}
  else if(cls.indexOf('lap-handle')>=0){_DB('CLICK','drag-handle row='+(t.closest('tr')?t.closest('tr').id:'?'));}
  else if(cls.indexOf('btn-merge')>=0||txt.indexOf('Merge')>=0||txt.indexOf('fusionar')>=0||txt.indexOf('Fusionar')>=0){_DB('CLICK','merge-btn');}
  else if(cls.indexOf('edit-mode-toggle')>=0){_DB('CLICK','edit-toggle '+(cls.indexOf('active')>=0?'OFF':'ON'));}
  else if(cls.indexOf('group-arrow')>=0||cls.indexOf('collapse-toggle')>=0){_DB('CLICK','group-toggle row='+(t.closest('tr')?t.closest('tr').id:'?'));}
}, true);
/* ── AJUSTES DE DISTANCIA/RITMO POR ACTIVIDAD ── */
function _adjKey(actId){ return 'garmin-adjust-' + actId; }
function _loadAdj(actId){
  try{ var v = localStorage.getItem(_adjKey(actId)); return v ? JSON.parse(v) : null; } catch(e){ return null; }
}
function _saveAdj(actId, adj){
  try{ localStorage.setItem(_adjKey(actId), JSON.stringify(adj)); } catch(e){}
}
function _paceStrToSecs(val){
  if(!val) return null;
  val = val.trim();
  if(val.indexOf(':') >= 0){
    var parts = val.split(':');
    var m = parseInt(parts[0]) || 0;
    var s = parseFloat(parts[1]) || 0;
    return m * 60 + s;
  }
  if(val.indexOf('.') >= 0){
    var partsD = val.split('.');
    var mD = parseInt(partsD[0]) || 0;
    var sD = parseInt(partsD[1]) || 0;
    return mD * 60 + sD;
  }
  var n = parseFloat(val);
  if(isNaN(n)) return null;
  if(n < 100) return n * 60;
  return n;
}
function _secsToPaceStr(secs){
  if(!secs || secs <= 0) return '';
  var m = Math.floor(secs / 60);
  var s = Math.round((secs - m * 60) * 10) / 10;
  var sI = Math.floor(s), sD = Math.round(s * 10) % 10;
  return m + ':' + (sI < 10 ? '0' : '') + sI + (sD ? '.' + sD : '');
}

/* ── HELPERS ── */
const escHtml=s=>{if(!s&&s!==0)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');};
const toKmh=s=>(!s||s<0.01)?'':(s*3.6).toFixed(2);
const toRitmo=s=>{
  if(!s||s<0.01)return'';
  const tR=Math.round(1000/s*10)/10;
  const m=Math.floor(tR/60),sc=tR-m*60;
  const scI=Math.floor(sc),scD=Math.round(sc*10)%10;
  return m+':'+(scI<10?'0':'')+scI+'.'+scD;
};
const ritmoSecs=s=>(!s||s<=0)?0:1000/s;
function _ritmoDispSecs(speed){var t=toRitmo(speed);if(!t)return 0;var ci=t.indexOf(':');return ci>=0?parseInt(t)*60+parseFloat(t.slice(ci+1)):0;}
function _timeDispSecs(t,dec){var s=secsToStepStr(t,dec);if(!s||s==='—')return 0;var ci=s.indexOf(':');return ci>=0?parseInt(s)*60+parseFloat(s.slice(ci+1)):parseFloat(s)||0;}
const secsToStr=t=>{if(!t||t<=0||!isFinite(t))return'';const h=Math.floor(t/3600),m=Math.floor((t%3600)/60),s=Math.round(t%60);return h>0?h+':'+(m<10?'0':'')+m+':'+(s<10?'0':'')+s:m+':'+(s<10?'0':'')+s};
const _stepStrCache={_size:0,_max:200};
const secsToStepStr=(t,dec=0)=>{
  if(!t||t<=0||!isFinite(t))return'—';
  var _k=t+'_'+dec;
  if(_stepStrCache[_k]!==undefined)return _stepStrCache[_k];
  const factor=dec===0?1:dec===3?1000:10;let v=Math.round(t*factor)/factor,h=Math.floor(v/3600),m=Math.floor((v%3600)/60),s=v-h*3600-m*60;
  if(dec===0&&s>=59.5){m++;s=0}
  if(m>=60){h++;m=0}
  let pfx=h>0?h+':'+(m<10?'0':'')+m+':':m+':';
  var r;
  if(dec===0){s=Math.round(s);r=pfx+(s<10?'0':'')+s}
  else{let txt=s.toFixed(dec);if(s<10)txt='0'+txt;r=pfx+txt}
  if(_stepStrCache._size<_stepStrCache._max){_stepStrCache[_k]=r;_stepStrCache._size++}
  return r;
};
const avg=(arr,fn)=>arr.length?arr.reduce((a,r)=>a+fn(r),0)/arr.length:0;

// Garmin Connect zone colors (fixed by zone number, not by name)
// Garmin Connect canonical zone names (Zona 1-5 + descripción)
const ZONA_GARMIN=[
  {num:1,color:'#a0a0a0',desc:'Calentamiento'},
  {num:2,color:'#4a90e2',desc:'Suave'},
  {num:3,color:'#27ae60',desc:'Aeróbica'},
  {num:4,color:'#f39c12',desc:'Umbral'},
  {num:5,color:'#e74c3c',desc:'Máximo'},
];
// Build lookup by any variation of name
const ZONA_META={};
ZONA_GARMIN.forEach(function(z){
  var base='Zona '+z.num;
  [base,base+' '+z.desc,'Z'+z.num,'Z'+z.num+' '+z.desc,'Z'+z.num+' Recuperación',
   'Z'+z.num+' Calentamiento','Z'+z.num+' Suave','Z'+z.num+' Aeróbica','Z'+z.num+' Aeróbico',
   'Z'+z.num+' Tempo','Z'+z.num+' Umbral','Z'+z.num+' Anaeróbico','Z'+z.num+' Máximo',
   'Z'+z.num+' VO2max','Z'+z.num+' VOmax','Z'+z.num+' Vomax'].forEach(function(k){
    ZONA_META[k]={color:z.color,num:z.num,display:'Zona '+z.num+' · '+z.desc};
  });
});
function _normZonaNombre(n){
  // Returns canonical name for color lookup only, don't use for display
  if(!n)return n;
  var m=n.match(/^Z([1-5])/i);
  if(!m)return n;
  var num=parseInt(m[1]);
  if(num===1)return'Z1 Recuperación';
  if(num===2)return'Z2 Aeróbico';
  if(num===3)return'Z3 Tempo';
  if(num===4)return'Z4 Umbral';
  if(num===5)return'Z5 Anaeróbico';
  return n;
}
function zonaColor(nombre){var e=ZONA_META[nombre]||ZONA_META[_normZonaNombre(nombre)];return e?e.color:null;}
function zonaDisplay(nombre){var e=ZONA_META[nombre]||ZONA_META[_normZonaNombre(nombre)];return e?e.display:nombre;}
function zonaDot(nombre){return(ZONA_META[nombre]||{}).color||'#7a8a9e';}

// ── COMPACT (group laps by distance) ──
var _compactKm = 0;
var _lastParsedList = null;

function _assignHideKeys(lista){
  (lista||[]).forEach(function(act,ai){
    if(!act._actKey)act._actKey='act'+ai;
    var n=0;
    function mark(row){
      if(!row)return;
      if(!row._hideKey)row._hideKey=act._actKey+':r'+(n++);
      else n++;
      (row._subLaps||[]).forEach(mark);
      (row.subLaps||[]).forEach(mark);
    }
    mark(act.warmup);
    (act.series||[]).forEach(mark);
    mark(act.cooldown);
  });
}
const _TIPO_MAP={
  treadmill_running:'CINTA',running:'ASFALTO',cycling:'BICI',swimming:'NATACIÓN',
  road_running:'ASFALTO',trail_running:'TRAIL',indoor_cycling:'BICI',
  gravel_cycling:'BICI',road_biking:'BICI',mountain_biking:'BICI',track_cycling:'BICI',
  ebike_mountain:'BICI',ebike_road:'BICI',e_bike:'BICI',electric_bike:'BICI',ebike:'BICI',
  cycling_v2:'BICI',indoor_cycling_v2:'BICI',road_biking_v2:'BICI',mountain_biking_v2:'BICI',
  motorcycling:'MOTO',motorcycling_v2:'MOTO',driving:'MOTO',car:'MOTO',automotive:'MOTO',
  overland:'MOTO',other_wheeled_transport:'MOTO',
  atv:'MOTO',all_terrain_vehicle:'MOTO',auto_racing:'MOTO',motocross:'MOTO',
  ground_transport:'MOTO',transportation:'MOTO',motor_racing:'MOTO',
  snowmobiling:'MOTO',karting:'MOTO',scooter_riding:'MOTO',four_wheeling:'MOTO',
  kickscooter:'MOTO',e_scooter:'MOTO'
};
function _hiddenKeyMap(){window._hiddenRowKeys=window._hiddenRowKeys||{};return window._hiddenRowKeys;}
function _rememberHiddenKeys(keys){
  _DB('STATE', '_rememberHiddenKeys input', keys);
  var map=_hiddenKeyMap();
  (keys||[]).forEach(function(k){if(k)map[k]=true;});
  _DB('STATE', '_rememberHiddenKeys result', Object.assign({},map));
}
function _forgetHiddenKeys(keys){
  _DB('STATE', '_forgetHiddenKeys input', keys);
  var map=_hiddenKeyMap();
  (keys||[]).forEach(function(k){if(k)delete map[k];});
  _DB('STATE', '_forgetHiddenKeys result', Object.assign({},map));
}
// ── Ocultar columnas (per-sport persistente en localStorage) ─────────
function _colsHiddenKey(act){
  var sport=act?act.getAttribute('data-sport')||'RUN':'RUN';
  var indoor=act?act.getAttribute('data-indoor')||'0':'0';
  var continua=act?act.getAttribute('data-continua')||'0':'0';
  return 'garmin-laps-cols-hidden-'+sport+'-'+indoor+'-'+continua;
}
function _colsHiddenList(act){
  try{return JSON.parse(localStorage.getItem(_colsHiddenKey(act))||'[]');}catch(e){return [];}
}
function _colsHiddenSave(act, arr){
  try{localStorage.setItem(_colsHiddenKey(act), JSON.stringify(arr||[]));}catch(e){}
}
function _tagColumns(table){
  if(!table) return;
  var ths=table.querySelectorAll(':scope > thead > tr:not(.th-actions-row) > th');
  var idx=0;
  var ids=[];
  ths.forEach(function(th){
    if(th.classList.contains('col-actions')){ ids.push(null); return; }
    var colId='c'+idx;
    th.setAttribute('data-col-id', colId);
    ids.push(colId);
    idx++;
  });
  var cg=table.querySelector(':scope > colgroup');
  if(cg){
    var cols=cg.querySelectorAll(':scope > col');
    cols.forEach(function(col,i){
      if(col.classList.contains('col-actions')) return;
      if(ids[i]) col.setAttribute('data-col-id', ids[i]);
    });
  }
  var trs=table.querySelectorAll(':scope > tbody > tr');
  trs.forEach(function(tr){
    Array.from(tr.children).forEach(function(td,i){
      if(td.classList.contains('col-actions')) return;
      if(ids[i]) td.setAttribute('data-col-id', ids[i]);
    });
  });
}
function _addThHideButtons(table){
  var thead=table.querySelector(':scope > thead');
  if(!thead) return;
  if(thead.querySelector(':scope > tr.th-actions-row')) return;
  var mainTr=thead.querySelector(':scope > tr');
  if(!mainTr) return;
  var actionsRow=document.createElement('tr');
  actionsRow.className='th-actions-row';
  var ths=Array.from(mainTr.querySelectorAll(':scope > th'));
  ths.forEach(function(originalTh){
    var newTh=document.createElement('th');
    newTh.className='th-actions-cell';
    if(originalTh.classList.contains('col-actions')){
      newTh.classList.add('col-actions');
      actionsRow.appendChild(newTh);
      return;
    }
    var colId=originalTh.getAttribute('data-col-id');
    if(colId){
      newTh.setAttribute('data-col-id', colId);
      var btn=document.createElement('button');
      btn.className='th-hide-btn';
      btn.title='Ocultar columna';
      btn.textContent='✕';
      btn.onclick=function(e){
        e.preventDefault();e.stopPropagation();
        var act=newTh.closest('.actividad');
        if(!act) return;
        _hideColumn(act.id.replace(/^act-/,''), colId);
      };
      newTh.appendChild(btn);
    }
    actionsRow.appendChild(newTh);
  });
  thead.insertBefore(actionsRow, mainTr);
}
function _colHideApply(actId, colId){
  var act=document.getElementById('act-'+actId); if(!act) return;
  var list=_colsHiddenList(act);
  if(list.indexOf(colId)<0){list.push(colId);_colsHiddenSave(act,list);}
  _applyHiddenColumns(act);
  _refreshColsRestoreBar(actId);
}
function _colShowApply(actId, colId){
  var act=document.getElementById('act-'+actId); if(!act) return;
  var list=_colsHiddenList(act).filter(function(c){return c!==colId;});
  _colsHiddenSave(act,list);
  _applyHiddenColumns(act);
  _refreshColsRestoreBar(actId);
}
function _pushColOp(actId, colId, isHide){
  if(!window._editStack) return;
  window._editStack.push({
    id:(isHide?'col-hide-':'col-show-')+colId+'-'+Date.now().toString(36),
    actId:actId, type:isHide?'col-hide':'col-show',
    apply:function(){ isHide?_colHideApply(actId,colId):_colShowApply(actId,colId); },
    undo: function(){ isHide?_colShowApply(actId,colId):_colHideApply(actId,colId); }
  });
  if(window._editRedo) window._editRedo.length=0;
  if(typeof window._updateFabState==='function') window._updateFabState();
}
function _hideColumn(actId, colId){
  if(!colId) return;
  var act=document.getElementById('act-'+actId); if(!act) return;
  if(_colsHiddenList(act).indexOf(colId)>=0) return;
  _colHideApply(actId, colId);
  _pushColOp(actId, colId, true);
}
function _restoreColumn(actId, colId){
  if(!colId) return;
  var act=document.getElementById('act-'+actId); if(!act) return;
  if(_colsHiddenList(act).indexOf(colId)<0) return;
  _colShowApply(actId, colId);
  _pushColOp(actId, colId, false);
}
function _restoreAllColumns(actId){
  var act=document.getElementById('act-'+actId); if(!act) return;
  var prev=_colsHiddenList(act).slice();
  if(!prev.length) return;
  _colsHiddenSave(act, []);
  _applyHiddenColumns(act);
  _refreshColsRestoreBar(actId);
  if(window._editStack){
    window._editStack.push({
      id:'col-show-all-'+Date.now().toString(36),
      actId:actId, type:'col-show-all',
      apply:function(){
        var a=document.getElementById('act-'+actId); if(!a) return;
        _colsHiddenSave(a, []);
        _applyHiddenColumns(a);
        _refreshColsRestoreBar(actId);
      },
      undo:function(){
        var a=document.getElementById('act-'+actId); if(!a) return;
        _colsHiddenSave(a, prev.slice());
        _applyHiddenColumns(a);
        _refreshColsRestoreBar(actId);
      }
    });
    if(window._editRedo) window._editRedo.length=0;
  }
}
function _applyHiddenColumns(act){
  if(!act) return;
  var table=act.querySelector('table'); if(!table) return;
  var hidden=_colsHiddenList(act);
  var set={}; hidden.forEach(function(id){set[id]=true;});
  table.querySelectorAll('[data-col-id]').forEach(function(el){
    el.style.display=set[el.getAttribute('data-col-id')]?'none':'';
  });
}
function _refreshColsRestoreBar(actId){
  var act=document.getElementById('act-'+actId); if(!act) return;
  var bar=document.getElementById(actId+'-cols-bar');
  if(!bar) return;
  var hidden=_colsHiddenList(act);
  if(!hidden.length){bar.style.display='none';return;}
  bar.style.display='';
  var lbl=document.createElement('span');
  var btn=bar.querySelector('.btn-cols-restore-toggle');
  if(btn){
    var n=hidden.length;
    btn.innerHTML='📐 '+n+(n===1?' columna':' columnas')+' oculta'+(n===1?'':'s')+' ▾';
  }
  var panel=document.getElementById(actId+'-cols-panel');
  if(panel){
    panel.innerHTML=hidden.map(function(cid){
      var th=act.querySelector('th[data-col-id="'+cid+'"]');
      var label=th?(th.textContent||'').replace(/✕\s*$/,'').trim():cid;
      return '<div class="restore-item" onclick="event.stopPropagation();_restoreColumn(\''+actId+'\',\''+cid+'\')"><span class="restore-lbl">'+label+'</span><span class="restore-one-btn">↩</span></div>';
    }).join('');
  }
}
function _toggleColsPanel(actId){
  var p=document.getElementById(actId+'-cols-panel');
  if(p) p.style.display=p.style.display==='none'?'':'none';
}
// ── Botón ✏️ por actividad — toggle modo edición ─────────────────────
function _editModeKey(act){return 'garmin-laps-edit-mode-'+(act?(act.getAttribute('data-sport')||'RUN'):'RUN');}
function _addEditModeToggle(act){
  if(!act) return;
  if(act.querySelector(':scope > .edit-mode-toggle')) return;
  var btn=document.createElement('button');
  btn.className='edit-mode-toggle';
  btn.title='Modo edición (ocultar/arrastrar/agrupar/ajustar columnas)';
  btn.textContent='✏️';
  try{
    if(localStorage.getItem(_editModeKey(act))==='1'){
      act.classList.add('editing-on');
      btn.classList.add('active');
    }
  }catch(e){}
  btn.onclick=function(e){
    e.preventDefault();e.stopPropagation();
    var on=act.classList.toggle('editing-on');
    btn.classList.toggle('active', on);
    try{localStorage.setItem(_editModeKey(act), on?'1':'0');}catch(e){}
    if(typeof window._updateFabState==='function') window._updateFabState();
    var _af=document.getElementById('lap-act-fab');
    if(_af)_af.classList.remove('expanded');
    if(!on) _clearSelection(act);
  };
  act.insertBefore(btn, act.firstChild);
  _layoutEditToggles();
  // Add merge toolbar
  _addMergeToolbar(act);
}
function _addMergeToolbar(act){
  if(!act||act.querySelector('.merge-toolbar')) return;
  var bar=document.createElement('div');
  bar.className='merge-toolbar';
  bar.style.display='none';
  bar.innerHTML='<span class="merge-count">0 seleccionadas</span>'
    +'<button class="merge-btn" title="Fusionar vueltas seleccionadas">⧉ Fusionar</button>'
    +'<button class="merge-cancel-btn" title="Cancelar selección">✕</button>';
  act.insertBefore(bar, act.firstChild);
  bar.querySelector('.merge-btn').onclick=function(e){
    e.preventDefault();e.stopPropagation();
    _doMerge(act);
  };
  bar.querySelector('.merge-cancel-btn').onclick=function(e){
    e.preventDefault();e.stopPropagation();
    _clearSelection(act);
  };
}
function _clearSelection(act){
  if(!act) return;
  act.querySelectorAll('.lap-checkbox').forEach(function(cb){cb.checked=false;});
  act.querySelectorAll('tr.row-selected').forEach(function(tr){tr.classList.remove('row-selected');});
  var bar=act.querySelector('.merge-toolbar');
  if(bar) bar.style.display='none';
}
function _updateSelectionUI(act){
  if(!act) return;
  var checked=act.querySelectorAll('.lap-checkbox:checked');
  var bar=act.querySelector('.merge-toolbar');
  if(!bar) return;
  if(checked.length>=2){
    bar.style.display='flex';
    bar.querySelector('.merge-count').textContent=checked.length+' seleccionadas';
  } else {
    bar.style.display='none';
  }
}
function _doMerge(act){
  _DB('MERGE', 'ENTER act='+act.id);
  var checked=act.querySelectorAll('.lap-checkbox:checked');
  if(checked.length<2){ _DB('MERGE', '<2 checked, return'); return; }
  var rows=[];
  checked.forEach(function(cb){
    var tr=cb.closest('tr');
    if(tr) rows.push(tr);
  });
  rows.sort(function(a,b){
    var pos=a.compareDocumentPosition(b);
    return pos&Node.DOCUMENT_POSITION_FOLLOWING?-1:1;
  });
  // Verify consecutive
  for(var i=1;i<rows.length;i++){
    var prev=rows[i-1], next=rows[i];
    var sibling=prev.nextElementSibling;
    while(sibling&&sibling!==next){
      var cls=sibling.className||'';
      if(cls.indexOf('avg-row')<0&&cls.indexOf('avg-act')<0){
        alert('Solo se pueden fusionar vueltas consecutivas.');
        return;
      }
      sibling=sibling.nextElementSibling;
    }
  }
  // Get type label from first row
  var typeLbl=rows[0].getAttribute('data-dlbl')||'';
  if(!typeLbl){
    var span=rows[0].querySelector('.lap-label-row span')||rows[0].querySelector('.lap-label-edit');
    if(span) typeLbl=span.textContent.trim();
  }
  // Merge data
  var totDur=0,totDist=0,ws=0,wfcm=0,wfcx=0,wcad=0,wpow=0;
  var maxFCx=0,maxSpeed=0,maxPow=0,maxSmax=0;
  rows.forEach(function(tr){
    var dur=parseFloat(tr.getAttribute('data-dur'))||0;
    var spd=parseFloat(tr.getAttribute('data-speed'))||0;
    var dist=parseFloat(tr.getAttribute('data-dist'))||0;
    var fcm=parseFloat(tr.getAttribute('data-fcm'))||0;
    var fcx=parseFloat(tr.getAttribute('data-fcx'))||0;
    var cad=parseFloat(tr.getAttribute('data-cad'))||0;
    var pow=parseFloat(tr.getAttribute('data-pow'))||0;
    var smax=parseFloat(tr.getAttribute('data-smax'))||0;
    totDur+=dur; totDist+=dist;
    if(spd>0&&dur>0){ ws+=spd*dur; }
    if(fcm>0&&dur>0){ wfcm+=fcm*dur; }
    if(fcx>0&&dur>0){ wfcx+=fcx*dur; }
    if(cad>0&&dur>0){ wcad+=cad*dur; }
    if(pow>0&&dur>0){ wpow+=pow*dur; }
    if(fcx>maxFCx) maxFCx=fcx;
    if(spd>maxSpeed) maxSpeed=spd;
    if(pow>maxPow) maxPow=pow;
    if(smax>maxSmax) maxSmax=smax;
  });
  var avgSpd=totDur>0?ws/totDur:0;
  var avgFCm=totDur>0&&wfcm>0?Math.round(wfcm/totDur):0;
  var avgFCx=totDur>0&&wfcx>0?Math.round(wfcx/totDur):0;
  var avgCad=totDur>0&&wcad>0?Math.round(wcad/totDur):0;
  var avgPow=totDur>0&&wpow>0?Math.round(wpow/totDur):0;
  var actId=act.id.replace('act-','');
  var mergeId=actId+'merge'+Date.now();
  var lbl=typeLbl||('Fusionada ('+rows.length+')');
  // Clone first row to preserve exact column structure
  var firstRow=rows[0];
  var newTr=firstRow.cloneNode(true);
  newTr.id=mergeId;
  newTr.removeAttribute('__lapHandlersAttached');
  newTr.removeAttribute('onclick');
  newTr.removeAttribute('data-child-count');
  newTr.setAttribute('data-hide-key','');
  newTr.setAttribute('data-lbl',lbl);
  newTr.setAttribute('data-dur',totDur);
  newTr.setAttribute('data-speed',avgSpd);
  newTr.setAttribute('data-dist',Math.round(totDist*1000)/1000);
  newTr.setAttribute('data-fcm',avgFCm);
  newTr.setAttribute('data-fcx',maxFCx);
  newTr.setAttribute('data-cad',avgCad);
  newTr.setAttribute('data-pow',avgPow);
  newTr.setAttribute('data-smax',maxSmax);
  newTr.setAttribute('data-dsn','0');
  newTr.setAttribute('data-active','1');
  newTr.setAttribute('data-res','0');
  newTr.setAttribute('data-zones','[]');
  newTr.className='group-lap lap-row-active';
  if(customParent){
    newTr.setAttribute('data-custom-parent',customParent);
    newTr.classList.add('custom-group-child');
  }
  // Fix hide button onclick
  var hideBtn=newTr.querySelector('.hide-btn');
  if(hideBtn) hideBtn.setAttribute('onclick','event.stopPropagation();_hideRow(\''+mergeId+'\',\''+actId+'\')');
  // Fix extract / up / down button onclick references to use the new merge ID
  var oldRowId=firstRow.id;
  newTr.querySelectorAll('.lap-extract-btn, .lap-up-btn, .lap-down-btn').forEach(function(btn){
    var oc=btn.getAttribute('onclick');
    if(oc) btn.setAttribute('onclick', oc.replace(new RegExp("'"+oldRowId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+"'","g"), "'"+mergeId+"'"));
  });
  // Remove inherited elements that get re-added later inside .lap-row-actions
  var groupArrow=newTr.querySelector('.group-arrow');
  if(groupArrow) groupArrow.remove();
  var ungroupBtn=newTr.querySelector('.ungroup-btn');
  if(ungroupBtn) ungroupBtn.remove();
  var oldCb=newTr.querySelector('.lap-checkbox');
  if(oldCb) oldCb.remove();
  var oldHandle=newTr.querySelector('.lap-handle');
  if(oldHandle) oldHandle.remove();
  // Remove all delta divs (sub dp/dn) inside .metric elements
  newTr.querySelectorAll('.metric .sub').forEach(function(sub){
    sub.remove();
  });
  // Remove ritmo-pill, vel-med-pill, fc-med-pill, fc-max-pill, vel-max-pill, cad-pill, power-pill
  newTr.querySelectorAll('.ritmo-pill,.vel-med-pill,.fc-med-pill,.fc-max-pill,.vel-max-pill,.cad-pill,.power-pill').forEach(function(pill){
    var txt=pill.textContent;
    pill.replaceWith(document.createTextNode(txt));
  });
  // Ensure the row has a .lap-row-actions span with all action buttons
  var rowActions=newTr.querySelector('.lap-row-actions');
  if(!rowActions){
    var firstTd=newTr.querySelector('td');
    if(firstTd){
      var swallow2='event.stopPropagation();';
      rowActions=document.createElement('span');
      rowActions.className='lap-row-actions';
      rowActions.innerHTML='<button class="hide-btn" onclick="'+swallow2+'_hideRow(\''+mergeId+'\',\''+actId+'\')" title="Ocultar fila">✕</button>'
        +'<button class="lap-extract-btn" onclick="'+swallow2+'_extractFromGroup(\''+mergeId+'\',\''+actId+'\')" title="Sacar del grupo">↤</button>'
        +'<button class="lap-up-btn" onclick="'+swallow2+'_moveUpInGroup(\''+mergeId+'\',\''+actId+'\')" title="Subir vuelta">↥</button>'
        +'<button class="lap-down-btn" onclick="'+swallow2+'_moveDownInGroup(\''+mergeId+'\',\''+actId+'\')" title="Bajar vuelta">↧</button>';
      // Also remove any standalone hide-btn from firstCell that was kept during cleanup
      var orphanHide=firstTd.querySelector(':scope > .hide-btn');
      if(orphanHide) orphanHide.remove();
      firstTd.insertBefore(rowActions, firstTd.firstChild);
    }
  }
  // Update label text
  var labelSpan=newTr.querySelector('.lap-label-row span');
  if(labelSpan){
    labelSpan.textContent=lbl;
  } else {
    var altLabel=newTr.querySelector('.lap-label-edit');
    if(altLabel) altLabel.textContent=lbl;
  }
  // Ensure .lap-label-cell > .lap-label-row wrapper exists
  var labelTd=newTr.querySelector('td[data-col-id="c0"]');
  if(labelTd && !labelTd.querySelector('.lap-label-cell')){
    var le=newTr.querySelector('.lap-label-edit');
    if(le && le.parentNode===labelTd){
      var lc=document.createElement('div'); lc.className='lap-label-cell';
      var lr=document.createElement('div'); lr.className='lap-label-row';
      le.parentNode.insertBefore(lc, le);
      lc.appendChild(lr);
      lr.appendChild(le);
    }
  }
  // Update visible cell values: find all .main elements and update by column class
  var actEl=document.getElementById('act-'+actId);
  var isContinua=actEl&&actEl.getAttribute('data-continua')==='1';
  var timeMain=newTr.querySelector('.col-time .main');
  if(timeMain) timeMain.textContent=totDur?secsToStepStr(totDur):'—';
  var cumMain=newTr.querySelector('.col-cum-time .main');
  if(cumMain) cumMain.textContent=totDur?secsToStepStr(totDur):'—';
  var distMain=newTr.querySelector('.col-dist .main');
  if(distMain) distMain.textContent=(Math.round(totDist*1000)/1000).toFixed(2)+' km';
  var spdMain=newTr.querySelector('.col-speed .main');
  if(spdMain) spdMain.textContent=avgSpd>=0.01?toKmh(avgSpd)+' km/h':'';
  var paceMain=newTr.querySelector('.col-pace .main');
  if(paceMain) paceMain.textContent=avgSpd>=0.01?toRitmo(avgSpd):'';
  // For cells without a class, use position: find all metric cells, skip time/cum/dist/speed/pace
  var knownMains=newTr.querySelectorAll('.col-time .main, .col-cum-time .main, .col-dist .main, .col-speed .main, .col-pace .main');
  var knownIds=new Set();
  knownMains.forEach(function(m){knownIds.add(m);});
  // For continuous (no col-dist class), find distance cell and update + exclude from unknown
  var contDistMain=null;
  if(isContinua&&!distMain){
    contDistMain=newTr.querySelector('td:not(.col-actions) .metric .main');
    if(contDistMain){
      contDistMain.textContent=(Math.round(totDist*1000)/1000).toFixed(2)+' km';
      knownIds.add(contDistMain);
    }
  }
  var allMains=newTr.querySelectorAll('td .metric .main');
  var unknownMains=[];
  allMains.forEach(function(m){if(!knownIds.has(m)) unknownMains.push(m);});
  if(unknownMains.length>=1) unknownMains[0].textContent=avgCad||'';
  if(unknownMains.length>=2) unknownMains[1].textContent=avgFCm||'';
  if(unknownMains.length>=3) unknownMains[2].textContent=maxFCx||'';
  // Update zones cell - aggregate from original rows
  var zCell=newTr.querySelector('.td-zona');
  var mergedZones=[];
  var zMap={};
  rows.forEach(function(tr){
    var raw=tr.getAttribute('data-zones');
    if(!raw) return;
    var zones;
    try{ zones=JSON.parse(raw.replace(/&quot;/g,'"')); }catch(e){ return; }
    if(!Array.isArray(zones)) return;
    zones.forEach(function(z){
      if(!z||!z.nombre) return;
      if(!zMap[z.nombre]) zMap[z.nombre]={nombre:z.nombre,secs:0,rango:z.rango||'',color:z.color||''};
      zMap[z.nombre].secs+=(parseFloat(z.secs)||0);
    });
  });
  mergedZones=Object.values(zMap).filter(function(z){return z.secs>0;});
  newTr.setAttribute('data-zones',JSON.stringify(mergedZones));
  if(zCell){
    _DB('MERGE', 'zoneCell mergedZones='+mergedZones.length, mergedZones);
    if(typeof zonaCellHtml==='function'){
      try{
        var newHtml=zonaCellHtml(mergedZones,true);
        zCell.outerHTML=newHtml;
        _DB('MERGE', 'zoneCell set OK');
      }catch(e){
        _DB('MERGE', 'zoneCellHtml error', e);
        _renderZoneFallback(zCell, mergedZones);
      }
    } else if(mergedZones.length){
      _DB('MERGE', 'zoneCell fallback render');
      _renderZoneFallback(zCell, mergedZones);
    }
  }
  // Find the group header (parent of these rows) — supports auto and custom groups
  var parentHeader=null;
  var tbody=firstRow.parentNode;
  var siblings=Array.from(tbody.querySelectorAll('tr'));
  var firstIdx=siblings.indexOf(firstRow);
  for(var si=firstIdx-1;si>=0;si--){
    var sr=siblings[si];
    if(sr.classList.contains('group-header')||sr.classList.contains('custom-group-header')){
      parentHeader=sr;
      break;
    }
    if(sr.classList.contains('phase-header')) break;
  }
  // Propagate custom-group membership to the merged row
  var customParent=firstRow.getAttribute('data-custom-parent');
  // Count group children BEFORE merge
  var groupChildCount=0;
  if(parentHeader){
    for(var ci=firstIdx-1;ci>=0;ci--){
      var cs=siblings[ci];
      if(cs===parentHeader) break;
      if(cs.classList.contains('group-lap')||cs.classList.contains('group-boundary')) groupChildCount++;
    }
    // Also count forward from header until next header
    groupChildCount=0;
    for(var ci2=siblings.indexOf(parentHeader)+1;ci2<siblings.length;ci2++){
      var cs2=siblings[ci2];
      if(cs2.classList.contains('group-header')||cs2.classList.contains('phase-header')) break;
      if(cs2.classList.contains('group-lap')||cs2.classList.contains('group-boundary')) groupChildCount++;
    }
  }
  // Replace first selected row, remove rest
  rows.forEach(function(tr,i){
    if(i===0){
      tbody.replaceChild(newTr, tr);
    } else {
      tbody.removeChild(tr);
    }
  });
  newTr.classList.add('lap-row-active');
  // Checkbox is added later by _attachRowHandlers (via _attachRowHandlersToAct in _refreshAct)
  // to ensure correct order inside .lap-row-actions (checkbox → handle → buttons).
  // If parent group had exactly N children and all N were selected, remove the header
  var parentHeaderData=null;
  var parentHeaderWasRemoved=false;
  if(parentHeader&&groupChildCount===rows.length){
    parentHeaderData={id:parentHeader.id,html:parentHeader.outerHTML};
    parentHeaderWasRemoved=true;
    var mergedLbl=newTr.getAttribute('data-lbl')||'';
    var hdrLbl=parentHeader.getAttribute('data-lbl')||'';
    if(hdrLbl&&!mergedLbl){
      newTr.setAttribute('data-lbl',hdrLbl);
      var mspan=newTr.querySelector('.lap-label-row span');
      if(mspan) mspan.textContent=hdrLbl;
    }
    parentHeader.remove();
    parentHeader=null;
  }
  // Recalculate parent header if it still exists
  if(parentHeader&&parentHeader.parentNode) _recalcParentHeader(newTr);
  // Recalculate averages
  _recalcAvgRows(actId);
  _clearSelection(act);
  // Refresh UI (pill recalc, cumulative times, auto headers, etc.)
  _DB('MERGE', 'refresh after merge actId='+actId+' rows='+rows.length+' mergeId='+mergeId+' headerRemoved='+!!parentHeaderData);
  _dumpFullState('MERGE: before refresh');
  if(typeof window._refreshAct==='function') window._refreshAct(actId);
  // Push to unified edit stack for undo/redo
  _DB('MERGE', 'push to stack mergeId='+mergeId);
  _pushMergeToEditStack(actId, rows, mergeId, newTr, parentHeader, parentHeaderData);
  // Dump rendered HTML after merge
  setTimeout(function(){
    if(typeof window._dumpRenderedHTML==='function') window._dumpRenderedHTML();
  },50);
}
function _pushMergeToEditStack(actId, oldRows, newId, newTr, parentHeader, parentHeaderData){
  // Capture full outerHTML of all affected rows BEFORE any further mutation
  var oldRowsData=oldRows.map(function(r){return{html:r.outerHTML,id:r.id};});
  var mergedHtml=newTr.outerHTML; // snapshot of merged row for redo
  // Build redo function (re-apply merge using captured snapshot)
  var applyFn=function(){
    var act=document.getElementById('act-'+actId);
    if(!act) return;
    var tbody=act.querySelector('tbody');
    if(!tbody) return;
    var firstOld=document.getElementById(oldRowsData[0].id);
    if(!firstOld) return;
    var temp=document.createElement('tbody');
    temp.innerHTML=mergedHtml;
    var merged=temp.querySelector('tr');
    if(!merged) return;
    merged.id=newId;
    if(!merged.querySelector('.lap-checkbox')) _addCheckboxToRow(merged);
    tbody.replaceChild(merged, firstOld);
    for(var i=1;i<oldRowsData.length;i++){
      var other=document.getElementById(oldRowsData[i].id);
      if(other) tbody.removeChild(other);
    }
    if(parentHeaderData){
      var hdr=document.getElementById(parentHeaderData.id);
      if(hdr) hdr.remove();
    }
    _recalcAvgRows(actId);
    if(typeof window._normalizeGroupLap==='function') window._normalizeGroupLap(actId);
    if(typeof window._updateFabState==='function') window._updateFabState();
  };
  // Build undo function (restore old rows, restore header if removed)
  var undoFn=function(){
    var act=document.getElementById('act-'+actId);
    if(!act) return;
    var tbody=document.querySelector('#act-'+actId+' tbody');
    if(!tbody) return;
    var merged=document.getElementById(newId);
    var refNode=merged;
    if(merged){
      var temp=document.createElement('tbody');
      temp.innerHTML=oldRowsData[0].html;
      var restored=temp.querySelector('tr');
      if(restored){
        tbody.replaceChild(restored, merged);
        refNode=restored;
        _addCheckboxToRow(restored);
      }
    }
    // Insert remaining old rows after the first
    for(var i=1;i<oldRowsData.length;i++){
      var temp2=document.createElement('tbody');
      temp2.innerHTML=oldRowsData[i].html;
      var restored2=temp2.querySelector('tr');
      if(!restored2) continue;
      _addCheckboxToRow(restored2);
      if(refNode&&refNode.parentNode){
        refNode.parentNode.insertBefore(restored2, refNode.nextSibling);
      }
      refNode=restored2;
    }
    // Restore parent header if it was removed
    if(parentHeaderData){
      var hdr=document.getElementById(parentHeaderData.id);
      if(!hdr){
        var tempH=document.createElement('tbody');
        tempH.innerHTML=parentHeaderData.html;
        var hdrEl=tempH.querySelector('tr');
        if(hdrEl){
          var firstRestored=document.getElementById(oldRowsData[0].id);
          if(firstRestored&&firstRestored.parentNode){
            firstRestored.parentNode.insertBefore(hdrEl, firstRestored);
          }
        }
      }
    }
    _recalcAvgRows(actId);
    if(typeof window._normalizeGroupLap==='function') window._normalizeGroupLap(actId);
    if(typeof window._updateFabState==='function') window._updateFabState();
  };
  var op={type:'merge',actId:actId,apply:applyFn,undo:undoFn,
    id:'merge-'+Date.now().toString(36)};
  // Push to unified stack
  var stack=window._editStack;
  if(!stack){ window._editStack=[]; stack=window._editStack; }
  stack.push(op);
  window._editRedo=(window._editRedo||[]);
  window._editRedo.length=0;
  if(typeof window._updateFabState==='function') window._updateFabState();
}
function _pushMerge(actId, oldRows, newId, parentHeader){
  // Legacy wrapper - no longer used
}
function _addCheckboxToRow(tr){
  if(tr.querySelector('.lap-checkbox')) return;
  var td=tr.querySelector('td');
  if(!td) return;
  var cb=document.createElement('input');
  cb.type='checkbox';
  cb.className='lap-checkbox';
  cb.title='Seleccionar para fusionar';
  var actions=td.querySelector(':scope > .lap-row-actions');
  if(actions) actions.insertBefore(cb, actions.firstChild);
  else td.insertBefore(cb, td.firstChild);
}
// Los lápices son position:fixed para que estén siempre visibles.
// Los colocamos en horizontal junto al FAB de acciones (📸) y al FAB de undo/redo,
// todos ABAJO a la derecha.
// Orden visual (de derecha a izquierda):
//   [📸] [undo] [redo] [pen-act1] [pen-act2] …
function _layoutEditToggles(){
  var BTN=38, GAP=6, PAD=14;
  var editBtns=Array.from(document.querySelectorAll('.edit-mode-toggle'));
  var fab=document.getElementById('lap-ur-fab');
  var fabVisible=!!(fab && fab.classList.contains('visible'));
  var actFab=document.getElementById('lap-act-fab');
  var actFabVisible=!!(actFab && actFab.classList.contains('visible'));
  // position camera (actFab) at rightmost (PAD), undo/redo to its left, pencils further left
  if(actFab) actFab.style.right=PAD+'px';
  var fabRight=PAD+(actFabVisible?(BTN+GAP):0);
  if(fab) fab.style.right=fabRight+'px';
  // position pencils to the left of undo/redo
  var baseRight=PAD+(actFabVisible?(BTN+GAP):0)+(fabVisible?(BTN*2+GAP+GAP):0);
  editBtns.forEach(function(pen){
    if(pen){
      pen.style.top='auto'; pen.style.bottom=PAD+'px';
      pen.style.right=baseRight+'px';
      baseRight+=(BTN+GAP);
    }
  });
}
// Summary rows (avg-row / avg-act) hide-by-id mechanism — sobrevive a re-renders
window._hiddenSummaryIds=window._hiddenSummaryIds||{};
function _hideSummaryRow(rowId,actId){
  var el=document.getElementById(rowId);
  if(!el)return;
  el.classList.add('row-hidden');
  window._hiddenSummaryIds[rowId]={actId:actId};
  // Empuja op al _editStack para Cmd/Ctrl+Z
  var s=window._editStack;
  if(s){
    s.push({
      id:'sum-'+rowId+'-'+Date.now().toString(36),
      actId:actId,type:'hide-summary',
      apply:function(){var e=document.getElementById(rowId);if(e)e.classList.add('row-hidden');window._hiddenSummaryIds[rowId]={actId:actId};},
      undo:function(){var e=document.getElementById(rowId);if(e){e.classList.remove('row-hidden');e.style.display='';}delete window._hiddenSummaryIds[rowId];}
    });
    if(window._editRedo)window._editRedo.length=0;
  }
}
function _applyHiddenSummaryIds(){
  Object.keys(window._hiddenSummaryIds||{}).forEach(function(rid){
    var e=document.getElementById(rid);
    if(e)e.classList.add('row-hidden');
  });
}
function _rowKeysFromIds(rowIds){
  var keys=[];
  (rowIds||[]).forEach(function(rid){
    var el=document.getElementById(rid);
    var key=el&&el.getAttribute('data-hide-key');
    if(key)keys.push(key);
  });
  return keys;
}
function _visibleRowCopy(row,map){
  if(!row)return null;
  if(row._hideKey&&map[row._hideKey])return null;
  if(row._subLaps&&row._subLaps.length){
    var subs=row._subLaps.map(function(sub){return _visibleRowCopy(sub,map);}).filter(Boolean);
    if(!subs.length)return null;
    return Object.assign({},row,{_subLaps:subs});
  }
  if(row.subLaps&&row.subLaps.length){
    var subs2=row.subLaps.map(function(sub){return _visibleRowCopy(sub,map);}).filter(Boolean);
    if(!subs2.length)return null;
    return Object.assign({},row,{subLaps:subs2});
  }
  return row;
}
function _visibleDistanceSummary(act){
  var total=0,seen=false;
  function add(row){
    if(!row)return;
    if(row._subLaps&&row._subLaps.length){
      row._subLaps.forEach(add);
      return;
    }
    seen=true;
    total+=parseFloat(row.dist_km)||0;
  }
  add(act.warmup);
  (act.series||[]).forEach(add);
  add(act.cooldown);
  return {seen:seen,total:Math.round(total*100)/100};
}
function _visibleListForRender(lista){
  var map=_hiddenKeyMap();
  var activeKeys=Object.keys(map).filter(function(k){return map[k];});
  if(activeKeys.length) _DB('RENDER', '_visibleListForRender hiding keys: ['+activeKeys.join(',')+']');
  return (lista||[]).map(function(act){
    var next=Object.assign({},act,{
      warmup:_visibleRowCopy(act.warmup,map),
      series:(act.series||[]).map(function(s){return _visibleRowCopy(s,map);}).filter(Boolean),
      cooldown:_visibleRowCopy(act.cooldown,map)
    });
    var dist=_visibleDistanceSummary(next);
    if(dist.seen||act.distancia_total)next.distancia_total=dist.total.toFixed(2)+' km';
    return next;
  });
}
function _refreshAllRestoreBars(){
  document.querySelectorAll('.actividad[id^="act-"]').forEach(function(act){
    _refreshActRestoreBar(act.id.replace(/^act-/,''));
  });
}

function _splitLap(lap, fraction, takeDist) {
  var origDur = lap.dur_raw_secs || lap.dur_secs || 0;
  return {
    label: lap.label,
    _intensityType: lap._intensityType,
    wktStepIndex: lap.wktStepIndex,
    speed: lap.speed || 0,
    dist_km: Math.round(takeDist * 100) / 100,
    dur_secs: Math.round(origDur * fraction),
    dur_raw_secs: origDur * fraction,
    cadencia: lap.cadencia || 0,
    speed_max: lap.speed_max || 0,
    potencia_w: lap.potencia_w || 0,
    desnivel: Math.round((lap.desnivel || 0) * fraction),
    fc_med: lap.fc_med || 0,
    fc_max: lap.fc_max || 0,
    vuelta: lap.vuelta,
    zonas_lap: (lap.zonas_lap || []).map(function(z) {
      return { nombre: z.nombre, secs: Math.round((z.secs || 0) * fraction), rango: z.rango, color: z.color };
    }),
    residual: lap.residual || false,
    _subSplit: true
  };
}
function _compactarLista(lista, kmInterval) {
  if (!kmInterval || kmInterval <= 0) return lista;
  return lista.map(function(d) {
    var flat = [];
    if (d.warmup) flat.push({_src:'warmup',_data:d.warmup});
    (d.series || []).forEach(function(s) { flat.push({_src:'series',_data:s}); });
    if (d.cooldown) flat.push({_src:'cooldown',_data:d.cooldown});
    if (!flat.length) return d;

    // Group + split integrated: each active lap is split at the exact group boundary
    // so every full group gets exactly kmInterval km (not just approximate).
    var groups = [], group = [], groupDist = 0;
    flat.forEach(function(item) {
      var lap = item._data;
      var dist = lap.dist_km || 0;
      if (_isDescanso(lap) || dist <= 0.001) {
        group.push(lap);
        return;
      }
      var remaining = dist;
      while (remaining > 0.001) {
        var needed = kmInterval - groupDist;
        if (needed <= 0) break;
        var take = Math.min(remaining, needed);
        var fraction = take / dist;
        group.push(_splitLap(lap, fraction, take));
        groupDist += take;
        remaining -= take;
        if (groupDist >= kmInterval - 0.01) {
          groups.push(group); group = []; groupDist = 0;
        }
      }
    });
    // Absorb residual trailing group (<10% of kmInterval) into the previous group
    if (group.length && groups.length && groupDist < kmInterval * 0.1) {
      groups[groups.length - 1] = groups[groups.length - 1].concat(group);
    } else if (group.length) {
      groups.push(group);
    }

    var _runningLapIdx = 0;
    var mergedSeries = groups.map(function(grp, gi) {
      var _grpStartIdx = _runningLapIdx + 1;
      _runningLapIdx += grp.length;
      if (grp.length === 1) {
        var _s=grp[0], _t=_s.dur_secs||0, _d=_s.dist_km||0;
        var _zas=(_s.zonas_lap||[]).slice();
        return {
          label: _s.label||String(gi+1), _intensityType: 'INTERVAL',
          vuelta: _s.vuelta||String(gi+1),
          _subLaps: grp,
          speed: _s.speed||0,
          dist_km: Math.round(_d*100)/100,
          dur_secs: Math.round(_t), dur_raw_secs: _t,
          cadencia: Math.round(_s.cadencia||0),
          speed_max: _s.speed_max||0,
          potencia_w: Math.round(_s.potencia_w||0),
          desnivel: Math.round(_s.desnivel||0),
          fc_med: Math.round(_s.fc_med||0),
          fc_max: _s.fc_max||0,
          zonas_lap: _zas
        };
      }
      var totTime = 0, totDist = 0, totElev = 0, maxSpeedMax = 0, wFcMax = 0;
      var wPower = 0, totalW = 0;
      var wSpeedAct = 0, wCadAct = 0, wFcMedAct = 0, totalWAct = 0;
      var zoneAcc = {};
      var _resKm = kmInterval * 0.05; // laps with <5% of group distance are residual
      grp.forEach(function(s) {
        var t = s.dur_secs || 0;
        totTime += t; totDist += s.dist_km || 0; totElev += s.desnivel || 0;
        maxSpeedMax = Math.max(maxSpeedMax, s.speed_max || 0);
        if (t > 0 && (s.fc_max||0) > 0) { wFcMax += (s.fc_max||0) * t; }
        if (t > 0) {
          totalW += t; wPower += (s.potencia_w||0)*t;
          if (!_isDescanso(s) && (s.dist_km||0) >= _resKm) { wSpeedAct += (s.speed||0)*t; wCadAct += (s.cadencia||0)*t; wFcMedAct += (s.fc_med||0)*t; totalWAct += t; }
        }
        (s.zonas_lap || []).forEach(function(z) {
          var k = z.nombre;
          if (!zoneAcc[k]) zoneAcc[k] = {nombre:k, secs:0, rango:z.rango, color:z.color};
          zoneAcc[k].secs += z.secs || 0;
        });
      });
      // If all laps in the group are descansos, fall back to all laps for averages
      if (totalWAct === 0) {
        grp.forEach(function(s) {
          var t = s.dur_secs || 0;
          if (t > 0) { wSpeedAct += (s.speed||0)*t; wCadAct += (s.cadencia||0)*t; wFcMedAct += (s.fc_med||0)*t; totalWAct += t; }
        });
      }
      var zonas_lap = Object.keys(zoneAcc).map(function(k){return zoneAcc[k];})
        .sort(function(a,b){return b.nombre.localeCompare(a.nombre);});
      // Build "Vuelta" range from lap-numbers — extract digits from `vuelta` (e.g. "1", "1 - 2"),
      // fall back to digits in `label`, and finally to the running global lap index.
      var _nums = [];
      grp.forEach(function(l){
        String(l.vuelta||'').split(/\D+/).forEach(function(p){var n=parseInt(p);if(n)_nums.push(n);});
      });
      if(!_nums.length){
        grp.forEach(function(l){
          String(l.label||'').split(/\D+/).forEach(function(p){var n=parseInt(p);if(n)_nums.push(n);});
        });
      }
      var _fL, _lL;
      if(_nums.length){
        _fL = Math.min.apply(null, _nums);
        _lL = Math.max.apply(null, _nums);
      } else {
        _fL = _grpStartIdx;
        _lL = _grpStartIdx + grp.length - 1;
      }
      return {
        label: String(gi + 1), _intensityType: 'INTERVAL',
        vuelta: _fL === _lL ? String(_fL) : (_fL + ' - ' + _lL),
        _subLaps: grp,
        speed: totalWAct > 0 ? wSpeedAct / totalWAct : 0,
        dist_km: Math.round(totDist * 100) / 100,
        dur_secs: Math.round(totTime), dur_raw_secs: totTime,
        cadencia: Math.round(totalWAct > 0 ? wCadAct / totalWAct : 0),
        speed_max: maxSpeedMax,
        potencia_w: Math.round(totalW > 0 ? wPower / totalW : 0),
        desnivel: Math.round(totElev),
        fc_med: Math.round(totalWAct > 0 ? wFcMedAct / totalWAct : 0),
        fc_max: Math.round(totTime > 0 ? wFcMax / totTime : 0),
        zonas_lap: zonas_lap
      };
    });

    // Preserve tipo (MOTO/BICI/etc.) and use 'intervalos' so the summary row stays visible
    var modoCompact = ['carrera','long_run'].indexOf((d.modo||'').toLowerCase()) >= 0 ? 'intervalos' : (d.modo || 'intervalos');
    return Object.assign({}, d, {modo: modoCompact, warmup: null, cooldown: null, series: mergedSeries});
  });
}

function _showCompactBar(show) {
  var bar = document.getElementById('compact-bar');
  if (bar) { if (show) bar.classList.add('visible'); else { bar.classList.remove('visible'); } }
}

function onCompactPresetChange() {
  var sel = document.getElementById('compact-preset');
  var customInput = document.getElementById('compact-custom');
  var btnOk = document.getElementById('btn-compact-ok');
  var val = sel ? sel.value : '0';
  if (val === 'custom') {
    if (customInput) customInput.style.display = '';
    if (btnOk) btnOk.style.display = '';
  } else {
    if (customInput) customInput.style.display = 'none';
    if (btnOk) btnOk.style.display = 'none';
    var km = parseFloat(val);
    if (km > 0) { _compactKm = km; _reRenderCompact(); }
    else { _compactKm = 0; _reRenderCompact(); }
    _updateCompactResetBtn();
  }
}

function applyCompact() {
  var customInput = document.getElementById('compact-custom');
  var km = customInput ? parseFloat(customInput.value) : 0;
  if (!km || km <= 0) return;
  _compactKm = km;
  _reRenderCompact();
  _updateCompactResetBtn();
}

function resetCompact() {
  _compactKm = 0;
  var sel = document.getElementById('compact-preset');
  if (sel) sel.value = '0';
  var customInput = document.getElementById('compact-custom');
  if (customInput) { customInput.style.display = 'none'; customInput.value = ''; }
  var btnOk = document.getElementById('btn-compact-ok');
  if (btnOk) btnOk.style.display = 'none';
  _updateCompactResetBtn();
  _reRenderCompact();
}

function _updateCompactResetBtn() {
  var btn = document.getElementById('btn-compact-reset');
  if (btn) btn.style.display = _compactKm > 0 ? '' : 'none';
}

function debugDumpTable(){
  var out=[];
  document.querySelectorAll('#render-target .actividad[id^="act-"]').forEach(function(act){
    var aid=act.id;
    var titulo=act.querySelector('.lbl');
    var actRows=[];
    act.querySelectorAll(':scope tbody > tr').forEach(function(tr){
      var first=tr.querySelector('td:first-child');
      var cls=tr.className;
      var lbl='';
      if(first){
        var gl=first.querySelector('.group-label');
        lbl=gl?gl.textContent.trim():first.textContent.trim();
      }
      var st=tr.style||{};
      actRows.push({
        id:tr.id||'',
        cls:cls,
        lbl:lbl.slice(0,40),
        key:tr.getAttribute('data-hide-key')||'',
        dlbl:(tr.getAttribute('data-lbl')||'').slice(0,30),
        rowHidden:tr.classList.contains('row-hidden'),
        dispNone:st.display==='none'
      });
    });
    out.push({actividad:aid,titulo:titulo?titulo.textContent.trim():'',rows:actRows});
  });
  _DB('DUMP', '--- TABLE STRUCTURE ---');
  console.log(JSON.stringify(out,null,2));
  _DB('DUMP', '--- END ---');
}
function _reRenderCompact() {
  _DB('RENDER', 'enter hasLastParsedList='+!!_lastParsedList+' _hiddenRowKeys='+JSON.stringify(window._hiddenRowKeys||{}));
  // Save active phase filter state before DOM is destroyed
  var phaseState = {};
  document.querySelectorAll('.phase-filter-bar').forEach(function(bar){
    var active = bar.querySelector('.phase-pill.active');
    if(active){
      var aid = bar.getAttribute('data-actid');
      if(aid) phaseState[aid] = active.getAttribute('data-phase');
    }
  });
  _DB('RENDER', 'saved phaseState', phaseState);
  if (!_lastParsedList) return;
  Object.keys(_zonaRangos).forEach(function(k){delete _zonaRangos[k];});
  var baseLista=_visibleListForRender(_lastParsedList);
  var lista = _compactKm > 0 ? _compactarLista(baseLista, _compactKm) : baseLista;
  document.getElementById('output').innerHTML = '<div id="render-target" data-ver="2">' + lista.map(renderActividad).join('') + '</div>';
  lista.forEach(function(cl,i){if(cl._pre&&_lastParsedList[i])_lastParsedList[i]._pre=cl._pre;});
  _refreshAllRestoreBars();
  // Restore active phase filter state
  Object.keys(phaseState).forEach(function(aid){
    var phase = phaseState[aid];
    _DB('RENDER', 'restoring phase filter: actId='+aid+' phase='+phase);
    _dumpFullState('RENDER: before phase restore');
    _setPhaseFilter(aid, phase);
    _dumpFullState('RENDER: after phase restore');
  });
  setTimeout(debugDumpTable,100);
}

// Zone range registry — populated from "rango" field in JSON data
// Falls back to empty string if not provided
const _zonaRangos={};
function registerZonaRango(nombre,rango){if(rango&&nombre)_zonaRangos[nombre]=rango;}
function zonaRange(nombre){return _zonaRangos[nombre]||'';}

function fmtDistKm(km){
  if(!km||km<0)return'0.00 km';
  return km.toFixed(2)+' km';
}
function dKmh(c,p){
  const cv=parseFloat((c>=0.3?c*3.6:0).toFixed(2)),pv=parseFloat((p>=0.3?p*3.6:0).toFixed(2));
  const d=parseFloat((cv-pv).toFixed(2));
  if(d===0||Math.abs(d)<0.01)return'';
  return`<div class="sub ${d>0?'dn':'dp'}">${d>0?'+':'-'}${Math.abs(d)}</div>`;
}
function dDist(c,p,isDesc){
  c=parseFloat(c)||0;p=parseFloat(p)||0;
  const d=parseFloat((c-p).toFixed(2));
  if(d===0||Math.abs(d)<0.01)return'';
  const cls=isDesc?'dg':(d>0?'dn':'dp');
  const st=isDesc?' style="opacity:0.2"':'';
  return'<div class="sub '+cls+'"'+st+'>'+(d>0?'+':'-')+Math.abs(d).toFixed(2)+' km</div>';
}
function _fmtPrimeDelta(secs){var sign=secs>0?'+':'-';var a=Math.abs(secs),m=Math.floor(a/60),s=Math.round((a-m*60)*10)/10;var sI=Math.floor(s),sD=Math.round(s*10)%10;var sFmt=(m>0?(sI<10?'0':'')+sI:sI)+(sD?'.'+sD:'');return sign+(m>0?m+'′'+sFmt+'″':sFmt+'″');}
function dDescansoKmh(c,p){
  if(!c&&!p)return'';
  const cv=parseFloat((c>0?c*3.6:0).toFixed(2)),pv=parseFloat((p>0?p*3.6:0).toFixed(2));
  const d=parseFloat((cv-pv).toFixed(2));
  if(d===0||Math.abs(d)<0.01)return'';
  return'<div class="sub dg" style="opacity:0.2">'+(d>0?'+':'-')+Math.abs(d)+'</div>';
}
function dDescansoRitmo(c,p){
  if(!c||!p)return'';
  var rc=_ritmoDispSecs(c),rp=_ritmoDispSecs(p);
  if(!rc||!rp)return'';
  var diff=Math.round((rc-rp)*10)/10;
  if(Math.abs(diff)<0.05)return'';
  return'<div class="sub dg" style="opacity:0.2">'+_fmtPrimeDelta(diff)+'</div>';
}
function dDescansoFC(c,p){
  const cur=c>0?c:0;
  const ref=p>0?p:0;
  if(!cur&&!ref)return'';
  const d=c-p;
  if(d===0||Math.abs(d)<0.1)return'';
  return'<div class="sub dg" style="opacity:0.2">'+(d>0?'+':'-')+Math.abs(d)+'</div>';
}
function dDescansoTimeSecs(cur,ref,dec){dec=dec||1;var c=_timeDispSecs(cur,dec),r=_timeDispSecs(ref,dec);if(!c||!r)return'';var d=Math.round((c-r)*10)/10;if(Math.abs(d)<0.05)return'';return'<div class="sub dg" style="opacity:0.2">'+_fmtPrimeDelta(d)+'</div>';}
function _dCadRaw(c,p){
  var d=c-p; if(d===0||Math.abs(d)<0.1)return'';
  return'<div class="sub '+(d>0?'dn':'dp')+'">'+(d>0?'+':'-')+Math.abs(d)+'</div>';
}
function dRitmo(c,p){
  var rc=_ritmoDispSecs(c),rp=_ritmoDispSecs(p);
  if(!rc||!rp)return'';
  var diff=Math.round((rc-rp)*10)/10;
  if(Math.abs(diff)<0.05)return'';
  return`<div class="sub ${diff<0?'dn':'dp'}">${_fmtPrimeDelta(diff)}</div>`;
}
function dFC(c,p){
  const d=c-p;
  if(d===0||Math.abs(d)<0.1)return'';
  return`<div class="sub ${d>0?'dp':'dn'}">${d>0?'+':'-'}${Math.abs(d)}</div>`;
}
function _dPotencia(val,ref){if(!ref||!val)return'';var d=Math.round(val-ref);if(!d)return'';var cls=d>0?'dn':'dp';return'<div class="sub '+cls+'">'+(d>0?'+':'')+d+' W</div>';}
function dSpeedMax(c,p){if(!c||!p||c<0.3||p<0.3)return'';var cv=parseFloat((c*3.6).toFixed(2)),pv=parseFloat((p*3.6).toFixed(2));var d=parseFloat((cv-pv).toFixed(2));if(Math.abs(d)<0.01)return'';return'<div class="sub '+(d>0?'dn':'dp')+'">'+(d>0?'+':'')+d+'</div>';}
function dTimeSecs(cur,ref,dec){dec=dec||1;var c=_timeDispSecs(cur,dec),r=_timeDispSecs(ref,dec);if(!c||!r)return'';var d=Math.round((c-r)*10)/10;if(Math.abs(d)<0.05)return'';return'<div class="sub '+(d>0?'dp':'dn')+'">'+_fmtPrimeDelta(d)+'</div>';}
function elevHtml(v){
  var n=parseInt(v)||0;
  if(n===0)return'';
  return n>0?`<div class="elev dp">▲ +${n}m</div>`:`<div class="elev dn">▼ ${Math.abs(n)}m</div>`;
}
function dElev(v,p,isDesc){
  var n=parseInt(v)||0,prev=parseInt(p)||0;
  var d=n-prev;
  if(d===0)return'';
  var cls=isDesc?'dg':(d>0?'dp':'dn');
  var st=isDesc?' style="opacity:0.2"':'';
  return d>0?'<div class="elev '+cls+'"'+st+'>▲ +'+d+'m</div>':'<div class="elev '+cls+'"'+st+'>▼ '+Math.abs(d)+'m</div>';
}
function distElevHtml(distDelta,elevDelta,actualElev,hasRef){
  if(hasRef)return (distDelta||'')+(elevDelta||(!distDelta?elevHtml(actualElev):''));
  return elevHtml(actualElev);
}
function _zonaNum(z){return parseInt((z.nombre||'').replace(/\D/g,''))||0;}
function _renderZoneFallback(zCell, mergedZones){
  var totalM=mergedZones.reduce(function(a,z){return a+z.secs;},0);
  var zoneHtml='<td class="td-zona"><div class="zone-mini" style="display:flex;flex-direction:column;justify-content:center;align-items:stretch;text-align:left;min-width:110px;height:105px">';
  mergedZones.sort(function(a,b){return b.secs-a.secs;}).forEach(function(z){
    var pct=Math.round(z.secs/totalM*100);
    var tStr=secsToStepStr(Math.round(z.secs),0);
    var col=z.color||'#666';
    var short=z.nombre.match(/\d/)?'Z'+z.nombre.match(/\d/)[0]:'Z?';
    zoneHtml+='<div class="zone-mini-item" style="margin-bottom:4px">'
      +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">'
      +'<span class="zone-mini-short" style="font-size:8px;color:'+col+';font-weight:700;letter-spacing:.3px">'+short+'</span>'
      +'<span class="zone-mini-value" style="font-size:7.5px;color:#ccc;padding-left:6px">'+tStr+'<span style="color:#555"> · '+pct+'%</span></span>'
      +'</div>'
      +'<div class="zone-mini-track" style="height:3px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden">'
      +'<div style="height:100%;width:'+pct+'%;background:'+col+';border-radius:3px"></div></div></div>';
  });
  zoneHtml+='</div></td>';
  zCell.outerHTML=zoneHtml;
}
function zonaCellHtml(zonas_lap, fullSet){
  if(!zonas_lap||!zonas_lap.length)return'<td class="td-zona" style="color:#333;text-align:center">—</td>';
  const total=Math.round(zonas_lap.reduce((a,z)=>a+z.secs,0));
  if(total===0)return'<td class="td-zona" style="color:#333;text-align:center">—</td>';
  if(fullSet){
    const byNum={};
    zonas_lap.forEach(z=>{
      const zEntry=ZONA_META[z.nombre]||ZONA_META[_normZonaNombre(z.nombre)]||{};
      byNum[zEntry.num||_zonaNum(z)]=z;
    });
    const zs=ZONA_GARMIN.slice().sort((a,b)=>b.num-a.num);
    const items=zs.map((zg,i)=>{
      const z=byNum[zg.num];
      const secs=z?Math.round(z.secs):0;
      const pct=secs?Math.round(secs/total*100):0;
      const timeStr=secs?secsToStepStr(secs,0):'0:00';
      const col=z?zonaColor(z.nombre)||z.color:zg.color;
      const last=i===zs.length-1;
      const dimmed=!secs;
      const dimStyle=dimmed?'height:0;overflow:hidden;margin:0;padding:0;border:none;opacity:0':(last?'':'margin-bottom:4px');
      return`<div class="zone-mini-item" style="${dimStyle}">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
          <span class="zone-mini-short" style="font-size:8px;color:${col};font-weight:700;letter-spacing:.3px">Z${zg.num}</span>
          <span class="zone-mini-value" style="font-size:7.5px;color:#ccc;padding-left:6px">${timeStr}${secs?`<span style="color:#555"> · ${pct}%</span>`:''}</span>
        </div>
        <div class="zone-mini-track" style="height:3px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${col};border-radius:3px"></div>
        </div>
      </div>`;
    }).join('');
    return`<td class="td-zona">
      <div class="zone-mini" style="display:flex;flex-direction:column;justify-content:center;align-items:stretch;text-align:left;min-width:110px;height:105px">${items}</div>
    </td>`;
  }
  const activas=zonas_lap.filter(z=>z.secs>0).sort((a,b)=>_zonaNum(b)-_zonaNum(a));
  const items=activas.map((z,i)=>{
    const secs=Math.round(z.secs);
    const pct=Math.round(secs/total*100);
    const timeStr=secsToStepStr(secs,0);
    var zEntry=ZONA_META[z.nombre]||ZONA_META[_normZonaNombre(z.nombre)]||{};
    const short='Z'+(zEntry.num||z.nombre.match(/\d/)||'?');
    const col=zonaColor(z.nombre)||z.color;
    const last=i===activas.length-1;
    return`<div class="zone-mini-item" style="${last?'':'margin-bottom:4px'}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2px">
        <span class="zone-mini-short" style="font-size:8px;color:${col};font-weight:700;letter-spacing:.3px">${short}</span>
        <span class="zone-mini-value" style="font-size:7.5px;color:#ccc;padding-left:6px">${timeStr}<span style="color:#555"> · ${pct}%</span></span>
      </div>
      <div class="zone-mini-track" style="height:3px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${col};border-radius:3px"></div>
      </div>
    </div>`;
  }).join('');
  return`<td class="td-zona">
    <div class="zone-mini" style="display:block;text-align:left;min-width:110px">${items}</div>
  </td>`;
}

function _renderZonesSideBySide(labelSes,zlistSes,labelSer,zlistSer){
  var totSes=zlistSes.reduce(function(a,z){return a+z.secs;},0);
  var totSer=zlistSer.reduce(function(a,z){return a+z.secs;},0);
  var all={};
  zlistSes.concat(zlistSer).forEach(function(z){all[z.nombre]=1;});
  var sorted=Object.keys(all).sort(function(a,b){
    var na=parseInt(a.replace(/\D/g,''))||0,nb=parseInt(b.replace(/\D/g,''))||0;
    return nb-na;
  });
  if(!sorted.length)return'';
  var hdrStyle='font-size:10px;font-weight:700;color:#8a9aa6;letter-spacing:.5px;text-transform:uppercase';
  function miniRow(z,tot){
    if(!z||!z.secs||z.secs<=0)return'';
    var secs=Math.round(z.secs);
    var pct=Math.round(secs/Math.round(tot)*100);
    var timeStr=secsToStepStr(secs,0);
    var col=zonaColor(z.nombre)||z.color;
    var range=z.rango||zonaRange(z.nombre);
    return'<div class="zone-lbl" style="margin-bottom:5px">'
      +'<div class="zone-name-wrap"><div class="zone-dot" style="background:'+col+'"></div>'
      +'<span class="zone-name">'+zonaDisplay(z.nombre)+'</span>'
      +(range?'<span class="zone-range">'+range+'</span>':'')
      +'</div>'
      +'<span class="zone-stat"><span class="zone-time-main">'+timeStr+'</span>'
      +'<span class="zone-pct-sub"> · '+pct+'%</span></span>'
      +'</div>'
      +'<div class="bar"><div class="bi" style="width:'+pct+'%;background:'+col+'"></div></div>';
  }
  var h='<div class="zones-dual">'
    +'<div style="display:flex;gap:24px;margin-bottom:16px">'
    +'<div style="flex:1;min-width:0;width:50%"><span style="'+hdrStyle+'">'+labelSes+'</span></div>'
    +'<div style="flex:1;min-width:0;width:50%"><span style="'+hdrStyle+'">'+labelSer+'</span></div>'
    +'</div>';
  sorted.forEach(function(nm){
    var zSes=zlistSes.filter(function(z){return z.nombre===nm;})[0];
    var zSer=zlistSer.filter(function(z){return z.nombre===nm;})[0];
    h+='<div class="zone-row" style="display:flex;gap:24px">'
      +'<div style="flex:1;min-width:0;width:50%">'+miniRow(zSes,totSes)+'</div>'
      +'<div style="flex:1;min-width:0;width:50%">'+miniRow(zSer,totSer)+'</div>'
      +'</div>';
  });
  h+='</div>';
  return h;
}
function _renderZoneBlockGlobal(label,zlist){
  var tot=zlist.reduce(function(a,z){return a+z.secs;},0);
  if(!zlist.length||!tot)return'';
  var h='<div style="margin-bottom:8px"><span style="font-size:9px;font-weight:700;color:#454a55;letter-spacing:.8px;text-transform:uppercase">'+label+'</span></div>';
  var sorted=zlist.slice().sort(function(a,b){
    function n(x){return parseInt(x.nombre.replace(/\D/g,''))||0;}
    return n(b)-n(a);
  });
  sorted.filter(function(z){return z.secs>0;}).forEach(function(z){
    var secs=Math.round(z.secs);
    var pct=Math.round(secs/Math.round(tot)*100);
    var timeStr=secsToStepStr(secs,0);
    var col=zonaColor(z.nombre)||z.color;
    var range=z.rango||zonaRange(z.nombre);
    h+='<div class="zone-row">'
      +'<div class="zone-lbl">'
      +'<div class="zone-name-wrap"><div class="zone-dot" style="background:'+col+'"></div>'
      +'<span class="zone-name">'+zonaDisplay(z.nombre)+'</span>'
      +(range?'<span class="zone-range">'+range+'</span>':'')
      +'</div>'
      +'<span class="zone-stat"><span class="zone-time-main">'+timeStr+'</span>'
      +'<span class="zone-pct-sub"> · '+pct+'%</span></span>'
      +'</div>'
      +'<div class="bar"><div class="bi" style="width:'+pct+'%;background:'+col+'"></div></div>'
      +'</div>';
  });
  return h;
}
function aggregateZones(rows){
  const map={};
  rows.forEach(r=>{
    (r.zonas_lap||[]).forEach(z=>{
      if(!map[z.nombre])map[z.nombre]={...z,secs:0};
      map[z.nombre].secs+=z.secs;
    });
  });
  return Object.values(map).filter(z=>z.secs>0);
}

/* ── TOGGLE GROUP ── */
function _toggleGroup(groupId){
  var header=document.getElementById(groupId);
  if(!header){_DB('GROUP','_toggleGroup: header not found id='+groupId);return;}
  var arrow=header.querySelector('.group-arrow');
  var next=header.nextElementSibling;
  var collapsed=arrow&&arrow.classList.contains('collapsed');
  _DB('GROUP','_toggleGroup id='+groupId+' collapsed='+collapsed+' -> '+(collapsed?'expand':'collapse'));
  while(next&&(next.classList.contains('group-lap'))){
    next.style.display=collapsed?'':'none';
    next=next.nextElementSibling;
  }
  if(arrow)arrow.classList.toggle('collapsed');
}

/* ── PHASE FILTER ── */
function _setPhaseFilter(actId, phase){
  _DB('PHASE', 'enter actId='+actId+' phase='+phase);
  var bar=document.querySelector('.phase-filter-bar[data-actid="'+actId+'"]');
  if(!bar){_DB('PHASE', 'NO BAR for '+actId);return;}
  bar.querySelectorAll('.phase-pill').forEach(function(p){p.classList.remove('active');});
  var act=document.getElementById('act-'+actId);
  if(!act){_DB('PHASE', 'NO act-'+actId);return;}
  if(phase==='all'){
    act.querySelectorAll('tbody tr.row-hidden').forEach(function(tr){tr.classList.remove('row-hidden');});
    act.querySelectorAll('tbody tr[style*="display: none"]').forEach(function(tr){tr.style.display='';});
    _DB('PHASE', 'phase=all done');
    return;
  }
  var activePill=bar.querySelector('.phase-pill[data-phase="'+phase+'"]');
  if(activePill)activePill.classList.add('active');
  var tbody=act.querySelector('tbody');
  if(!tbody){_DB('PHASE', 'NO tbody');return;}
  var rows=tbody.children;
  var currentPhase=null;
  var visibleCount=0, totalCount=0;
  for(var i=0;i<rows.length;i++){
    var tr=rows[i];
    var cls=tr.classList||[];
    if(cls.contains('phase-header')){
      var lbl=(tr.getAttribute('data-lbl')||'').toLowerCase();
      if(lbl.indexOf('calentamiento')>=0) currentPhase='warmup';
      else if(lbl.indexOf('enfriamiento')>=0||lbl.indexOf('recuperación')>=0) currentPhase='cooldown';
      else currentPhase=null;
    } else if(cls.contains('group-header')){
      currentPhase='main';
    } else if(cls.contains('avg-row')||cls.contains('avg-act')){
      tr.style.display='';
      continue;
    } else {
      if(cls.contains('warmup-row')){ currentPhase='warmup'; }
      else if(cls.contains('cooldown-row')){ currentPhase='cooldown'; }
      else {
        var rlbl=(tr.getAttribute('data-lbl')||'').toLowerCase();
        if(rlbl.indexOf('calentamiento')>=0) currentPhase='warmup';
        else if(rlbl.indexOf('carrera')>=0) currentPhase='main';
        else if(rlbl.indexOf('enfriamiento')>=0||rlbl.indexOf('recuperación')>=0) currentPhase='cooldown';
      }
    }
    if(currentPhase===phase){ tr.style.display=''; visibleCount++; }
    else tr.style.display='none';
    totalCount++;
  }
  _DB('PHASE', 'result phase='+phase+' visible='+visibleCount+'/'+totalCount+' rows='+rows.length+' trIds='+Array.from(rows).map(function(r){return r.id+'['+(r.style.display==='none'?'H':'-')+']';}).join(','));
}
/* ── LAP HELPERS (module-level for iOS Safari compat) ── */
var _actId='';
var _rowIdx=0;
function _lapDurSecs(row){
  // Priority: use explicit duration field first (from .fit direct)
  if(row.dur_secs&&row.dur_secs>0)return Math.round(row.dur_secs);
  if(row.duration&&row.duration>0)return Math.round(row.duration);
  // If no explicit duration but we have speed, DON'T calc - just return null
  // (let the UI show -- instead of wrong calculated values)
  return null;
}

function _hideRow(rowId,actId){
  var el=document.getElementById(rowId);
  if(!el)return;
  el.classList.add('row-hidden');
  var aw=document.getElementById('act-'+actId);
  var key=el.getAttribute('data-hide-key');
  _rememberHiddenKeys(key?[key]:[]);
  _pushHide(actId,[rowId],el.getAttribute('data-lbl')||'Vuelta',{dur:parseInt(el.getAttribute('data-dur')||0),speed:parseFloat(el.getAttribute('data-speed')||0),sport:(aw?aw.getAttribute('data-sport'):null)||'RUN',keys:key?[key]:[]});
  if(_lastParsedList){_reRenderCompact();return;}
  _recalcAvgRows(actId);
}
function _hideBtn(idx){
  var rowId=_actId+'r'+idx;
  var aid=_actId;
  var swallow='event.stopPropagation();';
  var swallowPd='onpointerdown="event.stopPropagation()" onmousedown="event.stopPropagation()" ontouchstart="event.stopPropagation()"';
  return '<span class="lap-row-actions">'
        +'<button class="hide-btn" '+swallowPd+' onclick="'+swallow+'_hideRow(\''+rowId+'\',\''+aid+'\')" title="Ocultar fila">✕</button>'
        +'<button class="lap-extract-btn" '+swallowPd+' onclick="'+swallow+'_extractFromGroup(\''+rowId+'\',\''+aid+'\')" title="Sacar del grupo">↤</button>'
         +'<button class="lap-up-btn" '+swallowPd+' onclick="'+swallow+'_moveUpInGroup(\''+rowId+'\',\''+aid+'\')" title="Subir vuelta">↥</button>'
         +'<button class="lap-down-btn" '+swallowPd+' onclick="'+swallow+'_moveDownInGroup(\''+rowId+'\',\''+aid+'\')" title="Bajar vuelta">↧</button>'
        +'</span>';
}
// Normalizar etiquetas de warmup/cooldown a español
function _normLabel(label){
  if(!label)return label;
  var l=label.trim();
  if(/^(cooldown|cool.?down|enfriamiento)$/i.test(l))return'Enfriamiento';
  if(/^(recovery|vuelta.?calma)$/i.test(l))return'Recuperación';
  if(/^(warmup|warm.?up|calentamiento)$/i.test(l))return'Calentamiento';
  if(/^(rest|rec\s*\d*|recuperaci[oó]n\s*\d*)$/i.test(l)){
    return'Descanso';
  }
  return l;
}
var _descansoRe=/descanso|recuperaci[oó]n|rec\s*\d|rest\b|calentamiento|warmup|cooldown|enfriamiento/i;
function _isDescanso(s){
  // Check label AND _intensityType
  var labelMatch=_descansoRe.test(s.label||'');
  var intensityMatch=s._intensityType==='REST'||s._intensityType==='RECOVERY';
  return labelMatch||intensityMatch;
}

function _classifyLapByFC(lap){
  if(!lap||!window.customHRZonesActive||!window.customHRZones||window.customHRZones.length!==5)return false;
  if(lap.zonas_lap&&lap.zonas_lap.length>0)return false;
  var fc=lap.fc_med; if(!fc||fc<=0)return false;
  var dur=lap.dur_secs||Math.round((lap.dist_km||0)*1000/(lap.speed||1)); if(!dur)return false;
  var ZN=['Zona 1 · Calentamiento','Zona 2 · Suave','Zona 3 · Aeróbica','Zona 4 · Umbral','Zona 5 · Máximo'];
  var ZC=['#a0a0a0','#4a90e2','#27ae60','#f39c12','#e74c3c'];
  for(var i=0;i<5;i++){
    var zMin=i===0?0:window.customHRZones[i].min;
    var zMax=window.customHRZones[i].max;
    if(fc>=zMin&&fc<=zMax){
      lap.zonas_lap=[{nombre:ZN[i],secs:dur,rango:zMin+'-'+zMax+' ppm',color:ZC[i]}];
      return true;
    }
  }
  return false;
}

function _distributeZones(lap,zonaRef,fcMin,fcMax,fcRange){
  if(!lap)return;
  if(lap.zonas_lap&&lap.zonas_lap.length>0)return;
  if(_classifyLapByFC(lap))return; // zonas custom: clasificar por FC media directamente
  var dur=lap.dur_secs||Math.round(lap.dist_km*1000/(lap.speed||1));
  var tot=zonaRef.reduce(function(a,z){return a+z.secs;},0);
  if(!tot){lap.zonas_lap=[];return;}
  // FC factor: 0=FC mínima de sesión, 1=FC máxima
  var fcFactor=lap.fc_med>0?(lap.fc_med-fcMin)/(fcRange||1):0.5;
  // Clamp between 0 y 1
  fcFactor=Math.max(0,Math.min(1,fcFactor));
  lap.zonas_lap=zonaRef.filter(function(z){return z.secs>0;}).map(function(z){
    var zNum=parseInt(z.nombre.replace(/\D/g,''))||3;
    var basePct=z.secs/tot;
    // Para cada zona, calcular peso según FC del lap
    // Z5: solo existe si FC muy alta. Z1: solo si FC muy baja.
    var adjPct;
    if(zNum===5){
      // Z5: sube exponencialmente con FC alta
      adjPct=basePct*Math.pow(fcFactor,0.5)*2.5;
    } else if(zNum===4){
      // Z4: máximo en FC media-alta
      adjPct=basePct*(0.4+fcFactor*1.2);
    } else if(zNum===3){
      // Z3: relativamente estable, ligero pico en FC media
      adjPct=basePct*(0.7+fcFactor*0.6);
    } else if(zNum===2){
      // Z2: más presente en FC media-baja
      adjPct=basePct*(1.8-fcFactor*1.2);
    } else {
      // Z1: solo en FC muy baja
      adjPct=basePct*Math.pow(1-fcFactor,0.8)*3;
    }
    return{nombre:z.nombre,secs:Math.max(0,Math.round(adjPct*dur)),rango:z.rango||'',color:z.color};
  }).filter(function(z){return z.secs>0;});
  // Renormalizar para que sumen exactamente dur
  var s=lap.zonas_lap.reduce(function(a,z){return a+z.secs;},0);
  if(s>0&&s!==dur){var sc=dur/s;lap.zonas_lap.forEach(function(z){z.secs=Math.round(z.secs*sc);});}
}

/* ── HIDE / RESTORE STACK ── */
window._hideStack=window._hideStack||[];
function _pushHide(actId,rowIds,label,meta){
  var id=Date.now()+'-'+Math.random().toString(36).slice(2,6);
  window._hideStack.push({id:id,actId:actId,rowIds:rowIds.slice(),label:label,meta:meta||{}});
}
function _restoreOp(opId){
  var stack=window._hideStack||[];
  var idx=-1;
  for(var i=0;i<stack.length;i++){if(stack[i].id===opId){idx=i;break;}}
  if(idx<0)return;
  var op=stack[idx];
  stack.splice(idx,1);
  _forgetHiddenKeys(op.meta&&op.meta.keys);
  if(_lastParsedList){_reRenderCompact();return;}
  op.rowIds.forEach(function(rid){var el=document.getElementById(rid);if(el){el.classList.remove('row-hidden');el.style.display='';}});
  _recalcAvgRows(op.actId);
}
function _undoLastHide(){
  var stack=window._hideStack||[];
  if(!stack.length)return;
  _restoreOp(stack[stack.length-1].id);
}
function _toggleRestorePanel(actId){
  var p=document.getElementById(actId+'-restore-panel');
  if(p)p.style.display=p.style.display==='none'?'':'none';
}
function _fmtSecs(s){if(!s||!isFinite(s))return'';s=Math.round(s);var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;if(h>0)return h+'h'+(m>0?m+'m':'');return m+':'+('0'+sc).slice(-2);}
function _fmtOpDetail(op){if(!op||!op.meta)return'';var parts=[];if(op.meta.dur>0)parts.push(_fmtSecs(op.meta.dur));if(op.meta.speed>=0.01){var sport=op.meta.sport||'RUN';if(sport==='RUN'){var r=toRitmo(op.meta.speed);if(r)parts.push(r+' /km');}else{var k=toKmh(op.meta.speed);if(k)parts.push(k+' km/h');}}return parts.join(' · ');}
function _refreshActRestoreBar(actId){
  var stack=window._hideStack||[];
  var ops=stack.filter(function(op){return op.actId===actId;});
  var el=document.getElementById(actId+'-restore');
  if(!el)return;
  if(!ops.length){el.style.display='none';return;}
  el.style.display='';
  var cl=document.getElementById(actId+'-restore-count');
  if(cl)cl.textContent=ops.length+(ops.length===1?' acción':' acciones')+' oculta'+(ops.length===1?'':'s');
  var panel=document.getElementById(actId+'-restore-panel');
  if(!panel)return;
  panel.innerHTML=ops.slice().reverse().map(function(op,i){
    var num=ops.length-i;
    var detail=_fmtOpDetail(op);
    return'<div class="restore-item" onclick="event.stopPropagation();_restoreOp(\''+op.id+'\')"><span class="restore-num">'+num+'.</span><span class="restore-lbl">'+(op.label||'Vuelta')+'</span>'+(detail?'<span class="restore-detail">'+detail+'</span>':'')+'<span class="restore-one-btn">↩</span></div>';
  }).join('');
}
function _restoreAll(actId){
  var act=document.getElementById('act-'+actId);
  if(act){act.querySelectorAll('tbody tr.row-hidden').forEach(function(tr){tr.classList.remove('row-hidden');tr.style.display='';});act.querySelectorAll('.group-arrow.collapsed').forEach(function(a){a.classList.remove('collapsed');});}
  var removed=[];
  window._hideStack=(window._hideStack||[]).filter(function(op){
    if(op.actId===actId){removed=removed.concat(op.meta&&op.meta.keys||[]);return false;}
    return true;
  });
  _forgetHiddenKeys(removed);
  if(_lastParsedList){_reRenderCompact();return;}
  _recalcAvgRows(actId);
}
if(!window._hideUndoHandlerSet){
  window._hideUndoHandlerSet=true;
  document.addEventListener('keydown',function(e){
    if((e.metaKey||e.ctrlKey)&&e.key==='z'&&!e.shiftKey){
      var t=e.target||{};if(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)return;
      e.preventDefault();_undoLastHide();
    }
  });
  document.addEventListener('click',function(e){
    document.querySelectorAll('.restore-panel').forEach(function(p){
      if(p.style.display!=='none'){var bar=p.parentElement;if(!bar||!bar.contains(e.target))p.style.display='none';}
    });
  },true);
}
/* ── EDITABLE DISTANCE / PACE HANDLERS ── */
function _onDistEdit(input, actId){
  try {
    var newVal = parseFloat(input.value);
    var field = input.closest('.stat-editable').getAttribute('data-field');
    var adj = _loadAdj(actId) || {};
    if(isNaN(newVal) || newVal <= 0){
      if(field === 'sesDist'){
        input.value = (adj.sesDist > 0) ? adj.sesDist.toFixed(2) : '';
      } else {
        input.value = (adj.serDist > 0) ? adj.serDist.toFixed(2) : '';
      }
      return;
    }
    if(field === 'sesDist'){
      adj.sesDist = newVal;
      if(!adj.sesPace){
        var act = document.getElementById('act-' + actId);
        if(act){
          var origDur = parseFloat(act.getAttribute('data-orig-dur')) || 0;
          if(origDur > 0) adj.sesPace = origDur / newVal;
        }
      }
    } else {
      adj.serDist = newVal;
      if(!adj.serPace){
        var act2 = document.getElementById('act-' + actId);
        if(act2){
          var origDurSer = parseFloat(act2.getAttribute('data-orig-dur-ser')) || 0;
          if(origDurSer > 0) adj.serPace = origDurSer / newVal;
        }
      }
    }
    _saveAdj(actId, adj);
    _recalcAdjust(actId);
  } catch(e) {
    console.error('ERROR _onDistEdit:', e);
  }
}
function _onPaceEdit(input, actId){
  var paceSecs = _paceStrToSecs(input.value);
  var field = input.closest('.stat-editable').getAttribute('data-field');
  var adj = _loadAdj(actId) || {};
  if(!paceSecs || paceSecs <= 0){
    if(field === 'sesPace'){
      input.value = adj.sesPace ? _secsToPaceStr(adj.sesPace) : '';
    } else {
      input.value = adj.serPace ? _secsToPaceStr(adj.serPace) : '';
    }
    return;
  }
  var act = document.getElementById('act-' + actId);
  if(!act) return;
  if(field === 'sesPace'){
    adj.sesPace = paceSecs;
    var origDur = parseFloat(act.getAttribute('data-orig-dur')) || 0;
    if(origDur > 0) adj.sesDist = origDur / paceSecs;
  } else {
    adj.serPace = paceSecs;
    var origDurSer = parseFloat(act.getAttribute('data-orig-dur-ser')) || 0;
    if(origDurSer > 0) adj.serDist = origDurSer / paceSecs;
  }
  _saveAdj(actId, adj);
  _recalcAdjust(actId);
}
function _onSpeedEdit(input, actId){
  var kmh = parseFloat(input.value);
  var field = input.closest('.stat-editable').getAttribute('data-field');
  var adj = _loadAdj(actId) || {};
  if(!kmh || kmh <= 0){
    if(field === 'sesSpd'){
      input.value = adj.sesDist ? (adj.sesDist * 1000 / (parseFloat((document.getElementById('act-'+actId)||{}).getAttribute('data-orig-dur'))||1) * 3.6).toFixed(2) : '';
    } else {
      input.value = adj.serDist ? (adj.serDist * 1000 / (parseFloat((document.getElementById('act-'+actId)||{}).getAttribute('data-orig-dur-ser'))||1) * 3.6).toFixed(2) : '';
    }
    return;
  }
  var act = document.getElementById('act-' + actId);
  if(!act) return;
  if(field === 'sesSpd'){
    var origDur = parseFloat(act.getAttribute('data-orig-dur')) || 0;
    if(origDur > 0){
      var speedMps = kmh / 3.6;
      adj.sesDist = speedMps * origDur / 1000;
      adj.sesPace = origDur / adj.sesDist;
    }
  } else {
    var origDurSer = parseFloat(act.getAttribute('data-orig-dur-ser')) || 0;
    if(origDurSer > 0){
      var speedMps2 = kmh / 3.6;
      adj.serDist = speedMps2 * origDurSer / 1000;
      adj.serPace = origDurSer / adj.serDist;
    }
  }
  _saveAdj(actId, adj);
  _recalcAdjust(actId);
}
function _recalcAdjust(actId){
  var act = document.getElementById('act-' + actId);
  if(!act){ return; }
  var adj = _loadAdj(actId) || {};
  var origDurSes = parseFloat(act.getAttribute('data-orig-dur')) || 0;
  var origDurSer = parseFloat(act.getAttribute('data-orig-dur-ser')) || 0;

  // 1) Actualizar inputs de chips
  if(adj.sesDist > 0){
    var sesDistInput = act.querySelector('[data-field="sesDist"] input');
    if(sesDistInput) sesDistInput.value = adj.sesDist.toFixed(2);
  }
  if(adj.sesPace){
    var sesPaceInput = act.querySelector('[data-field="sesPace"] input');
    if(sesPaceInput) sesPaceInput.value = _secsToPaceStr(adj.sesPace);
  }
  if(adj.serDist > 0){
    var serDistInput = act.querySelector('[data-field="serDist"] input');
    if(serDistInput) serDistInput.value = adj.serDist.toFixed(2);
  }
  if(adj.serPace){
    var serPaceInput = act.querySelector('[data-field="serPace"] input');
    if(serPaceInput) serPaceInput.value = _secsToPaceStr(adj.serPace);
  }
  if(adj.sesDist > 0 && origDurSes > 0){
    var sesSpdInput = act.querySelector('[data-field="sesSpd"] input');
    if(sesSpdInput) sesSpdInput.value = (adj.sesDist * 1000 / origDurSes * 3.6).toFixed(2);
  }
  if(adj.serDist > 0 && origDurSer > 0){
    var serSpdInput = act.querySelector('[data-field="serSpd"] input');
    if(serSpdInput) serSpdInput.value = (adj.serDist * 1000 / origDurSer * 3.6).toFixed(2);
  }

  // 2) Aplicar ajustes a celdas de resumen (usamos helper para re-aplicar tras _refreshAct)
  _applyAdjustToSummary(actId, adj, origDurSes, origDurSer);

  _DB('ADJ', 'about to call _refreshAct for actId='+actId);
  if(typeof window._refreshAct==='function') window._refreshAct(actId);

  // 3) Re-aplicar ajustes después de _refreshAct (que llama _recalcAvgRows y sobrescribe)
  _applyAdjustToSummary(actId, adj, origDurSes, origDurSer);
}

function _applyAdjustToSummary(actId, adj, origDurSes, origDurSer){
  var sesDistCell = document.getElementById(actId + 'ses-dist');
  var sesSpdCell = document.getElementById(actId + 'ses-spd');
  var sesPacCell = document.getElementById(actId + 'ses-pac');
  if(adj.sesDist > 0 && sesDistCell){
    var elevHtml = sesDistCell.innerHTML;
    var acumMatch = elevHtml.match(/<div class="elev[^>]*>.*?<\/div>/);
    var elevPart = acumMatch ? acumMatch[0] : '';
    sesDistCell.innerHTML = (adj.sesDist.toFixed(2) + ' km') + elevPart;
  }
  if(adj.sesDist > 0 && origDurSes > 0 && sesSpdCell){
    var newSpeedSes = adj.sesDist * 1000 / origDurSes;
    var kmh = (newSpeedSes * 3.6).toFixed(2) + ' km/h';
    var spdMain = sesSpdCell.querySelector('.main');
    if(spdMain) spdMain.textContent = kmh;
  }
  if(adj.sesPace > 0 && sesPacCell){
    var paceMain = sesPacCell.querySelector('.main');
    if(paceMain) paceMain.textContent = toRitmo(1000 / adj.sesPace);
  }
  var serDistCell = document.getElementById(actId + 'ser-dist');
  var serSpdCell = document.getElementById(actId + 'ser-spd');
  var serPacCell = document.getElementById(actId + 'ser-pac');
  if(adj.serDist > 0 && serDistCell){
    var elevHtml2 = serDistCell.innerHTML;
    var acumMatch2 = elevHtml2.match(/<div class="elev[^>]*>.*?<\/div>/);
    var elevPart2 = acumMatch2 ? acumMatch2[0] : '';
    var mainEl = serDistCell.querySelector('.main');
    if(mainEl){
      mainEl.textContent = adj.serDist.toFixed(2) + ' km';
    } else {
      serDistCell.innerHTML = '<div class="metric"><div class="main">' + adj.serDist.toFixed(2) + ' km</div>' + elevPart2 + '</div>';
    }
  }
  if(adj.serDist > 0 && origDurSer > 0 && serSpdCell){
    var newSpeedSer = adj.serDist * 1000 / origDurSer;
    var kmh2 = (newSpeedSer * 3.6).toFixed(2) + ' km/h';
    var spdMain2 = serSpdCell.querySelector('.main');
    if(spdMain2) spdMain2.textContent = kmh2;
  }
  if(adj.serPace > 0 && serPacCell){
    var paceMain2 = serPacCell.querySelector('.main');
    if(paceMain2) paceMain2.textContent = toRitmo(1000 / adj.serPace);
  }
}
/* ── INLINE LAP SPEED/PACE/DIST/TIME EDIT (click to edit, green indicator) ── */
/*
 * CRÍTICO: Usamos capture=true para que _onLapSpeedPaceClick se ejecute ANTES
 * del onclick="_toggleGroup(...)" inline en el <tr>. En fase bubble, el onclick
 * del TR ya se habría ejecutado antes de llegar a document.
 */
function _onLapSpeedPaceClick(e){
  var el=e.target.closest('.col-speed .main, .col-pace .main, .col-dist .main, .col-time .main');
  if(!el) return;
  var act=el.closest('.actividad');
  if(!act || !act.classList.contains('editing-on')) return;
  e.preventDefault(); e.stopPropagation();
  var tr=el.closest('tr');
  if(!tr) return;
  if(el.getAttribute('contenteditable')==='true') return;
  el.setAttribute('contenteditable','true');
  el.setAttribute('data-orig', el.textContent.trim());
  el.focus();
  var range=document.createRange();
  range.selectNodeContents(el);
  var sel=window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
function _onLapSpeedPaceBlur(e){
  var el=e.target;
  if(!el || el.getAttribute('contenteditable')!=='true') return;
  el.removeAttribute('contenteditable');
  var newVal=el.textContent.trim();
  var origVal=el.getAttribute('data-orig')||'';
  el.removeAttribute('data-orig');
  if(!newVal || newVal===origVal) return;
  var tr=el.closest('tr');
  if(!tr) return;
  var actId=tr.id?tr.id.replace(/(r\d+|g\d+|ses|ser|merge\d+)$/,''):'';
  if(!actId) return;
  var act=tr.closest('.actividad');
  var td=el.closest('td');
  var isSpeed=td.classList.contains('col-speed');
  var isPace=td.classList.contains('col-pace');
  var isDist=td.classList.contains('col-dist');
  var isTime=td.classList.contains('col-time');
  var oldSpeed=parseFloat(tr.getAttribute('data-speed'))||0;
  var oldDist=parseFloat(tr.getAttribute('data-dist'))||0;
  var oldDur=parseFloat(tr.getAttribute('data-dur'))||0;
  _DB('EDIT', '_onLapSpeedPaceBlur row='+tr.id+' oldSpeed='+oldSpeed+' oldDist='+oldDist+' oldDur='+oldDur+' newVal="'+newVal+'" isSpeed='+isSpeed+' isPace='+isPace+' isDist='+isDist+' isTime='+isTime);
  var parsedSpeed=0;
  var newDur=oldDur;
  if(isSpeed){
    var raw=newVal.replace(/[^\d.]/g,'');
    var kmh=parseFloat(raw);
    if(isNaN(kmh)||kmh<=0){ _DB('EDIT', 'invalid speed'); return; }
    parsedSpeed=kmh/3.6;
    newDur=oldDur;
  } else if(isPace){
    var secs=_paceStrToSecs(newVal);
    if(!secs||secs<=0){ _DB('EDIT', 'invalid pace'); return; }
    parsedSpeed=1000/secs;
    newDur=oldDur;
  } else if(isDist){
    var raw=newVal.replace(/[^\d.]/g,'');
    var km=parseFloat(raw);
    if(isNaN(km)||km<=0||oldDur<=0){ _DB('EDIT', 'invalid dist'); return; }
    parsedSpeed=km*1000/oldDur;
    newDur=oldDur;
  } else if(isTime){
    var secs=_timeStrToSecs(newVal);
    if(!secs||secs<=0){ _DB('EDIT', 'invalid time'); return; }
    newDur=secs;
    if(oldSpeed>0){
      parsedSpeed=oldSpeed;
    } else {
      parsedSpeed=oldDist>0?oldDist*1000/secs:0;
    }
  }
  if(parsedSpeed<=0){ _DB('EDIT', 'parsedSpeed <=0, return'); return; }
  _DB('EDIT', 'parsedSpeed='+parsedSpeed+' newDur='+newDur);
  tr.setAttribute('data-speed',parsedSpeed);
  tr.setAttribute('data-dur',newDur);
  var newDist=newDur>0?Math.round(parsedSpeed*newDur/1000*1000)/1000:0;
  tr.setAttribute('data-dist',newDist);
  var spdMain=tr.querySelector('.col-speed .main');
  var paceMain=tr.querySelector('.col-pace .main');
  var distMain=tr.querySelector('.col-dist .main');
  var timeMain=tr.querySelector('.col-time .main');
  if(spdMain) spdMain.textContent=toKmh(parsedSpeed)+' km/h';
  if(paceMain) paceMain.textContent=toRitmo(parsedSpeed);
  if(distMain) distMain.textContent=newDist.toFixed(2);
  if(timeMain){
    var isMoto=act.getAttribute('data-sport')==='MOTO';
    timeMain.textContent=secsToStepStr(newDur,isMoto?3:1);
  }
  var cls=tr.className||'';
  _DB('EDIT', 'cls='+cls+' isHeader='+(cls.indexOf('group-header')>=0||cls.indexOf('phase-header')>=0));
  if(cls.indexOf('group-header')>=0||cls.indexOf('phase-header')>=0){
    _scaleGroupChildren(tr, parsedSpeed, oldSpeed);
  } else {
    _recalcParentHeader(tr);
  }
  _recalcAvgRows(actId);
  _DB('EDIT', 'calling _refreshAct for actId='+actId);
  if(typeof window._refreshAct==='function') window._refreshAct(actId);
  _DB('EDIT', '_onLapSpeedPaceBlur DONE');
}
function _getGroupChildren(headerTr){
  var children=[];
  var next=headerTr.nextElementSibling;
  while(next){
    var cls=next.className||'';
    if(cls.indexOf('group-header')>=0||cls.indexOf('phase-header')>=0||cls.indexOf('avg-row')>=0||cls.indexOf('avg-act')>=0) break;
    if(cls.indexOf('group-lap')>=0||cls.indexOf('group-boundary')>=0) children.push(next);
    next=next.nextElementSibling;
  }
  return children;
}
function _scaleGroupChildren(headerTr, newSpeed, oldSpeed){
  _DB('EDIT', '_scaleGroupChildren header='+headerTr.id+' ratio='+(oldSpeed>0?(newSpeed/oldSpeed).toFixed(4):'inf'));
  if(oldSpeed<=0||newSpeed<=0) return;
  var ratio=newSpeed/oldSpeed;
  var children=_getGroupChildren(headerTr);
  _DB('EDIT', '_scaleGroupChildren children='+children.length);
  children.forEach(function(child){
    var cSpd=parseFloat(child.getAttribute('data-speed'))||0;
    var cDur=parseFloat(child.getAttribute('data-dur'))||0;
    var cDist=parseFloat(child.getAttribute('data-dist'))||0;
    var newChildSpd=Math.round(cSpd*ratio*10000)/10000;
    var newChildDist=cDur>0?Math.round(newChildSpd*cDur/1000*1000)/1000:cDist*ratio;
    newChildDist=Math.round(newChildDist*1000)/1000;
    child.setAttribute('data-speed',newChildSpd);
    child.setAttribute('data-dist',newChildDist);
    var spdMain=child.querySelector('.col-speed .main');
    var paceMain=child.querySelector('.col-pace .main');
    var distMain=child.querySelector('.col-dist .main');
    if(spdMain) spdMain.textContent=toKmh(newChildSpd);
    if(paceMain) paceMain.textContent=toRitmo(newChildSpd);
    if(distMain) distMain.textContent=newChildDist.toFixed(2);
  });
}
function _getParentHeader(childTr){
  var prev=childTr.previousElementSibling;
  while(prev){
    var cls=prev.className||'';
    if(cls.indexOf('group-header')>=0||cls.indexOf('phase-header')>=0) return prev;
    if(cls.indexOf('avg-row')>=0||cls.indexOf('avg-act')>=0) break;
    prev=prev.previousElementSibling;
  }
  return null;
}
function _recalcParentHeader(childTr){
  var header=_getParentHeader(childTr);
  if(!header) return;
  var children=_getGroupChildren(header);
  if(!children.length) return;
  var totDur=0,totDist=0,ws=0;
  children.forEach(function(c){
    var d=parseFloat(c.getAttribute('data-dur'))||0;
    var s=parseFloat(c.getAttribute('data-speed'))||0;
    var dist=parseFloat(c.getAttribute('data-dist'))||0;
    totDur+=d; totDist+=dist;
    if(s>0&&d>0){ ws+=s*d; }
  });
  var avgSpd=totDur>0?ws/totDur:0;
  if(avgSpd<=0) return;
  header.setAttribute('data-speed',avgSpd);
  header.setAttribute('data-dist',totDur>0?Math.round(avgSpd*totDur/1000*1000)/1000:totDist);
  var spdMain=header.querySelector('.col-speed .main');
  var paceMain=header.querySelector('.col-pace .main');
  var distMain=header.querySelector('.col-dist .main');
  if(spdMain) spdMain.textContent=toKmh(avgSpd)+' km/h';
  if(paceMain) paceMain.textContent=toRitmo(avgSpd);
  if(distMain) distMain.textContent=(totDur>0?Math.round(avgSpd*totDur/1000*1000)/1000:totDist).toFixed(2);
}
function _timeStrToSecs(val){
  if(!val) return null;
  val=val.trim();
  if(val.indexOf(':')>=0){
    var parts=val.split(':');
    var h=0,m=0,s=0;
    if(parts.length===3){h=parseInt(parts[0])||0;m=parseInt(parts[1])||0;s=parseFloat(parts[2])||0;}
    else if(parts.length===2){m=parseInt(parts[0])||0;s=parseFloat(parts[1])||0;}
    return h*3600+m*60+s;
  }
  var n=parseFloat(val);
  if(isNaN(n)) return null;
  if(n<100) return n*60;
  return n;
}
function _getGroupChildren(headerTr){
  var children=[];
  var next=headerTr.nextElementSibling;
  while(next){
    var cls=next.className||'';
    if(cls.indexOf('group-header')>=0||cls.indexOf('phase-header')>=0||cls.indexOf('avg-row')>=0||cls.indexOf('avg-act')>=0) break;
    if(cls.indexOf('group-lap')>=0||cls.indexOf('group-boundary')>=0) children.push(next);
    next=next.nextElementSibling;
  }
  return children;
}
function _scaleGroupChildren(headerTr, newSpeed, oldSpeed){
  _DB('EDIT', '_scaleGroupChildren header='+headerTr.id+' ratio='+(oldSpeed>0?(newSpeed/oldSpeed).toFixed(4):'inf')+' children='+(_getGroupChildren(headerTr).length));
  if(oldSpeed<=0||newSpeed<=0) return;
  var ratio=newSpeed/oldSpeed;
  var children=_getGroupChildren(headerTr);
  children.forEach(function(child){
    var cSpd=parseFloat(child.getAttribute('data-speed'))||0;
    var cDur=parseFloat(child.getAttribute('data-dur'))||0;
    var cDist=parseFloat(child.getAttribute('data-dist'))||0;
    var newChildSpd=Math.round(cSpd*ratio*10000)/10000;
    var newChildDist=cDur>0?Math.round(newChildSpd*cDur/1000*1000)/1000:cDist*ratio;
    newChildDist=Math.round(newChildDist*1000)/1000;
    child.setAttribute('data-speed',newChildSpd);
    child.setAttribute('data-dist',newChildDist);
    var spdMain=child.querySelector('.col-speed .main');
    var paceMain=child.querySelector('.col-pace .main');
    var distMain=child.querySelector('.col-dist .main');
    if(spdMain) spdMain.textContent=toKmh(newChildSpd);
    if(paceMain) paceMain.textContent=toRitmo(newChildSpd);
    if(distMain) distMain.textContent=newChildDist.toFixed(2);
  });
}
function _getParentHeader(childTr){
  var prev=childTr.previousElementSibling;
  while(prev){
    var cls=prev.className||'';
    if(cls.indexOf('group-header')>=0||cls.indexOf('phase-header')>=0) return prev;
    if(cls.indexOf('avg-row')>=0||cls.indexOf('avg-act')>=0) break;
    prev=prev.previousElementSibling;
  }
  return null;
}
function _recalcParentHeader(childTr){
  _DB('EDIT', '_recalcParentHeader child='+childTr.id);
  var header=_getParentHeader(childTr);
  if(!header){ _DB('EDIT', 'no header found'); return; }
  var children=_getGroupChildren(header);
  if(!children.length){ _DB('EDIT', 'no children'); return; }
  var totDur=0,totDist=0,ws=0;
  children.forEach(function(c){
    var d=parseFloat(c.getAttribute('data-dur'))||0;
    var s=parseFloat(c.getAttribute('data-speed'))||0;
    var dist=parseFloat(c.getAttribute('data-dist'))||0;
    totDur+=d; totDist+=dist;
    if(s>0&&d>0){ ws+=s*d; }
  });
  var avgSpd=totDur>0?ws/totDur:0;
  if(avgSpd<=0){ _DB('EDIT', 'avgSpd<=0'); return; }
  header.setAttribute('data-speed',avgSpd);
  header.setAttribute('data-dist',totDur>0?Math.round(avgSpd*totDur/1000*1000)/1000:totDist);
  var spdMain=header.querySelector('.col-speed .main');
  var paceMain=header.querySelector('.col-pace .main');
  var distMain=header.querySelector('.col-dist .main');
  if(spdMain) spdMain.textContent=toKmh(avgSpd)+' km/h';
  if(paceMain) paceMain.textContent=toRitmo(avgSpd);
  if(distMain) distMain.textContent=(totDur>0?Math.round(avgSpd*totDur/1000*1000)/1000:totDist).toFixed(2);
  _DB('EDIT', '_recalcParentHeader DONE header='+header.id+' spd='+toKmh(avgSpd));
}
/* ── Label normalization (dedup hyphenated same-word labels) ── */
function _normalizeLabel(lbl){
  if(!lbl)return lbl;
  var parts=lbl.split('-');
  if(parts.length===2&&parts[0].trim().toLowerCase()===parts[1].trim().toLowerCase())return parts[0].trim();
  return lbl;
}
/* ── Inline label editing (click to rename, blur to save) ── */
document.addEventListener('click',function(e){
  var el=e.target.closest('.lap-label-edit');
  if(!el)return;
  var act=el.closest('.actividad');
  if(!act||!act.classList.contains('editing-on'))return;
  if(el.getAttribute('contenteditable')==='true')return;
  e.stopPropagation();
  el.setAttribute('contenteditable','true');
  el.setAttribute('data-orig',el.textContent.trim());
  el.focus();
  var range=document.createRange();
  range.selectNodeContents(el);
  var sel=window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
});
document.addEventListener('focusout',function(e){
  var el=e.target;
  if(!el||!el.classList.contains('lap-label-edit'))return;
  if(el.getAttribute('contenteditable')!=='true')return;
  el.removeAttribute('contenteditable');
  var newVal=el.textContent.trim();
  var origVal=el.getAttribute('data-orig')||'';
  el.removeAttribute('data-orig');
  if(!newVal||newVal===origVal)return;
  var normalized=_normalizeLabel(newVal);
  el.textContent=normalized;
  var tr=el.closest('tr');
  if(tr)tr.setAttribute('data-lbl',normalized);
});
document.addEventListener('click',_onLapSpeedPaceClick,true);
document.addEventListener('focusout',_onLapSpeedPaceBlur);
document.addEventListener('keydown',function(e){
  if(e.target && e.target.getAttribute('contenteditable')==='true'){
    if(e.key==='Enter'){e.preventDefault();e.target.blur();}
    if(e.key==='Escape'){e.target.textContent=e.target.getAttribute('data-orig')||'';e.target.blur();}
  }
});
/* ── Delegated checkbox handler (no preventDefault so native toggle works) ── */
document.addEventListener('change',function(e){
  var cb=e.target;
  if(!cb||cb.tagName!=='INPUT'||cb.type!=='checkbox'||!cb.classList.contains('lap-checkbox')) return;
  var tr=cb.closest('tr');
  if(!tr) return;
  var act=tr.closest('.actividad');
  if(!act) return;
  if(cb.checked) tr.classList.add('row-selected');
  else tr.classList.remove('row-selected');
  // When checking a group/phase header, also toggle all child sub-lap checkboxes
  if(tr.classList.contains('group-header')||tr.classList.contains('phase-header')){
    var next=tr.nextElementSibling;
    while(next){
      var nc=next.className||'';
      if(nc.indexOf('group-header')>=0||nc.indexOf('phase-header')>=0||nc.indexOf('avg-row')>=0||nc.indexOf('avg-act')>=0) break;
      if(nc.indexOf('group-lap')>=0||nc.indexOf('warmup-row')>=0||nc.indexOf('cooldown-row')>=0||nc.indexOf('group-boundary')>=0){
        var childCb=next.querySelector('.lap-checkbox');
        if(childCb&&childCb.checked!==cb.checked){
          childCb.checked=cb.checked;
          if(cb.checked) next.classList.add('row-selected');
          else next.classList.remove('row-selected');
        }
      }
      next=next.nextElementSibling;
    }
  }
  _updateSelectionUI(act);
});
function _recalcAvgRows(actId){
  _DB('RECALC', '_recalcAvgRows actId='+actId);
  var act=document.getElementById('act-'+actId);
  if(!act)return;
  var sport=act.getAttribute('data-sport')||'';
  var _isMoto=sport==='MOTO';
  var _isCyc=sport==='BICI';
  var _isInd=act.getAttribute('data-indoor')==='1';
  var _isContinua=act.getAttribute('data-continua')==='1';
  // Exclude auto group/phase/custom headers — they carry their own aggregated data-dur and would
  // otherwise be double-counted on top of their children.
  var allDataTrs=Array.from(act.querySelectorAll('tbody tr[data-dur]')).filter(function(tr){
    return !tr.classList.contains('group-header')
        && !tr.classList.contains('phase-header')
        && !tr.classList.contains('custom-group-header');
  });
  var trs=allDataTrs.filter(function(tr){return!tr.classList.contains('row-hidden');});
  _refreshActRestoreBar(actId);
  if(!trs.length)return;
  function gF(tr,a){return parseFloat(tr.getAttribute(a))||0;}
  function tw(rows,attr){var ws=0,ds=0;rows.forEach(function(tr){var d=gF(tr,'data-dur'),v=gF(tr,attr);if(v>0&&d>0){ws+=v*d;ds+=d;}});return ds>0?ws/ds:0;}
  function sumA(rows,a){return rows.reduce(function(s,tr){return s+gF(tr,a);},0);}
  function maxA(rows,a){var m=0;rows.forEach(function(tr){var v=gF(tr,a);if(v>m)m=v;});return m;}
  var allR=trs.filter(function(tr){return tr.getAttribute('data-res')!=='1';});
  if(!allR.length&&trs.length)allR=trs;
  function _isWarmupCooldownTr(tr){
    if(tr.classList.contains('warmup-row')||tr.classList.contains('cooldown-row')) return true;
    var lbl=tr.getAttribute('data-lbl')||'';
    return /^(calentamiento|warmup|enfriamiento|cooldown|recuperaci[oó]n)$/i.test(lbl);
  }
  var actR=allR.filter(function(tr){return tr.getAttribute('data-active')==='1'&&!_isWarmupCooldownTr(tr);});
  var totDur=sumA(allR,'data-dur'),actDur=sumA(actR,'data-dur');
  var totDist=sumA(allR,'data-dist'),actDist=sumA(actR,'data-dist');
  // Match initial render: "desnivel acumulado" = net (gain - loss) across visible rows.
  var totDsn=sumA(allR,'data-dsn'),actDsn=sumA(actR,'data-dsn');
  var sAll=allR.filter(function(tr){return gF(tr,'data-speed')>=0.01;}),sAct=actR.filter(function(tr){return gF(tr,'data-speed')>=0.01;});
  var avgSpdSes=sAll.length?tw(sAll,'data-speed'):0,avgSpdSer=sAct.length?tw(sAct,'data-speed'):0;
  var fAll=allR.filter(function(tr){return gF(tr,'data-fcm')>=1;}),fAct=actR.filter(function(tr){return gF(tr,'data-fcm')>=1;});
  var avgFCmSes=fAll.length?Math.round(tw(fAll,'data-fcm')):0,avgFCmSer=fAct.length?Math.round(tw(fAct,'data-fcm')):0;
  var xAll=allR.filter(function(tr){return gF(tr,'data-fcx')>0;}),xAct=actR.filter(function(tr){return gF(tr,'data-fcx')>0;});
  var avgFCxSes=xAll.length?Math.round(tw(xAll,'data-fcx')):0,avgFCxSer=xAct.length?Math.round(tw(xAct,'data-fcx')):0;
  var cAll=allR.filter(function(tr){return gF(tr,'data-cad')>0;}),cAct=actR.filter(function(tr){return gF(tr,'data-cad')>0;});
  var avgCadSes=cAll.length?Math.round(tw(cAll,'data-cad')):0,avgCadSer=cAct.length?Math.round(tw(cAct,'data-cad')):0;
  var pAll=allR.filter(function(tr){return gF(tr,'data-pow')>0;}),pAct=actR.filter(function(tr){return gF(tr,'data-pow')>0;});
  var avgPowSes=pAll.length?Math.round(tw(pAll,'data-pow')):0,avgPowSer=pAct.length?Math.round(tw(pAct,'data-pow')):0;
  var vmAll=allR.filter(function(tr){return gF(tr,'data-smax')>=0.3;}),vmAct=actR.filter(function(tr){return gF(tr,'data-smax')>=0.3;});
  var mSmaxSes=vmAll.length?tw(vmAll,'data-smax'):0,mSmaxSer=vmAct.length?tw(vmAct,'data-smax'):0;
  var dec=_isMoto?3:1;
  var _summaryIds=[actId+'ses-time',actId+'ses-cum',actId+'ser-time',actId+'ser-cum',actId+'ses-spd',actId+'ser-spd',actId+'ses-fcm',actId+'ser-fcm',actId+'ses-fcx',actId+'ser-fcx',actId+'ses-cad',actId+'ser-cad',actId+'ses-pac',actId+'ser-pac',actId+'ses-dist',actId+'ser-dist'];
  var _els={};_summaryIds.forEach(function(id){_els[id]=document.getElementById(id);});
  function upd(id,html){
    var el=_els[id];
    if(el) el.innerHTML=html;
  }
  function mc(s){return'<div class="metric"><div class="main">'+s+'</div></div>';}
  upd(actId+'ses-time',mc(totDur?secsToStepStr(totDur,dec):''));
  upd(actId+'ses-cum',mc(totDur?secsToStepStr(totDur,dec):''));
  upd(actId+'ser-time',mc(actDur?secsToStepStr(actDur,dec):''));
  upd(actId+'ser-cum',mc(actDur?secsToStepStr(actDur,dec):''));
  upd(actId+'ses-spd',mc(avgSpdSes>=0.01?toKmh(avgSpdSes)+' km/h':'—'));
  upd(actId+'ser-spd',mc(avgSpdSer>=0.01?toKmh(avgSpdSer)+' km/h':'—'));
  upd(actId+'ses-fcm',mc('<span class="fc-med-pill">'+(avgFCmSes||'—')+'</span>'));
  upd(actId+'ser-fcm',mc('<span class="fc-med-pill">'+(avgFCmSer||'—')+'</span>'));
  upd(actId+'ses-fcx',mc('<span class="fc-max-pill">'+(avgFCxSes||'—')+'</span>'));
  upd(actId+'ser-fcx',mc('<span class="fc-max-pill">'+(avgFCxSer||'—')+'</span>'));
  if(_isMoto||(_isCyc&&!_isInd)){
    upd(actId+'ses-cad',mc(mSmaxSes>=0.3?(mSmaxSes*3.6).toFixed(2)+' km/h':'—'));
    upd(actId+'ser-cad',mc(mSmaxSer>=0.3?(mSmaxSer*3.6).toFixed(2)+' km/h':'—'));
  } else {
    upd(actId+'ses-cad',mc(avgCadSes?String(avgCadSes):'—'));
    upd(actId+'ser-cad',mc(avgCadSer?String(avgCadSer):'—'));
  }
  if(_isCyc){
    upd(actId+'ses-pac',mc(avgPowSes?String(avgPowSes):'—'));
    upd(actId+'ser-pac',mc(avgPowSer?String(avgPowSer):'—'));
  } else if(!_isMoto){
    upd(actId+'ses-pac',mc(avgSpdSes>=0.1?toRitmo(avgSpdSes):'—'));
    upd(actId+'ser-pac',mc(avgSpdSer>=0.1?toRitmo(avgSpdSer):'—'));
  }
  function _elevAcumHtml(v){var n=Math.round(parseFloat(v)||0);if(!n)return'';return n>0?'<div class="elev dp">▲ +'+n+'m acum.</div>':'<div class="elev dn">▼ '+Math.abs(n)+'m acum.</div>';}
  if(_isContinua){
    upd(actId+'ses-dist',totDist.toFixed(2)+' km'+(totDsn!==0?' '+_elevAcumHtml(totDsn):''));
  } else {
    upd(actId+'ses-dist','<div class="metric"><div class="main">'+totDist.toFixed(2)+' km</div>'+_elevAcumHtml(totDsn)+'</div>');
    upd(actId+'ser-dist','<div class="metric"><div class="main">'+actDist.toFixed(2)+' km</div>'+_elevAcumHtml(actDsn)+'</div>');
  }
  // Update Zona FC cells of session/active rows by re-aggregating zones from visible data rows.
  // Pulled from data-zones (json) put on each data row by _dataRow.
  function _zonesFromRows(rows){
    var map={};
    rows.forEach(function(tr){
      var raw=tr.getAttribute('data-zones');
      if(!raw)return;
      try{
        var arr=JSON.parse(raw.replace(/&quot;/g,'"'));
        if(!Array.isArray(arr))return;
        arr.forEach(function(z){
          if(!z||!z.nombre)return;
          if(!map[z.nombre])map[z.nombre]={nombre:z.nombre,secs:0,rango:z.rango||'',color:z.color||''};
          map[z.nombre].secs+=(parseFloat(z.secs)||0);
        });
      }catch(e){}
    });
    return Object.values(map).filter(function(z){return z.secs>0;});
  }
  function _replaceZonaTd(rowId, zonesArr){
    var tr=document.getElementById(rowId); if(!tr) return;
    var zTd=tr.querySelector('td.td-zona'); if(!zTd) return;
    var html = (typeof zonaCellHtml==='function' && zonesArr.length)
              ? zonaCellHtml(zonesArr, true)
              : '<td class="td-zona" style="color:#333;text-align:center">—</td>';
    // Replace the existing td with the new html
    var tmp=document.createElement('tbody');
    tmp.innerHTML='<tr>'+html+'</tr>';
    var newTd=tmp.querySelector('td.td-zona');
    if(newTd) zTd.parentNode.replaceChild(newTd, zTd);
  }
  _replaceZonaTd(actId+'ses', _zonesFromRows(trs));
  _replaceZonaTd(actId+'ser', _zonesFromRows(actR));
  // Update the .zones block below the table (Media sesión / Media trabajo efectivo)
  var zonesDiv=act.querySelector('.zones');
  if(zonesDiv){
    if(!act.querySelector('.zones-sep')){
      var sep=document.createElement('div');
      sep.className='zones-sep';
      sep.innerHTML='<span class="zones-sep-text">by AlejandrLucena</span>';
      zonesDiv.parentNode.insertBefore(sep,zonesDiv);
    }
    if(!_isContinua&&!_isMoto){
      var both=_renderZonesSideBySide('Media sesión',_zonesFromRows(trs),'Media trabajo efectivo',_zonesFromRows(actR));
      if(both) zonesDiv.innerHTML=both;
    } else {
      var single=_renderZoneBlockGlobal('Media sesión',_zonesFromRows(trs));
      if(single) zonesDiv.innerHTML=single;
    }
  }
}
function _hideGroup(groupId,actId){
  var header=document.getElementById(groupId);
  if(!header)return;
  var lbl=header.getAttribute('data-lbl')||'Grupo';
  var rowIds=[groupId];
  header.classList.add('row-hidden');
  // Hide everything until the next peer header or avg row.
  // Accepts: group-lap, custom-group-child, custom-group-header (nested), AND plain data rows that follow.
  function _isPeerHeader(el){
    if(!el||!el.classList) return false;
    if(el.classList.contains('avg-row')||el.classList.contains('avg-act')) return true;
    if(el.classList.contains('group-header')||el.classList.contains('phase-header')) return true;
    return false;
  }
  var next=header.nextElementSibling;
  while(next && !_isPeerHeader(next)){
    if(next.classList.contains('group-lap')||next.classList.contains('custom-group-child')
       ||next.classList.contains('custom-group-header')){
      if(next.id) rowIds.push(next.id);
      next.classList.add('row-hidden');
      next=next.nextElementSibling;
    } else {
      // Plain following data row — stop (this header doesn't own it)
      break;
    }
  }
  var keys=_rowKeysFromIds(rowIds);
  _rememberHiddenKeys(keys);
  var act=document.getElementById('act-'+actId)||{};
  var sport=(act.getAttribute?act.getAttribute('data-sport'):null)||'RUN';
  _pushHide(actId,rowIds,lbl+(rowIds.length>1?' ('+rowIds.length+' filas)':''),{dur:parseInt(header.getAttribute('data-dur')||0),speed:parseFloat(header.getAttribute('data-speed')||0),sport:sport,keys:keys});
  if(_lastParsedList){_reRenderCompact();return;}
  _recalcAvgRows(actId);
}

/* ── RECALCULATE DELTAS AFTER DATA EDIT ── */
function _recalcDeltas(actId){
  _DB('DELTA', '_recalcDeltas ENTER actId='+actId);
  var act=document.getElementById('act-'+actId);
  if(!act){_DB('DELTA','no act-'+actId);return;}
  var tbody=act.querySelector('tbody');
  if(!tbody){_DB('DELTA','no tbody');return;}
  var all=Array.from(tbody.children);
  var prevRow=null;
  var updated=0;
  all.forEach(function(tr){
    if(tr.classList.contains('avg-row')||tr.classList.contains('avg-act')) return;
    if(!tr.hasAttribute('data-dur')) return;
    if(tr.classList.contains('row-hidden')) return;
    var st=tr.style||{};
    if(st.display==='none') return;
    if(tr.classList.contains('group-header')||tr.classList.contains('phase-header')||tr.classList.contains('custom-group-header')) return;
    // This is a visible data row — update deltas vs prevRow
    if(prevRow){
      var prevDur=parseFloat(prevRow.getAttribute('data-dur'))||0;
      var prevSpd=parseFloat(prevRow.getAttribute('data-speed'))||0;
      var prevDist=parseFloat(prevRow.getAttribute('data-dist'))||0;
      var prevFcm=parseFloat(prevRow.getAttribute('data-fcm'))||0;
      var prevFcx=parseFloat(prevRow.getAttribute('data-fcx'))||0;
      var prevCad=parseFloat(prevRow.getAttribute('data-cad'))||0;
      var prevPow=parseFloat(prevRow.getAttribute('data-pow'))||0;
      var prevSmax=parseFloat(prevRow.getAttribute('data-smax'))||0;
      var curDur=parseFloat(tr.getAttribute('data-dur'))||0;
      var curSpd=parseFloat(tr.getAttribute('data-speed'))||0;
      var curDist=parseFloat(tr.getAttribute('data-dist'))||0;
      var curFcm=parseFloat(tr.getAttribute('data-fcm'))||0;
      var curFcx=parseFloat(tr.getAttribute('data-fcx'))||0;
      var curCad=parseFloat(tr.getAttribute('data-cad'))||0;
      var curPow=parseFloat(tr.getAttribute('data-pow'))||0;
      var curSmax=parseFloat(tr.getAttribute('data-smax'))||0;
      var isDesc=(tr.getAttribute('data-active')||'1')==='0';
      function _setDelta(sel, html){
        if(!html)return;
        var td=tr.querySelector('td.'+sel);
        if(!td)return;
        var metric=td.querySelector('.metric');
        if(!metric)return;
        var oldSub=metric.querySelector('.sub');
        if(oldSub) oldSub.remove();
        var main=metric.querySelector('.main');
        if(main) main.insertAdjacentHTML('afterend', html);
      }
      _setDelta('col-speed', isDesc ? dDescansoKmh(curSpd,prevSpd) : dKmh(curSpd,prevSpd));
      _setDelta('col-pace',  isDesc ? dDescansoRitmo(curSpd,prevSpd) : dRitmo(curSpd,prevSpd));
      _setDelta('col-dist',  dDist(curDist,prevDist,isDesc));
      _setDelta('col-time',  dTimeSecs(curDur,prevDur,1));
      _setDelta('col-fcm',   isDesc ? dDescansoFC(curFcm,prevFcm) : dFC(curFcm,prevFcm));
      _setDelta('col-fcx',   isDesc ? dDescansoFC(curFcx,prevFcx) : dFC(curFcx,prevFcx));
      _setDelta('col-cad',   isDesc ? dDescansoFC(curCad,prevCad) : _dCadRaw(curCad,prevCad));
      _setDelta('col-vmax',  dSpeedMax(curSmax,prevSmax));
      _setDelta('col-pow',   _dPotencia(curPow,prevPow));
      updated++;
    }
    prevRow=tr;
  });
  _DB('DELTA', '_recalcDeltas DONE updated='+updated);
}

/* ── RENDER ACTIVIDAD ── */
function renderActividad(d){
  _DB('RENDER', 'renderActividad enter act='+(d._actId||'?')+' title="'+(d.titulo||'').slice(0,60)+'"');
  var seriesArr=d.series?d.series.slice():[]; // copy to avoid mutation of original
  var rawWarmup=d.warmup||null;
  var rawCooldown=d.cooldown||null;
  var warmup=(rawWarmup&&rawWarmup.speed)?rawWarmup:null;
  var cooldown=(rawCooldown&&rawCooldown.speed)?rawCooldown:null;
  var zonas=d.zonas||[];
  zonas.forEach(function(z){if(z.rango)registerZonaRango(z.nombre,z.rango);});
  seriesArr.forEach(function(s){(s.zonas_lap||[]).forEach(function(z){if(z.rango)registerZonaRango(z.nombre,z.rango);});});
  var modo=(d.modo||'intervalos').toLowerCase();
  var esCarrera=['carrera','long_run'].indexOf(modo)>=0;
  var esLibre=['sesión libre','sesion libre'].indexOf(modo)>=0;
  var esIntervalos=!esCarrera&&!esLibre;
  var isCycling=(d.tipo||'')==='BICI';
  var isMoto=(d.tipo||'')==='MOTO';
  var isIndoorCycling=isCycling&&parseFloat(d.distancia_total||'0')<0.01;
  var useTiming=esIntervalos||isMoto||isCycling||esCarrera;
  var showLapCol=esIntervalos||isMoto||isCycling; // no en esCarrera plano (el km ya es la 1ª col)
  function normD(v){if(typeof v==='number')return v;var n=parseInt(v);return isNaN(n)?0:n;}
  if(warmup)warmup.desnivel=normD(warmup.desnivel);
  if(cooldown)cooldown.desnivel=normD(cooldown.desnivel);
  seriesArr.forEach(function(s){s.desnivel=normD(s.desnivel);});

  // Promote warmup/cooldown labels from series array if needed
  if(!warmup&&seriesArr.length&&/warmup|calentamiento/i.test(seriesArr[0].label||'')){
    warmup=seriesArr.shift();
  }
  if(!cooldown&&seriesArr.length&&/cooldown|enfriamiento|^recovery$/i.test(seriesArr[seriesArr.length-1].label||'')){
    cooldown=seriesArr.pop();
  }
  var _hasSeries=seriesArr.some(function(s){return _isDescanso(s);});
  var _hasCompactedRows=seriesArr.some(function(s){return !!s._subLaps;});
  var esContinua=esCarrera||((isCycling||isMoto)&&!_hasSeries&&!_hasCompactedRows);
  showLapCol=showLapCol&&!esContinua;

  // FC range for zone distribution weighting
  var allFCArr=[];
  if(warmup&&warmup.fc_med>0)allFCArr.push(warmup.fc_med);
  seriesArr.forEach(function(s){if(s.fc_med>0)allFCArr.push(s.fc_med);});
  if(cooldown&&cooldown.fc_med>0)allFCArr.push(cooldown.fc_med);
  var fcMinAll=allFCArr.length?Math.min.apply(null,allFCArr):100;
  var fcMaxAll=allFCArr.length?Math.max.apply(null,allFCArr):200;
  var fcRangeAll=fcMaxAll-fcMinAll||1;

  var totalZonaSecs=zonas.reduce(function(a,z){return a+z.secs;},0);
  var z1GlobalRef=zonas.find(function(z){return /zona.?1|calentamiento/i.test(z.nombre);})||null;
  function _fallbackZ1(lap){
    if(!lap||lap.zonas_lap&&lap.zonas_lap.length>0)return;
    if(!z1GlobalRef||!lap.fc_med||lap.fc_med<=0)return;
    var dur=lap.dur_secs;if(!dur)return;
    lap.zonas_lap=[{nombre:z1GlobalRef.nombre,secs:dur,rango:z1GlobalRef.rango,color:z1GlobalRef.color}];
  }
  seriesArr.forEach(function(s){_distributeZones(s,zonas,fcMinAll,fcMaxAll,fcRangeAll);_fallbackZ1(s);});
  _distributeZones(warmup,zonas,fcMinAll,fcMaxAll,fcRangeAll);_fallbackZ1(warmup);
  _distributeZones(cooldown,zonas,fcMinAll,fcMaxAll,fcRangeAll);_fallbackZ1(cooldown);

  var maxFCxVal=seriesArr.length?Math.max.apply(null,seriesArr.map(function(s){return s.fc_max||0;})):0;

var allR=[];
  function _pushExpanded(s){if(s._subLaps)s._subLaps.forEach(function(sub){allR.push(sub);});else allR.push(s);}
  if(warmup)_pushExpanded(warmup);
  seriesArr.forEach(_pushExpanded);
  if(cooldown)_pushExpanded(cooldown);
  var _allRSet=new Set(allR);

  // Net cumulative elevation (gain - loss). Negative when descent dominates; matches Garmin Connect.
  var desnivelAcum=allR.reduce(function(a,r){var n=parseInt(r.desnivel)||0;return a+n;},0);
  function _acumHtml(v){var n=Math.round(parseFloat(v)||0);if(!n)return'';return n>0?'<div class="elev dp">▲ +'+n+'m acum.</div>':'<div class="elev dn">▼ '+Math.abs(n)+'m acum.</div>';}
  function ravg(arr,fn){return arr.length?arr.reduce(function(a,r){return a+fn(r);},0)/arr.length:0;}
  function rowDur(r){return r.dur_raw_secs||r.dur_secs||0;}
  function sumDur(arr){return arr.reduce(function(a,r){return a+rowDur(r);},0);}
  function sumDist(arr){return arr.reduce(function(a,r){return a+(r.dist_km||0);},0);}
  function timeAvg(arr,fn){
    var den=sumDur(arr);
    if(!den)return arr.length?ravg(arr,fn):0;
    return arr.reduce(function(a,r){return a+fn(r)*rowDur(r);},0)/den;
  }
  // Umbral dinámico de lap residual: 20% de la mediana de dist de laps activos (mín 0.01 km)
  // Usamos laps individuales (allR) aunque estemos en compact-km, porque las distancias
  // de grupos compactados falsean la mediana y hacen que _pillMinDist sea ~1 km.
  var _actDistsRaw=seriesArr.filter(function(s){return!_isDescanso(s)&&(s.dist_km||0)>0;});
  var _actDists=[];
  _actDistsRaw.forEach(function(s){
    if(s._subLaps){
      s._subLaps.forEach(function(sub){
        if(!_isDescanso(sub)&&(sub.dist_km||0)>0)_actDists.push(sub.dist_km);
      });
    } else {_actDists.push(s.dist_km);}
  });
  _actDists.sort(function(a,b){return a-b;});
  var _medLapDist=_actDists.length?_actDists[Math.floor(_actDists.length/2)]:0.5;
  var _residueThresh=Math.max(0.01,_medLapDist*0.2);
  var _pillMinDist=Math.max(0.2,_medLapDist*0.5); // laps shorter than 50% of median don't qualify for pills
  // Marcar residuales: distancia pequeña relativa O última vuelta con ≤5s — no aplica a motorsport
  var _residualSet=new Set();
  if(!isMoto){
    seriesArr.forEach(function(s,i,arr){
      var _d=s.dist_km||0,_t=s.dur_raw_secs||s.dur_secs||0;
      if((_d>0&&_d<_residueThresh)||(i===arr.length-1&&_t>0&&_t<=5)){
        _residualSet.add(s);
        // En compact-km propagamos a sub-laps individuales para que los
        // filtros de _dataRow / _kmhArr / _allRNoRes funcionen correctamente
        if(s._subLaps)s._subLaps.forEach(function(sub){_residualSet.add(sub);});
      }
    });
  }
  // allR sin residuales — base para todos los cálculos de resumen
  var _allRNoRes=allR.filter(function(r){return!_residualSet.has(r);});
  // Media sesión: warmup + series + descansos + cooldown, sin residuales
  var validAllR=_allRNoRes.filter(function(r){return r.speed>=0.01;});
  var validAllRWithHR=_allRNoRes.filter(function(r){return r.fc_med>=0.01;});
  var maxFCmVal=validAllRWithHR.length?Math.max.apply(null,validAllRWithHR.map(function(r){return r.fc_med||0;})):0;
  var totalDurSes=sumDur(_allRNoRes);
  var totalDistSes=sumDist(_allRNoRes);
  var avgSpeedSes=(totalDistSes>0&&totalDurSes>0)?totalDistSes*1000/totalDurSes:(validAllR.length?timeAvg(validAllR,function(r){return r.speed;}):0);
  var avgKmhSes=avgSpeedSes?toKmh(avgSpeedSes)+' km/h':'—';
  var avgRSSes=avgSpeedSes?ritmoSecs(avgSpeedSes):null;
  var avgFCmSes=validAllRWithHR.length?Math.round(timeAvg(validAllRWithHR,function(r){return r.fc_med;})):'—';
  var fcMaxAll=_allRNoRes.filter(function(r){return r.fc_max>0;});
  var avgFCxSes=fcMaxAll.length?Math.round(timeAvg(fcMaxAll,function(r){return r.fc_max;})):'—';
  // Vel. Máx sesión (moto/ciclismo): máximo, excluye residuales
  var _vmArr=allR.filter(function(r){return(r.speed_max||0)>=0.3&&!_residualSet.has(r);});
  var maxVelMaxVal=(isMoto||isCycling)&&_vmArr.length?Math.max.apply(null,_vmArr.map(function(r){return r.speed_max;})):0;
  // km/h máx sesión (resto de deportes): vuelta más rápida, excluye residuales
  var _kmhArr=allR.filter(function(r){return r.speed>0.5&&!_residualSet.has(r)&&(r.dist_km||0)>=_pillMinDist;});
  var maxKmhVal=_kmhArr.length?Math.max.apply(null,_kmhArr.map(function(r){return r.speed;})):0;
  // Media trabajo efectivo: solo vueltas activas, sin descansos ni residuales
  // En compact-km expandimos _subLaps para no incluir calentamiento/enfriamiento
  var _isWarmup=function(s){return /^calentamiento$/i.test(s.label||'')||s._intensityType==='WARMUP';};
  var activeOnlyArr=[];
  seriesArr.forEach(function(s){
    if(s._subLaps){
      s._subLaps.forEach(function(sub){
        if(!_isDescanso(sub)&&!_isWarmup(sub)&&!_residualSet.has(sub))activeOnlyArr.push(sub);
      });
    } else if(!_isDescanso(s)&&!_isWarmup(s)&&!_residualSet.has(s)){activeOnlyArr.push(s);}
  });
  var activeOnlyArrWithFC=activeOnlyArr.filter(function(r){return r.fc_med>0;});
  var totalDurSer=sumDur(activeOnlyArr);
  var totalDistSer=sumDist(activeOnlyArr);
  // Cargar ajustes guardados por actId
  var _adj = _loadAdj(_actId) || {};
  var _adjDistSes = (_adj.sesDist > 0) ? _adj.sesDist : totalDistSes;
  var _adjPaceSes = _adj.sesPace || null;
  var _adjDistSer = (_adj.serDist > 0) ? _adj.serDist : totalDistSer;
  var _adjPaceSer = _adj.serPace || null;
  var avgSpeedSer=(totalDistSer>0&&totalDurSer>0)?totalDistSer*1000/totalDurSer:(activeOnlyArr.length?timeAvg(activeOnlyArr,function(r){return r.speed;}):0);
  var avgKmhSer=avgSpeedSer?toKmh(avgSpeedSer)+' km/h':'—';
  var avgRSSer=avgSpeedSer?ritmoSecs(avgSpeedSer):null;
  var avgDSer=activeOnlyArr.length?totalDistSer.toFixed(2)+' km':'—';
  var avgDsnivelSer=activeOnlyArr.length?activeOnlyArr.reduce(function(a,r){return a+(parseInt(r.desnivel)||0);},0):0;
  var avgFCmSer=activeOnlyArrWithFC.length?Math.round(timeAvg(activeOnlyArrWithFC,function(r){return r.fc_med;})):'—';
  var _fcxSerArr=activeOnlyArr.filter(function(r){return r.fc_max>0;});
  var avgFCxSer=_fcxSerArr.length?Math.round(timeAvg(_fcxSerArr,function(r){return r.fc_max;})):'—';
  var cadArr=_allRNoRes.filter(function(r){return r.cadencia>0;});
  var avgCadSes=cadArr.length?Math.round(timeAvg(cadArr,function(r){return r.cadencia;})):'—';
  var maxCadVal=cadArr.length?Math.max.apply(null,cadArr.map(function(r){return Math.round(r.cadencia||0);})):0;
  var cadSerArr=activeOnlyArr.filter(function(r){return r.cadencia>0;});
  var avgCadSer=cadSerArr.length?Math.round(timeAvg(cadSerArr,function(r){return r.cadencia;})):'—';
  var _smsArr=allR.filter(function(r){return(r.speed_max||0)>=0.3;});
  var avgSpeedMaxSes=_smsArr.length?Math.round(timeAvg(_smsArr,function(r){return r.speed_max;})):0;
  var _smrArr=activeOnlyArr.filter(function(r){return(r.speed_max||0)>=0.3;});
  var avgSpeedMaxSer=_smrArr.length?Math.round(timeAvg(_smrArr,function(r){return r.speed_max;})):0;
  var _potSesArr=_allRNoRes.filter(function(r){return r.potencia_w>0;});
  var avgPotenciaSes=_potSesArr.length?Math.round(timeAvg(_potSesArr,function(r){return r.potencia_w;})):0;
  var maxPotenciaVal=_potSesArr.length?Math.max.apply(null,_potSesArr.map(function(r){return Math.round(r.potencia_w||0);})):0;
  var _potSerArr=activeOnlyArr.filter(function(r){return r.potencia_w>0;});
  var avgPotenciaSer=_potSerArr.length?Math.round(timeAvg(_potSerArr,function(r){return r.potencia_w;})):0;
  var dsnSes=_allRNoRes.reduce(function(a,r){return a+(parseInt(r.desnivel)||0);},0);
  var _smaxSes=_allRNoRes.filter(function(r){return(r.speed_max||0)>=0.3;});
  var maxSpeedMaxSes=_smaxSes.length?Math.max.apply(null,_smaxSes.map(function(r){return r.speed_max;})):0;
  var _smaxSer=activeOnlyArr.filter(function(r){return(r.speed_max||0)>=0.3;});
  var maxSpeedMaxSer=_smaxSer.length?Math.max.apply(null,_smaxSer.map(function(r){return r.speed_max;})):0;
  d._pre={ses:{fcM:avgFCmSes,fcX:avgFCxSes,dur:totalDurSes,dist:totalDistSes,vel:avgSpeedSes,velX:maxSpeedMaxSes,cad:avgCadSes,pot:avgPotenciaSes,dsn:dsnSes},efc:{fcM:avgFCmSer,fcX:avgFCxSer,dur:totalDurSer,dist:totalDistSer,vel:avgSpeedSer,velX:maxSpeedMaxSer,cad:avgCadSer,pot:avgPotenciaSer,dsn:avgDsnivelSer}};
  // Apply label normalization to all rows
  if(warmup)warmup.label=_normLabel(warmup.label)||'Calentamiento';
  if(cooldown)cooldown.label=_normLabel(cooldown.label)||(cooldown._intensityType==='COOLDOWN'?'Enfriamiento':'Recuperación');
  seriesArr.forEach(function(s){s.label=_normLabel(s.label)||s.label;});
  // Re-detect cooldown after normalization
  if(!cooldown&&seriesArr.length){
    var lastL=seriesArr[seriesArr.length-1];
    if(/^(recuperaci[oó]n|enfriamiento)$/i.test(lastL.label||'')){
      cooldown=seriesArr.pop(); if(!cooldown.label||/^descanso$/i.test(cooldown.label))cooldown.label='Enfriamiento';
    }
  }

  _actId=d._actKey||('a'+Math.random().toString(36).slice(2,6));
  _rowIdx=0;
  var _rowNum=0;
  var _cumTimeSecs=0;
  var rows='';
  var maxFCmSumVal=0; // max fc_med across group summary rows (for fc-med-pill)
  var maxSpdSum=0; // max speed across summary rows
  var maxSmaxSum=0;
  var maxCadSumVal=0; // max cadencia across summary rows
  var maxPowSumVal=0; // max potencia across summary rows
  function _fcMedHtml(s,forSummary){
    var v=s&&s.fc_med>0?Math.round(s.fc_med):0;
    if(!v)return'';
    if(forSummary){
      var isSummaryMax=maxFCmSumVal>0&&v===Math.round(maxFCmSumVal)&&!_residualSet.has(s);
      return isSummaryMax?'<span class="fc-med-pill">'+v+'</span>':String(v);
    }
    var isLapMax=maxFCmVal>0&&v===Math.round(maxFCmVal)&&!_residualSet.has(s)&&!_isDescanso(s);
    return isLapMax?'<span class="fc-med-pill">'+v+'</span>':String(v);
  }
  function _cadHtml(s,emptyText,forSummary){
    var v=s&&s.cadencia>0?Math.round(s.cadencia):0;
    if(!v)return emptyText!==undefined?emptyText:'—';
    if(forSummary){
      var isSummaryMax=maxCadSumVal>0&&v===Math.round(maxCadSumVal)&&!_residualSet.has(s)&&!_isDescanso(s);
      return isSummaryMax?'<span class="cad-pill">'+v+'</span>':String(v);
    }
    var isLapMax=!isMoto&&!(isCycling&&!isIndoorCycling)&&maxCadVal>0&&v===maxCadVal&&!_residualSet.has(s)&&!_isDescanso(s);
    return isLapMax?'<span class="cad-pill">'+v+'</span>':String(v);
  }
  function _powerHtml(s,emptyText,forSummary){
    var v=s&&s.potencia_w>0?Math.round(s.potencia_w):0;
    if(!v)return emptyText!==undefined?emptyText:'—';
    if(forSummary){
      var isSummaryMax=maxPowSumVal>0&&v===Math.round(maxPowSumVal)&&!_residualSet.has(s)&&!_isDescanso(s);
      return isSummaryMax?'<span class="power-pill">'+v+'</span>':String(v);
    }
    var isLapMax=isCycling&&maxPotenciaVal>0&&v===maxPotenciaVal&&!_residualSet.has(s)&&!_isDescanso(s);
    return isLapMax?'<span class="power-pill">'+v+'</span>':String(v);
  }
  function _cadTd(s,cadPrev,isDesc,emptyText,mainStyle,forSummary){
    var main=_cadHtml(s,emptyText,forSummary);
    var delta='';
    if(s&&s.cadencia>0&&cadPrev>0){
      var d=s.cadencia-cadPrev;
      if(Math.abs(d)>=0.1){
        var sign=d>0?'+':'-';
        var cls=d>0?'dn':'dp';
        delta='<div class="sub '+cls+'"'+(isDesc?' style="opacity:0.2"':'')+'>'+sign+Math.abs(d)+'</div>';
      }
    }
    return'<td><div class="metric"><div class="main" '+(mainStyle||'')+'>'+main+'</div>'+delta+'</div></td>';
  }
  function _powerTd(s,ref,emptyText,mainStyle,forSummary){
    return'<td><div class="metric"><div class="main" '+(mainStyle||'')+'>'+_powerHtml(s,emptyText,forSummary)+'</div>'+(ref&&ref.potencia_w>0?_dPotencia(s.potencia_w,ref.potencia_w):'')+'</div></td>';
  }

  // ── Helper: render a single data row (lap o phase summary) ──
  function _dataRow(s, ref, isDesc, isPill, rowClass, hideButton){
    var ri=_rowIdx++;
    var rowId=_actId+'r'+ri;
    _rowNum++;
    var _rn=_rowNum;
    var _vuelta=s.vuelta||s.lapLabel||_rn;
    var _thisDur=s.dur_raw_secs||s.dur_secs||0;
    _cumTimeSecs+=_thisDur;
    var _ct=_cumTimeSecs;
    var _cumDisplay=secsToStepStr(_ct,isMoto?3:1);
    var fcmaxVal=s.fc_max>0?(s.fc_max===maxFCxVal?'<span class="fc-max-pill">'+s.fc_max+'</span>':s.fc_max):'';
    var lbl=s.label||'—';
    // Show duration if NOT a simple number (continuous run = just "1", "2", etc.)
    // In intervalos mode, duration goes in its own column so skip from label
    var isJustNumber=/^\d+$/.test(lbl);
    var dur=!isJustNumber?_lapDurSecs(s):null;
    var durSpan=(dur&&!useTiming)?'<span style="font-size:9px;color:#454a55;margin-left:7px;font-weight:400">'+secsToStr(dur)+'</span>':'';
    var labelHtml=(hideButton?_hideBtn(ri):'')
      +'<div class="lap-label-cell"><div class="lap-label-row">'
      +'<span class="lap-label-edit" style="cursor:pointer;'+(isDesc?'color:#252830':'')+'">'+_normalizeLabel(lbl)+'</span>'
      +durSpan
      +'</div></div>';

    var hasRef=!!ref;
    var _zJson=(function(){try{return JSON.stringify(s.zonas_lap||[]).replace(/"/g,'&quot;');}catch(e){return'[]';}})();
    var _dAttrs=' data-hide-key="'+(s._hideKey||'')+'" data-lbl="'+(lbl||'').replace(/"/g,'&quot;')+'" data-dur="'+_thisDur+'" data-speed="'+(s.speed||0)+'" data-dist="'+(s.dist_km||0)+'" data-fcm="'+(s.fc_med||0)+'" data-fcx="'+(s.fc_max||0)+'" data-cad="'+(s.cadencia||0)+'" data-pow="'+(s.potencia_w||0)+'" data-smax="'+(s.speed_max||0)+'" data-dsn="'+(parseInt(s.desnivel)||0)+'" data-active="'+(isDesc?0:1)+'" data-res="'+(_residualSet.has(s)?1:0)+'" data-zones="'+_zJson+'"';
    // For descanso: show delta only if main value exists AND we have a reference
    if(isDesc){
      var speedVal=s.speed||0;
      var distVal=s.dist_km||0;
      // hasSpeedData = any valid speed (even very low)
      var hasSpeedData=speedVal>0.01;
      // Delta only if there's data to display AND we have a reference - in GREY for descansos
      var dKmhM=hasRef&&hasSpeedData?dDescansoKmh(speedVal,ref.speed):'';
      var dRitmoM=hasRef&&hasSpeedData?dDescansoRitmo(speedVal,ref.speed):'';
      var dFCmM=hasRef&&s.fc_med>0?dDescansoFC(s.fc_med,ref.fc_med):'';
      var dFCxM=hasRef&&s.fc_max>0?dDescansoFC(s.fc_max,ref.fc_max):'';
      var kmhVal=hasSpeedData?toKmh(speedVal):'';
      var ritmoVal=hasSpeedData?toRitmo(speedVal):'';
      var cadVal=s.cadencia>0?s.cadencia:'';
      // FC siempre aparece (si hay dato, si no vacío)
      var fcMedVal=_fcMedHtml(s,false);
      var fcMaxVal=s.fc_max>0?s.fc_max:'';
      var distDisplay=distVal>=0?(distVal>0?fmtDistKm(distVal):'0.00 km'):'';
      var distDelta=hasRef&&distDisplay?dDist(distVal,ref.dist_km,true):'';
      var elevDelta=hasRef?dElev(s.desnivel,ref.desnivel,true):'';
      var elevDisplay=distDisplay?distElevHtml(distDelta,elevDelta,s.desnivel,hasRef):'';
      var rowClassDesc=isDesc?' desc-row':'';
      var descStyle=isDesc?'style="color:#252830"':'';
      var restTimeStyle=isDesc?' style="color:#252830"':'';
      var restLapColor=isDesc?'#252830':'#6a7280';
      var _refDur=hasRef?(ref.dur_raw_secs||ref.dur_secs||0):0;
      var _extraCells=useTiming
      ?(showLapCol?'<td class="col-lap" style="color:'+restLapColor+';font-weight:700;font-size:11px">'+_vuelta+'</td>':'')
        +'<td class="col-time"><div class="metric"><div class="main"'+restTimeStyle+'>'+secsToStepStr(_thisDur,isMoto?3:1)+'</div>'+(hasRef?(isDesc?dDescansoTimeSecs(_thisDur,_refDur,isMoto?3:1):dTimeSecs(_thisDur,_refDur,isMoto?3:1)):'')+'</div></td>'
        +'<td class="col-cum-time">'+'<div class="metric"><div class="main" style="font-size:10px;color:'+(isDesc?'#252830':'#5a6070')+'">'+_cumDisplay+'</div></div></td>'
      :'';
      var _vmDesc=s.speed_max>=0.3?(s.speed_max*3.6).toFixed(2):'';
    return '<tr id="'+rowId+'"'+_dAttrs+' class="'+(rowClass||'')+rowClassDesc+'">'
        +(esContinua?(isIndoorCycling?'<td style="padding-right:0">'+(hideButton?_hideBtn(ri):'')+'<div class="metric" style="align-items:flex-start"><div class="main" '+descStyle+'>'+_vuelta+'</div></div></td>':'<td style="padding-right:0">'+(hideButton?_hideBtn(ri):'')+'<div class="metric" style="align-items:flex-start"><div class="main" '+descStyle+'>'+distDisplay+'</div>'+elevDisplay+'</div></td>'):'<td>'+labelHtml+'</td>')
        +_extraCells
        +(esContinua||isIndoorCycling?'':'<td class="col-dist" style="padding-left:14px;padding-right:14px"><div class="metric"><div class="main" '+descStyle+'>'+distDisplay+'</div>'+elevDisplay+'</div></td>')
        +(isIndoorCycling?'':'<td class="col-speed"><div class="metric"><div class="main" '+descStyle+'>'+kmhVal+'</div>'+dKmhM+'</div></td>')
        +((isMoto||(isCycling&&!isIndoorCycling))?'<td><div class="metric"><div class="main" '+descStyle+'>'+_vmDesc+'</div></div></td>':_cadTd(s,hasRef?ref.cadencia:0,true,'',descStyle,false))
        +(isMoto?'':(isCycling
          ?_powerTd(s,hasRef?ref:null,'',descStyle,false)
          :(esContinua&&esCarrera?'':'<td class="col-pace"><div class="metric"><div class="main" '+descStyle+'>'+ritmoVal+'</div>'+dRitmoM+'</div></td>')))
        +'<td><div class="metric"><div class="main" '+descStyle+'>'+fcMedVal+'</div>'+dFCmM+'</div></td>'
        +'<td><div class="metric"><div class="main" '+descStyle+'>'+fcmaxVal+'</div>'+dFCxM+'</div></td>'
        +zonaCellHtml(s.zonas_lap,true)+'</tr>';
    } else {
      var _isFastest=maxKmhVal>0&&s.speed>=maxKmhVal-0.001&&(s.dist_km||0)>=_pillMinDist&&!_residualSet.has(s);
      return '<tr id="'+rowId+'"'+_dAttrs+' class="'+(rowClass||'')+(isDesc?' desc-row':'')+(_isFastest?' fastest-lap':'')+'">'
        +(esContinua?(isIndoorCycling?'<td style="padding-right:0">'+(hideButton?_hideBtn(ri):'')+'<div class="metric" style="align-items:flex-start"><div class="main">'+_vuelta+'</div></div></td>':'<td style="padding-right:0">'+(hideButton?_hideBtn(ri):'')+'<div class="metric" style="align-items:flex-start"><div class="main">'+fmtDistKm(s.dist_km)+'</div>'+distElevHtml((hasRef?dDist(s.dist_km,ref.dist_km,false):''),(hasRef?dElev(s.desnivel,ref.desnivel,false):''),s.desnivel,hasRef)+'</div></td>'):'<td>'+labelHtml+'</td>')
        +(useTiming
          ?(showLapCol?'<td class="col-lap" style="color:#6a7280;font-weight:700;font-size:11px">'+_vuelta+'</td>':'')
            +(esContinua&&esCarrera?(function(){var _time=secsToStepStr(_thisDur,isMoto?3:1);return'<td class="col-time"><div class="metric"><div class="main">'+(_isFastest&&_time?'<span class="ritmo-pill">'+_time+'</span>':_time)+'</div>'+(hasRef?dTimeSecs(_thisDur,ref.dur_raw_secs||ref.dur_secs||0,isMoto?3:1):'')+'</div></td>';}()):'<td class="col-time"><div class="metric"><div class="main">'+((isMoto||(isCycling&&!isIndoorCycling))&&_isFastest&&_thisDur>0?'<span class="ritmo-pill">'+secsToStepStr(_thisDur,isMoto?3:1)+'</span>':secsToStepStr(_thisDur,isMoto?3:1))+'</div>'+(hasRef?dTimeSecs(_thisDur,ref.dur_raw_secs||ref.dur_secs||0,isMoto?3:1):'')+'</div></td>')
            +'<td class="col-cum-time">'+'<div class="metric"><div class="main" style="font-size:10px;color:#5a6070">'+_cumDisplay+'</div></div></td>'
          :'')
        +(esContinua||isIndoorCycling?'':'<td class="col-dist" style="padding-left:14px;padding-right:14px"><div class="metric"><div class="main">'+fmtDistKm(s.dist_km)+'</div>'+distElevHtml((hasRef?dDist(s.dist_km,ref.dist_km,false):''),(hasRef?dElev(s.desnivel,ref.desnivel,false):''),s.desnivel,hasRef)+'</div></td>')
        +(isIndoorCycling?'':(function(){var _spd=toKmh(s.speed);var _kpill=maxKmhVal>0&&_spd===toKmh(maxKmhVal)&&(s.dist_km||0)>=_pillMinDist&&!_residualSet.has(s);var _pc='vel-med-pill';var _kdisp=_kpill?'<span class="'+_pc+'">'+_spd+' km/h</span>':_spd;return'<td class="col-speed"><div class="metric"><div class="main">'+_kdisp+'</div>'+(hasRef?dKmh(s.speed,ref.speed):'')+'</div></td>';}()))
        +((isMoto||(isCycling&&!isIndoorCycling))?(function(){var _vm=s.speed_max>=0.3?(s.speed_max*3.6).toFixed(2):'—';var _pill=maxVelMaxVal>=0.3&&s.speed_max>=0.3&&_vm===(maxVelMaxVal*3.6).toFixed(2)&&!_residualSet.has(s);return'<td><div class="metric"><div class="main">'+(_pill?'<span class="vel-max-pill">'+_vm+' km/h</span>':_vm)+'</div>'+(hasRef?dSpeedMax(s.speed_max,ref.speed_max):'')+'</div></td>';})():_cadTd(s,hasRef?ref.cadencia:0,false,'—',null,false))
        +(isMoto?'':(isCycling
          ?_powerTd(s,hasRef?ref:null,'—',null,false)
          :(esContinua&&esCarrera?'':(function(){var _ritmo=toRitmo(s.speed);var _rp=maxKmhVal>0&&_ritmo===toRitmo(maxKmhVal)&&(s.dist_km||0)>=_pillMinDist&&!_residualSet.has(s);return'<td class="col-pace"><div class="metric"><div class="main">'+(_rp&&_ritmo?'<span class="ritmo-pill">'+_ritmo+'</span>':_ritmo)+'</div>'+(hasRef?dRitmo(s.speed,ref.speed):'')+'</div></td>';}()))))
        +'<td><div class="metric"><div class="main">'+_fcMedHtml(s,false)+'</div>'+(hasRef?dFC(s.fc_med,ref.fc_med):'')+'</div></td>'
        +'<td><div class="metric"><div class="main">'+fcmaxVal+'</div>'+(hasRef?dFC(s.fc_max,ref.fc_max):'')+'</div></td>'
        +zonaCellHtml(s.zonas_lap,true)+'</tr>';
    }
  }

  // ── Helper: build a synthetic summary lap from an array of laps ──
  function _synthLap(laps, labelStr){
    if(!laps.length)return null;
    var validLaps=laps.filter(function(l){return l.speed>=0.0000001;});
    if(!validLaps.length)validLaps=laps;
    var totDur=laps.reduce(function(a,l){return a+(l.dur_raw_secs||l.dur_secs||0);},0);
    var totDist=laps.reduce(function(a,l){return a+l.dist_km;},0);
    // Time-weighted speed, HR and cadence (matches Garmin Connect aggregation)
    var durSum=validLaps.reduce(function(a,l){return a+(l.dur_raw_secs||l.dur_secs||0);},0)||1;
    var avgSpd=validLaps.reduce(function(a,l){return a+l.speed*(l.dur_raw_secs||l.dur_secs||0);},0)/durSum;
    var avgFCm=Math.round(validLaps.reduce(function(a,l){return a+l.fc_med*(l.dur_raw_secs||l.dur_secs||0);},0)/durSum);
    var avgFCx=Math.round(validLaps.reduce(function(a,l){return a+(l.fc_max||0)*(l.dur_raw_secs||l.dur_secs||0);},0)/durSum);
    var cadLaps=validLaps.filter(function(l){return l.cadencia>0;});
    var cadDurSum=cadLaps.reduce(function(a,l){return a+(l.dur_raw_secs||l.dur_secs||0);},0)||1;
    var avgCad=cadLaps.length?Math.round(cadLaps.reduce(function(a,l){return a+(l.cadencia||0)*(l.dur_raw_secs||l.dur_secs||0);},0)/cadDurSum):0;
    var desnTot=laps.reduce(function(a,l){return a+(parseInt(l.desnivel)||0);},0);
    var zmap={};
    laps.forEach(function(l){(l.zonas_lap||[]).forEach(function(z){
      if(!zmap[z.nombre])zmap[z.nombre]={nombre:z.nombre,secs:0,rango:z.rango||'',color:z.color};
      zmap[z.nombre].secs+=z.secs;
    });});
    var avgSmax=validLaps.reduce(function(a,l){return a+(l.speed_max||0)*(l.dur_raw_secs||l.dur_secs||0);},0)/durSum;
    return{label:labelStr,speed:avgSpd,dist_km:totDist,dur_raw_secs:totDur,dur_secs:Math.round(totDur),
      desnivel:desnTot,fc_med:avgFCm,fc_max:avgFCx,cadencia:avgCad,
      speed_max:avgSmax,
      potencia_w:laps.length?Math.round(laps.reduce(function(a,l){return a+(l.potencia_w||0)*(l.dur_raw_secs||l.dur_secs||0);},0)/(laps.reduce(function(a,l){return a+(l.dur_raw_secs||l.dur_secs||0);},0)||1)):0,
      zonas_lap:Object.values(zmap).filter(function(z){return z.secs>0;})};
  }

  function _rangeFromRows(laps){
    var nums=[];
    laps.forEach(function(l){
      String(l.vuelta||'').split(/\D+/).forEach(function(p){var n=parseInt(p);if(n)nums.push(n);});
    });
    if(!nums.length)return'';
    var a=Math.min.apply(null,nums),b=Math.max.apply(null,nums);
    return a===b?String(a):a+' - '+b;
  }

  function _summaryRow(s, rowClass, label, cumSecs, zonasForRow, ref){
    var dur=s.dur_raw_secs||s.dur_secs||0;
    var gi=_rowIdx++;
    var gid=_actId+'g'+gi;
    var canToggle=/\b(group-header|phase-header)\b/.test(rowClass||'');
    var _cc=s.subLaps&&s.subLaps.length||0;
    var attrs=canToggle?' id="'+gid+'" onclick="if(!event.target.closest(\'.lap-label-edit,.group-lbl-edit\')&&event.target.tagName!==\'INPUT\'&&event.target.tagName!==\'BUTTON\')_toggleGroup(\''+gid+'\')" data-lbl="'+label.replace(/"/g,'&quot;')+'" data-dur="'+dur+'" data-speed="'+(s.speed||0)+'" data-dist="'+(s.dist_km||0)+'" data-fcm="'+(s.fc_med||0)+'" data-fcx="'+(s.fc_max||0)+'" data-cad="'+(s.cadencia||0)+'" data-pow="'+(s.potencia_w||0)+'" data-smax="'+(s.speed_max||0)+'" data-dsn="'+(parseInt(s.desnivel)||0)+'"'+(_cc?' data-child-count="'+_cc+'"':''):'';
    var _displayLabel=_normalizeLabel(label);
    var firstCell=(canToggle?'<span class="group-arrow">▼</span>':'')+'<span class="lap-label-edit" style="cursor:pointer">'+_displayLabel+'</span>'
      +(canToggle?'<button class="hide-btn" onclick="event.stopPropagation();_hideGroup(\''+gid+'\',\''+_actId+'\')" title="Ocultar grupo">✕</button>':'')
      +(canToggle?' <button class="ungroup-btn" onclick="event.stopPropagation();_ungroupAuto(\''+_actId+'\',\''+gid+'\')" title="Deshacer grupo">⊟</button>':'');
    var hasRef=!!ref;
    var distDelta=hasRef?dDist(s.dist_km,ref.dist_km,false):'';
    var elevDelta=hasRef?dElev(s.desnivel,ref.desnivel,false):'';
    var dKmhH=hasRef?dKmh(s.speed,ref.speed):'';
    var dCadH=hasRef&&s.cadencia&&ref.cadencia?_dCadRaw(s.cadencia,ref.cadencia):'';
    var dRitmoH=hasRef?dRitmo(s.speed,ref.speed):'';
    var dFCmH=hasRef?dFC(s.fc_med,ref.fc_med):'';
    var dFCxH=hasRef?dFC(s.fc_max,ref.fc_max):'';
    var fcMaxSum=s.fc_max>0?(s.fc_max===maxFCxVal?'<span class="fc-max-pill">'+s.fc_max+'</span>':''+s.fc_max):'';
    var _vmS=s.speed_max>=0.3?(s.speed_max*3.6).toFixed(2):'—';
    var _isVmaxSummary=maxSmaxSum>=0.3&&s.speed_max>=0.3&&Math.abs(s.speed_max-maxSmaxSum)<0.001;
    var _vmSPill=_vmS!=='—'?(_isVmaxSummary?'<span class="vel-max-pill">'+_vmS+' km/h</span>':_vmS+' km/h'):'—';
    var dDurH=hasRef?dTimeSecs(dur,ref.dur_raw_secs||ref.dur_secs||0,isMoto?3:1):'';
    var _isFastestSum;
    if(_isDescanso(s)||(s._subLaps&&s._subLaps.length&&s._subLaps.every(function(l){return _isDescanso(l)||_residualSet.has(l);}))){_isFastestSum=false;}
    else if(s._isFastestGroup!==undefined){_isFastestSum=s._isFastestGroup;}
    else if(s._subLaps){_isFastestSum=maxSpdSum>0&&s.speed>=maxSpdSum-0.001&&(s.dist_km||0)>=_pillMinDist&&!_residualSet.has(s);}
    else{_isFastestSum=maxKmhVal>0&&s.speed>=maxKmhVal-0.001&&(s.dist_km||0)>=_pillMinDist&&!_residualSet.has(s);}
    var _isSummaryFastest=!_isDescanso(s)&&!(s._subLaps&&s._subLaps.length&&s._subLaps.every(function(l){return _isDescanso(l)||_residualSet.has(l);}))&&maxSpdSum>0&&s.speed>=maxSpdSum-0.001&&(s.dist_km||0)>=_pillMinDist&&!_residualSet.has(s);
    return '<tr'+attrs+' class="'+rowClass+' step-summary'+(_isFastestSum?' fastest-lap':'')+'">'
      +'<td>'+firstCell+'</td>'
      +'<td class="col-lap" style="font-weight:600">'+(s.vuelta||'')+'</td>'
      +'<td class="col-time"><div class="metric"><div class="main">'+(dur?((isMoto||(isCycling&&!isIndoorCycling))&&_isFastestSum?'<span class="ritmo-pill">'+secsToStepStr(dur,isMoto?3:1)+'</span>':secsToStepStr(dur,isMoto?3:1)):'—')+'</div>'+dDurH+'</div></td>'
      +'<td class="col-cum-time"><div class="metric"><div class="main">'+(cumSecs?secsToStepStr(cumSecs,isMoto?3:1):'—')+'</div></div></td>'
      +(isIndoorCycling?'':'<td class="col-dist" style="padding-left:14px;padding-right:14px"><div class="metric"><div class="main">'+fmtDistKm(s.dist_km)+'</div>'+distElevHtml(distDelta,elevDelta,s.desnivel,hasRef)+'</div></td>')
      +(isIndoorCycling?'':(function(){var _spd=toKmh(s.speed);return'<td class="col-speed"><div class="metric"><div class="main">'+(_spd?(_isSummaryFastest?'<span class="vel-med-pill">'+_spd+' km/h</span>':_spd+' km/h'):'—')+'</div>'+dKmhH+'</div></td>';}()))
      +((isMoto||(isCycling&&!isIndoorCycling))
        ?'<td><div class="metric"><div class="main">'+_vmSPill+'</div>'+(hasRef?dSpeedMax(s.speed_max,ref.speed_max):'')+'</div></td>'
        :_cadTd(s,hasRef?ref.cadencia:0,false,'—',null,true))
      +(isMoto?'':(isCycling
        ?_powerTd(s,hasRef?ref:null,'—',null,true)
        :(function(){var _ritmoS=toRitmo(s.speed);return'<td class="col-pace"><div class="metric"><div class="main">'+(_isSummaryFastest&&_ritmoS?'<span class="ritmo-pill">'+_ritmoS+'</span>':_ritmoS)+'</div>'+dRitmoH+'</div></td>';}())))
      +'<td><div class="metric"><div class="main">'+_fcMedHtml(s,true)+'</div>'+dFCmH+'</div></td>'
      +'<td><div class="metric"><div class="main">'+fcMaxSum+'</div>'+dFCxH+'</div></td>'
      +zonaCellHtml(zonasForRow||s.zonas_lap,true)+'</tr>';
  }

  // ── Group series into intervals ──
  // An interval = one or more active laps + their following descanso(s) before next active lap
  // Warmup and cooldown are standalone phases
  function _buildGroups(laps){
    var groups=[]; // [{type:'warmup'|'cooldown'|'interval', laps:[...], activeLaps:[...], num:N}]
    var intervalNum=0;
    var i=0;
    while(i<laps.length){
      var s=laps[i];
      // Check if this is a standalone calentamiento/recuperación at start or end
      if(/^calentamiento$/i.test(s.label||'')){
        groups.push({type:'warmup',laps:[s]});i++;continue;
      }
      if(/^(recuperaci[oó]n|enfriamiento)$/i.test(s.label||'')){
        groups.push({type:'cooldown',laps:[s]});i++;continue;
      }
      // Active lap → start a new interval group
      if(!_isDescanso(s)){
        intervalNum++;
        var grp={type:'interval',num:intervalNum,laps:[],activeLaps:[]};
        // Collect all laps until next active lap (after at least one descanso gap)
        grp.laps.push(s);
        grp.activeLaps.push(s);
        i++;
        while(i<laps.length){
          var next=laps[i];
          // Stop if this is a new active lap and we've already had a descanso
          var hadDescanso=grp.laps.some(function(l){return _isDescanso(l);});
          if(!_isDescanso(next)){
            if(hadDescanso)break; // new interval
            // Break if consecutive active laps belong to different workout steps.
            // Residual laps (tiny auto-lap artefacts) stick unless wktStepIndex differs.
            if(!_residualSet.has(next)){
              var _prevWkt=grp.activeLaps.length?grp.activeLaps[grp.activeLaps.length-1].wktStepIndex:undefined;
              var _nextWkt=next.wktStepIndex;
              if(_prevWkt!==null&&_prevWkt!==undefined&&_nextWkt!==null&&_nextWkt!==undefined&&_prevWkt!==_nextWkt)break;
            } else if(grp.activeLaps.length){
              var _prevWkt=grp.activeLaps[grp.activeLaps.length-1].wktStepIndex;
              var _nextWkt=next.wktStepIndex;
              if(_prevWkt!==null&&_prevWkt!==undefined&&_nextWkt!==null&&_nextWkt!==undefined&&_prevWkt!==_nextWkt)break;
            }
            // consecutive active laps belong to same interval
            grp.laps.push(next);grp.activeLaps.push(next);i++;
          } else {
            grp.laps.push(next);i++;
          }
        }
        groups.push(grp);
      } else {
        // Orphan descanso (shouldn't happen normally) — attach to previous group or skip
        if(groups.length)groups[groups.length-1].laps.push(s);
        i++;
      }
    }
    return groups;
  }

  var lastActiveLap=warmup||null;

  if(esIntervalos&&!esContinua){
    var allSeriesForGroup=[];
    seriesArr.forEach(function(s){allSeriesForGroup.push(s);});

    var isCompactedView=allSeriesForGroup.some(function(s){return !!s._subLaps;});

    if(isCompactedView){
      allSeriesForGroup.forEach(function(s){
        if(!_isDescanso(s)){
          if(s.fc_med>maxFCmSumVal)maxFCmSumVal=s.fc_med;
          if((s.speed||0)>maxSpdSum)maxSpdSum=s.speed;
          if((s.speed_max||0)>maxSmaxSum)maxSmaxSum=s.speed_max;
          if((s.cadencia||0)>maxCadSumVal)maxCadSumVal=s.cadencia;
          if((s.potencia_w||0)>maxPowSumVal)maxPowSumVal=s.potencia_w;
        }
      });
      // ── COMPACT VIEW: cada grupo compactado = _summaryRow colapsable + sub-vueltas ──
      // ── Compute residual threshold from individual laps, not compacted groups ──
      var _subLapsFlat=[];
      allSeriesForGroup.forEach(function(sx){if(sx._subLaps)_subLapsFlat=_subLapsFlat.concat(sx._subLaps);});
      var _subActDists=_subLapsFlat.filter(function(sx){return !_isDescanso(sx) && (sx.dist_km||0)>0;}).map(function(sx){return sx.dist_km;}).sort(function(a,b){return a-b;});
      var _subMedDist=_subActDists.length?_subActDists[Math.floor(_subActDists.length/2)]:0.5;
      var _subResThresh=Math.max(0.01,_subMedDist*0.2);
      if(!isMoto){
        _subLapsFlat.forEach(function(sx,i,arr){
          var _d=sx.dist_km||0,_t=sx.dur_raw_secs||sx.dur_secs||0;
          if((_d>0&&_d<_subResThresh)||(i===arr.length-1&&_t>0&&_t<=5)){_residualSet.add(sx);}
        });
      }
      // Recompute max values now that sub-lap residuals are in _residualSet
      var _rAllR=allR.filter(function(r){return!_residualSet.has(r);});
      var _rCad=_rAllR.filter(function(r){return r.cadencia>0;});
      maxCadVal=_rCad.length?Math.max.apply(null,_rCad.map(function(r){return Math.round(r.cadencia||0);})):0;
      var _rPot=_rAllR.filter(function(r){return r.potencia_w>0;});
      maxPotenciaVal=_rPot.length?Math.max.apply(null,_rPot.map(function(r){return Math.round(r.potencia_w||0);})):0;
      if(warmup){
        if(warmup.subLaps){
          rows+=_summaryRow(warmup,'phase-header','Calentamiento',_cumTimeSecs+(warmup.dur_raw_secs||warmup.dur_secs||0),warmup.zonas_lap);
          warmup.subLaps.forEach(function(sub){
            rows+=_dataRow(sub,null,false,false,'warmup-row group-lap',true);
            lastActiveLap=sub;
          });
        } else {
          rows+=_dataRow(warmup,null,false,false,'warmup-row',true);
          lastActiveLap=warmup;
        }
      }
      var lastGroupSyn=null;
      allSeriesForGroup.forEach(function(s){
        if(s._subLaps){
          s._isFastestGroup=maxKmhVal>0&&s._subLaps.some(function(l){return !_isDescanso(l)&&!_residualSet.has(l)&&l.speed>=maxKmhVal-0.001;});
          rows+=_summaryRow(s,'group-header','Carrera',_cumTimeSecs+(s.dur_raw_secs||s.dur_secs||0),s.zonas_lap,lastGroupSyn);
          s._subLaps.forEach(function(sub){
            var isDesc=_isDescanso(sub)||_residualSet.has(sub)||((sub.dist_km||0)>0&&(sub.dist_km||0)<_subResThresh);
            rows+=_dataRow(sub,lastActiveLap,isDesc,false,'group-lap',true);
            if(!isDesc)lastActiveLap=sub;
          });
          lastGroupSyn=s;
        } else {
          var _isDsc=_isDescanso(s)||_residualSet.has(s);
          rows+=_dataRow(s,lastActiveLap,_isDsc,false,'',true);
          if(!_isDsc)lastActiveLap=s;
        }
      });
      if(cooldown){
        if(cooldown.subLaps){
          rows+=_summaryRow(cooldown,'phase-header',cooldown.label||'Recuperación',_cumTimeSecs+(cooldown.dur_raw_secs||cooldown.dur_secs||0),cooldown.zonas_lap);
          cooldown.subLaps.forEach(function(sub){
            rows+=_dataRow(sub,lastActiveLap,false,false,'cooldown-row group-lap',true);
          });
        } else {
          rows+=_dataRow(cooldown,lastActiveLap,false,false,'cooldown-row',true);
        }
      }
    } else {
      // ── INTERVALOS: agrupado estilo Garmin ──
      var groups=_buildGroups(allSeriesForGroup);
      // Post-process: strip trailing descanso laps from the last interval group if they look
      // like a cooldown — either because the active lap before them is a residual, OR because
      // their total duration exceeds the average non-residual active lap (long cooldown phase)
      if(groups.length){
        var _lastG=groups[groups.length-1];
        if(_lastG.type==='interval'){
          var _trailDsc=[],_gL=_lastG.laps;
          for(var _ti=_gL.length-1;_ti>=0;_ti--){if(_isDescanso(_gL[_ti]))_trailDsc.unshift(_gL[_ti]);else break;}
          var _prevAct=(_trailDsc.length&&_gL.length>_trailDsc.length)?_gL[_gL.length-_trailDsc.length-1]:null;
          if(_prevAct&&_trailDsc.length){
            var _nonResAct=_lastG.activeLaps.filter(function(l){return!_residualSet.has(l);});
            var _avgActDur=_nonResAct.length?_nonResAct.reduce(function(a,l){return a+(l.dur_raw_secs||l.dur_secs||0);},0)/_nonResAct.length:0;
            var _trailDur=_trailDsc.reduce(function(a,l){return a+(l.dur_raw_secs||l.dur_secs||0);},0);
            var _shouldReclaim=_residualSet.has(_prevAct)||(_avgActDur>0&&_trailDur>_avgActDur)||_trailDsc.length>=2;
            if(_shouldReclaim){
              _lastG.laps=_gL.slice(0,_gL.length-_trailDsc.length);
              _trailDsc.forEach(function(l){l.label='Enfriamiento';l._intensityType='COOLDOWN';});
              var _existCdLaps=cooldown?(cooldown.subLaps||[cooldown]):[];
              var _allCdLaps=_trailDsc.concat(_existCdLaps);
              var _newCd=_synthLap(_allCdLaps,'Enfriamiento');
              _newCd.label='Enfriamiento';_newCd.vuelta=_rangeFromRows(_allCdLaps);_newCd.subLaps=_allCdLaps;
              cooldown=_newCd;
            }
          }
        }
      }

      if(warmup){
        if(warmup.subLaps){
          rows+=_summaryRow(warmup,'phase-header','Calentamiento',_cumTimeSecs+(warmup.dur_raw_secs||warmup.dur_secs||0),warmup.zonas_lap);
          var subRef=null;
          warmup.subLaps.forEach(function(sub){
            rows+=_dataRow(sub,subRef,false,false,'warmup-row group-lap',true);
            subRef=sub;
            lastActiveLap=sub;
          });
        } else {
          rows+=_dataRow(warmup,null,false,false,'warmup-row',true);
          lastActiveLap=warmup;
        }
      }

      groups.forEach(function(g){if(g.type==='interval'){var _t=_synthLap(g.activeLaps,'');if(_t){if(_t.fc_med>maxFCmSumVal)maxFCmSumVal=_t.fc_med;if((_t.speed||0)>maxSpdSum)maxSpdSum=_t.speed;if((_t.speed_max||0)>maxSmaxSum)maxSmaxSum=_t.speed_max;if((_t.cadencia||0)>maxCadSumVal)maxCadSumVal=_t.cadencia;if((_t.potencia_w||0)>maxPowSumVal)maxPowSumVal=_t.potencia_w;}}});
      var lastGroupSyn=null;
      groups.forEach(function(g){
        if(g.type==='warmup'||g.type==='cooldown'){
          var isWarm=g.type==='warmup';
          g.laps.forEach(function(s){
            rows+=_dataRow(s,lastActiveLap,false,false,isWarm?'warmup-row':'cooldown-row',true);
            if(!_isDescanso(s))lastActiveLap=s;
          });
          return;
        }
        var syn=_synthLap(g.activeLaps,'Carrera');
        var _gAllFCx=g.laps.filter(function(l){return l.fc_max>0;});if(_gAllFCx.length){var _gFCxDur=_gAllFCx.reduce(function(a,l){return a+(l.dur_raw_secs||l.dur_secs||0);},0);var _gFcxAvg=_gFCxDur?Math.round(_gAllFCx.reduce(function(a,l){return a+(l.fc_max||0)*(l.dur_raw_secs||l.dur_secs||0);},0)/_gFCxDur):syn.fc_max;syn.fc_max=_gFcxAvg;}
        syn.vuelta=_rangeFromRows(g.laps);
        syn._isFastestGroup=maxKmhVal>0&&g.activeLaps.some(function(l){return l.speed>=maxKmhVal-0.001;});
        var zonaSyn=_synthLap(g.laps,'');
        if(g.laps.length<=1){
          g.laps.forEach(function(s){
            rows+=_dataRow(s,lastActiveLap,false,false,'group-boundary',true);
            if(!_isDescanso(s))lastActiveLap=s;
          });
        } else {
          rows+=_summaryRow(syn,'group-header','Carrera',_cumTimeSecs+(syn.dur_raw_secs||syn.dur_secs||0),zonaSyn.zonas_lap,lastGroupSyn);
          g.laps.forEach(function(s){
            var isDesc=_isDescanso(s);
            rows+=_dataRow(s,lastActiveLap,isDesc,false,'group-lap',true);
            if(!isDesc)lastActiveLap=s;
          });
        }
        lastGroupSyn=syn;
      });

      if(cooldown){
        if(cooldown.subLaps){
          rows+=_summaryRow(cooldown,'phase-header',cooldown.label||'Recuperación',_cumTimeSecs+(cooldown.dur_raw_secs||cooldown.dur_secs||0),cooldown.zonas_lap);
          cooldown.subLaps.forEach(function(sub){
            rows+=_dataRow(sub,lastActiveLap,false,false,'cooldown-row group-lap',true);
          });
        } else {
          rows+=_dataRow(cooldown,lastActiveLap,false,false,'cooldown-row',true);
        }
      }
    }

  } else {
    // ── CARRERA / SESIÓN LIBRE: formato flat original ──
    // In compact-km mode, seriesArr may contain groups with _subLaps — render them as summary + sub-rows
    var _hasCompact=seriesArr.some(function(s){return !!s._subLaps;});
    if(_hasCompact){
      seriesArr.forEach(function(s){
        if(!_isDescanso(s)){
          if(s.fc_med>maxFCmSumVal)maxFCmSumVal=s.fc_med;
          if((s.speed||0)>maxSpdSum)maxSpdSum=s.speed;
          if((s.speed_max||0)>maxSmaxSum)maxSmaxSum=s.speed_max;
          if((s.cadencia||0)>maxCadSumVal)maxCadSumVal=s.cadencia;
          if((s.potencia_w||0)>maxPowSumVal)maxPowSumVal=s.potencia_w;
        }
      });
    }
    if(warmup){
      rows+=_dataRow(warmup,null,false,false,'warmup-row',true);
    }
    // ── Sub-lap residual threshold for compact view (individual laps, not compacted groups) ──
    var _subLapsFlat2=[];
    seriesArr.forEach(function(sx){if(sx._subLaps)_subLapsFlat2=_subLapsFlat2.concat(sx._subLaps);});
    var _subActDists2=_subLapsFlat2.filter(function(sx){return !_isDescanso(sx) && (sx.dist_km||0)>0;}).map(function(sx){return sx.dist_km;}).sort(function(a,b){return a-b;});
    var _subMedDist2=_subActDists2.length?_subActDists2[Math.floor(_subActDists2.length/2)]:0.5;
    var _subResThresh2=Math.max(0.01,_subMedDist2*0.2);
    if(!isMoto){
      _subLapsFlat2.forEach(function(sx,i,arr){
        var _d=sx.dist_km||0,_t=sx.dur_raw_secs||sx.dur_secs||0;
        if((_d>0&&_d<_subResThresh2)||(i===arr.length-1&&_t>0&&_t<=5))_residualSet.add(sx);
      });
    }
    // Recompute max values now that sub-lap residuals are in _residualSet
    var _rAllR=allR.filter(function(r){return!_residualSet.has(r);});
    var _rCad=_rAllR.filter(function(r){return r.cadencia>0;});
    maxCadVal=_rCad.length?Math.max.apply(null,_rCad.map(function(r){return Math.round(r.cadencia||0);})):0;
    var _rPot=_rAllR.filter(function(r){return r.potencia_w>0;});
    maxPotenciaVal=_rPot.length?Math.max.apply(null,_rPot.map(function(r){return Math.round(r.potencia_w||0);})):0;
    lastActiveLap=warmup;
    var lastCompactSyn=null;
    seriesArr.forEach(function(s,i){
      if(s._subLaps){
        s._isFastestGroup=maxKmhVal>0&&s._subLaps.some(function(l){return !_isDescanso(l)&&!_residualSet.has(l)&&l.speed>=maxKmhVal-0.001;});
        rows+=_summaryRow(s,'group-header',s.label||String(i+1),_cumTimeSecs+(s.dur_raw_secs||s.dur_secs||0),s.zonas_lap,lastCompactSyn);
        s._subLaps.forEach(function(sub){
          var isDesc=_isDescanso(sub)||_residualSet.has(sub)||((sub.dist_km||0)>0&&(sub.dist_km||0)<_subResThresh2);
          rows+=_dataRow(sub,lastActiveLap,isDesc,false,'group-lap',true);
          if(!isDesc)lastActiveLap=sub;
        });
        lastCompactSyn=s;
      } else {
        var isDesc=_isDescanso(s)||_residualSet.has(s);
        rows+=_dataRow(s,lastActiveLap,isDesc,false,'',true);
        if(!isDesc)lastActiveLap=s;
      }
    });
    if(cooldown){
      rows+=_dataRow(cooldown,lastActiveLap,false,false,'cooldown-row',true);
    }
  }

  // Calcular tiempo total y tiempo activo
  var _totalSecsRaw=_allRNoRes.reduce(function(a,r){return a+rowDur(r);},0);
  var _activeSecsRaw=activeOnlyArr.reduce(function(a,r){return a+rowDur(r);},0);
  var totalSecs=Math.round(_totalSecsRaw);
  var activeSecs=Math.round(_activeSecsRaw);
  // Si no hay dur_secs, estimar desde dist/speed
  if(!totalSecs)totalSecs=_allRNoRes.reduce(function(a,r){return a+(r.speed>0?Math.round(r.dist_km*1000/r.speed):0);},0);
  if(!activeSecs)activeSecs=activeOnlyArr.reduce(function(a,r){return a+(r.speed>0?Math.round(r.dist_km*1000/r.speed):0);},0);

  var distSes='<div class="metric"><div class="main">'+(d.distancia_total||'—')+'</div>'+_acumHtml(desnivelAcum)+'</div>';
  var zonasGlobal=aggregateZones(allR);
  var zonasSeries=aggregateZones(activeOnlyArr);
  var totalTimeHtml='<div class="metric"><div class="main">'+(_totalSecsRaw?secsToStepStr(_totalSecsRaw,isMoto?3:1):'')+'</div></div>';
  var activeTimeHtml='<div class="metric"><div class="main">'+(_activeSecsRaw?secsToStepStr(_activeSecsRaw,isMoto?3:1):'')+'</div></div>';

  var _velMaxCellSes='<td id="'+_actId+'ses-cad"><div class="metric"><div class="main">'+(avgSpeedMaxSes>=0.3?(avgSpeedMaxSes*3.6).toFixed(2)+' km/h':'—')+'</div></div></td>';
  var _velMaxCellSer='<td id="'+_actId+'ser-cad"><div class="metric"><div class="main">'+(avgSpeedMaxSer>=0.3?(avgSpeedMaxSer*3.6).toFixed(2)+' km/h':'—')+'</div></div></td>';
  if(esContinua){
    var _distElevSes=(d.distancia_total||'')+_acumHtml(desnivelAcum);
    rows+='<tr id="'+_actId+'ses" class="avg-act"><td><div class="metric" style="align-items:flex-start"><div class="main">Media sesión<button class="hide-btn" onclick="event.stopPropagation();_hideSummaryRow(\''+_actId+'ses\',\''+_actId+'\')" title="Ocultar fila">✕</button></div><div id="'+_actId+'ses-dist" style="font-size:10px;color:#6a7280;margin-top:2px">'+(_distElevSes||'')+'</div></div></td>'
      +'<td id="'+_actId+'ses-time" class="col-time">'+totalTimeHtml+'</td>'
      +'<td id="'+_actId+'ses-cum" class="col-cum-time">'+totalTimeHtml+'</td>'
      +(isIndoorCycling?'':'<td id="'+_actId+'ses-spd"><div class="metric"><div class="main">'+avgKmhSes+'</div></div></td>')
      +((isMoto||(isCycling&&!isIndoorCycling))?_velMaxCellSes:(avgCadSes!=='—'?'<td id="'+_actId+'ses-cad"><div class="metric"><div class="main">'+avgCadSes+'</div></div></td>':'<td id="'+_actId+'ses-cad"></td>'))
      +(isMoto?'':(isCycling?'<td id="'+_actId+'ses-pac"><div class="metric"><div class="main">'+(avgPotenciaSes>0?avgPotenciaSes:'—')+'</div></div></td>':''))
      +'<td id="'+_actId+'ses-fcm"><div class="metric"><div class="main"><span class="fc-med-pill">'+avgFCmSes+'</span></div></div></td>'
      +'<td id="'+_actId+'ses-fcx"><div class="metric"><div class="main"><span class="fc-max-pill">'+avgFCxSes+'</span></div></div></td>'
      +zonaCellHtml(zonasGlobal,true)+'</tr>';
  } else {
    rows+='<tr id="'+_actId+'ses" class="avg-row"><td>Media sesión<button class="hide-btn" onclick="event.stopPropagation();_hideSummaryRow(\''+_actId+'ses\',\''+_actId+'\')" title="Ocultar fila">✕</button></td>'
      +'<td class="col-lap"></td><td id="'+_actId+'ses-time" class="col-time">'+totalTimeHtml+'</td><td id="'+_actId+'ses-cum" class="col-cum-time">'+totalTimeHtml+'</td>'
      +(isIndoorCycling?'':'<td id="'+_actId+'ses-dist" class="col-dist" style="padding-left:14px;padding-right:14px">'+distSes+'</td>')
      +(isIndoorCycling?'':'<td id="'+_actId+'ses-spd"><div class="metric"><div class="main">'+avgKmhSes+'</div></div></td>')
      +((isMoto||(isCycling&&!isIndoorCycling))?_velMaxCellSes:(avgCadSes!=='—'?'<td id="'+_actId+'ses-cad"><div class="metric"><div class="main">'+avgCadSes+'</div></div></td>':'<td id="'+_actId+'ses-cad"></td>'))
      +(isMoto?'':(isCycling?'<td id="'+_actId+'ses-pac"><div class="metric"><div class="main">'+(avgPotenciaSes>0?avgPotenciaSes:'—')+'</div></div></td>':'<td id="'+_actId+'ses-pac"><div class="metric"><div class="main">'+(avgRSSes?toRitmo(avgSpeedSes):'—')+'</div></div></td>'))
      +'<td id="'+_actId+'ses-fcm"><div class="metric"><div class="main"><span class="fc-med-pill">'+avgFCmSes+'</span></div></div></td>'
      +'<td id="'+_actId+'ses-fcx"><div class="metric"><div class="main"><span class="fc-max-pill">'+avgFCxSes+'</span></div></div></td>'
      +zonaCellHtml(zonasGlobal,true)+'</tr>'
      +(isMoto?'':('<tr id="'+_actId+'ser" class="avg-act"><td>Media trabajo efectivo<button class="hide-btn" onclick="event.stopPropagation();_hideSummaryRow(\''+_actId+'ser\',\''+_actId+'\')" title="Ocultar fila">✕</button></td>'
      +'<td class="col-lap"></td><td id="'+_actId+'ser-time" class="col-time">'+activeTimeHtml+'</td><td id="'+_actId+'ser-cum" class="col-cum-time">'+activeTimeHtml+'</td>'
      +(isIndoorCycling?'':'<td id="'+_actId+'ser-dist" class="col-dist" style="padding-left:14px;padding-right:14px"><div class="metric"><div class="main">'+avgDSer+'</div>'+_acumHtml(avgDsnivelSer)+'</div></td>')
      +(isIndoorCycling?'':'<td id="'+_actId+'ser-spd"><div class="metric"><div class="main">'+avgKmhSer+'</div></div></td>')
      +((isCycling&&!isIndoorCycling)?_velMaxCellSer:(avgCadSer!=='—'?'<td id="'+_actId+'ser-cad"><div class="metric"><div class="main">'+avgCadSer+'</div></div></td>':'<td id="'+_actId+'ser-cad"></td>'))
      +(isCycling?'<td id="'+_actId+'ser-pac"><div class="metric"><div class="main">'+(avgPotenciaSer>0?avgPotenciaSer:'—')+'</div></div></td>':'<td id="'+_actId+'ser-pac"><div class="metric"><div class="main">'+(avgRSSer?toRitmo(avgSpeedSer):'—')+'</div></div></td>')
      +'<td id="'+_actId+'ser-fcm"><div class="metric"><div class="main"><span class="fc-med-pill">'+avgFCmSer+'</span></div></div></td>'
      +'<td id="'+_actId+'ser-fcx"><div class="metric"><div class="main"><span class="fc-max-pill">'+avgFCxSer+'</span></div></div></td>'
      +zonaCellHtml(zonasSeries,true)+'</tr>'));
  }

  var zHtml='';
  var blockSes=_renderZoneBlockGlobal('Media sesión',zonasGlobal);
  var sep='<div class="zones-sep"><span class="zones-sep-text">by AlejandrLucena</span></div>';
  if(esIntervalos&&!isMoto){
    var both=_renderZonesSideBySide('Media sesión',zonasGlobal,'Media trabajo efectivo',zonasSeries);
    if(both)zHtml=sep+'<div class="zones">'+both+'</div>';
  } else if(blockSes){
    zHtml=sep+'<div class="zones">'+blockSes+'</div>';
  }

  var eb='';// estructura badge removed

  var thSerie=isIndoorCycling?'Lap/Paso':(esLibre?'Lap':'Tipo de paso');
  var actIdx=Math.random().toString(36).slice(2,8);
  var hasPowerCol=isCycling;
  var hasPaceCol=!isMoto&&!isCycling&&!(esContinua&&esCarrera);
  var colgroup=useTiming
    ?'<colgroup><col class="col-step"'+(esContinua?' style="width:60px"':'')+'>'+( showLapCol?'<col class="col-lap">':'')+'<col class="col-time"><col class="col-cum-time">'+((esContinua||isIndoorCycling)?'':'<col class="col-dist">')+(isIndoorCycling?'':'<col class="col-speed">')+'<col class="col-cad">'+((hasPowerCol||hasPaceCol)?'<col class="col-pace">':'')+'<col class="col-hr"><col class="col-hr-max"><col class="col-zone"></colgroup>'
    :'';

  function fmtDur(s){if(!s||!isFinite(s))return'—';s=Math.round(s);var h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sc=s%60;if(h>0)return h+'h '+m+'min';if(m>0)return m+'min '+(sc>0?sc+'s':'');return sc+'s';}

  var _sesDistInput = _adjDistSes ? _adjDistSes.toFixed(2) : '';
  var _sesPaceInput = _adjPaceSes ? _secsToPaceStr(_adjPaceSes) : '';
  var _sesSpdInput = _adjDistSes && totalDurSes > 0 ? (_adjDistSes * 1000 / totalDurSes * 3.6).toFixed(2) : '';
  var _serDistInput = _adjDistSer ? _adjDistSer.toFixed(2) : '';
  var _serPaceInput = _adjPaceSer ? _secsToPaceStr(_adjPaceSer) : '';
  var _serSpdInput = _adjDistSer && totalDurSer > 0 ? (_adjDistSer * 1000 / totalDurSer * 3.6).toFixed(2) : '';

  var statsHtml = '<div class="session-stats">'
    + '<div class="stat-chip"><span class="stat-lbl">Tiempo sesión</span><span class="stat-val">'+fmtDur(totalSecs)+'</span></div>'
    + '<div class="stat-chip stat-editable" data-act="'+_actId+'" data-field="sesDist">'
      + '<span class="stat-edit-unit">Dist</span>'
      + '<input type="text" value="'+_sesDistInput+'" '
      + 'onfocus="this.select()" onblur="_onDistEdit(this,\''+_actId+'\')" '
      + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}" '
      + 'placeholder="km">'
      + '<span class="stat-edit-unit">km</span>'
    + '</div>'
    + '<div class="stat-chip stat-editable" data-act="'+_actId+'" data-field="sesPace">'
      + '<span class="stat-edit-unit">Ritmo</span>'
      + '<input type="text" value="'+_sesPaceInput+'" '
      + 'onfocus="this.select()" onblur="_onPaceEdit(this,\''+_actId+'\')" '
      + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}" '
      + 'placeholder="m:ss">'
    + '</div>'
    + '<div class="stat-chip stat-editable" data-act="'+_actId+'" data-field="sesSpd">'
      + '<span class="stat-edit-unit">Vel</span>'
      + '<input type="text" value="'+_sesSpdInput+'" '
      + 'onfocus="this.select()" onblur="_onSpeedEdit(this,\''+_actId+'\')" '
      + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}" '
      + 'placeholder="km/h">'
      + '<span class="stat-edit-unit">km/h</span>'
    + '</div>'
    + (esIntervalos
      ? '<div class="stat-chip"><span class="stat-lbl">Tiempo activo</span><span class="stat-val">'+fmtDur(activeSecs)+'</span></div>'
        + '<div class="stat-chip stat-editable" data-act="'+_actId+'" data-field="serDist">'
          + '<span class="stat-edit-unit">Dist.act</span>'
          + '<input type="text" value="'+_serDistInput+'" '
          + 'onfocus="this.select()" onblur="_onDistEdit(this,\''+_actId+'\')" '
          + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}" '
          + 'placeholder="km">'
          + '<span class="stat-edit-unit">km</span>'
        + '</div>'
        + '<div class="stat-chip stat-editable" data-act="'+_actId+'" data-field="serPace">'
          + '<span class="stat-edit-unit">Rit.act</span>'
          + '<input type="text" value="'+_serPaceInput+'" '
          + 'onfocus="this.select()" onblur="_onPaceEdit(this,\''+_actId+'\')" '
          + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}" '
          + 'placeholder="m:ss">'
        + '</div>'
        + '<div class="stat-chip stat-editable" data-act="'+_actId+'" data-field="serSpd">'
          + '<span class="stat-edit-unit">Vel.act</span>'
          + '<input type="text" value="'+_serSpdInput+'" '
          + 'onfocus="this.select()" onblur="_onSpeedEdit(this,\''+_actId+'\')" '
          + 'onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}" '
          + 'placeholder="km/h">'
          + '<span class="stat-edit-unit">km/h</span>'
        + '</div>'
      : '')
    + '</div>';

  var phaseFilterHtml='<div class="phase-filter-bar" data-actid="'+_actId+'">'
    +'<span class="phase-pill" data-phase="all" onclick="_setPhaseFilter(\''+_actId+'\',\'all\')">Todo</span>'
    +'<span class="phase-pill warmup" data-phase="warmup" onclick="_setPhaseFilter(\''+_actId+'\',\'warmup\')">Calentamiento</span>'
    +'<span class="phase-pill" data-phase="main" onclick="_setPhaseFilter(\''+_actId+'\',\'main\')">Carrera</span>'
    +'<span class="phase-pill cooldown" data-phase="cooldown" onclick="_setPhaseFilter(\''+_actId+'\',\'cooldown\')">Enfriamiento</span>'
    +'</div>';

  var lblContent=(d.fecha||'')+' — '+(d.nombre||'')+' — '+(d.tipo||'')+' — '+(d.distancia_total||'');

  return'<div class="actividad" id="act-'+_actId+'" data-sport="'+(isMoto?'MOTO':isCycling?'BICI':'RUN')+'" data-indoor="'+(isIndoorCycling?1:0)+'" data-continua="'+(esContinua?1:0)+'" data-orig-dist="'+totalDistSes.toFixed(4)+'" data-orig-dur="'+totalDurSes+'" data-orig-dist-ser="'+totalDistSer.toFixed(4)+'" data-orig-dur-ser="'+totalDurSer+'">'
    +'<div class="lbl" contenteditable="true" spellcheck="false"'
    +' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur()}"'
    +' title="Haz clic para editar">'+lblContent+'</div>'
    +statsHtml
    +phaseFilterHtml
    +'<div class="table-scroll"><table class="'+(useTiming?'interval-table'+(esContinua?' esContinua':''):'')+'"> '
    +colgroup
    +'<thead><tr>'
    +(esContinua?'<th class="th-dist" style="text-align:left">'+(isIndoorCycling?'Lap/Paso':'Distancia<span style="margin:0 5px;opacity:.3">·</span><span class="th-sub-inline">Desnivel</span>')+'</th>':'<th>'+thSerie+'</th>')
    +(useTiming?(showLapCol?'<th class="col-lap">Vuelta</th>':'')+'<th class="col-time">Tiempo</th><th class="col-cum-time">T. Acumulado</th>':'')
    +(esContinua||isIndoorCycling?'':'<th class="th-dist" style="padding-left:14px;padding-right:14px">Distancia<span style="margin:0 5px;opacity:.3">·</span><span class="th-sub-inline">Desnivel</span></th>')
    +(isIndoorCycling?'':'<th>Vel. Med</th>')
    +((isMoto||(isCycling&&!isIndoorCycling))?'<th>Vel. Máx</th>':'<th>Cadencia</th>')
    +(isMoto?'':(isCycling?'<th>Potencia (W)</th>':(esContinua&&esCarrera?'':'<th>Ritmo</th>')))
    +'<th>FC med</th>'
    +'<th>FC máx</th>'
    +'<th class="th-zona">Zona FC<span style="margin:0 5px;opacity:.3">·</span><span class="th-sub-inline">tiempo · %</span></th>'
    +'</tr></thead>'
    +'<tbody>'+rows+'</tbody>'
    +'</table></div>'
    +'<div id="'+_actId+'-restore" class="restore-bar" style="display:none"><button class="btn-restore-toggle" onclick="_toggleRestorePanel(\''+_actId+'\')">↩ <span id="'+_actId+'-restore-count"></span> ▾</button><button class="btn-restore-all-g" onclick="_restoreAll(\''+_actId+'\')">✕ Todo</button><div id="'+_actId+'-restore-panel" class="restore-panel" style="display:none"></div></div>'
    +'<div id="'+_actId+'-cols-bar" class="restore-bar cols-bar" style="display:none"><button class="btn-restore-toggle btn-cols-restore-toggle" onclick="_toggleColsPanel(\''+_actId+'\')">📐 0 columnas ocultas ▾</button><button class="btn-restore-all-g" onclick="_restoreAllColumns(\''+_actId+'\')">✕ Todo</button><div id="'+_actId+'-cols-panel" class="restore-panel" style="display:none"></div></div>'
    +zHtml
    +'</div>';
}

/* ── DETECT AND NORMALIZE CHATGPT NESTED FORMAT ── */
// ChatGPT sometimes returns { activity_id, name, series: [{label, laps:[...]}, ...], zones:[...] }
function fromChatGPTNested(raw){
  if(!raw.series||!Array.isArray(raw.series))return null;
  if(!raw.series[0]||!raw.series[0].laps)return null;

  const name=raw.name||raw.activity_name||'';
  const date=raw.date||raw.start_time_local||'';
  const MESES=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  let fechaFmt='';
  const dm=date.match(/(\d+)\s+([A-Za-z]+)/);
  if(dm){fechaFmt=dm[0];}
  // Try "22 Apr 2026" format
  const dmy=date.match(/(\d+)\s+(\w+)\s+\d+/);
  if(dmy){
    const monMap={Jan:'Ene',Feb:'Feb',Mar:'Mar',Apr:'Abr',May:'May',Jun:'Jun',Jul:'Jul',Aug:'Ago',Sep:'Sep',Oct:'Oct',Nov:'Nov',Dec:'Dic'};
    fechaFmt=dmy[1]+' '+(monMap[dmy[2]]||dmy[2]);
  }

  const tipo=_TIPO_MAP[raw.type||raw.activity_type||'']||'CINTA';
  const totalDist=((raw.distance_total_km||0)).toFixed(2);

  // Build global zones from raw.zones
  const ZONE_NAMES={Z1:'Zona 1 · Calentamiento',Z2:'Zona 2 · Suave',Z3:'Zona 3 · Aeróbica',Z4:'Zona 4 · Umbral',Z5:'Zona 5 · Máximo'};
  const ZONE_COLORS={Z1:'#a0a0a0',Z2:'#4a90e2',Z3:'#27ae60',Z4:'#f39c12',Z5:'#e74c3c'};
  const zonas=(raw.zones||[]).filter(z=>z.secs>0).sort((a,b)=>{
    const n=x=>parseInt(x.zone?.replace('Z','')||0);return n(b)-n(a);
  }).map(z=>({
    nombre:ZONE_NAMES[z.zone]||z.zone,
    secs:z.secs,
    rango:z.rango||'',
    color:ZONE_COLORS[z.zone]||'#888'
  }));

  // Flatten all laps from all series into a flat list
  let warmup=null,cooldown=null,series=[];
  let activeCount=0;

  function _phaseSynth(laps,labelStr){
    if(!laps||!laps.length)return null;
    var totDur=laps.reduce(function(a,l){return a+(l.dur_secs||0);},0);
    var totDist=laps.reduce(function(a,l){return a+(l.dist_km||0);},0);
    var durSum=laps.reduce(function(a,l){return a+(l.dur_secs||0);},0)||1;
    var avgSpd=laps.reduce(function(a,l){return a+(l.speed||0)*(l.dur_secs||0);},0)/durSum;
    var avgFCm=Math.round(laps.reduce(function(a,l){return a+(l.fc_med||0)*(l.dur_secs||0);},0)/durSum);
    var maxFCx=Math.max(0,...laps.map(function(l){return l.fc_max||0;}));
    var cadLaps=laps.filter(function(l){return (l.cadence||l.cadencia||0)>0;});
    var cadSum=cadLaps.reduce(function(a,l){return a+(l.dur_secs||0);},0)||1;
    var avgCad=cadLaps.length?Math.round(cadLaps.reduce(function(a,l){return a+((l.cadence||l.cadencia||0))*(l.dur_secs||0);},0)/cadSum):0;
    var subLaps=laps.map(function(lap,i){return{
      label:labelStr,
      vuelta:String(i+1),
      speed:lap.speed||0,
      dist_km:lap.dist_km||0,
      dur_raw_secs:lap.dur_secs||0,dur_secs:Math.round(lap.dur_secs||0),
      cadencia:Math.round(lap.cadence||lap.cadencia||0),
      speed_max:lap.speed_max||0,
      potencia_w:Math.round(lap.potencia_w||lap.power||0),
      desnivel:lap.desnivel||0,
      fc_med:Math.round(lap.fc_med||0),fc_max:Math.round(lap.fc_max||0),
      zonas_lap:lap.zonas_lap||[]
    };});
    return{
      label:labelStr,
      speed:avgSpd,dist_km:Math.round(totDist*100)/100,
      dur_raw_secs:totDur,dur_secs:Math.round(totDur),
      cadencia:avgCad,
      speed_max:Math.max(0,...laps.map(function(l){return l.speed_max||0;})),
      potencia_w:Math.round(laps.reduce(function(a,l){return a+(l.potencia_w||l.power||0)*(l.dur_secs||0);},0)/durSum),
      desnivel:0,
      fc_med:avgFCm,fc_max:maxFCx,
      vuelta:laps.length>1?'1 - '+laps.length:'1',
      zonas_lap:[],
      subLaps:laps.length>1?subLaps:null
    };
  }

  raw.series.forEach(sg=>{
      const lbl=(sg.label||'').toLowerCase();
      const isWarm=lbl.includes('warmup')||lbl.includes('calentamiento');
      // Only COOLDOWN types are cooldown. RECOVERY between intervals is NOT cooldown.
      const isCool=lbl.includes('cooldown')||lbl.includes('enfriamiento');

      if(isWarm&&!series.length&&!warmup){
        warmup=_phaseSynth(sg.laps,'Calentamiento');
        return;
      }
      if(isCool&&sg.laps&&sg.laps.length){
        cooldown=_phaseSynth(sg.laps,lbl.includes('cooldown')||lbl.includes('enfriamiento')?'Enfriamiento':'Recuperación');
        return;
      }

      (sg.laps||[]).forEach(lap=>{
        const isRec=lap.type==='recovery'||lap.type==='rest';
      const s={
        label:'',
        speed:lap.speed||0,
        dist_km:lap.dist_km||0,
        dur_secs:lap.dur_secs||0,
        cadencia:Math.round(lap.cadence||0),
        speed_max:0,
        desnivel:lap.desnivel||0,
        fc_med:lap.fc_med||0,
        fc_max:lap.fc_max||0,
        zonas_lap:lap.zonas_lap||[]
      };

      if(isRec){
        s.label='Descanso';series.push(s);
      } else {
        activeCount++;s.label='Carrera';series.push(s);
      }
    });
  });

  return{fecha:fechaFmt,nombre:name,tipo,modo:'intervalos',estructura:null,
    distancia_total:totalDist+' km',warmup,series,cooldown,zonas};
}

/* ── EXTRACT JSON ── */
function sanitizeJson(s){
  // Fix common malformed patterns like "zone": 5": 0.0 → "zone5": 0.0 or remove bad entries
  return s
    .replace(/"zone":\s*(\d+)":/g,'"zone$1":') // "zone": 5": → "zone5":
    .replace(/,\s*}/g,'}')   // trailing commas
    .replace(/,\s*]/g,']');  // trailing commas in arrays
}
function extractJson(text){
  // Try direct parse
  try{return JSON.parse(text);}catch(e){}
  // Try sanitized
  try{return JSON.parse(sanitizeJson(text));}catch(e){}
  // Try CSV format
  const lines=text.trim().split('\n');
  if(lines.length>=2&&lines[0].includes('activity_id')&&lines[0].includes('type')){
    const header=lines[0].split(',').map(h=>h.trim());
    const actId=header.indexOf('activity_id');
    const actName=header.indexOf('activity_name');
    const start=header.indexOf('start_time_local');
    const type=header.indexOf('type');
    const dist=header.indexOf('dist_km');
    const dur=header.indexOf('duration_s');
    const hrAvg=header.indexOf('avg_hr');
    const hrMax=header.indexOf('max_hr');
    const cad=header.indexOf('avg_cadence');
    const laps=[];
    for(let i=1;i<lines.length;i++){
      if(!lines[i].trim())continue;
      const cols=lines[i].split(',');
      const d=dist>=0?parseFloat(cols[dist])||0:0;
      const t=dur>=0?parseFloat(cols[dur])||0:0;
      const spd=t>0?(d*1000)/t:0; // speed in m/s (dist_km * 1000 / dur_secs)
      laps.push({
        type:(type>=0?cols[type]:'ACTIVE').trim(),
        dist_km:d,
        dur_secs:t,
        speed:spd,
        fc_med:hrAvg>=0?parseFloat(cols[hrAvg])||0:0,
        fc_max:hrMax>=0?parseFloat(cols[hrMax])||0:0,
        cadencia:cad>=0?Math.round(parseFloat(cols[cad])||0):0,
        speed_max:0
      });
    }
    return{
      activity_id:actId>=0?cols[actId]:'',
      activity_name:actName>=0?cols[actName]:'',
      start_time_local:start>=0?cols[start]:'',
      laps:laps
    };
  }
  // Find all ```json blocks
  const fences=[...text.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map(m=>m[1].trim());
  if(fences.length===1){try{return JSON.parse(fences[0]);}catch(e){try{return JSON.parse(sanitizeJson(fences[0]));}catch(e2){}}}
  if(fences.length>1){
    // Multiple blocks — try to merge as actividades_raw
    const parsed=fences.map(f=>{try{return JSON.parse(f);}catch(e){return null;}}).filter(Boolean);
    if(parsed.length>1){
      // Each block might be one activity
      const acts=[];
      parsed.forEach(p=>{
        if(p.actividades_raw)acts.push(...p.actividades_raw);
        else if(p.laps)acts.push(p);
        else if(p.actividades)acts.push(...p.actividades);
      });
      if(acts.length>1)return{actividades_raw:acts};
      if(acts.length===1)return acts[0];
    }
    if(parsed.length===1)return parsed[0];
  }
  // Try extracting largest { } block
  const first=text.indexOf('{'),last=text.lastIndexOf('}');
  if(first!==-1&&last>first){try{return JSON.parse(text.slice(first,last+1));}catch(e){}}
  return null;
}

/* ── NORMALIZE RAW GARMIN: handle any field name variant ── */
function _normLap(lap){
  // Normalize intensity type from various field names
  const raw=(lap.intensityType||lap.type||lap.lapType||'ACTIVE').toString().toUpperCase();
  // Map variants
  const intensityMap={
    'WARMUP':'WARMUP','WARM_UP':'WARMUP','CALENTAMIENTO':'WARMUP','INTERVAL_WARMUP':'WARMUP',
    'ACTIVE':'ACTIVE','INTERVAL_ACTIVE':'ACTIVE','RUN':'ACTIVE','RWD_RUN':'ACTIVE',
    'INTERVAL':'ACTIVE','REGULAR':'ACTIVE',
    'REST':'REST','INTERVAL_RECOVERY':'REST','RWD_STAND':'REST','RWD_STOP':'REST','RWD_WALK':'REST',
    'RECOVERY':'RECOVERY','COOLDOWN':'COOLDOWN','COOL_DOWN':'COOLDOWN',
    'ACTIVE_FINISH':'ACTIVE','FINISH':'ACTIVE',
    '0':'ACTIVE','1':'REST','2':'WARMUP','3':'COOLDOWN','4':'RECOVERY'
  };
  const intensity=intensityMap[raw]||'ACTIVE';
  const distance=lap.distance||lap.distanceMeters||lap.distance_m||(lap.dist_km?lap.dist_km*1000:0)||0;
  const duration=lap.duration||lap.totalElapsedTime||lap.elapsedDuration||lap.dur_secs||lap.duration_s||0;
  const movingDuration=lap.movingDuration||lap.moving_duration||lap.moving_duration_s||0;
  // Speed preference: averageSpeed (real avg over lap) > moving speed > calculated from dist/dur
  const avgSpeed=lap.averageSpeed||lap.avg_speed||lap.avg_speed_mps||lap.speed||0;
  const avgMovSpeed=lap.averageMovingSpeed||lap.avg_moving_speed||0;
  const calcSpeed=(distance>0&&duration>0)?distance/duration:0;
  const finalSpeed=avgSpeed||avgMovSpeed||calcSpeed;
  const avgHR=lap.averageHR||lap.averageHeartRate||lap.avgHR||lap.avg_hr||lap.fc_med||0;
  const maxHR=lap.maxHR||lap.maxHeartRate||lap.max_hr||lap.fc_max||0;
  const cadence=lap.avgRunningCadence||lap.averageRunCadence||lap.avgRunningCadence||lap.avg_cadence||lap.avg_run_cadence||lap.averageCadence||lap.cadencia||lap.cadence||0;
  // wktStepIndex: same value across laps from one workout step (auto-lap can split a step)
  const rawWkt=(lap.wktStepIndex!==undefined&&lap.wktStepIndex!==null)?lap.wktStepIndex:null;
  const wktStepIndex=rawWkt!==null?(typeof rawWkt==='object'&&rawWkt!==null?rawWkt.value:rawWkt):null;
  const lapIndex=lap.lapIndex||lap.lap_index||lap.messageIndex||lap.message_index||null;
  return{
    intensityType:intensity,
    distance,duration,movingDuration,
    averageSpeed:finalSpeed,
    averageMovingSpeed:finalSpeed,
    averageHR:avgHR,
    maxHR:maxHR,
    averageRunCadence:cadence,
    avgPower:lap.avgPower||lap.averagePower||lap.avg_power||lap.power||0,
    maxSpeed:lap.maxSpeed||lap.max_speed||lap.enhancedMaxSpeed||lap.enhanced_max_speed||lap.speed_max||0,
    elevationGain:lap.elevationGain||lap.totalAscent||lap.ascent||lap.elevation_gain||0,
    elevationLoss:lap.elevationLoss||lap.totalDescent||lap.descent||lap.elevation_loss||0,
    hrTimeInZone:lap.hrTimeInZone||lap.hr_time_in_zones||[],
    lapStart:lap.lapStart||lap.lap_start||lapIndex,
    lapEnd:lap.lapEnd||lap.lap_end||lapIndex,
    wktStepIndex:wktStepIndex
  };
}

/* ── MERGE LAPS SPLIT BY AUTO-LAP ── */
// Garmin auto-lap (e.g. every 1 km) can split a single workout step into multiple laps.
// These split laps share the same wktStepIndex and intensityType. Merge them back.
function _mergeAutoLapSplits(laps){
  if(!laps.length)return laps;
  // Only merge when wktStepIndex is informative (at least one lap has a real value)
  const hasWkt=laps.some(l=>l.wktStepIndex!==null&&l.wktStepIndex!==undefined);
  if(!hasWkt)return laps;
  const out=[];
  for(const lap of laps){
    const prev=out[out.length-1];
    const sameStep=prev
      &&prev.wktStepIndex!==null&&prev.wktStepIndex!==undefined
      &&lap.wktStepIndex!==null&&lap.wktStepIndex!==undefined
      &&prev.wktStepIndex===lap.wktStepIndex
      &&prev.intensityType===lap.intensityType;
    if(!sameStep){out.push({...lap});continue;}
    // Merge: sums for distance/duration, weighted means for HR/speed/cadence, max for maxHR
    const totDur=(prev.duration||0)+(lap.duration||0);
    const totDist=(prev.distance||0)+(lap.distance||0);
    const wAvg=(a,b,wa,wb)=>{const t=wa+wb;return t>0?(a*wa+b*wb)/t:(a||b||0);};
    prev.distance=totDist;
    prev.duration=totDur;
    prev.movingDuration=(prev.movingDuration||0)+(lap.movingDuration||0);
    prev.averageSpeed=totDur>0?totDist/totDur:wAvg(prev.averageSpeed,lap.averageSpeed,prev.duration,lap.duration);
    prev.averageMovingSpeed=prev.averageSpeed;
    prev.averageHR=Math.round(wAvg(prev.averageHR,lap.averageHR,prev.duration,lap.duration));
    prev.maxHR=Math.max(prev.maxHR||0,lap.maxHR||0);
    prev.maxSpeed=Math.max(prev.maxSpeed||0,lap.maxSpeed||0);
    prev.averageRunCadence=Math.round(wAvg(prev.averageRunCadence,lap.averageRunCadence,prev.duration,lap.duration));
    prev.elevationGain=(prev.elevationGain||0)+(lap.elevationGain||0);
    prev.elevationLoss=(prev.elevationLoss||0)+(lap.elevationLoss||0);
    prev.lapStart=prev.lapStart||lap.lapStart;
    prev.lapEnd=lap.lapEnd||lap.lapStart||prev.lapEnd;
    // Sum hrTimeInZone arrays per zone
    if(lap.hrTimeInZone&&lap.hrTimeInZone.length){
      const acc={};
      (prev.hrTimeInZone||[]).forEach(z=>{acc[z.zoneNumber]={...z};});
      lap.hrTimeInZone.forEach(z=>{
        const k=z.zoneNumber;
        if(acc[k])acc[k].secsInZone=(acc[k].secsInZone||0)+(z.secsInZone||0);
        else acc[k]={...z};
      });
      prev.hrTimeInZone=Object.values(acc);
    }
  }
  return out;
}

/* ── CONVERT RAW GARMIN JSON → RENDERER FORMAT ── */
function fromRawGarmin(raw){
  if(raw.actividades_raw){
    return{actividades:raw.actividades_raw.map(fromRawGarmin).filter(Boolean)};
  }

  const rawLaps=raw.laps||raw.splits||[];
  if(!rawLaps.length&&!raw.activity_id&&!raw.activityId)return null;

  const name=raw.activity_name||raw.activityName||raw.name||'';
  const startLocal=raw.start_time_local||raw.startTimeLocal||raw.date||'';
  const MESES=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const fparts=(startLocal+'').split(/[-T ]/);
  const fechaFmt=fparts.length>=3?(parseInt(fparts[2])+' '+MESES[parseInt(fparts[1])]):'';

  const tipo=_TIPO_MAP[raw.activity_type||raw.type||'']||'CINTA';

  const sum=raw.summary||{};
  const sumDist=sum.distance||sum.total_distance||sum.totalDistance||sum.distance_m||0;

  // Global HR zones — handle both array and {z1_s,...} object formats
  let _rz=raw.hr_time_in_zones||raw.hrTimeInZones||raw.hr_zones||raw.hrZones||[];
  if(_rz&&!Array.isArray(_rz)){
    const _o=_rz;
    _rz=[1,2,3,4,5].map(n=>({zoneNumber:n,secsInZone:_o['z'+n+'_s']||_o['z'+n]||0,zoneLowBoundary:0})).filter(z=>z.secsInZone>0);
  }
  const rawZones=_rz;
  const normalizedRawZones=rawZones.map(z=>({
    zoneNumber:z.zoneNumber||z.zone||0,
    secsInZone:Number(z.secsInZone||z.secs||z.seconds||0),
    zoneLowBoundary:Number(z.zoneLowBoundary||z.lowBoundary||0)
  })).filter(z=>z.zoneNumber>0);

  const ZONE_NAMES={1:'Zona 1 · Calentamiento',2:'Zona 2 · Suave',3:'Zona 3 · Aeróbica',4:'Zona 4 · Umbral',5:'Zona 5 · Máximo'};
  const ZONE_COLORS={1:'#a0a0a0',2:'#4a90e2',3:'#27ae60',4:'#f39c12',5:'#e74c3c'};

  // Build sorted-by-zoneNumber lookup for boundaries
  const allZones=normalizedRawZones.map(z=>({
    zoneNumber:z.zoneNumber,
    zoneLowBoundary:z.zoneLowBoundary
  })).filter(z=>z.zoneNumber>0);

  function zoneNumberForHR(hr){
    if(!hr||!allZones.length)return 0;
    const sorted=allZones.slice().sort((a,b)=>a.zoneNumber-b.zoneNumber);
    for(let i=sorted.length-1;i>=1;i--){
      const low=sorted[i].zoneLowBoundary;
      if(low&&hr>=low)return sorted[i].zoneNumber;
    }
    return sorted[0].zoneNumber||1;
  }

  const normLapsForZoneFallback=rawLaps.map(_normLap);
  let globalZones=normalizedRawZones.filter(z=>z.secsInZone>0);
  let zonesSynthesizedFromLapHR=false;
  if(!globalZones.length&&allZones.length&&normLapsForZoneFallback.some(l=>l.averageHR>0&&l.duration>0)){
    const zoneAcc={};
    normLapsForZoneFallback.forEach(l=>{
      const zn=zoneNumberForHR(l.averageHR);
      if(zn&&l.duration>0)zoneAcc[zn]=(zoneAcc[zn]||0)+l.duration;
    });
    const synthesized=normalizedRawZones.map(z=>({...z,secsInZone:Math.round(zoneAcc[z.zoneNumber]||0)}));
    if(synthesized.some(z=>z.secsInZone>0)){
      globalZones=synthesized.filter(z=>z.secsInZone>0);
      zonesSynthesizedFromLapHR=true;
    }
  }

  function zoneRange(num){
    const me=allZones.find(g=>g.zoneNumber===num);
    if(!me)return '';
    const low=num===1?0:me.zoneLowBoundary;
    if(!low&&num!==1)return '';
    const upper=allZones.find(g=>g.zoneNumber===num+1);
    return upper&&upper.zoneLowBoundary?`${low}–${upper.zoneLowBoundary} ppm`:`> ${low} ppm`;
  }

  function buildZones(zonesArr){
    return zonesArr.filter(z=>z.secsInZone>0)
      .sort((a,b)=>a.zoneNumber-b.zoneNumber)
      .map(z=>({
        zoneNumber:z.zoneNumber,
        nombre:ZONE_NAMES[z.zoneNumber]||`Z${z.zoneNumber}`,
        secs:z.secsInZone,
        rango:zoneRange(z.zoneNumber),
        color:ZONE_COLORS[z.zoneNumber]||'#888',
        lowBound:z.zoneLowBoundary||0
      }));
  }

  // Zone distribution per lap (weighted by FC)
  const allHRs=rawLaps.map(l=>_normLap(l).averageHR).filter(v=>v>0);
  const hrMin=allHRs.length?Math.min(...allHRs):100;
  const hrMax=allHRs.length?Math.max(...allHRs):200;
  const hrRange=hrMax-hrMin||1;
  function lapZones(normLap){
    if(normLap.hrTimeInZone&&normLap.hrTimeInZone.length){
      let zones=normLap.hrTimeInZone.map(z=>({
        zoneNumber:z.zoneNumber||z.zone||0,
        secsInZone:z.secsInZone||z.secs||z.seconds||0,
        zoneLowBoundary:z.zoneLowBoundary||z.lowBoundary||0
      })).filter(z=>z.zoneNumber>0&&z.secsInZone>0)
        .sort((a,b)=>a.zoneNumber-b.zoneNumber)
        .map(z=>({
          zoneNumber:z.zoneNumber,
          nombre:ZONE_NAMES[z.zoneNumber]||`Z${z.zoneNumber}`,
          secs:z.secsInZone,
          rango:zoneRange(z.zoneNumber),
          color:ZONE_COLORS[z.zoneNumber]||'#888',
          lowBound:z.zoneLowBoundary||0
        }));
      const dur=normLap.duration;
      const tot=zones.reduce((a,z)=>a+z.secs,0);
      if(dur&&tot>0&&Math.abs(tot-dur)>1){
        if(tot<dur){
          var miss=dur-tot;
          if(miss<10){
            const sc=dur/tot;zones=zones.map(function(z){return{...z,secs:Math.round(z.secs*sc)};});
          } else {
            var z1=zones.find(function(z){return z.nombre.indexOf('Zona 1')>=0;});
            if(z1){z1.secs=Math.round(z1.secs+miss);}
            else{zones.push({nombre:'Zona 1 · Calentamiento',secs:Math.round(miss),rango:zoneRange(1),color:ZONE_COLORS[1]||'#a0a0a0'});}
          }
        }
      }
      if(zones.length)return zones;
    }
    if(zonesSynthesizedFromLapHR&&normLap.duration>0&&normLap.averageHR>0){
      const zoneNumber=zoneNumberForHR(normLap.averageHR);
      if(zoneNumber){
        return [{
          nombre:ZONE_NAMES[zoneNumber]||`Z${zoneNumber}`,
          secs:Math.round(normLap.duration),
          rango:zoneRange(zoneNumber),
          color:ZONE_COLORS[zoneNumber]||'#888'
        }];
      }
    }
    if(!globalZones.length)return[];
    const dur=normLap.duration;
    if(!dur)return[];
    const fcFactor=normLap.averageHR>0?Math.max(0,Math.min(1,(normLap.averageHR-hrMin)/hrRange)):0.5;
    const tot=globalZones.reduce((a,z)=>a+z.secsInZone,0);
    if(!tot)return[];
    const result=globalZones.map(z=>{
      const num=z.zoneNumber;
      let w=1;
      if(num>=4)w=0.5+fcFactor;
      else if(num<=2)w=1.5-fcFactor;
      return{zoneNumber:num,pct:z.secsInZone/tot,w};
    });
    const wSum=result.reduce((a,z)=>a+z.pct*z.w,0);
    return result.map(z=>{
      const secs=Math.round((z.pct*z.w/wSum)*dur);
      return{nombre:ZONE_NAMES[z.zoneNumber]||`Z${z.zoneNumber}`,
        secs,rango:zoneRange(z.zoneNumber),color:ZONE_COLORS[z.zoneNumber]||'#888'};
    }).filter(z=>z.secs>0);
  }

  // Splits-based format (running with km splits — explicit splits array)
  const isSplitsBased=!raw.laps&&raw.splits;
  if(isSplitsBased){
    const series=raw.splits.map((s,i)=>{
      const paceMin=s.time||s.pace||s.avg_pace||0;
      const speed=paceMin>0?1000/(paceMin*60):0;
      const dist_km=s.dist_km||s.distance||(s.km?1:0)||1;
      const dur_secs=paceMin?Math.round(paceMin*60*dist_km):0;
      const synthLap={averageHR:s.avg_hr||s.fc_med||0,duration:dur_secs};
      return{
        label:`Km ${s.km||i+1}`,_intensityType:'INTERVAL',
        speed,dist_km,dur_secs,
        cadencia:Math.round(s.cadencia||s.avg_cadence||0),
        speed_max:0,
        potencia_w:Math.round(s.avgPower||s.averagePower||s.avg_power||s.power||0),
        desnivel:s.desnivel||0,
        fc_med:Math.round(s.avg_hr||s.fc_med||0),
        fc_max:Math.round(s.max_hr||s.fc_max||0),
      zonas_lap:lapZones(synthLap)
    };
    });
    return{fecha:fechaFmt,nombre:name,tipo,modo:'carrera',estructura:null,
      distancia_total:(sumDist/1000).toFixed(2)+' km',
      warmup:null,series,cooldown:null,zonas:buildZones(globalZones),
      hr_zone_boundaries:allZones,track:raw.track||null};
  }
  
  // Normalize all laps, remove pure artefact laps (0m AND <15s: timer/sensor init)
  let laps=rawLaps.map(_normLap).filter(l=>!(l.distance===0&&l.duration<15));

  // Mark artifact laps (<5m OR <2s) as residual: they keep their own row and
  // contribute to HR aggregates, but are excluded from time/distance/speed/cadence/power
  // in group header summaries.
  laps.forEach(function(l){if(l.distance<5||l.duration<2)l.residual=true;});

  // Keep every Garmin lap visible. Group headers synthesize workout-step totals,
  // while the new "Vuelta" column needs the original lap rows (1, 2, 3...).

  // Keep Garmin's final mini-laps: Connect shows them as real recovery rows.
  if(!laps.length){
    return{fecha:fechaFmt,nombre:name,tipo,modo:'carrera',estructura:null,
      distancia_total:(sumDist/1000).toFixed(2)+' km',
      warmup:null,series:[],cooldown:null,zonas:buildZones(globalZones),
      hr_zone_boundaries:allZones,track:raw.track||null};
  }
  
  // Detect free-run mode: all/most laps are INTERVAL type, or ~1km each (continuous run)
  // OR: all laps are similar distance (~900-1100m) = continuous run
  const intervalLapsCount=laps.filter(l=>l.intensityType==='INTERVAL').length;
  const similarDistances=laps.filter(l=>l.distance>=900&&l.distance<=1100).length;
  const isContinuousRun=(similarDistances>=laps.length-1&&laps.length>=3)||(intervalLapsCount>=laps.length-1&&intervalLapsCount>=3);

  if(isContinuousRun){
    // Continuous run: each lap is just number (no "Km" prefix)
    const series=laps.map((l,i)=>{
      // Accept multiple cadence field names (from .fit or converted)
      var cad=l.avgRunningCadence||l.averageRunCadence||l.avg_running_cadence||l.avg_cadence||l.avg_run_cadence||l.averageCadence||l.cadencia||l.cadence||0;
      return{
        label:`${i+1}`,
        _intensityType:'INTERVAL',
        speed:l.averageSpeed,
        dist_km:Math.round(l.distance/10)/100,
        dur_secs:Math.round(l.duration),
        cadencia:Math.round(cad),
        speed_max:l.maxSpeed||0,
        potencia_w:Math.round(l.avgPower||l.avg_power||0),
        desnivel:Math.round(l.elevationGain-l.elevationLoss),
        fc_med:Math.round(l.averageHR||0),
        fc_max:Math.round(l.maxHR||0),
        zonas_lap:lapZones(l),
        residual:l.residual||false
      };
    });
    return{fecha:fechaFmt,nombre:name,tipo,modo:'carrera',estructura:null,
      distancia_total:(sumDist/1000).toFixed(2)+' km',
      warmup:null,series,cooldown:null,zonas:buildZones(globalZones),
      hr_zone_boundaries:allZones,track:raw.track||null};
  }
  
  // Split trailing non-ACTIVE laps into descanso (last interval) vs Enfriamiento (cooldown).
  // Strategy: find trailing non-ACTIVE laps from the end. The first distinct wktStep group
  // immediately after the last ACTIVE = descanso (paired with last interval).
  // Subsequent step groups = Enfriamiento. Fallback if no wktStepIndex: keep 1 trailing = descanso.
  // When preceding active laps are all from a single workout step (continuous run), all
  // trailing laps are cooldown (no descanso needed).
  let trailingStart=laps.length;
  for(let i=laps.length-1;i>=0;i--){
    const t=laps[i].intensityType;
    if(t==='ACTIVE'||t==='WARMUP')break;
    trailingStart=i;
  }
  let lastRealIdx=laps.length-1;
  if(trailingStart<laps.length){
    // Check if preceding active laps are all from a single step → trailing = all cooldown
    const activeSteps=new Set(laps.slice(0,trailingStart).filter(l=>l.intensityType==='ACTIVE').map(l=>l.wktStepIndex).filter(s=>s!==null&&s!==undefined));
    const singleActiveStep=activeSteps.size<=1;
    const firstStep=laps[trailingStart].wktStepIndex;
    if(laps[trailingStart].intensityType==='COOLDOWN'){
      // COOLDOWN trailing laps: all = cooldown, no descanso (the workout step is already cooldown)
      lastRealIdx=trailingStart-1;
    } else if(firstStep!==null&&firstStep!==undefined&&!singleActiveStep){
      // Multiple active steps: first trailing step group = descanso, rest = cooldown
      lastRealIdx=trailingStart-1;
      for(let i=trailingStart;i<laps.length;i++){
        if(laps[i].wktStepIndex===firstStep)lastRealIdx=i;
        else break;
      }
    } else {
      // Single active step (or no wktStepIndex): all trailing = cooldown, no descanso
      lastRealIdx=trailingStart-1;
    }
  }
  const cooldownLaps=laps.slice(lastRealIdx+1);
  const mainLaps=laps.slice(0,lastRealIdx+1);

  let warmup=null,cooldown=null;
  const series=[];
  let activeCount=0,restCount=0;
  const lapRange=(ls)=>{
    const nums=ls.map(l=>l.lapStart||l.lapEnd).filter(Boolean);
    const ends=ls.map(l=>l.lapEnd||l.lapStart).filter(Boolean);
    if(!nums.length&&!ends.length)return'';
    const a=Math.min(...nums,...ends),b=Math.max(...nums,...ends);
    return a===b?String(a):`${a} - ${b}`;
  };
  const mergeHrZones=(ls)=>{
    const acc={};
    ls.forEach(l=>(l.hrTimeInZone||[]).forEach(z=>{
      const k=z.zoneNumber||z.zone;
      if(!k)return;
      if(!acc[k])acc[k]={...z,zoneNumber:k,secsInZone:0};
      acc[k].secsInZone+=(z.secsInZone||z.secs||z.seconds||0);
    }));
    return Object.values(acc);
  };
  const _mergeResidualSub=(arr)=>{
    if(!arr||arr.length<2)return arr;
    const last=arr[arr.length-1];
    if(!last.residual)return arr;
    const prev=arr[arr.length-2];
    const pd=prev.dur_raw_secs||prev.dur_secs||0;
    const ld=last.dur_raw_secs||last.dur_secs||0;
    const td=pd+ld;
    prev.dist_km=(prev.dist_km||0)+(last.dist_km||0);
    prev.dur_raw_secs=td;
    prev.dur_secs=td;
    prev.fc_med=td>0?Math.round(((prev.fc_med||0)*pd+(last.fc_med||0)*ld)/td):prev.fc_med;
    prev.fc_max=Math.max(prev.fc_max||0,last.fc_max||0);
    if(prev.cadencia!==undefined&&last.cadencia){prev.cadencia=td>0?Math.round(((prev.cadencia||0)*pd+(last.cadencia||0)*ld)/td):prev.cadencia;}
    if(prev.potencia_w!==undefined&&last.potencia_w){prev.potencia_w=td>0?Math.round(((prev.potencia_w||0)*pd+(last.potencia_w||0)*ld)/td):prev.potencia_w;}
    if(prev.zonas_lap&&last.zonas_lap){prev.zonas_lap=_mergeZones(prev.zonas_lap,last.zonas_lap);}
    arr.pop();
    return arr;
  };
  const _mergeZones=(a,b)=>{
    if(!a||!b)return a||b||[];
    const map={};
    [...a,...b].forEach(z=>{const k=z.zoneNumber||z.nombre;if(k){if(!map[k])map[k]={...z,secs:0};map[k].secs+=(z.secs||z.secsInZone||0);}});
    return Object.values(map).sort((x,y)=>(x.zoneNumber||0)-(y.zoneNumber||0));
  };

  // Build cooldown (merge if multiple)
  if(cooldownLaps.length){
    const totDist=cooldownLaps.reduce((a,l)=>a+l.distance,0);
    const totDur=cooldownLaps.reduce((a,l)=>a+l.duration,0);
    const wHR=cooldownLaps.reduce((a,l)=>a+(l.averageHR*l.duration),0)/(totDur||1);
    const maxHR=Math.max(...cooldownLaps.map(l=>l.maxHR||0));
    const wCad=cooldownLaps.reduce((a,l)=>a+(l.averageRunCadence*l.duration),0)/(totDur||1);
    const wSpd=totDur>0?totDist/totDur:0;
    const synthLap={averageHR:wHR,duration:totDur,hrTimeInZone:mergeHrZones(cooldownLaps)};
    const subLaps=cooldownLaps.length>1?_mergeResidualSub(cooldownLaps.map((lap)=>{
      var cad=lap.avgRunningCadence||lap.averageRunCadence||lap.avg_running_cadence||lap.avg_cadence||lap.avg_run_cadence||lap.averageCadence||lap.cadencia||lap.cadence||0;
      return{label:'Enfriamiento',_intensityType:'COOLDOWN',
        vuelta:lapRange([lap]),
        speed:lap.averageSpeed,dist_km:Math.round(lap.distance/10)/100,
        dur_raw_secs:lap.duration,dur_secs:Math.round(lap.duration),cadencia:Math.round(cad),speed_max:lap.maxSpeed||0,
        potencia_w:Math.round(lap.avgPower||lap.avg_power||0),
        desnivel:Math.round((lap.elevationGain||0)-(lap.elevationLoss||0)),
        fc_med:Math.round(lap.averageHR||0),fc_max:Math.round(lap.maxHR||0),
        zonas_lap:lapZones(lap),residual:lap.residual||false};
    })):null;
    cooldown={
      label:'Enfriamiento',_intensityType:'COOLDOWN',
      speed:wSpd,
      dist_km:Math.round(totDist/10)/100,
      dur_raw_secs:totDur,
      dur_secs:Math.round(totDur),
      cadencia:Math.round(wCad),
      speed_max:Math.max(0,...cooldownLaps.map(l=>l.maxSpeed||0)),
      potencia_w:Math.round(cooldownLaps.reduce((a,l)=>a+(l.avgPower||l.avg_power||0)*l.duration,0)/(totDur||1)),
      desnivel:0,
      fc_med:Math.round(wHR),
      fc_max:Math.round(maxHR),
      vuelta:lapRange(cooldownLaps),
      zonas_lap:lapZones(synthLap),
      subLaps
    };
  }

  // Separate ALL consecutive leading WARMUP laps into warmup group (Garmin Connect groups them together)
  const warmupRawLaps=[];
  let mlStart=0;
  for(let i=0;i<mainLaps.length;i++){
    if(mainLaps[i].intensityType==='WARMUP'){warmupRawLaps.push(mainLaps[i]);mlStart=i+1;}
    else break;
  }
  if(warmupRawLaps.length){
    const totDist=warmupRawLaps.reduce((a,l)=>a+l.distance,0);
    const totDur=warmupRawLaps.reduce((a,l)=>a+l.duration,0);
    const wHR=warmupRawLaps.reduce((a,l)=>a+(l.averageHR*l.duration),0)/(totDur||1);
    const maxHR=Math.max(...warmupRawLaps.map(l=>l.maxHR||0));
    const wCad=warmupRawLaps.reduce((a,l)=>a+(l.averageRunCadence*l.duration),0)/(totDur||1);
    const wSpd=totDur>0?totDist/totDur:0;
    const subLaps=warmupRawLaps.length>1?_mergeResidualSub(warmupRawLaps.map((lap)=>{
      var cad=lap.avgRunningCadence||lap.averageRunCadence||lap.avg_running_cadence||lap.avg_cadence||lap.avg_run_cadence||lap.averageCadence||lap.cadencia||lap.cadence||0;
      return{label:'Calentamiento',_intensityType:'WARMUP',
        vuelta:lapRange([lap]),
        speed:lap.averageSpeed,dist_km:Math.round(lap.distance/10)/100,
        dur_raw_secs:lap.duration,dur_secs:Math.round(lap.duration),cadencia:Math.round(cad),speed_max:lap.maxSpeed||0,
        potencia_w:Math.round(lap.avgPower||lap.avg_power||0),
        desnivel:Math.round((lap.elevationGain||0)-(lap.elevationLoss||0)),
        fc_med:Math.round(lap.averageHR||0),fc_max:Math.round(lap.maxHR||0),
        zonas_lap:lapZones(lap),residual:lap.residual||false};
    })):null;
    warmup={
      label:'Calentamiento',_intensityType:'WARMUP',
      speed:wSpd,dist_km:Math.round(totDist/10)/100,dur_raw_secs:totDur,dur_secs:Math.round(totDur),
      cadencia:Math.round(wCad),
      speed_max:Math.max(0,...warmupRawLaps.map(l=>l.maxSpeed||0)),
      potencia_w:Math.round(warmupRawLaps.reduce((a,l)=>a+(l.avgPower||l.avg_power||0)*l.duration,0)/(totDur||1)),
      desnivel:0,
      fc_med:Math.round(wHR),fc_max:maxHR,
      vuelta:lapRange(warmupRawLaps),
      zonas_lap:lapZones({averageHR:wHR,duration:totDur,hrTimeInZone:mergeHrZones(warmupRawLaps)}),
      subLaps
    };
  }
  mainLaps.slice(mlStart).forEach((lap)=>{
    const intensity=lap.intensityType;
    const dist_km=Math.round(lap.distance/10)/100;
    const dur_secs=Math.round(lap.duration);
    // Accept multiple cadence field names
    var cad=lap.avgRunningCadence||lap.averageRunCadence||lap.avg_running_cadence||lap.avg_cadence||lap.avg_run_cadence||lap.averageCadence||lap.cadencia||lap.cadence||0;
    const s={
      label:'',_intensityType:intensity,
      wktStepIndex:lap.wktStepIndex!==undefined?lap.wktStepIndex:null,
      speed:lap.averageSpeed,
      dist_km,dur_secs,
      dur_raw_secs:lap.duration,
      cadencia:Math.round(cad),
      speed_max:lap.maxSpeed||0,
      potencia_w:Math.round(lap.avgPower||lap.avg_power||0),
      desnivel:Math.round((lap.elevationGain||0)-(lap.elevationLoss||0)),
      fc_med:Math.round(lap.averageHR||0),
      fc_max:Math.round(lap.maxHR||0),
      vuelta:lapRange([lap]),
      zonas_lap:lapZones(lap),
      residual:lap.residual||false
    };
    if(intensity==='REST'){
      restCount++;s.label='Descanso';s._intensityType='REST';series.push(s);
    } else if(intensity==='RECOVERY'){
      restCount++;s.label='Descanso';s._intensityType='REST';series.push(s);
    } else {
      activeCount++;s.label='Carrera';series.push(s);
    }
  });

  const sumDist2=sumDist||laps.reduce((a,l)=>a+l.distance,0)||0;
  var modo='carrera';
  if(restCount>0||warmup||cooldown){
    modo='intervalos';
  } else if(activeCount<=5){
    modo='intervalos';
  }
  // MOTO and BICI never use 'carrera' mode — that mode is for continuous running only
  if((tipo==='MOTO'||tipo==='BICI')&&modo==='carrera')modo='intervalos';

  return{fecha:fechaFmt,nombre:name,tipo,modo,estructura:null,
    distancia_total:(sumDist2/1000).toFixed(2)+' km',
    warmup,series,cooldown,zonas:buildZones(globalZones),
    hr_zone_boundaries:allZones,track:raw.track||null,
    summary:raw.summary||null};
}

/* ── PARSE GARMIN CONNECT HTML SPLITS TABLE ── */
function fromGarminConnectHTML(html){
  // Parse the HTML string into a DOM fragment
  const doc=document.createElement('div');
  doc.innerHTML=html;

  // Detect activity type from context clues in the HTML
  function detectTipo(){
    if(doc.querySelector('#bikeCadence')||doc.querySelector('[id*="cycling"]')||doc.querySelector('[id*="Cycling"]'))return'cycling';
    if(doc.querySelector('#autoRacingStatsPlaceholder')&&doc.querySelector('#autoRacingStatsPlaceholder').innerHTML.trim())return'motorcycling';
    // Check column headers: if "Potencia" present → cycling
    const headers=[...doc.querySelectorAll('th, [data-title]')].map(el=>(el.textContent||el.dataset.title||'').toLowerCase());
    if(headers.some(h=>h.includes('potencia')||h.includes('cadencia bici')))return'cycling';
    // Check pace speed stats: if "Velocidad" is selected mode → cycling/moto
    if(doc.querySelector('[id*="paceSpeed"]')&&!doc.querySelector('[id*="runDynamics"]'))return'cycling';
    return'running';
  }
  const tipoRaw=detectTipo();
  const tipo={running:'ASFALTO',cycling:'BICI',motorcycling:'MOTO'}[tipoRaw]||'ASFALTO';
  const activityType={running:'running',cycling:'cycling',motorcycling:'motorcycling'}[tipoRaw]||'running';

  // Try to read activity name / date from the page
  const nombre=(doc.querySelector('.activity-detail-name,.page-title,h1')||{}).textContent||'Actividad';

  // Parse splits rows — Garmin Connect uses data-title attributes on <td>
  const rows=[...doc.querySelectorAll('tr')].filter(tr=>tr.querySelector('[data-title]'));
  if(!rows.length)return null;

  function parseTime(s){
    if(!s||!s.trim()||s.trim()==='--')return 0;
    const p=s.trim().replace(',','.').split(':').map(Number);
    if(p.length===3)return p[0]*3600+p[1]*60+p[2];
    if(p.length===2)return p[0]*60+p[1];
    return parseFloat(p[0])||0;
  }
  function parseNum(s){
    if(!s||s.trim()==='--')return 0;
    return parseFloat(s.trim().replace(/\./g,'').replace(',','.'))||0;
  }

  const series=[];
  let cumSecs=0;
  rows.forEach((tr,i)=>{
    const cells={};
    tr.querySelectorAll('[data-title]').forEach(td=>{cells[(td.dataset.title||'').toLowerCase().trim()]=td.textContent.trim();});
    const dur=parseTime(cells['tiempo']||cells['time']||'');
    if(!dur&&i>0)return; // skip footer or zero-time rows
    const dist=parseNum(cells['distancia']||cells['distance']||'0');
    const speedKmh=parseNum(cells['velocidad media']||cells['velocidad']||cells['avg speed']||'0');
    const speedMaxKmh=parseNum(cells['velocidad máxima']||cells['velocidad maxima']||cells['max speed']||'0');
    const fcMed=Math.round(parseNum(cells['frecuencia cardiaca media']||cells['fc media']||cells['avg hr']||'0'));
    const fcMax=Math.round(parseNum(cells['fc máxima']||cells['fc maxima']||cells['max hr']||'0'));
    const asc=Math.round(parseNum(cells['ascenso total']||cells['ascent']||'0'));
    const lap=parseInt(cells['vueltas']||cells['lap']||String(i+1))||i+1;
    cumSecs+=dur;
    series.push({
      label:String(lap),_intensityType:'INTERVAL',
      speed:speedKmh/3.6,
      speed_max:speedMaxKmh/3.6,
      dist_km:dist,
      dur_secs:dur,dur_raw_secs:dur,
      cadencia:0,
      potencia_w:0,
      desnivel:asc,
      fc_med:fcMed,fc_max:fcMax,
      vuelta:String(lap),
      zonas_lap:[]
    });
  });
  if(!series.length)return null;

  const totalDist=series.reduce((a,s)=>a+s.dist_km,0).toFixed(2);
  return{fecha:'',nombre:nombre.trim().slice(0,60)||'Actividad',tipo,activityType,
    modo:'carrera',estructura:null,
    distancia_total:totalDist+' km',
    warmup:null,series,cooldown:null,zonas:[],
    summary:null};
}

/* ── RENDER ── */
function render(){
  // Reset global zone-range lookup so stale data from a prior render can't bleed in
  Object.keys(_zonaRangos).forEach(k=>delete _zonaRangos[k]);
  const raw=document.getElementById('json-input').value.trim();
  const errEl=document.getElementById('error-msg');
  errEl.style.display='none';
  if(!raw){errEl.textContent='Carga un archivo primero.';errEl.style.display='block';return;}
  window._hideStack=[];
  window._hiddenRowKeys={};

  // Try Garmin Connect HTML before JSON parsing
  if(raw.includes('SortableTable_tableRow')||raw.includes('tab-splits')||raw.includes('data-title="Vueltas"')||raw.includes('data-title="Tiempo"')){
    const gcAct=fromGarminConnectHTML(raw);
    if(gcAct){
      const lista=[gcAct];
      _assignHideKeys(lista);
      _lastParsedList = lista;
      var _listaGC = _compactKm > 0 ? _compactarLista(lista, _compactKm) : lista;
      document.getElementById('output').innerHTML=`<div id="render-target" data-ver="2">${_listaGC.map(renderActividad).join('')}</div>`;
      _listaGC.forEach(function(cl,i){if(cl._pre&&lista[i])lista[i]._pre=cl._pre;});
      document.getElementById('btn-img').style.display='inline-flex';
      document.getElementById('btn-copy-img').style.display='inline-flex';
      document.getElementById('btn-share').style.display='inline-flex';
      const _lb=document.getElementById('btn-link-img');_lb.style.display='inline-flex';_lb.disabled=false;
      document.getElementById('filter-bar').classList.add('visible');
      _showCompactBar(true); _updateCompactResetBtn();
      if(window.innerWidth<900)setTimeout(()=>document.getElementById('output').scrollIntoView({behavior:'smooth',block:'start'}),100);
      return;
    }
  }

  const parsed=extractJson(raw);
  if(!parsed){
    errEl.textContent='No se encontró un JSON válido. Asegúrate de copiar el bloque completo { ... }.';
    errEl.style.display='block';return;
  }

  // Auto-detect format
  let lista;
  function isRawActivity(p){
    return p&&(p.activity_id||p.activityId||p.activity_name||p.activityName)&&
           (p.laps||p.splits||p.hr_zones||p.hr_time_in_zones||p.summary);
  }
  if(parsed.actividades_raw){
    const converted=fromRawGarmin(parsed);
    lista=converted.actividades;
  } else if(isRawActivity(parsed)){
    lista=[fromRawGarmin(parsed)].filter(Boolean);
  } else if(parsed.series&&Array.isArray(parsed.series)&&parsed.series[0]?.laps){
    lista=[fromChatGPTNested(parsed)].filter(Boolean);
  } else if(parsed.actividades){
    lista=parsed.actividades;
  } else {
    lista=[parsed];
  }

  _assignHideKeys(lista);
  _lastParsedList = lista;
  var baseLista=_visibleListForRender(lista);
  var listaToRender = _compactKm > 0 ? _compactarLista(baseLista, _compactKm) : baseLista;
  document.getElementById('output').innerHTML=`<div id="render-target" data-ver="2">${listaToRender.map(renderActividad).join('')}</div>`;
  listaToRender.forEach(function(cl,i){if(cl._pre&&lista[i])lista[i]._pre=cl._pre;});
  document.getElementById('btn-img').style.display='inline-flex';
  document.getElementById('btn-copy-img').style.display='inline-flex';
  document.getElementById('btn-share').style.display='inline-flex';
  const _linkBtn=document.getElementById('btn-link-img');
  _linkBtn.style.display='inline-flex';
  _linkBtn.disabled=false;
  document.getElementById('filter-bar').classList.add('visible');
  _showCompactBar(true);
  _updateCompactResetBtn();
  setTimeout(debugDumpTable,200);
  // En móvil, scroll al output
  if(window.innerWidth<900){
    setTimeout(()=>document.getElementById('output').scrollIntoView({behavior:'smooth',block:'start'}),100);
  }
}

/* ── SAVE IMAGE ── */
function isIOS(){
  return/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
}
function captureScale(forDrive){
  // Estimate content dimensions from number of data rows (faster than DOM layout)
  var rows=document.querySelectorAll('#render-target tbody tr').length||1;
  var estW=1400,estH=rows*28+200;
  // Aim for ~8MP on mobile, ~16MP on desktop
  var isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  var maxPx=isMobile?8000000:16000000;
  var areaScale=Math.sqrt(maxPx/(estW*estH));
  var userScale=forDrive?3.5:8;
  return Math.max(1,Math.min(userScale,areaScale));
}
function captureFileBaseName(){
  const lbls=document.querySelectorAll('#render-target .lbl');
  return (lbls.length===1?lbls[0].textContent.replace(/[^a-z0-9]/gi,'_').toLowerCase():'entrenos_'+lbls.length)
    .replace(/_+/g,'_').replace(/^_|_$/g,'') || 'garmin_entreno';
}
function canvasToBlobPromise(canvas,type,quality){
  return new Promise(resolve=>canvas.toBlob(resolve,type,quality));
}
function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(reader.error||new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob);
  });
}
function openIOSave(blob, btn, showBack){
  if(btn){btn.textContent='Copiar';btn.disabled=false;}
  const url=URL.createObjectURL(blob);
  const isMobile=/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:3000;'
    +'display:flex;flex-direction:column;align-items:center;justify-content:center;'
    +'padding:16px;gap:12px;outline:none;touch-action:manipulation';
  overlay.tabIndex=-1;
  var close=()=>{URL.revokeObjectURL(url);overlay.remove();document.removeEventListener('keydown',_esc);};
  var closeAll=()=>{close();closeShareOpts();};
  const _esc=(e)=>{if(e.key==='Escape')closeAll();};
  document.addEventListener('keydown',_esc);
  overlay.onclick=function(e){if(e.target===overlay)closeAll();};
  const imgWrap=document.createElement('div');
  imgWrap.style.cssText='position:relative;flex:1;overflow:hidden;width:100%;border-radius:8px;'
    +'display:flex;align-items:center;justify-content:center;touch-action:manipulation';
  const img=document.createElement('img');
  img.src=url;
  img.style.cssText='display:block;max-width:100%;max-height:100%;border-radius:8px;cursor:zoom-in;'
    +'-webkit-touch-callout:default';
  var _zoomLevel=1,_touchOX=0,_touchOY=0,_startX,_startY,_moved=false;
  var _mouseDown=false,_pinchDist=0,_pinchStartZoom=1;
  function _clampPan(){
    var cw=imgWrap.clientWidth,ch=imgWrap.clientHeight;
    var iw=img.clientWidth,ih=img.clientHeight;
    var mx=Math.max(0,(iw*_zoomLevel-cw)/(2*_zoomLevel));
    var my=Math.max(0,(ih*_zoomLevel-ch)/(2*_zoomLevel));
    _touchOX=Math.max(-mx,Math.min(mx,_touchOX));
    _touchOY=Math.max(-my,Math.min(my,_touchOY));
  }
  function _applyZoom(){
    if(_zoomLevel>1)_clampPan();
    img.style.transform=_zoomLevel>1?'scale('+_zoomLevel+') translate('+_touchOX+'px,'+_touchOY+'px)':'scale(1)';
    img.style.cursor=_zoomLevel>1?'zoom-out':'zoom-in';
  }
  function _panStart(x,y){_startX=x;_startY=y;_moved=false;}
  function _panMove(x,y){
    if(_zoomLevel<=1)return;
    _moved=true;
    _touchOX+=(x-_startX)*0.4;_touchOY+=(y-_startY)*0.4;
    _startX=x;_startY=y;
    _applyZoom();
  }
  function _zoomIn(){_zoomLevel=Math.min(5,_zoomLevel+0.25);_touchOX=0;_touchOY=0;img.style.transition='transform .1s';_applyZoom();img.style.transition='';}
  function _zoomOut(){_zoomLevel=Math.max(1,_zoomLevel-0.25);_touchOX=0;_touchOY=0;img.style.transition='transform .1s';_applyZoom();img.style.transition='';}
  img.onclick=function(e){
    if(_moved){_moved=false;return;}
    e.stopPropagation();
    _zoomLevel=_zoomLevel>1?1:2;_touchOX=0;_touchOY=0;
    img.style.transition='transform .15s';_applyZoom();img.style.transition='';
  };
  img.draggable=false;
  img.ondragstart=function(e){e.preventDefault();};
  overlay.addEventListener('mousedown',function(e){
    if(e.button!==0)return;
    _mouseDown=true;_panStart(e.clientX,e.clientY);
  });
  overlay.addEventListener('mousemove',function(e){
    if(!_mouseDown||_zoomLevel<=1)return;
    _panMove(e.clientX,e.clientY);
  });
  overlay.addEventListener('mouseup',function(){_mouseDown=false;});
  overlay.addEventListener('mouseleave',function(){_mouseDown=false;});
  overlay.addEventListener('keydown',function(e){
    if(e.key==='='||e.key==='+'){e.preventDefault();_zoomIn();}
    else if(e.key==='-'){e.preventDefault();_zoomOut();}
  });
  imgWrap.addEventListener('touchstart',function(e){
    var t=e.touches;
    if(t.length===1)_panStart(t[0].clientX,t[0].clientY);
    else if(t.length>=2){
      _moved=true;_pinchDist=Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);_pinchStartZoom=_zoomLevel;
    }
  },{passive:true});
  imgWrap.addEventListener('touchmove',function(e){
    e.preventDefault();
    var t=e.touches;
    if(t.length>=2&&_pinchDist>0){
      _moved=true;
      _zoomLevel=Math.max(1,Math.min(5,_pinchStartZoom*Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)/_pinchDist));
      _touchOX=0;_touchOY=0;
      _applyZoom();
    }else if(t.length===1&&_zoomLevel>1)_panMove(t[0].clientX,t[0].clientY);
  },{passive:false});
  imgWrap.addEventListener('touchend',function(e){
    if(e.touches.length===1){_startX=e.touches[0].clientX;_startY=e.touches[0].clientY;}
    if(e.touches.length<2)_pinchDist=0;
  },{passive:true});
  imgWrap.onwheel=function(e){
    e.preventDefault();
    var d=e.deltaY>0?-0.25:0.25;
    if(e.ctrlKey||e.metaKey)d=e.deltaY>0?-0.5:0.5;
    _zoomLevel=Math.max(1,Math.min(5,_zoomLevel+d));
    _touchOX=0;_touchOY=0;
    img.style.transition='transform .08s';_applyZoom();img.style.transition='';
  };
  imgWrap.onclick=function(e){if(e.target===imgWrap)close();};
  const p=document.createElement('p');
  p.style.cssText='color:#9aa0a6;font-size:13px;text-align:center;margin:0';
  p.innerHTML=isMobile?'Mantén pulsada la imagen → <strong style="color:#eaeaea">Guardar en Fotos</strong>'
                      :'<strong style="color:#eaeaea">Vista previa</strong>';
  const dl=document.createElement('a');
  dl.href=url; dl.download=captureFileBaseName()+'.png';
  dl.style.cssText='background:#1a3a2a;border:1px solid #2a5a3a;border-radius:8px;padding:9px 18px;'
    +'color:#6dbf8a;font-size:12px;font-weight:700;text-decoration:none';
  dl.textContent='Descargar';
  const closeBtn=document.createElement('button');
  closeBtn.textContent='Cerrar';
  closeBtn.style.cssText='background:#111;border:1px solid #222;border-radius:8px;padding:9px 14px;'
    +'color:#666;font-size:12px;cursor:pointer';
  closeBtn.onclick=closeAll;
  const backBtn=document.createElement('button');
  backBtn.textContent='Atrás';
  backBtn.style.cssText='background:#1a1a24;border:1px solid #2a2d3a;border-radius:8px;padding:9px 14px;'
    +'color:#7a8aa0;font-size:12px;cursor:pointer';
  backBtn.onclick=close;
  const row=document.createElement('div');
  row.style.cssText='display:flex;gap:10px';
  row.appendChild(dl);
  if(showBack!==false)row.appendChild(backBtn);
  row.appendChild(closeBtn);
  imgWrap.appendChild(img);
  overlay.appendChild(p); overlay.appendChild(imgWrap); overlay.appendChild(row);
  document.body.appendChild(overlay);
  setTimeout(function(){overlay.focus();},0);
}
function _prepareCaptureWrapper(wrapper, clone){
  wrapper.classList.add('capturing');
  clone.classList.add('capturing');
  clone.querySelectorAll('.table-scroll').forEach(sc=>{
    const table=sc.querySelector('table');
    const tableW=table?Math.ceil(Math.max(table.scrollWidth,table.offsetWidth,table.getBoundingClientRect().width)):Math.ceil(sc.scrollWidth);
    sc.style.overflow='visible';
    sc.style.width=tableW+'px';
    sc.style.maxWidth='none';
    sc.style.margin='0';
    if(table){
      table.style.width=tableW+'px';
      table.style.minWidth=tableW+'px';
      table.style.maxWidth='none';
    }
    const act=sc.closest('.actividad');
    if(act){
      const cs=getComputedStyle(act);
      const pad=(parseFloat(cs.paddingLeft)||0)+(parseFloat(cs.paddingRight)||0);
      act.style.width=(tableW+pad)+'px';
      act.style.maxWidth='none';
    }
  });
  const w=Math.ceil(Math.max(1400,wrapper.scrollWidth,clone.scrollWidth));
  wrapper.style.width=w+'px';
  wrapper.style.maxWidth='none';
  return w;
}
function saveImg(){
  const btn=document.getElementById('btn-img');
  btn.textContent='Generando...';btn.disabled=true;
  _captureEl(canvas=>{
    if(!canvas){btn.textContent='Generar imagen';btn.disabled=false;if(typeof _actFabDone==='function')_actFabDone();return;}
    canvas.toBlob(blob=>{
      btn.textContent='Generar imagen';btn.disabled=false;
      if(!blob){_toast('Error generando imagen','error');if(typeof _actFabDone==='function')_actFabDone();return;}
      if(typeof _actFabDone==='function')_actFabDone();
      openIOSave(blob,null,false);
    },'image/png');
  });
}

/* ── DRIVE LINK ── */
const DRIVE_UPLOAD_URL_KEY='garminDriveUploadUrl';

function _resolveUploadUrl(){
  return localStorage.getItem(DRIVE_UPLOAD_URL_KEY)||'';
}

// Guarda el Drive URL localmente y lo sincroniza al servidor MCP si está configurado
function _saveDriveUrl(url) {
  const clean = (url||'').trim();
  if (clean) localStorage.setItem(DRIVE_UPLOAD_URL_KEY, clean);
  else localStorage.removeItem(DRIVE_UPLOAD_URL_KEY);
  const server = _getConnectorUrl();
  if (server && clean) {
    fetch(server + '/config', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({driveUrl: clean})
    }).catch(function(){});
  }
}

// Carga config desde el servidor MCP y aplica Drive URL si lo devuelve
function _loadConfigFromServer(serverUrl) {
  return fetch(serverUrl + '/config')
    .then(function(r){ return r.ok ? r.json() : {}; })
    .then(function(cfg){
      if (cfg.driveUrl) localStorage.setItem(DRIVE_UPLOAD_URL_KEY, cfg.driveUrl);
      return cfg;
    })
    .catch(function(){ return {}; });
}

// Devuelve la URL resuelta, o null si el usuario cancela.
function _ensureUploadUrl(){
  const existing=_resolveUploadUrl();
  if(existing)return existing;
  const url=prompt('Pega la URL de tu Google Apps Script (/exec):','');
  if(!url)return null;
  _saveDriveUrl(url.trim());
  return url.trim();
}

function configureDriveUpload(){ openSettings(); }

function getImageLink(){
  const _done=function(){if(typeof _actFabDone==='function')_actFabDone();};
  const uploadUrl=_resolveUploadUrl();
  if(!uploadUrl){
    _toast('Configura la URL de Drive primero (⚙ Configurar)', 'info');
    openSettings();_done();
    return;
  }
  const json=document.getElementById('json-input').value.trim();
  if(!json){ _toast('Carga una actividad primero', 'error'); _done(); return; }

  const bar=document.getElementById('btn-drive-bar');
  const shareBtn=document.getElementById('btn-link-img');
  const origShareText=shareBtn?shareBtn.textContent:'Obtener link';
  if(bar){bar.disabled=true;}
  if(shareBtn){shareBtn.textContent='Generando...';shareBtn.disabled=true;}

  // Pre-register clipboard write inside the user gesture so iOS Safari accepts
  // it. The text/plain promise is resolved later with the actual Drive URL.
  let urlResolve=null, urlReject=null;
  const urlPromise=new Promise((res,rej)=>{urlResolve=res;urlReject=rej;});
  let preCopyOk=false;
  if(navigator.clipboard&&navigator.clipboard.write&&typeof ClipboardItem!=='undefined'){
    try{
      const item=new ClipboardItem({'text/plain':urlPromise.then(u=>new Blob([u],{type:'text/plain'}))});
      navigator.clipboard.write([item]).then(()=>{preCopyOk=true;}).catch(()=>{preCopyOk=false;});
    }catch(e){/* ClipboardItem text/plain unsupported, fallback later */}
  }

  _captureEl(canvas=>{
    if(!canvas){if(shareBtn){shareBtn.textContent=origShareText;shareBtn.disabled=false;}if(bar)bar.disabled=false;_done();return;}
    if(shareBtn){shareBtn.textContent='Subiendo...';}

    const base64=canvas.toDataURL('image/jpeg',0.97).split(',')[1]||'';
    const fileName=captureFileBaseName()+'.jpg';
    fetch(uploadUrl,{
      method:'POST',
      body:JSON.stringify({data:base64,fileName:fileName,mimeType:'image/jpeg'})
    })
    .then(r=>{
      if(!r.ok&&r.status!==0)throw new Error('HTTP '+r.status);
      return r.json();
    })
    .then(result=>{
      if(!result.ok&&!result.url)throw new Error(result.error||'El script no devolvió URL.');
      const url=result.url;
      if(urlResolve)urlResolve(url);
      if(bar){bar.disabled=false;}
      if(shareBtn){shareBtn.textContent='✓ Listo';shareBtn.disabled=false;}
      setTimeout(()=>{if(shareBtn)shareBtn.textContent=origShareText;},2500);
      _showLinkToast(url);
      if(typeof _actFabDone==='function')_actFabDone();
    })
    .catch(err=>{
      if(urlReject)urlReject(err);
      if(bar){bar.disabled=false;}
      if(shareBtn){shareBtn.textContent=origShareText;shareBtn.disabled=false;}
      _toast('Error al subir: '+err.message, 'error');
      _done();
    });
  }, true);
}

/* ── SHARED CAPTURE ── */
function _captureEl(callback, forDrive){
  const el=document.getElementById('render-target');
  if(!el){_toast('No hay nada que capturar (render-target ausente).','error');if(typeof callback==='function')callback(null);return;}
  const clone=el.cloneNode(true);
  clone.querySelectorAll('.hide-btn,.group-arrow-btn').forEach(b=>b.style.display='none');
  clone.querySelectorAll('.row-hidden').forEach(r=>r.style.display='none');
  clone.querySelectorAll('.lbl').forEach(l=>{l.removeAttribute('contenteditable');l.style.borderBottom='none';l.style.cursor='default';});
  clone.querySelectorAll('.hide-btn').forEach(b=>b.remove());
  // Drop the leftmost actions column entirely from the capture (col + th + td)
  clone.querySelectorAll('col.col-actions,th.col-actions,td.col-actions').forEach(e=>e.remove());


  const wrapper=document.createElement('div');
  wrapper.id='capture-wrapper-'+Date.now();
  wrapper.style.cssText='position:fixed;top:-99999px;left:0;background:#0b0c0f;padding:16px;'
    +'width:1400px;max-width:1400px;box-sizing:border-box;z-index:-9999;overflow:visible;';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  _prepareCaptureWrapper(wrapper, clone);

  const scale=captureScale(forDrive);

  requestAnimationFrame(()=>{
    const w=Math.max(wrapper.scrollWidth,clone.scrollWidth)+16;
    const h=wrapper.scrollHeight+16;
    const MAX_DIM=16000;
    let effectiveScale=Math.max(1,Math.min(scale,MAX_DIM/w,MAX_DIM/h));
    if(forDrive){
      const MAX_DRIVE_PIXELS=30000000;
      const drivePxScale=Math.sqrt(MAX_DRIVE_PIXELS/(w*h));
      effectiveScale=Math.max(1,Math.min(effectiveScale,drivePxScale));
    }
    html2canvas(wrapper,{
      backgroundColor:'#0b0c0f',
      scale:effectiveScale,
      useCORS:true,
      logging:false,
      width:w,height:h,
      windowWidth:w,windowHeight:h,
      scrollX:0,scrollY:0,
      allowTaint:false,imageTimeout:0,letterRendering:true
    }).then(canvas=>{
      document.body.removeChild(wrapper);
      callback(canvas);
    }).catch(e=>{
      document.body.removeChild(wrapper);
      _toast('Error al capturar: ' + e.message, 'error');
      if(typeof callback==='function')callback(null);
    });
  });
}

/* ── COPY IMAGE TO CLIPBOARD ── */
function copyImg(){
  const btn=document.getElementById('btn-copy-img');
  btn.textContent='Generando...';btn.disabled=true;
  const _done=function(){if(typeof _actFabDone==='function')_actFabDone();};

  const el=document.getElementById('render-target');
  if(!el){btn.textContent='Copiar imagen';btn.disabled=false;_done();return;}

  const ok=()=>{_toast('✓ Imagen copiada al portapapeles','ok');btn.textContent='✓ Copiada';setTimeout(()=>{btn.textContent='Copiar imagen';btn.disabled=false;},2500);_done();};
  const fail=()=>{btn.textContent='Copiar imagen';btn.disabled=false;_toast('No se pudo copiar. Usa "Generar imagen" para descargar.','error');_done();};

  if(!(navigator.clipboard&&navigator.clipboard.write&&typeof ClipboardItem!=='undefined')){fail();return;}

  // Registrar el write AHORA (dentro del gesto del usuario) con una Promise pendiente.
  // Safari exige que clipboard.write() se llame en el mismo tick que el gesto; Chrome también lo acepta.
  let resolveFn,rejectFn;
  const blobPromise=new Promise((res,rej)=>{resolveFn=res;rejectFn=rej;});
  navigator.clipboard.write([new ClipboardItem({'image/png':blobPromise})]).then(ok).catch(fail);

  const clone=el.cloneNode(true);
  clone.querySelectorAll('.hide-btn').forEach(b=>b.remove());
  clone.querySelectorAll('.row-hidden').forEach(r=>r.style.display='none');
  clone.querySelectorAll('.lbl').forEach(l=>{l.removeAttribute('contenteditable');l.style.borderBottom='none';l.style.cursor='default';});
  clone.querySelectorAll('col.col-actions,th.col-actions,td.col-actions').forEach(e=>e.remove());

  const wrapper=document.createElement('div');
  wrapper.id='capture-wrapper-'+Date.now();
  wrapper.style.cssText='position:fixed;top:-99999px;left:0;background:#0b0c0f;padding:16px;'
    +'width:1400px;max-width:1400px;box-sizing:border-box;z-index:-9999;overflow:visible;';
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  _prepareCaptureWrapper(wrapper,clone);

  const scale=captureScale();

  requestAnimationFrame(()=>{
    const w=Math.max(wrapper.scrollWidth,clone.scrollWidth)+16;
    const h=wrapper.scrollHeight+16;
    const MAX_DIM=16000;
    const effectiveScale=Math.max(1,Math.min(scale,MAX_DIM/w,MAX_DIM/h));
    html2canvas(wrapper,{
      backgroundColor:'#0b0c0f',scale:effectiveScale,useCORS:true,logging:false,
      width:w,height:h,windowWidth:w,windowHeight:h,
      scrollX:0,scrollY:0,allowTaint:false,imageTimeout:0,letterRendering:true
    }).then(canvas=>{
      document.body.removeChild(wrapper);
      canvas.toBlob(blob=>{
        if(!blob){rejectFn(new Error('blob null'));return;}
        resolveFn(blob);
      },'image/png');
    }).catch(e=>{
      document.body.removeChild(wrapper);
      rejectFn(e);
    });
  });
}

/* ── FILTER ROWS ── */
function applyFilter(){
  const q=document.getElementById('filter-input').value.trim().toLowerCase();
  if(!q){_DB('FILTER','applyFilter: empty query, return');return;}
  const keys=[];
  var trs=document.querySelectorAll('#render-target tbody tr, #render-target > div table tbody tr, #render-target tr[data-dur]');
  _DB('FILTER','applyFilter: query="'+q+'" matching '+trs.length+' rows');
  var matched=[];
   trs.forEach(tr=>{
     var txt=tr.textContent.toLowerCase();
     var lblAttr=tr.getAttribute('data-lbl')||'';
     var hideKey=tr.getAttribute('data-hide-key')||'';
     var allTxt=txt+' '+lblAttr.toLowerCase()+' '+hideKey.toLowerCase();
     var match=false;
      console.log('FILTER row',tr.id,'txt=',JSON.stringify(allTxt),'timeCell=',(tr.querySelector('.col-time .main')||{}).textContent);
      if(/^\d+[\.:]\d/.test(q)){
        var timeQ=q.replace('.',':');
        var timeMain=tr.querySelector('.col-time .main, .col-pace .main');
        if(timeMain) match=timeMain.textContent.toLowerCase().startsWith(timeQ);
    } else {
      match=allTxt.includes(q);
    }
    if(match){
      tr.style.display='none';
      tr.classList.add('filter-hide','row-hidden');
      const k=tr.getAttribute('data-hide-key');
      if(k)keys.push(k);
      matched.push({id:tr.id||'(no-id)',hideKey:k||'(empty)'});
    }
  });
  _DB('FILTER','applyFilter: matched '+matched.length+' rows -> keys=['+keys.join(',')+']', matched);
  if(keys.length)_rememberHiddenKeys(keys);
}
function applyFilterRemove(){
  var fv=document.getElementById('filter-input').value;
  _DB('FILTER', 'applyFilterRemove ENTER filterValue="'+fv+'" hasParsedList='+!!window._lastParsedList+' hiddenRowKeys='+JSON.stringify(window._hiddenRowKeys||{}));
  _dumpFullState('FILTER: before applyFilter');
  applyFilter();
  _dumpFullState('FILTER: after applyFilter, before reRenderCompact');
  if(window._lastParsedList && typeof _reRenderCompact==='function'){
    _DB('FILTER', 'calling _reRenderCompact');
    _reRenderCompact();
    _dumpFullState('FILTER: after reRenderCompact');
  } else {
    document.querySelectorAll('.actividad[id^="act-"]').forEach(function(act){
      _recalcAvgRows(act.id.replace(/^act-/,''));
    });
  }
}
function showAllRows(){
  _DB('FILTER','showAllRows ENTER');
  _dumpFullState('FILTER: before showAllRows');
  window._hiddenRowKeys={};
  window._hideStack=[];
  if(window._lastParsedList && typeof _reRenderCompact==='function'){
    _reRenderCompact();
  } else {
    document.querySelectorAll('#render-target tr.filter-hide, #render-target tr.row-hidden').forEach(tr=>{
      tr.style.display='';
      tr.classList.remove('filter-hide','row-hidden');
    });
    document.querySelectorAll('.actividad[id^="act-"]').forEach(function(act){
      _recalcAvgRows(act.id.replace(/^act-/,''));
    });
  }
}

/* ── CLEAR ── */
function clearJson(){
  document.getElementById('json-input').value='';
  document.getElementById('output').innerHTML=`<div class="placeholder">
    <div class="placeholder-icon">⌁</div>
    <div class="placeholder-title">Sin datos</div>
    <div class="placeholder-sub">Carga el .fit desde el botón Garmin</div>
  </div>`;
document.getElementById('btn-img').style.display='none';
document.getElementById('btn-copy-img').style.display='none';
document.getElementById('btn-link-img').style.display='none';
document.getElementById('btn-share').style.display='none';
  document.getElementById('filter-bar').classList.remove('visible');
  document.getElementById('filter-input').value='';
  document.getElementById('error-msg').style.display='none';
  _showCompactBar(false);
  _lastParsedList = null;
  document.getElementById('json-input').focus();
}

/* ── SHARE CARD HELPERS ── */
function _fmtShareName(n){
  if(!n)return'';
  return n.replace(/[\d]{8,}/g,'').replace(/\s+/g,' ').trim();
}
function _shareOptsFromDOM(ov){
  var o={};
  ['dist','time','pace','elev','vel_med','vel_max','fc_med','fc_max','cad','pot','ruta','cal','zonas','zonas_pct','nombre','tipo'].forEach(function(k){
    var cb=document.getElementById('sh-'+k);
    o[k]=cb?cb.checked:false;
  });
  // Use preview drag order if set, otherwise read from sidebar checkbox order
  var order=[];
  var previewOrder=document.getElementById('sh-preview-order');
  if(previewOrder&&previewOrder.value){
    previewOrder.value.split(',').forEach(function(k){
      k=k.trim();
      if(k&&o.hasOwnProperty(k))order.push(k);
    });
  }
  if(!order.length){
    var statsGrid=ov.querySelectorAll('.share-grid')[0];
    if(statsGrid){
      statsGrid.querySelectorAll('.share-opt').forEach(function(el){
        var cb=el.querySelector('input');
        if(cb){
          var k=cb.id.replace('sh-','');
          if(k&&o.hasOwnProperty(k))order.push(k);
        }
      });
    }
  }
  if(order.length)o.order=order;
  var bgEl=ov.querySelector('.share-bg-opt.active');
  o.bg=bgEl?bgEl.getAttribute('data-bg'):'custom';
  var arEl=ov.querySelector('.share-ar-opt.active');
  o.ar=arEl?arEl.getAttribute('data-ar'):'16:9';
  var modoEl=ov.querySelector('[data-modo].active');
  o.modo=modoEl?modoEl.getAttribute('data-modo'):'sesion';
  var barrasEl=ov.querySelector('[data-barras].active');
  o.barras=barrasEl?barrasEl.getAttribute('data-barras'):'sesion';
  var nameInput=document.getElementById('sh-custom-name');
  o.customName=nameInput?nameInput.value.trim():'';
  var colorInput=document.getElementById('sh-bg-color');
  o.bgColor=colorInput?colorInput.value:'#0b0c0f';
  var opacityInput=document.getElementById('sh-bg-opacity');
  o.bgOpacity=opacityInput?parseInt(opacityInput.value):100;
  var tcEl=ov.querySelector('.share-tc-opt.active,.share-tc-swatch.active');
  var tc=tcEl?tcEl.getAttribute('data-tc'):'auto';
  if(!tc){var tci=document.getElementById('sh-text-color');tc=tci?tci.value:'auto';}
  o.textColor=tc||'auto';
  var fontSel=document.getElementById('sh-font-family');
  o.fontFamily=fontSel?fontSel.value:'modern';
  var routeOpEl=document.getElementById('sh-route-opacity');
  o.routeOpacity=routeOpEl?parseInt(routeOpEl.value):22;
  var aoEls=ov.querySelectorAll('.share-align-options');
  var ahEl=aoEls[0].querySelector('.share-align-opt.active');
  o.align_header=ahEl?ahEl.getAttribute('data-align'):'left';
  if(aoEls.length>1){
    var adEl=aoEls[1].querySelector('.share-align-opt.active');
    o.align_data=adEl?adEl.getAttribute('data-align'):'left';
  } else o.align_data='left';
  return o;
}
function _buildShareCardHTML(opts,data){
  var nombre=opts.customName||_fmtShareName(data.nombre||''),tipo=data.tipo||'';
  var warmup=data.warmup||null,cooldown=data.cooldown||null,series=data.series||[],zonas=data.zonas||[];
  var esEfectivo=opts.modo==='efectivo';
  var totalSecs=0,totalDistKm=0,totalElev=0,totalCal=0,maxSpeedVal=0;
  var avgFC=0,maxFC=0,avgCad=0,avgPot=0,avgSpeedMps=0;
  var paceStr='',velMedStr='',velMaxStr='',timeStr='';
  // Try to read from rendered DOM first — guarantees match with table
  var actId=data._actKey;
  if(actId){
    var pfx=esEfectivo?'ser':'ses';
    function _txt(id){var e=document.getElementById(actId+id);return e?e.textContent.trim():'';}
    function _mn(id){var e=document.getElementById(actId+id);if(!e)return'';var m=e.querySelector('.main');return m?m.textContent.trim():'';}
    var fcT=_txt(pfx+'-fcm');if(fcT&&fcT!=='—')avgFC=parseInt(fcT)||0;
    var fxT=_txt(pfx+'-fcx');if(fxT&&fxT!=='—')maxFC=parseInt(fxT)||0;
    var caT=_txt(pfx+'-cad');if(caT&&caT!=='—')avgCad=parseInt(caT)||0;
    var spT=_mn(pfx+'-spd');if(spT&&spT!=='—'){var sn=parseFloat(spT);if(!isNaN(sn)){avgSpeedMps=sn/3.6;velMedStr=sn.toFixed(1)+' <span class="sc-unit">km/h</span>';}}
    var paT=_mn(pfx+'-pac');if(paT&&paT!=='—'){
      var _pp=paT.lastIndexOf('.');
      var _clean=_pp>=0?paT.substring(0,_pp):paT;
      var _pc=_clean.split(':');
      if(_pc.length===2)paceStr='<span class="sc-val-num">'+_pc[0]+'</span><sup class="sc-unit">\u2032</sup><span class="sc-val-num">'+_pc[1]+'</span><sup class="sc-unit">\u2033</sup>';
      else paceStr='<span class="sc-val-num">'+_clean+'</span><sup class="sc-unit">\u2033</sup>';
    }
    var diE=document.getElementById(actId+pfx+'-dist');
    if(diE){var dm=diE.querySelector('.main');if(dm){var dt=dm.textContent.trim();var dn=parseFloat(dt);if(!isNaN(dn))totalDistKm=dn;}
      var ds=diE.querySelector('.sub');if(ds){var et=ds.textContent.trim();var en=parseInt(et.replace(/[^0-9\-]/g,''));if(!isNaN(en))totalElev=en;}}
    var tiT=_txt(pfx+'-time');
    if(tiT&&tiT!=='—'){var tp=tiT.split(':');if(tp.length===2)totalSecs=parseInt(tp[0])*60+parseFloat(tp[1]);else if(tp.length===3)totalSecs=parseInt(tp[0])*3600+parseInt(tp[1])*60+parseFloat(tp[2]);}
    if(totalSecs>0&&tiT){
      var _dot=tiT.lastIndexOf('.');
      if(_dot>=0){
        var _main=tiT.substring(0,_dot);
        var _dec=tiT.substring(_dot+1);
        while(_dec.length<3)_dec+='0';
        _dec=_dec.substring(0,3);
        timeStr='<span class="sc-val-num">'+_main+'</span><span class="sc-unit">.'+_dec+'</span>';
      } else {
        timeStr='<span class="sc-val-num">'+tiT+'</span>';
      }
    }
    if(data._pre){var _pv=data._pre[esEfectivo?'efc':'ses'];if(_pv&&_pv.velX>0)maxSpeedVal=_pv.velX;}
  }
  if(data.summary&&data.summary.calories>0)totalCal=data.summary.calories;
  // Fallback: fill fields that DOM didn't provide
  var pre=data._pre&&data._pre[esEfectivo?'efc':'ses'];
  if(pre&&pre.dur>0){
    if(totalSecs<=0){totalSecs=pre.dur;}
    if(!totalDistKm)totalDistKm=pre.dist;
    if(!totalElev)totalElev=pre.dsn||0;
    if(!avgFC)avgFC=pre.fcM||0;
    if(!maxFC)maxFC=pre.fcX||0;
    if(!avgCad)avgCad=pre.cad||0;
    if(!avgPot)avgPot=pre.pot||0;
    if(!avgSpeedMps)avgSpeedMps=pre.vel||0;
    if(!maxSpeedVal&&pre.velX>0)maxSpeedVal=pre.velX;
  } else if(totalSecs<=0){
    var allFC=[],allFCDur=[],allFCx=[],allCad=[],allPot=[];
    function _rDur(s){return(s.dur_raw_secs||s.dur_secs||0);}
    function _rDist(s){return parseFloat(s.dist_km||0);}
    function _isDesc(s){return /descanso|recuperaci[oó]n|rec\s*\d|rest/i.test(s.label||'');}
    function _addStats(s){
      var d=_rDur(s);totalSecs+=d;totalDistKm+=_rDist(s);totalElev+=parseInt(s.desnivel||0);
      if(s.fc_med>0){allFC.push(s.fc_med);allFCDur.push(d);}
      if(s.fc_max>0)allFCx.push(s.fc_max);
      if(s.cadencia>0)allCad.push(s.cadencia);
      if(s.potencia_w>0)allPot.push(s.potencia_w);
      if(s.speed_max&&s.speed_max>maxSpeedVal)maxSpeedVal=s.speed_max;
    }
    if(!esEfectivo&&warmup&&warmup.speed)_addStats(warmup);
    series.forEach(function(g){
      if(g._subLaps){g._subLaps.forEach(function(l){if(esEfectivo&&_isDesc(l))return;_addStats(l);});}
      else{if(esEfectivo&&_isDesc(g))return;_addStats(g);}
    });
    if(!esEfectivo&&cooldown&&cooldown.speed)_addStats(cooldown);
    var totFCDur=allFCDur.reduce(function(a,b){return a+b;},0);
    if(!avgFC&&allFC.length&&totFCDur)avgFC=Math.round(allFC.reduce(function(s,fc,i){return s+fc*allFCDur[i];},0)/totFCDur);
    if(!maxFC)maxFC=allFCx.length?Math.round(allFCx.reduce(function(a,b){return Math.max(a,b);},0)):0;
    if(!avgCad)avgCad=allCad.length?Math.round(allCad.reduce(function(a,b){return a+b;},0)/allCad.length):0;
    if(!avgPot)avgPot=allPot.length?Math.round(allPot.reduce(function(a,b){return a+b;},0)/allPot.length):0;
    if(!avgSpeedMps)avgSpeedMps=totalDistKm>0&&totalSecs>0?totalDistKm/(totalSecs/3600)/3.6:0;
  }
  if(!paceStr){
    if(avgSpeedMps>0){
      var _pr=toRitmo(avgSpeedMps).replace(/\..*$/,'');
      var _pc=_pr.split(':');
      if(_pc.length===2)paceStr='<span class="sc-val-num">'+_pc[0]+'</span><sup class="sc-unit">\u2032</sup><span class="sc-val-num">'+_pc[1]+'</span><sup class="sc-unit">\u2033</sup>';
      else paceStr='<span class="sc-val-num">'+_pr+'</span><sup class="sc-unit">\u2033</sup>';
    } else {
      paceStr='—';
    }
  }
  if(!velMedStr){var aks=avgSpeedMps*3.6;velMedStr=aks>0?aks.toFixed(1)+' <span class="sc-unit">km/h</span>':'—';}
  if(!velMaxStr)velMaxStr=maxSpeedVal>0?(maxSpeedVal*3.6).toFixed(1)+' <span class="sc-unit">km/h</span>':'—';
  if(!timeStr){
    if(totalSecs>0){
      var _raw=secsToStepStr(totalSecs,3);
      var _dot=_raw.lastIndexOf('.');
      if(_dot>=0)timeStr='<span class="sc-val-num">'+_raw.substring(0,_dot)+'</span><span class="sc-unit">'+_raw.substring(_dot)+'</span>';
      else timeStr='<span class="sc-val-num">'+_raw+'</span>';
    } else {
      timeStr='—';
    }
  }
  var tipoAbr={CINTA:'Cinta',BICI:'Bici',MOTO:'Moto',RUN:'Running',TRAIL:'Trail'}[tipo]||tipo||'Running';

  var zoneHtml='';
  var zColors={1:'#a0a0a0',2:'#4a90e2',3:'#27ae60',4:'#f39c12',5:'#e74c3c'};
  var zBands=null;
  function _fcZone(fc){
    if(zBands&&zBands.length){
      for(var i=0;i<zBands.length;i++){if(fc>=zBands[i].lo&&fc<zBands[i].hi)return zBands[i].zn;}
      return zBands[zBands.length-1].zn;
    }
    if(!zonas||!zonas.length||!fc)return 0;
    var m=maxFC||200;
    for(var i=zonas.length-1;i>=0;i--){
      var z=zonas[i];var lo=z&&z.lowBound?z.lowBound:m*(0.4+(z.zoneNumber-1)*0.12);
      if(fc>=lo||i===0)return z?z.zoneNumber||(i+1):1;
    }
    return 1;
  }
  function _fcColor(zn){return zColors[zn]||'#888';}
  var maxHR=maxFC||200;
  function _renderZoneSet(_esEf){
    var zh='';
    var zWidths=[],zBands=[],cumPct=0;
    var _domW={},_domTime={},_domPct={};
    var _avgFC=0,_maxFC=0;
    if(actId){
      var zonesDual=document.getElementById('act-'+actId)&&document.getElementById('act-'+actId).querySelector('.zones-dual');
      if(zonesDual){
        var colIdx=_esEf?1:0;
        zonesDual.querySelectorAll('.zone-row').forEach(function(row){
          var col=row.children[colIdx];if(!col)return;
          var nameEl=col.querySelector('.zone-name');if(!nameEl)return;
          var zn=parseInt((nameEl.textContent||'').replace(/[^0-9]/g,''))||0;
          if(!zn)return;
          var bi=col.querySelector('.bar .bi');
          if(bi)_domW[zn]=parseInt((bi.style.width||'0').replace('%',''))||0;
          var tm=col.querySelector('.zone-time-main');
          if(tm)_domTime[zn]=tm.textContent.trim();
          var pp=col.querySelector('.zone-pct-sub');
          if(pp)_domPct[zn]=pp.textContent.trim();
        });
      }
      var _pfx=_esEf?'ser':'ses';
      var _fe=document.getElementById(actId+_pfx+'-fcm');
      if(_fe){var _ft=_fe.textContent.trim();if(_ft&&_ft!=='—')_avgFC=parseInt(_ft)||0;}
      var _xe=document.getElementById(actId+_pfx+'-fcx');
      if(_xe){var _xt=_xe.textContent.trim();if(_xt&&_xt!=='—')_maxFC=parseInt(_xt)||0;}
    }
    var _parseR=function(r){
      if(!r)return null;
      var m=r.match(/(\d+)\s*[\u2013-]\s*(\d+)/);
      if(m)return{lo:parseInt(m[1]),hi:parseInt(m[2])};
      var gt=r.match(/>\s*(\d+)/);
      if(gt){var l=parseInt(gt[1]);return{lo:l,hi:l+40};}
      return null;
    };
    var totalZSecs=zonas.reduce(function(s,z){return s+(z.secs||0);},0);
    zonas.forEach(function(z){
      var zn=z.zoneNumber||parseInt((z.nombre||'').replace(/[^0-9]/g,''))||0;
      if(!zn)return;
      var w=_domW[zn]!==undefined?Math.max(1,_domW[zn]):(totalZSecs>0?Math.max(1,Math.round((z.secs||0)/totalZSecs*100)):0);
      if(w<=0)return;
      zWidths.push({zn:zn,w:w});
    });
    if(zWidths.length){
      var _cardW2=opts.ar==='9:16'?260:opts.ar==='1:1'?400:520;
      var _padH2=opts.ar==='9:16'?32:40;
      var _barW2=_cardW2-_padH2;
      var zWithFC={};
      [_avgFC, _maxFC].forEach(function(fc){
        if(!fc||fc<=0)return;
        zonas.forEach(function(z,i){
          var zn=z.zoneNumber||parseInt((z.nombre||'').replace(/[^0-9]/g,''))||0;
          if(!zn)return;
          var r=_parseR(z.rango||zonaRange(z.nombre));
          var lo=r?r.lo:(z.lowBound||0);
          var hi=r?r.hi:(i+1<zonas.length?zonas[i+1].lowBound:200);
          if(fc>=lo&&fc<hi)zWithFC[zn]=true;
        });
      });
      var anyAdj=false;
      zonas.forEach(function(z){
        var zn=z.zoneNumber||parseInt((z.nombre||'').replace(/[^0-9]/g,''))||0;
        if(!zn)return;
        var zw=zWidths.find(function(x){return x.zn===zn;});if(!zw)return;
        var zSec=z.secs||0;
        var mins=Math.floor(zSec/60),secs=Math.round(zSec%60);
        var tTime=zSec>0?mins+':'+(secs<10?'0':'')+secs:'';
        var txtLen=opts.zonas_pct?3:Math.max(tTime.length,1);
        var estFont=6;
        var txtPx=txtLen*estFont*0.55;
        var markerPx=zWithFC[zn]?30:0;
        var needPx=Math.max(txtPx,markerPx)+4;
        var needPct=Math.ceil(needPx/_barW2*100);
        if(zw.w<needPct){zw.w=needPct;anyAdj=true;}
      });
      if(anyAdj){
        var tot=zWidths.reduce(function(s,x){return s+x.w;},0);
        if(tot>100){
          var exc=tot-100;
          zWidths.slice().sort(function(a,b){return b.w-a.w;}).forEach(function(zw){
            if(exc<=0)return;
            var take=Math.min(exc,zw.w-1);
            zw.w-=take;exc-=take;
          });
        }
        var adj=100-zWidths.reduce(function(s,x){return s+x.w;},0);
        if(adj!==0){zWidths[zWidths.length-1].w+=adj;}
      }
    }
    var maxHR2=_maxFC||200;
    zonas.forEach(function(z,i,arr){
      var zn=z.zoneNumber||parseInt((z.nombre||'').replace(/[^0-9]/g,''))||0;
      if(!zn)return;
      var zw=zWidths.find(function(x){return x.zn===zn;});if(!zw)return;
      var r=_parseR(z.rango||zonaRange(z.nombre)),lo=0,hi=0;
      if(r){lo=r.lo;hi=r.hi;}
      else{lo=z.lowBound||0;hi=(i+1<arr.length?arr[i+1].lowBound:0)||maxHR2;}
      if(!hi||hi<=lo)return;
      zBands.push({zn:zn,lo:lo,hi:hi,offset:cumPct,width:zw.w});
      cumPct+=zw.w;
    });
    var _findFCPos=function(fc){
      for(var i=0;i<zBands.length;i++){
        var b=zBands[i];
        if(fc>=b.lo&&fc<b.hi){
          var pctInZone=(fc-b.lo)/(b.hi-b.lo);
          return Math.max(2,Math.min(100,b.offset+pctInZone*b.width));
        }
      }
      var last=zBands.length?zBands[zBands.length-1]:null;
      if(last&&fc>=last.hi)return Math.min(100,last.offset+last.width);
      return 50;
    };
    var _localFcZone=function(fc){
      for(var i=0;i<zBands.length;i++){if(fc>=zBands[i].lo&&fc<zBands[i].hi)return zBands[i].zn;}
      return zBands.length?zBands[zBands.length-1].zn:1;
    };
    var markers=[];
    if(opts.fc_med&&_avgFC>0){
      var p=_findFCPos(_avgFC);var z=_localFcZone(_avgFC);
      markers.push({fc:_avgFC,p:p,z:z,below:0});
    }
    if(opts.fc_max&&_maxFC>0){
      var p=_findFCPos(_maxFC);var z=_localFcZone(_maxFC);
      markers.push({fc:_maxFC,p:p,z:z,below:1});
    }
    markers.forEach(function(m){m.arrow=m.below?'▲':'▼';});
    var _markerHTML=function(m,below){
      var pct=Math.max(0,Math.min(100,m.p));
      var edge=pct>92?' sc-marker-right':pct<8?' sc-marker-left':'';
      var cls='sc-zone-marker'+(below?' sc-zone-marker-below':'')+edge;
      if(below){
        return '<span class="'+cls+'" style="left:'+pct+'%;color:'+_fcColor(m.z)+'"><span class="sc-zone-marker-arrow">'+m.arrow+'</span><span class="sc-zone-marker-val">'+m.fc+'</span></span>';
      }
      return '<span class="'+cls+'" style="left:'+pct+'%;color:'+_fcColor(m.z)+'"><span class="sc-zone-marker-val">'+m.fc+'</span><span class="sc-zone-marker-arrow">'+m.arrow+'</span></span>';
    };
    var mH='<div class="sc-zone-markers-above">';
    markers.forEach(function(m){if(!m.below)mH+=_markerHTML(m);});
    mH+='</div>';
    zh+=mH;
    zh+='<div class="sc-zones">';
    var _cardW=opts.ar==='9:16'?260:opts.ar==='1:1'?400:520;
    var _padH=opts.ar==='9:16'?32:40;
    var _barW=_cardW-_padH;
    var _segData=[];
    var _totalZSec=zonas.reduce(function(s,z){return s+(z.secs||0);},0);
    zonas.forEach(function(z){
      var zn=z.zoneNumber||parseInt((z.nombre||'').replace(/[^0-9]/g,''))||0;
      if(!zn)return;
      var zwi=zWidths.find(function(x){return x.zn===zn;});var w=zwi?zwi.w:1;
      var zSec=z.secs||0;
      var mins=Math.floor(zSec/60);
      var secs=Math.round(zSec%60);
      var tTime=zSec>0?mins+':'+(secs<10?'0':'')+secs:'';
      var tStr;
      if(_domTime[zn]!==undefined&&_domTime[zn].length>0){
        if(opts.zonas_pct){
          var raw=_domPct[zn]||'';
          var m=raw.match(/(\d+)%/);
          tStr=m&&parseInt(m[1])>0?m[1]+'%':'';
        } else {
          tStr=_domTime[zn];
        }
      } else {
        if(opts.zonas_pct){
          var pct=_totalZSec>0?Math.round(zSec/_totalZSec*100):0;
          tStr=zSec>0&&pct>0?pct+'%':'';
        } else {
          tStr=tTime;
        }
      }
      var segPx=_barW*w/100;
      _segData.push({zn:zn,w:w,tStr:tStr,tTime:tTime,segPx:segPx});
    });
    function _lum(hex){
      var r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
      return 0.299*r+0.587*g+0.072*b;
    }
    var _narrow=_segData.filter(function(sd){return sd.w<10&&sd.tStr;});
    var _zoneFs=_narrow.length>=2?6:7;
    _segData.forEach(function(sd){
      var _bg=zColors[sd.zn]||'#555';
      var _lumVal=_lum(_bg);
      var _isLight=_lumVal>140;
      var hide=!sd.tStr||sd.w<=1;
      zh+='<div class="sc-zone-seg" style="width:'+sd.w+'%;background:'+_bg+'"><span class="sc-zone-seg-time'+(hide?' sc-zone-seg-time-hide':'')+(sd.tStr&&_isLight?' sc-zone-seg-time-dark':'')+'"'+(hide?'':' style="font-size:'+_zoneFs+'px"')+'>'+sd.tStr+'</span></div>';
    });
    zh+='</div>';
    var belowMarkers=markers.filter(function(m){return m.below;});
    if(belowMarkers.length){
      zh+='<div class="sc-zone-markers-below show">';
      belowMarkers.forEach(function(m){zh+=_markerHTML(m,1);});
      zh+='</div>';
    } else {
      zh+='<div class="sc-zone-markers-below"></div>';
    }
    return zh;
  }
  if(opts.zonas&&zonas&&zonas.length){
    zoneHtml='<div class="sc-zone-area">';
    if(opts.barras==='ambas'){
      zoneHtml+=_renderZoneSet(false);
      zoneHtml+=_renderZoneSet(true);
    } else {
      zoneHtml+=_renderZoneSet(opts.barras==='efectivo');
    }
    zoneHtml+='</div>';
  }
  var distLabel=totalDistKm>0?_w(totalDistKm.toFixed(2))+' <span class="sc-unit">km</span>':'—';
  var _alignHead=opts.align_header||'left';
  var _alignData=opts.align_data||'left';
  function _w(val){return '<span class="sc-val-num">'+val+'</span>';}
  var _stats={dist:opts.dist&&'<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="dist"><div class="sc-stat-val">'+distLabel+'</div><div class="sc-stat-lbl">Distancia</div></div>',
     time:opts.time&&'<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="time"><div class="sc-stat-val">'+timeStr+'</div><div class="sc-stat-lbl">Duración</div></div>',
     pace:opts.pace&&'<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="pace"><div class="sc-stat-val">'+paceStr+'</div><div class="sc-stat-lbl">Ritmo</div></div>',
    elev:opts.elev&&totalElev!==0&&'<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="elev"><div class="sc-stat-val">'+_w(Math.abs(totalElev))+' <span class="sc-fc-ico" style="color:'+(totalElev>0?'rgba(239,68,68,0.5)':'rgba(34,197,94,0.5)')+'">'+(totalElev>0?'▲':'▼')+'</span></div><div class="sc-stat-lbl">Desnivel</div></div>',
    fc_med:opts.fc_med&&avgFC>0&&function(){var _c=_fcColor(_fcZone(avgFC));return '<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="fc_med"><div class="sc-stat-val">'+_w(avgFC)+' <span class="sc-fc-ico" style="color:'+_c+'">♥</span></div><div class="sc-stat-lbl">FC media</div></div>';}(),
    fc_max:opts.fc_max&&maxFC>0&&function(){var _c=_fcColor(_fcZone(maxFC));return '<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="fc_max"><div class="sc-stat-val">'+_w(maxFC)+' <span class="sc-fc-ico" style="color:'+_c+'">♥</span></div><div class="sc-stat-lbl">FC máx</div></div>';}(),
    vel_med:opts.vel_med&&'<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="vel_med"><div class="sc-stat-val">'+_w(velMedStr)+'</div><div class="sc-stat-lbl">Vel. med</div></div>',
    vel_max:opts.vel_max&&'<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="vel_max"><div class="sc-stat-val">'+_w(velMaxStr)+'</div><div class="sc-stat-lbl">Vel. máx</div></div>',
    cal:opts.cal&&totalCal>0&&'<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="cal"><div class="sc-stat-val">'+_w(totalCal)+'</div><div class="sc-stat-lbl">Calorías</div></div>',
    cad:opts.cad&&avgCad>0&&'<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="cad"><div class="sc-stat-val">'+_w(avgCad)+'</div><div class="sc-stat-lbl">Cadencia</div></div>',
    pot:opts.pot&&avgPot>0&&'<div class="sc-stat" style="text-align:'+_alignData+'" draggable="true" data-key="pot"><div class="sc-stat-val">'+_w(avgPot)+' <span class="sc-unit">W</span></div><div class="sc-stat-lbl">Potencia</div></div>'};
  var order=opts.order&&opts.order.length?opts.order:
    tipo==='ASFALTO'||tipo==='CINTA'||tipo==='TRAIL'?['dist','time','pace','cad','fc_med','fc_max','elev','vel_med','vel_max']:
    tipo==='BICI'?['dist','time','vel_med','vel_max','cad','pot','elev','fc_med','fc_max']:
    tipo==='MOTO'?['dist','time','vel_med','vel_max']:
    ['dist','time','elev','cad','pace','vel_med','vel_max','fc_med','fc_max'];
  if(opts.cal&&order.indexOf('cal')===-1)order.push('cal');
  var statsCells='';
  order.forEach(function(k){if(_stats[k])statsCells+=_stats[k];});
  var activeCount=order.reduce(function(c,k){return c+(_stats[k]?1:0);},0);
  var statsLayout='';
  if(activeCount>(opts.ar==='16:9'?4:2)){
    var defaultCols=opts.ar==='16:9'?4:2;
    var maxCols=opts.ar==='16:9'?5:4;
    var gap=opts.ar==='16:9'?16:20;
    var bestRows=Math.ceil(activeCount/defaultCols);
    var bestCols=defaultCols;
    for(var c=defaultCols+1;c<=maxCols;c++){
      if(activeCount%c!==1){
        var rows=Math.ceil(activeCount/c);
        if(rows<bestRows){bestRows=rows;bestCols=c;}
      }
    }
    if(bestCols!==defaultCols||opts.ar==='16:9'){
      statsLayout='flex';
      var fb='calc((100% - '+(bestCols-1)*gap+'px)/'+bestCols+')';
      statsCells=statsCells.replace(/style="text-align:([^"]+)"/g,'style="flex:0 0 '+fb+';box-sizing:border-box;text-align:$1"');
    }
  }

  var isTransparent=opts.bg==='transparent';
  var bgStyle='';
  var _isLight=false;
  if(!isTransparent&&opts.bgColor){
    var _r=parseInt(opts.bgColor.slice(1,3),16)/255;
    var _g=parseInt(opts.bgColor.slice(3,5),16)/255;
    var _b=parseInt(opts.bgColor.slice(5,7),16)/255;
    var _lum=0.2126*_r+0.7152*_g+0.0722*_b;
    _isLight=_lum>0.55;
    var _a=Math.min(1,Math.max(0,(opts.bgOpacity||100)/100));
    bgStyle='background:rgba('+parseInt(opts.bgColor.slice(1,3),16)+','+parseInt(opts.bgColor.slice(3,5),16)+','+parseInt(opts.bgColor.slice(5,7),16)+','+_a+')';
  }
  var _cls='strava-card ar-'+opts.ar.replace(':','-')+(isTransparent?' sc-transparent':'')+(_isLight?' sc-light':'')+((opts.align_data||'')==='right'?' sc-align-right':(opts.align_data||'')==='center'?' sc-align-center':'');
  var _style=bgStyle;
  var _hasTC=false;
  if(opts.textColor&&opts.textColor!=='auto'){
    _hasTC=true;_cls+=' sc-has-tc';
    _style+=';--tc:'+opts.textColor;
  }

  var routeHtml='';
  if(opts.ruta&&data.track&&data.track.length>2){
    var lats=data.track.map(function(p){return p.lat;});
    var lngs=data.track.map(function(p){return p.lng;});
    var minLat=Math.min.apply(null,lats),maxLat=Math.max.apply(null,lats);
    var minLng=Math.min.apply(null,lngs),maxLng=Math.max.apply(null,lngs);
    var rLat=maxLat-minLat||1,rLng=maxLng-minLng||1;
    var pad=0.08;
    var pts=data.track.map(function(p){
      var x=((p.lng-minLng)/rLng*(1-2*pad)+pad)*100;
      var y=((1-(p.lat-minLat)/rLat)*(1-2*pad)+pad)*100;
      return x.toFixed(1)+','+y.toFixed(1);
    }).join(' ');
    var _routeColor=_hasTC?'var(--tc)':(_isLight?'rgba(0,0,0,0.3)':'rgba(255,255,255,0.5)');
    routeHtml='<svg class="sc-route-bg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:'+((opts.routeOpacity||22)/1000).toFixed(3)+';color:'+_routeColor+'"><polyline fill="none" stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" points="'+pts+'"/></svg>';
  }
  var photoHtml='';
  if(opts.bgPhoto){photoHtml='';}
  var _fontMap={modern:'-apple-system,BlinkMacSystemFont,\'SF Pro Text\',\'Segoe UI\',system-ui,sans-serif',arial:'Arial,Helvetica,sans-serif',verdana:'Verdana,Geneva,Tahoma,sans-serif',trebuchet:'\'Trebuchet MS\',\'Lucida Grande\',sans-serif',century:'\'Century Gothic\',\'Apple Gothic\',sans-serif',rounded:'\'SF Pro Rounded\',\'SF Pro Text\',system-ui,sans-serif',optima:'Optima,\'Gill Sans\',\'Gill Sans MT\',sans-serif',serif:'Georgia,\'Times New Roman\',serif',palatino:'Palatino,\'Palatino Linotype\',\'Book Antiqua\',serif',times:'\'Times New Roman\',Times,serif',garamond:'Garamond,\'EB Garamond\',serif',baskerville:'Baskerville,\'Times New Roman\',serif',bookman:'\'Bookman Old Style\',\'Book Antiqua\',serif',mono:'\'SF Mono\',\'Cascadia Code\',Consolas,\'Courier New\',monospace',courier:'\'Courier New\',Courier,monospace',lucida:'\'Lucida Console\',\'Lucida Sans Typewriter\',monospace',impact:'Impact,Haettenschweiler,\'Arial Black\',sans-serif',copperplate:'Copperplate,\'Copperplate Gothic\',serif',comic:'\'Comic Sans MS\',\'Comic Sans\',cursive',papyrus:'Papyrus,\'Segoe Print\',cursive'};
  var _ff=_fontMap[opts.fontFamily]||_fontMap.modern;
  _style+=';font-family:'+_ff+';position:relative;overflow:hidden';
  var _jc=function(a){return a==='right'?'flex-end':a==='center'?'center':'flex-start';};
  return '<div class="'+_cls+'" style="'+_style+'">'
    +routeHtml
    +'<div class="sc-body">'
    +'<div class="sc-header" style="text-align:'+_alignHead+'">'
    +'<div class="sc-title">'+(function(){var _p=[];if(opts.tipo!==false&&tipoAbr)_p.push(tipoAbr);if(opts.nombre&&nombre)_p.push(nombre);return _p.join(' · ');})()+'</div>'
    +'</div>'
    +(statsCells?'<div class="sc-stats" style="justify-content:'+_jc(opts.align_data||'left')+';align-items:'+_jc(opts.align_data||'left')+';'+(statsLayout==='flex'?'display:flex;flex-wrap:wrap;justify-content:center;':'')+'">'+statsCells+'</div>':'')
    +zoneHtml
    +'</div>'
    +'<div class="sc-brandbar"><span class="sc-brandbar-text">by AlejandrLucena</span></div>'
    +'</div>';
}
function _updateSharePreview(){
  try {
    var ov=document.getElementById('share-overlay');
    if(!ov)return;
    var pv=ov.querySelector('.share-preview-wrap');
    if(!pv)return;
    var data=window._lastParsedList&&window._lastParsedList[0];
    if(!data){pv.innerHTML='<div style="padding:30px;text-align:center;color:#555">Sin datos</div>';return;}
    var opts=_shareOptsFromDOM(ov);
    try{localStorage.setItem('garminShareOpts',JSON.stringify(opts));}catch(e){}
    pv.innerHTML=_buildShareCardHTML(opts,data);
    _fitCardToPreview(ov);
  } catch(e){}
}
function _fitCardToPreview(ov){
  try{
    var pv=ov.querySelector('.share-preview-wrap');
    if(!pv)return;
    var card=pv.firstElementChild;
    if(!card)return;
    var isMob=window.innerWidth<=520;
    var ovPad=isMob?16:32;
    var layoutW=Math.min(520,window.innerWidth-ovPad);
    var pvPad=isMob?22:40;
    var maxW=layoutW-pvPad-16;
    if(maxW<50)maxW=50;
    if(card.scrollWidth>10&&card.scrollWidth>maxW){
      card.style.zoom=maxW/card.scrollWidth;
    } else if(card.scrollWidth>10){
      card.style.zoom='';
    }
  }catch(e){}
}
var _fitCardTimer=null;
function _debounceFitCard(){
  if(_fitCardTimer)clearTimeout(_fitCardTimer);
  _fitCardTimer=setTimeout(function(){
    var ov=document.getElementById('share-overlay');
    if(ov&&ov.style.display!=='none')_fitCardToPreview(ov);
  },150);
}
if(window._fitCardListenerAdded){}else{
  window.addEventListener('resize',_debounceFitCard);
  window._fitCardListenerAdded=true;
}

/* ── SHARE CARD UI ── */
function shareStrava(){
  console.log('[share] open');
  document.body._oldOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  var saved=null;
  try{saved=JSON.parse(localStorage.getItem('garminShareOpts')||'null');}catch(e){}
  var defaults={
    dist:true,time:true,pace:true,elev:true,
    vel_med:false,vel_max:false,
    fc_med:true,fc_max:false,cad:false,pot:false,
    ruta:true,cal:false,routeOpacity:22,
    zonas:true,nombre:true,tipo:true,
    bg:'dark',bgColor:'#0b0c0f',bgOpacity:100,ar:'16:9',modo:'sesion',barras:'sesion',customName:'',textColor:'auto',fontFamily:'modern',
    align_header:'left',align_data:'left'
  };
  var opts=Object.assign({},defaults,saved||{});
  if(!opts.bgColor)opts.bgColor='#0b0c0f';
  if(!opts.bgOpacity)opts.bgOpacity=100;
  if(opts.bg==='dark'){opts.bgColor='#0b0c0f';opts.bgOpacity=100;}
  else if(opts.bg==='light'){opts.bgColor='#f0f0f4';opts.bgOpacity=100;}
  else if(opts.bg==='transparent'){opts.bgColor='#0b0c0f';opts.bgOpacity=0;}
  console.log('[share] opts',opts);

  var data=window._lastParsedList&&window._lastParsedList[0]||{};
  console.log('[share] data keys',Object.keys(data));

  var ov=document.createElement('div');ov.className='share-overlay';ov.id='share-overlay';
  ov.addEventListener('click',function(e){if(e.target===ov)closeShareOpts();});
  document.addEventListener('keydown',_shareEsc);
  ov.innerHTML='<div class="share-layout">'
    +'<div class="share-sidebar">'
    +'<h3>Compartir</h3>'
+'<div class="share-section"><div class="share-section-label">Datos</div>'
+'<div class="share-grid">'
+_shareCb('dist','Distancia',opts.dist)
+_shareCb('time','Duración',opts.time)
+_shareCb('pace','Ritmo',opts.pace)
+_shareCb('elev','Desnivel',opts.elev)
+_shareCb('vel_med','Vel. media',opts.vel_med)
+_shareCb('vel_max','Vel. máxima',opts.vel_max)
+_shareCb('fc_med','FC media',opts.fc_med)
+_shareCb('fc_max','FC máxima',opts.fc_max)
+_shareCb('cad','Cadencia',opts.cad)
+_shareCb('pot','Potencia',opts.pot)
+_shareCb('ruta','Ruta GPS',opts.ruta)
+_shareCb('cal','Calorías',opts.cal)
+'</div></div>'
+'<div class="share-section">'
+'<div class="share-section-label">Nombre</div>'
+'<div class="share-grid">'
+_shareCb('nombre','Tipo + nombre',opts.nombre)
+_shareCb('tipo','Mostrar tipo',opts.tipo)
+'</div>'
+'<input type="text" id="sh-custom-name" placeholder="Nombre personalizado…" value="'+(opts.customName||'')+'" oninput="_updateSharePreview()" style="width:100%;margin-top:8px;padding:8px 10px;border-radius:8px;border:1px solid #2a2d3a;background:#0d0e14;color:#eaeaea;font-size:12px;outline:none;box-sizing:border-box">'
+'</div>'
+'<div class="share-section">'
+'<div class="share-section-label">Barras de zonas</div>'
+'<div class="share-grid">'
+_shareCb('zonas','Barra de zonas',opts.zonas)
+_shareCb('zonas_pct','% en zonas',opts.zonas_pct)
+'</div>'
+'<div class="share-modo-options" style="margin-top:8px">'
+'<div class="share-modo-opt'+(opts.barras==='sesion'?' active':'')+'" data-barras="sesion" onclick="_pickShareBarras(this);_updateSharePreview()">Sesión</div>'
+'<div class="share-modo-opt'+(opts.barras==='efectivo'?' active':'')+'" data-barras="efectivo" onclick="_pickShareBarras(this);_updateSharePreview()">Trabajo efectivo</div>'
+'<div class="share-modo-opt'+(opts.barras==='ambas'?' active':'')+'" data-barras="ambas" onclick="_pickShareBarras(this);_updateSharePreview()">Ambas</div>'
+'</div></div>'
+'<div class="share-section">'
+'<div class="share-section-label">Tema</div>'
      +'<div class="share-bg-options">'
      +'<div class="share-bg-opt'+(opts.bg==='dark'?' active':'')+'" data-bg="dark" onclick="_pickShareBg(this);_updateSharePreview()">🌙 Oscuro</div>'
      +'<div class="share-bg-opt'+(opts.bg==='light'?' active':'')+'" data-bg="light" onclick="_pickShareBg(this);_updateSharePreview()">☀ Claro</div>'
      +'<div class="share-bg-opt'+(opts.bg==='transparent'?' active':'')+'" data-bg="transparent" onclick="_pickShareBg(this);_updateSharePreview()">🪞 Transparente</div>'
      +'</div></div>'
      +'<div class="share-section">'
      +'<div class="share-section-label">Modo</div>'
      +'<div class="share-modo-options">'
      +'<div class="share-modo-opt'+(opts.modo==='efectivo'?' active':'')+'" data-modo="efectivo" onclick="_pickShareModo(this);_updateSharePreview()">Trabajo efectivo</div>'
      +'<div class="share-modo-opt'+(opts.modo==='sesion'?' active':'')+'" data-modo="sesion" onclick="_pickShareModo(this);_updateSharePreview()">Media sesión</div>'
      +'</div></div>'
      +'<div class="share-section">'
      +'<div class="share-section-label">Color tarjeta</div>'
      +'<div class="share-swatches">'
      +'<div class="share-swatch'+(opts.bgColor==='#0b0c0f'?' active':'')+'" data-color="#0b0c0f" onclick="_pickSwatch(this)" style="background:#0b0c0f"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#1a1c28'?' active':'')+'" data-color="#1a1c28" onclick="_pickSwatch(this)" style="background:#1a1c28"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#2d2d41'?' active':'')+'" data-color="#2d2d41" onclick="_pickSwatch(this)" style="background:#2d2d41"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#1a2a3a'?' active':'')+'" data-color="#1a2a3a" onclick="_pickSwatch(this)" style="background:#1a2a3a"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#0f3460'?' active':'')+'" data-color="#0f3460" onclick="_pickSwatch(this)" style="background:#0f3460"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#3a3a6a'?' active':'')+'" data-color="#3a3a6a" onclick="_pickSwatch(this)" style="background:#3a3a6a"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#3a1a5e'?' active':'')+'" data-color="#3a1a5e" onclick="_pickSwatch(this)" style="background:#3a1a5e"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#4a1a3a'?' active':'')+'" data-color="#4a1a3a" onclick="_pickSwatch(this)" style="background:#4a1a3a"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#2d4a2e'?' active':'')+'" data-color="#2d4a2e" onclick="_pickSwatch(this)" style="background:#2d4a2e"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#2a4a3a'?' active':'')+'" data-color="#2a4a3a" onclick="_pickSwatch(this)" style="background:#2a4a3a"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#3d2b1f'?' active':'')+'" data-color="#3d2b1f" onclick="_pickSwatch(this)" style="background:#3d2b1f"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#f0f0f4'?' active':'')+'" data-color="#f0f0f4" onclick="_pickSwatch(this)" style="background:#f0f0f4"></div>'
      +'<div class="share-swatch'+(opts.bgColor==='#6a5acd'?' active':'')+'" data-color="#6a5acd" onclick="_pickSwatch(this)" style="background:#6a5acd"></div>'
      +'<div class="share-swatch share-swatch-rainbow'+(opts.bg==='custom'?' active':'')+'" style="position:relative;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);display:flex;align-items:center;justify-content:center;color:#000;font-size:12px;font-weight:700;overflow:visible;border:2px solid rgba(255,255,255,.2)" onclick="_toggleColorPopup(event)">+'
      +'<div class="share-color-popup" id="sh-color-popup" onclick="event.stopPropagation()">'
      +'<div class="share-color-popup-header">Color personalizado</div>'
      +'<div class="share-color-spectrum-wrap"><div class="share-color-spectrum" id="sh-color-spectrum"></div><div class="share-color-zoom" id="sh-color-zoom"></div></div>'
      +'<div class="share-color-brightness-wrap"><div class="share-color-brightness" id="sh-color-brightness"></div></div>'
      +'<div class="share-color-info"><div class="share-color-current" id="sh-color-current"></div><span class="share-color-hex" id="sh-color-hex" contenteditable="plaintext-only" oninput="_onHexSpanEdit(this,event)" onblur="_onHexSpanBlur(this)" onclick="event.stopPropagation()">#000000</span></div>'
      +'<div class="share-color-popup-saved"><div class="share-color-popup-header">Guardados</div><div id="sh-saved-colors-row"></div></div>'
      +'<div class="share-color-popup-actions"><button class="share-popup-btn" onclick="_saveCurrentColor();event.stopPropagation()">💾</button></div>'
      +'</div>'
      +'<input type="color" id="sh-bg-color" value="'+(opts.bgColor||'#0b0c0f')+'" oninput="_onCustomBg(this)" style="position:fixed;left:-9999px;top:-9999px;opacity:0">'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;margin:10px 0 2px;width:100%">'
      +'<span style="font-size:10px;color:rgba(255,255,255,.4);flex-shrink:0;min-width:52px">Opacidad</span>'
      +'<input type="range" id="sh-bg-opacity" min="0" max="100" value="'+(opts.bgOpacity||100)+'" oninput="_onCustomBg(this)" style="flex:1;min-width:0;height:4px">'
      +'<span id="sh-opacity-label" style="font-size:11px;color:rgba(255,255,255,.5);flex-shrink:0;min-width:32px;text-align:right">'+(opts.bgOpacity||100)+'%</span>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;margin:6px 0 2px;width:100%">'
      +'<span style="font-size:10px;color:rgba(255,255,255,.4);flex-shrink:0;min-width:52px">Ruta</span>'
      +'<input type="range" id="sh-route-opacity" min="0" max="100" value="'+(opts.routeOpacity||22)+'" oninput="document.getElementById(\'sh-route-label\').textContent=this.value+\'%\';_updateSharePreview()" style="flex:1;min-width:0;height:4px">'
      +'<span id="sh-route-label" style="font-size:11px;color:rgba(255,255,255,.5);flex-shrink:0;min-width:32px;text-align:right">'+(opts.routeOpacity||22)+'%</span>'
      +'</div></div>'
      +'<div class="share-section">'
      +'<div class="share-section-label">Color texto</div>'
      +'<div class="share-tc-row">'
      +'<div class="share-tc-opt'+(opts.textColor==='auto'||!opts.textColor?' active':'')+'" data-tc="auto" onclick="_pickTextColor(this)">Auto</div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#ffffff'?' active':'')+'" data-tc="#ffffff" onclick="_pickTextColor(this)" style="background:#fff"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#1a1c28'?' active':'')+'" data-tc="#1a1c28" onclick="_pickTextColor(this)" style="background:#1a1c28"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#fbbf24'?' active':'')+'" data-tc="#fbbf24" onclick="_pickTextColor(this)" style="background:#fbbf24"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#ef4444'?' active':'')+'" data-tc="#ef4444" onclick="_pickTextColor(this)" style="background:#ef4444"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#22c55e'?' active':'')+'" data-tc="#22c55e" onclick="_pickTextColor(this)" style="background:#22c55e"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#3b82f6'?' active':'')+'" data-tc="#3b82f6" onclick="_pickTextColor(this)" style="background:#3b82f6"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#ec4899'?' active':'')+'" data-tc="#ec4899" onclick="_pickTextColor(this)" style="background:#ec4899"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#a855f7'?' active':'')+'" data-tc="#a855f7" onclick="_pickTextColor(this)" style="background:#a855f7"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#ff6b35'?' active':'')+'" data-tc="#ff6b35" onclick="_pickTextColor(this)" style="background:#ff6b35"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#00bcd4'?' active':'')+'" data-tc="#00bcd4" onclick="_pickTextColor(this)" style="background:#00bcd4"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#8bc34a'?' active':'')+'" data-tc="#8bc34a" onclick="_pickTextColor(this)" style="background:#8bc34a"></div>'
      +'<div class="share-tc-swatch'+(opts.textColor==='#14b8a6'?' active':'')+'" data-tc="#14b8a6" onclick="_pickTextColor(this)" style="background:#14b8a6"></div>'
      +'<div class="share-tc-swatch share-tc-rainbow'+(opts.textColor&&opts.textColor!=='auto'&&['#ffffff','#1a1c28','#fbbf24','#ef4444','#22c55e','#3b82f6','#ec4899','#a855f7','#ff6b35','#00bcd4','#8bc34a','#14b8a6'].indexOf(opts.textColor)===-1?' active':'')+'" style="position:relative;background:conic-gradient(red,yellow,lime,cyan,blue,magenta,red);display:flex;align-items:center;justify-content:center;color:#000;font-size:10px;font-weight:700;overflow:visible;border:2px solid rgba(255,255,255,.2)" onclick="_toggleTCPopup(event)">+'
      +'<div class="share-color-popup" id="sh-tc-popup" onclick="event.stopPropagation()">'
      +'<div class="share-color-popup-header">Color texto</div>'
      +'<div class="share-color-spectrum-wrap"><div class="share-color-spectrum" id="sh-tc-spectrum"></div><div class="share-color-zoom" id="sh-tc-zoom"></div></div>'
      +'<div class="share-color-brightness-wrap"><div class="share-color-brightness" id="sh-tc-brightness"></div></div>'
      +'<div class="share-color-info"><div class="share-color-current" id="sh-tc-current"></div><span class="share-color-hex" id="sh-tc-hex" contenteditable="plaintext-only" oninput="_onTCHexSpanEdit(this,event)" onblur="_onTCHexSpanBlur(this)" onclick="event.stopPropagation()">#ffffff</span></div>'
      +'<div class="share-color-popup-saved"><div class="share-color-popup-header">Guardados</div><div id="sh-tc-saved-colors-row"></div></div>'
      +'<div class="share-color-popup-actions"><button class="share-popup-btn" onclick="_saveCurrentTextColor();event.stopPropagation()">💾</button></div>'
      +'</div>'
      +'<input type="color" id="sh-text-color" oninput="_onCustomTC(this)" style="position:fixed;left:-9999px;top:-9999px;opacity:0">'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:6px;margin:10px 0 2px;width:100%">'
      +'<span style="font-size:10px;color:rgba(255,255,255,.4);min-width:36px">Fuente</span>'
      +'<select id="sh-font-family" onchange="_updateSharePreview()" style="flex:1;padding:4px 6px;border-radius:6px;border:1px solid #2a2d3a;background:#0d0e14;color:#eaeaea;font-size:11px;outline:none">'
      +'<option value="modern"'+(opts.fontFamily==='modern'?' selected':'')+'>Moderno</option>'
      +'<option value="arial"'+(opts.fontFamily==='arial'?' selected':'')+'>Arial</option>'
      +'<option value="verdana"'+(opts.fontFamily==='verdana'?' selected':'')+'>Verdana</option>'
      +'<option value="trebuchet"'+(opts.fontFamily==='trebuchet'?' selected':'')+'>Trebuchet MS</option>'
      +'<option value="optima"'+(opts.fontFamily==='optima'?' selected':'')+'>Optima</option>'
      +'<option value="century"'+(opts.fontFamily==='century'?' selected':'')+'>Century Gothic</option>'
      +'<option value="rounded"'+(opts.fontFamily==='rounded'?' selected':'')+'>Rounded</option>'
      +'<option value="serif"'+(opts.fontFamily==='serif'?' selected':'')+'>Serif (Georgia)</option>'
      +'<option value="palatino"'+(opts.fontFamily==='palatino'?' selected':'')+'>Palatino</option>'
      +'<option value="times"'+(opts.fontFamily==='times'?' selected':'')+'>Times New Roman</option>'
      +'<option value="garamond"'+(opts.fontFamily==='garamond'?' selected':'')+'>Garamond</option>'
      +'<option value="baskerville"'+(opts.fontFamily==='baskerville'?' selected':'')+'>Baskerville</option>'
      +'<option value="bookman"'+(opts.fontFamily==='bookman'?' selected':'')+'>Bookman</option>'
      +'<option value="mono"'+(opts.fontFamily==='mono'?' selected':'')+'>Mono (SF Mono)</option>'
      +'<option value="courier"'+(opts.fontFamily==='courier'?' selected':'')+'>Courier New</option>'
      +'<option value="lucida"'+(opts.fontFamily==='lucida'?' selected':'')+'>Lucida Console</option>'
      +'<option value="copperplate"'+(opts.fontFamily==='copperplate'?' selected':'')+'>Copperplate</option>'
      +'<option value="impact"'+(opts.fontFamily==='impact'?' selected':'')+'>Impact</option>'
      +'<option value="comic"'+(opts.fontFamily==='comic'?' selected':'')+'>Comic Sans</option>'
      +'<option value="papyrus"'+(opts.fontFamily==='papyrus'?' selected':'')+'>Papyrus</option>'
      +'</select>'
      +'</div></div>'
      +'<div class="share-section">'
      +'<div class="share-section-label">Formato</div>'
      +'<div class="share-ar-options">'
      +'<div class="share-ar-opt'+(opts.ar==='16:9'?' active':'')+'" data-ar="16:9" onclick="_pickShareAr(this);_updateSharePreview()">16:9</div>'
      +'<div class="share-ar-opt'+(opts.ar==='9:16'?' active':'')+'" data-ar="9:16" onclick="_pickShareAr(this);_updateSharePreview()">9:16</div>'
      +'<div class="share-ar-opt'+(opts.ar==='1:1'?' active':'')+'" data-ar="1:1" onclick="_pickShareAr(this);_updateSharePreview()">1:1</div>'
      +'</div></div>'
      +'<div class="share-section">'
      +'<div class="share-section-label">Alineación</div>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      +'<div><div style="font-size:9px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Encabezado</div><div class="share-align-options" style="margin-top:0">'
      +'<div class="share-align-opt'+(opts.align_header!=='right'&&opts.align_header!=='center'?' active':'')+'" data-align="left" onclick="_pickShareAlignHeader(this);_updateSharePreview()">Izq</div>'
      +'<div class="share-align-opt'+(opts.align_header==='center'?' active':'')+'" data-align="center" onclick="_pickShareAlignHeader(this);_updateSharePreview()">Cen</div>'
      +'<div class="share-align-opt'+(opts.align_header==='right'?' active':'')+'" data-align="right" onclick="_pickShareAlignHeader(this);_updateSharePreview()">Der</div>'
      +'</div></div>'
      +'<div><div style="font-size:9px;color:rgba(255,255,255,.35);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Datos</div><div class="share-align-options" style="margin-top:0">'
      +'<div class="share-align-opt'+(opts.align_data!=='right'&&opts.align_data!=='center'?' active':'')+'" data-align="left" onclick="_pickShareAlignData(this);_updateSharePreview()">Izq</div>'
      +'<div class="share-align-opt'+(opts.align_data==='center'?' active':'')+'" data-align="center" onclick="_pickShareAlignData(this);_updateSharePreview()">Cen</div>'
      +'<div class="share-align-opt'+(opts.align_data==='right'?' active':'')+'" data-align="right" onclick="_pickShareAlignData(this);_updateSharePreview()">Der</div>'
      +'</div></div>'
      +'</div></div>'
+'<input type="hidden" id="sh-preview-order" value="">'
+'<div class="share-section">'
+'<div class="share-section-label">Preview</div>'
+'</div>'
+'<div class="share-preview">'
+'<div class="share-preview-wrap">'+_buildShareCardHTML(opts,data)+'</div>'
+'</div>'
+'<div class="share-actions">'
+'<button class="share-btn-cancel" onclick="closeShareOpts()">Salir</button>'
+'<button class="share-btn-save" onclick="saveShareOpts()">Guardar</button>'
+'<button class="share-btn-copy" onclick="copyShareCard()">Copiar</button>'
+'<button class="share-btn-gen" onclick="generateShareCard()">Generar</button>'
+'</div>'
+'</div>'
+'</div>';
  document.body.appendChild(ov);
  var _side=ov.querySelector('.share-sidebar');
  if(_side)_side.scrollTop=0;
  // Drag & drop reorder for stats in preview
  var pvWrap=ov.querySelector('.share-preview-wrap');
  if(pvWrap){
    pvWrap.addEventListener('dragstart',function(e){
      _clearLP();
      var stat=e.target.closest('.sc-stat');
      if(stat&&stat.parentElement.classList.contains('sc-stats')){stat.classList.add('dragging');e.dataTransfer.effectAllowed='move';}
    });
    pvWrap.addEventListener('dragend',function(e){
      var stat=e.target.closest('.sc-stat');
      if(stat)stat.classList.remove('dragging');
    });
    pvWrap.addEventListener('dragover',function(e){
      e.preventDefault();
      var dragging=pvWrap.querySelector('.sc-stat.dragging');
      if(!dragging)return;
      var target=e.target.closest('.sc-stat');
      var statsEl=pvWrap.querySelector('.sc-stats');
      if(!statsEl)return;
      if(!target){
        if(statsEl.lastElementChild!==dragging)statsEl.appendChild(dragging);
        return;
      }
      if(target===dragging)return;
      var isCol=statsEl.closest('.ar-9-16');
      var rect=target.getBoundingClientRect();
      var pos=isCol?e.clientY:e.clientX;
      var mid=isCol?rect.top+rect.height/2:rect.left+rect.width/2;
      if(pos<mid) statsEl.insertBefore(dragging,target);
      else statsEl.insertBefore(dragging,target.nextSibling);
    });
    pvWrap.addEventListener('drop',function(e){
      e.preventDefault();
      var dragging=pvWrap.querySelector('.sc-stat.dragging');
      if(dragging)dragging.classList.remove('dragging');
      var statsEl=pvWrap.querySelector('.sc-stats');
      if(!statsEl)return;
      var newOrder=[];
      statsEl.querySelectorAll('.sc-stat').forEach(function(el){
        var k=el.getAttribute('data-key');
        if(k)newOrder.push(k);
      });
      if(newOrder.length){
        var h=document.getElementById('sh-preview-order');
        if(h)h.value=newOrder.join(',');
      }
      _updateSharePreview();
    });
    // Touch support for mobile reorder
    var _touchStat=null,_touchStartY=0,_touchStartX=0;
    pvWrap.addEventListener('touchstart',function(e){
      var stat=e.target.closest('.sc-stat');
      if(!stat||!stat.parentElement.classList.contains('sc-stats'))return;
      _touchStat=stat;
      var t=e.changedTouches[0];
      _touchStartX=t.clientX;_touchStartY=t.clientY;
      stat.classList.add('dragging');
    },{passive:true});
    pvWrap.addEventListener('touchmove',function(e){
      if(!_touchStat)return;
      e.preventDefault();
      var t=e.changedTouches[0];
      var target=document.elementFromPoint(t.clientX,t.clientY);
      if(!target)return;
      var stat=target.closest('.sc-stat');
      var statsEl=_touchStat.parentElement;
      if(!statsEl||!statsEl.classList.contains('sc-stats'))return;
      if(!stat||stat===_touchStat){
        if(statsEl.lastElementChild!==_touchStat)statsEl.appendChild(_touchStat);
        return;
      }
      var isCol=statsEl.closest('.ar-9-16');
      var rect=stat.getBoundingClientRect();
      var pos=isCol?t.clientY:t.clientX;
      var mid=isCol?rect.top+rect.height/2:rect.left+rect.width/2;
      if(pos<mid) statsEl.insertBefore(_touchStat,stat);
      else statsEl.insertBefore(_touchStat,stat.nextSibling);
    },{passive:false});
    pvWrap.addEventListener('touchend',function(e){
      if(!_touchStat)return;
      _touchStat.classList.remove('dragging');
      var statsEl=pvWrap.querySelector('.sc-stats');
      if(statsEl){
        var newOrder=[];
        statsEl.querySelectorAll('.sc-stat').forEach(function(el){
          var k=el.getAttribute('data-key');
          if(k)newOrder.push(k);
        });
          if(newOrder.length){
            var h=document.getElementById('sh-preview-order');
            if(h)h.value=newOrder.join(',');
          }
          _updateSharePreview();
        }
      _touchStat=null;
    },{passive:true});
    // Long-press on preview to generate image
    var _lpTimer=null;
    function _clearLP(){clearTimeout(_lpTimer);}
    function _startLP(){_clearLP();_lpTimer=setTimeout(function(){generateShareCard();},600);}
    pvWrap.addEventListener('mousedown',function(e){if(e.button!==0)return;_startLP();});
    pvWrap.addEventListener('mouseup',_clearLP);
    pvWrap.addEventListener('mouseleave',_clearLP);
    pvWrap.addEventListener('touchstart',_startLP,{passive:true});
    pvWrap.addEventListener('touchend',_clearLP);
    pvWrap.addEventListener('touchmove',_clearLP,{passive:true});
    pvWrap.addEventListener('contextmenu',function(e){e.preventDefault();});
  }
  console.log('[share] panel added, pv-wrap', !!ov.querySelector('.share-preview-wrap'));
  requestAnimationFrame(function(){
    console.log('[share] rAF _updateSharePreview');
    _updateSharePreview();
  });
}
function _toggleShareCb(el,e){
  if(e.target.tagName==='INPUT'){_updateSharePreview();return;}
  var cb=el.querySelector('input[type="checkbox"]');
  if(cb){cb.checked=!cb.checked;_updateSharePreview();}
}
function _shareCb(key,label,checked){
  return'<div class="share-opt" onclick="_toggleShareCb(this,event)">'
    +'<input type="checkbox" id="sh-'+key+'" '+(checked?'checked':'')+'>'
    +'<label>'+label+'</label></div>';
}
function _pickShareBg(el){
  el.parentElement.querySelectorAll('.share-bg-opt').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
  var bg=el.getAttribute('data-bg');
  var ci=document.getElementById('sh-bg-color'),oi=document.getElementById('sh-bg-opacity'),ol=document.getElementById('sh-opacity-label');
  if(bg==='dark'){ci&&(ci.value='#0b0c0f');oi&&(oi.value='100');}
  else if(bg==='light'){ci&&(ci.value='#f0f0f4');oi&&(oi.value='100');}
  else if(bg==='transparent'){ci&&(ci.value='#0b0c0f');oi&&(oi.value='0');}
  if(ol&&oi)ol.textContent=oi.value+'%';
  _syncSwatches();
}
function _onCustomBg(el){
  document.querySelectorAll('.share-bg-opt').forEach(function(e){e.classList.remove('active');});
  document.querySelectorAll('.share-swatch').forEach(function(e){e.classList.remove('active');});
  var rb=document.querySelector('.share-swatch-rainbow');
  if(rb)rb.classList.add('active');
  var oi=document.getElementById('sh-bg-opacity'),ol=document.getElementById('sh-opacity-label');
  if(ol&&oi)ol.textContent=oi.value+'%';
  if(oi&&parseInt(oi.value)===0){
    var t=document.querySelector('.share-bg-opt[data-bg="transparent"]');
    if(t){_pickShareBg(t);return;}
  }
    _updateSharePreview();
}
function _toggleColorPopup(e){
  e.stopPropagation();
  var p=document.getElementById('sh-color-popup');
  if(!p)return;
  var isOpen=p.classList.contains('show');
  _closeColorPopup();
  _closeTCPopup();
  if(!isOpen){
    p.classList.add('show');
    window._cpCleanup=_initColorPicker('sh-color-spectrum','sh-color-brightness','sh-color-current','sh-color-hex','sh-color-zoom','sh-bg-color',function(c){_onCustomBg(document.getElementById('sh-bg-color'));});
    _renderSavedColors();
    setTimeout(function(){document.addEventListener('click',_closeColorPopup);},0);
  }
}
function _closeColorPopup(){
  var p=document.getElementById('sh-color-popup');
  if(p)p.classList.remove('show');
  if(window._cpCleanup){window._cpCleanup();window._cpCleanup=null;}
  document.removeEventListener('click',_closeColorPopup);
}
function _toggleTCPopup(e){
  e.stopPropagation();
  var p=document.getElementById('sh-tc-popup');
  if(!p)return;
  var isOpen=p.classList.contains('show');
  _closeTCPopup();
  _closeColorPopup();
  if(!isOpen){
    p.classList.add('show');
    window._tcCleanup=_initColorPicker('sh-tc-spectrum','sh-tc-brightness','sh-tc-current','sh-tc-hex','sh-tc-zoom','sh-text-color',function(c){_onCustomTC(document.getElementById('sh-text-color'));});
    _renderSavedTextColors();
    setTimeout(function(){document.addEventListener('click',_closeTCPopup);},0);
  }
}
function _closeTCPopup(){
  var p=document.getElementById('sh-tc-popup');
  if(p)p.classList.remove('show');
  if(window._tcCleanup){window._tcCleanup();window._tcCleanup=null;}
  document.removeEventListener('click',_closeTCPopup);
}
function _hslToHex(h,s,l){
  h/=360;s/=100;l/=100;
  var a=s*Math.min(l,1-l);
  var f=function(n){var k=(n+h*12)%12;return l-a*Math.max(Math.min(k-3,9-k,1),-1);};
  var toHex=function(x){return Math.round(Math.min(255,Math.max(0,x*255))).toString(16).padStart(2,'0');};
  return '#'+toHex(f(0))+toHex(f(8))+toHex(f(4));
}
function _hexToHsl(hex){
  var r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
  var mx=Math.max(r,g,b),mn=Math.min(r,g,b),h,s,l=(mx+mn)/2;
  if(mx===mn){h=s=0;}
  else{var d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);if(mx===r)h=((g-b)/d+(g<b?6:0))/6;else if(mx===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;}
  return {h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)};
}
function _initColorPicker(spectrumId,brightnessId,currentId,hexId,zoomId,inputId,onChange){
  var spec=document.getElementById(spectrumId),bri=document.getElementById(brightnessId),cur=document.getElementById(currentId),hex=document.getElementById(hexId),zoom=document.getElementById(zoomId),inp=document.getElementById(inputId);
  if(!spec)return function(){};
  var stops=[];
  for(var i=0;i<=360;i+=10)stops.push('hsl('+i+',100%,50%)');
  spec.style.background='linear-gradient(to right,'+stops.join(',')+')';
  var currentHue=0,currentLevel=50;
  if(inp&&inp.value){
    var hsl=_hexToHsl(inp.value);
    currentHue=hsl.h;currentLevel=hsl.l;
  }
  if(bri)bri.style.background='linear-gradient(to right,#000,hsl('+currentHue+',100%,50%))';
  var dragging=null;
  function _getHue(el,clientX){
    var r=el.getBoundingClientRect();
    return Math.round(Math.max(0,Math.min(1,(clientX-r.left)/r.width))*360);
  }
  function _getLevel(el,clientX){
    var r=el.getBoundingClientRect();
    return Math.round(Math.max(0,Math.min(1,(clientX-r.left)/r.width))*50);
  }
  function _update(hue,level,fromSpec){
    currentHue=hue;currentLevel=level;
    var color=_hslToHex(hue,100,level);
    if(cur)cur.style.background=color;
    if(hex)hex.textContent=color;
    if(inp)inp.value=color;
    if(fromSpec&&bri)bri.style.background='linear-gradient(to right,#000,'+color+')';
    if(onChange)onChange(color);
  }
  function _showZoom(clientX,clientY,color){
    if(!zoom)return;
    zoom.style.display='block';
    var zs=zoom.offsetWidth||40;
    zoom.style.left=(clientX-zs/2)+'px';
    zoom.style.top=(clientY-40-zs/2)+'px';
    zoom.style.background=color;
    zoom.style.borderColor='rgba(255,255,255,.8)';
  }
  function _hideZoom(){if(zoom)zoom.style.display='none';}
  function _down(e,isSpec){
    var pt=e.touches?{x:e.touches[0].clientX,y:e.touches[0].clientY}:{x:e.clientX,y:e.clientY};
    var el=isSpec?spec:bri;if(!el)return;
    dragging=isSpec?'spec':'bri';
    var h=_getHue(el,pt.x),l=_getLevel(el,pt.x);
    if(isSpec){currentHue=h;currentLevel=50;}else currentLevel=l;
    _update(currentHue,currentLevel,isSpec);
    _showZoom(pt.x,pt.y,_hslToHex(currentHue,100,currentLevel));
    e.preventDefault();
  }
  function _move(e){
    if(!dragging)return;
    var pt=e.touches?{x:e.touches[0].clientX,y:e.touches[0].clientY}:{x:e.clientX,y:e.clientY};
    var el=dragging==='spec'?spec:bri;if(!el)return;
    var h=_getHue(el,pt.x),l=_getLevel(el,pt.x);
    if(dragging==='spec'){currentHue=h;currentLevel=50;}else currentLevel=l;
    _update(currentHue,currentLevel,dragging==='spec');
    _showZoom(pt.x,pt.y,_hslToHex(currentHue,100,currentLevel));
    e.preventDefault();
  }
  function _up(e){
    if(!dragging)return;
    _hideZoom();dragging=null;e.preventDefault();
  }
  function _pickAt(e,isSpec){
    var el=isSpec?spec:bri;if(!el)return;
    var pt={x:e.clientX||(e.touches?e.touches[0].clientX:0),y:e.clientY||(e.touches?e.touches[0].clientY:0)};
    if(!pt.x)return;
    var h=_getHue(el,pt.x),l=_getLevel(el,pt.x);
    if(isSpec){currentHue=h;currentLevel=50;}else currentLevel=l;
    _update(currentHue,currentLevel,isSpec);
    _showZoom(pt.x,pt.y,_hslToHex(currentHue,100,currentLevel));
  }
  var _mm=_move,_mu=_up;
  spec.addEventListener('mousedown',function(e){_down(e,true);});
  if(bri)bri.addEventListener('mousedown',function(e){_down(e,false);});
  spec.addEventListener('click',function(e){e.stopPropagation();_pickAt(e,true);});
  if(bri)bri.addEventListener('click',function(e){e.stopPropagation();_pickAt(e,false);});
  spec.addEventListener('touchstart',function(e){_down(e,true);});
  if(bri)bri.addEventListener('touchstart',function(e){_down(e,false);});
  document.addEventListener('mousemove',_mm);
  document.addEventListener('mouseup',_mu);
  document.addEventListener('touchmove',_mm,{passive:false});
  document.addEventListener('touchend',_mu);
  _update(currentHue,currentLevel,true);
  return function(){
    document.removeEventListener('mousemove',_mm);
    document.removeEventListener('mouseup',_mu);
    document.removeEventListener('touchmove',_mm);
    document.removeEventListener('touchend',_mu);
  };
}
function _saveCurrentColor(){
  var ci=document.getElementById('sh-bg-color');
  if(!ci)return;
  var c=ci.value;
  var presets;
  try{presets=JSON.parse(localStorage.getItem('garminCustomPresets')||'[]');}catch(e){presets=[];}
  if(presets.some(function(p){return p.color===c;})){return;}
  var name='Color '+(presets.length+1);
  presets.push({name:name,color:c});
  try{localStorage.setItem('garminCustomPresets',JSON.stringify(presets));}catch(e){}
  _renderSavedColors();
}
function _saveCurrentTextColor(){
  var ci=document.getElementById('sh-text-color');
  if(!ci)return;
  var c=ci.value;
  var presets;
  try{presets=JSON.parse(localStorage.getItem('garminTextPresets')||'[]');}catch(e){presets=[];}
  if(presets.some(function(p){return p.color===c;})){return;}
  var name='Color '+(presets.length+1);
  presets.push({name:name,color:c});
  try{localStorage.setItem('garminTextPresets',JSON.stringify(presets));}catch(e){}
  _renderSavedTextColors();
}
function _renderSavedColors(){
  var row=document.getElementById('sh-saved-colors-row');
  if(!row)return;
  var presets;
  try{presets=JSON.parse(localStorage.getItem('garminCustomPresets')||'[]');}catch(e){presets=[];}
  row.innerHTML='';
  if(!presets.length){row.innerHTML='<div style="color:rgba(255,255,255,.3);font-size:9px;padding:4px 0">Sin guardados</div>';return;}
  presets.forEach(function(p,i){
    var w=document.createElement('div');
    w.style.cssText='position:relative;display:inline-block;margin:2px';
    var d=document.createElement('div');
    d.className='share-color-popup-cell';
    d.style.background=p.color;
    d.title=p.name;
    d.addEventListener('click',function(e){e.stopPropagation();var ci=document.getElementById('sh-bg-color');if(ci)ci.value=p.color;var oi=document.getElementById('sh-bg-opacity');var wasT=oi&&parseInt(oi.value)===0;_closeColorPopup();_onCustomBg(ci);if(!wasT){var rb=document.querySelector('.share-swatch-rainbow');if(rb)rb.classList.add('active');}});
    w.appendChild(d);
    var x=document.createElement('span');
    x.textContent='×';
    x.style.cssText='position:absolute;top:-4px;right:-4px;font-size:10px;color:#fff;background:#c00;border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;line-height:1';
    x.addEventListener('click',function(e){e.stopPropagation();_deleteSavedColor(i);});
    w.appendChild(x);
    row.appendChild(w);
  });
}
function _deleteSavedColor(idx){
  var presets;
  try{presets=JSON.parse(localStorage.getItem('garminCustomPresets')||'[]');}catch(e){presets=[];}
  presets.splice(idx,1);
  try{localStorage.setItem('garminCustomPresets',JSON.stringify(presets));}catch(e){}
  _renderSavedColors();
}
function _deleteSavedTextColor(idx){
  var presets;
  try{presets=JSON.parse(localStorage.getItem('garminTextPresets')||'[]');}catch(e){presets=[];}
  presets.splice(idx,1);
  try{localStorage.setItem('garminTextPresets',JSON.stringify(presets));}catch(e){}
  _renderSavedTextColors();
}
function _renderSavedTextColors(){
  var row=document.getElementById('sh-tc-saved-colors-row');
  if(!row)return;
  var presets;
  try{presets=JSON.parse(localStorage.getItem('garminTextPresets')||'[]');}catch(e){presets=[];}
  row.innerHTML='';
  if(!presets.length){row.innerHTML='<div style="color:rgba(255,255,255,.3);font-size:9px;padding:4px 0">Sin guardados</div>';return;}
  presets.forEach(function(p,i){
    var w=document.createElement('div');
    w.style.cssText='position:relative;display:inline-block;margin:2px';
    var d=document.createElement('div');
    d.className='share-color-popup-cell';
    d.style.background=p.color;
    d.title=p.name;
    d.addEventListener('click',function(e){e.stopPropagation();var ci=document.getElementById('sh-text-color');if(ci)ci.value=p.color;_closeTCPopup();_onCustomTC(ci);});
    w.appendChild(d);
    var x=document.createElement('span');
    x.textContent='×';
    x.style.cssText='position:absolute;top:-4px;right:-4px;font-size:10px;color:#fff;background:#c00;border-radius:50%;width:12px;height:12px;display:flex;align-items:center;justify-content:center;cursor:pointer;line-height:1';
    x.addEventListener('click',function(e){e.stopPropagation();_deleteSavedTextColor(i);});
    w.appendChild(x);
    row.appendChild(w);
  });
}
function _parseColorInput(val){
  val=val.trim();
  var m=val.match(/^#?([0-9a-f]{6})$/i);
  if(m) return '#'+m[1].toLowerCase();
  var m2=val.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if(m2){
    var r=Math.min(255,parseInt(m2[1])),g=Math.min(255,parseInt(m2[2])),b=Math.min(255,parseInt(m2[3]));
    return '#'+[r,g,b].map(function(v){return v.toString(16).padStart(2,'0');}).join('');
  }
  return null;
}
function _onHexSpanEdit(el,e){
  var c=_parseColorInput(el.textContent);
  if(!c)return;
  var ci=document.getElementById('sh-bg-color');
  if(ci)ci.value=c;
  _onCustomBg(ci);
}
function _onHexSpanBlur(el){
  var c=_parseColorInput(el.textContent);
  if(!c){var ci=document.getElementById('sh-bg-color');if(ci)el.textContent=ci.value;}
}
function _onTCHexSpanEdit(el,e){
  var c=_parseColorInput(el.textContent);
  if(!c)return;
  var ci=document.getElementById('sh-text-color');
  if(ci)ci.value=c;
  _onCustomTC(ci);
}
function _onTCHexSpanBlur(el){
  var c=_parseColorInput(el.textContent);
  if(!c){var ci=document.getElementById('sh-text-color');if(ci)el.textContent=ci.value;}
}
function _pickSwatch(el){
  document.querySelectorAll('.share-swatch').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
  document.querySelectorAll('.share-bg-opt').forEach(function(e){e.classList.remove('active');});
  var c=el.getAttribute('data-color');
  if(c){var ci=document.getElementById('sh-bg-color');if(ci)ci.value=c;}
  _updateSharePreview();
}
function _syncSwatches(){
  var ci=document.getElementById('sh-bg-color');
  var c=ci?ci.value:'';
  document.querySelectorAll('.share-swatch').forEach(function(e){
    e.classList.toggle('active',e.getAttribute('data-color')===c);
  });
}
function _pickTextColor(el){
  var isActive=el.classList.contains('active');
  if(isActive){
    document.querySelectorAll('.share-tc-opt,.share-tc-swatch').forEach(function(e){e.classList.remove('active');});
    var ci=document.getElementById('sh-text-color');
    if(ci)ci.value='';
    _updateSharePreview();
    return;
  }
  document.querySelectorAll('.share-tc-opt,.share-tc-swatch').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
  var tc=el.getAttribute('data-tc');
  if(tc&&tc!=='auto'){var ci=document.getElementById('sh-text-color');if(ci)ci.value=tc;}
  _updateSharePreview();
}
function _onCustomTC(el){
  document.querySelectorAll('.share-tc-opt,.share-tc-swatch').forEach(function(e){e.classList.remove('active');});
  var rb=document.querySelector('.share-tc-rainbow');
  if(rb)rb.classList.add('active');
  _updateSharePreview();
}
function _pickShareAr(el){
  el.parentElement.querySelectorAll('.share-ar-opt').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
}
function _pickShareAlignHeader(el){
  el.parentElement.querySelectorAll('.share-align-opt').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
}
function _pickShareAlignData(el){
  el.parentElement.querySelectorAll('.share-align-opt').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
}
function _pickShareModo(el){
  el.parentElement.querySelectorAll('.share-modo-opt').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
}
function _pickShareBarras(el){
  el.parentElement.querySelectorAll('.share-modo-opt').forEach(function(e){e.classList.remove('active');});
  el.classList.add('active');
}
function _shareEsc(e){if(e.key==='Escape')closeShareOpts();}
function saveShareOpts(){
  var ov=document.getElementById('share-overlay');
  if(!ov)return;
  var opts=_shareOptsFromDOM(ov);
  try{localStorage.setItem('garminShareOpts',JSON.stringify(opts));}catch(e){}
  var btn=ov.querySelector('.share-btn-save');
  if(btn){var t=btn.textContent,bg=btn.style.background;btn.textContent='✓ Guardado';btn.style.background='#1a3a2a';setTimeout(function(){btn.textContent=t;btn.style.background=bg;},1000);}
  if(typeof _toast==='function')_toast('✓ Ajustes guardados','ok');
}
function closeShareOpts(){
  document.removeEventListener('keydown',_shareEsc);
  var el=document.getElementById('share-overlay');
  if(el)document.body.removeChild(el);
  document.body.style.overflow=document.body._oldOverflow||'';
}
function _roundCanvas(canvas,r,cb){
  var c=document.createElement('canvas');
  c.width=canvas.width;c.height=canvas.height;
  var ctx=c.getContext('2d');
  ctx.beginPath();ctx.moveTo(r,0);ctx.lineTo(c.width-r,0);
  ctx.quadraticCurveTo(c.width,0,c.width,r);ctx.lineTo(c.width,c.height-r);
  ctx.quadraticCurveTo(c.width,c.height,c.width-r,c.height);ctx.lineTo(r,c.height);
  ctx.quadraticCurveTo(0,c.height,0,c.height-r);ctx.lineTo(0,r);
  ctx.quadraticCurveTo(0,0,r,0);ctx.closePath();ctx.clip();
  ctx.drawImage(canvas,0,0);
  c.toBlob(cb);
}
function generateShareCard(){
  var ov=document.getElementById('share-overlay');
  if(!ov)return;
  var opts=_shareOptsFromDOM(ov);
  try{localStorage.setItem('garminShareOpts',JSON.stringify(opts));}catch(e){}

  var btn=document.getElementById('btn-share');
  btn.textContent='Generando...';btn.disabled=true;
  var _done=function(){btn.textContent='Compartir';btn.disabled=false;if(typeof _actFabDone==='function')_actFabDone();};

  var data=window._lastParsedList&&window._lastParsedList[0];
  if(!data){_toast('No hay datos de actividad','error');_done();return;}

  var html=_buildShareCardHTML(opts,data);
  var card=document.createElement('div');
  card.innerHTML=html;
  card=card.firstElementChild;

  var isTransparent=opts.bg==='transparent';
  var captureBg=isTransparent?null:opts.bgColor;
  var wrapper=document.createElement('div');
  wrapper.style.cssText='position:absolute;top:0;left:0;opacity:0.01;pointer-events:none;z-index:-1;';
  wrapper.appendChild(card);
  document.body.appendChild(wrapper);

  requestAnimationFrame(function(){
    html2canvas(card,{
      backgroundColor:captureBg,
      scale:3,useCORS:true,logging:false,
      width:card.scrollWidth,height:card.scrollHeight,
      windowWidth:card.scrollWidth,windowHeight:card.scrollHeight,
      scrollX:0,scrollY:0,allowTaint:false,imageTimeout:0,letterRendering:true
    }).then(function(canvas){
      document.body.removeChild(wrapper);
      _roundCanvas(canvas,20*3,function(blob){
        if(!blob){_toast('Error generando imagen','error');_done();return;}
        _done();
        openIOSave(blob,null);
      },'image/png');
    }).catch(function(e){
      document.body.removeChild(wrapper);
      _toast('Error: '+e.message,'error');
      _done();
    });
  });
}
function copyShareCard(){
  var ov=document.getElementById('share-overlay');
  if(!ov)return;
  var opts=_shareOptsFromDOM(ov);
  try{localStorage.setItem('garminShareOpts',JSON.stringify(opts));}catch(e){}
  var data=window._lastParsedList&&window._lastParsedList[0];
  if(!data){_toast('No hay datos de actividad','error');return;}
  var html=_buildShareCardHTML(opts,data);
  var card=document.createElement('div');
  card.innerHTML=html;
  card=card.firstElementChild;
  var isTransparent=opts.bg==='transparent';
  var captureBg=isTransparent?null:opts.bgColor;
  var wrapper=document.createElement('div');
  wrapper.style.cssText='position:absolute;top:0;left:0;opacity:0.01;pointer-events:none;z-index:-1;';
  wrapper.appendChild(card);
  document.body.appendChild(wrapper);
  if(!(navigator.clipboard&&navigator.clipboard.write&&typeof ClipboardItem!=='undefined')){
    document.body.removeChild(wrapper);
    _toast('No se puede copiar al portapapeles','error');
    return;
  }
  var resolveFn;
  var blobPromise=new Promise(function(res){resolveFn=res;});
  navigator.clipboard.write([new ClipboardItem({'image/png':blobPromise})]).then(function(){
    _toast('✓ Imagen copiada al portapapeles','ok');
  }).catch(function(){
    _toast('Error al copiar','error');
  });
  requestAnimationFrame(function(){
    html2canvas(card,{
      backgroundColor:captureBg,
      scale:3,useCORS:true,logging:false,
      width:card.scrollWidth,height:card.scrollHeight,
      windowWidth:card.scrollWidth,windowHeight:card.scrollHeight,
      scrollX:0,scrollY:0,allowTaint:false,imageTimeout:0,letterRendering:true
    }).then(function(canvas){
      document.body.removeChild(wrapper);
      _roundCanvas(canvas,20*3,function(blob){
        if(blob) resolveFn(blob);
        else{_toast('Error generando imagen','error');}
      },'image/png');
    }).catch(function(e){
      document.body.removeChild(wrapper);
      _toast('Error: '+e.message,'error');
    });
  });
}

function clearCache(){
  var btn=document.getElementById('btn-cache');if(btn){btn.disabled=true;btn.textContent='⏳';}
  Promise.all([
    'caches' in window?caches.keys().then(function(n){return Promise.all(n.map(function(k){return caches.delete(k);}));}):Promise.resolve(),
    new Promise(function(r){if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(function(regs){regs.forEach(function(r){r.unregister();});}).then(r).catch(r);else r();})
  ]).then(function(){
    location.href=location.pathname+location.hash+'?v='+Date.now();
  });
}

/* ── LOAD .FIT or .ZIP FILE ── */
function loadFitOrZip(input) {
  var file = input.files[0];
  if (!file) return;
  var name = file.name.toLowerCase();
  if (name.endsWith('.zip')) {
    loadZip(file);
  } else {
    loadFit(input);
  }
}

function loadZip(file) {
  var errEl = document.getElementById('error-msg');
  errEl.style.display = 'none';
  if (typeof JSZip === 'undefined') {
    errEl.textContent = 'JSZip no cargada.'; errEl.style.display = 'block'; return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    JSZip.loadAsync(e.target.result).then(function(zip) {
      // Find the first .fit file inside
      var fitEntry = null;
      zip.forEach(function(relPath, entry) {
        if (!fitEntry && relPath.toLowerCase().endsWith('.fit')) fitEntry = entry;
      });
      if (!fitEntry) {
        errEl.textContent = 'No se encontró un archivo .fit dentro del .zip.';
        errEl.style.display = 'block'; return;
      }
      fitEntry.async('arraybuffer').then(function(buf) {
        if (typeof FitParser === 'undefined') {
          errEl.textContent = 'Librería FIT no cargada aún.'; errEl.style.display = 'block'; return;
        }
        try {
          var parser = new FitParser({ force: true, speedUnit: 'm/s', lengthUnit: 'm', temperatureUnit: 'celsius', elapsedRecordField: true, mode: 'list' });
          parser.parse(buf, function(error, fitData) {
            if (error) { errEl.textContent = 'Error .fit: ' + error; errEl.style.display = 'block'; return; }
            try {
              var json = fitToGarminJson(fitData, fitEntry.name);
              document.getElementById('json-input').value = JSON.stringify(json, null, 2);
              render();
            } catch(ex) { errEl.textContent = 'Error al convertir: ' + ex.message; errEl.style.display = 'block'; }
          });
        } catch(ex) { errEl.textContent = 'Error: ' + ex.message; errEl.style.display = 'block'; }
      });
    }).catch(function(ex) {
      errEl.textContent = 'Error al leer el .zip: ' + ex.message; errEl.style.display = 'block';
    });
  };
  reader.readAsArrayBuffer(file);
}

/* ── LOAD .FIT FILE ── */
function loadFit(input) {
  var file = input.files[0];
  input.value = '';
  if (!file) return;
  var errEl = document.getElementById('error-msg');
  errEl.style.display = 'none';

  if (typeof FitParser === 'undefined') {
    errEl.textContent = 'Librería FIT no cargada aún. Espera un momento y vuelve a intentarlo.';
    errEl.style.display = 'block'; return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var parser = new FitParser({
        force: true,
        speedUnit: 'm/s',
        lengthUnit: 'm',
        temperatureUnit: 'celsius',
        elapsedRecordField: true,
        mode: 'list'
      });
      parser.parse(e.target.result, function(error, fitData) {
        if (error) {
          errEl.textContent = 'Error al leer el .fit: ' + error;
          errEl.style.display = 'block'; return;
        }
        try {
          var json = fitToGarminJson(fitData, file.name);
          document.getElementById('json-input').value = JSON.stringify(json, null, 2);
          render();
        } catch(ex) {
          errEl.textContent = 'Error al convertir: ' + ex.message;
          errEl.style.display = 'block';
        }
      });
    } catch(ex) {
      errEl.textContent = 'Error: ' + ex.message;
      errEl.style.display = 'block';
    }
  };
  reader.readAsArrayBuffer(file);
}

function _fitVal(obj) {
  // fit-file-parser returns camelCase; also accept snake_case fallbacks
  function g(a, b) { return obj[a] !== undefined ? obj[a] : (obj[b] !== undefined ? obj[b] : 0); }
  return g;
}

function fitToGarminJson(fitData, filename) {
  var sessions = fitData.sessions || [];
  var laps     = fitData.laps     || [];
  var records  = fitData.records  || [];
  window.fitRecords = records;
  var workouts = fitData.workouts || [];
  var zonesRaw = fitData.zonesTarget || fitData.zones_target || [];
  var zonesArr = Array.isArray(zonesRaw) ? zonesRaw : (zonesRaw ? [zonesRaw] : []);
  var tizRaw = fitData.timeInZone || fitData.time_in_zone || [];
  var timeInZones = Array.isArray(tizRaw) ? tizRaw : (tizRaw ? [tizRaw] : []);
  var sessionTimeInZone = timeInZones.find(function(t){
    return (t.referenceMesg || t.reference_mesg) === 18 || (t.referenceMesg || t.reference_mesg) === 'session';
  }) || null;
  var lapTimeInZone = {};
  timeInZones.forEach(function(t){
    var ref = t.referenceMesg || t.reference_mesg;
    if (ref !== 19 && ref !== 'lap') return;
    var idx = t.referenceIndex !== undefined ? t.referenceIndex : t.reference_index;
    if (idx !== undefined && idx !== null) lapTimeInZone[idx] = t;
  });

  var session  = sessions[0]  || {};
  var zt       = zonesArr[0]  || {};
  var workout  = workouts[0]  || {};

  /* ── Activity name: prefer workout name → session sub_sport → filename ── */
  var wktName = workout.wktName || workout.wkt_name || '';
  var _ss = session.subSport || session.sub_sport; var subSport = _ss ? String(_ss).toLowerCase() : '';
  var _sp = session.sport    || session.activity_type; var sport = _sp ? String(_sp).toLowerCase() : '';
  var activityName = wktName || (filename ? filename.replace(/\.fit$/i,'').replace(/_/g,' ') : 'Actividad .fit');

  /* ── Start time → "DD Mes" ── */
  var MESES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  var startRaw = session.localTimestamp || session.local_timestamp || session.startTime || session.start_time || '';
  var fechaFmt = '';
  if (startRaw) {
    var d = (startRaw instanceof Date) ? startRaw : new Date(String(startRaw).replace(' ','T'));
    if (!isNaN(d.getTime())) {
      fechaFmt = d.getDate() + ' ' + MESES[d.getMonth()+1];
    }
  }

  /* ── Activity type ── */
  var activityType = subSport === 'treadmill'      ? 'treadmill_running'
                   : subSport === 'trail'           ? 'trail_running'
                   : subSport === 'indoor_cycling'  ? 'indoor_cycling'
                   : subSport === 'mountain'        ? 'mountain_biking'
                   : subSport === 'road'&&sport==='cycling' ? 'cycling'
                   : sport    === 'running'         ? 'running'
                   : sport    === 'cycling'         ? 'cycling'
                   : (String(session.sport||'')==='81'||sport==='motorcycling'||subSport==='motocross'||subSport==='motorsport'||subSport==='atv') ? 'motorcycling'
                   : 'running';

  /* ── HR zone boundaries ── */
  var bounds;
  var customZones = false;
  var customZonesData = null;
  var workoutSteps = [];
  ['workoutSteps','workout_steps','workoutStep','workout_step'].forEach(function(k){
    var v = fitData[k];
    if (!v) return;
    if (Array.isArray(v)) workoutSteps = workoutSteps.concat(v);
    else workoutSteps.push(v);
  });
  function _calcIs(val, num, name) {
    return val === num || String(val).toLowerCase() === name;
  }
  function _median(vals) {
    vals = vals.filter(function(v){return isFinite(v)&&v>60&&v<240;}).sort(function(a,b){return a-b;});
    return vals.length ? vals[Math.floor(vals.length/2)] : 0;
  }
  function _stepNum(step, a, b) {
    var v = step[a] !== undefined ? step[a] : step[b];
    v = parseFloat(v);
    return isNaN(v) ? 0 : v;
  }
  function _baseFromWorkoutTargets(pcts, rest) {
    var vals = [];
    workoutSteps.forEach(function(step){
      var zn = _stepNum(step, 'targetHrZone', 'target_hr_zone');
      if (zn < 1 || zn > 5) return;
      var low = _stepNum(step, 'customTargetHeartRateLow', 'custom_target_heart_rate_low');
      var high = _stepNum(step, 'customTargetHeartRateHigh', 'custom_target_heart_rate_high');
      if (low > 50 && pcts[zn-1]) vals.push(rest ? (low-rest)/pcts[zn-1] : low/pcts[zn-1]);
      if (high > 50 && zn < 5 && pcts[zn]) vals.push(rest ? (high-rest)/pcts[zn] : high/pcts[zn]);
    });
    return _median(vals);
  }
  if (window.customHRZonesActive && window.customHRZones && window.customHRZones.length === 5) {
    customZones = true;
    customZonesData = window.customHRZones;
  } else {
    var hrCalcType = zt.hrCalcType !== undefined ? zt.hrCalcType : (zt.hr_calc_type !== undefined ? zt.hr_calc_type : 1);
    var maxHR = zt.maxHeartRate || zt.max_heart_rate || session.maxHeartRate || session.max_heart_rate || 190;
    var threshHR = zt.thresholdHeartRate || zt.threshold_heart_rate || 0;
    var restHR = session.restingHeartRate || session.resting_heart_rate || 0;
    var tizBounds = sessionTimeInZone && (sessionTimeInZone.hrZoneHighBoundary || sessionTimeInZone.hr_zone_high_boundary);
    if (tizBounds && tizBounds.length >= 5) {
      /* FIT time_in_zone is the authoritative source Garmin Connect uses for this activity. */
      bounds = tizBounds.slice(0, 5).map(function(v){ return Math.round(v); });
    } else if (_calcIs(hrCalcType, 3, 'percent_lt') && threshHR > 0) {
      /* Garmin's fixed zone splits: 58/68/80/91/102% of LT HR */
      var ltPcts = [0.58, 0.68, 0.80, 0.91, 1.02];
      var inferredLT = _baseFromWorkoutTargets(ltPcts, 0);
      if (inferredLT) threshHR = inferredLT;
      bounds = ltPcts.map(function(p){ return Math.round(threshHR * p); });
    } else if (_calcIs(hrCalcType, 2, 'percent_hrr') && restHR > 0 && maxHR > restHR) {
      /* percent_hrr: Karvonen — zones as % of heart rate reserve */
      var hrrPcts = [0.50, 0.60, 0.70, 0.80, 0.90];
      var hrr = _baseFromWorkoutTargets(hrrPcts, restHR) || (maxHR - restHR);
      bounds = hrrPcts.map(function(p){ return Math.round(restHR + hrr * p); });
    } else {
      /* percent_max_hr (default, also handles calc_type 0 custom fallback) */
      var maxPcts = [0.50, 0.60, 0.70, 0.80, 0.90];
      maxHR = _baseFromWorkoutTargets(maxPcts, 0) || maxHR;
      bounds = maxPcts.map(function(p){ return Math.round(maxHR * p); });
    }
  }

  /* ── Compute HR zones from per-second records ── */
  function zoneIndexForHR(hr) {
    if (!hr) return -1;
    if (customZones) {
      for (var zi = 0; zi < 5; zi++) {
        if (hr >= customZonesData[zi].min && hr <= customZonesData[zi].max) return zi;
      }
      return -1;
    }
    for (var zj = 4; zj >= 0; zj--) { if (hr >= bounds[zj]) return zj; }
    return 0;
  }
  function zoneRowsFromSecs(secsArr) {
    return secsArr.map(function(secs, i) {
      var lowBound = customZones ? customZonesData[i].min : bounds[i];
      return { zoneNumber: i+1, secsInZone: secs, zoneLowBoundary: lowBound };
    });
  }
  var zoneSecs = [0,0,0,0,0];
  var tizSessionTimes = sessionTimeInZone && (sessionTimeInZone.timeInHrZone || sessionTimeInZone.time_in_hr_zone);
  if (!customZones && tizSessionTimes && tizSessionTimes.length >= 6) {
    zoneSecs = tizSessionTimes.slice(1, 6).map(function(v){ return Math.round(v || 0); });
  } else {
    records.forEach(function(r) {
      var hr = r.heartRate || r.heart_rate || 0;
      var z = zoneIndexForHR(hr);
      if (z >= 0) zoneSecs[z]++;
    });
  }

  var hr_time_in_zones = zoneRowsFromSecs(zoneSecs);

  function toMs(v) {
    if (!v) return 0;
    if (v instanceof Date) return v.getTime();
    if (typeof v === 'number') return v > 100000000000 ? v : v * 1000;
    var d = new Date(String(v).replace(' ','T'));
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  var recordPoints = records.map(function(r){
    return { t: toMs(r.timestamp || r.startTime || r.start_time), hr: r.heartRate || r.heart_rate || 0 };
  }).filter(function(r){ return r.t && r.hr; }).sort(function(a,b){ return a.t-b.t; });
  var trackPoints = records.map(function(r){
    var lat = r.position_lat !== undefined ? r.position_lat : (r.positionLat !== undefined ? r.positionLat : null);
    var lng = r.position_long !== undefined ? r.position_long : (r.positionLong !== undefined ? r.positionLong : null);
    if (lat === null || lng === null) return null;
    return { lat: parseFloat(lat), lng: parseFloat(lng) };
  }).filter(function(p){ return p !== null; });
  if (trackPoints.length > 500) {
    var step = Math.ceil(trackPoints.length / 500);
    trackPoints = trackPoints.filter(function(_, i){ return i % step === 0; });
  }
  function lapHrZones(lap, nextLap, lapIndex) {
    var tizLap = lapTimeInZone[lapIndex];
    var tizLapTimes = tizLap && (tizLap.timeInHrZone || tizLap.time_in_hr_zone);
    if (!customZones && tizLapTimes && tizLapTimes.length >= 6) {
      return zoneRowsFromSecs(tizLapTimes.slice(1, 6).map(function(v){ return Math.round(v || 0); }));
    }
    var startMs = toMs(lap.startTime || lap.start_time || lap.timestamp);
    var endMs = nextLap ? toMs(nextLap.startTime || nextLap.start_time || nextLap.timestamp) : 0;
    var dur = lap.total_elapsed_time || lap.totalElapsedTime || lap.total_timer_time || lap.totalTimerTime || 0;
    if (!endMs && startMs && dur) endMs = startMs + dur * 1000;
    var secs = [0,0,0,0,0];
    if (!startMs || !endMs || endMs <= startMs) return zoneRowsFromSecs(secs);
    recordPoints.forEach(function(r){
      if (r.t < startMs || r.t >= endMs) return;
      var z = zoneIndexForHR(r.hr);
      if (z >= 0) secs[z]++;
    });
    return zoneRowsFromSecs(secs);
  }

  /* ── Convert laps to raw Garmin API format ── */
  var intensityMap = { warmup: 'WARMUP', active: 'ACTIVE', rest: 'REST', recovery: 'RECOVERY', cooldown: 'COOLDOWN', '0': 'ACTIVE', '1': 'REST', '2': 'WARMUP', '3': 'COOLDOWN', '4': 'RECOVERY' };
  var rawLaps = laps.map(function(lap, i) {
    var intensity = (lap.intensity || lap.intensityType || 'active').toString().toLowerCase();

    /* FIT stores half-cadence (one foot). Multiply by 2 for total spm. */
    var cadHalf = lap.avg_cadence || lap.avgRunningCadence || lap.avg_running_cadence || 0;
    var cadFrac = lap.avg_fractional_cadence || lap.avgFractionalCadence || 0;
    var fullCad = cadHalf * 2 + cadFrac * 2;

    var dist = lap.total_distance || lap.totalDistance || 0;
    var dur  = lap.total_elapsed_time || lap.totalElapsedTime || lap.total_timer_time || lap.totalTimerTime || 0;
    var spd  = lap.enhanced_avg_speed || lap.enhancedAvgSpeed || lap.avg_speed || lap.avgSpeed || (dist > 0 && dur > 0 ? dist/dur : 0);
    var wktIdx = lap.wktStepIndex !== undefined ? lap.wktStepIndex : (lap.wkt_step_index !== undefined ? lap.wkt_step_index : null);

    var maxSpd = lap.enhanced_max_speed || lap.enhancedMaxSpeed || lap.max_speed || lap.maxSpeed || 0;
    return {
      distance: dist,
      duration: dur,
      movingDuration: lap.totalMovingTime || lap.total_moving_time || 0,
      averageSpeed: spd,
      averageMovingSpeed: spd,
      averageHR: lap.avg_heart_rate || lap.avgHeartRate || 0,
      maxHR: lap.max_heart_rate || lap.maxHeartRate || 0,
      averageRunCadence: fullCad,
      maxSpeed: maxSpd,
      avgPower: lap.avg_power || lap.avgPower || 0,
      elevationGain: lap.totalAscent  || lap.total_ascent  || 0,
      elevationLoss: lap.totalDescent || lap.total_descent || 0,
      intensityType: intensityMap[intensity] || 'ACTIVE',
      wktStepIndex: wktIdx,
      lapIndex: i + 1,
      hrTimeInZone: lapHrZones(lap, laps[i+1], i)
    };
  });

  var totalDist = session.total_distance || session.totalDistance || rawLaps.reduce(function(a,l){return a+l.distance;},0);

  /* ── Build start_time_local in ISO format that fromRawGarmin can parse ── */
  var startISO = '';
  if (startRaw) {
    var d2 = (startRaw instanceof Date) ? startRaw : new Date(String(startRaw).replace(' ','T'));
    if (!isNaN(d2.getTime())) {
      var mm = d2.getMonth()+1, dd = d2.getDate();
      startISO = d2.getFullYear()+'-'+(mm<10?'0':'')+mm+'-'+(dd<10?'0':'')+dd+'T'+(d2.getHours()<10?'0':'')+d2.getHours()+':00:00';
    }
  }

  return {
    activity_id: 'fit_' + Date.now(),
    activity_name: activityName,
    activity_type: activityType,
    start_time_local: startISO,
    summary: {
      distance: totalDist,
      duration: session.totalElapsedTime || session.total_elapsed_time || 0,
      averageHR: session.avg_heart_rate || session.avgHeartRate || 0,
      maxHR: session.max_heart_rate || session.maxHeartRate || 0,
      averageSpeed: session.enhanced_avg_speed || session.enhancedAvgSpeed || session.avg_speed || 0,
      calories: session.total_calories || session.totalCalories || 0
    },
    laps: rawLaps,
    hr_time_in_zones: hr_time_in_zones,
    track: trackPoints.length > 2 ? trackPoints : null
  };
}

function togglePrompt(){
  var b=document.getElementById('prompt-body'),a=document.getElementById('toggle-arrow');
  if(!b)return;
  var open=b.style.display==='none'||b.style.display==='';
  b.style.display=open?'block':'none';
  a.textContent=open?'▼':'▶';
  a.classList.toggle('open',open);
}

function copyPrompt(){
  var text=document.getElementById('prompt-box').innerText;
  var btn=document.querySelector('.btn-copy');
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){
      btn.textContent='✓ Copiado';
      setTimeout(function(){btn.textContent='Copiar';},2000);
    }).catch(function(){
      btn.textContent='Error';
      setTimeout(function(){btn.textContent='Copiar';},2000);
    });
  } else {
    btn.textContent='No disponible';
  }
}

/* ── CUSTOM HR ZONES ── */
window.customHRZones = null;
window.customHRZonesActive = false;

function openHRZonesConfig() {
  var content = document.getElementById('hr-zones-content');
  if (content.style.display === 'none' || content.style.display === '') {
    content.style.display = 'block';
    toggleHRMethod();
  } else {
    content.style.display = 'none';
  }
}

function toggleHRZones() {
  if (!window.customHRZones) {
    if (localStorage.getItem('customHRZones')) {
      applyHRZones();
      _updateZonesBtn();
    } else {
      _toast('Primero configura las zonas con ⚙ Configurar', 'info');
    }
    return;
  }
  var wasActive = window.customHRZonesActive;
  window.customHRZonesActive = !wasActive;
  _updateZonesBtn();
  var json = document.getElementById('json-input').value.trim();
  if (wasActive && window._originalJson) {
    document.getElementById('json-input').value = window._originalJson;
    window._originalJson = null;
    if (json) render();
  } else if (!wasActive && json) {
    if (window.customHRZones) window.customHRZones = _closeZoneGaps(window.customHRZones);
    recomputeHRZonesFromRecords();
    render();
  }
  _toast(window.customHRZonesActive ? 'Zonas FC activadas' : 'Zonas FC desactivadas', 'info');
}

function _updateZonesBtn() {
  var wrap = document.querySelector('.ab-zones-split');
  if (wrap) wrap.classList.toggle('zones-on', !!(window.customHRZonesActive && window.customHRZones));
}

function toggleHRMethod() {
  var method = document.getElementById('hr-method').value;
  document.getElementById('hr-manual-input').style.display = method === 'manual' ? 'block' : 'none';
  document.getElementById('hr-lactate-input').style.display = method === 'lactate' ? 'block' : 'none';
  document.getElementById('hr-maxhr-input').style.display = method === 'maxhr' ? 'block' : 'none';
  document.getElementById('hr-fcr-input').style.display = method === 'fcr' ? 'block' : 'none';
}

function updateZoneRanges() {
  if (!window.customHRZones) return;
  var zoneNames = ['Zona 1 · Calentamiento', 'Zona 2 · Suave', 'Zona 3 · Aeróbica', 'Zona 4 · Umbral', 'Zona 5 · Máximo'];
  window.customHRZones.forEach(function(z, i) {
    var rango = (i === 0 ? 0 : z.min) + '-' + z.max + ' ppm';
    _zonaRangos[zoneNames[i]] = rango;
  });
}

function saveZones() {
  var check = document.getElementById('hr-save-check');
  if (window.customHRZones && check && check.checked) {
    localStorage.setItem('customHRZones', JSON.stringify(window.customHRZones));
    localStorage.setItem('hr-method', document.getElementById('hr-method').value);
    if (document.getElementById('hr-lactate-value').value) localStorage.setItem('hr-lactate-value', document.getElementById('hr-lactate-value').value);
    if (document.getElementById('hr-maxhr-value').value) localStorage.setItem('hr-maxhr-value', document.getElementById('hr-maxhr-value').value);
    if (document.getElementById('hr-fcr-max').value) localStorage.setItem('hr-fcr-max', document.getElementById('hr-fcr-max').value);
    if (document.getElementById('hr-fcr-rest').value) localStorage.setItem('hr-fcr-rest', document.getElementById('hr-fcr-rest').value);
    if (document.getElementById('hr-zones-input').value) localStorage.setItem('hr-zones-input', document.getElementById('hr-zones-input').value);
  } else {
    localStorage.removeItem('customHRZones');
  }
}

function loadZones() {
  var saved = localStorage.getItem('customHRZones');
  var check = document.getElementById('hr-save-check');
  if (saved) {
    try {
      // Restore zones directly from saved JSON so customHRZonesActive=true is guaranteed
      // even if applyHRZones() hits an early-return path (e.g. empty input field).
      var _pz=JSON.parse(saved);
      if(_pz&&Array.isArray(_pz)&&_pz.length===5){window.customHRZones=_pz;window.customHRZonesActive=true;}
      else{window.customHRZones=null;window.customHRZonesActive=false;}
      var method = localStorage.getItem('hr-method') || 'lactate';
      document.getElementById('hr-method').value = method;
      toggleHRMethod();
      if (method === 'lactate') {
        var lactate = localStorage.getItem('hr-lactate-value');
        if (lactate) document.getElementById('hr-lactate-value').value = lactate;
      } else if (method === 'maxhr') {
        var maxhr = localStorage.getItem('hr-maxhr-value');
        if (maxhr) document.getElementById('hr-maxhr-value').value = maxhr;
      } else if (method === 'fcr') {
        var fcrMax = localStorage.getItem('hr-fcr-max');
        var fcrRest = localStorage.getItem('hr-fcr-rest');
        if (fcrMax) document.getElementById('hr-fcr-max').value = fcrMax;
        if (fcrRest) document.getElementById('hr-fcr-rest').value = fcrRest;
      } else if (method === 'manual') {
        var input = localStorage.getItem('hr-zones-input');
        if (input) document.getElementById('hr-zones-input').value = input;
      }
      if (check) check.checked = true;
      applyHRZones(); // auto-activate saved zones on page load
    } catch(e) {}
  } else {
    window.customHRZones = null;
    window.customHRZonesActive = false;
    if (check) check.checked = false;
  }
}

function onHrSaveCheckChange() {
  var check = document.getElementById('hr-save-check');
  if (!check.checked) {
    localStorage.removeItem('customHRZones');
    window.customHRZones = null;
    window.customHRZonesActive = false;
  }
}

function _closeZoneGaps(zones){
  for(var i=0;i<4;i++)if(zones[i].max<zones[i+1].min-1)zones[i].max=zones[i+1].min-1;
  return zones;
}
function _redistributeByOverlap(oldZones, newZonesData){
  var result=[0,0,0,0,0];
  oldZones.forEach(function(oldZ, zi){
    var lo=zi===0?0:oldZ.zoneLowBoundary;
    var hi=zi<4?(oldZones[zi+1].zoneLowBoundary-1):250;
    var sec=oldZ.secsInZone||0;
    if(!sec)return;
    var oW=hi-lo+1;
    if(oW<=0)return;
    for(var cj=0;cj<5;cj++){
      var cLo=cj===0?0:newZonesData[cj].min;
      var cHi=cj===4?250:newZonesData[cj].max;
      var ovLo=Math.max(lo,cLo);
      var ovHi=Math.min(hi,cHi);
      if(ovLo<=ovHi)result[cj]+=sec*((ovHi-ovLo+1)/oW);
    }
  });
  return result.map(function(secs,i){
    return{zoneNumber:i+1,secsInZone:Math.round(secs),zoneLowBoundary:newZonesData[i].min};
  });
}
function recomputeHRZonesFromRecords() {
  if (!window.customHRZonesActive || !window.customHRZones || window.customHRZones.length !== 5) return false;
  var customZonesData = window.customHRZones;
  var jsonText = document.getElementById('json-input').value.trim();
  if (jsonText) {
    try {
      var obj = JSON.parse(jsonText);
      if(!window._originalJson)window._originalJson=JSON.stringify(obj);
      var zoneNames = ['Zona 1 · Calentamiento', 'Zona 2 · Suave', 'Zona 3 · Aeróbica', 'Zona 4 · Umbral', 'Zona 5 · Máximo'];
      var zoneColors = ['#a0a0a0', '#4a90e2', '#27ae60', '#f39c12', '#e74c3c'];
      var existingTimes = obj.hr_time_in_zones || [];
      if (window.fitRecords) {
        var records = window.fitRecords;
        var zoneSecs = [0,0,0,0,0];
        records.forEach(function(r) {
          var hr = r.heartRate || r.heart_rate || 0;
          if (!hr) return;
          for (var i = 0; i < 5; i++) {
            var zMin = i === 0 ? 0 : customZonesData[i].min;
            if (hr >= zMin && hr <= customZonesData[i].max) {
              zoneSecs[i]++;
              break;
            }
          }
        });
        existingTimes = zoneSecs.map(function(secs, i) {
          return { zoneNumber: i+1, secsInZone: secs, zoneLowBoundary: customZonesData[i].min };
        });
      } else if (existingTimes.length === 5) {
        var srcTimes = existingTimes;
        if(window._originalJson){
          try{var orig=JSON.parse(window._originalJson);if(orig.hr_time_in_zones&&orig.hr_time_in_zones.length===5)srcTimes=orig.hr_time_in_zones;}catch(e){}
        }
        existingTimes = _redistributeByOverlap(srcTimes, customZonesData);
      }
      obj.hr_time_in_zones = existingTimes;
      obj.zonas = zoneNames.map(function(name, i) {
        var min = i === 0 ? 0 : customZonesData[i].min;
        var max = customZonesData[i].max;
        var rango = min + '-' + max + ' ppm';
        _zonaRangos[name] = rango;
        var secs = (existingTimes[i] && existingTimes[i].secsInZone) ? existingTimes[i].secsInZone : 0;
        return { nombre: name, secs: secs, rango: rango, color: zoneColors[i] };
      });
      if (obj.laps && Array.isArray(obj.laps)) {
        var origLapsData = null;
        if(window._originalJson){
          try{var orig=JSON.parse(window._originalJson);origLapsData=orig.laps;}catch(e){}
        }
        obj.laps.forEach(function(lap,li) {
          var srcLap = (origLapsData&&origLapsData[li])||lap;
          var origLapZones = srcLap.hrTimeInZone || srcLap.hr_time_in_zones || null;
          if (origLapZones && Array.isArray(origLapZones) && origLapZones.length>0) {
            lap.hrTimeInZone = _redistributeByOverlap(origLapZones, customZonesData);
          } else if (lap.averageHR>0 && lap.duration>0) {
            var zn = 0;
            for(var zi=0;zi<5;zi++){if(lap.averageHR>=customZonesData[zi].min&&lap.averageHR<=customZonesData[zi].max){zn=zi+1;break;}}
            if(zn)lap.hrTimeInZone=[{zoneNumber:zn,secsInZone:Math.round(lap.duration),zoneLowBoundary:customZonesData[zn-1].min}];
          }
          delete lap.zonas_lap;
          delete lap.hr_time_in_zones;
        });
      }
      document.getElementById('json-input').value = JSON.stringify(obj, null, 2);
      return true;
    } catch(e){console.warn('recomputeHRZonesFromRecords:',e);}
  }
  return false;
}

function applyHRZones() {
  var method = document.getElementById('hr-method').value;
  if (method === 'manual') {
    var input = document.getElementById('hr-zones-input').value.trim();
    if (!input) {
      window.customHRZones = null;
      window.customHRZonesActive = false;
      return;
    }
    var lines = input.split('\n');
    if (lines.length !== 5) {
      _toast('Debes ingresar exactamente 5 líneas (una por zona).', 'error');
      return;
    }
    var zones = [];
    for (var i = 0; i < 5; i++) {
      var parts = lines[i].split(',').map(function(p){ return parseFloat(p.trim()); });
      if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1]) || parts[0] >= parts[1]) {
        _toast('Línea ' + (i+1) + ': formato "min,max" con min < max (ej: 104,120).', 'error');
        return;
      }
      zones.push({min: parts[0], max: parts[1]});
    }
    zones[0].min = 0;
    window.customHRZones = zones;
    window.customHRZonesActive = true;
    saveZones();
  } else if (method === 'lactate') {
    var lactate = parseFloat(document.getElementById('hr-lactate-value').value);
    if (isNaN(lactate) || lactate <= 0) {
      _toast('Ingresa un valor válido para umbral de lactato.', 'error');
      return;
    }
    var lowerPct = [0.58, 0.68, 0.80, 0.91, 1.02];
    var upperPct = [0.67, 0.79, 0.90, 1.01, 1.14];
    var zones = [];
    for (var i = 0; i < 5; i++) {
      var min = Math.round(lactate * lowerPct[i]);
      var max = Math.round(lactate * upperPct[i]);
      zones.push({min: min, max: max});
    }
    zones[0].min = 0;
    window.customHRZones = zones;
    window.customHRZonesActive = true;
    saveZones();
  } else if (method === 'maxhr') {
    var maxhr = parseFloat(document.getElementById('hr-maxhr-value').value);
    if (isNaN(maxhr) || maxhr <= 0) {
      _toast('Ingresa un valor válido para FC máxima.', 'error');
      return;
    }
    var lowerPct = [0.50, 0.60, 0.70, 0.80, 0.90];
    var upperPct = [0.60, 0.70, 0.80, 0.90, 1.00];
    var zones = [];
    for (var i = 0; i < 5; i++) {
      var min = Math.round(maxhr * lowerPct[i]);
      var max = Math.round(maxhr * upperPct[i]);
      zones.push({min: min, max: max});
    }
    zones[0].min = 0;
    window.customHRZones = zones;
    window.customHRZonesActive = true;
    saveZones();
  } else if (method === 'fcr') {
    var fcrMax = parseFloat(document.getElementById('hr-fcr-max').value);
    var fcrRest = parseFloat(document.getElementById('hr-fcr-rest').value);
    if (isNaN(fcrMax) || fcrMax <= 0 || isNaN(fcrRest) || fcrRest <= 0) {
      _toast('Ingresa valores válidos para FC máxima y FC en reposo.', 'error');
      return;
    }
    var fcrRange = fcrMax - fcrRest;
    var lowerPct = [0.50, 0.60, 0.70, 0.80, 0.90];
    var upperPct = [0.60, 0.70, 0.80, 0.90, 1.00];
    var zones = [];
    for (var i = 0; i < 5; i++) {
      var min = Math.round(fcrRest + fcrRange * lowerPct[i]);
      var max = Math.round(fcrRest + fcrRange * upperPct[i]);
      zones.push({min: min, max: max});
    }
    zones[0].min = 0;
    window.customHRZones = zones;
    window.customHRZonesActive = true;
    saveZones();
  }
  if(window.customHRZones)window.customHRZones=_closeZoneGaps(window.customHRZones);
  recomputeHRZonesFromRecords();
  _updateZonesBtn();
  var json = document.getElementById('json-input').value.trim();
  if (json) {
    render();
  }
}

loadZones();

/* ── DRAG & DROP EN TEXTAREA ── */
(function() {
  var wrap = document.getElementById('json-wrap');
  if (!wrap) return;
  wrap.addEventListener('dragenter', function(e) { e.preventDefault(); wrap.classList.add('drag-over'); });
  wrap.addEventListener('dragover',  function(e) { e.preventDefault(); wrap.classList.add('drag-over'); });
  wrap.addEventListener('dragleave', function(e) {
    if (!wrap.contains(e.relatedTarget)) wrap.classList.remove('drag-over');
  });
  wrap.addEventListener('drop', function(e) {
    e.preventDefault();
    wrap.classList.remove('drag-over');
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    var name = file.name.toLowerCase();
    if (name.endsWith('.zip')) {
      loadZip(file);
    } else if (name.endsWith('.fit')) {
      var reader = new FileReader();
      reader.onload = function(ev) { _parseFitBufferConnector(ev.target.result, file.name); };
      reader.readAsArrayBuffer(file);
    } else {
      var errEl = document.getElementById('error-msg');
      errEl.textContent = 'Formato no soportado. Usa .fit o .zip.';
      errEl.style.display = 'block';
    }
  });
})();

/* ── CONECTOR GARMIN ── */
const CONNECTOR_URL_KEY     = 'garminConnectorUrl';
const CONNECTOR_ALIASES_KEY = 'garminConnectorAliases'; // {username: serverUrl}
const CONNECTOR_USER_KEY    = 'garminConnectorUser';

function _cleanConnectorUrl(raw) {
  return (raw || '').trim().replace(/\/(mcp|sse)\/?$/, '').replace(/\/$/, '');
}

function _getAliases() {
  try {
    var raw = JSON.parse(localStorage.getItem(CONNECTOR_ALIASES_KEY) || '{}');
    // Migrate old format {user: "url"} → {user: {server:"url", drive:""}}
    Object.keys(raw).forEach(function(k) {
      if (typeof raw[k] === 'string') raw[k] = {server: raw[k], drive: ''};
    });
    return raw;
  } catch(e) { return {}; }
}

function _saveAlias(username, serverUrl, driveUrl) {
  var aliases = _getAliases();
  aliases[username.trim().toLowerCase()] = {server: serverUrl, drive: driveUrl || ''};
  localStorage.setItem(CONNECTOR_ALIASES_KEY, JSON.stringify(aliases));
}

function _getConnectorUrl() {
  return _cleanConnectorUrl(localStorage.getItem(CONNECTOR_URL_KEY) || '');
}

function _applyServer(serverUrl) {
  localStorage.setItem(CONNECTOR_URL_KEY, serverUrl);
  return _loadConfigFromServer(serverUrl).then(function(cfg) {
    if (cfg.driveUrl) _toast('✓ Configuración cargada.', 'ok');
    else _toast('Servidor guardado. Configura Drive en ⚙ si lo necesitas.', 'info');
    return cfg;
  });
}

function configureConnector() { openSettings(); }

// Al cargar la página, refrescar config desde el servidor si está configurado
(function() {
  var server = _getConnectorUrl();
  if (server) _loadConfigFromServer(server);
})();

var _connectorActs = [];
var _connectorTypeFilter = ''; // '' = todo, 'running', 'cycling', 'moto'
var _RUNNING_TYPES = {running:1,treadmill_running:1,trail_running:1,road_running:1,
  virtual_run:1,track_running:1,indoor_running:1,ultra_run:1};
var _CYCLING_TYPES = {cycling:1,indoor_cycling:1,virtual_ride:1,road_biking:1,
  mountain_biking:1,gravel_cycling:1,bmx:1,recumbent_cycling:1,cyclocross:1,
  hand_cycling:1,track_cycling:1,para_cycling:1,fat_bike:1,
  ebike_mountain:1,ebike_road:1,e_bike:1,electric_bike:1,ebike:1};
var _MOTO_TYPES = {motorcycling:1,driving:1,car:1,automotive:1,overland:1,
  other_wheeled_transport:1,atv:1,all_terrain_vehicle:1,auto_racing:1,motocross:1,
  ground_transport:1,transportation:1,motor_racing:1,snowmobiling:1,karting:1,
  scooter_riding:1,four_wheeling:1,kickscooter:1,e_scooter:1};
var _CONNECTOR_TIPOS = {
  treadmill_running:'Cinta', running:'Carrera', trail_running:'Trail',
  cycling:'Ciclismo', indoor_cycling:'Ciclismo sala', swimming:'Natación', walking:'Caminar',
  motorcycling:'Moto', motorcycling_v2:'Moto', driving:'Conducción', car:'Coche', automotive:'Coche',
  overland:'Viaje', other_wheeled_transport:'Vehículo', atv:'ATV', auto_racing:'Racing', motocross:'Motocross'
};

function _connectorTypeMatch(a) {
  if (!_connectorTypeFilter) return true;
  var t = (a.activityType || '').replace(/_v\d+$/i, '');
  if (_connectorTypeFilter === 'running') return !!_RUNNING_TYPES[t];
  if (_connectorTypeFilter === 'cycling') return !!_CYCLING_TYPES[t];
  if (_connectorTypeFilter === 'moto') return !!_MOTO_TYPES[t];
  return true;
}

function _setConnectorTypeFilter(type) {
  _connectorTypeFilter = type;
  document.querySelectorAll('.connector-type-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.type === type);
  });

  if (!type) {
    // Todo: usar las 30 recientes ya cargadas
    _filterConnectorActivities();
    return;
  }

  // Tipo específico: necesitamos el histórico amplio para encontrar suficientes resultados
  if (_connectorBroadActs) {
    _filterConnectorActivities();
    return;
  }

  // Todavía no se ha cargado el histórico → mostrar espera y fetchearlo
  var list = document.getElementById('connector-list');
  list.innerHTML = '<div style="text-align:center;padding:28px;color:#555;font-size:12px">Buscando actividades…</div>';
  if (_connectorBroadFetching) {
    // Ya hay un fetch en vuelo (prefetch de arranque): cuando acabe,
    // _prefetchConnectorBroad lo almacena en _connectorBroadActs; hacemos polling liviano
    var _waitPoll = setInterval(function() {
      if (_connectorBroadActs) {
        clearInterval(_waitPoll);
        if (_connectorTypeFilter === type) _filterConnectorActivities();
      }
    }, 200);
    return;
  }
  _connectorBroadFetching = true;
  var base = _getConnectorUrl();
  if (!base) { _connectorBroadFetching = false; _filterConnectorActivities(); return; }
  var SIN = {strength_training:1,yoga:1,pilates:1,flexibility:1,breathwork:1,meditation:1};
  var _yearStart = new Date().getFullYear() + '-01-01';
  fetch(base + '/activities?limit=500&start_date=' + _yearStart)
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _connectorBroadActs = (data.activities || []).filter(function(a) { return !SIN[a.activityType]; });
      _connectorBroadFetching = false;
      if (_connectorTypeFilter === type) _filterConnectorActivities();
    })
    .catch(function() {
      _connectorBroadFetching = false;
      _filterConnectorActivities();
    });
}

function _renderConnectorActs(acts) {
  var list = document.getElementById('connector-list');
  if (!acts.length) {
    var msg = (_connectorTypeFilter && _connectorBroadFetching)
      ? 'Buscando actividades…'
      : 'Sin resultados';
    list.innerHTML = '<div style="text-align:center;padding:28px;color:#555;font-size:12px">'+msg+'</div>';
    return;
  }
  list.innerHTML = acts.map(function(a) {
    var name = escHtml(a.activityName || 'Actividad');
    var date = a.startTimeLocal ? a.startTimeLocal.slice(0, 10) : '';
    var dist = a.distanceKm > 0 ? a.distanceKm.toFixed(2) + ' km' : '';
    var dur  = a.durationMin > 0 ? (function(){var s=Math.round(a.durationMin*60),h=Math.floor(s/3600),m=Math.floor((s%3600)/60);if(h>0)return h+'h '+m+'min';return m+'min';})() : '';
    var type = escHtml(_CONNECTOR_TIPOS[a.activityType] || (a.activityType || ''));
    var meta = [date, type, dist, dur].filter(Boolean).join(' · ');
    return '<div onclick="loadActivityFromConnector(\'' + a.activityId + '\')"'
      + ' style="padding:12px 18px;border-bottom:1px solid #111318;cursor:pointer;transition:background .12s"'
      + ' onmouseover="this.style.background=\'#141620\'" onmouseout="this.style.background=\'transparent\'">'
      + '<div style="font-size:13px;font-weight:600;color:#eaeaea;margin-bottom:3px">' + name + '</div>'
      + '<div style="font-size:11px;color:#505870">' + meta + '</div>'
      + '</div>';
  }).join('');
}

var _connectorBroadActs = null;
var _connectorBroadFetching = false;
var _connectorSearchTimer = null;
var _connectorRecentReady = false;
var _connectorRecentFetching = false;
var _connectorPollTimer = null;
var _CONN_CACHE_KEY = 'garmin_conn_acts_v1';
var _CONN_BROAD_CACHE_KEY = 'garmin_conn_broad_v1';
function _saveConnectorCache(acts){try{localStorage.setItem(_CONN_CACHE_KEY,JSON.stringify(acts));}catch(e){}}
function _loadConnectorCache(){try{var r=localStorage.getItem(_CONN_CACHE_KEY);return r?JSON.parse(r):null;}catch(e){return null;}}
function _saveConnectorBroadCache(acts){try{localStorage.setItem(_CONN_BROAD_CACHE_KEY,JSON.stringify(acts));}catch(e){}}
function _loadConnectorBroadCache(){try{var r=localStorage.getItem(_CONN_BROAD_CACHE_KEY);return r?JSON.parse(r):null;}catch(e){return null;}}

function _stopConnectorPolling(){if(_connectorPollTimer){clearInterval(_connectorPollTimer);_connectorPollTimer=null;}}
function _startConnectorPolling(){
  _stopConnectorPolling();
  var _polling=false;
  _connectorPollTimer=setInterval(function(){
    if(_polling)return; // esperar a que termine el anterior
    var base=_getConnectorUrl(); if(!base)return;
    var from=document.getElementById('connector-date-from').value;
    var to=document.getElementById('connector-date-to').value;
    if(from||to)return; // no refrescar si hay filtro de fechas activo
    _polling=true;
    var SIN={strength_training:1,yoga:1,pilates:1,flexibility:1,breathwork:1,meditation:1};
    fetch(base+'/activities?limit=30')
      .then(function(r){return r.json();})
      .then(function(data){
        _polling=false;
        var fresh=(data.activities||[]).filter(function(a){return !SIN[a.activityType];});
        if(!fresh.length)return;
        var changed=!_connectorActs.length
          ||fresh[0].activityId!==_connectorActs[0].activityId
          ||fresh.length!==_connectorActs.length;
        if(!changed)return;
        _connectorActs=fresh;
        _saveConnectorCache(fresh);
        var sw=document.getElementById('connector-search-wrap');
        var tf=document.getElementById('connector-type-filter');
        if(sw)sw.style.display='block';
        if(tf)tf.style.display='flex';
        _renderConnectorActs(fresh.filter(_connectorTypeMatch));
      })
      .catch(function(){_polling=false;});
  },5000); // cada 5 segundos
}

function _matchAct(a, q) {
  var name = (a.activityName || '').toLowerCase();
  var type = (_CONNECTOR_TIPOS[a.activityType] || a.activityType || '').toLowerCase();
  var date = (a.startTimeLocal || '').slice(0, 10);
  return name.includes(q) || type.includes(q) || date.includes(q);
}

function _filterConnectorActivities() {
  var q = (document.getElementById('connector-search').value || '').trim().toLowerCase();
  // Para filtros de tipo: usar histórico amplio si disponible, para no limitar a las 30 recientes
  var source = (_connectorTypeFilter && _connectorBroadActs) ? _connectorBroadActs : _connectorActs;
  var base = source.filter(_connectorTypeMatch);
  if (!q) { clearTimeout(_connectorSearchTimer); _renderConnectorActs(base); return; }

  // Filtra lo cargado al instante
  var local = base.filter(function(a) { return _matchAct(a, q); });
  _renderConnectorActs(local);

  // Con 3+ chars busca también en el histórico amplio (~500 actividades)
  if (q.length < 3) return;
  clearTimeout(_connectorSearchTimer);
  _connectorSearchTimer = setTimeout(function() {
    if (_connectorBroadActs) {
      var broad = _connectorBroadActs.filter(function(a) { return _matchAct(a, q); });
      if (broad.length > local.length) _renderConnectorActs(broad);
      return;
    }
    if (_connectorBroadFetching) return;
    _connectorBroadFetching = true;
    var base = _getConnectorUrl();
    if (!base) return;
    var _yearStart = new Date().getFullYear() + '-01-01';
    fetch(base + '/activities?limit=500&start_date=' + _yearStart)
      .then(function(r) { return r.json(); })
      .then(function(data) {
        var SIN = {strength_training:1,yoga:1,pilates:1,flexibility:1,breathwork:1,meditation:1};
        _connectorBroadActs = (data.activities || []).filter(function(a) { return !SIN[a.activityType]; });
        _connectorBroadFetching = false;
        var currentQ = (document.getElementById('connector-search').value || '').trim().toLowerCase();
        if (currentQ.length >= 3 && currentQ === q) {
          var broad = _connectorBroadActs.filter(function(a) { return _matchAct(a, currentQ); });
          if (broad.length > (_connectorActs.filter(function(a){return _matchAct(a,currentQ);}).length))
            _renderConnectorActs(broad);
        }
      })
      .catch(function() { _connectorBroadFetching = false; });
  }, 350);
}

function _ensurePanels() {
  if(!document.getElementById('settings-overlay')){
    var s=document.createElement('div');s.id='settings-overlay';
    s.style.cssText='display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;overflow-y:auto';
    s.innerHTML='<div style="max-width:500px;margin:40px auto;background:#1a1c23;border-radius:10px;padding:24px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">'
      +'<span style="font-size:15px;font-weight:700;color:#eaeaea">Ajustes</span>'
      +'<button onclick="closeSettings()" style="background:none;border:none;color:#888;font-size:20px;cursor:pointer">✕</button></div>'
      +'<div style="margin-bottom:14px"><div style="font-size:12px;color:#8890a0;margin-bottom:4px">Nombre de usuario</div>'
      +'<input id="cfg-username" type="text" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid #2a2d35;background:#0d0e12;color:#eaeaea;font-size:13px;box-sizing:border-box" placeholder="Tu nombre de usuario en el servidor"></div>'
      +'<div style="margin-bottom:14px"><div style="font-size:12px;color:#8890a0;margin-bottom:4px">URL del servidor</div>'
      +'<input id="cfg-server" type="text" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid #2a2d35;background:#0d0e12;color:#eaeaea;font-size:13px;box-sizing:border-box" placeholder="https://tu-servidor.railway.app"></div>'
      +'<div style="margin-bottom:14px"><div style="font-size:12px;color:#8890a0;margin-bottom:4px">URL de Google Drive (opcional)</div>'
      +'<input id="cfg-drive" type="text" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid #2a2d35;background:#0d0e12;color:#eaeaea;font-size:13px;box-sizing:border-box" placeholder="https://drive.google.com/drive/folders/..."></div>'
      +'<div style="display:flex;gap:8px;margin-bottom:14px">'
      +'<button id="cfg-load-btn" onclick="settingsLoadFromServer()" style="padding:8px 16px;border-radius:6px;border:1px solid #2a2d35;background:#0d0e12;color:#eaeaea;font-size:12px;cursor:pointer">Cargar</button>'
      +'<button id="cfg-save-btn" onclick="settingsSave()" style="padding:8px 16px;border-radius:6px;border:1px solid #2a2d35;background:#2a5f3a;color:#eaeaea;font-size:12px;cursor:pointer">Guardar</button></div>'
      +'<div id="cfg-saved-users" style="display:flex;flex-wrap:wrap;gap:6px"></div></div>';
    document.body.appendChild(s);
  }
  if(!document.getElementById('connector-overlay')){
    var c=document.createElement('div');c.id='connector-overlay';
    c.style.cssText='display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;overflow-y:auto';
    c.innerHTML='<div style="max-width:600px;margin:40px auto;background:#1a1c23;border-radius:10px;padding:20px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">'
      +'<span style="font-size:15px;font-weight:700;color:#eaeaea">Actividades</span>'
      +'<button onclick="closeConnectorPanel()" style="background:none;border:none;color:#888;font-size:20px;cursor:pointer">✕</button></div>'
      +'<div id="connector-search-wrap" style="display:block;margin-bottom:12px">'
      +'<input id="connector-search" type="text" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid #2a2d35;background:#0d0e12;color:#eaeaea;font-size:13px;box-sizing:border-box" placeholder="Buscar actividad…" oninput="_filterConnectorActivities()"></div>'
      +'<div id="connector-date-wrap" style="display:none;margin-bottom:12px">'
      +'<input id="connector-date-from" type="date" style="padding:6px 10px;border-radius:6px;border:1px solid #2a2d35;background:#0d0e12;color:#eaeaea;font-size:12px">'
      +'<input id="connector-date-to" type="date" style="padding:6px 10px;border-radius:6px;border:1px solid #2a2d35;background:#0d0e12;color:#eaeaea;font-size:12px;margin-left:8px">'
      +'<button onclick="_connectorFilterByDate()" style="padding:6px 12px;border-radius:6px;border:1px solid #2a2d35;background:#0d0e12;color:#eaeaea;font-size:12px;cursor:pointer;margin-left:8px">Filtrar</button></div>'
      +'<div id="connector-type-filter" style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap"></div>'
      +'<div id="connector-list" style="min-height:100px"></div></div>';
    document.body.appendChild(c);
  }
}

function openConnectorPanel() {
  _ensurePanels();
  const overlay = document.getElementById('connector-overlay');
  const list = document.getElementById('connector-list');
  const searchWrap = document.getElementById('connector-search-wrap');
  const dateWrap = document.getElementById('connector-date-wrap');
  overlay.style.display = 'block';

  const typeFilter = document.getElementById('connector-type-filter');
  const base = _getConnectorUrl();
  if (!base) {
    searchWrap.style.display = 'none';
    if (typeFilter) typeFilter.style.display = 'none';
    if (dateWrap) dateWrap.style.display = 'none';
    list.innerHTML = '<div style="padding:20px 18px;font-size:12px;color:#8890a0;line-height:1.9">'
      + '<b style="color:#eaeaea;font-size:13px">Conector no configurado</b><br><br>'
      + 'Pulsa <b style="color:#ccc">⚙ Configurar</b> e introduce:<br>'
      + '· <b style="color:#aaa">Primera vez</b>: la URL de tu servidor + un nombre de usuario<br>'
      + '· <b style="color:#aaa">Siguiente vez</b>: solo el nombre de usuario<br><br>'
      + '<span style="color:#505870">Necesitas <a href="https://github.com/Alejandrlucena/garmin-coach-mcp" '
      + 'target="_blank" style="color:#4a6fa5">garmin-coach-mcp</a> desplegado en Railway '
      + 'o en local (<code style="color:#666">http://localhost:8000</code>).</span></div>';
    return;
  }
  if (dateWrap) dateWrap.style.display = 'flex';

  // Mostrar cache inmediatamente si existe; refrescar en background
  var cached = _loadConnectorCache();
  if (cached && cached.length) {
    // Si el prefetch de arranque ya terminó, usar datos frescos directamente
    var toShow = (_connectorRecentReady && _connectorActs && _connectorActs.length)
      ? _connectorActs : cached;
    _connectorActs = toShow;
    searchWrap.style.display = 'block';
    if (typeFilter) typeFilter.style.display = 'flex';
    _renderConnectorActs(toShow.filter(_connectorTypeMatch));
    if (!_connectorRecentReady) _connectorStartupPrefetch(); // refresca si aún no acabó
    _prefetchConnectorBroad();
    _startConnectorPolling();
    return;
  }

  _prefetchConnectorBroad();
  _loadConnectorByDate();
  _startConnectorPolling();
}

function _connectorStartupPrefetch() {
  var base = _getConnectorUrl();
  if (!base) return;
  if (_connectorRecentFetching || _connectorRecentReady) return;
  var SIN = {strength_training:1,yoga:1,pilates:1,flexibility:1,breathwork:1,meditation:1};
  _connectorRecentFetching = true;
  // Primero carga las 30 recientes; cuando terminan, arranca el amplio (500) en background
  fetch(base + '/activities?limit=30')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      _connectorActs = (data.activities || []).filter(function(a) { return !SIN[a.activityType]; });
      _connectorRecentReady = true;
      _connectorRecentFetching = false;
      _saveConnectorCache(_connectorActs);
      // Si el panel está abierto y no hay filtro de fechas, actualizar la lista con datos frescos
      var _ov = document.getElementById('connector-overlay');
      var _df = document.getElementById('connector-date-from');
      var _dt = document.getElementById('connector-date-to');
      if (_ov && _ov.style.display !== 'none' && _df && !_df.value && _dt && !_dt.value) {
        var _sw = document.getElementById('connector-search-wrap');
        var _tf = document.getElementById('connector-type-filter');
        if (_sw) _sw.style.display = 'block';
        if (_tf) _tf.style.display = 'flex';
        _renderConnectorActs(_connectorActs.filter(_connectorTypeMatch));
      }
      _prefetchConnectorBroad();
    })
    .catch(function() { _connectorRecentFetching = false; });
}

function _prefetchConnectorBroad() {
  if (_connectorBroadActs || _connectorBroadFetching) return;
  var base = _getConnectorUrl();
  if (!base) return;
  _connectorBroadFetching = true;
  fetch(base + '/activities?limit=500')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var SIN = {strength_training:1,yoga:1,pilates:1,flexibility:1,breathwork:1,meditation:1};
      _connectorBroadActs = (data.activities || []).filter(function(a) { return !SIN[a.activityType]; });
      _connectorBroadFetching = false;
      _saveConnectorBroadCache(_connectorBroadActs);
      if (_connectorTypeFilter) _filterConnectorActivities();
    })
    .catch(function() { _connectorBroadFetching = false; });
}

function _loadConnectorByDate() {
  var from = document.getElementById('connector-date-from').value;
  var to   = document.getElementById('connector-date-to').value;
  var base = _getConnectorUrl();
  if (!base) return;
  var list = document.getElementById('connector-list');
  var searchWrap = document.getElementById('connector-search-wrap');

  var typeFilter = document.getElementById('connector-type-filter');
  // Si no hay filtro de fechas y el prefetch ya tiene datos → renderizar al instante
  if (!from && !to && _connectorRecentReady && _connectorActs && _connectorActs.length) {
    searchWrap.style.display = 'block';
    if (typeFilter) typeFilter.style.display = 'flex';
    _renderConnectorActs(_connectorActs.filter(_connectorTypeMatch));
    return;
  }

  // Prefetch de arranque en vuelo y sin filtro de fechas → esperar en lugar de relanzar
  if (!from && !to && _connectorRecentFetching) {
    searchWrap.style.display = 'none';
    if (typeFilter) typeFilter.style.display = 'none';
    list.innerHTML = '<div style="text-align:center;padding:28px;color:#555;font-size:12px">Cargando actividades…</div>';
    var _waitRecent = setInterval(function() {
      if (_connectorRecentReady) {
        clearInterval(_waitRecent);
        var search = document.getElementById('connector-search');
        if (search) search.value = '';
        searchWrap.style.display = 'block';
        if (typeFilter) typeFilter.style.display = 'flex';
        _renderConnectorActs(_connectorActs.filter(_connectorTypeMatch));
      } else if (!_connectorRecentFetching) {
        clearInterval(_waitRecent);
        list.innerHTML = '<div style="padding:16px 18px;color:#e74c3c;font-size:12px">Error al cargar actividades</div>';
      }
    }, 80);
    return;
  }

  searchWrap.style.display = 'none';
  if (typeFilter) typeFilter.style.display = 'none';
  list.innerHTML = '<div style="text-align:center;padding:28px;color:#555;font-size:12px">Cargando actividades…</div>';
  var url = base + '/activities?limit=' + (from || to ? '500' : '30');
  if (from) url += '&start_date=' + from;
  if (to)   url += '&end_date=' + to;
  fetch(url)
    .then(function(r) {
      if (!r.ok) return r.json().then(function(body) {
        var msg = body.error || ('HTTP ' + r.status);
        var fix = body.fix ? '<div style="margin-top:8px;color:#f2c94c;font-size:11px">' + body.fix + '</div>' : '';
        throw new Error(msg + fix);
      });
      return r.json();
    })
    .then(function(data) {
      var SIN_SPLITS = {strength_training:1,yoga:1,pilates:1,flexibility:1,breathwork:1,meditation:1};
      _connectorActs = (data.activities || []).filter(function(a) { return !SIN_SPLITS[a.activityType]; });
      if (!from && !to) _saveConnectorCache(_connectorActs);
      if (!_connectorActs.length) {
        list.innerHTML = '<div style="text-align:center;padding:28px;color:#555;font-size:12px">No se encontraron actividades en ese rango</div>';
        return;
      }
      var search = document.getElementById('connector-search');
      if (search) search.value = '';
      searchWrap.style.display = 'block';
      if (typeFilter) typeFilter.style.display = 'flex';
      _renderConnectorActs(_connectorActs.filter(_connectorTypeMatch));
    })
    .catch(function(err) {
      list.innerHTML = '<div style="padding:16px 18px;color:#e74c3c;font-size:12px">Error: ' + err.message + '</div>';
    });
}

function closeConnectorPanel() {
  var el = document.getElementById('connector-overlay');
  if (el) el.style.display = 'none';
  _connectorBroadActs = null;
  _connectorBroadFetching = false;
  clearTimeout(_connectorSearchTimer);
  _stopConnectorPolling();
}

function loadActivityFromConnector(activityId) {
  var list = document.getElementById('connector-list');
  list.innerHTML = '<div style="text-align:center;padding:28px;color:#555;font-size:12px">Descargando actividad…</div>';

  var base = _getConnectorUrl();
  fetch(base + '/download/' + activityId)
    .then(function(r) {
      if (!r.ok) return r.json().then(function(body) {
        var msg = body.error || ('HTTP ' + r.status);
        var fix = body.fix ? '<br><span style="color:#f2c94c;font-size:11px">' + body.fix + '</span>' : '';
        throw new Error(msg + fix);
      });
      return r.arrayBuffer();
    })
    .then(function(buf) {
      closeConnectorPanel();
      if (typeof JSZip !== 'undefined') {
        return JSZip.loadAsync(buf).then(function(zip) {
          var fitEntry = null;
          zip.forEach(function(relPath, entry) {
            if (!fitEntry && relPath.toLowerCase().endsWith('.fit')) fitEntry = entry;
          });
          if (fitEntry) {
            return fitEntry.async('arraybuffer').then(function(fitBuf) {
              _parseFitBufferConnector(fitBuf, fitEntry.name);
            });
          }
          _parseFitBufferConnector(buf, 'activity_' + activityId + '.fit');
        }).catch(function() {
          _parseFitBufferConnector(buf, 'activity_' + activityId + '.fit');
        });
      }
      _parseFitBufferConnector(buf, 'activity_' + activityId + '.fit');
    })
    .catch(function(err) {
      closeConnectorPanel();
      var errEl = document.getElementById('error-msg');
      errEl.textContent = 'Error al descargar del conector: ' + err.message;
      errEl.style.display = 'block';
    });
}

function _parseFitBufferConnector(buf, filename) {
  var errEl = document.getElementById('error-msg');
  if (typeof FitParser === 'undefined') {
    errEl.textContent = 'Librería FIT no cargada aún. Espera un momento y vuelve a intentarlo.';
    errEl.style.display = 'block';
    return;
  }
  errEl.style.display = 'none';
  try {
    var parser = new FitParser({
      force: true, speedUnit: 'm/s', lengthUnit: 'm',
      temperatureUnit: 'celsius', elapsedRecordField: true, mode: 'list'
    });
    parser.parse(buf, function(error, fitData) {
      if (error) {
        errEl.textContent = 'Error al leer el .fit: ' + error;
        errEl.style.display = 'block';
        return;
      }
      try {
        var json = fitToGarminJson(fitData, filename);
        document.getElementById('json-input').value = JSON.stringify(json, null, 2);
        render();
      } catch(ex) {
        errEl.textContent = 'Error al convertir: ' + ex.message;
        errEl.style.display = 'block';
      }
    });
  } catch(ex) {
    errEl.textContent = 'Error: ' + ex.message;
    errEl.style.display = 'block';
  }
}

// ── PANEL DE AJUSTES UNIFICADO ──
function _refreshSavedUsersChips() {
  var wrap = document.getElementById('cfg-saved-users');
  if (!wrap) return;
  var aliases = _getAliases();
  var keys = Object.keys(aliases);
  if (!keys.length) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'flex';
  wrap.innerHTML = keys.map(function(k) {
    var kSafe = k.replace(/'/g, "\\'");
    return '<span style="display:inline-flex;align-items:center;gap:0;background:#101828;border:1px solid #1e2a40;border-radius:20px;overflow:hidden">'
      + '<button onclick="settingsLoadUser(\'' + kSafe + '\')" '
      + 'style="background:none;border:none;padding:4px 10px 4px 12px;font-size:11px;font-weight:600;color:#7aa2d4;cursor:pointer;white-space:nowrap">' + k + '</button>'
      + '<button onclick="settingsDeleteAlias(\'' + kSafe + '\')" title="Borrar alias" '
      + 'style="background:none;border:none;border-left:1px solid #1e2a40;padding:4px 8px;font-size:10px;color:#4a3a3a;cursor:pointer;line-height:1" '
      + 'onmouseover="this.style.color=\'#c06060\'" onmouseout="this.style.color=\'#4a3a3a\'">✕</button>'
      + '</span>';
  }).join('');
}

function settingsLoadUser(username) {
  document.getElementById('cfg-username').value = username;
  settingsImportUser();
}

function settingsDeleteAlias(username) {
  var aliases = _getAliases();
  delete aliases[username];
  localStorage.setItem(CONNECTOR_ALIASES_KEY, JSON.stringify(aliases));
  _refreshSavedUsersChips();
  _toast('Alias "' + username + '" borrado.', 'info');
}

function openSettings() {
  _ensurePanels();
  var user   = localStorage.getItem(CONNECTOR_USER_KEY) || '';
  var server = _getConnectorUrl();
  var drive  = _resolveUploadUrl();
  document.getElementById('cfg-username').value = user;
  document.getElementById('cfg-server').value   = server;
  document.getElementById('cfg-drive').value    = drive;
  _refreshSavedUsersChips();
  document.getElementById('settings-overlay').style.display = 'block';
  if (server && !drive) settingsLoadFromServer(true);
}

function settingsImportUser() {
  var username = document.getElementById('cfg-username').value.trim().toLowerCase();
  if (!username) { _toast('Escribe tu nombre de usuario primero', 'info'); return; }

  var aliases = _getAliases();
  var alias   = aliases[username];
  if (!alias) { _toast('Usuario "' + username + '" no encontrado. Introduce la URL manualmente.', 'info'); return; }

  document.getElementById('cfg-server').value = alias.server;
  document.getElementById('cfg-drive').value  = alias.drive || '';
  _toast('✓ Configuración de "' + username + '" cargada.', 'ok');
}

function closeSettings() {
  var el = document.getElementById('settings-overlay');
  if (el) el.style.display = 'none';
}

document.addEventListener('keydown', function(e) {
  if (e.key !== 'Escape') return;
  var c = document.getElementById('connector-overlay');
  var s = document.getElementById('settings-overlay');
  if (s && s.style.display !== 'none') { closeSettings(); return; }
  if (c && c.style.display !== 'none') { closeConnectorPanel(); }
});

function settingsLoadFromServer(silent) {
  var server = _cleanConnectorUrl(document.getElementById('cfg-server').value);
  if (!server) { if (!silent) _toast('Introduce primero la URL del servidor.', 'error'); return; }
  var btn = document.getElementById('cfg-load-btn');
  btn.textContent = '…';
  btn.disabled = true;
  _loadConfigFromServer(server).then(function(cfg) {
    if (cfg.driveUrl) {
      document.getElementById('cfg-drive').value = cfg.driveUrl;
      if (!silent) _toast('✓ Drive URL cargado desde el servidor.', 'ok');
    } else {
      if (!silent) _toast('El servidor no tiene Drive URL guardado aún.', 'info');
    }
  }).finally(function() {
    btn.textContent = 'Cargar';
    btn.disabled = false;
  });
}

function settingsSave() {
  var username = document.getElementById('cfg-username').value.trim().toLowerCase();
  var server   = _cleanConnectorUrl(document.getElementById('cfg-server').value);
  var drive    = document.getElementById('cfg-drive').value.trim();

  if (server) {
    localStorage.setItem(CONNECTOR_URL_KEY, server);
    if (username) {
      _saveAlias(username, server, drive);
      localStorage.setItem(CONNECTOR_USER_KEY, username);
    } else {
      localStorage.removeItem(CONNECTOR_USER_KEY);
    }
  } else {
    localStorage.removeItem(CONNECTOR_URL_KEY);
    localStorage.removeItem(CONNECTOR_USER_KEY);
  }

  _saveDriveUrl(drive);
  _updateConnectorBtnLabel();
  closeSettings();
  _toast('✓ Configuración guardada.', 'ok');
}

function settingsClear() {
  if (!confirm('¿Borrar toda la configuración, incluidos los usuarios guardados?')) return;
  localStorage.removeItem(CONNECTOR_URL_KEY);
  localStorage.removeItem(CONNECTOR_USER_KEY);
  localStorage.removeItem(DRIVE_UPLOAD_URL_KEY);
  localStorage.removeItem(CONNECTOR_ALIASES_KEY);
  document.getElementById('cfg-username').value = '';
  document.getElementById('cfg-server').value   = '';
  document.getElementById('cfg-drive').value    = '';
  var wrap = document.getElementById('cfg-saved-users');
  if (wrap) wrap.style.display = 'none';
  _updateConnectorBtnLabel();
  closeSettings();
  _toast('Configuración borrada.', 'info');
}

function settingsExport() {
  var data={
    version:1,
    exportedAt:new Date().toISOString(),
    server:_getConnectorUrl(),
    user:localStorage.getItem(CONNECTOR_USER_KEY)||'',
    drive:_resolveUploadUrl(),
    aliases:_getAliases(),
    hrZones:localStorage.getItem('customHRZones')||'',
    hrMethod:localStorage.getItem('hr-method')||'',
    hrLactate:localStorage.getItem('hr-lactate-value')||'',
    hrMaxHr:localStorage.getItem('hr-maxhr-value')||'',
    hrFcrMax:localStorage.getItem('hr-fcr-max')||'',
    hrFcrRest:localStorage.getItem('hr-fcr-rest')||'',
    hrZonesInput:localStorage.getItem('hr-zones-input')||'',
    shareOpts:localStorage.getItem('garminShareOpts')||'',
    customPresets:localStorage.getItem('garminCustomPresets')||'',
    textPresets:localStorage.getItem('garminTextPresets')||'',
    hiddenCols:{}
  };
  for(var i=0;i<localStorage.length;i++){
    var key=localStorage.key(i);
    if(key.startsWith('_colsHidden_')) data.hiddenCols[key]=localStorage.getItem(key);
  }
  var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a');
  a.href=url;
  a.download='garmin-laps-config.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  _toast('✓ Configuración exportada.', 'ok');
}

function settingsShareLink() {
  var server=_getConnectorUrl();
  if(!server){ _toast('Configura primero la URL del servidor en Ajustes.','error'); return; }
  var data={
    version:1,
    server:server,
    user:localStorage.getItem(CONNECTOR_USER_KEY)||'',
    drive:_resolveUploadUrl(),
    aliases:_getAliases(),
    hrZones:localStorage.getItem('customHRZones')||'',
    hrMethod:localStorage.getItem('hr-method')||'',
    hrLactate:localStorage.getItem('hr-lactate-value')||'',
    hrMaxHr:localStorage.getItem('hr-maxhr-value')||'',
    hrFcrMax:localStorage.getItem('hr-fcr-max')||'',
    hrFcrRest:localStorage.getItem('hr-fcr-rest')||'',
    hrZonesInput:localStorage.getItem('hr-zones-input')||'',
    shareOpts:localStorage.getItem('garminShareOpts')||'',
    customPresets:localStorage.getItem('garminCustomPresets')||'',
    textPresets:localStorage.getItem('garminTextPresets')||'',
    hiddenCols:{}
  };
  for(var i=0;i<localStorage.length;i++){
    var key=localStorage.key(i);
    if(key.startsWith('_colsHidden_')) data.hiddenCols[key]=localStorage.getItem(key);
  }
  var url=server.replace(/\/+$/,'')+'/config/share';
  fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
    .then(function(r){return r.json();})
    .then(function(res){
      if(res.shareId){
        var shareUrl=window.location.origin+window.location.pathname+'?config='+res.shareId+'&server='+encodeURIComponent(server);
        if(navigator.clipboard){navigator.clipboard.writeText(shareUrl);}
        _toast('✓ Enlace copiado al portapapeles: '+shareUrl,'ok');
      }else{
        _toast('Error: '+(res.error||'respuesta inesperada'),'error');
      }
    })
    .catch(function(err){_toast('Error de red: '+err.message,'error');});
}

function settingsImport(file) {
  if(!file) return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var data=JSON.parse(e.target.result);
      if(!data||!data.version) throw new Error('Fichero no válido');
      if(data.server) localStorage.setItem(CONNECTOR_URL_KEY,data.server);
      if(data.user) localStorage.setItem(CONNECTOR_USER_KEY,data.user);
      if(data.drive) localStorage.setItem(DRIVE_UPLOAD_URL_KEY,data.drive);
      if(data.aliases) localStorage.setItem(CONNECTOR_ALIASES_KEY,JSON.stringify(data.aliases));
      if(data.hrZones) localStorage.setItem('customHRZones',data.hrZones);
      if(data.hrMethod) localStorage.setItem('hr-method',data.hrMethod);
      if(data.hrLactate) localStorage.setItem('hr-lactate-value',data.hrLactate);
      if(data.hrMaxHr) localStorage.setItem('hr-maxhr-value',data.hrMaxHr);
      if(data.hrFcrMax) localStorage.setItem('hr-fcr-max',data.hrFcrMax);
      if(data.hrFcrRest) localStorage.setItem('hr-fcr-rest',data.hrFcrRest);
      if(data.hrZonesInput) localStorage.setItem('hr-zones-input',data.hrZonesInput);
      if(data.shareOpts) localStorage.setItem('garminShareOpts',data.shareOpts);
      if(data.customPresets) localStorage.setItem('garminCustomPresets',data.customPresets);
      if(data.textPresets) localStorage.setItem('garminTextPresets',data.textPresets);
      if(data.hiddenCols) Object.keys(data.hiddenCols).forEach(function(k){localStorage.setItem(k,data.hiddenCols[k]);});
      _toast('✓ Configuración importada. Abre de nuevo Ajustes para ver los cambios.','ok');
      openSettings();
    }catch(err){
      _toast('Error al importar: '+err.message,'error');
    }
  };
  reader.readAsText(file);
}

function _updateConnectorBtnLabel() {
  var configured = !!_getConnectorUrl();
  var lbl = document.getElementById('connector-btn-label');
  var ico = document.getElementById('connector-btn-icon');
  if (lbl) lbl.textContent = configured ? 'Actividades' : 'Conector';
  if (ico) ico.textContent = configured ? '🗂️' : '🔌';
}

// ── TOASTS ──
function _toast(msg, type) {
  // type: 'info' | 'ok' | 'error'
  var t = document.createElement('div');
  var colors = { ok:'#2a4a35', error:'#4a1f1f', info:'#1a1c24' };
  var borders = { ok:'#2d6b42', error:'#7a3030', info:'#2a2d3a' };
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);'
    + 'background:' + (colors[type]||colors.info) + ';'
    + 'border:1px solid ' + (borders[type]||borders.info) + ';'
    + 'border-radius:12px;padding:11px 18px;font-size:13px;color:#d0d4de;'
    + 'box-shadow:0 4px 24px rgba(0,0,0,.6);z-index:2000;max-width:calc(100vw - 40px);'
    + 'text-align:center;animation:fadeIn .2s ease;pointer-events:none';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.remove(); }, type === 'error' ? 5000 : 3000);
}

function _showLinkToast(url) {
  var existing = document.getElementById('link-toast');
  if (existing) existing.remove();

  var toast = document.createElement('div');
  toast.id = 'link-toast';
  toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);'
    + 'background:#1a1c24;border:1px solid #2a2d3a;border-radius:14px;'
    + 'padding:11px 14px;display:flex;align-items:center;gap:10px;'
    + 'box-shadow:0 4px 24px rgba(0,0,0,.6);z-index:2000;max-width:calc(100vw - 40px);'
    + 'animation:fadeIn .2s ease';

  var label = document.createElement('span');
  label.style.cssText = 'font-size:12px;color:#6dbf8a;font-weight:600;white-space:nowrap';

  var input = document.createElement('input');
  input.readOnly = true;
  input.value = url;
  input.style.cssText = 'background:none;border:none;color:#8890a0;font-size:11px;'
    + 'width:180px;max-width:45vw;outline:none;cursor:text';

  var btn = document.createElement('button');
  btn.style.cssText = 'background:#2a3a5a;border:none;border-radius:8px;'
    + 'color:#7aa2d4;font-size:12px;font-weight:600;padding:6px 14px;cursor:pointer;white-space:nowrap';

  var close = document.createElement('button');
  close.textContent = '✕';
  close.style.cssText = 'background:none;border:none;color:#444;font-size:14px;cursor:pointer;padding:0 2px;line-height:1';
  close.addEventListener('click', function() { toast.remove(); });

  function _setCopied() {
    label.textContent = '✓ Copiado';
    btn.style.display = 'none';
    setTimeout(function() { if (toast.parentNode) toast.remove(); }, 2500);
  }

  function _tryClipboard() {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(url).then(_setCopied).catch(_useExecCommand);
    }
    _useExecCommand();
  }

  function _useExecCommand() {
    var ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    try { document.execCommand('copy'); _setCopied(); } catch(e) { _showCopyBtn(); }
    ta.remove();
  }

  function _showCopyBtn() {
    label.textContent = '';
    btn.textContent = 'Copiar';
    btn.style.display = '';
    btn.addEventListener('click', function() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(_setCopied).catch(function() {
          var ta2 = document.createElement('textarea');
          ta2.value = url; ta2.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
          document.body.appendChild(ta2); ta2.focus(); ta2.select();
          try { document.execCommand('copy'); _setCopied(); } catch(e) {}
          ta2.remove();
        });
      }
    });
  }

  // Start with copy button hidden; auto-attempt clipboard on mount.
  // On iOS the actual copy was pre-registered in getImageLink() via a
  // deferred ClipboardItem; the writeText() call here resolves regardless
  // and just drives the "✓ Copiado" UI.
  btn.style.display = 'none';
  label.textContent = 'Copiando…';

  toast.appendChild(label);
  toast.appendChild(input);
  toast.appendChild(btn);
  toast.appendChild(close);
  document.body.appendChild(toast);

  setTimeout(_tryClipboard, 80);
  setTimeout(function() { if (toast.parentNode) toast.remove(); }, 20000);
}

// Prefetch en background al cargar la página (1.5s de retraso para no competir con el render)
setTimeout(function() {
  // Cargar caches de localStorage al arrancar para que todo esté disponible antes de abrir el panel
  var SIN = {strength_training:1,yoga:1,pilates:1,flexibility:1,breathwork:1,meditation:1};
  var cachedBroad = _loadConnectorBroadCache();
  if (cachedBroad && cachedBroad.length && !_connectorBroadActs) {
    _connectorBroadActs = cachedBroad;
  }
  _updateConnectorBtnLabel();
  _connectorStartupPrefetch();
}, 0);

/* ──────────────────────────────────────────────────────────
   LAP TABLE EDIT: drag&drop, custom groups, undo/redo
   ────────────────────────────────────────────────────────── */
(function(){
  var W = window;
  W._editStack = W._editStack || [];      // unified op stack
  W._editRedo  = W._editRedo  || [];      // redo stack
  W._customGroups = W._customGroups || {}; // actId -> [{groupId, label, childKeys:[]}]

  function _isMobile(){
    return (window.matchMedia && window.matchMedia('(hover:none)').matches) || /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
  }

  // ── Op helpers ────────────────────────────────────────
  function _pushOp(op){
    op.id = op.id || ('op-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,6));
    _DB('STACK', 'push op type='+op.type+' id='+op.id+' actId='+op.actId);
    W._editStack.push(op);
    W._editRedo.length = 0;
    _updateFabState();
  }
  // After any row movement: make sure each leaf data row is .group-lap iff it sits below an
  // auto-generated group/phase header (and is not already in a custom group). Custom group
  // children keep their own indentation through .custom-group-child.
  function _normalizeGroupLap(actId){
    var act = _actEl(actId); if(!act) return;
    var currentAuto = null;
    Array.from(act.querySelectorAll('tbody tr')).forEach(function(tr){
      if(tr.classList.contains('avg-row')||tr.classList.contains('avg-act')){ currentAuto=null; return; }
      if(tr.classList.contains('group-header')||tr.classList.contains('phase-header')){ currentAuto=tr; return; }
      if(tr.classList.contains('custom-group-header')) return;
      if(!tr.hasAttribute('data-dur')) return;
      if(tr.getAttribute('data-custom-parent')) return; // custom group child
      if(currentAuto){
        tr.classList.add('group-lap');
      } else {
        tr.classList.remove('group-lap');
      }
    });
  }
  // Re-thread T. Acumulado for every visible data row in DOM order. Headers are skipped here
  // (their cum-time is recomputed by _recalcAutoHeaders / _recalcCustomGroups).
  function _recalcCumTimes(actId){
    var act = _actEl(actId); if(!act) return;
    var m = _actMeta(actId);
    var dec = m && m.isMoto ? 3 : 1;
    var cum = 0;
    Array.from(act.querySelectorAll('tbody tr')).forEach(function(tr){
      if(tr.classList.contains('avg-row')||tr.classList.contains('avg-act')) return;
      if(tr.classList.contains('row-hidden')) return;
      if(tr.classList.contains('group-header')||tr.classList.contains('phase-header')||tr.classList.contains('custom-group-header')) return;
      var dur = _gF(tr,'data-dur');
      if(!dur) return;
      cum += dur;
      var tdCum = tr.querySelector('td.col-cum-time .main');
      if(tdCum) tdCum.textContent = _toStep(cum, dec);
    });
  }
  function _recalcPills(actId){
    _DB('RECALC', '_recalcPills actId='+actId);
    var act = _actEl(actId);
    if(!act) return;
    var m = _actMeta(actId);
    if(!m) return;
    var table = act.querySelector('table');
    if(!table) return;
    var sport = act.getAttribute('data-sport')||'';
    var dataRows = [];
    act.querySelectorAll('tbody tr').forEach(function(tr){
      if(tr.classList.contains('avg-row')||tr.classList.contains('avg-act')) return;
      if(tr.classList.contains('row-hidden')) return;
      if(tr.classList.contains('group-header')||tr.classList.contains('phase-header')||tr.classList.contains('custom-group-header')) return;
      if(!tr.hasAttribute('data-dur')) return;
      dataRows.push(tr);
    });
    if(!dataRows.length){ console.log('RECALC_PILLS: dataRows empty for actId='+actId); return; }
    var dists = [];
    dataRows.forEach(function(tr){
      var d = _gF(tr,'data-dist');
      if(d > 0) dists.push(d);
    });
    dists.sort(function(a,b){return a-b;});
    var medDist = dists.length ? dists[Math.floor(dists.length/2)] : 0.5;
    var pillMinDist = Math.max(0.2, medDist * 0.5);
    var maxes = {speed:0,smax:0,cad:0,pow:0,fcm:0,fcx:0};
    dataRows.forEach(function(tr){
      if(tr.getAttribute('data-res')==='1') return;
      if(_gF(tr,'data-dist') < pillMinDist) return;
      ['speed','smax','cad','pow','fcm','fcx'].forEach(function(k){
        var v = _gF(tr,'data-'+k);
        if(v > maxes[k]) maxes[k] = v;
      });
    });
    console.log('PILL DEBUG: actId='+actId+' pillMinDist='+pillMinDist+' maxes='+JSON.stringify(maxes)+' dataRows='+dataRows.length);
    dataRows.forEach(function(tr){
      var s=_gF(tr,'data-speed'), d=_gF(tr,'data-dist');
      console.log('PILL DEBUG:   row='+tr.id+' spd='+s+' dist='+d+' res='+tr.getAttribute('data-res')+' match='+(maxes.speed>=0.01&&Math.abs(s-maxes.speed)<0.001&&d>=pillMinDist));
    });
    function _applyPill(mainEl, cond, pillClass, html){
      if(!mainEl){
        console.log('PILL APPLY: SKIP (mainEl null) pillClass='+pillClass+' cond='+cond+' html='+html);
        return;
      }
      var existing = mainEl.querySelector('.'+pillClass);
      var parent = mainEl.parentNode;
      var parentClass = parent ? (parent.className||'') : 'null';
      var parentTag = parent ? parent.tagName : 'null';
      console.log('PILL APPLY: cond='+cond+' pillClass='+pillClass+' html='+html+' mainEl.tagName='+mainEl.tagName+' mainEl.textContent="'+mainEl.textContent+'" existing='+(existing?'yes':'no')+' parent.className="'+parentClass+'" parent.tagName='+parentTag);
      if(cond){
        if(!existing){
          mainEl.innerHTML = '<span class="'+pillClass+'">'+html+'</span>';
          console.log('PILL APPLY: SET innerHTML -> "'+mainEl.innerHTML+'"');
        } else {
          console.log('PILL APPLY: already exists, skipping');
        }
      } else {
        if(existing){
          existing.replaceWith(document.createTextNode(existing.textContent));
          console.log('PILL APPLY: REMOVED existing pill');
        }
      }
    }
    dataRows.forEach(function(tr){
      var speed = _gF(tr,'data-speed');
      var dist = _gF(tr,'data-dist');
      var fcx = _gF(tr,'data-fcx');
      var smax = _gF(tr,'data-smax');
      var cad = _gF(tr,'data-cad');
      var pow = _gF(tr,'data-pow');
      var fcm = _gF(tr,'data-fcm');
      var dur = _gF(tr,'data-dur');
      var isRes = tr.getAttribute('data-res')==='1';
      var isMaxSpeed = !isRes && speed>=0.01 && maxes.speed>=0.01 && Math.abs(speed-maxes.speed)<0.001 && dist>=pillMinDist;
      var isMaxFcx   = !isRes && fcx>0 && maxes.fcx>0 && Math.abs(fcx-maxes.fcx)<0.5;
      var isMaxVmax  = !isRes && smax>=0.3 && maxes.smax>=0.3 && Math.abs(smax-maxes.smax)<0.001;
      var isMaxCad   = !isRes && cad>0 && maxes.cad>0 && Math.round(cad)===Math.round(maxes.cad);
      var isMaxPow   = !isRes && pow>0 && maxes.pow>0 && Math.round(pow)===Math.round(maxes.pow);
      var isMaxFcm   = !isRes && fcm>0 && maxes.fcm>0 && Math.abs(fcm-maxes.fcm)<0.5;
      var isMaxRitmo = isMaxSpeed;
      tr.classList.toggle('fastest-lap', isMaxSpeed);
      var spdCol = tr.querySelector('.col-speed');
      var spdMetric = spdCol ? spdCol.querySelector('.metric') : null;
      var spdMain = spdMetric ? spdMetric.querySelector('.main') : null;
      console.log('PILL DOM: row='+tr.id+' isMaxSpeed='+isMaxSpeed+' spdCol='+(!!spdCol)+' spdMetric='+(!!spdMetric)+' spdMain='+(!!spdMain)+' spdColHTML='+(spdCol?spdCol.innerHTML.substring(0,80):'null'));
      _applyPill(spdMain, isMaxSpeed && speed>=0.01, 'vel-med-pill', _toKmh(speed)+' km/h');
      if(!(m.isContinua && sport === 'RUN')){
        var paceMain = tr.querySelector('.col-pace .metric .main');
        _applyPill(paceMain, isMaxSpeed && speed>=0.01, 'ritmo-pill', _toRitmo(speed));
      }
      if(m.isMoto || (m.isCyc && !m.isInd)){
        var timeMain = tr.querySelector('.col-time .metric .main');
        _applyPill(timeMain, isMaxRitmo && dur>0, 'ritmo-pill', _toStep(dur, m.isMoto?3:1));
      }
      var spdTd = tr.querySelector('.col-speed');
      if(spdTd){
        var nextTd = spdTd.nextElementSibling;
        if(nextTd){
          var nextMain = nextTd.querySelector('.metric .main');
          if(nextMain){
            if(m.isMoto || (m.isCyc && !m.isInd)){
              _applyPill(nextMain, isMaxVmax && smax>=0.3, 'vel-max-pill', (smax*3.6).toFixed(2)+' km/h');
            } else {
              _applyPill(nextMain, isMaxCad && cad>0, 'cad-pill', String(cad));
            }
          }
          if(m.isCyc){
            var powTd = nextTd.nextElementSibling;
            if(powTd && !powTd.classList.contains('col-pace') && !powTd.classList.contains('td-zona')){
              var powMain = powTd.querySelector('.metric .main');
              _applyPill(powMain, isMaxPow && pow>0, 'power-pill', String(pow));
            }
          }
        }
      }
      var zonaTd = tr.querySelector('.td-zona');
      if(zonaTd){
        var fcxTd = zonaTd.previousElementSibling;
        var fcmTd = fcxTd ? fcxTd.previousElementSibling : null;
        if(fcxTd){
          var fcxMain = fcxTd.querySelector('.metric .main');
          _applyPill(fcxMain, isMaxFcx, 'fc-max-pill', String(fcx));
        }
        if(fcmTd){
          var fcmMain = fcmTd.querySelector('.metric .main');
          _applyPill(fcmMain, isMaxFcm && fcm>0, 'fc-med-pill', String(fcm));
        }
      }
    });
  }
  function _refreshAct(actId){
    _DB('REFRESH', '_refreshAct('+actId+') ENTER stack='+new Error().stack.split('\n').slice(1,4).join(' | '));
    if(!actId) return;
    // 1) Dissolve custom groups with <2 children first so .group-lap state can be normalised.
    _recalcCustomGroups(actId);
    // 2) Normalise .group-lap class based on actual DOM position.
    _normalizeGroupLap(actId);
    // 3) Recompute downstream displays.
    _recalcCumTimes(actId);
    _recalcAutoHeaders(actId);
    _recalcAvgRows(actId);
    // 4) Re-evaluate pills on data rows (vel-med-pill, ritmo-pill, fc-max-pill, etc.)
    _recalcPills(actId);
    // 4.5) Recalculate deltas on all lap rows after data edit
    _recalcDeltas(actId);
    // 5) Attach row handlers + ensure actions column without re-creating groups
    if(typeof W._attachRowHandlersToAct==='function') W._attachRowHandlersToAct(actId);
    // 6) Re-apply phase filter if a pill is active
    var act = document.getElementById('act-'+actId);
    if(act){
      var activePill = act.querySelector('.phase-pill.active');
      _DB('REFRESH', 'actId='+actId+' activePill='+(activePill?activePill.getAttribute('data-phase'):'NONE'));
      if(activePill && typeof _setPhaseFilter==='function'){
        var phase = activePill.getAttribute('data-phase');
        if(phase){ _DB('REFRESH', 're-applying phase filter: '+phase); _setPhaseFilter(actId, phase); }
      }
    }
    _dumpFullState('REFRESH: after _refreshAct('+actId+')');
    if(typeof window._dumpRenderedHTML==='function') setTimeout(function(){ window._dumpRenderedHTML(); },0);
  }
  function _rowInAnyGroup(tr){
    return !!tr.getAttribute('data-custom-parent') || tr.classList.contains('group-lap');
  }
  function _doOp(op){
    _DB('STACK', 'doOp type='+op.type+' actId='+op.actId+' id='+op.id);
    try{ if(op.apply) op.apply(); }catch(e){}
    _pushOp(op);
    _refreshAct(op.actId);
    setTimeout(function(){ if(typeof window._dumpRenderedHTML==='function') window._dumpRenderedHTML(); },50);
  }
  function _undoOp(){
    var op = W._editStack.pop();
    if(!op) return;
    _DB('STACK', 'undo type='+op.type+' actId='+op.actId+' id='+op.id);
    try{ if(op.undo) op.undo(); }catch(e){}
    W._editRedo.push(op);
    _refreshAct(op.actId);
    _updateFabState();
    setTimeout(function(){ if(typeof window._dumpRenderedHTML==='function') window._dumpRenderedHTML(); },50);
  }
  function _redoOp(){
    var op = W._editRedo.pop();
    if(!op) return;
    _DB('STACK', 'redo type='+op.type+' actId='+op.actId+' id='+op.id);
    try{ if(op.apply) op.apply(); }catch(e){}
    W._editStack.push(op);
    _refreshAct(op.actId);
    _updateFabState();
    setTimeout(function(){ if(typeof window._dumpRenderedHTML==='function') window._dumpRenderedHTML(); },50);
  }
  W._lapUndoAll = _undoOp;
  W._lapRedoAll = _redoOp;
  W._updateFabState = _updateFabState;
  W._normalizeGroupLap = _normalizeGroupLap;
  W._refreshAct = _refreshAct;
  // Global debug dump
  function _dumpRenderedHTML(){
    var acts=document.querySelectorAll('.actividad');
    console.log('====== RENDERED TABLE HTML ======');
    acts.forEach(function(act){
      var actId=act.id.replace('act-','');
      console.log('--- ACTIVITY: '+actId+' ('+(act.getAttribute('data-title')||'')+') ---');
      var tbody=act.querySelector('tbody');
      if(!tbody) return;
      Array.from(tbody.children).forEach(function(r,i){
        var id=r.id||'(no-id)';
        var cls=(r.className||'').split(' ')[0];
        var dur=parseFloat(r.getAttribute('data-dur'))||0;
        var lbl=r.getAttribute('data-lbl')||'';
        var zones=r.getAttribute('data-zones')||'[]';
        console.log('['+i+'] '+id+' ('+cls+') dur='+dur+' lbl="'+lbl+'"');
        // Print each cell's text content (truncated)
        var cells=r.querySelectorAll('td');
        Array.from(cells).forEach(function(td,ci){
          var cls2=td.className||'';
          var txt=(td.textContent||'').trim().replace(/\s+/g,' ').substring(0,80);
          console.log('  td['+ci+'] cls="'+cls2+'" text="'+txt+'"');
        });
        // Show parsed zones
        try{
          var zr=JSON.parse(zones.replace(/&quot;/g,'"'));
          if(Array.isArray(zr)&&zr.length>0){
            console.log('  ZONES: '+zr.map(function(z){return z.nombre+'='+z.secs+'s';}).join(', '));
          } else {
            console.log('  ZONES: (empty)');
          }
        }catch(e){ console.log('  ZONES: (parse error)'); }
        // Print key data attributes
        console.log('  ATTRS: spd='+r.getAttribute('data-speed')+' dist='+r.getAttribute('data-dist')+' fcm='+r.getAttribute('data-fcm')+' fcx='+r.getAttribute('data-fcx')+' cad='+r.getAttribute('data-cad')+' pow='+r.getAttribute('data-pow'));
        console.log('---');
      });
    });
    console.log('====== END RENDERED HTML ======');
    console.log('STACK: undo='+W._editStack.length+' redo='+W._editRedo.length);
    console.log('UNDO: '+W._editStack.map(function(o){return o.type+'('+o.id+')';}).join(' | '));
    console.log('REDO: '+W._editRedo.map(function(o){return o.type+'('+o.id+')';}).join(' | '));
  }
  W._dumpRenderedHTML=_dumpRenderedHTML;
  function _dumpAllTables(){
    var acts=document.querySelectorAll('.actividad');
    var actsData=[];
    acts.forEach(function(act){
      var actId=act.id.replace('act-','');
      var title=act.getAttribute('data-title')||actId;
      var rows=[];
      var tbody=act.querySelector('tbody');
      act.querySelectorAll('tbody tr').forEach(function(r){
        var cells=[];
        r.querySelectorAll('td').forEach(function(td,i){
          cells.push({i:i,cls:td.className||'',txt:td.textContent.trim().substring(0,50)});
        });
        rows.push({
          id:r.id,cls:r.className,lbl:r.getAttribute('data-lbl')||'',
          dur:parseFloat(r.getAttribute('data-dur'))||0,
          spd:parseFloat(r.getAttribute('data-speed'))||0,
          dist:parseFloat(r.getAttribute('data-dist'))||0,
          fcm:parseFloat(r.getAttribute('data-fcm'))||0,
          fcx:parseFloat(r.getAttribute('data-fcx'))||0,
          cad:parseFloat(r.getAttribute('data-cad'))||0,
          pow:parseFloat(r.getAttribute('data-pow'))||0,
          cells:cells
        });
      });
      actsData.push({actId:actId,title:title,rows:rows,tbodyChildCount:tbody?tbody.children.length:0});
    });
    // Quick summary (always fully visible)
    var summary=[];
    actsData.forEach(function(a){
      a.rows.forEach(function(r){
        summary.push(a.actId+'.'+r.id+' ['+r.cls.split(' ')[0]+'] dur='+r.dur+' lbl="'+r.lbl+'"');
      });
    });
    console.log('=== ROW SUMMARY ===');
    summary.forEach(function(s){console.log('  '+s);});
    console.log('=== TABLE DUMP (full JSON below) ===');
    console.log(JSON.stringify(actsData,null,2));
    console.log('=== STACK === undo:'+W._editStack.length+' redo:'+W._editRedo.length);
    var types=W._editStack.map(function(o){return o.type+'('+o.id+')';});
    console.log('UNDO OPS: '+types.join(' | '));
    var rtypes=W._editRedo.map(function(o){return o.type+'('+o.id+')';});
    console.log('REDO OPS: '+rtypes.join(' | '));
    console.log('=== END DUMP ===');
  }
  W._dumpAllTables = _dumpAllTables;

  // ── Format helpers (reuse existing module-level utilities) ─────────
  function _toKmh(s){ try{ return toKmh(s); }catch(e){ return ''; } }
  function _toRitmo(s){ try{ return toRitmo(s); }catch(e){ return ''; } }
  function _toStep(s,dec){ try{ return secsToStepStr(s,dec); }catch(e){ return ''; } }

  function _actEl(actId){ return document.getElementById('act-'+actId); }
  function _actMeta(actId){
    var act = _actEl(actId); if(!act) return null;
    var sport=act.getAttribute('data-sport')||'RUN';
    return {
      el: act,
      sport: sport,
      isMoto: sport==='MOTO',
      isCyc:  sport==='BICI',
      isInd:  act.getAttribute('data-indoor')==='1',
      isCont: act.getAttribute('data-continua')==='1',
    };
  }

  function _gF(tr,a){ return parseFloat(tr.getAttribute(a))||0; }
  function _gI(tr,a){ return parseInt(tr.getAttribute(a))||0; }
  function _parseZones(tr){
    var raw = tr.getAttribute('data-zones');
    if(!raw) return [];
    try{
      var unesc = raw.replace(/&quot;/g,'"');
      var arr = JSON.parse(unesc);
      return Array.isArray(arr)?arr:[];
    }catch(e){ return []; }
  }
  function _aggregateZones(trs){
    var map = {};
    trs.forEach(function(tr){
      _parseZones(tr).forEach(function(z){
        if(!z||!z.nombre) return;
        if(!map[z.nombre]) map[z.nombre] = { nombre:z.nombre, secs:0, rango:z.rango||'', color:z.color||'' };
        map[z.nombre].secs += (parseFloat(z.secs)||0);
      });
    });
    return Object.values(map).filter(function(z){return z.secs>0;});
  }

  // ── Aggregate visible/active rows ─────────────────────
  function _aggregateRows(trs){
    var dur=0,dist=0,dsn=0,spdW=0,spdD=0,fcmW=0,fcmD=0,
        cadW=0,cadD=0,powW=0,powD=0,
        fcxW=0,fcxD=0,smW=0,smD=0;
    var anyActive=false;
    trs.forEach(function(tr){
      var d=_gF(tr,'data-dur'),
          s=_gF(tr,'data-speed'),
          k=_gF(tr,'data-dist'),
          fm=_gF(tr,'data-fcm'),
          fx=_gF(tr,'data-fcx'),
          c=_gF(tr,'data-cad'),
          p=_gF(tr,'data-pow'),
          sm=_gF(tr,'data-smax'),
          el=_gF(tr,'data-dsn'),
          actAttr=tr.getAttribute('data-active');
      var isActive=(actAttr===null||actAttr==='1');
      if(isActive)anyActive=true;
      if(isActive){ dur+=d; dist+=k; }
      dsn+=el;
      if(s>0&&d>0&&isActive){ spdW+=s*d; spdD+=d; }
      if(fm>0&&d>0){ fcmW+=fm*d; fcmD+=d; }
      if(fx>0&&d>0){ fcxW+=fx*d; fcxD+=d; }
      if(c>0&&d>0&&isActive){ cadW+=c*d; cadD+=d; }
      if(p>0&&d>0&&isActive){ powW+=p*d; powD+=d; }
      if(sm>0&&d>0&&isActive){ smW+=sm*d; smD+=d; }
    });
    if(!anyActive){
      dur=0;dist=0;spdW=0;spdD=0;cadW=0;cadD=0;powW=0;powD=0;smW=0;smD=0;
      trs.forEach(function(tr){
        var d=_gF(tr,'data-dur'),s=_gF(tr,'data-speed'),k=_gF(tr,'data-dist'),
            c=_gF(tr,'data-cad'),p=_gF(tr,'data-pow'),sm=_gF(tr,'data-smax');
        dur+=d;dist+=k;
        if(s>0&&d>0){spdW+=s*d;spdD+=d;}
        if(c>0&&d>0){cadW+=c*d;cadD+=d;}
        if(p>0&&d>0){powW+=p*d;powD+=d;}
        if(sm>0&&d>0){smW+=sm*d;smD+=d;}
      });
    }
    return {
      dur:dur, dist:dist, dsn:dsn,
      speed: spdD>0?spdW/spdD:0,
      fcm: fcmD>0?Math.round(fcmW/fcmD):0,
      fcx: fcxD>0?Math.round(fcxW/fcxD):0,
      cad: cadD>0?Math.round(cadW/cadD):0,
      pow: powD>0?Math.round(powW/powD):0,
      smax: smD>0?smW/smD:0,
      zonas: _aggregateZones(trs)
    };
  }

  // Map a thead <th> to a column type — used to render the custom header in the
  // exact column order of the host table (handles moto/bici/indoor/continua variants).
  function _colTypeOfTh(th){
    var cls=(th.className||'').toLowerCase();
    var txt=(th.textContent||'').toLowerCase();
    if(/col-lap/.test(cls) && !/col-pace|col-time|col-cum/.test(cls)) return 'lap';
    if(/col-cum-time/.test(cls)) return 'cum-time';
    if(/col-time/.test(cls)) return 'time';
    if(/col-dist/.test(cls) || /distancia/.test(txt)) return 'dist';
    if(/th-zona|col-zone|^zona/.test(cls) || /^zona\b/.test(txt)) return 'zona';
    if(/fc\s*med/.test(txt)) return 'fcm';
    if(/fc\s*máx|fc\s*max/.test(txt)) return 'fcx';
    if(/vel.*máx|vel\.\s*máx|vel.*max/.test(txt)) return 'vmax';
    if(/vel.*med|vel\.\s*med/.test(txt)) return 'spd';
    if(/cadencia/.test(txt)) return 'cad';
    if(/ritmo/.test(txt)) return 'pace';
    if(/potencia/.test(txt)) return 'pow';
    return 'label';
  }

  // Calcula los valores maximos de cada metrica leyendo data-* de las filas
  // de datos visibles del tbody. Sirve para decidir si una celda del header
  // custom debe envolverse en su pill (vel-max-pill, ritmo-pill, cad-pill,
  // power-pill, fc-max-pill, fc-med-pill).
  function _domMaxes(table){
    var max={smax:0,speed:0,fcm:0,fcx:0,cad:0,pow:0};
    table.querySelectorAll(':scope > tbody > tr').forEach(function(tr){
      if(tr.classList.contains('row-hidden')) return;
      if(tr.classList.contains('avg-row')||tr.classList.contains('avg-act')) return;
      if(tr.classList.contains('group-header')||tr.classList.contains('phase-header')||tr.classList.contains('custom-group-header')) return;
      if(tr.getAttribute('data-res')==='1') return;
      var keys=['smax','speed','fcm','fcx','cad','pow'];
      keys.forEach(function(k){
        var v=parseFloat(tr.getAttribute('data-'+k))||0;
        if(v>max[k]) max[k]=v;
      });
    });
    return max;
  }
    // Max across summary headers only (group-header/phase-header/custom-group-header),
    // so pills on summary rows reflect best value among summaries. excludeId optionally
    // skips a header. extraVals includes the current group's own agg so it's considered.
    function _summaryMaxes(table, excludeId, extraVals){
      var max={smax:0,speed:0,fcm:0,fcx:0,cad:0,pow:0};
      var sel=['custom-group-header','group-header','phase-header'].map(function(c){return ':scope > tbody > tr.'+c;}).join(',');
      table.querySelectorAll(sel).forEach(function(tr){
        if(tr.classList.contains('row-hidden')) return;
        if(excludeId && (tr.id===excludeId||tr.getAttribute('data-custom-group')===excludeId)) return;
        // Exclude very short summaries (<5s) from pill contention to avoid 1-second
        // transitional laps (e.g. "Enfriamiento 21" with 13.5 km/h) stealing the pill
        // from genuine working summaries.
        if((parseFloat(tr.getAttribute('data-dur'))||0) < 5) return;
        ['smax','speed','fcm','fcx','cad','pow'].forEach(function(k){
          var v=parseFloat(tr.getAttribute('data-'+k))||0;
          if(v>max[k]) max[k]=v;
        });
      });

      if(extraVals){
        ['smax','speed','fcm','fcx','cad','pow'].forEach(function(k){
          if(extraVals[k]>max[k]) max[k]=extraVals[k];
        });
      }
      return max;
    }
  function _lapRangeFromChildren(children){
    var nums=[];
    children.forEach(function(tr){
      var td=tr.querySelector('td.col-lap');
      var txt=td?td.textContent.trim():'';
      if(/^\d+$/.test(txt)) nums.push(parseInt(txt,10));
    });
    if(nums.length){
      var a=Math.min.apply(null,nums), b=Math.max.apply(null,nums);
      return a===b?String(a):a+'-'+b;
    }
    return '';
  }
  function _buildHeaderHtml(actId, groupId, label, agg, cumSecs, ref, allChildDesc, children){
    var act = _actEl(actId); if(!act) return '';
    var table = act.querySelector('table'); if(!table) return '';
    var ths = Array.from(table.querySelectorAll('thead tr:not(.th-actions-row) th'));
    if(ths[0] && ths[0].classList.contains('col-actions')) ths.shift();
    if(!ths.length) return '';
    var m = _actMeta(actId);
    var dec = m && m.isMoto ? 3 : 1;
    var types = ths.map(_colTypeOfTh);
    types[0] = 'label';
    // Pre-calcula valores max de otros resumenes para envolver el agregado del grupo en pills.
    var maxes=_summaryMaxes(table, groupId, agg);
    var _short = (agg.dur||0) < 5; // transitional laps (<5s) don't get pills
    function fx(v,d){d=d||2;return (Math.round(v*Math.pow(10,d))/Math.pow(10,d)).toFixed(d);}
    var isMaxSpeed = !_short && !allChildDesc && agg.speed>=0.01 && maxes.speed>=0.01 && Math.abs(agg.speed-maxes.speed)<0.001;
    var isMaxVmax  = !_short && !allChildDesc && agg.smax>=0.3 && maxes.smax>=0.3 && Math.abs(agg.smax-maxes.smax)<0.001;
    var isMaxCad   = !_short && !allChildDesc && agg.cad>0 && maxes.cad>0 && Math.round(agg.cad)===Math.round(maxes.cad);
    var isMaxPow   = !_short && !allChildDesc && agg.pow>0 && maxes.pow>0 && Math.round(agg.pow)===Math.round(maxes.pow);
    var isMaxFcm   = !_short && agg.fcm>0 && maxes.fcm>0 && Math.abs(agg.fcm-maxes.fcm)<0.5;
    var isMaxFcx   = !_short && agg.fcx>0 && maxes.fcx>0 && Math.abs(agg.fcx-maxes.fcx)<0.5;
    var isMaxRitmo = isMaxSpeed; // mismo criterio: la velocidad mas alta tiene tambien el ritmo mas rapido
    var zonaCellFn = (typeof zonaCellHtml==='function')?zonaCellHtml:null;
    var zonaHtml = (zonaCellFn && agg.zonas && agg.zonas.length)
                  ? zonaCellFn(agg.zonas, true)
                  : '<td class="td-zona" style="color:#333;text-align:center">—</td>';
    var cells = types.map(function(type){
      switch(type){
        case 'label':
          return '<td>'
            + '<span class="lap-handle" onclick="event.stopPropagation()" title="Arrastrar grupo">☰</span>'
            + '<span class="group-arrow">▼</span>'
            + '<span class="group-lbl-edit" contenteditable="true" spellcheck="false"'
            + ' onclick="event.stopPropagation()"'
            + ' onkeydown="if(event.key===\'Enter\'){event.preventDefault();this.blur();}"'
            + ' onblur="_renameCustomGroup(\''+actId+'\',\''+groupId+'\',this.textContent)"'
            + ' title="Doble clic para renombrar">'+(label||'Grupo')+'</span>'
            + ' <button class="hide-btn" onclick="event.stopPropagation();_hideGroup(\''+groupId+'\',\''+actId+'\')" title="Ocultar grupo">✕</button>'
            + ' <button class="ungroup-btn" onclick="event.stopPropagation();_ungroupCustom(\''+actId+'\',\''+groupId+'\')" title="Deshacer grupo">⊟</button>'
            + '</td>';
        case 'lap': {
          var lr = children && children.length ? _lapRangeFromChildren(children) : '';
          return '<td class="col-lap" style="font-weight:600">' + lr + '</td>';
        }
        case 'time': {
          var tval = agg.dur?_toStep(agg.dur,dec):'—';
          var tDisp = (isMaxRitmo && agg.dur)?'<span class="ritmo-pill">'+tval+'</span>':tval;
          return '<td class="col-time"><div class="metric"><div class="main">'+tDisp+'</div>'+(ref?dTimeSecs(agg.dur,ref.dur,dec):'')+'</div></td>';
        }
        case 'cum-time': return '<td class="col-cum-time"><div class="metric"><div class="main" style="font-size:10px;color:#5a6070">'+(cumSecs?_toStep(cumSecs,dec):'—')+'</div></div></td>';
        case 'dist': {
          var elevAbs = agg.dsn>0?'<div class="elev dp">▲ +'+Math.round(agg.dsn)+'m</div>':'';
          var distDelta = ref?dDist(agg.dist,ref.dist,false):'';
          var elevDelta = ref?dElev(agg.dsn,ref.dsn,false):'';
          var elevBlock = (typeof distElevHtml==='function')?distElevHtml(distDelta,elevDelta,agg.dsn,!!ref):elevAbs;
          return '<td class="col-dist" style="padding-left:14px;padding-right:14px"><div class="metric"><div class="main">'+(agg.dist>=0.01?agg.dist.toFixed(2)+' km':'—')+'</div>'+elevBlock+'</div></td>';
        }
        case 'spd': {
          var sv = agg.speed>=0.01?_toKmh(agg.speed)+' km/h':'—';
          var sDisp = (isMaxSpeed && agg.speed>=0.01)?'<span class="vel-med-pill">'+sv+'</span>':sv;
          return '<td><div class="metric"><div class="main">'+sDisp+'</div>'+(ref?dKmh(agg.speed,ref.speed):'')+'</div></td>';
        }
        case 'vmax': {
          var vmv = agg.smax>=0.3?(agg.smax*3.6).toFixed(2)+' km/h':'—';
          var vmDisp = (isMaxVmax && agg.smax>=0.3)?'<span class="vel-max-pill">'+vmv+'</span>':vmv;
          return '<td><div class="metric"><div class="main">'+vmDisp+'</div>'+(ref?dSpeedMax(agg.smax,ref.smax):'')+'</div></td>';
        }
        case 'cad': {
          var cv = agg.cad>0?agg.cad:'—';
          var cDisp = (isMaxCad && agg.cad>0)?'<span class="cad-pill">'+cv+'</span>':cv;
          return '<td><div class="metric"><div class="main">'+cDisp+'</div>'+((ref&&agg.cad&&ref.cad)?_dCadRaw(agg.cad,ref.cad):'')+'</div></td>';
        }
        case 'pace': {
          var pv = agg.speed>=0.01?_toRitmo(agg.speed):'—';
          var pDisp = (isMaxRitmo && agg.speed>=0.01)?'<span class="ritmo-pill">'+pv+'</span>':pv;
          return '<td><div class="metric"><div class="main">'+pDisp+'</div>'+(ref?dRitmo(agg.speed,ref.speed):'')+'</div></td>';
        }
        case 'pow': {
          var pwv = agg.pow>0?agg.pow:'—';
          var pwDisp = (isMaxPow && agg.pow>0)?'<span class="power-pill">'+pwv+'</span>':pwv;
          return '<td><div class="metric"><div class="main">'+pwDisp+'</div>'+((ref&&ref.pow>0)?_dPotencia(agg.pow,ref.pow):'')+'</div></td>';
        }
        case 'fcm': {
          var fmv = agg.fcm>0?agg.fcm:'—';
          var fmDisp = (isMaxFcm && agg.fcm>0)?'<span class="fc-med-pill">'+fmv+'</span>':fmv;
          return '<td><div class="metric"><div class="main">'+fmDisp+'</div>'+(ref?dFC(agg.fcm,ref.fcm):'')+'</div></td>';
        }
        case 'fcx': {
          var fxv = agg.fcx>0?agg.fcx:'—';
          var fxDisp = (isMaxFcx && agg.fcx>0)?'<span class="fc-max-pill">'+fxv+'</span>':fxv;
          return '<td><div class="metric"><div class="main">'+fxDisp+'</div>'+(ref?dFC(agg.fcx,ref.fcx):'')+'</div></td>';
        }
        case 'zona': return zonaHtml;
        default:     return '<td></td>';
      }
    });
    var zJson = '';
    try{ zJson = JSON.stringify(agg.zonas||[]).replace(/"/g,'&quot;'); }catch(e){ zJson='[]'; }
    var attrs = ' data-custom-group="'+groupId+'" data-lbl="'+(label||'').replace(/"/g,'&quot;')
              + '" data-dur="'+agg.dur+'" data-speed="'+agg.speed+'" data-dist="'+agg.dist+'" data-fcm="'+agg.fcm
              + '" data-fcx="'+agg.fcx+'" data-cad="'+agg.cad+'" data-pow="'+agg.pow
              + '" data-smax="'+agg.smax+'" data-dsn="'+agg.dsn+'" data-active="1" data-res="0"'
              + ' data-zones="'+zJson+'"';
    return '<tr id="'+groupId+'"'+attrs+' onclick="if(!event.target.closest(\'.lap-label-edit,.group-lbl-edit\')&&event.target.tagName!==\'INPUT\'&&event.target.tagName!==\'BUTTON\')_toggleGroup(\''+groupId+'\')" class="custom-group-header step-summary'+(isMaxSpeed?' fastest-lap':'')+'">'+cells.join('')+'</tr>';
  }

  // ── Find table rows that are draggable data rows ──
  function _dataRowsOf(table){
    return Array.from(table.querySelectorAll('tbody tr')).filter(function(tr){
      if(tr.classList.contains('avg-row')||tr.classList.contains('avg-act')) return false;
      if(tr.classList.contains('row-hidden')) return false;
      return tr.hasAttribute('data-dur')||tr.hasAttribute('data-custom-group');
    });
  }
  function _childRowsOfHeader(headerTr){
    var rows=[], next=headerTr.nextElementSibling;
    var gid = headerTr.id || headerTr.getAttribute('data-custom-group');
    while(next){
      if(next.classList.contains('row-hidden')){ next=next.nextElementSibling; continue; }
      if(next.getAttribute && next.getAttribute('data-custom-parent')===gid){
        rows.push(next);
      } else if(next.classList.contains('group-lap') && headerTr.classList.contains('custom-group-header')){
        // legacy group-lap inside a custom group (children with no explicit attr)
        rows.push(next);
      } else {
        break;
      }
      next = next.nextElementSibling;
    }
    return rows;
  }

  // Cumulative time up to a header (sum of preceding leaf data rows + the header's own children duration)
  function _cumSecsAtHeader(headerTr, children){
    var act = headerTr.closest('.actividad'); if(!act) return 0;
    var allRows = Array.from(act.querySelectorAll('tbody tr'));
    var idx = allRows.indexOf(headerTr);
    if(idx < 0) return 0;
    var cum = 0;
    for(var i=0;i<idx;i++){
      var r = allRows[i];
      if(r.classList.contains('row-hidden')) continue;
      if(r.classList.contains('avg-row')||r.classList.contains('avg-act')) continue;
      if(r.classList.contains('group-header')||r.classList.contains('phase-header')||r.classList.contains('custom-group-header')) continue;
      cum += _gF(r,'data-dur');
    }
    (children||[]).forEach(function(tr){ if(!tr.classList.contains('row-hidden')) cum += _gF(tr,'data-dur'); });
    return cum;
  }
  // Legacy alias for custom groups (children fetched via _childRowsOfHeader)
  function _cumSecsUpTo(headerTr){
    return _cumSecsAtHeader(headerTr, _childRowsOfHeader(headerTr));
  }
  function _rangeFromChildren(children){
    var nums=[];
    children.forEach(function(r){
      var lbl = r.getAttribute('data-lbl')||'';
      var vt = r.querySelector('td.col-lap');
      var src = (vt?(vt.textContent||''):'').trim() || lbl;
      String(src).split(/\D+/).forEach(function(p){var n=parseInt(p);if(n)nums.push(n);});
    });
    if(!nums.length) return '';
    var a=Math.min.apply(null,nums), b=Math.max.apply(null,nums);
    return a===b?String(a):a+' - '+b;
  }

  // Children of an auto header (group-header/phase-header): siblings until next peer header,
  // excluding rows already belonging to a nested custom group.
  function _autoHeaderChildren(headerTr){
    var maxChildren=parseInt(headerTr.getAttribute('data-child-count'))||0;
    var rows=[], next=headerTr.nextElementSibling;
    while(next){
      if(next.classList.contains('avg-row')||next.classList.contains('avg-act')) break;
      if(next.classList.contains('group-header')||next.classList.contains('phase-header')||next.classList.contains('group-boundary')) break;
      if(next.classList.contains('custom-group-header')){
        next = next.nextElementSibling; continue;
      }
      if(next.classList.contains('row-hidden')){ next = next.nextElementSibling; continue; }
      if(!next.hasAttribute('data-dur')){ next = next.nextElementSibling; continue; }
      // Skip rows that belong to a nested custom group
      var cp = next.getAttribute('data-custom-parent');
      if(cp){ next = next.nextElementSibling; continue; }
      rows.push(next);
      if(maxChildren&&rows.length>=maxChildren) break;
      next = next.nextElementSibling;
    }
    return rows;
  }

  // Find the previous visible peer header (group/phase/custom) to use as delta reference.
  function _prevPeerHeader(headerTr){
    var node = headerTr.previousElementSibling;
    while(node){
      if(!node.classList.contains('row-hidden')
         && (node.classList.contains('group-header')
             ||node.classList.contains('phase-header')
             ||node.classList.contains('custom-group-header'))){
        return node;
      }
      node = node.previousElementSibling;
    }
    return null;
  }
  function _aggFromHeader(h){
    if(!h) return null;
    return {
      dur:_gF(h,'data-dur'), speed:_gF(h,'data-speed'), dist:_gF(h,'data-dist'),
      fcm:_gF(h,'data-fcm'), fcx:_gF(h,'data-fcx'),
      cad:_gF(h,'data-cad'), pow:_gF(h,'data-pow'),
      smax:_gF(h,'data-smax'), dsn:_gF(h,'data-dsn')
    };
  }

  // Etiqueta derivada del contenido del grupo: tipos únicos de los hijos en orden
  // de aparición, separados por " - ". Los descansos se omiten salvo cuando son el
  // único tipo (entonces el grupo se muestra como "Descanso"). Las etiquetas con
  // sufijo numérico se colapsan ("Km 1", "Km 2" → "Km"; "Vuelta 3", "Vuelta 4" →
  // "Vuelta"), para que un grupo de 5 km no aparezca como "Km 1 - Km 2 - Km 3…".
  // En continuas (las vueltas vienen como data-lbl="1","2","3"… o "—") usamos
  // data-active para devolver "Carrera"/"Descanso" en vez de quedarnos en "Grupo".
  function _deriveLabelFromChildren(children){
    var nonRest=[], seen={}, hasRest=false, hasActive=false;
    var restRe=/^(descanso|rest|rec\s*\d+)$/i;
    var collapseRe=/^(km|vuelta|lap|tramo|interval[oa]?)\s*\d+/i;
    children.forEach(function(tr){
      var lbl=(tr.getAttribute('data-lbl')||'').trim();
      var isActive=tr.getAttribute('data-active')!=='0';
      // Sin info semántica en el label (puro número, vacío o "—"): clasifica vía data-active.
      if(!lbl||/^\d+$/.test(lbl)||lbl==='—'){
        if(isActive) hasActive=true; else hasRest=true;
        return;
      }
      if(restRe.test(lbl)){ hasRest=true; return; }
      var m=lbl.match(collapseRe);
      if(m){ lbl=m[1].charAt(0).toUpperCase()+m[1].slice(1).toLowerCase(); }
      var key=lbl.toLowerCase();
      if(seen[key]) return;
      seen[key]=true;
      nonRest.push(lbl);
    });
    if(nonRest.length) return nonRest.join(' - ');
    if(hasActive) return 'Carrera';
    if(hasRest) return 'Descanso';
    return '';
  }

  // Reescribe el texto del label en la primera celda del header conservando el
  // ▼/▶ (group-arrow con su estado collapsed) y el botón ✕ (hide-btn). No toca
  // headers custom — esos tienen .group-lbl-edit contenteditable y su nombre lo
  // pone el usuario.
  function _setAutoHeaderLabel(headerTr, newLabel){
    if(!newLabel) return;
    var tds=Array.from(headerTr.children);
    if(tds[0] && tds[0].classList.contains('col-actions')) tds.shift();
    var td=tds[0]; if(!td) return;
    if(td.querySelector('.group-lbl-edit')) return; // custom header — no tocar
    var editSpan=td.querySelector('.lap-label-edit');
    if(editSpan){
      editSpan.textContent=_normalizeLabel(newLabel);
      headerTr.setAttribute('data-lbl', newLabel);
      return;
    }
    var arrow=td.querySelector('.group-arrow');
    var hideBtn=td.querySelector('.hide-btn');
    Array.from(td.childNodes).forEach(function(n){ if(n.nodeType===3) td.removeChild(n); });
    if(arrow){
      arrow.insertAdjacentText('afterend', newLabel);
    } else if(hideBtn){
      td.insertBefore(document.createTextNode(newLabel), hideBtn);
    } else {
      td.appendChild(document.createTextNode(newLabel));
    }
    headerTr.setAttribute('data-lbl', newLabel);
  }

  // Update an auto-generated header (group-header / phase-header) in place: refresh data-* and
  // visible cells (time, cum-time, dist, vel-med, cad/vmax, pace/pow, FC med/max, zona).
  function _updateAutoHeader(headerTr, children){
    if(!children.length){
      headerTr.classList.add('row-hidden','auto-empty');
      return;
    }
    headerTr.classList.remove('row-hidden','auto-empty');
    var agg = _aggregateRows(children);
    var cumSecs = _cumSecsAtHeader(headerTr, children);
    _updateHeaderAttrs(headerTr, agg);
    _setAutoHeaderLabel(headerTr, _deriveLabelFromChildren(children));
    _updateHeaderCells(headerTr, agg, cumSecs, children);
  }

  function _updateHeaderAttrs(headerTr, agg){
    headerTr.setAttribute('data-dur', agg.dur);
    headerTr.setAttribute('data-speed', agg.speed);
    headerTr.setAttribute('data-dist', agg.dist);
    headerTr.setAttribute('data-fcm', agg.fcm);
    headerTr.setAttribute('data-fcx', agg.fcx);
    headerTr.setAttribute('data-cad', agg.cad);
    headerTr.setAttribute('data-pow', agg.pow);
    headerTr.setAttribute('data-smax', agg.smax);
    headerTr.setAttribute('data-dsn', agg.dsn);
    try{ headerTr.setAttribute('data-zones', JSON.stringify(agg.zonas||[]).replace(/"/g,'&quot;')); }catch(e){}
  }

  function _updateHeaderCells(headerTr, agg, cumSecs, children){
    var act = headerTr.closest('.actividad'); if(!act) return;
    var actId = act.id.replace(/^act-/, '');
    var m = _actMeta(actId);
    var dec = m && m.isMoto ? 3 : 1;

    // Reference for deltas: previous visible peer header (group/phase/custom).
    var ref = _aggFromHeader(_prevPeerHeader(headerTr));

    // Update visible cells. We match cells by their column class when present.
    var tds = Array.from(headerTr.children);
    if(tds[0] && tds[0].classList.contains('col-actions')) tds.shift();
    function findTd(cls){ return headerTr.querySelector('td.'+cls); }
    function setMain(td, html, deltaHtml){
      if(!td) return;
      var main = td.querySelector('.metric .main');
      if(main){
        main.innerHTML = html;
        // Reemplazar la línea de delta (.sub) con la recalculada respecto al header anterior
        Array.from(td.querySelectorAll('.metric .sub')).forEach(function(s){s.remove();});
        Array.from(td.querySelectorAll('.metric .elev')).forEach(function(el){el.remove();});
        if(deltaHtml) main.insertAdjacentHTML('afterend', deltaHtml);
      } else {
        td.innerHTML = html;
      }
    }
    // col-lap → range derived from children
    var tdLap = findTd('col-lap');
    if(tdLap) tdLap.textContent = _rangeFromChildren(children);
    // time (con pill de ritmo para el grupo mas rapido en MOTO/CICLISMO) — se actualiza
    // en el switch de tipos abajo, junto al resto de pills. Dejamos el td como está aquí.
    // cum-time (sin delta)
    var tdCum = findTd('col-cum-time');
    if(tdCum) setMain(tdCum, cumSecs?_toStep(cumSecs,dec):'—');
    // dist + desnivel (con delta recalculado vs header anterior)
    var tdDist = findTd('col-dist');
    if(tdDist){
      var elevAbs = agg.dsn>0?'<div class="elev dp">▲ +'+Math.round(agg.dsn)+'m</div>':'';
      var distDelta = ref?dDist(agg.dist,ref.dist,false):'';
      var elevDelta = ref?dElev(agg.dsn,ref.dsn,false):'';
      var metric = tdDist.querySelector('.metric');
      var inner = '<div class="main">'+(agg.dist>=0.01?agg.dist.toFixed(2)+' km':'—')+'</div>'
                + (typeof distElevHtml==='function' ? distElevHtml(distDelta,elevDelta,agg.dsn,!!ref) : elevAbs);
      if(metric){ metric.innerHTML = inner; }
      else { tdDist.innerHTML = '<div class="metric">'+inner+'</div>'; }
    }
    // For the remaining columns we walk thead types and update by index (skipping label/lap/time/cum/dist already handled)
    var ths = Array.from(act.querySelectorAll('thead tr:not(.th-actions-row) th'));
    if(ths[0] && ths[0].classList.contains('col-actions')) ths.shift();
    var types = ths.map(_colTypeOfTh); types[0]='label';
    // Skip pills for rest-only groups (all children are descanso/inactive)
    var _allChildDesc=children&&children.length>0&&children.every(function(tr){return tr.getAttribute('data-active')==='0';});
    // Pills condicionales basadas en el max de la tabla
    var table = act.querySelector('table');
    var maxes = _summaryMaxes(table, headerTr.id, agg);
    var _short = (agg.dur||0) < 5; // transitional laps (<5s) don't get pills
    function _fx(v,d){d=d||2;return (Math.round(v*Math.pow(10,d))/Math.pow(10,d)).toFixed(d);}
    var _isMaxSpeed = !_short && !_allChildDesc && agg.speed>=0.01 && maxes.speed>=0.01 && Math.abs(agg.speed-maxes.speed)<0.001;
    var _isMaxVmax  = !_short && !_allChildDesc && agg.smax>=0.3 && maxes.smax>=0.3 && Math.abs(agg.smax-maxes.smax)<0.001;
    var _isMaxCad   = !_short && !_allChildDesc && agg.cad>0 && maxes.cad>0 && Math.round(agg.cad)===Math.round(maxes.cad);
    var _isMaxPow   = !_short && !_allChildDesc && agg.pow>0 && maxes.pow>0 && Math.round(agg.pow)===Math.round(maxes.pow);
    var _isMaxFcm   = !_short && agg.fcm>0 && maxes.fcm>0 && Math.abs(agg.fcm-maxes.fcm)<0.5;
    var _isMaxFcx   = !_short && agg.fcx>0 && maxes.fcx>0 && Math.abs(agg.fcx-maxes.fcx)<0.5;
    var _isMaxRitmo = _isMaxSpeed;
    // Sync fastest-lap row class: remove from descanso-only groups, set on the group with max speed
    headerTr.classList.toggle('fastest-lap', _isMaxSpeed);
    types.forEach(function(t, i){
      var td = tds[i];
      if(!td) return;
      switch(t){
        case 'spd':  setMain(td, _isMaxSpeed?'<span class="vel-med-pill">'+_toKmh(agg.speed)+' km/h</span>':(agg.speed>=0.01?_toKmh(agg.speed)+' km/h':'—'), ref?dKmh(agg.speed,ref.speed):''); break;
        case 'time': var _tp = m && (m.isMoto || (m.isCyc && !m.isInd)) && _isMaxRitmo; setMain(td, agg.dur?(_tp?'<span class="ritmo-pill">'+_toStep(agg.dur,dec)+'</span>':_toStep(agg.dur,dec)):'—', ref?dTimeSecs(agg.dur,ref.dur,dec):''); break;
        case 'vmax': setMain(td, _isMaxVmax?'<span class="vel-max-pill">'+(agg.smax*3.6).toFixed(2)+' km/h</span>':(agg.smax>=0.3?(agg.smax*3.6).toFixed(2)+' km/h':'—'), ref?dSpeedMax(agg.smax,ref.smax):''); break;
        case 'cad':  setMain(td, _isMaxCad?'<span class="cad-pill">'+agg.cad+'</span>':(agg.cad>0?String(agg.cad):'—'), (ref&&agg.cad&&ref.cad)?_dCadRaw(agg.cad,ref.cad):''); break;
        case 'pace': setMain(td, _isMaxSpeed?'<span class="ritmo-pill">'+_toRitmo(agg.speed)+'</span>':(agg.speed>=0.01?_toRitmo(agg.speed):'—'), ref?dRitmo(agg.speed,ref.speed):''); break;
        case 'pow':  setMain(td, _isMaxPow?'<span class="power-pill">'+agg.pow+'</span>':(agg.pow>0?String(agg.pow):'—'), (ref&&ref.pow>0)?_dPotencia(agg.pow,ref.pow):''); break;
        case 'fcm':  setMain(td, _isMaxFcm?'<span class="fc-med-pill">'+agg.fcm+'</span>':(agg.fcm>0?String(agg.fcm):'—'), ref?dFC(agg.fcm,ref.fcm):''); break;
        case 'fcx':  setMain(td, _isMaxFcx?'<span class="fc-max-pill">'+agg.fcx+'</span>':(agg.fcx>0?String(agg.fcx):'—'), ref?dFC(agg.fcx,ref.fcx):''); break;
        case 'zona': {
          var html = (typeof zonaCellHtml==='function' && agg.zonas && agg.zonas.length)
                    ? zonaCellHtml(agg.zonas, true)
                    : '<td class="td-zona" style="color:#333;text-align:center">—</td>';
          var tmp = document.createElement('tbody');
          tmp.innerHTML = '<tr>'+html+'</tr>';
          var newTd = tmp.querySelector('td');
          if(newTd) td.parentNode.replaceChild(newTd, td);
          break;
        }
      }
    });
  }

  function _recalcAutoHeaders(actId){
    _DB('RECALC', '_recalcAutoHeaders actId='+actId);
    var act = _actEl(actId); if(!act) return;
    var headers = Array.from(act.querySelectorAll('tr.group-header, tr.phase-header'));
    // Pass 1: compute children, update data-*, hide/show — no pills yet
    var results = [];
    headers.forEach(function(h){
      var children = _autoHeaderChildren(h);
      if(!children.length){
        h.classList.add('row-hidden','auto-empty');
        results.push(null);
        return;
      }
      h.classList.remove('row-hidden','auto-empty');
      var agg = _aggregateRows(children);
      var cumSecs = _cumSecsAtHeader(h, children);
      h.setAttribute('data-dur', agg.dur);
      h.setAttribute('data-speed', agg.speed);
      h.setAttribute('data-dist', agg.dist);
      h.setAttribute('data-fcm', agg.fcm);
      h.setAttribute('data-fcx', agg.fcx);
      h.setAttribute('data-cad', agg.cad);
      h.setAttribute('data-pow', agg.pow);
      h.setAttribute('data-smax', agg.smax);
      h.setAttribute('data-dsn', agg.dsn);
      try{ h.setAttribute('data-zones', JSON.stringify(agg.zonas||[]).replace(/"/g,'&quot;')); }catch(e){}
      var derivedLabel = _deriveLabelFromChildren(children);
      _setAutoHeaderLabel(h, derivedLabel);
      // Propagar el tipo solo a hijos sin label semántico (numérico, vacío, "—", descanso)
      if(derivedLabel){
        children.forEach(function(child){
          var clbl=(child.getAttribute('data-lbl')||'').trim();
          if(clbl&&!/^\d+$/.test(clbl)&&clbl!=='—'&&!/^(descanso|rest|rec\s*\d+)$/i.test(clbl)) return;
          child.setAttribute('data-lbl', derivedLabel);
          var span = child.querySelector('.lap-label-edit');
          if(span) span.textContent = _normalizeLabel(derivedLabel);
        });
      }
      results.push({header:h, children:children, agg:agg, cumSecs:cumSecs});
    });
    // Pass 2: update visible cells + pills — all headers now have correct data-*
    results.forEach(function(r){
      if(!r) return;
      _updateHeaderCells(r.header, r.agg, r.cumSecs, r.children);
    });
  }

  // ── Recalculate custom group headers in real time ──
  function _recalcCustomGroups(actId){
    _DB('RECALC', '_recalcCustomGroups actId='+actId);
    var act = _actEl(actId); if(!act) return;
    act.querySelectorAll('tr.custom-group-header').forEach(function(headerTr){
      var children = _childRowsOfHeader(headerTr);
      var visible = children.filter(function(tr){ return !tr.classList.contains('row-hidden'); });
      if(!visible.length){
        headerTr.remove();
        return;
      }
      if(visible.length<2){
        // Group of one — auto-dissolve so we don't leave a useless header
        var only = visible[0];
        only.removeAttribute('data-custom-parent');
        only.classList.remove('custom-group-child');
        only.classList.remove('group-lap');
        _removeRowIndent(only);
        headerTr.remove();
        return;
      }
      var agg = _aggregateRows(visible);
      // Si el usuario no ha renombrado a mano el grupo (data-user-named=1),
      // derivamos el label del contenido — misma lógica que los headers auto.
      var label = headerTr.getAttribute('data-lbl')||'Grupo';
      var userNamed = headerTr.getAttribute('data-user-named')==='1';
      if(!userNamed){
        var derived = _deriveLabelFromChildren(visible);
        if(derived){
          label = derived;
          headerTr.setAttribute('data-lbl', derived);
        }
      }
      var gid = headerTr.id;
      var cumSecs = _cumSecsAtHeader(headerTr, visible);
      var ref = _aggFromHeader(_prevPeerHeader(headerTr));
      var _cdAll = visible.length > 0 && visible.every(function(tr){return tr.getAttribute('data-active')==='0';});
      var newHtml = _buildHeaderHtml(actId, gid, label, agg, cumSecs, ref, _cdAll, visible);
      var tmp = document.createElement('tbody');
      tmp.innerHTML = newHtml;
      var newTr = tmp.firstElementChild;
      headerTr.parentNode.replaceChild(newTr, headerTr);
      _attachRowHandlers(newTr);
    });
    _saveCustomGroupsState(actId);
    var table = act.querySelector('table');
    if(table) _ensureActionsColumn(table);
  }

  // Rename a custom group (callable from contenteditable label onblur)
  W._renameCustomGroup = function(actId, groupId, newName){
    var hdr = document.getElementById(groupId); if(!hdr) return;
    var clean = (newName||'').trim() || 'Grupo';
    var old = hdr.getAttribute('data-lbl')||'';
    var oldUserNamed = hdr.getAttribute('data-user-named')==='1';
    if(clean===old) return;
    var op = {
      actId: actId, type: 'rename',
      apply: function(){
        var h=document.getElementById(groupId); if(!h) return;
        h.setAttribute('data-lbl', clean);
        // Marca el grupo como renombrado por el usuario — desactiva la
        // autoderivación a partir del contenido en _recalcCustomGroups.
        // Si lo dejan en blanco (-> "Grupo"), volvemos al modo automático.
        if(clean==='Grupo'){ h.removeAttribute('data-user-named'); }
        else { h.setAttribute('data-user-named','1'); }
        var lbl=h.querySelector('.group-lbl-edit'); if(lbl) lbl.textContent=clean;
      },
      undo: function(){
        var h=document.getElementById(groupId); if(!h) return;
        h.setAttribute('data-lbl', old);
        if(oldUserNamed){ h.setAttribute('data-user-named','1'); }
        else { h.removeAttribute('data-user-named'); }
        var lbl=h.querySelector('.group-lbl-edit'); if(lbl) lbl.textContent=old;
      }
    };
    _doOp(op);
  };

  // ── Persist custom groups to W._customGroups (re-applied after re-render) ──
  function _saveCustomGroupsState(actId){
    var act = _actEl(actId); if(!act) return;
    var list = [];
    act.querySelectorAll('tr.custom-group-header').forEach(function(headerTr){
      var gid = headerTr.id;
      var label = headerTr.getAttribute('data-lbl')||'Grupo';
      var userNamed = headerTr.getAttribute('data-user-named')==='1';
      var keys = [];
      _childRowsOfHeader(headerTr).forEach(function(tr){
        var k = tr.getAttribute('data-hide-key');
        if(k) keys.push(k);
      });
      list.push({ groupId: gid, label: label, userNamed: userNamed, childKeys: keys });
    });
    W._customGroups[actId] = list;
  }

  // ── Re-apply custom groups after the table is re-rendered ──
  function _reapplyCustomGroups(actId){
    var list = W._customGroups[actId];
    _DB('GROUP', '_reapplyCustomGroups actId='+actId+' groups='+(list?list.length:0));
    if(!list || !list.length) return;
    var act = _actEl(actId); if(!act) return;
    var tbody = act.querySelector('tbody'); if(!tbody) return;
    list.forEach(function(g){
      var children = [];
      g.childKeys.forEach(function(k){
        var tr = tbody.querySelector('tr[data-hide-key="'+CSS.escape(k)+'"]');
        if(tr) children.push(tr);
      });
      if(children.length<2) return;
      var hdr = _materializeGroup(actId, g.groupId, g.label, children, /*skipPush*/true);
      if(hdr && g.userNamed) hdr.setAttribute('data-user-named','1');
    });
  }

  // ── Build / materialize a group in the DOM ──
  function _materializeGroup(actId, groupId, label, childRows, skipPush){
    if(!childRows.length) return null;
    // Debug: log children labels before any modification
    var _childDbg = childRows.map(function(tr){return {id:tr.id, lbl:tr.getAttribute('data-lbl'), cls:tr.className};});
    _DB('GROUP', '_materializeGroup enter groupId='+groupId+' label='+label+' children='+JSON.stringify(_childDbg));
    // Derive header label from children's types when label is default "Grupo"
    if(label === 'Grupo'){
      var derived = _deriveLabelFromChildren(childRows);
      if(derived) label = derived;
      _DB('GROUP', '_materializeGroup derived label="'+label+'" from children');
    }
    var tbody = childRows[0].parentNode;
    var agg = _aggregateRows(childRows);
    var _cdAll = childRows.length > 0 && childRows.every(function(tr){return tr.getAttribute('data-active')==='0';});
    var headerHtml = _buildHeaderHtml(actId, groupId, label, agg, 0, null, _cdAll, childRows);
    var tmp = document.createElement('tbody');
    tmp.innerHTML = headerHtml;
    var headerTr = tmp.firstElementChild;
    tbody.insertBefore(headerTr, childRows[0]);
    childRows.forEach(function(tr){
      tbody.insertBefore(tr, headerTr.nextSibling); // keep insertion order
    });
    // Re-order to original sequence after the header
    var prev = headerTr;
    childRows.forEach(function(tr){
      tbody.insertBefore(tr, prev.nextSibling);
      prev = tr;
    });
    childRows.forEach(function(tr){
      // Save original label before overwriting
      var origLbl = tr.getAttribute('data-lbl');
      if(origLbl && origLbl !== label && !tr.hasAttribute('data-custom-orig-lbl')){
        tr.setAttribute('data-custom-orig-lbl', origLbl);
      }
      tr.setAttribute('data-custom-parent', groupId);
      tr.classList.add('group-lap','custom-group-child');
      tr.setAttribute('data-lbl', label);
      var labelSpan = tr.querySelector('.lap-label-edit');
      if(labelSpan) labelSpan.textContent = _normalizeLabel(label);
      _ensureRowIndent(tr);
    });
    _attachRowHandlers(headerTr);
    childRows.forEach(_attachRowHandlers);
    _saveCustomGroupsState(actId);
    _DB('GROUP', '_materializeGroup done groupId='+groupId+' headerLbl='+(headerTr.getAttribute('data-lbl')||'')+' origLbls='+childRows.map(function(tr){return tr.getAttribute('data-custom-orig-lbl')||'—';}).join(','));
    return headerTr;
  }

  function _ensureRowIndent(tr){
    // Sangria visual desactivada: subLaps y custom-group children quedan
    // alineados con sus headers a la izquierda. Lo mantenemos como no-op
    // para que el resto de codigo que invoca _ensureRowIndent/_removeRowIndent
    // no falle.
    return;
  }
  function _removeRowIndent(tr){
    tr.querySelectorAll('.custom-indent').forEach(function(n){n.remove();});
  }

  // ── Group / Ungroup operations ──
  function _opGroup(actId, childRows, label){
    var groupId = 'cg-'+actId+'-'+Math.random().toString(36).slice(2,8);
    var prevSibKey = childRows[0].previousElementSibling ? (childRows[0].previousElementSibling.id||null) : null;
    var childIds = childRows.map(function(r){return r.id;});
    _DB('GROUP', '_opGroup actId='+actId+' children='+childIds.join(',')+' label='+label+' groupId='+groupId);
    var op = {
      actId: actId, type: 'group',
      apply: function(){
        var rows = childIds.map(function(id){return document.getElementById(id);}).filter(Boolean);
        if(rows.length<2) return;
        _materializeGroup(actId, groupId, label, rows);
      },
      undo: function(){
        _disbandGroup(actId, groupId);
      }
    };
    _doOp(op);
    return groupId;
  }

  function _disbandGroup(actId, groupId){
    var header = document.getElementById(groupId);
    if(!header) return;
    var children = _childRowsOfHeader(header);
    children.forEach(function(tr){
      tr.removeAttribute('data-custom-parent');
      tr.classList.remove('custom-group-child');
      tr.classList.remove('group-lap');
      _removeRowIndent(tr);
      // Restore original label if it was saved
      var origLbl = tr.getAttribute('data-custom-orig-lbl');
      if(origLbl){
        tr.setAttribute('data-lbl', origLbl);
        var labelSpan = tr.querySelector('.lap-label-edit');
        if(labelSpan) labelSpan.textContent = _normalizeLabel(origLbl);
        tr.removeAttribute('data-custom-orig-lbl');
      }
    });
    header.remove();
    _saveCustomGroupsState(actId);
  }

  W._ungroupCustom = function(actId, groupId){
    var header = document.getElementById(groupId);
    if(!header) return;
    var children = _childRowsOfHeader(header);
    var label = header.getAttribute('data-lbl')||'Grupo';
    _DB('GROUP', '_ungroupCustom actId='+actId+' groupId='+groupId+' label='+label+' children='+children.length);
    var snapshot = children.map(function(r){return r.id;});
    var op = {
      actId: actId, type: 'ungroup',
      apply: function(){ _disbandGroup(actId, groupId); },
      undo: function(){
        var rows = snapshot.map(function(id){return document.getElementById(id);}).filter(Boolean);
        if(rows.length<2) return;
        _materializeGroup(actId, groupId, label, rows);
      }
    };
    _doOp(op);
  };

  // Desacopla un header auto (Calentamiento / Carrera / Enfriamiento). El header
  // sale del DOM y sus laps quedan como filas standalone — _normalizeGroupLap se
  // encarga de quitarles la clase .group-lap en el _refreshAct posterior.
  W._ungroupAuto = function(actId, headerId){
    var header = document.getElementById(headerId); if(!header) return;
    var snapshot = {
      outerHtml: header.outerHTML,
      prevId: (function(){ var p=header.previousElementSibling; return p?p.id:null; })()
    };
    var op = {
      actId: actId, type: 'ungroup-auto',
      apply: function(){
        var h=document.getElementById(headerId);
        if(h) h.remove();
      },
      undo: function(){
        if(document.getElementById(headerId)) return; // ya está, no duplicar
        var act=_actEl(actId); if(!act) return;
        var tbody=act.querySelector('tbody'); if(!tbody) return;
        var tmp=document.createElement('tbody');
        tmp.innerHTML=snapshot.outerHtml;
        var newHdr=tmp.firstElementChild; if(!newHdr) return;
        var prev=snapshot.prevId?document.getElementById(snapshot.prevId):null;
        if(prev) tbody.insertBefore(newHdr, prev.nextSibling);
        else tbody.insertBefore(newHdr, tbody.firstChild);
        _attachRowHandlers(newHdr);
        var table=act.querySelector('table');
        if(table) _ensureActionsColumn(table);
      }
    };
    _doOp(op);
  };

  // Extract a single row from its current group (auto or custom).
  // - Custom group child: drop the data-custom-parent attribute and move just
  //   before the group header so the row becomes a standalone sibling.
  // - Auto group-lap: also move just before its group/phase header, so the
  //   normalize pass no longer flags it as part of that auto group.
  W._extractFromGroup = function(rowId, actId){
    _DB('GROUP', '_extractFromGroup actId='+actId+' rowId='+rowId);
    var tr = document.getElementById(rowId); if(!tr) return;
    // Find the controlling header walking backwards in the DOM.
    var header = null;
    var n = tr.previousElementSibling;
    while(n){
      if(n.classList.contains('avg-row')||n.classList.contains('avg-act')){ break; }
      if(n.classList.contains('custom-group-header')||n.classList.contains('group-header')||n.classList.contains('phase-header')){
        header = n; break;
      }
      n = n.previousElementSibling;
    }
    if(!header) return; // row is not actually inside a group
    var newPrev = header.previousElementSibling;
    var newPrevId = newPrev ? newPrev.id : null;
    _opMove(actId, rowId, newPrevId, null);
  };

  // Inverse of _extractFromGroup: attach a standalone row to the closest
  // preceding group/phase/custom-group header. Drops it as the last child of
  // that group. For custom groups the data-custom-parent attribute is set;
  // for auto groups the normalize pass picks up the new position.
  // If there is no preceding header at all, create a new custom group made of
  // the previous standalone data row + this row.
  // Find header of the group containing tr (auto or custom), or null if standalone.
  function _ownGroupHeader(tr){
    if(!tr.classList.contains('group-lap') && !tr.getAttribute('data-custom-parent')) return null;
    var n = tr.previousElementSibling;
    while(n){
      if(n.classList.contains('avg-row')||n.classList.contains('avg-act')) break;
      if(n.classList.contains('custom-group-header')||n.classList.contains('group-header')||n.classList.contains('phase-header')) return n;
      n = n.previousElementSibling;
    }
    return null;
  }
  // Last visible child of the group whose header is hdr (returns hdr itself if no children).
  function _ownGroupLastChild(hdr, exclude){
    var lastChild = hdr;
    var c = hdr.nextElementSibling;
    while(c){
      if(c.classList.contains('avg-row')||c.classList.contains('avg-act')) break;
      if(c.classList.contains('group-header')||c.classList.contains('phase-header')||c.classList.contains('custom-group-header')) break;
      if(c === exclude || c.classList.contains('row-hidden')){ c = c.nextElementSibling; continue; }
      lastChild = c;
      c = c.nextElementSibling;
    }
    return lastChild;
  }

  // ↥ — Si está en grupo: sube una posición o extrae encima si es la primera.
  //     Si está standalone: delega en _mergeIntoGroup (feature original).
  W._moveUpInGroup = function(rowId, actId){
    var tr = document.getElementById(rowId); if(!tr) return;
    var inGroup = tr.classList.contains('group-lap') || tr.getAttribute('data-custom-parent');
    if(!inGroup){ W._mergeIntoGroup(rowId, actId); return; }
    var prev = tr.previousElementSibling;
    while(prev && prev.classList.contains('row-hidden')) prev = prev.previousElementSibling;
    if(!prev || prev.classList.contains('avg-row') || prev.classList.contains('avg-act')) return;
    // Header → primera del grupo
    if(prev.classList.contains('custom-group-header') || prev.classList.contains('group-header') || prev.classList.contains('phase-header')){
      var beforeHdr = prev.previousElementSibling;
      while(beforeHdr && beforeHdr.classList.contains('row-hidden')) beforeHdr = beforeHdr.previousElementSibling;
      var oldG = tr.getAttribute('data-custom-parent');
      var groupAbove = beforeHdr && (beforeHdr.classList.contains('custom-group-header')||beforeHdr.classList.contains('group-header')||beforeHdr.classList.contains('phase-header'))
        ? beforeHdr : (beforeHdr ? _ownGroupHeader(beforeHdr) : null);
      if(groupAbove){
        var aboveLast = _ownGroupLastChild(groupAbove, tr);
        _opMove(actId, rowId, aboveLast.id, groupAbove.id);
      } else {
        // No hay grupo arriba → mover al inicio del grupo actual (después del header)
        _opMove(actId, rowId, prev.id, null);
      }
      _autoUngroupIfNeeded(actId, oldG);
      return;
    }
    var myG = tr.getAttribute('data-custom-parent');
    var prG = prev.getAttribute('data-custom-parent');
    // Mismo grupo (custom o auto): mover tr antes de prev
    if(myG === prG){
      var refPrev = prev.previousElementSibling;
      while(refPrev && refPrev.classList.contains('row-hidden')) refPrev = refPrev.previousElementSibling;
      _opMove(actId, rowId, refPrev?refPrev.id:null, myG);
    } else if(!myG && prG){
      // tr es standalone, prev es custom → meter en custom group después del header de prev
      var prevHdr = _ownGroupHeader(prev);
      if(prevHdr) _opMove(actId, rowId, prev.id, prevHdr.id);
    } else if(myG && !prG){
      // tr es custom, prev es auto-group-lap → mover antes de prev dentro del auto-group
      _opMove(actId, rowId, prev.previousElementSibling && !prev.previousElementSibling.classList.contains('row-hidden') && !prev.previousElementSibling.classList.contains('group-header') && !prev.previousElementSibling.classList.contains('phase-header') ? prev.previousElementSibling.id : prev.id, null);
    }
  };

  // ↧ — Si está en grupo: extrae debajo del grupo, o baja una posición si next es del mismo grupo.
  //     Si está standalone: delega en _mergeIntoNextGroup (feature original).
  W._moveDownInGroup = function(rowId, actId){
    var tr = document.getElementById(rowId); if(!tr) return;
    var inGroup = tr.classList.contains('group-lap') || tr.getAttribute('data-custom-parent');
    if(!inGroup){ W._mergeIntoNextGroup(rowId, actId); return; }
    var next = tr.nextElementSibling;
    while(next && next.classList.contains('row-hidden')) next = next.nextElementSibling;
    if(!next) return;
    // Misma parent → bajar una posición
    var myG = tr.getAttribute('data-custom-parent');
    var nxG = next.getAttribute('data-custom-parent');
    if(myG === nxG){ _opMove(actId, rowId, next.id, myG); return; }
    // Distinta parent, header o avg
    var ownHdr = _ownGroupHeader(tr);
    if(!ownHdr) return;
    var realLast = _ownGroupLastChild(ownHdr, null);
    var aft = realLast.nextElementSibling;
    while(aft && aft.classList.contains('row-hidden')) aft = aft.nextElementSibling;
    if(aft && (aft.classList.contains('custom-group-header') || aft.classList.contains('group-header') || aft.classList.contains('phase-header'))){
      var nxtLast = _ownGroupLastChild(aft, tr);
      _opMove(actId, rowId, nxtLast.id, aft.id);
    } else {
      var grpLastEx = _ownGroupLastChild(ownHdr, tr);
      _opMove(actId, rowId, grpLastEx.id, null);
    }
    _autoUngroupIfNeeded(actId, myG);
  };

  function _autoUngroupIfNeeded(actId, groupId){
    if(!groupId) return;
    var hdr = document.getElementById(groupId);
    if(!hdr) return;
    if(_childRowsOfHeader(hdr).length < 2) W._ungroupCustom(actId, groupId);
  }

  // ↥ — mover la fila al grupo anterior (o crear uno con la fila standalone de arriba).
  W._mergeIntoGroup = function(rowId, actId){
    var tr = document.getElementById(rowId); if(!tr) return;
    // Si la fila ya está en un grupo, "saltamos" su grupo y buscamos antes del header propio.
    var ownHdr = _ownGroupHeader(tr);
    var searchStart = ownHdr || tr;
    var p = searchStart.previousElementSibling;
    while(p && p.classList.contains('row-hidden')) p = p.previousElementSibling;
    if(!p) return;
    if(p.classList.contains('avg-row')||p.classList.contains('avg-act')) return;
    // p es un header custom → meter como último hijo de ese grupo.
    if(p.classList.contains('custom-group-header')){
      var lastP = _ownGroupLastChild(p, tr);
      _opMove(actId, rowId, lastP.id, p.id);
      return;
    }
    // p es un header auto (Calentamiento/Carrera/Enfriamiento) →
    // mover la fila al final de ese grupo auto; _normalizeGroupLap la marca como group-lap.
    if(p.classList.contains('group-header')||p.classList.contains('phase-header')){
      var lastAuto = _ownGroupLastChild(p, tr);
      _opMove(actId, rowId, lastAuto.id, null);
      return;
    }
    // p es una fila dentro de un grupo custom → unirse a ese grupo después de p.
    var cp = p.getAttribute('data-custom-parent');
    if(cp){
      _opMove(actId, rowId, p.id, cp);
      return;
    }
    // p es una fila dentro de un grupo auto → mover tr antes del header del auto-group.
    if(p.classList.contains('group-lap')){
      var pHdr = _ownGroupHeader(p);
      if(pHdr){
        // Insertar tr justo después del header del auto-group (primera posición del grupo)
        _opMove(actId, rowId, pHdr.id, null);
      } else {
        _opMove(actId, rowId, p.id, null);
      }
      return;
    }
    // p es una fila standalone → crear grupo nuevo con p + tr.
    if(p.hasAttribute('data-dur')){
      _opGroup(actId, [p, tr], 'Grupo');
    }
  };

  // ↧ — mover la fila al grupo siguiente (o crear uno con la fila standalone de abajo).
  W._mergeIntoNextGroup = function(rowId, actId){
    var tr = document.getElementById(rowId); if(!tr) return;
    // Si la fila ya está en un grupo, "saltamos" su grupo y buscamos después del último hijo.
    var ownHdr = _ownGroupHeader(tr);
    var searchStart = ownHdr ? _ownGroupLastChild(ownHdr, tr) : tr;
    var n = searchStart.nextElementSibling;
    while(n && (n === tr || n.classList.contains('row-hidden'))) n = n.nextElementSibling;
    if(!n) return;
    if(n.classList.contains('avg-row')||n.classList.contains('avg-act')){
      // Si la fila está en un grupo custom, extraerla a standalone justo antes del avg-row
      if(ownHdr){
        _opMove(actId, rowId, _ownGroupLastChild(ownHdr, tr).id, null);
      }
      return;
    }
    // n es un header custom → si la fila está en grupo, extraerla a standalone; si no, meter al inicio.
    if(n.classList.contains('custom-group-header')){
      _opMove(actId, rowId, ownHdr?_ownGroupLastChild(ownHdr, tr).id:n.id, ownHdr?null:n.id);
      return;
    }
    // n es un header auto → mover justo después del header (queda al inicio del auto group).
    if(n.classList.contains('group-header')||n.classList.contains('phase-header')){
      _opMove(actId, rowId, n.id, null);
      return;
    }
    // n es una fila dentro de un grupo custom → meter en ese grupo antes de n.
    var ncp = n.getAttribute('data-custom-parent');
    if(ncp){
      var prevOfN = n.previousElementSibling;
      while(prevOfN && (prevOfN === tr || prevOfN.classList.contains('row-hidden'))) prevOfN = prevOfN.previousElementSibling;
      _opMove(actId, rowId, prevOfN?prevOfN.id:null, ncp);
      return;
    }
    // n es una fila dentro de un grupo auto → mover tr a justo antes de n.
    if(n.classList.contains('group-lap')){
      var prevOfN2 = n.previousElementSibling;
      while(prevOfN2 && (prevOfN2 === tr || prevOfN2.classList.contains('row-hidden'))) prevOfN2 = prevOfN2.previousElementSibling;
      _opMove(actId, rowId, prevOfN2?prevOfN2.id:null, null);
      return;
    }
    // n es una fila standalone → crear grupo nuevo con tr + n.
    if(n.hasAttribute('data-dur')){
      _opGroup(actId, [tr, n], 'Grupo');
    }
  };

  // ── Move op (reorder) ──
  function _opMove(actId, rowId, newPrevId, newParentGroupId){
    _DB('GROUP', '_opMove actId='+actId+' rowId='+rowId+' newPrev='+newPrevId+' parent='+newParentGroupId);
    var tr = document.getElementById(rowId); if(!tr) return;
    var oldPrev = tr.previousElementSibling;
    var oldPrevId = oldPrev?oldPrev.id:null;
    var oldParent = tr.getAttribute('data-custom-parent')||null;
    var op = {
      actId: actId, type: 'move',
      apply: function(){
        var t = document.getElementById(rowId); if(!t) return;
        var ref = newPrevId?document.getElementById(newPrevId):null;
        var tbody = t.parentNode;
        if(ref) tbody.insertBefore(t, ref.nextSibling);
        else tbody.insertBefore(t, tbody.firstChild);
        if(newParentGroupId){
          t.setAttribute('data-custom-parent', newParentGroupId);
          t.classList.add('group-lap','custom-group-child');
          _ensureRowIndent(t);
        } else {
          if(oldParent){
            t.removeAttribute('data-custom-parent');
            t.classList.remove('custom-group-child');
            _removeRowIndent(t);
          }
        }
      },
      undo: function(){
        var t = document.getElementById(rowId); if(!t) return;
        var tbody = t.parentNode;
        var ref = oldPrevId?document.getElementById(oldPrevId):null;
        if(ref) tbody.insertBefore(t, ref.nextSibling);
        else tbody.insertBefore(t, tbody.firstChild);
        if(oldParent){
          t.setAttribute('data-custom-parent', oldParent);
          t.classList.add('group-lap','custom-group-child');
          _ensureRowIndent(t);
        } else {
          t.removeAttribute('data-custom-parent');
          t.classList.remove('custom-group-child');
          if(newParentGroupId) _removeRowIndent(t);
        }
      }
    };
    _doOp(op);
  }

  // ── Drag&Drop logic with pointer events (works for mouse + touch) ──
  var _drag = null; // { actId, srcTr, srcId, ghost, startX, startY, indicator, mode }
  function _attachRowHandlers(tr){
    if(tr.__lapHandlersAttached) return;
    if(tr.classList.contains('avg-row')||tr.classList.contains('avg-act')) return;
    var td = tr.querySelector('td'); if(!td) return;
    var actions = td.querySelector(':scope > .lap-row-actions');
    var existing = (actions && actions.querySelector('.lap-handle'))
                || td.querySelector(':scope > .lap-handle')
                || td.querySelector('.lap-label-cell .lap-handle');
    var labelCell = td.querySelector('.lap-label-cell .lap-label-row');
    var handle;
    if(existing){ handle = existing; }
    else {
      handle = document.createElement('span');
      handle.className = 'lap-handle';
      handle.textContent = '☰';
      handle.title = 'Arrastrar';
      if(actions) actions.insertBefore(handle, actions.firstChild);
      else if(labelCell) labelCell.insertBefore(handle, labelCell.firstChild);
      else td.insertBefore(handle, td.firstChild);
    }
    // Add checkbox for merge
    _addCheckboxToRow(tr);
    if(_isMobile()) handle.classList.add('touchable');
    // Whole row drag (touch: long-press; mouse: drag from anywhere except interactive elements)
    tr.classList.add('lap-row-active');
    tr.addEventListener('pointerdown', function(e){ _onPointerDown(e, tr, false); }, false);
    // Handle drag starts immediately (no long-press)
    handle.addEventListener('pointerdown', function(e){
      e.stopPropagation();
      _onPointerDown(e, tr, true);
    }, false);
    tr.__lapHandlersAttached = true;
  }

  function _shouldIgnoreTarget(target){
    return !!(target && target.closest && target.closest(
      'button, input, textarea, select, a, [contenteditable="true"], .hide-btn, .ungroup-btn, .lbl, .group-lbl-edit, .restore-item, .restore-bar'
    ));
  }

  function _rowLevel(tr){
    if(!tr) return 0;
    if(tr.getAttribute('data-custom-parent')) return 1;
    if(tr.classList.contains('group-lap')) return 1;
    return 0;
  }
  function _onPointerDown(e, tr, fromHandle){
    if(e.button && e.button!==0) return;
    if(!fromHandle && _shouldIgnoreTarget(e.target)) return;
    var isTouch = e.pointerType==='touch' || e.pointerType==='pen';
    var table = tr.closest('table');
    if(!table) return;
    var actEl = tr.closest('.actividad');
    var actId = actEl ? actEl.id.replace(/^act-/, '') : null;
    if(!actId) return;
    // Sin modo edición no se arrastra — el ✏️ tiene que estar activo. El ✕ por
    // celda y el ☰ ya están ocultos por CSS en ese caso, pero el row-level
    // pointerdown seguía colando drags que el usuario no esperaba.
    if(!actEl.classList.contains('editing-on')) return;
    _drag = {
      actId: actId, srcTr: tr, srcId: tr.id,
      startX: e.clientX, startY: e.clientY,
      table: table, started: false, pointerId: e.pointerId,
      pointerType: e.pointerType||'mouse',
      fromHandle: !!fromHandle,
      longPressTimer: null,
      origLevel: _rowLevel(tr)
    };
    if(isTouch && !fromHandle){
      tr.classList.add('long-press');
      _drag.longPressTimer = setTimeout(function(){
        if(!_drag) return;
        _drag.longPressTimer = null;
        try{ if(navigator.vibrate) navigator.vibrate(15); }catch(err){}
        _startDrag();
      }, 380);
    }
    if(fromHandle){
      try{ e.target.setPointerCapture(e.pointerId); }catch(err){}
      e.preventDefault();
    }
    document.addEventListener('pointermove', _onPointerMove, true);
    document.addEventListener('pointerup', _onPointerUp, true);
    document.addEventListener('pointercancel', _onPointerCancel, true);
  }

  function _onPointerCancel(){
    if(_drag){
      if(_drag.longPressTimer) clearTimeout(_drag.longPressTimer);
      if(_drag.srcTr) _drag.srcTr.classList.remove('long-press');
    }
    _detachPointerListeners();
    _cleanupDrag();
  }
  function _detachPointerListeners(){
    document.removeEventListener('pointermove', _onPointerMove, true);
    document.removeEventListener('pointerup', _onPointerUp, true);
    document.removeEventListener('pointercancel', _onPointerCancel, true);
  }

  function _startDrag(){
    if(!_drag||_drag.started) return;
    _drag.started = true;
    var tr = _drag.srcTr;
    tr.classList.remove('long-press');
    tr.classList.add('lap-dragging');
    var ghost = document.createElement('div');
    ghost.className = 'lap-ghost';
    var lbl = tr.getAttribute('data-lbl') || (tr.querySelector('td')?tr.querySelector('td').textContent.trim().slice(0,40):'fila');
    ghost.textContent = '↕ '+lbl;
    document.body.appendChild(ghost);
    _drag.ghost = ghost;
    var ind = document.createElement('div');
    ind.className = 'lap-drop-indicator';
    document.body.appendChild(ind);
    _drag.indicator = ind;
  }

  function _onPointerMove(e){
    if(!_drag) return;
    var dx = e.clientX - _drag.startX, dy = e.clientY - _drag.startY;
    if(!_drag.started){
      if(_drag.longPressTimer){
        // touch row drag — if user moves before long-press fires, treat as scroll/cancel
        if(Math.abs(dx) > 10 || Math.abs(dy) > 10){
          clearTimeout(_drag.longPressTimer);
          _drag.longPressTimer = null;
          if(_drag.srcTr) _drag.srcTr.classList.remove('long-press');
          _detachPointerListeners();
          _drag = null;
        }
        return;
      }
      if(Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      _startDrag();
    }
    if(!_drag.started) return;
    e.preventDefault();
    if(_drag.ghost){
      _drag.ghost.style.left = (e.clientX + 12) + 'px';
      _drag.ghost.style.top  = (e.clientY + 12) + 'px';
    }
    // Find target row under pointer
    var el = document.elementFromPoint(e.clientX, e.clientY);
    var targetTr = el ? el.closest('tr') : null;
    var ind = _drag.indicator;
    // clear into-state
    document.querySelectorAll('tr.lap-drop-into').forEach(function(r){r.classList.remove('lap-drop-into');});
    if(!targetTr || targetTr === _drag.srcTr || targetTr.classList.contains('avg-row') || targetTr.classList.contains('avg-act')){
      if(ind) ind.style.display='none';
      _drag.dropTarget = null;
      return;
    }
    if(targetTr.closest('table') !== _drag.table){
      if(ind) ind.style.display='none';
      _drag.dropTarget = null;
      return;
    }
    var rect = targetTr.getBoundingClientRect();
    var isCustomHeader = targetTr.classList.contains('custom-group-header');
    // WordPress-menu style: level is decided by the cursor's ABSOLUTE X over the row's first
    // cell. To the left of the indent gutter → level 0 (free), to the right → level 1 (child).
    // This is independent of where the drag started, so you can grab the row anywhere and just
    // slide left/right to change level.
    var firstTd = targetTr.querySelector('td');
    var gutterLeft = firstTd ? firstTd.getBoundingClientRect().left : rect.left;
    var INDENT_PX = 28; // matches .auto-indent width approx
    var relX = e.clientX - gutterLeft;
    var newLevel = relX >= INDENT_PX ? 1 : 0;
    var indentChange = newLevel - (_drag.origLevel||0);

    // Vertical position: top half = before, bottom half = after.
    // Custom-group-header: a narrow central band (40-60%) means "drop INTO the group".
    var before = e.clientY < (rect.top + rect.height/2);
    var dropIntoGroup = false;
    if(isCustomHeader){
      var topZ = rect.top + rect.height*0.40;
      var botZ = rect.top + rect.height*0.60;
      if(e.clientY > topZ && e.clientY < botZ){
        dropIntoGroup = true;
      }
    }
    if(dropIntoGroup){
      targetTr.classList.add('lap-drop-into');
      if(ind){ ind.style.display='none'; }
      _drag.dropTarget = { mode:'into', target: targetTr };
    } else {
      var y = before ? rect.top : rect.bottom;
      var indentPx = newLevel * 20;
      if(ind){
        ind.style.display = '';
        ind.style.top = (y - 1) + 'px';
        ind.style.left = (rect.left + indentPx) + 'px';
        ind.style.width = Math.max(40, rect.width - indentPx) + 'px';
        ind.classList.remove('into');
      }
      _drag.dropTarget = { mode: before?'before':'after', target: targetTr, level: newLevel, indentChange: indentChange };
      // Reflect intent on the ghost
      if(_drag.ghost){
        var hint = indentChange>0?' →':indentChange<0?' ←':'';
        var base = _drag.srcTr.getAttribute('data-lbl')||'fila';
        _drag.ghost.textContent = '↕ '+base+hint;
      }
    }
  }

  function _onPointerUp(e){
    if(!_drag){ _cleanupDrag(); return; }
    _detachPointerListeners();
    if(!_drag.started){
      // No drag actually started — treat as click; cleanup quietly
      if(_drag.longPressTimer) clearTimeout(_drag.longPressTimer);
      if(_drag.srcTr) _drag.srcTr.classList.remove('long-press');
      _drag = null;
      return;
    }
    var dt = _drag.dropTarget;
    var actId = _drag.actId, srcId = _drag.srcId;
    var srcTr = _drag.srcTr;
    _cleanupDrag();
    if(!dt || !srcTr) return;
    var target = dt.target;
    if(!target || target === srcTr) return;

    // ── Drop INTO an existing custom-group-header (centre band): always append to that group
    if(dt.mode === 'into' && target.classList.contains('custom-group-header')){
      var gid = target.id;
      var children = _childRowsOfHeader(target);
      var lastChild = children.length?children[children.length-1]:target;
      _opMove(actId, srcId, lastChild.id, gid);
      return;
    }

    // ── before / after with horizontal indent intent (WordPress-menu style) ──
    var before = dt.mode === 'before';
    var rawPrev = before ? target.previousElementSibling : target;
    // Skip the row being dragged: otherwise dropping just above the next header
    // anchors to the dragged row itself and produces a silent no-op.
    while(rawPrev && rawPrev === srcTr) rawPrev = rawPrev.previousElementSibling;
    var newPrevId = rawPrev ? rawPrev.id : null;
    var newPrevTr = newPrevId ? document.getElementById(newPrevId) : null;
    var level = dt.level != null ? dt.level : (_drag && _drag.origLevel) || 0;

    // Soltar sobre un custom-group-header con intención de indent → unirse a ese grupo
    // (cubre tanto el "before" justo encima del header como el "after" inmediatamente debajo).
    if(level === 1 && target.classList.contains('custom-group-header')){
      _opMove(actId, srcId, target.id, target.id);
      return;
    }

    if(level === 0){
      // OUTDENT: leave any group, become a free row at the new position
      _opMove(actId, srcId, newPrevId, null);
      return;
    }

    // level === 1 → indent: join a group based on the predecessor row.
    if(!newPrevTr){
      // Nothing precedes → cannot indent, fall back to free move
      _opMove(actId, srcId, null, null);
      return;
    }
    // a) predecessor is a custom-group-header → become last child of it
    if(newPrevTr.classList.contains('custom-group-header')){
      _opMove(actId, srcId, newPrevId, newPrevTr.id);
      return;
    }
    // b) predecessor is a custom-group child → same custom parent
    var prevCustomParent = newPrevTr.getAttribute('data-custom-parent');
    if(prevCustomParent){
      _opMove(actId, srcId, newPrevId, prevCustomParent);
      return;
    }
    // c) predecessor is inside an auto group (.group-lap) OR is itself an auto header → src
    //    joins that auto group. parent stays null; _normalizeGroupLap will set .group-lap.
    if(newPrevTr.classList.contains('group-lap')
       || newPrevTr.classList.contains('group-header')
       || newPrevTr.classList.contains('phase-header')){
      _opMove(actId, srcId, newPrevId, null);
      return;
    }
    // d) predecessor is a free data row → indent means: convert the pair (predecessor + src)
    //    into a new custom group, with predecessor first. Src goes immediately after it.
    _opMove(actId, srcId, newPrevId, null);
    var freshSrc = document.getElementById(srcId);
    var freshPrev = document.getElementById(newPrevId);
    if(freshSrc && freshPrev){
      _opGroup(actId, [freshPrev, freshSrc], _autoGroupLabel([freshPrev, freshSrc]));
    }
  }

  function _autoGroupLabel(rows){
    var labels = rows.map(function(r){return (r.getAttribute('data-lbl')||'').trim();}).filter(Boolean);
    if(!labels.length) return 'Serie · '+rows.length;
    // Normalize: count by lowercased form
    var freq = {};
    labels.forEach(function(l){var k=l.toLowerCase();freq[k]=(freq[k]||0)+1;});
    var keys = Object.keys(freq).sort(function(a,b){return freq[b]-freq[a];});
    if(keys.length===1){
      // All rows share one label
      var only = labels.find(function(l){return l.toLowerCase()===keys[0];})||labels[0];
      return only+' · '+rows.length;
    }
    // Mix of active + rest → typical interval: pick the dominant active label
    var REST = /descanso|recuper|warmup|cooldown|calentamiento|enfriamiento|rest/i;
    var nonRest = labels.filter(function(l){return !REST.test(l);});
    if(nonRest.length){
      var u = {}; nonRest.forEach(function(l){u[l.toLowerCase()]=l;});
      var n = Object.keys(u);
      if(n.length===1) return u[n[0]]+' · serie '+rows.length;
    }
    // Distinct labels → join the first two unique
    var disp = []; labels.forEach(function(l){if(disp.indexOf(l)<0)disp.push(l);});
    if(disp.length<=2) return disp.join(' + ');
    return disp.slice(0,2).join(' + ')+' …';
  }

  function _cleanupDrag(){
    document.querySelectorAll('tr.lap-dragging').forEach(function(r){r.classList.remove('lap-dragging');});
    document.querySelectorAll('tr.lap-drop-into').forEach(function(r){r.classList.remove('lap-drop-into');});
    if(_drag){
      if(_drag.ghost) _drag.ghost.remove();
      if(_drag.indicator) _drag.indicator.remove();
    }
    _drag = null;
  }

  // Move all action buttons of each row into a dedicated leftmost column.
  // Idempotent: if the col-actions cells already exist, only fills them with
  // anything new (e.g. newly inserted handle from _attachRowHandlers).
  function _ensureActionsColumn(table){
    if(!table) return;
    var cg = table.querySelector(':scope > colgroup');
    if(cg && !cg.querySelector('col.col-actions')){
      var col = document.createElement('col');
      col.className = 'col-actions';
      cg.insertBefore(col, cg.firstChild);
    }
    var theadTr = table.querySelector(':scope > thead > tr');
    if(theadTr && !theadTr.querySelector('th.col-actions')){
      var th = document.createElement('th');
      th.className = 'col-actions';
      theadTr.insertBefore(th, theadTr.firstChild);
    }
    var SEL = ['.lap-row-actions','.lap-handle','.hide-btn','.lap-extract-btn','.lap-up-btn','.lap-down-btn','.ungroup-btn'];
    var trs = table.querySelectorAll(':scope > tbody > tr');
    trs.forEach(function(tr){
      var actTd = tr.querySelector(':scope > td.col-actions');
      if(!actTd){
        actTd = document.createElement('td');
        actTd.className = 'col-actions';
        tr.insertBefore(actTd, tr.firstChild);
      }
      var labelTd = actTd.nextElementSibling;
      if(!labelTd) return;
      SEL.forEach(function(sel){
        labelTd.querySelectorAll(sel).forEach(function(n){
          // Only move nodes that still live inside the label TD (skip nested
          // matches inside an already-moved lap-row-actions, etc.).
          if(n.closest('td') !== labelTd) return;
          actTd.appendChild(n);
        });
      });
    });
  }
  W._ensureActionsColumn = _ensureActionsColumn;

  // ── Attach row handlers + actions column for one activity (no group rebuild) ──
  W._attachRowHandlersToAct = function(actId){
    var act = document.getElementById('act-'+actId);
    if(!act) return;
    act.querySelectorAll('tbody tr').forEach(function(tr){
      if(tr.classList.contains('avg-row')||tr.classList.contains('avg-act')) return;
      _attachRowHandlers(tr);
    });
    var table = act.querySelector('table');
    if(table) _ensureActionsColumn(table);
  };

  // ── Init all tables after a render ──
  W._initLapEditAll = function(){
    _DB('EDIT', '_initLapEditAll enter');
    document.querySelectorAll('.actividad').forEach(function(act){
      var actId = act.id.replace(/^act-/, '');
      act.querySelectorAll('tbody tr').forEach(function(tr){
        if(tr.classList.contains('avg-row')||tr.classList.contains('avg-act')) return;
        _attachRowHandlers(tr);
      });
      _reapplyCustomGroups(actId);
      _recalcAutoHeaders(actId);
      _recalcAvgRows(actId);
      var table = act.querySelector('table');
      if(table){
        _ensureActionsColumn(table);
        if(typeof _tagColumns==='function') _tagColumns(table);
        if(typeof _addThHideButtons==='function') _addThHideButtons(table);
      }
      if(typeof _addEditModeToggle==='function') _addEditModeToggle(act);
      if(typeof _applyHiddenColumns==='function') _applyHiddenColumns(act);
      if(typeof _refreshColsRestoreBar==='function') _refreshColsRestoreBar(actId);
    });
    if(typeof _applyHiddenSummaryIds === 'function') _applyHiddenSummaryIds();
    _updateFabState();
  };

  // ── Wrap render() / _reRenderCompact() to trigger init ──
  var _origRender = W.render;
  if(typeof _origRender === 'function' && !_origRender.__lapWrapped){
    W.render = function(){
      // Fresh data → reset all edit state
      W._editStack.length = 0;
      W._editRedo.length = 0;
      W._customGroups = {};
      W._hiddenSummaryIds = {};
      var r = _origRender.apply(this, arguments);
      setTimeout(W._initLapEditAll, 0);
      return r;
    };
    W.render.__lapWrapped = true;
  }
  var _origReRender = W._reRenderCompact;
  if(typeof _origReRender === 'function' && !_origReRender.__lapWrapped){
    W._reRenderCompact = function(){
      var r = _origReRender.apply(this, arguments);
      setTimeout(W._initLapEditAll, 0);
      // After _initLapEditAll, dissolve auto-group headers if rows are hidden.
      // Hiding a row can create artificial wktStepIndex adjacency that _buildGroups
      // merges into an auto-group header — the user expects standalone rows after hiding.
      setTimeout(function(){
        var hiddenMap = _hiddenKeyMap();
        var hasAny = Object.keys(hiddenMap).some(function(k){ return hiddenMap[k]; });
        if(hasAny){
          _DB('RENDER', 'checking auto-group headers for dissolution');
          document.querySelectorAll('.actividad').forEach(function(act){
            var actId = act.id.replace(/^act-/, '');
            // Only dissolve for activities that actually have hidden rows
            var prefix = actId + ':';
            var hasHiddenForAct = Object.keys(hiddenMap).some(function(k){
              return k.indexOf(prefix) === 0 && hiddenMap[k];
            });
            if(!hasHiddenForAct) return;
            _DB('RENDER', 'dissolving auto-group headers for actId='+actId);
            act.querySelectorAll('tr.group-header.step-summary').forEach(function(hdr){
              if(hdr.classList.contains('phase-header')) return; // keep warmup/cooldown
              _DB('RENDER', 'removing auto-header '+hdr.id+' actId='+actId);
              hdr.remove();
            });
            if(typeof window._refreshAct === 'function') window._refreshAct(actId);
          });
        }
      }, 0);
      return r;
    };
    W._reRenderCompact.__lapWrapped = true;
  }

  // ── Unified Cmd/Ctrl+Z and redo handlers ──
  // The existing keyboard handler in the file only handles `_undoLastHide`. We add a capture-phase
  // handler that pops _editStack first (which includes both hides and our new ops). Hides made
  // through the old _pushHide still work because we also wrap _pushHide below.
  function _activeIsField(){
    var a = document.activeElement;
    if(!a) return false;
    var tn = (a.tagName||'').toUpperCase();
    if(tn==='INPUT'||tn==='TEXTAREA'||tn==='SELECT') return true;
    // Only block on contenteditable when it's actively focused on a non-table element
    // (the .lbl/.group-lbl-edit lose focus on Enter/blur, so this is correct).
    if(a.isContentEditable) return true;
    return false;
  }
  function _undoKeyHandler(e){
    if(!(e.metaKey||e.ctrlKey)) return;
    var k = (e.key||'').toLowerCase();
    if(k !== 'z' && e.code !== 'KeyZ') return;
    if(_activeIsField()) return;
    if(!W._editStack.length && !W._editRedo.length) return;
    e.preventDefault();
    e.stopPropagation();
    try{
      if(e.shiftKey){ _redoOp(); } else { _undoOp(); }
    }catch(err){ /* swallow; keep UI usable */ }
  }
  // Register on both document and window in capture phase so the shortcut wins over any
  // browser-level/inline handlers.
  document.addEventListener('keydown', _undoKeyHandler, true);
  window.addEventListener('keydown',   _undoKeyHandler, true);

  // Escape: exit edit mode and close camera FAB menu
  document.addEventListener('keydown', function(e){
    if(e.key!=='Escape')return;
    document.querySelectorAll('.edit-mode-toggle.active').forEach(function(btn){
      btn.click();
    });
    var _af=document.getElementById('lap-act-fab');
    if(_af)_af.classList.remove('expanded');
  });

  // ── Wrap _pushHide so hides flow through the unified stack too ──
  var _origPushHide = W._pushHide;
  if(typeof _origPushHide === 'function' && !_origPushHide.__lapWrapped){
    W._pushHide = function(actId, rowIds, label, meta){
      _DB('HIDE', 'actId='+actId+' rowIds='+rowIds.join(',')+' label='+label);
      _origPushHide.apply(this, arguments);
      var hideOp = {
        actId: actId, type: 'hide',
        apply: function(){
          rowIds.forEach(function(rid){var el=document.getElementById(rid);if(el){el.classList.add('row-hidden');}});
          if(meta && meta.keys) _rememberHiddenKeys(meta.keys);
          // Re-register in _hideStack so _restoreOp / _restoreAll still find it
          var hs = W._hideStack = W._hideStack||[];
          var exists = false;
          for(var j=0;j<hs.length;j++){
            if(hs[j].actId===actId && JSON.stringify(hs[j].rowIds)===JSON.stringify(rowIds)){ exists=true; break; }
          }
          if(!exists){
            hs.push({id:Date.now()+'-'+Math.random().toString(36).slice(2,6),actId:actId,rowIds:rowIds.slice(),label:label,meta:meta||{}});
          }
          if(window._lastParsedList && typeof window._reRenderCompact === 'function'){
            window._reRenderCompact();
          }
          if(typeof _refreshActRestoreBar === 'function') _refreshActRestoreBar(actId);
        },
        undo: function(){
          rowIds.forEach(function(rid){var el=document.getElementById(rid);if(el){el.classList.remove('row-hidden');el.style.display='';}});
          if(meta && meta.keys) _forgetHiddenKeys(meta.keys);
          // also drop the matching entry from _hideStack so it doesn't get duplicated
          var stack = W._hideStack||[];
          for(var i=stack.length-1;i>=0;i--){
            if(stack[i].actId===actId && JSON.stringify(stack[i].rowIds)===JSON.stringify(rowIds)){
              stack.splice(i,1); break;
            }
          }
          if(window._lastParsedList && typeof window._reRenderCompact === 'function'){
            window._reRenderCompact();
          }
          if(typeof _refreshActRestoreBar === 'function') _refreshActRestoreBar(actId);
        }
      };
      W._editStack.push(hideOp);
      W._editRedo.length = 0;
      _updateFabState();
    };
    W._pushHide.__lapWrapped = true;
  }

  // ── Floating clusters ──
  function _ensureFab(){
    var fab = document.getElementById('lap-ur-fab');
    if(fab) return fab;
    fab = document.createElement('div');
    fab.id = 'lap-ur-fab';
    fab.className = 'lap-ur-fab';
    fab.innerHTML =
      '<button class="undo" type="button" title="Deshacer (⌘Z)" aria-label="Deshacer">↩</button>'
      + '<button class="redo" type="button" title="Rehacer (⌘⇧Z)" aria-label="Rehacer">↪</button>';
    document.body.appendChild(fab);
    fab.querySelector('.undo').addEventListener('click', function(e){e.preventDefault();_undoOp();});
    fab.querySelector('.redo').addEventListener('click', function(e){e.preventDefault();_redoOp();});
    return fab;
  }
  // FAB de acciones (Generar imagen / Copiar imagen / Obtener link).
  // Es un único botón que al pulsar despliega las 3 acciones hacia arriba.
  function _actFabDone(){
    clearTimeout(window._actFabDoneTimer);
    window._pendingActFabAction=null;
    var f=document.getElementById('lap-act-fab');
    if(!f)return;
    var trig=f.querySelector('.lap-act-trigger');
    if(!trig)return;
    var orig=trig.getAttribute('data-orig-text')||'📸';
    trig.textContent='✅';
    trig.style.color='#4ade80';
    window._actFabDoneTimer=setTimeout(function(){trig.textContent=orig;trig.style.color='';},1800);
  }
  window._actFabDone = _actFabDone;
  function _ensureActFab(){
    var f = document.getElementById('lap-act-fab');
    if(f) return f;
    f = document.createElement('div');
    f.id = 'lap-act-fab';
    f.className = 'lap-act-fab';
    f.innerHTML =
      '<div class="lap-act-menu">'
      + '<button type="button" data-action="img">Generar imagen</button>'
      + '<button type="button" data-action="copy">Copiar imagen</button>'
      + '<button type="button" data-action="link">Obtener link</button>'
      + '<button type="button" data-action="share">Compartir</button>'
      + '</div>'
      + '<button type="button" class="lap-act-trigger" data-orig-text="📸" title="Acciones imagen / link" aria-label="Acciones">📸</button>';
    document.body.appendChild(f);
    f.querySelector('.lap-act-trigger').addEventListener('click', function(e){
      e.preventDefault(); e.stopPropagation();
      f.classList.toggle('expanded');
    });
    f.querySelectorAll('.lap-act-menu button').forEach(function(b){
      b.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        f.classList.remove('expanded');
        var trig=f.querySelector('.lap-act-trigger');
        if(trig){trig.textContent='⏳';trig.style.color='';}
        // Sync main button too
        var mainId={img:'btn-img',copy:'btn-copy-img',link:'btn-link-img'}[b.getAttribute('data-action')];
        if(mainId){var mb=document.getElementById(mainId);if(mb){mb.textContent='⏳';mb.disabled=true;}}
        var a=b.getAttribute('data-action');
        if(a==='img' && typeof window.saveImg==='function') window.saveImg();
        else if(a==='copy' && typeof window.copyImg==='function') window.copyImg();
        else if(a==='link' && typeof window.getImageLink==='function') window.getImageLink();
        else if(a==='share' && typeof window.shareStrava==='function') shareStrava();
        window._pendingActFabAction=a;
      });
    });
    // Click fuera del FAB cierra el menú.
    document.addEventListener('click', function(e){
      if(!f.contains(e.target)) f.classList.remove('expanded');
    });
    return f;
  }
  function _updateActFabState(){
    var f = _ensureActFab();
    // Reutilizamos el estado de visibilidad del btn-img original: si está
    // visible, el FAB también; si no, ocultamos y plegamos el menú.
    var src = document.getElementById('btn-img');
    var visible = !!(src && src.style.display && src.style.display !== 'none');
    if(visible) f.classList.add('visible'); else { f.classList.remove('visible'); f.classList.remove('expanded'); }
    // Re-layout after visibility change
    if(typeof _layoutEditToggles==='function') _layoutEditToggles();
    // Cada botón del menú refleja el disabled/texto del original (estados
    // "Generando…", "Copiada", etc.).
    function _mirror(action, srcId){
      var srcBtn = document.getElementById(srcId);
      var tgt = f.querySelector('.lap-act-menu button[data-action="'+action+'"]');
      if(!tgt || !srcBtn) return;
      tgt.disabled = !!srcBtn.disabled;
      // Mantén la etiqueta sincronizada (e.g. "Generando…", "✓ Copiada").
      var txt = (srcBtn.textContent||'').trim();
      if(txt) tgt.textContent = txt;
    }
    _mirror('img','btn-img');
    _mirror('copy','btn-copy-img');
    _mirror('link','btn-link-img');
    _mirror('share','btn-share');
  }
  function _updateFabState(){
    var fab = _ensureFab();
    var editActive = !!document.querySelector('.edit-mode-toggle.active');
    if(editActive) fab.classList.add('visible'); else fab.classList.remove('visible');
    var undoBtn = fab.querySelector('.undo'), redoBtn = fab.querySelector('.redo');
    if(undoBtn) undoBtn.disabled = !(W._editStack && W._editStack.length);
    if(redoBtn) redoBtn.disabled = !(W._editRedo && W._editRedo.length);
    // El layout de los lápices depende de si el FAB está visible (ocupa hueco a la derecha).
    if(typeof _layoutEditToggles==='function') _layoutEditToggles();
    // El FAB de acciones se mantiene en sync con los botones originales.
    _updateActFabState();
  }
  W._updateFabState = _updateFabState;
  // Observa cambios en los botones originales para mantener el FAB sincronizado
  // (display:none ↔ inline-flex, cambios de texto y disabled durante captura).
  (function _observeBtnImg(){
    var src = document.getElementById('btn-img');
    if(!src || !window.MutationObserver) return;
    var mo = new MutationObserver(_updateActFabState);
    ['btn-img','btn-copy-img','btn-link-img','btn-share'].forEach(function(id){
      var el=document.getElementById(id);
      if(el) mo.observe(el, {attributes:true, characterData:true, childList:true, subtree:true});
    });
  })();
  _ensureFab();
  _ensureActFab();
  _updateFabState();

  // ── Persist textarea height across reloads ──
  (function(){
    var KEY = 'garmin-laps-editor-height';
    var ta = document.getElementById('json-input');
    if(!ta) return;
    var saved = localStorage.getItem(KEY);
    if(saved) ta.style.height = saved;
    var _save = function(){
      localStorage.setItem(KEY, ta.style.height || ta.offsetHeight + 'px');
    };
    ta.addEventListener('mouseup', _save);
    ta.addEventListener('touchend', _save);
    var _timer;
    ta.addEventListener('input', function(){
      clearTimeout(_timer);
      _timer = setTimeout(_save, 600);
    });
  })();
})();

// Init for static HTML pages (loaded from saved files, server-rendered, etc.)
if (typeof window._initLapEditAll === 'function') {
  setTimeout(window._initLapEditAll, 0);
}
// Ensure settings/connector panels exist (for loading from restored HTML)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(_ensurePanels, 0); });
} else {
  setTimeout(_ensurePanels, 0);
}
// ── Auto-import config from shared link ──
(function(){
  var m=window.location.search.match(/[?&]config=([^&]+)/);
  var s=window.location.search.match(/[?&]server=([^&]+)/);
  if(m){
    var shareId=m[1];
    var server=s ? decodeURIComponent(s[1]) : _getConnectorUrl();
    if(server){
      fetch(server.replace(/\/+$/,'')+'/config/share/'+encodeURIComponent(shareId))
        .then(function(r){return r.json();})
        .then(function(data){
          if(data.error) return;
          if(data.server) localStorage.setItem(CONNECTOR_URL_KEY,data.server);
          if(data.user) localStorage.setItem(CONNECTOR_USER_KEY,data.user);
          if(data.drive) localStorage.setItem(DRIVE_UPLOAD_URL_KEY,data.drive);
          if(data.aliases) localStorage.setItem(CONNECTOR_ALIASES_KEY,JSON.stringify(data.aliases));
          if(data.hrZones) localStorage.setItem('customHRZones',data.hrZones);
          if(data.hrMethod) localStorage.setItem('hr-method',data.hrMethod);
          if(data.hrLactate) localStorage.setItem('hr-lactate-value',data.hrLactate);
          if(data.hrMaxHr) localStorage.setItem('hr-maxhr-value',data.hrMaxHr);
          if(data.hrFcrMax) localStorage.setItem('hr-fcr-max',data.hrFcrMax);
          if(data.hrFcrRest) localStorage.setItem('hr-fcr-rest',data.hrFcrRest);
          if(data.hrZonesInput) localStorage.setItem('hr-zones-input',data.hrZonesInput);
          if(data.shareOpts) localStorage.setItem('garminShareOpts',data.shareOpts);
          if(data.customPresets) localStorage.setItem('garminCustomPresets',data.customPresets);
          if(data.textPresets) localStorage.setItem('garminTextPresets',data.textPresets);
          if(data.hiddenCols) Object.keys(data.hiddenCols).forEach(function(k){localStorage.setItem(k,data.hiddenCols[k]);});
          _toast('✓ Configuración importada desde enlace compartido.','ok');
          history.replaceState(null,'',window.location.pathname);
          setTimeout(function(){window.location.reload();},1500);
        })
        .catch(function(){});
    }
  }
})();
// Click-to-edit activity name on preview title
document.addEventListener('click', function(e){
  var title=e.target.closest('.share-preview-wrap .sc-title');
  if(!title||title.getAttribute('contenteditable')==='true')return;
  e.preventDefault();
  // Strip tipo prefix so only the name is editable
  var txt=title.textContent.trim();
  var idx=txt.lastIndexOf(' · ');
  var nameOnly=idx>=0?txt.substring(idx+3).trim():txt;
  title.textContent=nameOnly;
  title.contentEditable='true';
  title.spellcheck=false;
  title.focus();
  var r=document.createRange();
  r.selectNodeContents(title);
  var s=window.getSelection();
  s.removeAllRanges();
  s.addRange(r);
  function _end(){
    title.contentEditable='false';
    var inp=document.getElementById('sh-custom-name');
    if(inp){
      inp.value=title.textContent.trim();
      inp.dispatchEvent(new Event('input'));
    }
    title.removeEventListener('blur',_end);
    title.removeEventListener('keydown',_key);
  }
  function _key(ke){
    if(ke.key==='Enter'&&!ke.shiftKey){ke.preventDefault();title.blur();}
  }
  title.addEventListener('blur',_end);
  title.addEventListener('keydown',_key);
});

