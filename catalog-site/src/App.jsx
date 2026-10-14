import React from 'react';
import Template from './Template.jsx';

const MK='georgsby/dev-digest-ai-marketplace',MN='dev-digest-ai',GH='https://github.com/'+MK,COMMIT=catalog.commit;
import catalog from './data/catalog.json';
import { tr, trp, searchVocabulary } from './i18n.js';

// Real data only: generated from the marketplace by scripts/build-catalog.mjs.
const PLUGINS=catalog.plugins;
// "engineering-paved-path ^1.0.0" when plugin.json gives a version range.
const depLabel=p=>name=>{const v=(p.dependencies||[]).find(d=>d.name===name)?.version;return v?`${name} ${v}`:name;};
const TM={plugin:[tr('type.plugin'),'var(--c-plugin)'],skill:[tr('type.skill'),'var(--c-skill)'],agent:[tr('type.agent'),'var(--c-agent)'],command:[tr('type.command'),'var(--c-command)'],hook:[tr('type.hook'),'var(--c-hook)'],mcp:[tr('type.mcp'),'var(--c-mcp)']};
const TYPES=['plugin','skill','agent','command','hook','mcp'];
const {INTENT,STOP_PH,SYN,CONCEPTS}=searchVocabulary;const STOP=new Set(searchVocabulary.stop);
const FIELDS=[['title',5],['name',5],['keywords',4],['description',3],['plugin',2],['tags',2],['body',1]];
const tok=s=>(s||'').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const rc=p=>!p.external&&!!((p.hooks||[]).length||(p.mcp||[]).length||(p.scripts||[]).length);
const enc=encodeURIComponent;
function lev(a,b){const m=a.length,n=b.length;let p=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){const c=[i];for(let j=1;j<=n;j++)c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1));p=c;}return p[n];}
const ARTS=(()=>{const A=[];for(const p of PLUGINS){const b={plugin:p.name,version:p.version,category:p.category,tags:p.tags,runsCode:rc(p),external:!!p.external,updatedAt:p.updatedAt};
 A.push({...b,id:'plugin:'+p.name,type:'plugin',name:p.name,title:p.displayName||p.name,description:p.description,keywords:p.keywords||[],body:(p.readme||[]).join(' ')});
 (p.skills||[]).forEach(s=>A.push({...b,id:`skill:${p.name}:${s.name}`,type:'skill',name:s.name,title:s.name,description:s.description,keywords:[],invocation:`/${p.name}:${s.name}`,body:''}));
 (p.agents||[]).forEach(s=>A.push({...b,id:`agent:${p.name}:${s.name}`,type:'agent',name:s.name,title:s.name,description:s.description,keywords:[],body:''}));
 (p.commands||[]).forEach(s=>A.push({...b,id:`command:${p.name}:${s.name}`,type:'command',name:s.name,title:`/${p.name}:${s.name}`,description:s.description,keywords:[],invocation:`/${p.name}:${s.name}`,body:''}));
 (p.hooks||[]).forEach((h,i)=>A.push({...b,id:`hook:${p.name}:${h.event}:${i}`,type:'hook',name:h.event,title:`${h.event} · ${h.matcher}`,description:h.desc||`Runs ${h.cmd}`,keywords:[],body:h.cmd}));
 (p.mcp||[]).forEach(m=>A.push({...b,id:`mcp:${p.name}:${m.name}`,type:'mcp',name:m.name,title:m.name,description:`${m.desc} ${m.transport} · ${m.target}`,keywords:[],body:''}));}
 A.forEach(a=>{a._t={title:a.title.toLowerCase(),name:a.name.toLowerCase(),keywords:a.keywords.join(' ').toLowerCase(),description:a.description.toLowerCase(),plugin:a.plugin,tags:a.tags.join(' '),body:a.body.toLowerCase()};a._f={};for(const k in a._t)a._f[k]=tok(a._t[k]);});return A;})();
function altScore(a,alt){if(alt.startsWith('/'))return a.invocation&&a.invocation.startsWith(alt)?20:0;let best=0;
 for(const [f,b] of FIELDS){let m=0;if(alt.includes(' ')){if(a._t[f].includes(alt))m=1;}else for(const t of a._f[f]){if(t===alt){m=1;break;}if(alt.length>=2&&t.startsWith(alt))m=Math.max(m,.75);else if(alt.length>=4&&Math.abs(t.length-alt.length)<=1&&lev(t,alt)<=Math.max(1,Math.floor(alt.length*.2)))m=Math.max(m,.5);}best=Math.max(best,m*b);}return best;}
function parseQuery(q){let s=' '+q.toLowerCase().trim().replace(/[^a-z0-9\-\/:\s]/g,' ')+' ';let intent=null;
 s=s.replace(/\bslash commands?\b/g,()=>{intent='command';return ' ';});for(const ph of STOP_PH)s=s.split(' '+ph+' ').join(' ');
 const terms=[];for(const w of s.split(/\s+/).filter(Boolean)){if(INTENT[w]){intent=intent||INTENT[w];continue;}if(STOP.has(w))continue;if(w.startsWith('/'))terms.push(w);else w.split(/[-:]/).filter(Boolean).forEach(x=>terms.push(x));}
 return {terms,intent};}
function runGroups(groups,arts,mode){const out=[];for(const a of arts){let sum=0,hit=0;const matched=[];for(const g of groups){let gs=0;g.forEach((alt,i)=>{const s=altScore(a,alt)*(i?0.8:1);if(s>0)matched.push(alt);gs=Math.max(gs,s);});if(gs>0)hit++;sum+=gs;}
 if(mode==='and'?hit===groups.length:hit>0)out.push({a,score:sum,matched});}return out.sort((x,y)=>y.score-x.score);}
function keywordSearch(terms,arts){const groups=terms.map(t=>[t,...(SYN[t]||[])]);let r=runGroups(groups,arts,'and');if(!r.length)r=runGroups(groups,arts,'or');return r;}
function smartSearch(terms,arts){const ex=new Set();terms.forEach(t=>{ex.add(t);for(const k in CONCEPTS)if(t.length>=4&&(k.startsWith(t)||t.startsWith(k)))CONCEPTS[k].forEach(c=>ex.add(c));});const r=runGroups([...ex].map(x=>[x]),arts,'or');if(!r.length)return r;const top=r[0].score;return r.filter(x=>x.score>=top*0.3);}
const fmtDate=d=>{const [y,m,dd]=d.split('-');return tr('date.format',{month:tr('date.months')[+m-1],day:+dd,year:y});};
const installFor=(n,i)=>[`/plugin install ${n} --marketplace ${MK}`,`/plugin marketplace add ${MK}\n/plugin install ${n}@${MN}`,`claude plugin install ${n}@${MN}`][i];
const ls=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v);}catch(e){return null;}};

export default class App extends React.Component {
  state={route:{page:'home'},q:'',types:[],cats:[],tags:[],plug:'',nocode:false,sort:'relevance',intentOff:false,
    theme:ls('catalog-theme'),smart:ls('catalog-smart')==='1',modelReady:ls('catalog-model')==='1',modelPct:-1,
    bundle:JSON.parse(ls('catalog-bundle')||'[]'),installTab:0,bundleTab:0,copied:null,toast:'',clFilter:'',};
  searchRef=React.createRef();
  componentDidMount(){this.onHash=()=>this.readHash();this.onKey=e=>{const t=e.target.tagName;if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(t)){e.preventDefault();if(this.state.route.page!=='home')location.hash='#/';setTimeout(()=>this.searchRef.current&&this.searchRef.current.focus(),30);}};
    window.addEventListener('hashchange',this.onHash);window.addEventListener('keydown',this.onKey);this.readHash();this.applyTheme();}
  componentWillUnmount(){window.removeEventListener('hashchange',this.onHash);window.removeEventListener('keydown',this.onKey);clearInterval(this.iv);}
  componentDidUpdate(){this.applyTheme();}
  theme(){return this.state.theme||this.props.defaultTheme||'dark';}
  applyTheme(){document.documentElement.setAttribute('data-theme',this.theme());}
  readHash(){const h=location.hash.slice(1)||'/';const [path,qs]=h.split('?');const p=new URLSearchParams(qs||'');const seg=path.split('/').filter(Boolean);let route;
    if(!seg.length)route={page:'home'};else if(seg[0]==='plugins'&&seg[1])route={page:'plugin',id:seg[1],focus:seg[2]&&seg[3]?`${seg[2]}:${seg[3]}`:null};
    else if(['changelog','bundle'].includes(seg[0]))route={page:seg[0]};else route={page:'404'};
    const patch={route};
    if(route.page==='home'){Object.assign(patch,{q:p.get('q')||'',types:(p.get('type')||'').split(',').filter(Boolean),cats:(p.get('cat')||'').split(',').filter(Boolean),tags:(p.get('tag')||'').split(',').filter(Boolean),plug:p.get('plugin')||'',nocode:p.get('nocode')==='1',sort:p.get('sort')||'relevance'});}
    if(route.page==='bundle'&&p.get('p')){const b=[...new Set([...this.state.bundle,...p.get('p').split(',')])].filter(n=>PLUGINS.some(x=>x.name===n));patch.bundle=b;ls('catalog-bundle',JSON.stringify(b));}
    if(route.page!==this.state.route.page||route.id!==this.state.route.id){window.scrollTo(0,0);patch.installTab=0;}
    this.setState(patch,()=>{if(route.focus){setTimeout(()=>{const el=document.getElementById('c-'+route.focus.replace(':','-'));if(el)window.scrollTo({top:el.getBoundingClientRect().top+window.scrollY-80,behavior:'smooth'});},60);}});}
  homeHash(s=this.state){const p=new URLSearchParams();if(s.q)p.set('q',s.q);if(s.types.length)p.set('type',s.types.join(','));if(s.cats.length)p.set('cat',s.cats.join(','));if(s.tags.length)p.set('tag',s.tags.join(','));if(s.plug)p.set('plugin',s.plug);if(s.nocode)p.set('nocode','1');if(s.sort!=='relevance')p.set('sort',s.sort);const qs=p.toString();return '/'+(qs?'?'+qs:'');}
  setHome(patch){this.setState(patch,()=>{try{history.replaceState(null,'','#'+this.homeHash());}catch(e){}});}
  toastMsg(t,id){this.setState({toast:t,copied:id||null});clearTimeout(this.tt);this.tt=setTimeout(()=>this.setState({toast:'',copied:null}),1600);}
  copy(text,msg,id){try{navigator.clipboard.writeText(text);}catch(e){}this.toastMsg(msg||tr('toast.copied'),id);}
  toggleArr(k,v){const a=this.state[k];this.setHome({[k]:a.includes(v)?a.filter(x=>x!==v):[...a,v]});}
  toggleBundle(n){const b=this.state.bundle.includes(n)?this.state.bundle.filter(x=>x!==n):[...this.state.bundle,n];ls('catalog-bundle',JSON.stringify(b));this.setState({bundle:b});}
  toggleSmart(){const on=!this.state.smart;ls('catalog-smart',on?'1':'0');this.setState({smart:on});
    if(on&&!this.state.modelReady){clearInterval(this.iv);this.setState({modelPct:0});this.iv=setInterval(()=>{const n=Math.min(100,this.state.modelPct+6+Math.random()*6);if(n>=100){clearInterval(this.iv);ls('catalog-model','1');this.setState({modelPct:-1,modelReady:true});this.toastMsg(tr('toast.smart_ready'));}else this.setState({modelPct:n});},90);}}
  fullBundle(){const out=[],seen=new Set();const add=(n,because)=>{if(seen.has(n))return;const p=PLUGINS.find(x=>x.name===n);if(!p)return;seen.add(n);out.push({p,because});(p.deps||[]).forEach(d=>add(d,n));};this.state.bundle.forEach(n=>add(n,null));
    return out.map(o=>({...o,auto:!this.state.bundle.includes(o.p.name)}));}
  render(){return <Template v={this.viewModel()}/>;}
  viewModel(){
    const s=this.state,phase=Number(this.props.phase??3),empty=!PLUGINS.length,page=s.route.page;
    const plugins=empty?[]:PLUGINS,arts=empty?[]:ARTS;
    const tab=(label,active,select)=>({label,active,select,border:active?'var(--accent)':'transparent',fg:active?'var(--text)':'var(--muted)'});
    const built=catalog.generatedAt?new Date(catalog.generatedAt).toISOString().slice(0,16).replace('T',' ')+tr('footer.utc_suffix'):'';
    const v={built,commitShort:(COMMIT||'').slice(0,7),commitHref:COMMIT?`${GH}/commit/${COMMIT}`:GH,searchRef:this.searchRef,q:s.q,sort:s.sort,toast:s.toast,hasToast:!!s.toast,themeLabel:this.theme()==='dark'?tr('theme.light'):tr('theme.dark'),
      toggleTheme:()=>{const t=this.theme()==='dark'?'light':'dark';ls('catalog-theme',t);this.setState({theme:t});},
      isHome:page==='home',isPlugin:page==='plugin',isChangelog:page==='changelog'&&phase>=2,isBundle:page==='bundle'&&phase>=2,
      showSmart:phase>=2,showBundle:phase>=2,showChangelog:phase>=2,catalogEmpty:empty,catalogFull:!empty,
      pluginOptions:plugins.map(p=>({value:p.name,label:p.name})),noSubmit:e=>e.preventDefault()};
    v.isNotFound=!(v.isHome||v.isPlugin||v.isChangelog||v.isBundle);
    v.nav=[[tr('nav.browse'),'#/','home',true],[tr('nav.changelog'),'#/changelog','changelog',phase>=2],[tr('nav.bundle'),'#/bundle','bundle',phase>=2]].filter(x=>x[3]).map(([label,href,pg])=>({label,href,fg:page===pg?'var(--text)':'var(--muted)',bg:page===pg?'var(--panel2)':'transparent',hasCount:pg==='bundle'&&s.bundle.length>0,count:s.bundle.length}));

    if(page==='home'){
      const {terms,intent}=parseQuery(s.q);const useIntent=intent&&!s.intentOff;const hasQ=terms.length>0;
      let ranked;let kwCount=0;
      if(!hasQ)ranked=arts.map(a=>({a,matched:[]})).sort((x,y)=>(x.a.type==='plugin'?0:1)-(y.a.type==='plugin'?0:1)||y.a.updatedAt.localeCompare(x.a.updatedAt));
      else{const kw=keywordSearch(terms,arts);kwCount=kw.length;
        if(s.smart&&s.modelReady&&phase>=2){const sm=smartSearch(terms,arts),sc=new Map();kw.forEach((r,i)=>sc.set(r.a.id,{r,v:1/(60+i),kw:true}));sm.forEach((r,i)=>{const e=sc.get(r.a.id);if(e)e.v+=1/(60+i);else sc.set(r.a.id,{r,v:1/(60+i),kw:false});});
          ranked=[...sc.values()].sort((a,b)=>b.v-a.v).slice(0,50).map(e=>({...e.r,semantic:!e.kw}));}else ranked=kw;
        const nq=s.q.trim().toLowerCase();ranked.sort((x,y)=>((y.a.invocation===nq||y.a.name===nq)?1:0)-((x.a.invocation===nq||x.a.name===nq)?1:0));}
      let notice='';let pool=ranked;
      if(useIntent){const f=ranked.filter(r=>r.a.type===intent);if(f.length)pool=f;else notice=tr('search.no_intent_match',{type:TM[intent][0].toLowerCase()});}
      const pass=(a,skip)=>(skip==='type'||!s.types.length||s.types.includes(a.type))&&(skip==='cat'||!s.cats.length||s.cats.includes(a.category))&&(skip==='tag'||!s.tags.length||s.tags.some(t=>a.tags.includes(t)))&&(!s.plug||a.plugin===s.plug)&&(!s.nocode||!a.runsCode);
      let res=pool.filter(r=>pass(r.a));
      if(s.sort==='updated')res=[...res].sort((x,y)=>y.a.updatedAt.localeCompare(x.a.updatedAt));if(s.sort==='name')res=[...res].sort((x,y)=>x.a.title.localeCompare(y.a.title));
      const cnt=(skip,key)=>{const m={};pool.filter(r=>pass(r.a,skip)).forEach(r=>{[].concat(key(r.a)).forEach(k=>m[k]=(m[k]||0)+1);});return m;};
      const tc=cnt('type',a=>a.type),cc=cnt('cat',a=>a.category),gc=cnt('tag',a=>a.tags);
      const facet=(label,active,count,toggle,color)=>({label,active,count:count||0,toggle,color,fg:count||active?'var(--text)':'var(--muted)',boxBorder:active?'var(--accent)':'var(--line)',boxBg:active?'var(--accent)':'transparent',chipBg:active?'var(--hl)':'transparent',mark:active?'✓':''});
      v.typeFacets=TYPES.map(t=>facet(TM[t][0],s.types.includes(t),tc[t],()=>this.toggleArr('types',t),TM[t][1]));
      v.catFacets=[...new Set(arts.map(a=>a.category))].sort().map(c=>facet(c,s.cats.includes(c),cc[c],()=>this.toggleArr('cats',c)));
      v.tagFacets=[...new Set(arts.flatMap(a=>a.tags))].sort().map(t=>facet(t,s.tags.includes(t),gc[t],()=>this.toggleArr('tags',t)));
      v.pluginFilter=s.plug;v.onPluginFilter=e=>this.setHome({plug:e.target.value});
      v.noCode=s.nocode;v.noCodeTrack=s.nocode?'var(--accent)':'var(--line)';v.noCodeKnob=s.nocode?'14px':'2px';v.toggleNoCode=()=>this.setHome({nocode:!s.nocode});
      v.anyFilter=!!(s.types.length||s.cats.length||s.tags.length||s.plug||s.nocode);
      v.clearFilters=()=>this.setHome({types:[],cats:[],tags:[],plug:'',nocode:false,intentOff:true});
      v.activeChips=[...s.types.map(t=>({label:TM[t][0],remove:()=>this.toggleArr('types',t)})),...s.cats.map(c=>({label:c,remove:()=>this.toggleArr('cats',c)})),...s.tags.map(t=>({label:'#'+t,remove:()=>this.toggleArr('tags',t)})),...(s.plug?[{label:s.plug,remove:()=>this.setHome({plug:''})}]:[]),...(s.nocode?[{label:tr('filter.runs_no_code'),remove:()=>this.setHome({nocode:false})}]:[])];
      v.hasIntent=!!useIntent;v.intentLabel=useIntent?TM[intent][0]+'s':'';v.dismissIntent=()=>this.setState({intentOff:true});
      v.onQuery=e=>this.setHome({q:e.target.value,intentOff:false});v.onSort=e=>this.setHome({sort:e.target.value});
      v.smartOn=s.smart;v.smartTrack=s.smart?'var(--accent)':'var(--line)';v.smartKnob=s.smart?'14px':'2px';v.toggleSmart=()=>this.toggleSmart();
      v.modelLoading=s.modelPct>=0;v.modelPctLabel=Math.round(Math.max(0,s.modelPct))+'%';v.modelPctCss=Math.max(0,s.modelPct)+'%';
      v.heroSub=empty?tr('hero.sub_empty'):tr('hero.sub',{components:arts.length,plugins:plugins.length});
      v.countLabel=hasQ?trp('search.results',res.length,{query:s.q.trim()}):tr('search.components',{n:res.length});
      v.notice=notice;v.hasNotice=!!notice;
      v.noResults=hasQ&&res.length===0;v.offerSmart=phase>=2&&!s.smart;
      v.smartHint=phase>=2&&hasQ&&!s.smart&&kwCount>0&&kwCount<3;
      v.suggestUrl=`${GH}/issues/new?template=suggest-skill.yml&title=${enc('[suggest] '+s.q.trim())}&query=${enc(s.q.trim())}`;
      v.showRecent=phase>=2&&!hasQ&&!v.anyFilter;
      v.recent=plugins.flatMap(p=>(p.releases||[]).map(r=>({plugin:p.name,version:r.v,d:r.date,date:fmtDate(r.date),href:'#/plugins/'+p.name}))).sort((a,b)=>b.d.localeCompare(a.d)).slice(0,5);
      const hlWords=r=>[...new Set((r.matched||[]).flatMap(m=>m.split(' ')).filter(w=>w.length>=3&&!w.startsWith('/')))];
      v.cards=res.map(r=>{const a=r.a,words=hlWords(r);let parts=[{t:a.description,fg:'inherit',bg:'transparent'}];
        if(words.length){const re=new RegExp('\\b('+words.map(w=>w.replace(/[^a-z0-9]/g,'')).join('|')+')[a-z]*','gi');parts=a.description.split(re).filter(x=>x!=='');const out=[];let rest=a.description;parts=[];let m,last=0;re.lastIndex=0;while((m=re.exec(rest))){if(m.index>last)parts.push({t:rest.slice(last,m.index),fg:'inherit',bg:'transparent'});parts.push({t:m[0],fg:'var(--text)',bg:'var(--hl)'});last=m.index+m[0].length;}if(last<rest.length)parts.push({t:rest.slice(last),fg:'inherit',bg:'transparent'});}
        const href=a.type==='plugin'?`#/plugins/${a.plugin}`:a.type==='hook'||a.type==='mcp'?`#/plugins/${a.plugin}`:`#/plugins/${a.plugin}/${a.type}/${a.name}`;
        const inB=s.bundle.includes(a.plugin);
        return {id:a.id,typeLabel:TM[a.type][0],typeColor:TM[a.type][1],version:/^\d/.test(a.version||'')?tr('card.version',{version:a.version}):(a.version||''),versionTitle:a.type==='plugin'?'':tr('card.version_of_plugin',{plugin:a.plugin}),title:a.title,parts,pluginVer:a.type==='plugin'?(a.external?tr('card.external_not_indexed'):`${a.plugin}@${a.version}`):`${a.plugin}@${a.version}`,runsCode:a.runsCode,external:a.external,semantic:!!r.semantic,
          open:()=>{location.hash=href;},key:e=>{if(e.key==='Enter'&&e.target===e.currentTarget)location.hash=href;if(e.key==='c'&&e.target===e.currentTarget)this.copy(installFor(a.plugin,0),tr('toast.copied_install_for',{plugin:a.plugin}),a.id);},
          copy:e=>{e.stopPropagation();this.copy(installFor(a.plugin,0),tr('toast.copied_install_for',{plugin:a.plugin}),a.id);},copyLabel:s.copied===a.id?tr('action.copied'):tr('action.copy_install'),
          canBundle:phase>=2&&a.type==='plugin'&&!a.external,inBundle:inB,bundleLabel:inB?tr('bundle.in_bundle'):tr('bundle.add_label'),bundleBg:inB?'var(--hl)':'transparent',toggleBundle:e=>{e.stopPropagation();this.toggleBundle(a.plugin);}};});
    }

    v.backHref='#'+this.homeHash();
    if(page==='plugin'){const p=plugins.find(x=>x.name===s.route.id);if(!p){v.isPlugin=false;v.isNotFound=true;}else{
      const f=s.route.focus,inB=s.bundle.includes(p.name);
      const item=(type,x,extra)=>({name:type==='command'?`/${p.name}:${x.name}`:x.name,description:x.description||x.desc,anchor:`c-${type}-${x.name}`,bg:f===`${type}:${x.name}`?'var(--hl)':'transparent',...extra});
      const groups=[];
      if((p.skills||[]).length)groups.push({label:tr('group.skills'),color:TM.skill[1],items:p.skills.map(x=>item('skill',x,{invocation:`/${p.name}:${x.name}`,hasInvocation:true,meta:x.tools?tr('meta.allowed_tools',{value:x.tools}):'',hasMeta:!!x.tools}))});
      if((p.agents||[]).length)groups.push({label:tr('group.agents'),color:TM.agent[1],items:p.agents.map(x=>item('agent',x,{hasInvocation:false,meta:[x.tools&&tr('meta.tools',{value:x.tools}),x.model&&tr('meta.model',{value:x.model})].filter(Boolean).join(' · '),hasMeta:true}))});
      if((p.commands||[]).length)groups.push({label:tr('group.commands'),color:TM.command[1],items:p.commands.map(x=>item('command',x,{hasInvocation:false,meta:x.hint?tr('meta.argument_hint',{value:x.hint}):'',hasMeta:!!x.hint}))});
      if((p.hooks||[]).length)groups.push({label:tr('group.hooks'),color:TM.hook[1],items:p.hooks.map((x,i)=>({name:`${x.event} · ${x.matcher}`,description:x.desc,anchor:'c-hook-'+i,bg:'transparent',hasInvocation:false,meta:`${x.type} · ${x.cmd}`,hasMeta:true}))});
      if((p.mcp||[]).length)groups.push({label:tr('group.mcp'),color:TM.mcp[1],items:p.mcp.map(x=>item('mcp',x,{hasInvocation:false,meta:`${x.transport} · ${x.target}`,hasMeta:true}))});
      groups.forEach(g=>g.items.forEach(it=>{it.copyInv=()=>this.copy(it.invocation,tr('toast.copied_value',{value:it.invocation}));}));
      const code=rc(p),dash=[{t:tr('surface.none_declared'),fg:'var(--muted)'}],li=a=>a.length?a.map(t=>({t,fg:'var(--text)'})):dash;
      const surface=[{label:tr('group.hooks'),items:li((p.hooks||[]).map(h=>`${h.event} · ${h.matcher} · ${h.cmd}`))},{label:tr('group.mcp'),items:li((p.mcp||[]).map(m=>`${m.name} · ${m.transport} · ${m.target}`))},{label:tr('surface.scripts'),items:li(p.scripts||[])},
        {label:tr('surface.skill_tool_access'),items:li((p.skills||[]).filter(x=>x.tools).map(x=>`${x.name}: ${x.tools}`))},{label:tr('surface.configuration'),items:li((p.userConfig||[]).map(u=>u.key+(u.sensitive?tr('surface.secret_suffix'):'')))},{label:tr('surface.dependencies'),items:li((p.deps||[]).map(depLabel(p)))}].map(r=>({...r,count:r.items===dash?'0':String(r.items.length)}));
      v.pg={name:p.name,title:p.displayName||p.name,description:p.description,version:p.version,author:p.author,license:p.license,category:p.category,updated:fmtDate(p.updatedAt),
        tags:p.tags.map(t=>({label:'#'+t,href:'#/?tag='+t})),external:!!p.external,source:p.source,hasComponents:groups.length>0,groups,
        config:p.userConfig||[],hasConfig:!!(p.userConfig||[]).length,deps:(p.deps||[]).map(d=>({name:depLabel(p)(d),href:'#/plugins/'+d})),hasDeps:!!(p.deps||[]).length,
        readme:p.readme||[],hasReadme:!!(p.readme||[]).length,releases:(p.releases||[]).map(r=>({...r,date:fmtDate(r.date)})),hasReleases:!!(p.releases||[]).length,feedHref:`plugins/${p.name}/feed.xml`,
        hasSurface:!p.external,surface,surfaceBadge:code?tr('surface.runs_code'):tr('surface.runs_no_code'),surfaceColor:code?'var(--warn)':'var(--ok)',
        ghHref:p.external?GH:`${GH}/tree/${COMMIT}/plugins/${p.name}`,issueHref:`${GH}/issues/new?title=${enc('['+p.name+'] ')}&body=${enc(`Version: ${p.version}\nPage: https://georgsby.github.io/dev-digest-ai-marketplace/plugins/${p.name}/\n\n`)}`,
        toggleBundle:()=>this.toggleBundle(p.name),bundleLabel:inB?tr('bundle.in_bundle'):tr('bundle.add_label'),bundleBg:inB?'var(--hl)':'transparent'};
      v.installTabs=[tr('install.one_step'),tr('install.two_steps'),tr('install.shell')].map((l,i)=>tab(l,s.installTab===i,()=>this.setState({installTab:i})));
      let cmd=installFor(p.name,s.installTab);if(s.installTab===2&&(p.userConfig||[]).length)cmd+=` \\\n  --config ${p.userConfig[0].key}=…`;
      v.installCmd=cmd;v.installNote=s.installTab===0||(s.installTab===2&&(p.userConfig||[]).length>0);
      v.installNoteText=s.installTab===0?tr('install.requires_version'):tr('install.needs_config');
      v.copyInstall=()=>this.copy(cmd,tr('toast.copied_install'),'inst');v.copyInstallLabel=s.copied==='inst'?tr('action.copied'):tr('action.copy');
    }}

    if(page==='changelog'){v.clFilter=s.clFilter;v.onClFilter=e=>this.setState({clFilter:e.target.value});v.clFeed=s.clFilter?`plugins/${s.clFilter}/feed.xml`:'feed.xml';
      v.changelog=plugins.filter(p=>!s.clFilter||p.name===s.clFilter).flatMap(p=>(p.releases||[]).map(r=>({plugin:p.name,version:r.v,d:r.date,date:fmtDate(r.date),notes:r.notes,href:'#/plugins/'+p.name}))).sort((a,b)=>b.d.localeCompare(a.d));}

    if(page==='bundle'){const fb=this.fullBundle();v.bundleEmpty=!fb.length;v.bundleFull=fb.length>0;
      v.bundleItems=fb.map(o=>({name:o.p.name,href:'#/plugins/'+o.p.name,auto:o.auto,because:o.because,removable:!o.auto,runsCode:rc(o.p),remove:()=>this.toggleBundle(o.p.name)}));
      const names=fb.map(o=>o.p.name);
      const outs=[names.map(n=>`/plugin install ${n} --marketplace ${MK}`).join('\n'),`claude plugin marketplace add ${MK}\n`+names.map(n=>`claude plugin install ${n}@${MN}`).join('\n'),
        JSON.stringify({extraKnownMarketplaces:{[MN]:{source:{source:'github',repo:MK}}},enabledPlugins:Object.fromEntries(names.map(n=>[`${n}@${MN}`,true]))},null,2)];
      v.bundleTabs=[tr('bundle.tab_slash'),tr('bundle.tab_shell'),tr('bundle.tab_settings')].map((l,i)=>tab(l,s.bundleTab===i,()=>this.setState({bundleTab:i})));
      v.bundleOut=outs[s.bundleTab];v.bundleIsSettings=s.bundleTab===2;v.copyBundle=()=>this.copy(outs[s.bundleTab],tr('toast.copied'));
      const h=fb.reduce((a,o)=>a+(o.p.hooks||[]).length,0),m=fb.reduce((a,o)=>a+(o.p.mcp||[]).length,0),sc=fb.reduce((a,o)=>a+(o.p.scripts||[]).length,0),sec=fb.flatMap(o=>(o.p.userConfig||[]).filter(u=>u.sensitive).map(u=>u.key));
      v.bundleSummary=(h||m||sc)?tr('bundle.summary',{hooks:trp('count.hook',h),mcp:trp('count.mcp',m),scripts:trp('count.script',sc),secrets:sec.length?tr('bundle.secrets',{list:sec.join(', ')}):''}):tr('bundle.summary_none');}

    return v;
  }
}
