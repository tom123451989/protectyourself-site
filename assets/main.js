(() => {
  const config = window.PROTECTYOURSELF_CONFIG || {};
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (menu && nav) {
    menu.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false');
    }));
  }
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
  const email = document.querySelector('.contact-detail b');
  if (email && config.contactEmail) email.textContent = config.contactEmail;

  const wa = document.getElementById('whatsappLink');
  const whatsappDisplay = document.querySelectorAll('.contact-detail b')[1];
  if (config.whatsappNumber) {
    const href = 'https://wa.me/' + String(config.whatsappNumber).replace(/\D/g, '');
    if (wa) { wa.href = href; wa.target = '_blank'; wa.rel = 'noopener noreferrer'; wa.title = 'Chat on WhatsApp'; }
    if (whatsappDisplay) {
      whatsappDisplay.textContent = 'Chat with us on WhatsApp';
      whatsappDisplay.innerHTML = '<a href="' + href + '" target="_blank" rel="noopener noreferrer">Chat with us on WhatsApp</a>';
    }
  } else if (wa) { wa.href = '#contact'; wa.title = 'WhatsApp contact will be added soon'; }

  const setStatus = (message, type='') => {
    const el = document.getElementById('formStatus');
    if (el) { el.textContent = message; el.className = 'form-note ' + type; }
  };
  const restHeaders = () => ({ 'apikey': config.supabasePublishableKey, 'Content-Type': 'application/json' });
  const supabaseReady = Boolean(config.supabaseUrl && config.supabasePublishableKey);

  async function loadPublicSettings() {
    if (!supabaseReady) return;
    try {
      const url = config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/site_settings?id=eq.1&select=*';
      const response = await fetch(url, { headers: { apikey: config.supabasePublishableKey } });
      if (!response.ok) return;
      const rows = await response.json();
      const s = rows && rows[0];
      if (!s) return;
      if (s.contact_email) {
        const b = document.querySelector('.contact-detail b');
        if (b) b.textContent = s.contact_email;
        config.contactEmail = s.contact_email;
      }
      if (s.business_name) document.querySelectorAll('.brand span')[1]?.setAttribute('aria-label', s.business_name);
      const notice = document.getElementById('publicNotice');
      if (notice && s.public_notice) { notice.hidden = false; notice.textContent = s.public_notice; }
      const number = String(s.whatsapp_number || '').replace(/\D/g, '');
      if (number) {
        const href = 'https://wa.me/' + number;
        if (wa) { wa.href = href; wa.target = '_blank'; wa.rel = 'noopener noreferrer'; wa.title = 'Chat on WhatsApp'; }
        if (whatsappDisplay) { whatsappDisplay.textContent = 'Chat with us on WhatsApp'; }
      }
      const indiaUrl = String(s.india_payment_url || '').trim();
      const paymentLink = document.querySelector('.payment-card .underlined-link');
      if (paymentLink && indiaUrl && /^https:\/\//i.test(indiaUrl)) {
        paymentLink.href = indiaUrl; paymentLink.target = '_blank'; paymentLink.rel = 'noopener noreferrer';
        paymentLink.innerHTML = 'Proceed to payment <span>↗</span>';
      }
    } catch (err) {
      // Public settings are optional; the page remains usable if the API is temporarily unavailable.
      console.warn('Could not load public site settings.', err);
    }
  }

  const form = document.getElementById('contactForm');
  if (form) form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!supabaseReady) {
      setStatus('Enquiry submission is temporarily unavailable. Please email ' + (config.contactEmail || 'protectyourselfin@gmail.com') + '.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    const d = new FormData(form);
    const name = String(d.get('name') || '').trim();
    const emailValue = String(d.get('email') || '').trim();
    const topic = String(d.get('topic') || 'General enquiry').trim();
    const message = String(d.get('message') || '').trim();
    const consent = d.get('consent') === 'on';
    if (!name || !emailValue || !message || !consent) {
      setStatus('Please complete all required fields and consent before submitting.', 'error'); return;
    }
    if (message.length > 5000) { setStatus('Please keep your message under 5,000 characters.', 'error'); return; }
    if (button) { button.disabled = true; button.textContent = 'Submitting…'; }
    setStatus('Submitting your enquiry securely…');
    try {
      const endpoint = config.supabaseUrl.replace(/\/$/, '') + '/rest/v1/enquiries';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { ...restHeaders(), 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          customer_name: name,
          customer_email: emailValue,
          customer_phone: null,
          service_name: topic,
          message,
          consent: true,
          status: 'new',
          payment_status: 'unverified'
        })
      });
      if (!response.ok) {
        let detail = '';
        try { const j = await response.json(); detail = j.message || j.details || j.hint || ''; } catch {}
        throw new Error(detail || ('Request failed (' + response.status + ').'));
      }
      form.reset();
      setStatus('Thank you — your enquiry has been submitted. We will respond using the email address you provided.', 'success');
    } catch (err) {
      console.error('Enquiry submission failed:', err);
      setStatus('We could not submit your enquiry. Please email ' + (config.contactEmail || 'protectyourselfin@gmail.com') + ' and try again later.', 'error');
    } finally {
      if (button) { button.disabled = false; button.innerHTML = 'Submit enquiry <span>↗</span>'; }
    }
  });

  document.querySelectorAll('.add-cart').forEach(btn => btn.addEventListener('click', () => {
    const product = btn.dataset.product;
    const form = document.getElementById('contactForm');
    const topic = form?.querySelector('[name="topic"]');
    const message = form?.querySelector('[name="message"]');
    if (topic) topic.value = 'Product enquiry';
    if (message) message.value = 'I am interested in: ' + product + '. Please share availability, product details, delivery and payment information.';
    const count = document.getElementById('cartCount');
    if (count) count.textContent = String(Number(count.textContent || 0) + 1);
    btn.textContent = 'Added to enquiry ✓';
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
    message?.focus({ preventScroll: true });
  }));

  loadPublicSettings();
})();
