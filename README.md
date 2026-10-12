# Protectyourself website starter

Responsive static website designed for GitHub Pages, inspired by the broad structure of the reference website but using original Protectyourself branding and starter copy.

## Pages and features
- `index.html`: homepage with approach, offerings, journal, contact, payment information
- `admin.html`: browser-only content/settings demo
- Product cards and sample categories with enquiry actions (not a live cart/checkout)
- WhatsApp floating link (configure the number)
- Contact form that opens the visitor's email app
- Payment setup section and admin checklist
- Responsive mobile navigation

## Configure before publishing
Edit `assets/config.js`:
- `whatsappNumber`: digits only, including country code
- `contactEmail`: protectyourselfin@gmail.com (already configured)
- `upiId`: optional public UPI ID
- `paymentQrImage`: optional relative path to a payment QR image
- `businessName`

Replace placeholder content, confirm the business description, add your own original images, and add privacy, terms, refund, shipping/delivery, and contact policies as applicable.

## Important limitations
GitHub Pages serves static files. The included admin page stores settings in the current browser only; it is not authenticated and does not change the website for other visitors. Do not treat it as a production admin panel. For shared content editing, order management, secure authentication, and payment confirmation, connect a backend or CMS. A hosted checkout provider is recommended; never collect card details directly in static HTML.

The contact form uses `mailto:` and therefore depends on the visitor having an email app configured. For a true web form, connect a form provider or backend.

## Publish on GitHub Pages
1. Create a GitHub repository, e.g. `protectyourself-site`.
2. Upload all files and folders in this package to the repository root.
3. Open **Settings → Pages**.
4. Under build and deployment, choose **Deploy from a branch**, select `main` and `/(root)`, then save.
5. Wait for the Pages deployment and open the published URL.

For a custom domain, configure it under Pages and add the DNS records recommended by GitHub. Do not publish API secrets or private credentials in this repository.


## Protectyourself launch checklist
1. Add the actual product inventory: product name, precise material, bead count/size, dimensions, source/authenticity details where relevant, stock, price, shipping and return terms.
2. Replace abstract artwork with product photographs you own or are licensed to use.
3. Add a WhatsApp number to `assets/config.js` when ready.
4. Add policy pages: Privacy, Terms, Shipping & Delivery, Returns/Refunds, and Contact.
5. Choose a payment provider and complete its merchant/KYC onboarding. Use the provider's hosted checkout/payment links; do not store card data in this site or expose secret keys in JavaScript.
6. Replace the demo admin with a CMS or backend with authentication. The current `admin.html` is only a local browser demo.

### GitHub Pages deployment
- Create a repository on GitHub and upload the contents of this ZIP (the files inside, not the ZIP itself).
- In repository Settings → Pages, select deployment from branch `main`, folder `/(root)`, and save.
- After deployment, test the provided `github.io` URL on desktop and mobile.
- To use a custom domain, add it in Pages settings and configure the DNS records GitHub displays. Enable HTTPS after DNS verification.

### Secure admin choices
GitHub Pages alone cannot run a secure server-side admin. Use a hosted CMS (for example, a headless CMS with authenticated editing) or a backend service with proper authentication and access rules. Keep admin secrets and payment secret keys server-side, never in this repository.

### Payment integration
No payment is collected by this starter. For a launch-ready store, use a payment provider's hosted checkout/payment link or a supported commerce platform. Configure success/cancel URLs, verify payment server-side using signed webhooks, and only mark an order paid after server-side verification. A UPI QR/manual flow needs a clear order-reference and manual reconciliation process; a screenshot or client-side message alone is not proof of payment.
