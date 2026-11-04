(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const ADMIN_ACCESS_CODE = "CHANGE-ME-1234";

  const LEAGUES = [
    "Premier League",
    "Championship",
    "League One"
  ];

  const CATEGORIES = [
    { name: "Standard", price: 35, description: "General seating category" },
    { name: "Premium", price: 65, description: "Premium seating category" },
    { name: "Hospitality", price: 150, description: "Hospitality category" }
  ];

  const STADIUMS = {
    "arsenal": "Emirates Stadium",
    "aston villa": "Villa Park",
    "bournemouth": "Vitality Stadium",
    "brentford": "Gtech Community Stadium",
    "brighton": "Amex Stadium",
    "brighton and hove albion": "Amex Stadium",
    "burnley": "Turf Moor",
    "chelsea": "Stamford Bridge",
    "crystal palace": "Selhurst Park",
    "everton": "Hill Dickinson Stadium",
    "fulham": "Craven Cottage",
    "leeds united": "Elland Road",
    "liverpool": "Anfield",
    "manchester city": "Etihad Stadium",
    "manchester united": "Old Trafford",
    "newcastle united": "St James' Park",
    "nottingham forest": "The City Ground",
    "sunderland": "Stadium of Light",
    "tottenham hotspur": "Tottenham Hotspur Stadium",
    "west ham united": "London Stadium",
    "wolverhampton wanderers": "Molineux Stadium",
    "blackburn rovers": "Ewood Park",
    "bristol city": "Ashton Gate",
    "cardiff city": "Cardiff City Stadium",
    "coventry city": "Coventry Building Society Arena",
    "derby county": "Pride Park",
    "hull city": "MKM Stadium",
    "ipswich town": "Portman Road",
    "leicester city": "King Power Stadium",
    "middlesbrough": "Riverside Stadium",
    "millwall": "The Den",
    "norwich city": "Carrow Road",
    "oxford united": "Kassam Stadium",
    "portsmouth": "Fratton Park",
    "preston north end": "Deepdale",
    "queens park rangers": "MATRADE Loftus Road",
    "qpr": "MATRADE Loftus Road",
    "sheffield united": "Bramall Lane",
    "sheffield wednesday": "Hillsborough",
    "southampton": "St Mary's Stadium",
    "stoke city": "bet365 Stadium",
    "swansea city": "Swansea.com Stadium",
    "watford": "Vicarage Road",
    "west bromwich albion": "The Hawthorns",
    "wrexham": "SToK Cae Ras",
    "barnsley": "Oakwell",
    "bolton wanderers": "Toughsheet Community Stadium",
    "bradford city": "University of Bradford Stadium",
    "burton albion": "Pirelli Stadium",
    "charlton athletic": "The Valley",
    "doncaster rovers": "Eco-Power Stadium",
    "huddersfield town": "Accu Stadium",
    "leyton orient": "Gaughan Group Stadium",
    "lincoln city": "LNER Stadium",
    "luton town": "Kenilworth Road",
    "mansfield town": "One Call Stadium",
    "northampton town": "Sixfields Stadium",
    "peterborough united": "Weston Homes Stadium",
    "plymouth argyle": "Home Park",
    "reading": "Select Car Leasing Stadium",
    "stockport county": "Edgeley Park",
    "stevenage": "The Lamex Stadium",
    "wigan athletic": "The Brick Community Stadium",
    "wycombe wanderers": "Adams Park"
  };

  let fixtures = [];
  let manualMatches = [];
  let basket = [];
  let selectedLeague = "All";
  let editingId = null;
  let adminUnlocked = false;

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

  function money(amount) {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP"
    }).format(Number(amount) || 0);
  }

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function makeId() {
    return "th-" + Date.now() + "-" + Math.floor(Math.random() * 100000);
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

  function getFormValue(name) {
    return $("matchForm")?.querySelector(`[name="${name}"]`)?.value ?? "";
  }

  function setFormValue(name, value) {
    const field = $("matchForm")?.querySelector(`[name="${name}"]`);
    if (field) field.value = value ?? "";
  }

  function venueFor(home, suppliedVenue) {
    if (suppliedVenue && suppliedVenue !== "Venue to be confirmed") {
      return suppliedVenue;
    }

    return STADIUMS[String(home || "").toLowerCase().trim()]
      || "Venue to be confirmed";
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

  // FIXTURE LOADING

  async function loadFixtures() {
    const grid = $("matchGrid");

    if (grid) grid.innerHTML = "<p>Loading football fixtures...</p>";

    try {
      const response = await fetch("/api/fixtures");

      if (!response.ok) throw new Error("Fixture request failed");

      const data = await response.json();
      const list = Array.isArray(data) ? data : (data.matches || []);

      fixtures = list.map(match => {
        const competition = match.competition?.name || match.league || "";
        const lower = competition.toLowerCase();

        let league = competition;

        if (lower.includes("premier")) league = "Premier League";
        else if (lower.includes("championship")) league = "Championship";
        else if (lower.includes("league one")) league = "League One";

        const home = match.homeTeam?.name || match.home || "Home team";

        return {
          id: "fixture-" + match.id,
          home,
          away: match.awayTeam?.name || match.away || "Away team",
          league,
          date: match.utcDate || match.date || "",
          venue: venueFor(home, match.venue),
          source: "fixture"
        };
      });

      render();
    } catch (error) {
      console.error("Fixture loading error:", error);
      fixtures = [];
      render();
      notify("Fixtures could not be refreshed.");
    }
  }

  // LEAGUES

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
      filter.innerHTML =
        '<option value="All">All leagues</option>' +
        LEAGUES.map(league => `
          <option value="${safe(league)}">${safe(league)}</option>
        `).join("");

      filter.value = selectedLeague;
    }

    const adminLeague = $("adminLeague");

    if (adminLeague) {
      adminLeague.innerHTML = LEAGUES.map(league => `
        <option value="${safe(league)}">${safe(league)}</option>
      `).join("");
    }
  }

  // MATCH CARDS

  function renderMatches() {
    const grid = $("matchGrid");
    if (!grid) return;

    const search = ($("search")?.value || "").toLowerCase().trim();
    const sort = $("sort")?.value || "date";

    let matches = getAllMatches();

    if (selectedLeague !== "All") {
      matches = matches.filter(match => match.league === selectedLeague);
    }

    if (search) {
      matches = matches.filter(match =>
        `${match.home} ${match.away} ${match.league}`
          .toLowerCase().includes(search)
      );
    }

    matches.sort((a, b) => {
      if (sort === "price") {
        return Number(a.price || 0) - Number(b.price || 0);
      }

      return new Date(a.date || 0) - new Date(b.date || 0);
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
        <article class="match-card"
          data-match="${safe(match.id)}"
          tabindex="0"
          role="button"
          aria-label="View ${safe(match.home)} versus ${safe(match.away)}">

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
            <p>📍 ${safe(venueFor(match.home, match.venue))}</p>
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

  // MOBILE LAYOUT STYLES

  function addModalStyles() {
    if ($("th-modal-styles")) return;

    const style = document.createElement("style");
    style.id = "th-modal-styles";

    style.textContent = `
      .th-modal-backdrop {
        position:fixed !important;
        inset:0 !important;
        z-index:99999 !important;
        background:rgba(0,0,0,.78) !important;
        display:flex !important;
        align-items:center !important;
        justify-content:center !important;
        padding:12px !important;
        overflow-y:auto !important;
        box-sizing:border-box !important;
      }

      .th-modal {
        position:relative !important;
        background:#fff !important;
        color:#17202a !important;
        width:100% !important;
        max-width:560px !important;
        max-height:calc(100dvh - 24px) !important;
        overflow-y:auto !important;
        border-radius:14px !important;
        padding:22px !important;
        margin:auto !important;
        line-height:1.45 !important;
        box-sizing:border-box !important;
      }

      .th-modal * {
        box-sizing:border-box !important;
      }

      .th-modal-close {
        position:absolute !important;
        right:12px !important;
        top:8px !important;
        border:0 !important;
        background:transparent !important;
        font-size:30px !important;
        cursor:pointer !important;
      }

      .th-category-list {
        display:flex !important;
        flex-direction:column !important;
        gap:10px !important;
        width:100% !important;
        margin:12px 0 18px !important;
      }

      .th-category {
        display:flex !important;
        flex-direction:row !important;
        align-items:flex-start !important;
        gap:10px !important;
        width:100% !important;
        min-height:72px !important;
        height:auto !important;
        margin:0 !important;
        padding:13px !important;
        border:1px solid #cbd2d0 !important;
        border-radius:10px !important;
        background:#fff !important;
        cursor:pointer !important;
      }

      .th-category.selected {
        border:2px solid #176b45 !important;
        background:#f0faf4 !important;
      }

      .th-category input {
        display:block !important;
        width:18px !important;
        height:18px !important;
        margin:3px 0 0 !important;
      }

      .th-category-copy {
        display:block !important;
        min-width:0 !important;
        flex:1 !important;
      }

      .th-category-copy strong,
      .th-category-copy span {
        display:block !important;
        position:static !important;
      }

      .th-category-copy span {
        margin-top:3px !important;
        font-size:14px !important;
      }

      .th-quantity-row {
        display:flex !important;
        align-items:center !important;
        justify-content:space-between !important;
        gap:12px !important;
        margin:14px 0 !important;
      }

      .th-modal select {
        display:block !important;
        width:90px !important;
        min-height:42px !important;
        padding:8px !important;
        border:1px solid #aaa !important;
        border-radius:7px !important;
        background:white !important;
        color:#17202a !important;
      }

      .th-primary {
        display:block !important;
        width:100% !important;
        min-height:46px !important;
        border:0 !important;
        border-radius:8px !important;
        padding:12px !important;
        background:#142d24 !important;
        color:white !important;
        font-weight:bold !important;
        margin-top:14px !important;
        cursor:pointer !important;
      }

      .th-note {
        display:block !important;
        background:#fff5d9 !important;
        border-radius:8px !important;
        padding:12px !important;
        font-size:13px !important;
        margin-top:14px !important;
      }

      .th-cart-item {
        display:block !important;
        border-bottom:1px solid #ddd !important;
        padding:12px 0 !important;
      }

      @media(max-width:480px) {
        .th-modal {
          padding:18px 14px !important;
        }

        .th-category {
          min-height:76px !important;
          padding:12px !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // MATCH DETAILS

  function openMatch(matchId) {
    const match = getAllMatches().find(item =>
      String(item.id) === String(matchId)
    );

    if (!match) return;

    closeMatch();
    addModalStyles();

    const date = formatDate(match.date);
    const venue = venueFor(match.home, match.venue);

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
        <p>🏟️ ${safe(venue)}</p>

        <hr>

        <h3>Select a ticket category</h3>

        <div class="th-category-list">
          ${CATEGORIES.map((category, index) => `
            <label class="th-category ${index === 0 ? "selected" : ""}">
              <input type="radio"
                name="th-category"
                value="${category.name}"
                ${index === 0 ? "checked" : ""}>

              <span class="th-category-copy">
                <strong>${category.name}</strong>
                <span>${category.description}</span>
                <span><strong>${money(category.price)}</strong> per ticket</span>
              </span>
            </label>
          `).join("")}
        </div>

        <div class="th-quantity-row">
          <strong>Ticket quantity</strong>
          <select id="th-quantity">
            ${[1, 2, 3, 4, 5, 6].map(number => `
              <option value="${number}">${number}</option>
            `).join("")}
          </select>
        </div>

        <p id="th-total"><strong>Total: ${money(CATEGORIES[0].price)}</strong></p>

        <div class="th-note">
          Demonstration only. These categories and prices are not confirmed
          tickets, seats or availability. Ticket sales must only begin after
          authorised ticket supply is secured.
        </div>

        <button type="button" class="th-primary" id="th-add-basket">
          Add demonstration item to basket
        </button>
      </section>
    `;

    document.body.appendChild(backdrop);

    function chosenCategory() {
      const selected = backdrop.querySelector(
        'input[name="th-category"]:checked'
      )?.value;

      return CATEGORIES.find(category => category.name === selected)
        || CATEGORIES[0];
    }

    function updateTotal() {
      const category = chosenCategory();
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
      const category = chosenCategory();
      const quantity = Number($("th-quantity").value);

      basket.push({
        id: makeId(),
        matchId: match.id,
        name: `${match.home} vs ${match.away}`,
        category: category.name,
        price: category.price,
        quantity
      });

      saveData();
      renderBasket();
      closeMatch();

      notify("Demonstration item added to basket.");
    });

    backdrop.addEventListener("click", event => {
      if (
        event.target === backdrop ||
        event.target.closest(".th-modal-close")
      ) {
        closeMatch();
      }
    });
  }

  function closeMatch() {
    $("th-match-modal")?.remove();
  }

  // BASKET

  function renderBasket() {
    const count = $("cartCount");
    const items = $("cartItems");
    const total = $("cartTotal");

    const quantity = basket.reduce(
      (sum, item) => sum + item.quantity, 0
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

    const amount = basket.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );

    if (total) total.textContent = money(amount);
  }

  function removeFromBasket(id) {
    basket = basket.filter(item => item.id !== id);
    saveData();
    renderBasket();
    notify("Item removed from basket.");
  }

  // ADMIN PANEL - CORRECTED FOR YOUR INDEX.HTML

  function openAdmin() {
    if (!adminUnlocked) {
      const entered = window.prompt("Admin access code:");

      if (entered === null) return;

      if (entered !== ADMIN_ACCESS_CODE) {
        notify("Incorrect admin access code.");
        return;
      }

      adminUnlocked = true;
    }

    const panel = $("adminPanel");
    const backdrop = $("backdrop");

    if (panel) {
      panel.classList.remove("hidden");
      panel.classList.add("open");
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (backdrop) {
      backdrop.classList.remove("hidden");
      backdrop.classList.add("show");
    }

    renderAdmin();
  }

  function closeAdmin() {
    const pane
