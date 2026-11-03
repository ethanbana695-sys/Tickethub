
const matches = [
  // Premier League
  { home: "Everton", away: "Coventry City", league: "Premier League", date: "2026-11-06T20:00", venue: "Hill Dickinson Stadium" },
  { home: "Leeds United", away: "Tottenham Hotspur", league: "Premier League", date: "2026-11-07T12:30", venue: "Elland Road" },
  { home: "Arsenal", away: "Hull City", league: "Premier League", date: "2026-11-07T15:00", venue: "Emirates Stadium" },
  { home: "Fulham", away: "Newcastle United", league: "Premier League", date: "2026-11-07T15:00", venue: "Craven Cottage" },
  { home: "Nottingham Forest", away: "Manchester City", league: "Premier League", date: "2026-11-07T17:30", venue: "City Ground" },

  // Championship
  { home: "Cardiff City", away: "West Ham United", league: "Championship", date: "2026-11-04T19:45", venue: "Cardiff City Stadium" },
  { home: "Wrexham", away: "Middlesbrough", league: "Championship", date: "2026-11-04T19:45", venue: "Racecourse Ground" },
  { home: "Bristol City", away: "Wolverhampton Wanderers", league: "Championship", date: "2026-11-04T20:00", venue: "Ashton Gate" },
  { home: "Derby County", away: "Bolton Wanderers", league: "Championship", date: "2026-11-06T20:00", venue: "Pride Park" },
  { home: "Bristol City", away: "Norwich City", league: "Championship", date: "2026-11-07T15:00", venue: "Ashton Gate" },
  { home: "Portsmouth", away: "Stoke City", league: "Championship", date: "2026-11-07T15:00", venue: "Fratton Park" },

  // League One
  { home: "Oxford United", away: "Reading", league: "League One", date: "2026-11-04T19:45", venue: "Kassam Stadium" },
  { home: "Leicester City", away: "Bradford City", league: "League One", date: "2026-11-14T15:00", venue: "King Power Stadium" },
  { home: "Sheffield Wednesday", away: "Plymouth Argyle", league: "League One", date: "2026-11-14T15:00", venue: "Hillsborough" },
  { home: "Wycombe Wanderers", away: "Huddersfield Town", league: "League One", date: "2026-11-14T15:00", venue: "Adams Park" }
];

const grid = document.getElementById("matchGrid");
const search = document.getElementById("search");
const leagueFilter = document.getElementById("leagueFilter");
const sort = document.getElementById("sort");
const chips = document.getElementById("leagueChips");
function formatDate(date) {
  const [day, time] = date.split("T");
  const [year, month, dateNumber] = day.split("-");
  const [hour, minute] = time.split(":");

  const weekday = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(dateNumber)
  )).toLocaleDateString("en-GB", {
    weekday: "short",
    timeZone: "UTC"
  });

  const monthName = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(dateNumber)
  )).toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC"
  });

  return `${weekday} ${Number(dateNumber)} ${monthName}, ${hour}:${minute} UK time`;
}

  });
}

function renderMatches() {
  const query = search.value.toLowerCase();
  const league = leagueFilter.value;

  let visible = matches.filter(match =>
    (match.home + " " + match.away).toLowerCase().includes(query) &&
    (league === "All" || match.league === league)
  );

  if (sort.value === "date") {
    visible.sort((a, b) => new Date(a.date) - new Date(b.date));
  } else {
    visible.sort((a, b) => a.home.localeCompare(b.home));
  }

  grid.innerHTML = visible.length ? visible.map(match => `
    <article class="match-card">
      <div class="match-top">
        <span>${match.league}</span>
        <span>Fixture</span>
      </div>
      <div class="match-teams">
        <h3>${match.home}</h3>
        <span class="versus">VS</span>
        <h3>${match.away}</h3>
      </div>
      <div class="match-details">
        <p>📅 ${formatDate(match.date)} UK time</p>
        <p>📍 ${match.venue}</p>
      </div>
      <div class="match-bottom">
        <strong>Ticket availability to be confirmed</strong>
        <button class="secondary" disabled>Not on sale</button>
      </div>
    </article>
  `).join("") : "<p>No matches found. Try another search.</p>";
}

const leagues = ["Premier League", "Championship", "League One"];

leagueFilter.innerHTML = '<option value="All">All leagues</option>' +
  leagues.map(name => `<option value="${name}">${name}</option>`).join("");

chips.innerHTML = leagues.map(name =>
  `<button class="chip" type="button" data-league="${name}">${name}</button>`
).join("");

chips.addEventListener("click", event => {
  const button = event.target.closest("[data-league]");
  if (!button) return;
  leagueFilter.value = button.dataset.league;
  renderMatches();
  document.getElementById("matches").scrollIntoView({ behavior: "smooth" });
});

search.addEventListener("input", renderMatches);
leagueFilter.addEventListener("change", renderMatches);
sort.addEventListener("change", renderMatches);

// Admin panel
const adminPanel = document.getElementById("adminPanel");

document.getElementById("adminToggle").addEventListener("click", () => {
  adminPanel.classList.toggle("hidden");
});

document.getElementById("closeAdmin").addEventListener("click", () => {
  adminPanel.classList.add("hidden");
});

document.getElementById("adminLeague").innerHTML = leagues.map(name =>
  `<option value="${name}">${name}</option>`
).join("");

document.getElementById("matchForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.target);

  matches.push({
    home: form.get("home"),
    away: form.get("away"),
    league: form.get("league"),
    date: form.get("date"),
    venue: form.get("venue") || "Venue to be confirmed"
  });

  event.target.reset();
  renderMatches();
  showToast("Match listing added in this browser.");
});

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// Basket drawer
const drawer = document.getElementById("drawer");
const backdrop = document.getElementById("backdrop");

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
  showToast("Checkout is not available until authorised tickets are added.");
});

renderMatches();
