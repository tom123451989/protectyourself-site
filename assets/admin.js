(() => {
const $=id=>document.getElementById(id);
const configKey='protectyourself-supabase-client-config';
let supabase=null,session=null,services=[],products=[],orders=[],currentPolicy=null,articles=[],reviews=[];
const setStatus=(id,msg,type='')=>{const el=$(id);if(el){el.textContent=msg;el.className='admin-status '+type}};
const safe=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function readConfig(){try{return JSON.parse(localStorage.getItem(configKey)||'{}')}catch{return {}}}
function setConnectedUI(connected){$('loginPanel').classList.toggle('hidden',!connected);$('signOutBtn').classList.toggle('hidden',!session);$('dashboard').classList.toggle('hidden',!session);$('setupPanel').classList.toggle('hidden',!!session);}
async function connect(url,key){
 if(!window.supabase){setStatus('setupStatus','Could not load Supabase client. Check your internet connection and reload.','error');return}
 try{
  supabase=window.supabase.createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  const {data,error}=await supabase.auth.getSession();if(error)throw error;
  localStorage.setItem(configKey,JSON.stringify({url,key}));setStatus('setupStatus','Connected to Supabase. Sign in below.','success');$('setupPanel').classList.add('hidden');$('loginPanel').classList.remove('hidden');
  session=data.session;if(session)await showDashboard();
 }catch(e){supabase=null;setStatus('setupStatus','Connection failed: '+e.message,'error')}
}
async function init(){const c=readConfig();if(c.url&&c.key){$('sbUrl').value=c.url;$('sbKey').value=c.key;await connect(c.url,c.key)}}
$('connectBtn').addEventListener('click',()=>{const url=$('sbUrl').value.trim(),key=$('sbKey').value.trim();if(!url||!key){setStatus('setupStatus','Enter both the project URL and public anon/publishable key.','error');return}connect(url,key)});
$('loginBtn').addEventListener('click',async()=>{if(!supabase){setStatus('loginStatus','Connect Supabase first.','error');return}const email=$('loginEmail').value.trim(),password=$('loginPassword').value;if(!email||!password){setStatus('loginStatus','Enter email and password.','error');return}setStatus('loginStatus','Signing in…');const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error){setStatus('loginStatus',error.message,'error');return}session=data.session;await showDashboard()});
$('signOutBtn').addEventListener('click',async()=>{if(supabase)await supabase.auth.signOut();session=null;setConnectedUI(false);$('setupPanel').classList.remove('hidden');$('loginPanel').classList.remove('hidden')});
if(window.supabase){/* initialized after config is loaded */}
document.querySelectorAll('.admin-tabs button').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.admin-tabs button').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.tab-content').forEach(p=>p.classList.toggle('hidden',p.id!==btn.dataset.tab));if(btn.dataset.tab==='productsTab')loadProducts();if(btn.dataset.tab==='reviewsTab')loadReviews();if(btn.dataset.tab==='ordersTab')loadOrders();if(btn.dataset.tab==='bookingsTab')loadBookings();if(btn.dataset.tab==='policiesTab')loadPolicy();if(btn.dataset.tab==='settingsTab')loadSettings();if(btn.dataset.tab==='customizationTab')loadCustomization();if(btn.dataset.tab==='articlesTab')loadArticles()}));
async function showDashboard(){setConnectedUI(true);setStatus('loginStatus','Signed in successfully.','success');await loadServices();await loadProducts();await loadReviews();await loadOrders();await loadSettings();await loadBookings();await loadCustomization();await loadArticles()}
async function loadServices(){const {data,error}=await supabase.from('services').select('*').order('created_at',{ascending:true});if(error){$('servicesRows').innerHTML='<tr><td colspan="5">Could not load services: '+safe(error.message)+'</td></tr>';setStatus('serviceStatus','Check that you ran supabase-schema.sql and are signed in as an admin.','error');return}services=data||[];$('statServices').textContent=services.length;renderServices()}
function renderServices(){$('servicesRows').innerHTML=services.length?services.map(s=>`<tr><td><b>${safe(s.name)}</b><br>${safe(s.description||'')}</td><td>₹${safe(s.price_inr)}</td><td>$${safe(s.price_usd)}</td><td>${s.is_active?'Published':'Hidden'}</td><td><button class="admin-btn secondary" data-edit="${safe(s.id)}">Edit</button><button class="admin-btn danger" data-delete="${safe(s.id)}">Delete</button></td></tr>`).join(''):'<tr><td colspan="5">No services yet. Use the form above to add one.</td></tr>';
 $('servicesRows').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{const s=services.find(x=>x.id===b.dataset.edit);if(!s)return;$('serviceId').value=s.id;$('serviceName').value=s.name;$('serviceDescription').value=s.description||'';$('priceInr').value=s.price_inr;$('priceUsd').value=s.price_usd;$('serviceActive').value=String(s.is_active);window.scrollTo({top:0,behavior:'smooth'})}));
 $('servicesRows').querySelectorAll('[data-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Delete this service?'))return;const {error}=await supabase.from('services').delete().eq('id',b.dataset.delete);if(error){setStatus('serviceStatus',error.message,'error');return}setStatus('serviceStatus','Service deleted.','success');await loadServices()}))}
$('serviceForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('serviceId').value;const row={name:$('serviceName').value.trim(),description:$('serviceDescription').value.trim(),price_inr:Number($('priceInr').value),price_usd:Number($('priceUsd').value),is_active:$('serviceActive').value==='true'};const result=id?await supabase.from('services').update(row).eq('id',id):await supabase.from('services').insert(row);if(result.error){setStatus('serviceStatus',result.error.message,'error');return}setStatus('serviceStatus','Service saved to the database.','success');$('serviceId').value='';await loadServices()});
$('clearServiceBtn').addEventListener('click',()=>{$('serviceForm').reset();$('serviceId').value='';$('serviceName').value='Transcendental Protection';$('priceInr').value='500';$('priceUsd').value='50';$('serviceActive').value='true'});
async function loadProducts(){
 const {data,error}=await supabase.from('products').select('*').order('created_at',{ascending:false});
 if(error){$('productsRows').innerHTML='<tr><td colspan="5">Could not load products: '+safe(error.message)+'</td></tr>';setStatus('productStatus','Check the products table and its Supabase row-level security policies.','error');return}
 products=data||[];renderProducts();
}
function renderProducts(){
 $('productsRows').innerHTML=products.length?products.map(p=>`<tr><td><b>${safe(p.name)}</b>${p.image_url?`<br><a href="${safe(p.image_url)}" target="_blank" rel="noopener">View image</a>`:''}<br><span>${safe(p.category||'Uncategorised')}</span></td><td><b>₹${safe(p.price_inr)}</b>${p.original_price!=null&&Number(p.original_price)>Number(p.price_inr)?`<br><del>₹${safe(p.original_price)}</del>`:''}</td><td>${safe(p.stock_quantity??0)}</td><td>${p.is_active?'Published':'Hidden'}</td><td><button class="admin-btn secondary" data-product-edit="${safe(p.id)}">Edit</button><button class="admin-btn secondary" data-product-toggle="${safe(p.id)}">${p.is_active?'Hide':'Publish'}</button><button class="admin-btn danger" data-product-delete="${safe(p.id)}">Remove</button></td></tr>`).join(''):'<tr><td colspan="5">No products yet. Add your first product using the form above.</td></tr>';
 $('productsRows').querySelectorAll('[data-product-edit]').forEach(b=>b.addEventListener('click',()=>{const p=products.find(x=>String(x.id)===b.dataset.productEdit);if(!p)return;$('productId').value=p.id;$('productName').value=p.name||'';$('productCategory').value=p.category||'';$('productPrice').value=p.price_inr??'';$('productOriginalPrice').value=p.original_price??'';$('productStock').value=p.stock_quantity??0;$('productActive').value=String(!!p.is_active);$('productImage').value=p.image_url||'';$('productDescription').value=p.description||'';window.scrollTo({top:0,behavior:'smooth'});}));
 $('productsRows').querySelectorAll('[data-product-toggle]').forEach(b=>b.addEventListener('click',async()=>{const p=products.find(x=>String(x.id)===b.dataset.productToggle);if(!p)return;const {error}=await supabase.from('products').update({is_active:!p.is_active}).eq('id',p.id);if(error){setStatus('productStatus',error.message,'error');return}setStatus('productStatus',p.is_active?'Product hidden from the storefront.':'Product published.','success');await loadProducts();}));
 $('productsRows').querySelectorAll('[data-product-delete]').forEach(b=>b.addEventListener('click',async()=>{const p=products.find(x=>String(x.id)===b.dataset.productDelete);if(!p||!confirm(`Remove “${p.name}” from the storefront? This hides it instead of permanently deleting its record.`))return;const {error}=await supabase.from('products').update({is_active:false}).eq('id',p.id);if(error){setStatus('productStatus',error.message,'error');return}setStatus('productStatus','Product removed from the public storefront (record retained).','success');await loadProducts();}));
}
$('productForm').addEventListener('submit',async e=>{e.preventDefault();const id=$('productId').value;const row={name:$('productName').value.trim(),category:$('productCategory').value.trim()||null,description:$('productDescription').value.trim()||null,price_inr:Number($('productPrice').value),stock_quantity:Number($('productStock').value),is_active:$('productActive').value==='true',image_url:$('productImage').value.trim()||null};
 const original=$('productOriginalPrice').value.trim();if(original!=='')row.original_price=Number(original);
 if(original!==''&&Number(original)<Number(row.price_inr)){setStatus('productStatus','Original price should be equal to or higher than the selling price.','error');return}
 const result=id?await supabase.from('products').update(row).eq('id',id):await supabase.from('products').insert(row);
 if(result.error){setStatus('productStatus',result.error.message.includes('original_price')?'Database needs the original_price migration. Run add-original-price.sql in Supabase SQL Editor, then retry.':result.error.message,'error');return}
 setStatus('productStatus',id?'Product updated successfully.':'Product added successfully.','success');clearProductForm();await loadProducts();
});
function clearProductForm(){$('productForm').reset();$('productId').value='';$('productStock').value='50';$('productActive').value='true';}
$('clearProductBtn').addEventListener('click',clearProductForm);
async function loadOrders(){
  setStatus('ordersStatus','Loading orders…');
  const {data,error}=await supabase.from('orders').select('id,order_number,customer_name,customer_email,customer_phone,address_line1,city,state,postal_code,country,currency,subtotal_inr,shipping_inr,total_inr,payment_status,order_status,razorpay_order_id,razorpay_payment_id,created_at,updated_at').order('created_at',{ascending:false}).limit(500);
  if(error){
    $('ordersRows').innerHTML='<tr><td colspan="7">Could not load orders: '+safe(error.message)+'</td></tr>';
    setStatus('ordersStatus','Check SELECT permission for the authenticated admin on public.orders. No payment or order data was changed.','error');
    $('statPaid').textContent='—';
    return;
  }
  orders=data||[];
  $('statPaid').textContent=orders.filter(o=>String(o.payment_status||'').toLowerCase()==='paid').length;
  renderOrders();
  setStatus('ordersStatus',orders.length?`Loaded ${orders.length} order(s).`:'No orders found in public.orders.','success');
}
function renderOrders(){
  const statusOptions=['new','processing','shipped','delivered','completed','cancelled'];
  $('ordersRows').innerHTML=orders.length?orders.map(o=>{
    const addr=[o.address_line1,o.city,o.state,o.postal_code,o.country].filter(Boolean).join(', ');
    const status=String(o.order_status||'new');
    const options=[...new Set([...statusOptions,status])].map(s=>`<option value="${safe(s)}" ${s===status?'selected':''}>${safe(s)}</option>`).join('');
    return `<tr>
      <td><b>${safe(o.order_number||o.id)}</b><br>${safe(o.created_at?new Date(o.created_at).toLocaleString():'')}</td>
      <td>${safe(o.customer_name||'—')}<br>${safe(o.customer_email||'')}<br>${safe(o.customer_phone||'')}</td>
      <td>${safe(addr||'—')}</td>
      <td><b>${safe(o.currency||'INR')} ${safe(Number(o.total_inr||0).toFixed(2))}</b><br><small>Subtotal: ${safe(Number(o.subtotal_inr||0).toFixed(2))}; shipping: ${safe(Number(o.shipping_inr||0).toFixed(2))}</small></td>
      <td><span class="badge-status ${String(o.payment_status).toLowerCase()==='paid'?'paid':''}">${safe(o.payment_status||'unknown')}</span><br><small>Payment: ${safe(o.razorpay_payment_id||'—')}</small></td>
      <td><select data-order-status="${safe(o.id)}">${options}</select></td>
      <td><button class="admin-btn" data-save-order="${safe(o.id)}">Save status</button></td>
    </tr>`;
  }).join(''):'<tr><td colspan="7">No customer orders found.</td></tr>';
  $('ordersRows').querySelectorAll('[data-save-order]').forEach(button=>button.addEventListener('click',async()=>{
    const id=button.dataset.saveOrder;
    const order=orders.find(o=>String(o.id)===id);
    const select=$('ordersRows').querySelector(`[data-order-status="${id}"]`);
    if(!order||!select)return;
    const nextStatus=select.value;
    if(!confirm(`Update order ${order.order_number||order.id} status to "${nextStatus}"? This does not change payment status.`))return;
    button.disabled=true;
    const {error}=await supabase.from('orders').update({order_status:nextStatus,updated_at:new Date().toISOString()}).eq('id',id);
    button.disabled=false;
    if(error){setStatus('ordersStatus','Could not update order status: '+error.message,'error');return}
    setStatus('ordersStatus',`Order ${order.order_number||order.id} updated to ${nextStatus}. Payment status was not changed.`,'success');
    await loadOrders();
  }));
}
$('refreshOrdersBtn')?.addEventListener('click',loadOrders);
async function loadBookings(){const {data,error}=await supabase.from('enquiries').select('*').order('created_at',{ascending:false}).limit(200);if(error){$('bookingsRows').innerHTML='<tr><td colspan="7">Could not load records: '+safe(error.message)+'</td></tr>';setStatus('bookingStatus','If the table is missing, run the supplied SQL schema. Existing Google Form entries are not automatically imported.','error');return}const rows=data||[];$('statBookings').textContent=rows.length;$('bookingsRows').innerHTML=rows.length?rows.map(r=>`<tr><td>${safe(new Date(r.created_at).toLocaleDateString())}</td><td>${safe(r.customer_name)}</td><td>${safe(r.customer_email)}<br>${safe(r.customer_phone||'')}</td><td>${safe(r.service_name)}<br>${safe(r.message||'')}</td><td>${safe(r.payment_reference||'—')}</td><td><span class="badge-status ${r.payment_status==='paid'?'paid':r.status==='cancelled'?'cancelled':''}">${safe(r.status)} / ${safe(r.payment_status)}</span></td><td><select data-status="${safe(r.id)}"><option ${r.status==='new'?'selected':''}>new</option><option ${r.status==='contacted'?'selected':''}>contacted</option><option ${r.status==='in_progress'?'selected':''}>in_progress</option><option ${r.status==='completed'?'selected':''}>completed</option><option ${r.status==='cancelled'?'selected':''}>cancelled</option></select><select data-payment="${safe(r.id)}"><option ${r.payment_status==='unverified'?'selected':''}>unverified</option><option ${r.payment_status==='pending'?'selected':''}>pending</option><option ${r.payment_status==='paid'?'selected':''}>paid</option><option ${r.payment_status==='refunded'?'selected':''}>refunded</option></select><button class="admin-btn" data-save-booking="${safe(r.id)}">Save</button></td></tr>`).join(''):'<tr><td colspan="7">No enquiries in the database yet.</td></tr>';
 $('bookingsRows').querySelectorAll('[data-save-booking]').forEach(b=>b.addEventListener('click',async()=>{const id=b.dataset.saveBooking;const status=$('bookingsRows').querySelector(`[data-status="${id}"]`).value;const payment_status=$('bookingsRows').querySelector(`[data-payment="${id}"]`).value;const {error}=await supabase.from('enquiries').update({status,payment_status}).eq('id',id);if(error){setStatus('bookingStatus',error.message,'error');return}setStatus('bookingStatus','Record updated. Only mark paid after verifying payment through your provider/bank.','success');await loadBookings()}))}
async function loadSettings(){const {data,error}=await supabase.from('site_settings').select('*').eq('id',1).maybeSingle();if(error){setStatus('settingsStatus',error.message,'error');return}const s=data||{};$('settingBusinessName').value=s.business_name||'Protectyourself';$('settingEmail').value=s.contact_email||'protectyourselfin@gmail.com';$('settingWhatsapp').value=s.whatsapp_number||'';$('settingIndiaPayment').value=s.india_payment_url||'';$('settingIntlPayment').value=s.international_payment_url||'';$('settingBookingUrl').value=s.booking_form_url||'';$('settingNotice').value=s.public_notice||''}
$('settingsForm').addEventListener('submit',async e=>{e.preventDefault();const row={id:1,business_name:$('settingBusinessName').value.trim(),contact_email:$('settingEmail').value.trim(),whatsapp_number:$('settingWhatsapp').value.trim(),india_payment_url:$('settingIndiaPayment').value.trim(),international_payment_url:$('settingIntlPayment').value.trim(),booking_form_url:$('settingBookingUrl').value.trim(),public_notice:$('settingNotice').value.trim()};const {error}=await supabase.from('site_settings').upsert(row);if(error){setStatus('settingsStatus',error.message,'error');return}setStatus('settingsStatus','Settings saved in Supabase. Website display integration must also be enabled in the public pages.','success')});

const policyDefaults={
 shipping:{title:'Shipping & Delivery Policy',content:`Last updated: [DD Month YYYY]

1. Delivery area
We currently accept product orders for delivery within India only, unless the checkout explicitly states otherwise.

2. Processing time
Orders are normally prepared for dispatch within [X–Y business days] after payment is confirmed. Processing may take longer during holidays, high-demand periods, or where additional verification is required. If there is a material delay, we will make reasonable efforts to contact you using the details provided with your order.

3. Delivery estimates
Estimated delivery is [X–Y business days] after dispatch, depending on the destination and courier service. These are estimates, not guaranteed dates. Remote locations, weather, transport disruptions and other events outside our reasonable control may cause delays.

4. Shipping charges
Any shipping charge applicable to an order will be shown at checkout before payment. If checkout displays free shipping, no shipping charge is collected for that order.

5. Address and delivery attempts
Please provide a complete and accurate delivery address and phone number. If an order is returned because the address is incorrect, the recipient is unavailable, or delivery is refused, contact us to discuss available options. Any additional shipping charge will be disclosed before it is collected.

6. Damaged, incorrect or missing items
Please contact us promptly at [CUSTOMER SUPPORT EMAIL] with your order number and photographs of the parcel/item if it arrived damaged, incorrect or incomplete. This helps us investigate and does not limit any rights available under applicable law.

7. Contact
Email: [CUSTOMER SUPPORT EMAIL]
Business/legal name: [LEGAL BUSINESS NAME]
Address: [BUSINESS ADDRESS]`},
 cancellation:{title:'Order Cancellation Policy',content:`Last updated: [DD Month YYYY]

1. Requesting cancellation
To request cancellation, contact [CUSTOMER SUPPORT EMAIL] and provide your order number as soon as possible. A request is not confirmed until we acknowledge it.

2. Before dispatch
Where an order has not been dispatched, we will make reasonable efforts to cancel it. If payment was collected and cancellation is accepted, the eligible refund will be initiated to the original payment method, subject to applicable payment-provider processing times.

3. After dispatch
An order that has already been dispatched may not be cancellable in transit. Please contact us for return options under the Returns & Refunds Policy.

4. Seller-initiated cancellation
If we cancel an order, we will notify you and initiate any applicable refund. We will not impose a cancellation charge on customers unless permitted by applicable law and consistent with the applicable rules.

5. Incorrect or suspicious orders
We may contact you to verify order details or payment status where reasonably necessary. An order is not considered paid merely because a payment attempt was initiated.

6. Contact
Email: [CUSTOMER SUPPORT EMAIL]
Business/legal name: [LEGAL BUSINESS NAME]
Address: [BUSINESS ADDRESS]`},
 returns_refunds:{title:'Returns & Refunds Policy',content:`Last updated: [DD Month YYYY]

1. Contact us first
To request a return, replacement or refund, email [CUSTOMER SUPPORT EMAIL] with your order number, a description of the issue and clear photographs where relevant. Please keep the product and its packaging until we respond.

2. Eligible issues
We will review requests involving items that are defective, damaged in transit, incorrect, spurious, materially different from their description, incomplete, or delivered outside the stated schedule where applicable law provides a remedy. Nothing in this policy limits consumer rights available under applicable law.

3. Change of mind
For a change-of-mind request, contact us before returning anything. Eligibility depends on the product type, condition, hygiene/safety considerations, and applicable law. Do not send an item back without return instructions.

4. Product condition
Where a return is accepted, we may ask that the item and included accessories/packaging be returned in the condition reasonably required for assessment, except where damage or defect is the reason for the claim.

5. Return shipping
We will explain any applicable return-shipping arrangements before you send an item back. Where the issue is our error or the item is defective/damaged/incorrect, we will assess the appropriate remedy and shipping responsibility in accordance with applicable law.

6. Refund processing
Once a refund is approved, we will initiate it to the original payment method where supported. The time for the funds to appear depends on the bank, UPI app, card issuer and payment provider. We will communicate if additional information is needed. We do not treat a refund as completed merely because a request has been received.

7. Non-delivery or payment issue
If payment was debited but no order confirmation was shown, contact us with the transaction reference and approximate payment time. Do not share your UPI PIN, OTP or full payment credentials.

8. Contact and grievance support
Email: [CUSTOMER SUPPORT EMAIL]
Business/legal name: [LEGAL BUSINESS NAME]
Address: [BUSINESS ADDRESS]
Grievance contact/designation: [NAME AND DESIGNATION]`},
 privacy:{title:'Privacy Policy',content:`Last updated: [DD Month YYYY]

1. Who we are
This website is operated by [LEGAL BUSINESS NAME], trading as Protectyourself, at [BUSINESS ADDRESS]. Privacy questions can be sent to [PRIVACY CONTACT EMAIL].

2. Information we collect
When you place an order or contact us, we may collect your name, email address, phone number, delivery address, order details, customer messages and transaction references needed to process the request.

3. Payments
Payments are processed through Razorpay and its payment partners. We do not ask you to send your UPI PIN, OTP or payment password to us, and this website should not store your full card number or UPI PIN. Payment providers may process information under their own privacy terms.

4. How we use information
We use information to process and deliver orders, confirm payments, provide customer support, prevent fraud, maintain business records, handle returns/refunds, comply with legal obligations and improve the website.

5. Service providers
We use service providers that support website hosting, database storage, order management, payment processing and communications. They may process information on our behalf as necessary to provide their services and subject to applicable terms and law.

6. Sharing
We do not sell personal information. We may share relevant information with payment providers, delivery/courier partners, technical service providers, professional advisers or authorities where necessary for the purposes above or as required by law.

7. Retention and security
We retain information for as long as reasonably necessary for orders, customer service, legal, tax, accounting and dispute-resolution purposes. We use reasonable safeguards, but no internet transmission or storage method can be guaranteed completely secure.

8. Your requests
Subject to applicable law, you may contact us to request access, correction or deletion of personal information, or to raise a privacy concern. We may need to verify your identity and retain some records where legally required.

9. Children
Purchases should be made by an adult or with the involvement and permission of a parent/guardian. Please do not submit another person's personal information unless you are authorised to do so.

10. Changes
We may update this policy and will publish the revised version on this page with an updated date.

11. Contact
Legal business name: [LEGAL BUSINESS NAME]
Privacy contact: [PRIVACY CONTACT EMAIL]
Address: [BUSINESS ADDRESS]
Grievance contact/designation: [NAME AND DESIGNATION]`},
 terms:{title:'Terms & Conditions',content:`Last updated: [DD Month YYYY]

1. About these terms
This website is operated by [LEGAL BUSINESS NAME], trading as Protectyourself, at [BUSINESS ADDRESS]. By using the website or placing an order, you agree to these terms and the applicable policies displayed on the website.

2. Product information
We make reasonable efforts to describe products and show prices accurately. Colours and appearance may vary by screen and batch. Please review product details, quantities, shipping charges and the final total before placing an order.

3. Orders and payment
An order request is subject to confirmation and availability. Payment status is confirmed using the payment provider's verification process. A payment attempt alone does not guarantee that an order has been accepted. We may contact you to resolve an issue with an order.

4. Prices and availability
Prices and stock availability may change. The price and applicable charges displayed at checkout before payment apply to the order, subject to correction of an obvious error in accordance with applicable law.

5. Delivery, cancellation and returns
Delivery estimates, cancellation requests and return/refund requests are handled under the Shipping & Delivery, Order Cancellation and Returns & Refunds policies. Nothing in these terms removes rights that cannot lawfully be excluded.

6. Acceptable use
You agree not to misuse the website, attempt unauthorised access, interfere with its operation, or submit knowingly false order information.

7. Liability and legal rights
Nothing in these terms excludes or limits any liability or consumer right that cannot be excluded under applicable law. Any other limitation will apply only to the extent permitted by law.

8. Changes
We may update these terms by publishing a revised version with an updated date.

9. Contact
Email: [CUSTOMER SUPPORT EMAIL]
Legal business name: [LEGAL BUSINESS NAME]
Address: [BUSINESS ADDRESS]`}
};
async function loadPolicy(){
 const key=$('policyKey').value;
 const {data,error}=await supabase.from('site_policies').select('policy_key,title,content,is_published').eq('policy_key',key).maybeSingle();
 if(error){setStatus('policyStatus','Could not load policies: '+error.message+'. Run the supplied site-policies.sql migration, then retry.','error');return}
 const p=data||policyDefaults[key];currentPolicy=key;
 $('policyTitle').value=p.title;$('policyContent').value=p.content;$('policyPublished').checked=!!p.is_published;
 setStatus('policyStatus',data?'Loaded saved policy.': 'Draft template loaded. Review placeholders before publishing.','');
}
$('policyKey')?.addEventListener('change',loadPolicy);
$('reloadPolicyBtn')?.addEventListener('click',loadPolicy);
$('policyForm')?.addEventListener('submit',async e=>{
 e.preventDefault();const key=$('policyKey').value;
 const row={policy_key:key,title:$('policyTitle').value.trim(),content:$('policyContent').value.trim(),is_published:$('policyPublished').checked,updated_at:new Date().toISOString()};
 if(!row.title||!row.content){setStatus('policyStatus','Enter a title and policy content.','error');return}
 if(/\[[A-Z][A-Z \-/]+?\]/.test(row.content)){if(!confirm('This policy still contains bracketed placeholders. Save it as a draft anyway?'))return;if(row.is_published&&!confirm('Publishing with placeholders may expose incomplete business information. Publish anyway?'))return}
 const {error}=await supabase.from('site_policies').upsert(row,{onConflict:'policy_key'});
 if(error){setStatus('policyStatus','Could not save policy: '+error.message,'error');return}
 setStatus('policyStatus',row.is_published?'Policy saved and published.':'Policy saved as draft (not public).','success');
});


// Journal and article publishing
function slugify(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,180)}
$('articleTitle')?.addEventListener('input',()=>{if(!$('articleId').value||!$('articleSlug').dataset.edited)$('articleSlug').value=slugify($('articleTitle').value)});
$('articleSlug')?.addEventListener('input',()=>{$('articleSlug').dataset.edited='true';$('articleSlug').value=slugify($('articleSlug').value)});
function clearArticleForm(){ $('articleForm')?.reset();$('articleId').value='';$('articleReadTime').value='4';$('articlePublished').value='false';$('articleFeatured').value='true';$('articleSlug').dataset.edited='';$('saveArticleBtn').textContent='Save article'; }
async function loadArticles(){
 if(!supabase||!session)return;
 const {data,error}=await supabase.from('journal_articles').select('*').order('created_at',{ascending:false});
 if(error){$('articlesRows').innerHTML='<tr><td colspan="5">Could not load articles: '+safe(error.message)+'</td></tr>';setStatus('articleStatus','If this is the first setup, run journal-articles-migration.sql in your Supabase SQL Editor.','error');return}
 articles=data||[];renderArticles();
}
function renderArticles(){
 const body=$('articlesRows');if(!body)return;
 body.innerHTML=articles.length?articles.map(a=>`<tr><td><b>${safe(a.title)}</b><br><small>${safe(a.slug)}</small><br><span>${safe(a.excerpt||'')}</span></td><td>${safe(a.category||'General')}</td><td>${a.is_published?'<span class="badge-status paid">Published</span>':'<span class="badge-status">Draft</span>'}</td><td>${a.is_featured?'Yes':'No'}</td><td><button class="admin-btn secondary" data-article-edit="${safe(a.id)}">Edit</button><button class="admin-btn secondary" data-article-toggle="${safe(a.id)}">${a.is_published?'Unpublish':'Publish'}</button><button class="admin-btn danger" data-article-delete="${safe(a.id)}">Delete</button></td></tr>`).join(''):'<tr><td colspan="5">No articles found. Use the form above to create your first article.</td></tr>';
 body.querySelectorAll('[data-article-edit]').forEach(b=>b.addEventListener('click',()=>{const a=articles.find(x=>String(x.id)===b.dataset.articleEdit);if(!a)return;$('articleId').value=a.id;$('articleTitle').value=a.title||'';$('articleSlug').value=a.slug||'';$('articleSlug').dataset.edited='true';$('articleCategory').value=a.category||'General';$('articleReadTime').value=a.read_time_minutes||4;$('articleExcerpt').value=a.excerpt||'';$('articleContent').value=a.content||'';$('articlePublished').value=String(!!a.is_published);$('articleFeatured').value=String(a.is_featured!==false);$('saveArticleBtn').textContent='Update article';setStatus('articleStatus','Editing “'+a.title+'”.','success');$('articleForm').scrollIntoView({behavior:'smooth',block:'start'});}));
 body.querySelectorAll('[data-article-toggle]').forEach(b=>b.addEventListener('click',async()=>{const a=articles.find(x=>String(x.id)===b.dataset.articleToggle);if(!a)return;const next=!a.is_published;if(next&&!a.content?.trim()){setStatus('articleStatus','Add the full article content before publishing.','error');return}const row={is_published:next,published_at:next?(a.published_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};const {error}=await supabase.from('journal_articles').update(row).eq('id',a.id);if(error){setStatus('articleStatus','Could not change publication status: '+error.message,'error');return}setStatus('articleStatus',next?'Article published.':'Article returned to draft.','success');await loadArticles();}));
 body.querySelectorAll('[data-article-delete]').forEach(b=>b.addEventListener('click',async()=>{const a=articles.find(x=>String(x.id)===b.dataset.articleDelete);if(!a||!confirm('Permanently delete “'+a.title+'”? This cannot be undone.'))return;const {error}=await supabase.from('journal_articles').delete().eq('id',a.id);if(error){setStatus('articleStatus','Could not delete article: '+error.message,'error');return}if($('articleId').value===String(a.id))clearArticleForm();setStatus('articleStatus','Article deleted.','success');await loadArticles();}));
}
$('clearArticleBtn')?.addEventListener('click',()=>{clearArticleForm();setStatus('articleStatus','Ready for a new article.','success')});
$('articleForm')?.addEventListener('submit',async e=>{
 e.preventDefault();if(!supabase||!session){setStatus('articleStatus','Please sign in first.','error');return}
 const title=$('articleTitle').value.trim(),slug=slugify($('articleSlug').value||title),content=$('articleContent').value.trim(),published=$('articlePublished').value==='true';
 if(!title||!slug||!content){setStatus('articleStatus','Title, URL slug, and full article content are required.','error');return}
 const btn=$('saveArticleBtn');btn.disabled=true;btn.textContent='Saving…';
 try{
  const id=$('articleId').value;const old=articles.find(a=>String(a.id)===String(id));
  const row={title,slug,category:$('articleCategory').value.trim()||'General',read_time_minutes:Number($('articleReadTime').value)||4,excerpt:$('articleExcerpt').value.trim(),content,is_published:published,is_featured:$('articleFeatured').value==='true',published_at:published?(old?.published_at||new Date().toISOString()):null,updated_at:new Date().toISOString()};
  const result=id?await supabase.from('journal_articles').update(row).eq('id',id):await supabase.from('journal_articles').insert(row);
  if(result.error)throw result.error;
  setStatus('articleStatus',published?'Article saved and published.':'Article saved as a draft.','success');clearArticleForm();await loadArticles();
 }catch(err){setStatus('articleStatus','Could not save article: '+(err.message||String(err)),'error')}
 finally{btn.disabled=false;btn.textContent=$('articleId').value?'Update article':'Save article'}
});

// Homepage design and slideshow customization
let savedCustomization = {};
const defaultCustomization = {
  announcement: "A MORE INTENTIONAL EVERYDAY, STARTS HERE",
  announcementSub: "Malas · Yantras · Devotional essentials",
  heroLine1: "Keep your faith close.",
  heroLine2: "Live with intention.",
  heroDescription: "Explore malas, yantras, devotional accessories, and spiritual essentials for your personal practice and sacred space.",
  primaryLabel: "Explore the collection",
  primaryLink: "#shop",
  secondaryLabel: "Our philosophy",
  secondaryLink: "#about",
  accent: "#d8b46a",
  interval: 6,
  transition: "fade",
  autoplay: true,
  showDots: true,
  slides: []
};
function currentCustomizationFromForm(){
 return {
  announcement:$('customAnnouncement').value.trim(),
  announcementSub:$('customAnnouncementSub').value.trim(),
  heroLine1:$('customHeroLine1').value.trim(),
  heroLine2:$('customHeroLine2').value.trim(),
  heroDescription:$('customHeroDescription').value.trim(),
  primaryLabel:$('customPrimaryLabel').value.trim(),
  primaryLink:$('customPrimaryLink').value.trim()||'#shop',
  secondaryLabel:$('customSecondaryLabel').value.trim(),
  secondaryLink:$('customSecondaryLink').value.trim()||'#about',
  accent:$('customAccent').value||'#d8b46a',
  interval:Math.max(3,Math.min(30,Number($('customInterval').value)||6)),
  transition:$('customTransition').value,
  autoplay:$('customAutoplay').checked,
  showDots:$('customShowDots').checked,
  slides:readSlidesEditor()
 };
}
function fillCustomizationForm(c){
 const v={...defaultCustomization,...(c||{})};
 ['announcement','announcementSub','heroLine1','heroLine2','heroDescription','primaryLabel','primaryLink','secondaryLabel','secondaryLink','accent','interval','transition'].forEach(k=>{
  const map={announcement:'customAnnouncement',announcementSub:'customAnnouncementSub',heroLine1:'customHeroLine1',heroLine2:'customHeroLine2',heroDescription:'customHeroDescription',primaryLabel:'customPrimaryLabel',primaryLink:'customPrimaryLink',secondaryLabel:'customSecondaryLabel',secondaryLink:'customSecondaryLink',accent:'customAccent',interval:'customInterval',transition:'customTransition'};
  const el=$(map[k]);if(el)el.value=v[k]??'';
 });
 $('customAutoplay').checked=v.autoplay!==false;
 $('customShowDots').checked=v.showDots!==false;
 renderSlidesEditor(Array.isArray(v.slides)?v.slides:[]);
}
function renderSlidesEditor(slides){
 const root=$('slidesEditor');if(!root)return;
 root.innerHTML='';
 (slides||[]).forEach((s,i)=>root.appendChild(makeSlideCard(s,i)));
}
function makeSlideCard(s={},i=0){
 const card=document.createElement('div');card.className='slide-editor-card';
 card.innerHTML=`<div><div class="slide-number">Slide ${i+1}</div><img class="slide-preview" alt="Slide preview" src="${safe(s.image_url||'')}" onerror="this.style.opacity='.25'"><div class="slide-actions"><button class="admin-btn secondary" type="button" data-move="-1">Move up</button><button class="admin-btn secondary" type="button" data-move="1">Move down</button><button class="admin-btn danger" type="button" data-remove>Remove</button></div></div><div class="slide-fields"><label>Image URL (optional)<input data-url type="url" placeholder="https://example.com/image.jpg" value="${safe(s.image_url||'')}"></label><label>Upload image<input data-file type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><label>Accessible image description<input data-alt maxlength="180" placeholder="e.g. Lord Krishna at sunset" value="${safe(s.alt||'')}"></label><label class="inline-check"><input data-active type="checkbox" ${s.active===false?'':'checked'}> Include in slideshow</label><small class="admin-sub" data-file-status></small></div>`;
 const img=card.querySelector('.slide-preview'),urlInput=card.querySelector('[data-url]'),fileInput=card.querySelector('[data-file]');
 urlInput.addEventListener('input',()=>{if(urlInput.value.trim())img.src=urlInput.value.trim()});
 fileInput.addEventListener('change',()=>{const f=fileInput.files&&fileInput.files[0];if(f){if(f.size>8*1024*1024){fileInput.value='';card.querySelector('[data-file-status]').textContent='File exceeds 8 MB.';return;}img.src=URL.createObjectURL(f);card.querySelector('[data-file-status]').textContent=f.name+' — uploads when you save.';}});
 card.querySelector('[data-remove]').addEventListener('click',()=>{card.remove();renumberSlideCards()});
 card.querySelectorAll('[data-move]').forEach(btn=>btn.addEventListener('click',()=>{const cards=[...root.children],idx=cards.indexOf(card),target=idx+Number(btn.dataset.move);if(target<0||target>=cards.length)return;if(target<idx)root.insertBefore(card,cards[target]);else root.insertBefore(cards[target],card);renumberSlideCards()}));
 return card;
}
function renumberSlideCards(){const root=$('slidesEditor');[...root.children].forEach((c,i)=>{const n=c.querySelector('.slide-number');if(n)n.textContent='Slide '+(i+1)});}
function readSlidesEditor(){
 return [...$('slidesEditor').children].map(card=>({
  image_url:card.querySelector('[data-url]').value.trim(),
  alt:card.querySelector('[data-alt]').value.trim(),
  active:card.querySelector('[data-active]').checked,
  _file:card.querySelector('[data-file]').files?.[0]||null
 }));
}
async function loadCustomization(){
 if(!supabase)return;
 const {data,error}=await supabase.from('site_customization').select('config').eq('id',1).maybeSingle();
 if(error){setStatus('customizationStatus','Customization table is not ready. Run site-customization-migration.sql in Supabase SQL Editor. Details: '+error.message,'error');fillCustomizationForm(defaultCustomization);return}
 savedCustomization={...defaultCustomization,...(data?.config||{})};
 fillCustomizationForm(savedCustomization);
 setStatus('customizationStatus','Loaded saved website design.','success');
}
$('addSlideBtn')?.addEventListener('click',()=>{const slides=readSlidesEditor().map(({_file,...s})=>s);slides.push({image_url:'',alt:'',active:true});renderSlidesEditor(slides);});
$('resetCustomizationBtn')?.addEventListener('click',()=>fillCustomizationForm(savedCustomization));
$('customizationForm')?.addEventListener('submit',async e=>{
 e.preventDefault();if(!supabase||!session){setStatus('customizationStatus','Please sign in first.','error');return}
 const btn=e.submitter; if(btn){btn.disabled=true;btn.textContent='Saving…'}
 try{
  const cfg=currentCustomizationFromForm();
  for(let i=0;i<cfg.slides.length;i++){
   const slide=cfg.slides[i],file=slide._file;delete slide._file;
   if(file){
    if(file.size>8*1024*1024)throw new Error('Image '+(i+1)+' exceeds 8 MB.');
    if(!/^image\/(jpeg|png|webp|gif)$/.test(file.type))throw new Error('Image '+(i+1)+' must be JPG, PNG, WebP or GIF.');
    const ext=({ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type]||'img';
    const path='hero/'+Date.now()+'-'+Math.random().toString(36).slice(2,9)+'.'+ext;
    const {error:upErr}=await supabase.storage.from('site-media').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(upErr)throw new Error('Upload failed for slide '+(i+1)+': '+upErr.message);
    const {data:pub}=supabase.storage.from('site-media').getPublicUrl(path);
    slide.image_url=pub.publicUrl;
   }
   if(slide.image_url&&!/^https:\/\//i.test(slide.image_url))throw new Error('Slide '+(i+1)+' needs a public HTTPS image URL.');
   if(!slide.image_url)slide.active=false;
  }
  const {error}=await supabase.from('site_customization').upsert({id:1,config:cfg,updated_at:new Date().toISOString()});
  if(error)throw error;
  savedCustomization={...cfg};fillCustomizationForm(savedCustomization);
  setStatus('customizationStatus','Saved! The public homepage will load the new design.','success');
 }catch(err){setStatus('customizationStatus','Could not save: '+(err.message||String(err)),'error')}
 finally{if(btn){btn.disabled=false;btn.textContent='Save and publish design'}}
});

// Load design editor when opened; leave existing admin features intact.
// Customer review management. The database migration creates the reviews table and public photo bucket.
const reviewBucket='customer-review-photos';
async function loadReviews(){
 const {data,error}=await supabase.from('customer_reviews').select('*').order('created_at',{ascending:false});
 if(error){$('reviewsRows').innerHTML='<tr><td colspan="5">Could not load reviews: '+safe(error.message)+'</td></tr>';setStatus('reviewStatusMessage','Run customer-reviews-migration.sql in the Supabase SQL Editor, then reload this tab.','error');return}
 reviews=data||[];renderReviews();
}
function renderReviews(){
 $('reviewsRows').innerHTML=reviews.length?reviews.map(r=>`<tr><td><b>${safe(r.customer_name)}</b>${r.title?'<br>'+safe(r.title):''}<br>${safe((r.review_text||'').slice(0,220))}${(r.review_text||'').length>220?'…':''}</td><td>${r.rating?('★'.repeat(Number(r.rating))+'☆'.repeat(5-Number(r.rating))):'—'}</td><td><span class="badge-status ${r.status==='published'?'paid':''}">${safe(r.status)}</span></td><td>${r.photo_url?`<a href="${safe(r.photo_url)}" target="_blank" rel="noopener">View photo</a>`:'—'}</td><td><button class="admin-btn secondary" data-review-edit="${safe(r.id)}">Edit</button><button class="admin-btn secondary" data-review-toggle="${safe(r.id)}">${r.status==='published'?'Unpublish':'Publish'}</button><button class="admin-btn danger" data-review-delete="${safe(r.id)}">Delete</button></td></tr>`).join(''):'<tr><td colspan="5">No reviews yet. Add a customer review above.</td></tr>';
 $('reviewsRows').querySelectorAll('[data-review-edit]').forEach(b=>b.addEventListener('click',()=>{const r=reviews.find(x=>x.id===b.dataset.reviewEdit);if(!r)return;$('reviewId').value=r.id;$('reviewCustomerName').value=r.customer_name||'';$('reviewRating').value=r.rating==null?'':String(r.rating);$('reviewStatus').value=r.status||'draft';$('reviewTitle').value=r.title||'';$('reviewText').value=r.review_text||'';$('reviewExistingPhotoUrl').value=r.photo_url||'';$('reviewExistingPhotoPath').value=r.photo_path||'';$('reviewPhotoFile').value='';showReviewPhoto(r.photo_url);setStatus('reviewStatusMessage','Editing review. Save to apply changes.');$('reviewForm').scrollIntoView({behavior:'smooth',block:'start'});}));
 $('reviewsRows').querySelectorAll('[data-review-toggle]').forEach(b=>b.addEventListener('click',async()=>{const r=reviews.find(x=>x.id===b.dataset.reviewToggle);if(!r)return;const next=r.status==='published'?'draft':'published';const {error}=await supabase.from('customer_reviews').update({status:next}).eq('id',r.id);if(error){setStatus('reviewStatusMessage',error.message,'error');return}setStatus('reviewStatusMessage',next==='published'?'Review published on the Services page.':'Review moved to draft and hidden from the public page.','success');await loadReviews();}));
 $('reviewsRows').querySelectorAll('[data-review-delete]').forEach(b=>b.addEventListener('click',async()=>{const r=reviews.find(x=>x.id===b.dataset.reviewDelete);if(!r||!confirm('Permanently delete this customer review?'))return;const {error}=await supabase.from('customer_reviews').delete().eq('id',r.id);if(error){setStatus('reviewStatusMessage',error.message,'error');return}if(r.photo_path){const removed=await supabase.storage.from(reviewBucket).remove([r.photo_path]);if(removed.error)console.warn('Review deleted, but photo cleanup failed:',removed.error.message)}setStatus('reviewStatusMessage','Review deleted.','success');await loadReviews();}));
}
function showReviewPhoto(url){const wrap=$('reviewPhotoPreviewWrap');if(url){$('reviewPhotoPreview').src=url;wrap.classList.remove('hidden')}else{ $('reviewPhotoPreview').removeAttribute('src');wrap.classList.add('hidden')}}
$('reviewPhotoFile').addEventListener('change',()=>{const file=$('reviewPhotoFile').files[0];if(!file){showReviewPhoto($('reviewExistingPhotoUrl').value);return}if(!file.type.startsWith('image/')||file.size>5*1024*1024){$('reviewPhotoFile').value='';setStatus('reviewStatusMessage','Choose an image no larger than 5 MB.','error');showReviewPhoto($('reviewExistingPhotoUrl').value);return}showReviewPhoto(URL.createObjectURL(file));});
$('removeReviewPhotoBtn').addEventListener('click',()=>{$('reviewPhotoFile').value='';$('reviewExistingPhotoUrl').value='';$('reviewExistingPhotoPath').value='';showReviewPhoto('')});
$('clearReviewBtn').addEventListener('click',clearReviewForm);
function clearReviewForm(){$('reviewForm').reset();$('reviewId').value='';$('reviewExistingPhotoUrl').value='';$('reviewExistingPhotoPath').value='';showReviewPhoto('');setStatus('reviewStatusMessage','');}
$('reviewForm').addEventListener('submit',async e=>{
 e.preventDefault();if(!supabase||!session){setStatus('reviewStatusMessage','Sign in as an authorised admin first.','error');return}
 const id=$('reviewId').value;const name=$('reviewCustomerName').value.trim();const text=$('reviewText').value.trim();if(!name||!text){setStatus('reviewStatusMessage','Customer name and review text are required.','error');return}
 let photoUrl=$('reviewExistingPhotoUrl').value||null,photoPath=$('reviewExistingPhotoPath').value||null;const file=$('reviewPhotoFile').files[0];
 if(file){if(!file.type.startsWith('image/')||file.size>5*1024*1024){setStatus('reviewStatusMessage','Choose an image no larger than 5 MB.','error');return}const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';const newPath=`${session.user.id}/${crypto.randomUUID()}.${ext}`;setStatus('reviewStatusMessage','Uploading customer photo…');const {error:uploadError}=await supabase.storage.from(reviewBucket).upload(newPath,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(uploadError){setStatus('reviewStatusMessage','Photo upload failed: '+uploadError.message,'error');return}const {data:publicData}=supabase.storage.from(reviewBucket).getPublicUrl(newPath);photoUrl=publicData.publicUrl;photoPath=newPath;}
 const ratingValue=$('reviewRating').value;const row={customer_name:name,title:$('reviewTitle').value.trim()||null,review_text:text,rating:ratingValue?Number(ratingValue):null,status:$('reviewStatus').value,photo_url:photoUrl,photo_path:photoPath};
 setStatus('reviewStatusMessage','Saving review…');const result=id?await supabase.from('customer_reviews').update(row).eq('id',id):await supabase.from('customer_reviews').insert(row);
 if(result.error){setStatus('reviewStatusMessage','Could not save review: '+result.error.message,'error');return}
 const oldPath=$('reviewExistingPhotoPath').value;if(file&&oldPath&&oldPath!==photoPath){const removed=await supabase.storage.from(reviewBucket).remove([oldPath]);if(removed.error)console.warn('Review saved, but old photo cleanup failed:',removed.error.message)}
 setStatus('reviewStatusMessage',row.status==='published'?'Review saved and published on the Services page.':'Review saved as a draft; it is not public.','success');clearReviewForm();await loadReviews();
});


init();
})();