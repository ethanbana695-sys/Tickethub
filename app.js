const manualMatches = [];
let matches = [];
let loadingFixtures = false;

const grid = document.getElementById("matchGrid");
const search = document.getElementById("search");
const leagueFilter = document.getElementById("leagueFilter");
const sort = document.getElementById("sort");
const chips = document.getElementById("leagueChips");

const leagues = ["Premier League", "Championship", "League One"];

const adminPanel = document.getElementById("adminPanel");
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("backdrop");

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
  return new Date(date).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function updateLeagueControls() {
  const availableLeagues = [...new Set([
    ...leagues,
    ...matches.map(match => match.league)
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

function renderMatches() {
  const query = search.value.toLowerCase();
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
          <button class="secondary" disabled>Not on sale</button>
        </div>
      </article>
    `).join("")
    : "<p>No matches found. Try another search or refresh fixtures.</p>";
}

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
        id: match.id,
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

// Search and filters
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
    `<option value="${name}">${name}</option>`
  ).join("");

document.getElementById("matchForm").addEventListener("submit", event => {
  event.preventDefault();

  const form = new FormData(event.target);

  manualMatches.push({
    home: form.get("home"),
    away: form.get("away"),
    league: form.get("league"),
    date: form.get("date"),
    venue: form.get("venue") || "Venue to be confirmed",
    status: "Manual listing"
  });

  matches.push(manualMatches[manualMatches.length - 1]);

  updateLeagueControls();
  renderMatches();

  event.target.reset();
  showToast("Manual match added in this browser.");
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
  showToast("Checkout will be enabled after authorised tickets are configured.");
});

// Initial fixtures and automatic refresh
updateLeagueControls();
loadFixtures();

setInterval(loadFixtures, 30 * 60 * 1000);
