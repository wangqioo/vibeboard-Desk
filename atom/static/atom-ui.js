(function(global){'use strict';
function escape(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function button(text,options){options=options||{};return '<button type="button" class="atom-button'+(options.primary?' atom-button-primary':'')+'"'+(options.id?' id="'+escape(options.id)+'"':'')+(options.disabled?' disabled':'')+'>'+escape(text)+'</button>'}
function label(text){return '<span class="atom-label">'+escape(text)+'</span>'}
// row accepts trusted component HTML, not arbitrary user text. Escape text first.
function row(items){return '<div class="atom-row">'+items.join('')+'</div>'}
global.AtomUI={escape:escape,button:button,label:label,row:row};
})(window);
