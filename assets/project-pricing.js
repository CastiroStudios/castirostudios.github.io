(() => {
  const packages = {single:{label:'Single video',count:1,base:10},batch:{label:'10-video package',count:10,base:50},campaign:{label:'20-video package',count:20,base:100},sample:{label:'Free sample',count:1,base:0}};
  const extras = {motion:{label:'Motion graphics',price:5},ai:{label:'AI-assisted production',price:5},voice:{label:'ElevenLabs voiceover',price:3}};
  function calculate(key,duration,selected) {
    const p=packages[key];
    if(!p) throw new Error('Unknown package');
    const sample=key==='sample';
    const durationRate=sample?0:({30:0,60:5,90:10})[duration];
    if(durationRate===undefined) throw new Error('Invalid duration');
    const additions=sample?[]:selected.map(k=>({label:extras[k].label,amount:extras[k].price*p.count}));
    return {...p,sample,duration:sample?15:Number(duration),durationCost:durationRate*p.count,additions,total:p.base+durationRate*p.count+additions.reduce((s,x)=>s+x.amount,0)};
  }
  if(typeof module!=='undefined') module.exports={calculate};
  if(typeof document==='undefined') return;
  const form=document.querySelector('#project-builder');
  if(!form) return;
  const money=n=>'$'+n.toFixed(2);
  const draftKey='castiro-draft-brief';
  try {
    const draft=JSON.parse(sessionStorage.getItem(draftKey)||'null');
    if(draft && typeof draft==='object') {
      const selected=form.querySelector(`[name="package"][value="${draft.package}"]`);
      if(selected) selected.checked=true;
      if(['30','60','90'].includes(draft.duration)) form.elements.duration.value=draft.duration;
      form.querySelectorAll('[name=extra]').forEach(input=>{ input.checked=Array.isArray(draft.extras)&&draft.extras.includes(input.value); });
      if([...form.elements.platform.options].some(option=>option.value===draft.platform)) form.elements.platform.value=draft.platform;
      if(typeof draft.brief==='string') form.elements.brief.value=draft.brief.slice(0,4000);
    }
  } catch {}
  function saveDraft() {
    try { sessionStorage.setItem(draftKey,JSON.stringify({package:form.elements.package.value,duration:form.elements.duration.value,extras:[...form.querySelectorAll('[name=extra]:checked')].map(x=>x.value),platform:form.elements.platform.value,brief:form.elements.brief.value})); } catch {}
  }
  function update() {
    const key=form.elements.package.value;
    const sample=key==='sample';
    document.querySelector('#paid-options').disabled=sample;
    const quote=calculate(key,form.elements.duration.value,[...form.querySelectorAll('[name=extra]:checked')].map(x=>x.value));
    document.querySelector('#sample-note').hidden=!sample;
    document.querySelector('#summary-name').textContent=quote.label;
    document.querySelector('#total').textContent=money(quote.total);
    const rate=document.querySelector('#per-video');
    if(rate){ rate.hidden=sample; rate.textContent=money(quote.total/quote.count)+' / video'; }
    document.querySelector('#summary-lines').replaceChildren(...[
      [quote.label,money(quote.base)],
      [sample?'Up to 15 seconds, watermarked preview':'Up to '+quote.duration+' seconds per video',money(quote.durationCost)],
      ...quote.additions.map(x=>[x.label+' × '+quote.count,money(x.amount)])
    ].map(([label,price])=>{const row=document.createElement('div');const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=price;row.append(a,b);return row;}));
    const text=['CAST.IRO STUDIOS — PROJECT BRIEF',quote.label,'Quantity: '+quote.count,'Duration: up to '+quote.duration+' seconds per video',...quote.additions.map(x=>x.label+': '+money(x.amount)),'Estimated total: '+money(quote.total)+' USD','Platform: '+form.elements.platform.value,'Project notes: '+form.elements.brief.value,'','Estimate only; subject to scope and studio acceptance.','No payment or booking has been made.'].join('\n');
    document.querySelector('#brief-output').value=text;
    saveDraft();
    return text;
  }
  form.addEventListener('input',update);form.addEventListener('change',update);
  form.addEventListener('submit',e=>e.preventDefault());
  document.querySelector('#download-brief').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([update()],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='Castiro-project-brief.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    document.querySelector('#brief-status').textContent='Brief downloaded. Nothing has been sent to the studio.';
  });
  document.querySelector('#copy-brief').addEventListener('click',async()=>{
    const text=update();try {await navigator.clipboard.writeText(text);document.querySelector('#brief-status').textContent='Brief copied. Nothing has been sent.';}
    catch {const out=document.querySelector('#brief-output');out.focus();out.select();document.querySelector('#brief-status').textContent='Select and copy the brief below.';}
  });
  document.querySelector('#email-brief').addEventListener('click',async()=>{
    const text=update();let body=text;
    // Some email apps cut off long mailto links, so a long brief is copied for the visitor to paste instead.
    if(encodeURIComponent(body).length>1800){
      try {await navigator.clipboard.writeText(text);} catch {}
      body=text.split('\n').slice(0,6).join('\n')+'\n\n[Your full brief has been copied. Paste it here.]';
      document.querySelector('#brief-status').textContent='Your brief is long, so it has been copied. Paste it into the email.';
    } else document.querySelector('#brief-status').textContent='Your email app should open with the brief filled in.';
    location.href='mailto:castirostudios@gmail.com?subject='+encodeURIComponent('Project brief: '+document.querySelector('#summary-name').textContent)+'&body='+encodeURIComponent(body);
  });
  update();
})();
