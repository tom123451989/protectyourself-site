(function () {
  const config = window.PROTECTYOURSELF_CONFIG || {};

  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase Auth library did not load.");
    return;
  }

  if (!config.supabaseUrl || !config.supabasePublishableKey) {
    console.error("Supabase configuration is missing.");
    return;
  }

  const client = window.supabase.createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );

  async function authorizationHeader() {
    const { data, error } = await client.auth.getSession();

    if (error) {
      console.warn("Could not read the authentication session.", error);
    }

    const token = data && data.session
      ? data.session.access_token
      : config.supabasePublishableKey;

    return "Bearer " + token;
  }

  window.PYAuth = {
    client,
    authorizationHeader
  };

  const nav = document.querySelector(".nav");
  const cartButton = document.getElementById("openCartBtn");

  if (!nav || !cartButton) {
    console.warn("Account button could not find the site navigation.");
    return;
  }

  let currentSession = null;

  const accountButton = document.createElement("button");
  accountButton.type = "button";
  accountButton.id = "customerAccountBtn";
  accountButton.className = "nav-cta customer-account-toggle";
  accountButton.textContent = "Sign in";
  accountButton.setAttribute("aria-expanded", "false");
  accountButton.setAttribute("aria-controls", "customerAccountPanel");

  nav.insertBefore(accountButton, cartButton);

  const panel = document.createElement("section");
  panel.id = "customerAccountPanel";
  panel.className = "customer-account-panel";
  panel.hidden = true;
  panel.setAttribute("aria-label", "Customer account");

  const heading = document.createElement("h3");
  heading.textContent = "My account";

  const identity = document.createElement("p");
  identity.className = "customer-account-identity";

  const ordersButton = document.createElement("button");
  ordersButton.type = "button";
  ordersButton.id = "customerMyOrdersBtn";
  ordersButton.className = "customer-my-orders-button";
  ordersButton.textContent = "My Orders";
  ordersButton.hidden = true;

  const ordersContainer = document.createElement("div");
  ordersContainer.id = "customerOrdersList";
  ordersContainer.className = "customer-orders-list";
  ordersContainer.setAttribute("aria-live", "polite");

  const status = document.createElement("p");
  status.className = "customer-auth-message";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  const signOutButton = document.createElement("button");
  signOutButton.type = "button";
  signOutButton.textContent = "Sign out";

  panel.append(heading, identity, ordersButton, ordersContainer, status, signOutButton);
  document.body.appendChild(panel);

  function renderOrders(orders) {
    ordersContainer.replaceChildren();

    if (!Array.isArray(orders) || orders.length === 0) {
      const empty = document.createElement("p");
      empty.className = "customer-orders-empty";
      empty.textContent = "No orders are linked to this account yet.";
      ordersContainer.appendChild(empty);
      return;
    }

    for (const order of orders) {
      const card = document.createElement("article");
      card.className = "customer-order-card";

      const heading = document.createElement("h4");
      heading.textContent = "Order " + String(order.order_number || "");
      card.appendChild(heading);

      const date = document.createElement("p");
      date.className = "customer-order-date";
      const parsedDate = new Date(order.created_at);
      date.textContent = Number.isNaN(parsedDate.getTime())
        ? "Date unavailable"
        : parsedDate.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short"
          });
      card.appendChild(date);

      const statusLine = document.createElement("p");
      statusLine.className = "customer-order-status";
      statusLine.textContent =
        "Payment: " + String(order.payment_status || "unknown") +
        " | Order: " + String(order.order_status || "unknown");
      card.appendChild(statusLine);

      if (Array.isArray(order.items) && order.items.length > 0) {
        const list = document.createElement("ul");
        list.className = "customer-order-items";

        for (const item of order.items) {
          const li = document.createElement("li");
          li.textContent =
            String(item.product_name || "Product") +
            " x " + String(Number(item.quantity) || 0) +
            " — " + money(item.line_total_inr);
          list.appendChild(li);
        }

        card.appendChild(list);
      }

      if (Number(order.discount_inr) > 0) {
        const discount = document.createElement("p");
        discount.className = "customer-order-discount";
        discount.textContent = "Coupon discount: " + money(order.discount_inr);
        card.appendChild(discount);
      }

      const total = document.createElement("p");
      total.className = "customer-order-total";
      total.textContent = "Total: " + money(order.total_inr);
      card.appendChild(total);

      ordersContainer.appendChild(card);
    }
  }

  async function loadMyOrders() {
    ordersButton.disabled = true;
    ordersButton.textContent = "Loading orders…";
    status.textContent = "";
    ordersContainer.replaceChildren();

    try {
      const { data, error } = await client.auth.getSession();

      if (error) throw error;
      const token = data && data.session && data.session.access_token;

      if (!token) {
        throw new Error("Please sign in again to view your orders.");
      }

      const response = await fetch(
        String(config.supabaseUrl).replace(/\/$/, "") +
          "/functions/v1/storefront-checkout",
        {
          method: "POST",
          headers: {
            apikey: config.supabasePublishableKey,
            Authorization: "Bearer " + token,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ action: "my_orders" })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success !== true) {
        throw new Error(result.error || "Could not load orders. Please try again.");
      }

      renderOrders(result.orders);
    } catch (error) {
      console.error("Could not load customer orders:", error);
      status.textContent = error && error.message
        ? error.message
        : "Could not load orders. Please try again.";
    } finally {
      ordersButton.disabled = false;
      ordersButton.textContent = "My Orders";
    }
  }
  function updateAccount(session) {
    currentSession = session;

    const user = session && session.user;
    const metadata = user && user.user_metadata
      ? user.user_metadata
      : {};

    accountButton.textContent = user ? "My Account" : "Sign in";
    identity.textContent = user
      ? [
          metadata.full_name || metadata.name || "",
          user.email || ""
        ].filter(Boolean).join("\n")
      : "";

    signOutButton.hidden = !user;
    ordersButton.hidden = !user;
    accountButton.setAttribute(
      "aria-expanded",
      String(!panel.hidden)
    );

    if (!user) {
      panel.hidden = true;
    }
  }

  ordersButton.addEventListener("click", loadMyOrders);

  accountButton.addEventListener("click", async function () {
    if (currentSession) {
      panel.hidden = !panel.hidden;
      status.textContent = "";
      accountButton.setAttribute(
        "aria-expanded",
        String(!panel.hidden)
      );
      return;
    }

    status.textContent = "";
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) {
      panel.hidden = false;
      status.textContent =
        "Google sign-in failed. Please try again.";
      console.error("Google sign-in error:", error);
    }
  });

  signOutButton.addEventListener("click", async function () {
    signOutButton.disabled = true;
    status.textContent = "Signing out…";

    try {
      const { error } = await client.auth.signOut();

      if (error) {
        status.textContent = "Could not sign out. Please try again.";
        console.error("Sign-out error:", error);
        return;
      }

      panel.hidden = true;
      status.textContent = "";
    } finally {
      signOutButton.disabled = false;
    }
  });

  client.auth.onAuthStateChange(function (_event, session) {
    updateAccount(session);
  });

  client.auth.getSession().then(function ({ data, error }) {
    if (error) {
      console.warn("Could not restore the sign-in session.", error);
      return;
    }

    updateAccount(data.session);
  });
})();
