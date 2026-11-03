const STORAGE_KEY = "tickethub_manual_matches";

let manualMatches = [];
let matches = [];
let loadingFixtures = false;

try {
  manualMatches = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (!Array.isArray(manualMatches)) manualMatches = [];
} catch {
  manualMatches = [];
}

const grid = document.getElementById("matchGrid");
const search = document.getElementById("search");
const leagueFilter = document.getElementById("leagueFilter");
const sort = document.getElementById("sort");
const chips = document.getElementById("leagueChips");

const leagues = ["Premier League", "Championship", "League One"];

const adminPanel = document.getElementById("adminPanel");
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("backdrop");

// Fixture update display
const fixturesStatus = document.createElement("div");
fixturesStatus.id = "fixturesStatus";
fixturesStatus.style.margin = "12px 0";
grid.parentNode.insertBefore(fixturesStatus, grid);

const refreshButton = document.createElement("button");
refreshButton.type = "button";
refreshButton.className = "secondary";
refreshButton.textContent = "↻ Refresh Matches";
refreshButton.style.margin = "10px 0";
fixturesStatus.appendChild(refreshButton);

const statusText = document.createElement("span");
statusText.style.marginLeft = "10px";
statusText.textContent = "Waiting for fixtures...";
fixturesStatus.appendChild(statusText);

// Helpers
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatDate(date) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Date to be confirmed";
  }

  return parsed.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function saveManualMatches() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(manualMatches));
  } catch (error) {
    console.error("Could not save manual matches:", error);
  }
}

// Match details popup
const detailsOverlay = document.createElement("div");
detailsOverlay.id = "matchDetailsOverlay";

Object.assign(detailsOverlay.style, {
  display: "none",
  position: "fixed",
  inset: "0",
  background: "rgba(0,0,0,0.85)",
  zIndex: "9999",
  padding: "20px",
  overflowY: "auto",
  alignItems: "center",
  justifyContent: "center"
});

const detailsPanel = document.createElement("div");

Object.assign(detailsPanel.style, {
  background: "#151c2b",
  color: "#ffffff",
  width: "100%",
  maxWidth: "520px",
  margin: "30px auto",
  padding: "25px",
  borderRadius: "14px",
  boxSizing: "border-box",
  position: "relative",
  border: "1px solid #34415a"
});

const detailsClose = document.createElement("button");
detailsClose.type = "button";
detailsClose.textContent = "✕ Close";

Object.assign(detailsClose.style, {
  display: "block",
  marginLeft: "auto",
  marginBottom: "20px",
  padding: "9px 14px",
  cursor: "pointer"
});

const detailsLeague = document.createElement("p");
detailsLeague.style.color = "#9db5ff";

const detailsTeams = document.createElement("h2");
detailsTeams.style.textAlign = "center";

const detailsDate = document.createElement("p");
const detailsVenue = document.createElement("p");
const detailsStatus = document.createElement("p");

const ticketHeading = document.createElement("h3");
ticketHeading.textContent = "Tickets";

const ticketMessage = document.createElement("p");
ticketMessage.textContent =
  "Ticket categories, prices and availability will be displayed here once authorised ticket inventory is configured.";

ticketMessage.style.lineHeight = "1.6";

const saleStatus = document.createElement("strong");
saleStatus.textContent = "Tickets not currently on sale.";
saleStatus.style.color = "#ffcf70";

detailsPanel.append(
  detailsClose,
  detailsLeague,
  detailsTeams,
  detailsDate,
  detailsVenue,
  detailsStatus,
  ticketHeading,
  ticketMessage,
  saleStatus
);

detailsOverlay.appendChild(detailsPanel);
document.body.appendChild(detailsOverlay);

function closeMatchDetails() {
  detailsOverlay.style.display = "none";
}

function showMatchDetails(match) {
  detailsLeague.textContent = match.league || "Football fixture";
  detailsTeams.textContent = `${match.home} vs ${match.away}`;
  detailsDate.textContent = "Kick-off: " + formatDate(match.date) + " UK time";
  detailsVenue.textContent =
    "Stadium: " + (match.venue || "Venue to be confirmed");
  detailsStatus.textContent =
    "Match status: " + (match.status || "Fixture");

  detailsOverlay.style.display = "flex";
}

detailsClose.addEventListener("click", closeMatchDetails);

detailsOverlay.addEventListener("click", event => {
  if (event.target === detailsOverlay) {
    closeMatchDetails();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeMatchDetails();
  }
});

// League filters
function updateLeagueControls() {
  const availableLeagues = [...new Set([
    ...leagues,
    ...matches.map(match => match.league).filter(Boolean)
  ])];

  const selected = leagueFilter.value || "All";

  leagueFilter.innerHTML =
    '<option value="All">All leagues</option>' +
    availableLeagues.map(name =>
      `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`
    ).join("");

  leagueFilter.value = availableLeagues.includes(selected)
    ? selected : "All";

  chips.innerHTML = availableLeagues.map(name =>
    `<button class="chip" type="button"
      data-league="${escapeHTML(name)}">${escapeHTML(name)}</button>`
  ).join("");
}

// Display matches
function renderMatches() {
  const query = search.value.toLowerCase().trim();
  const league = leagueFilter.value;

  let visible = matches.filter(match =>
    (match.home + " " + match.away).toLowerCase().includes(query) &&
    (league === "All" || match.league === league)
  );

  if (sort.value === "date") {
    visible.sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );
  } else {
    visible.sort((a, b) =>
      a.home.localeCompare(b.home)
    );
  }

  grid.innerHTML = visible.length
    ? visible.map(match => `
      <article class="match-card"
        data-match-id="${escapeHTML(match.id)}"
        role="button"
        tabindex="0"
        aria-label="View ${escapeHTML(match.home)} versus ${escapeHTML(match.away)}"
        style="cursor:pointer">

        <div class="match-top">
          <span>${escapeHTML(match.league)}</span>
          <span>${escapeHTML(match.status || "Fixture")}</span>
        </div>

        <div class="match-teams">
          <h3>${escapeHTML(match.home)}</h3>
          <span class="versus">VS</span>
          <h3>${escapeHTML(match.away)}</h3>
        </div>

        <div class="match-details">
          <p>📅 ${escapeHTML(formatDate(match.date))} UK time</p>
          <p>📍 ${escapeHTML(match.venue || "Venue to be confirmed")}</p>
        </div>

        <div class="match-bottom">
          <strong>Ticket availability to be confirmed</strong>
          <button class="secondary" type="button" disabled>
            Not on sale
          </button>
        </div>

        <p style="font-size:13px;opacity:0.8">
          Tap to view match details →
        </p>
      </article>
    `).join("")
    : "<p>No matches found. Try another search or refresh fixtures.</p>";
}

// Make match cards clickable
grid.addEventListener("click", event => {
  const card = event.target.closest(".match-card");
  if (!card) return;

  const match = matches.find(item =>
    String(item.id) === card.dataset.matchId
  );

  if (match) showMatchDetails(match);
});

grid.addEventListener("keydown", event => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const card = event.target.closest(".match-card");
  if (!card) return;

  event.preventDefault();

  const match = matches.find(item =>
    String(item.id) === card.dataset.matchId
  );

  if (match) showMatchDetails(match);
});

// Load live fixtures
async function loadFixtures() {
  if (loadingFixtures) return;

  loadingFixtures = true;
  refreshButton.disabled = true;
  refreshButton.textContent = "Loading...";
  statusText.textContent = "Updating football fixtures...";

  try {
    const response = await fetch("/api/fixtures", {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Fixture service returned " + response.status);
    }

    const data = await response.json();

    if (!Array.isArray(data.matches)) {
      throw new Error("Invalid fixture data");
    }

    matches = [
      ...data.matches.map(match => ({
        id: String(match.id),
        home: match.home,
        away: match.away,
        league: match.league,
        date: match.date,
        venue: match.venue,
        status: match.status
      })),
      ...manualMatches
    ];

    updateLeagueControls();
    renderMatches();

    statusText.textContent =
      `Last updated: ${new Date(data.updated || Date.now()).toLocaleTimeString()}. ${data.matches.length} fixtures received.`;

  } catch (error) {
    console.error("Fixture update error:", error);

    statusText.textContent =
      "Could not update fixtures. Please try again later.";

    if (!matches.length) {
      grid.innerHTML =
        "<p>Fixtures are temporarily unavailable. Please refresh.</p>";
    }

  } finally {
    loadingFixtures = false;
    refreshButton.disabled = false;
    refreshButton.textContent = "↻ Refresh Matches";
  }
}

// Search, filters and sorting
search.addEventListener("input", renderMatches);
leagueFilter.addEventListener("change", renderMatches);
sort.addEventListener("change", renderMatches);

chips.addEventListener("click", event => {
  const button = event.target.closest("[data-league]");
  if (!button) return;

  leagueFilter.value = button.dataset.league;
  renderMatches();

  document.getElementById("matches").scrollIntoView({
    behavior: "smooth"
  });
});

refreshButton.addEventListener("click", loadFixtures);

// Admin panel
document.getElementById("adminToggle").addEventListener("click", () => {
  adminPanel.classList.toggle("hidden");
});

document.getElementById("closeAdmin").addEventListener("click", () => {
  adminPanel.classList.add("hidden");
});

document.getElementById("adminLeague").innerHTML =
  leagues.map(name =>
    `<option value="${escapeHTML(name)}">${escapeHTML(name)}</option>`
  ).join("");

document.getElementById("matchForm").addEventListener("submit", event => {
  event.preventDefault();

  const form = new FormData(event.target);

  const newMatch = {
    id: "manual-" + Date.now(),
    home: form.get("home"),
    away: form.get("away"),
    league: form.get("league"),
    date: form.get("date"),
    venue: form.get("venue") || "Venue to be confirmed",
    status: "Manual listing"
  };

  manualMatches.push(newMatch);
  saveManualMatches();

  matches.push(newMatch);

  updateLeagueControls();
  renderMatches();

  event.target.reset();
  showToast("Manual match added and saved in this browser.");
});

// Notifications
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// Basket
function openBasket() {
  drawer.classList.add("open");
  backdrop.classList.remove("hidden");
}

function closeBasket() {
  drawer.classList.remove("open");
  backdrop.classList.add("hidden");
}

document.getElementById("cartOpen").addEventListener("click", openBasket);
document.getElementById("cartClose").addEventListener("click", closeBasket);
backdrop.addEventListener("click", closeBasket);

document.getElementById("checkout").addEventListener("click", () => {
  showToast(
    "Checkout will be enabled after authorised tickets and secure payment are configured."
  );
});

// Start website
updateLeagueControls();
loadFixtures();

// Refresh fixtures every 30 minutes
setInterval(loadFixtures, 30 * 60 * 1000);
     
