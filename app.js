(() => {
  "use strict";

  // TICKETHUB - MAIN WEBSITE SCRIPT

  const $ = id => document.getElementById(id);

  const LEAGUES = [
    "Premier League",
    "Championship",
    "League One"
  ];

  let fixtures = [];
  let manualMatches = [];
  let basket = [];
  let selectedLeague = "All";
  let selectedMatch = null;
  let editingId = null;

  // -----------------------------
  // LOAD SAVED DEMONSTRATION DATA
  // -----------------------------

  try {
    manualMatches = JSON.parse(
      localStorage.getItem("th_matches") || "[]"
    );

    basket = JSON.parse(
      localStorage.getItem("th_basket") || "[]"
    );
  } catch (error) {
    manualMatches = [];
    basket = [];
  }

  function saveData() {
    localStorage.setItem(
      "th_matches",
      JSON.stringify(manualMatches)
    );

    localStorage.setItem(
      "th_basket",
      JSON.stringify(basket)
    );
  }

  // -----------------------------
  // BASIC HELPERS
  // -----------------------------

  function money(amount) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(Number(amount) || 0);
  }

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
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
      return {
        date: "Date to be confirmed",
        time: "Time to be confirmed"
      };
    }

    const date = new Date(value);

    if (isNaN(date.getTime())) {
      return {
        date: "Date to be confirmed",
        time: "Time to be confirmed"
      };
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

  // -----------------------------
  // LOAD FOOTBALL FIXTURES
  // -----------------------------

  async function loadFixtures() {
    const grid = $("matchGrid");

    if (grid) {
      grid.innerHTML =
        '<p class="loading-message">Loading football fixtures...</p>';
    }

    try {
      const response = await fetch("/api/fixtures");

      if (!response.ok) {
        throw new Error("Unable to load fixtures");
      }

      const data = await response.json();

      const matches = Array.isArray(data)
        ? data
        : (data.matches || []);

      fixtures = matches.map(match => {
        const competition =
          match.competition?.name ||
          match.league ||
          "";

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

          home:
            match.homeTeam?.name ||
            match.home ||
            "Home team",

          away:
            match.awayTeam?.name ||
            match.away ||
            "Away team",

          league: league,

          date:
            match.utcDate ||
            match.date ||
            "",

          venue:
            match.venue ||
            "Venue to be confirmed",

          source: "fixture",

          price: 0,
          stock: 0
        };
      });

      render();

    } catch (error) {
      console.error("Fixture error:", error);

      fixtures = [];

      render();

      notify("Could not load fixtures. Please try again.");
    }
  }

  // -----------------------------
  // LEAGUE FILTERS
  // -----------------------------

  function renderLeagues() {
    const chips = $("leagueChips");
    const filter = $("leagueFilter");

    if (chips) {
      chips.innerHTML = ["All", ...LEAGUES].map(league => `
        <button
          type="button"
          class="chip ${selectedLeague === league ? "active" : ""}"
          data-league="${safe(league)}">
          ${league === "All" ? "All leagues" : safe(league)}
        </button>
      `).join("");
    }

    if (filter) {
      filter.innerHTML = `
        <option value="All">All leagues</option>
        ${LEAGUES.map(league => `
          <option value="${safe(league)}">
            ${safe(league)}
          </option>
        `).join("")}
      `;

      filter.value = selectedLeague;
    }
  }

  // -----------------------------
  // MATCH CARD DISPLAY
  // -----------------------------

  function renderMatches() {
    const grid = $("matchGrid");

    if (!grid) return;

    const search = ($("search")?.value || "")
      .trim()
      .toLowerCase();

    const sort = $("sort")?.value || "soonest";

    let matches = getAllMatches();

    if (selectedLeague !== "All") {
      matches = matches.filter(match =>
        match.league === selectedLeague
      );
    }

    if (search) {
      matches = matches.filter(match =>
        `${match.home} ${match.away} ${match.league}`
          .toLowerCase()
          .includes(search)
      );
    }

    matches.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();

      if (sort === "latest") return dateB - dateA;

      return dateA - dateB;
    });

    if (!matches.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <h3>No matches found</h3>
          <p>Try another search or select a different league.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = matches.map(match => {
      const date = formatDate(match.date);

      return `
        <article
          class="match-card"
          data-match="${safe(match.id)}"
          tabindex="0"
          role="button"
          aria-label="View ${safe(match.home)} versus ${safe(match.away)}">

          <div class="match-card-top">
            <span class="league-name">
              ${safe(match.league)}
            </span>

            <span class="match-label">
              ${match.source === "manual" ? "Demo listing" : "Fixture"}
            </span>
          </div>

          <div class="match-teams">
            <h3>${safe(match.home)}</h3>
            <span class="versus">VS</span>
            <h3>${safe(match.away)}</h3>
          </div>

          <div class="match-information">
            <p>📅 ${safe(date.date)}</p>
            <p>🕒 ${safe(date.time)}</p>
            <p>📍 ${safe(match.venue || "Venue to be confirmed")}</p>
          </div>

          <div class="match-card-bottom">
            <span>View match details</span>
            <span aria-hidden="true">→</span>
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

  // -----------------------------
  // MATCH DETAILS WINDOW
  // -----------------------------

  function addModalStyles() {
    if ($("th-modal-styles")) return;

    const style = document.createElement("style");
    style.id = "th-modal-styles";

    style.textContent = `
      .th-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 9998;
        background: rgba(0,0,0,.75);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        overflow-y: auto;
      }

      .th-modal {
        background: #fff;
        color: #17202a;
        width: 100%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
        border-radius: 14px;
        padding: 24px;
        position: relative;
      }

      .th-modal-close {
        position: absolute;
        right: 15px;
        top: 12px;
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
      }

      .th-note {
        background: #fff5d9;
        border-radius: 8px;
        padding: 12px;
        font-size: 13px;
        line-height: 1.5;
      }

      .th-modal button {
        cursor: pointer;
      }

      .th-primary {
        display: block;
        width: 100%;
        border: 0;
        border-radius: 8px;
        padding: 13px;
        background: #142d24;
        color: white;
        font-weight: bold;
        margin-top: 15px;
      }

      .th-secondary {
        border: 1px solid #bbb;
        border-radius: 7px;
        padding: 9px 14px;
        background: white;
      }
    `;

    document.head.appendChild(style);
  }

  function openMatch(matchId) {
    const match = getAllMatches().find(item =>
      String(item.id) === String(matchId)
    );

    if (!match) return;

    selectedMatch = match;

    addModalStyles();

    const date = formatDate(match.date);

    const backdrop = document.createElement("div");
    backdrop.className = "th-modal-backdrop";
    backdrop.id = "th-match-modal";

    backdrop.innerHTML = `
      <section
        class="th-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Match details">

        <button
          class="th-modal-close"
          type="button"
          aria-label="Close">
          ×
        </button>

        <p>${safe(match.league)}</p>

        <h2>
          ${safe(match.home)}
          <span> vs </span>
          ${safe(match.away)}
        </h2>

        <p>📅 ${safe(date.date)}</p>
        <p>🕒 ${safe(date.time)}</p>
        <p>🏟️ ${safe(match.venue || "Venue to be confirmed")}</p>

        <hr>

        <h3>Ticket categories</h3>

        <div class="th-category">
          <strong>Standard</strong>
          <p>General seating category.</p>
          <strong>Indicative price: £35.00</strong>
        </div>

        <div class="th-category">
          <strong>Premium</strong>
          <p>Premium seating category.</p>
          <strong>Indicative price: £65.00</strong>
        </div>

        <div class="th-category">
          <strong>Hospitality</strong>
          <p>Hospitality category.</p>
          <strong>Indicative price: £150.00</strong>
        </div>

        <div class="th-note">
          These are demonstration categories and indicative prices only.
          No admission ticket or seat is being offered or reserved.
          Ticket sales require authorised inventory and confirmation
          from the relevant club or ticket supplier.
        </div>

        <button
          type="button"
          class="th-primary"
          data-close-modal>
          Close match details
        </button>
      </section>
    `;

    document.body.appendChild(backdrop);

    backdrop.addEventListener("click", event => {
      if (
        event.target === backdrop ||
        event.target.closest("[data-close-modal]") ||
        event.target.closest(".th-modal-close")
      ) {
        closeMatch();
      }
    });

    document.addEventListener("keydown", handleEscape);
  }

  function handleEscape(event) {
    if (event.key === "Escape") {
      closeMatch();
    }
  }

  function closeMatch() {
    $("th-match-modal")?.remove();
    document.removeEventListener("keydown", handleEscape);
    selectedMatch = null;
  }

  // -----------------------------
  // BASKET
  // -----------------------------

  function renderBasket() {
    const count = $("cartCount");
    const items = $("cartItems");
    const total = $("cartTotal");

    const quantity = basket.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    if (count) count.textContent = quantity;

    if (items) {
      if (!basket.length) {
        items.innerHTML = "<p>Your basket is empty.</p>";
      } else {
        items.innerHTML = basket.map(item => `
          <div class="cart-item">
            <strong>${safe(item.name)}</strong>
            <p>${safe(item.category)} × ${item.quantity}</p>
            <p>${money(item.price * item.quantity)}</p>

            <button
              type="button"
              data-remove="${safe(item.id)}">
              Remove
            </button>
          </div>
        `).join("");
      }
    }

    const amount = basket.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (total) total.textContent = money(amount);
  }

  function removeFromBasket(id) {
    basket = basket.filter(item => item.id !== id);
    saveData();
    renderBasket();
    notify("Item removed from basket.");
  }

  // -----------------------------
  // ADMIN PANEL
  // -----------------------------

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

    if (!manualMatches.length) {
      rows.innerHTML = "<p>No demonstration listings added.</p>";
      return;
    }

    rows.innerHTML = manualMatches.map(match => `
      <div class="admin-row">
        <strong>
          ${safe(match.home)} vs ${safe(match.away)}
        </strong>

        <p>${safe(match.league)}</p>
        <p>${safe(formatDate(match.date).date)}</p>
        <p>Demo price: ${money(match.price)}</p>

        <button
          type="button"
          data-edit="${safe(match.id)}">
          Edit
        </button>

        <button
          type="button"
          data-delete="${safe(match.id)}">
          Delete
        </button>
      </div>
    `).join("");
  }

  function resetAdminForm() {
    $("matchForm")?.reset();
    editingId = null;

    const submit = $("matchForm")?.querySelector(
      'button[type="submit"]'
    );

    if (submit) submit.textContent = "Add demonstration listing";
  }

  function addOrUpdateMatch(event) {
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
      manualMatches = manualMatches.map(item =>
        item.id === editingId ? match : item
      );

      notify("Demonstration listing updated.");
    } else {
      manualMatches.push(match);
      notify("Demonstration listing added.");
    }

    saveData();
    resetAdminForm();
    render();
  }

  function editMatch(id) {
    const match = manualMatches.find(item => item.id === id);
    if (!match) return;

    editingId = id;

    $("home").value = match.home;
    $("away").value = match.away;
    $("adminLeague").value = match.league;
    $("date").value = match.date;
    $("venue").value = match.venue;
    $("price").value = match.price;
    $("stock").value = match.stock;

    const submit = $("matchForm")?.querySelector(
      'button[type="submit"]'
    );

    if (submit) submit.textContent = "Save changes";

    notify("You are editing this demonstration listing.");
  }

  function deleteMatch(id) {
    const confirmed = confirm(
      "Delete this demonstration listing?"
    );

    if (!confirmed) return;

    manualMatches = manualMatches.filter(
      item => item.id !== id
    );

    basket = basket.filter(item =>
      item.matchId !== id
    );

    saveData();
    render();
    notify("Listing deleted.");
  }

  // -----------------------------
  // EVENT LISTENERS
  // -----------------------------

  function setupEvents() {

    $("matchGrid")?.addEventListener("click", event => {
      const card = event.target.closest("[data-match]");
      if (card) openMatch(card.dataset.match);
    });

    $("matchGrid")?.addEventListener("keydown", event => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
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

    $("matchForm")?.addEventListener(
      "submit",
      addOrUpdateMatch
    );

    $("adminRows")?.addEventListener("click", event => {
      const edit = event.target.closest("[data-edit]");
      const remove = event.target.closest("[data-delete]");

      if (edit) editMatch(edit.dataset.edit);
      if (remove) deleteMatch(remove.dataset.delete);
    });

    $("cartOpen")?.addEventListener("click", () => {
      notify("The basket is currently demonstration-only.");
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
        "Checkout is not enabled. Authorised ticket inventory, " +
        "secure payment processing and ticket delivery must be " +
        "configured before accepting payments."
      );
    });

  }

  // -----------------------------
  // START WEBSITE
  // -----------------------------

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
        
