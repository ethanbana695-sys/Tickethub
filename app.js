
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const LEAGUES = [
    "Premier League",
    "Championship",
    "League One"
  ];

  const CATEGORIES = [
    { name: "Standard", price: 35 },
    { name: "Premium", price: 65 },
    { name: "Hospitality", price: 150 }
  ];

  let fixtures = [];
  let manualMatches = [];
  let basket = [];
  let selectedLeague = "All";
  let editingId = null;

  try {
    manualMatches = JSON.parse(localStorage.getItem("th_matches") || "[]");
    basket = JSON.parse(localStorage.getItem("th_basket") || "[]");
  } catch (error) {
    manualMatches = [];
    basket = [];
  }

  function saveData() {
    localStorage.setItem("th_matches", JSON.stringify(manualMatches));
    localStorage.setItem("th_basket", JSON.stringify(basket));
  }

  function money(value) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(Number(value) || 0);
  }

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]);
  }

  function makeId() {
    return "match-" + Date.now() + "-" +
      Math.floor(Math.random() * 10000);
  }

  function notify(message) {
    const toast = $("toast");

    if (!toast) {
      alert(message);
      return;
    }

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => {
      toast.classList.remove("show");
    }, 3000);
  }

  function formatDate(value) {
    if (!value) {
      return { date: "Date to be confirmed", time: "Time to be confirmed" };
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return { date: "Date to be confirmed", time: "Time to be confirmed" };
    }

    return {
      date: date.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/London"
      }),
      time: date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/London"
      }) + " UK"
    };
  }

  function getAllMatches() {
    return [...manualMatches, ...fixtures];
  }

  // LOAD FOOTBALL FIXTURES

  async function loadFixtures() {
    const grid = $("matchGrid");

    if (grid) {
      grid.innerHTML = "<p>Loading football fixtures...</p>";
    }

    try {
      const response = await fetch("/api/fixtures");

      if (!response.ok) {
        throw new Error("Fixture request failed");
      }

      const data = await response.json();
      const matches = Array.isArray(data) ? data : (data.matches || []);

      fixtures = matches.map(match => {
        const competition =
          match.competition?.name || match.league || "";

        const name = competition.toLowerCase();
        let league = competition;

        if (name.includes("premier")) {
          league = "Premier League";
        } else if (name.includes("championship")) {
          league = "Championship";
        } else if (name.includes("league one")) {
          league = "League One";
        }

        return {
          id: "fixture-" + match.id,
          home: match.homeTeam?.name || match.home || "Home team",
          away: match.awayTeam?.name || match.away || "Away team",
          league,
          date: match.utcDate || match.date || "",
          venue: match.venue || "Venue to be confirmed",
          source: "fixture"
        };
      });

      render();
    } catch (error) {
      console.error(error);
      fixtures = [];
      render();
      notify("Fixtures could not be refreshed.");
    }
  }

  // LEAGUE FILTERS

  function renderLeagues() {
    const chips = $("leagueChips");
    const filter = $("leagueFilter");

    if (chips) {
      chips.innerHTML = ["All", ...LEAGUES].map(league => `
        <button type="button"
          class="chip ${selectedLeague === league ? "active" : ""}"
          data-league="${safe(league)}">
          ${league === "All" ? "All leagues" : safe(league)}
        </button>
      `).join("");
    }

    if (filter) {
      filter.innerHTML = `
        <option value="All">All leagues</option>
        ${LEAGUES.map(league =>
          `<option value="${safe(league)}">${safe(league)}</option>`
        ).join("")}
      `;

      filter.value = selectedLeague;
    }
  }

  // MATCH CARDS

  function renderMatches() {
    const grid = $("matchGrid");
    if (!grid) return;

    const search = ($("search")?.value || "").toLowerCase().trim();
    const sort = $("sort")?.value || "soonest";

    let matches = getAllMatches();

    if (selectedLeague !== "All") {
      matches = matches.filter(m => m.league === selectedLeague);
    }

    if (search) {
      matches = matches.filter(m =>
        `${m.home} ${m.away} ${m.league}`.toLowerCase().includes(search)
      );
    }

    matches.sort((a, b) => {
      const first = new Date(a.date || 0).getTime();
      const second = new Date(b.date || 0).getTime();

      return sort === "latest" ? second - first : first - second;
    });

    if (!matches.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No matches found</h3>
          <p>Try another search or league.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = matches.map(match => {
      const date = formatDate(match.date);

      return `
        <article class="match-card"
          data-match="${safe(match.id)}"
          tabindex="0"
          role="button">

          <div class="match-card-top">
            <span>${safe(match.league)}</span>
          </div>

          <div class="match-teams">
            <h3>${safe(match.home)}</h3>
            <span>VS</span>
            <h3>${safe(match.away)}</h3>
          </div>

          <div class="match-information">
            <p>📅 ${safe(date.date)}</p>
            <p>🕒 ${safe(date.time)}</p>
            <p>📍 ${safe(match.venue || "Venue to be confirmed")}</p>
          </div>

          <div class="match-card-bottom">
            <span>View match details</span>
            <span>→</span>
          </div>
        </article>
      `;
    }).join("");
  }

  function render() {
    renderLeagues();
    renderMatches();
    renderBasket();
    renderAdmin();
  }

  // MATCH DETAILS AND TICKET SELECTION

  function addModalStyles() {
    if ($("th-modal-styles")) return;

    const style = document.createElement("style");
    style.id = "th-modal-styles";

    style.textContent = `
      .th-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9998;
        background: rgba(0,0,0,.78);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 15px;
        overflow-y: auto;
      }

      .th-modal {
        position: relative;
        background: white;
        color: #17202a;
        width: 100%;
        max-width: 600px;
        max-height: 92vh;
        overflow-y: auto;
        border-radius: 14px;
        padding: 24px;
      }

      .th-modal-close {
        position: absolute;
        right: 14px;
        top: 10px;
        border: 0;
        background: transparent;
        font-size: 28px;
        cursor: pointer;
      }

      .th-category {
        border: 1px solid #ddd;
        border-radius: 9px;
        padding: 13px;
        margin: 10px 0;
        cursor: pointer;
      }

      .th-category.selected {
        border: 2px solid #176b45;
        background: #f0faf4;
      }

      .th-modal input,
      .th-modal select {
        padding: 10px;
        border: 1px solid #bbb;
        border-radius: 7px;
        max-width: 100%;
      }

      .th-primary {
        width: 100%;
        border: 0;
        border-radius: 8px;
        padding: 13px;
        background: #142d24;
        color: white;
        font-weight: bold;
        margin-top: 14px;
        cursor: pointer;
      }

      .th-note {
        background: #fff5d9;
        border-radius: 8px;
        padding: 12px;
        font-size: 13px;
        line-height: 1.5;
        margin-top: 15px;
      }

      .th-cart-item {
        border-bottom: 1px solid #ddd;
        padding: 12px 0;
      }
    `;

    document.head.appendChild(style);
  }

  function openMatch(matchId) {
    const match = getAllMatches().find(m => String(m.id) === String(matchId));
    if (!match) return;

    addModalStyles();

    const date = formatDate(match.date);

    const backdrop = document.createElement("div");
    backdrop.className = "th-modal-backdrop";
    backdrop.id = "th-match-modal";

    backdrop.innerHTML = `
      <section class="th-modal" role="dialog" aria-modal="true">
        <button class="th-modal-close" type="button">×</button>

        <p>${safe(match.league)}</p>
        <h2>${safe(match.home)} vs ${safe(match.away)}</h2>

        <p>📅 ${safe(date.date)}</p>
        <p>🕒 ${safe(date.time)}</p>
        <p>🏟️ ${safe(match.venue || "Venue to be confirmed")}</p>

        <hr>

        <h3>Select a ticket category</h3>

        <div id="th-categories">
          ${CATEGORIES.map((category, index) => `
            <label class="th-category ${index === 0 ? "selected" : ""}">
              <input type="radio"
                name="th-category"
                value="${category.name}"
                ${index === 0 ? "checked" : ""}>
              <strong>${category.name}</strong>
              <p>${money(category.price)} per ticket</p>
            </label>
          `).join("")}
        </div>

        <label for="th-quantity"><strong>Quantity</strong></label>
        <select id="th-quantity">
          ${[1, 2, 3, 4, 5, 6].map(n =>
            `<option value="${n}">${n}</option>`
          ).join("")}
        </select>

        <p id="th-total"><strong>Total: ${money(35)}</strong></p>

        <div class="th-note">
          Demonstration only: these categories and prices do not represent
          confirmed tickets or available seats. No ticket can be purchased
          or reserved through this demonstration.
        </div>

        <button type="button" class="th-primary" id="th-add-basket">
          Add demonstration item to basket
        </button>
      </section>
    `;

    document.body.appendChild(backdrop);

    function selectedCategory() {
      return backdrop.querySelector(
        'input[name="th-category"]:checked'
      )?.value || "Standard";
    }

    function updateTotal() {
      const category = CATEGORIES.find(
        c => c.name === selectedCategory()
      );

      const quantity = Number($("th-quantity").value);
      $("th-total").innerHTML =
        `<strong>Total: ${money(category.price * quantity)}</strong>`;

      backdrop.querySelectorAll(".th-category").forEach(label => {
        label.classList.toggle(
          "selected",
          label.querySelector("input").checked
        );
      });
    }

    backdrop.addEventListener("change", updateTotal);

    $("th-add-basket").addEventListener("click", () => {
      const category = CATEGORIES.find(
        c => c.name === selectedCategory()
      );

      const quantity = Number($("th-quantity").value);

      const item = {
        id: makeId(),
        matchId: match.id,
        name: `${match.home} vs ${match.away}`,
        category: category.name,
        price: category.price,
        quantity
      };

      basket.push(item);
      saveData();
      renderBasket();

      notify("Demonstration item added to basket.");
      closeMatch();
    });

    backdrop.addEventListener("click", event => {
      if (
        event.target === backdrop ||
        event.target.closest(".th-modal-close")
      ) {
        closeMatch();
      }
    });

    document.addEventListener("keydown", handleEscape);
  }

  function handleEscape(event) {
    if (event.key === "Escape") closeMatch();
  }

  function closeMatch() {
    $("th-match-modal")?.remove();
    document.removeEventListener("keydown", handleEscape);
  }

  // BASKET

  function renderBasket() {
    const count = $("cartCount");
    const items = $("cartItems");
    const total = $("cartTotal");

    const quantity = basket.reduce((sum, item) =>
      sum + item.quantity, 0
    );

    if (count) count.textContent = quantity;

    if (items) {
      items.innerHTML = basket.length
        ? basket.map(item => `
          <div class="th-cart-item">
            <strong>${safe(item.name)}</strong>
            <p>${safe(item.category)} × ${item.quantity}</p>
            <p>${money(item.price * item.quantity)}</p>
            <button type="button" data-remove="${safe(item.id)}">
              Remove
            </button>
          </div>
        `).join("")
        : "<p>Your basket is empty.</p>";
    }

    const amount = basket.reduce((sum, item) =>
      sum + item.price * item.quantity, 0
    );

    if (total) total.textContent = money(amount);
  }

  function removeFromBasket(id) {
    basket = basket.filter(item => item.id !== id);
    saveData();
    renderBasket();
    notify("Item removed from basket.");
  }

  // ADMIN PANEL

  function openAdmin() {
    $("adminPanel")?.classList.add("open");
    $("backdrop")?.classList.add("show");
  }

  function closeAdmin() {
    $("adminPanel")?.classList.remove("open");
    $("backdrop")?.classList.remove("show");
  }

  function renderAdmin() {
    const rows = $("adminRows");
    if (!rows) return;

    rows.innerHTML = manualMatches.length
      ? manualMatches.map(match => `
        <div class="admin-row">
          <strong>${safe(match.home)} vs ${safe(match.away)}</strong>
          <p>${safe(match.league)}</p>
          <p>${safe(formatDate(match.date).date)}</p>
          <button type="button" data-edit="${safe(match.id)}">Edit</button>
          <button type="button" data-delete="${safe(match.id)}">Delete</button>
        </div>
      `).join("")
      : "<p>No demonstration listings added.</p>";
  }

  function resetAdminForm() {
    $("matchForm")?.reset();
    editingId = null;
  }

  function saveAdminMatch(event) {
    event.preventDefault();

    const home = $("home")?.value.trim();
    const away = $("away")?.value.trim();
    const league = $("adminLeague")?.value;
    const date = $("date")?.value;
    const venue = $("venue")?.value.trim();
    const price = Number($("price")?.value);
    const stock = Number($("stock")?.value);

    if (!home || !away || !league || !date || !venue) {
      notify("Please complete all match details.");
      return;
    }

    if (!Number.isFinite(price) || price < 0 ||
        !Number.isInteger(stock) || stock < 0) {
      notify("Enter a valid price and quantity.");
      return;
    }

    const match = {
      id: editingId || makeId(),
      home,
      away,
      league,
      date,
      venue,
      price,
      stock,
      source: "manual"
    };

    if (editingId) {
      manualMatches = manualMatches.map(m =>
        m.id === editingId ? match : m
      );
    } else {
      manualMatches.push(match);
    }

    saveData();
    resetAdminForm();
    render();
    notify("Demonstration listing saved.");
  }

  function editMatch(id) {
    const match = manualMatches.find(m => m.id === id);
    if (!match) return;

    editingId = id;

    $("home").value = match.home;
    $("away").value = match.away;
    $("adminLeague").value = match.league;
    $("date").value = match.date;
    $("venue").value = match.venue;
    $("price").value = match.price;
    $("stock").value = match.stock;

    notify("Editing demonstration listing.");
  }

  function deleteMatch(id) {
    if (!confirm("Delete this demonstration listing?")) return;

    manualMatches = manualMatches.filter(m => m.id !== id);
    basket = basket.filter(item => item.matchId !== id);

    saveData();
    render();
    notify("Listing deleted.");
  }

  // EVENT LISTENERS

  function setupEvents() {
    $("matchGrid")?.addEventListener("click", event => {
      const card = event.target.closest("[data-match]");
      if (card) openMatch(card.dataset.match);
    });

    $("matchGrid")?.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        const card = event.target.closest("[data-match]");
        if (card) {
          event.preventDefault();
          openMatch(card.dataset.match);
        }
      }
    });

    $("leagueChips")?.addEventListener("click", event => {
      const button = event.target.closest("[data-league]");
      if (!button) return;

      selectedLeague = button.dataset.league;
      render();
    });

    $("leagueFilter")?.addEventListener("change", event => {
      selectedLeague = event.target.value;
      render();
    });

    $("search")?.addEventListener("input", renderMatches);
    $("sort")?.addEventListener("change", renderMatches);

    $("adminToggle")?.addEventListener("click", openAdmin);
    $("closeAdmin")?.addEventListener("click", closeAdmin);
    $("backdrop")?.addEventListener("click", closeAdmin);

    $("matchForm")?.addEventListener("submit", saveAdminMatch);

    $("adminRows")?.addEventListener("click", event => {
      const edit = event.target.closest("[data-edit]");
      const remove = event.target.closest("[data-delete]");

      if (edit) editMatch(edit.dataset.edit);
      if (remove) deleteMatch(remove.dataset.delete);
    });

    $("cartOpen")?.addEventListener("click", () => {
      $("drawer")?.classList.add("open");
    });

    $("cartClose")?.addEventListener("click", () => {
      $("drawer")?.classList.remove("open");
    });

    $("cartItems")?.addEventListener("click", event => {
      const button = event.target.closest("[data-remove]");
      if (button) removeFromBasket(button.dataset.remove);
    });

    $("checkout")?.addEventListener("click", event => {
      event.preventDefault();

      notify(
        "Checkout is not enabled. Real ticket inventory and secure " +
        "payment verification must be set up first."
      );
    });
  }

  // START

  function start() {
    setupEvents();
    render();
    loadFixtures();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
