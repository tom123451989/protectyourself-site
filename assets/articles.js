(()=>{
 const config=window.PROTECTYOURSELF_CONFIG||{};
 const root=String(config.supabaseUrl||'').replace(/\/$/,'');
 const key=config.supabasePublishableKey||'';
 const list=document.getElementById('articlesList');
 const search=document.getElementById('articleSearch');
 const year=document.getElementById('year');if(year)year.textContent=new Date().getFullYear();
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.nav');
 if(menu&&nav)menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
 let articles=[];
 function render(){const q=String(search?.value||'').trim().toLowerCase();const rows=articles.filter(a=>!q||[a.title,a.category,a.excerpt].some(v=>String(v||'').toLowerCase().includes(q)));
  if(!rows.length){list.innerHTML='<p class="articles-state">'+(articles.length?'No articles match your search. Try another word.':'No articles have been published yet. Please check back soon.')+'</p>';return;}
  list.innerHTML=rows.map(a=>'<article class="article-card"><span class="card-meta">'+safe(a.category||'ARTICLE').toUpperCase()+' · '+Math.max(1,Number(a.read_time_minutes)||4)+' MIN READ</span><h2><a href="article.html?slug='+encodeURIComponent(a.slug)+'">'+safe(a.title)+'</a></h2><p>'+safe(a.excerpt||'')+'</p><a class="article-read" href="article.html?slug='+encodeURIComponent(a.slug)+'">Read article →</a></article>').join('');
 }
 async function load(){if(!root||!key){list.innerHTML='<p class="articles-state">The article catalogue is not configured yet. Please try again later.</p>';return;}try{const url=root+'/rest/v1/journal_articles?is_published=eq.true&select=id,title,slug,category,read_time_minutes,excerpt,published_at,created_at&order=published_at.desc.nullslast,created_at.desc';const r=await fetch(url,{headers:{apikey:key}});if(!r.ok)throw new Error('Article request failed ('+r.status+')');const data=await r.json();articles=Array.isArray(data)?data:[];render();}catch(e){console.error('Could not load article archive',e);list.innerHTML='<p class="articles-state">We could not load articles right now. Please refresh the page later.</p>';}}
 if(search)search.addEventListener('input',render);load();
})();