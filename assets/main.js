(() => {
  const config = window.PROTECTYOURSELF_CONFIG || {};
  const money = n => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(Number(n||0));
  const safe = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const menu=document.querySelector('.menu-toggle'), nav=document.querySelector('.nav');
  if(menu&&nav){menu.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false');}));}
  const year=document.getElementById('year'); if(year)year.textContent=new Date().getFullYear();
  const emailNode=document.querySelector('.contact-detail b'); if(emailNode&&config.contactEmail)emailNode.textContent=config.contactEmail;
  const wa=document.getElementById('whatsappLink'), whatsappDisplay=document.querySelectorAll('.contact-detail b')[1];
  if(config.whatsappNumber){const href='https://wa.me/'+String(config.whatsappNumber).replace(/\D/g,'');if(wa){wa.href=href;wa.target='_blank';wa.rel='noopener noreferrer';}if(whatsappDisplay)whatsappDisplay.innerHTML='<a href="'+href+'" target="_blank" rel="noopener noreferrer">Chat with us on WhatsApp</a>';}
  const supabaseReady=Boolean(config.supabaseUrl&&config.supabasePublishableKey);
  const apiRoot=()=>String(config.supabaseUrl||'').replace(/\/$/,'');
  const restHeaders=()=>({'apikey':config.supabasePublishableKey,'Content-Type':'application/json'});
  const setStatus=(id,msg,type='')=>{const el=document.getElementById(id);if(el){el.textContent=msg;el.className='form-note '+type;}};
  async function loadPublicCustomization(){
    if(!supabaseReady)return;
    try{
      const r=await fetch(apiRoot()+'/rest/v1/site_customization?id=eq.1&select=config',{headers:{apikey:config.supabasePublishableKey}});
      if(!r.ok)return;
      const rows=await r.json(),c=rows&&rows[0]&&rows[0].config;if(!c)return;
      const announcement=document.querySelector('.announcement');
      if(announcement){announcement.childNodes[0].textContent=(c.announcement||'')+' ';const span=announcement.querySelector('span');if(span)span.textContent=c.announcementSub||'';}
      const safeDestination=v=>/^(#[-\w]+|https:\/\/\S+)$/i.test(String(v||''))?String(v):'#shop';
      const h=document.querySelector('.hero-copy h1');
      if(h){h.replaceChildren();h.append(document.createTextNode((c.heroLine1||'Keep your faith close.')));h.append(document.createElement('br'));const em=document.createElement('em');em.textContent=c.heroLine2||'Live with intention.';h.append(em);}
      const desc=document.querySelector('.hero-lede');if(desc&&c.heroDescription)desc.textContent=c.heroDescription;
      const primary=document.querySelector('.hero-actions .button-gold');if(primary){primary.href=safeDestination(c.primaryLink||'#shop');const arrow=primary.querySelector('span');primary.textContent=c.primaryLabel||'Explore the collection';if(arrow)primary.append(arrow);}
      const secondary=document.querySelector('.hero-actions .text-link');if(secondary){secondary.href=safeDestination(c.secondaryLink||'#about');const arrow=secondary.querySelector('span');secondary.textContent=c.secondaryLabel||'Our philosophy';if(arrow)secondary.append(arrow);}
      if(/^#[0-9a-f]{6}$/i.test(c.accent||'')){document.documentElement.style.setProperty('--gold',c.accent);document.documentElement.style.setProperty('--accent',c.accent);}
      const hero=document.querySelector('.hero-art'),active=(Array.isArray(c.slides)?c.slides:[]).filter(s=>s&&s.active!==false&&/^https:\/\/\S+/i.test(s.image_url||''));
      if(hero&&active.length){
        hero.querySelectorAll('.sun,.orbit,.mountain').forEach(el=>el.hidden=true);
        let stage=hero.querySelector('.hero-slideshow');
        if(!stage){stage=document.createElement('div');stage.className='hero-slideshow';hero.insertBefore(stage,hero.firstChild);}
        stage.dataset.transition=c.transition==='slide'?'slide':'fade';stage.replaceChildren();
        const images=active.map((slide,i)=>{const img=document.createElement('img');img.src=slide.image_url;img.alt=slide.alt||'Protectyourself spiritual hero image';img.loading=i===0?'eager':'lazy';img.className='hero-slide'+(i===0?' is-active':'');stage.append(img);return img;});
        let dots=hero.querySelector('.hero-slide-dots');if(dots)dots.remove();
        if(c.showDots!==false&&active.length>1){dots=document.createElement('div');dots.className='hero-slide-dots';dots.setAttribute('aria-label','Slideshow controls');active.forEach((slide,i)=>{const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Show slide '+(i+1));b.className=i===0?'is-active':'';b.addEventListener('click',()=>showSlide(i));dots.append(b)});hero.append(dots);}
        let index=0,timer=null;
        function showSlide(n){index=(n+images.length)%images.length;images.forEach((img,i)=>img.classList.toggle('is-active',i===index));if(dots)[...dots.children].forEach((b,i)=>b.classList.toggle('is-active',i===index));const cap=hero.querySelector('.art-caption');if(cap){const first=cap.childNodes[0];if(first&&first.nodeType===3)first.textContent=(active[index].alt||'MEANINGFUL OBJECTS. MINDFUL LIVING.').toUpperCase()+' ';const span=cap.querySelector('span');if(span)span.textContent=String(index+1).padStart(2,'0')+' / '+String(active.length).padStart(2,'0');}}
        if(c.autoplay!==false&&active.length>1)timer=setInterval(()=>showSlide(index+1),Math.max(3,Math.min(30,Number(c.interval)||6))*1000);
        const cap=hero.querySelector('.art-caption');if(cap){const first=cap.childNodes[0];if(first&&first.nodeType===3)first.textContent=(active[0].alt||'MEANINGFUL OBJECTS. MINDFUL LIVING.').toUpperCase()+' ';const span=cap.querySelector('span');if(span)span.textContent='01 / '+String(active.length).padStart(2,'0');}
        hero.dataset.slideshowReady='true';
      }
    }catch(e){console.warn('Could not load homepage customization',e);}
  }
  async function loadPublicJournal(){
    const grid=document.getElementById('journalArticles');if(!grid||!supabaseReady)return;
    try{
      const url=apiRoot()+'/rest/v1/journal_articles?is_published=eq.true&is_featured=eq.true&select=id,title,slug,category,read_time_minutes,excerpt,published_at&order=published_at.desc.nullslast,created_at.desc&limit=12';
      const r=await fetch(url,{headers:{apikey:config.supabasePublishableKey}});if(!r.ok)throw new Error('Journal request failed ('+r.status+').');
      const rows=await r.json();if(!Array.isArray(rows)||!rows.length){grid.innerHTML='<p class="catalogue-state">New articles are coming soon. Please check back later.</p>';return;}
      grid.innerHTML=rows.map((a,i)=>`<article><div class="journal-number">${String(i+1).padStart(2,'0')}</div><div><span class="card-meta">${safe(a.category||'JOURNAL').toUpperCase()} · ${Math.max(1,Number(a.read_time_minutes)||4)} MIN READ</span><h3><a class="journal-title-link" href="article.html?slug=${encodeURIComponent(a.slug)}">${safe(a.title)}</a></h3><p>${safe(a.excerpt||'')}</p><a class="journal-read-link" href="article.html?slug=${encodeURIComponent(a.slug)}">Read article ↗</a></div></article>`).join('');
    }catch(e){console.warn('Could not load Journal articles',e);}
  }
  async function loadPublicSettings(){if(!supabaseReady)return;try{const r=await fetch(apiRoot()+'/rest/v1/site_settings?id=eq.1&select=*',{headers:{apikey:config.supabasePublishableKey}});if(!r.ok)return;const rows=await r.json(),s=rows&&rows[0];if(!s)return;if(s.contact_email){const b=document.querySelector('.contact-detail b');if(b)b.textContent=s.contact_email;config.contactEmail=s.contact_email;}const notice=document.getElementById('publicNotice');if(notice&&s.public_notice){notice.hidden=false;notice.textContent=s.public_notice;}const number=String(s.whatsapp_number||'').replace(/\D/g,'');if(number){const href='https://wa.me/'+number;if(wa){wa.href=href;wa.target='_blank';wa.rel='noopener noreferrer';}if(whatsappDisplay)whatsappDisplay.textContent='Chat with us on WhatsApp';}}catch(e){console.warn('Could not load public settings',e);}}
  const form=document.getElementById('contactForm');
  if(form)form.addEventListener('submit',async e=>{e.preventDefault();if(!supabaseReady){setStatus('formStatus','Enquiry submission is temporarily unavailable. Please email '+(config.contactEmail||'protectyourselfin@gmail.com')+'.','error');return;}const button=form.querySelector('button[type="submit"]'),d=new FormData(form),name=String(d.get('name')||'').trim(),email=String(d.get('email')||'').trim(),topic=String(d.get('topic')||'General enquiry').trim(),message=String(d.get('message')||'').trim(),consent=d.get('consent')==='on';if(!name||!email||!message||!consent){setStatus('formStatus','Please complete all required fields and consent before submitting.','error');return;}if(button){button.disabled=true;button.textContent='Submitting…';}setStatus('formStatus','Submitting your enquiry securely…');try{const r=await fetch(apiRoot()+'/rest/v1/enquiries',{method:'POST',headers:{...restHeaders(),Prefer:'return=minimal'},body:JSON.stringify({customer_name:name,customer_email:email,customer_phone:null,service_name:topic,message,consent:true,status:'new',payment_status:'unverified'})});if(!r.ok){let detail='';try{const j=await r.json();detail=j.message||j.details||j.hint||'';}catch{}throw new Error(detail||'Request failed ('+r.status+').');}form.reset();setStatus('formStatus','Thank you — your enquiry has been submitted. We will respond using the email address you provided.','success');}catch(err){console.error('Enquiry submission failed:',err);setStatus('formStatus','We could not submit your enquiry. Please email '+(config.contactEmail||'protectyourselfin@gmail.com')+' and try again later.','error');}finally{if(button){button.disabled=false;button.innerHTML='Submit enquiry <span>↗</span>';}}});

  // Storefront catalogue and cart
  const grid=document.getElementById('productGrid'), overlay=document.getElementById('cartOverlay'), cartItemsNode=document.getElementById('cartItems'), cartCount=document.getElementById('cartCount');
  let products=[],cart=[],productsLoaded=false,appliedCoupon=null;try{cart=JSON.parse(localStorage.getItem('protectyourself-cart')||'[]');if(!Array.isArray(cart))cart=[];}catch{cart=[];}
  const saveCart=()=>{try{localStorage.setItem('protectyourself-cart',JSON.stringify(cart));}catch{}renderCart();};
  const cartProduct=id=>products.find(p=>p.id===id);
  function renderProducts(){if(!grid)return;if(!products.length){grid.innerHTML='<p class="catalogue-state">No products are currently published. Please check back soon.</p>';return;}grid.innerHTML=products.map(p=>`<article class="product-card"><div>${p.image_url?`<img class="product-photo" loading="lazy" src="${safe(p.image_url)}" alt="${safe(p.name)}">`:`<div class="product-art product-art-1 product-photo-placeholder" aria-label="No product image">✧</div>`}</div><div class="product-info"><div class="card-meta">${safe(p.category||'COLLECTION')}</div><h3>${safe(p.name)}</h3><p>${safe(p.description||'')}</p>${p.stock_quantity>0?`<div class="card-meta">In stock</div>`:'<div class="card-meta">Available to order</div>'}<div class="product-bottom"><b>${money(p.price_inr)}</b><button class="add-cart" data-add="${safe(p.id)}" ${p.stock_quantity===0?'disabled':''}>Add to cart +</button></div></div></article>`).join('');grid.querySelectorAll('[data-add]').forEach(b=>b.addEventListener('click',()=>{const p=cartProduct(b.dataset.add);if(!p)return;const line=cart.find(x=>x.product_id===p.id);if(line)line.quantity=Math.min(20,line.quantity+1);else cart.push({product_id:p.id,quantity:1});saveCart();b.textContent='Added ✓';setTimeout(()=>{if(b.isConnected)b.textContent='Add to cart +';},1000);}));}
  function couponPreview(coupon){
    const lines=cart.map(line=>({product:cartProduct(line.product_id),quantity:Number(line.quantity||0)})).filter(x=>x.product&&x.quantity>0);
    const eligible=coupon.applies_to_all_products?lines:lines.filter(x=>(coupon.eligible_product_ids||[]).includes(x.product.id));
    const eligibleSubtotal=eligible.reduce((sum,x)=>sum+Number(x.product.price_inr||0)*x.quantity,0);
    const minimum=Number(coupon.minimum_order_amount||0);
    if(!eligible.length)return {discount:0,message:'This code does not apply to products currently in your cart.'};
    if(eligibleSubtotal<minimum)return {discount:0,message:'This code requires an eligible subtotal of '+money(minimum)+'.'};
    if(coupon.expires_at&&Date.now()>=new Date(coupon.expires_at).getTime())return {discount:0,message:'This coupon has expired. Remove it or use another code.'};
    if(coupon.starts_at&&Date.now()<new Date(coupon.starts_at).getTime())return {discount:0,message:'This coupon is not active yet.'};
    if(coupon.usage_limit!=null&&Number(coupon.usage_count)>=Number(coupon.usage_limit))return {discount:0,message:'This coupon has reached its usage limit.'};
    let discount=coupon.discount_type==='percentage'?eligibleSubtotal*Number(coupon.discount_value)/100:Number(coupon.discount_value);
    if(coupon.discount_type==='percentage'&&coupon.maximum_discount_amount!=null)discount=Math.min(discount,Number(coupon.maximum_discount_amount));
    discount=Math.max(0,Math.min(eligibleSubtotal,Math.round((discount+Number.EPSILON)*100)/100));
    if(!discount)return {discount:0,message:'This coupon does not produce a discount for this cart.'};
    return {discount,eligibleSubtotal,message:''};
  }
  function updateCouponDisplay(subtotal){
    const panel=document.getElementById('couponPanel'),discountRow=document.getElementById('couponDiscountRow'),afterRow=document.getElementById('cartAfterDiscountRow'),foot=document.getElementById('couponFootnote');
    if(panel)panel.hidden=!cart.length;
    if(!appliedCoupon){if(discountRow)discountRow.hidden=true;if(afterRow)afterRow.hidden=true;if(foot)foot.hidden=true;return}
    const preview=couponPreview(appliedCoupon),status=document.getElementById('couponStatus');
    if(status&&preview.message){status.textContent=preview.message;status.className='form-note error'}
    const discount=preview.discount||0;
    if(discountRow)discountRow.hidden=discount<=0;
    if(afterRow)afterRow.hidden=discount<=0;
    if(foot)foot.hidden=discount<=0;
    const d=document.getElementById('couponDiscount'),a=document.getElementById('cartAfterDiscount');
    if(d)d.textContent='−'+money(discount);if(a)a.textContent=money(Math.max(0,subtotal-discount));
    const remove=document.getElementById('removeCouponBtn');if(remove)remove.hidden=false;
  }
  function renderCart(){
    if(cartCount)cartCount.textContent=String(cart.reduce((sum,x)=>sum+Number(x.quantity||0),0));if(!cartItemsNode)return;
    if(!productsLoaded){const sub=document.getElementById('cartSubtotal');if(sub)sub.textContent='—';cartItemsNode.innerHTML='<p>Loading your saved cart…</p>';return;}
    cart=cart.filter(x=>cartProduct(x.product_id)&&Number(x.quantity)>0);
    const total=cart.reduce((sum,x)=>sum+Number(cartProduct(x.product_id).price_inr)*Number(x.quantity),0),sub=document.getElementById('cartSubtotal');
    if(sub)sub.textContent=money(total);updateCouponDisplay(total);
    if(!cart.length){cartItemsNode.innerHTML='<p>Your cart is empty. Add a product from the collection to begin.</p>';return;}
    cartItemsNode.innerHTML=cart.map(x=>{const p=cartProduct(x.product_id);return `<div class="cart-line">${p.image_url?`<img src="${safe(p.image_url)}" alt="">`:'<div class="cart-thumb">✧</div>'}<div><h4>${safe(p.name)}</h4><small>${money(p.price_inr)} each</small><div class="cart-qty"><button type="button" data-qty="${safe(p.id)}" data-delta="-1" aria-label="Decrease quantity">−</button><span>${x.quantity}</span><button type="button" data-qty="${safe(p.id)}" data-delta="1" aria-label="Increase quantity">+</button><button type="button" data-remove="${safe(p.id)}">Remove</button></div></div><strong>${money(Number(p.price_inr)*Number(x.quantity))}</strong></div>`;}).join('');
    cartItemsNode.querySelectorAll('[data-qty]').forEach(b=>b.addEventListener('click',()=>{const line=cart.find(x=>x.product_id===b.dataset.qty);if(!line)return;line.quantity+=Number(b.dataset.delta);if(line.quantity<1)cart=cart.filter(x=>x!==line);if(line.quantity>20)line.quantity=20;saveCart();}));
    cartItemsNode.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{cart=cart.filter(x=>x.product_id!==b.dataset.remove);saveCart();}));
  }
  function openCart(){overlay?.classList.remove('hidden');overlay?.setAttribute('aria-hidden','false');renderCart();}function closeCart(){overlay?.classList.add('hidden');overlay?.setAttribute('aria-hidden','true');}
  document.getElementById('openCartBtn')?.addEventListener('click',openCart);document.getElementById('closeCartBtn')?.addEventListener('click',closeCart);overlay?.addEventListener('click',e=>{if(e.target===overlay)closeCart();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeCart();});
  async function applyCoupon(){
    const input=document.getElementById('couponCode'),button=document.getElementById('applyCouponBtn'),status=document.getElementById('couponStatus');
    const code=String(input?.value||'').trim().toUpperCase();
    if(!code){if(status)status.textContent='Enter a coupon code first.';return}
    if(!cart.length){if(status)status.textContent='Add a product to your cart before applying a coupon.';return}
    if(!supabaseReady){if(status)status.textContent='Coupon checking is unavailable right now.';return}
    if(button){button.disabled=true;button.textContent='Checking…'}
    try{
      const fields='code,discount_type,discount_value,minimum_order_amount,maximum_discount_amount,starts_at,expires_at,usage_limit,usage_count,per_customer_limit,applies_to_all_products,eligible_product_ids,first_order_only';
      const url=apiRoot()+'/rest/v1/coupons?select='+encodeURIComponent(fields)+'&code=eq.'+encodeURIComponent(code)+'&is_active=eq.true&limit=1';
      const response=await fetch(url,{headers:{apikey:config.supabasePublishableKey}});
      if(!response.ok)throw new Error(response.status===404?'Coupon service is not set up yet.':('Coupon request failed ('+response.status+').'));
      const rows=await response.json(),coupon=Array.isArray(rows)?rows[0]:null;
      if(!coupon)throw new Error('That coupon is invalid, inactive, not yet valid, expired, or has reached its usage limit.');
      const preview=couponPreview(coupon);if(preview.message)throw new Error(preview.message);
      appliedCoupon=coupon;input.value=code;if(status){status.textContent=code+' applied — estimated discount '+money(preview.discount)+'. Final validation happens at secure checkout.';status.className='form-note success'}
      const remove=document.getElementById('removeCouponBtn');if(remove)remove.hidden=false;renderCart();
    }catch(err){appliedCoupon=null;const remove=document.getElementById('removeCouponBtn');if(remove)remove.hidden=true;renderCart();if(status){status.textContent=err.message||'Could not validate this coupon.';status.className='form-note error'}console.warn('Coupon validation preview failed',err)}
    finally{if(button){button.disabled=false;button.textContent='Apply'}}
  }
  document.getElementById('applyCouponBtn')?.addEventListener('click',applyCoupon);
  document.getElementById('couponCode')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyCoupon()}});
  document.getElementById('couponCode')?.addEventListener('input',e=>{if(appliedCoupon&&String(e.target.value||'').trim().toUpperCase()!==String(appliedCoupon.code||'').toUpperCase()){appliedCoupon=null;const status=document.getElementById('couponStatus');if(status){status.textContent='Code changed. Apply the new code to use a coupon.';status.className='form-note'}const remove=document.getElementById('removeCouponBtn');if(remove)remove.hidden=true;renderCart()}});
  document.getElementById('removeCouponBtn')?.addEventListener('click',()=>{appliedCoupon=null;const input=document.getElementById('couponCode'),status=document.getElementById('couponStatus');if(input)input.value='';if(status){status.textContent='Coupon removed.';status.className='form-note'}const remove=document.getElementById('removeCouponBtn');if(remove)remove.hidden=true;renderCart()});
  async function loadProducts(){if(!grid)return;if(!supabaseReady){grid.innerHTML='<p class="catalogue-state">Store connection is not configured.</p>';return;}try{const r=await fetch(apiRoot()+'/rest/v1/products?is_active=eq.true&select=id,name,description,category,price_inr,image_url,stock_quantity&order=created_at.desc',{headers:{apikey:config.supabasePublishableKey}});if(!r.ok)throw new Error('Catalogue request failed ('+r.status+').');products=await r.json();productsLoaded=true;renderProducts();renderCart();}catch(e){console.error('Could not load product catalogue',e);grid.innerHTML='<p class="catalogue-state">We could not load products right now. Please refresh or contact us.</p>';}}
  const checkoutForm=document.getElementById('checkoutForm');
  if(checkoutForm)checkoutForm.addEventListener('submit',async e=>{e.preventDefault();const status=document.getElementById('checkoutStatus'),btn=document.getElementById('checkoutBtn');if(!cart.length){setStatus('checkoutStatus','Your cart is empty.','error');return;}if(!supabaseReady){setStatus('checkoutStatus','Checkout is not configured. Please contact the store.','error');return;}if(!window.Razorpay){setStatus('checkoutStatus','Payment checkout could not load. Check your connection and try again.','error');return;}btn.disabled=true;setStatus('checkoutStatus','Creating your secure order…');try{const d=new FormData(checkoutForm),customer={customer_name:String(d.get('customer_name')).trim(),customer_email:String(d.get('customer_email')).trim(),customer_phone:String(d.get('customer_phone')).trim(),address_line1:String(d.get('address_line1')).trim(),city:String(d.get('city')).trim(),state:String(d.get('state')).trim(),postal_code:String(d.get('postal_code')).trim(),country:String(d.get('country')).trim()};if(appliedCoupon){
      const preview=couponPreview(appliedCoupon);if(preview.message||preview.discount<=0)throw new Error(preview.message||'This coupon no longer applies. Remove it and try again.');
      const validationResponse=await fetch(apiRoot()+'/functions/v1/storefront-checkout',{method:'POST',headers:{...restHeaders(),Authorization:'Bearer '+config.supabasePublishableKey},body:JSON.stringify({action:'validate_coupon',coupon_code:appliedCoupon.code,items:cart.map(x=>({product_id:x.product_id,quantity:x.quantity})),customer_email:customer.customer_email})});
      let validation={};try{validation=await validationResponse.json()}catch{}
      if(!validationResponse.ok||!validation.success||String(validation.coupon_code||'').toUpperCase()!==appliedCoupon.code||!Number.isFinite(Number(validation.discount_inr))||Math.abs(Number(validation.discount_inr)-preview.discount)>0.01){throw new Error((validation.error?String(validation.error)+' ':'')+'Coupon checkout was not confirmed by the secure payment service. No payment was started. Remove the coupon to continue at the regular price, or contact the store.');}
    }
    const createBody={action:'create_order',items:cart.map(x=>({product_id:x.product_id,quantity:x.quantity})),customer};if(appliedCoupon)createBody.coupon_code=appliedCoupon.code;
    const r=await fetch(apiRoot()+'/functions/v1/storefront-checkout',{method:'POST',headers:{...restHeaders(),Authorization:'Bearer '+config.supabasePublishableKey},body:JSON.stringify(createBody)});const data=await r.json();if(!r.ok||!data.success)throw new Error(data.error||'Could not create order.');
    if(appliedCoupon&&(String(data.coupon_code||'').toUpperCase()!==appliedCoupon.code||!Number.isFinite(Number(data.discount_inr))||Math.abs(Number(data.discount_inr)-couponPreview(appliedCoupon).discount)>0.01)){throw new Error('The server did not confirm this coupon discount on the order. No payment was started. Remove the coupon to continue at the regular price, or contact the store.');}
    const options={key:data.key_id,amount:data.amount,currency:data.currency, name:config.businessName||'Protectyourself',description:'Protectyourself order '+data.order_number,order_id:data.razorpay_order_id,prefill:{name:customer.customer_name,email:customer.customer_email,contact:customer.customer_phone},notes:{store_order_id:data.order_id},theme:{color:'#101b2d'},handler:async payment=>{setStatus('checkoutStatus','Payment received by checkout. Verifying securely…');try{const vr=await fetch(apiRoot()+'/functions/v1/storefront-checkout',{method:'POST',headers:{...restHeaders(),Authorization:'Bearer '+config.supabasePublishableKey},body:JSON.stringify({action:'verify_payment',order_id:data.order_id,razorpay_order_id:payment.razorpay_order_id,razorpay_payment_id:payment.razorpay_payment_id,razorpay_signature:payment.razorpay_signature})});const vd=await vr.json();if(!vr.ok||!vd.success)throw new Error(vd.error||'Payment verification is pending.');cart=[];appliedCoupon=null;saveCart();checkoutForm.reset();setStatus('checkoutStatus','Payment verified. Your order number is '+safe(data.order_number)+'. We will email you with updates.','success');}catch(err){console.error('Payment verification error',err);setStatus('checkoutStatus','Payment was submitted but verification is pending. Save your payment ID and contact support if you do not receive confirmation. Payment ID: '+payment.razorpay_payment_id,'error');}}};const rzp=new window.Razorpay(options);rzp.on('payment.failed',response=>{setStatus('checkoutStatus','Payment did not complete: '+(response.error?.description||'please try again.'),'error');});rzp.open();setStatus('checkoutStatus','Complete payment in the secure payment window.');}catch(err){console.error('Checkout failed',err);setStatus('checkoutStatus',err.message||'Checkout failed. Please try again.','error');}finally{btn.disabled=false;}});
  loadPublicSettings();loadPublicCustomization();loadPublicJournal();loadProducts();renderCart();
})();
