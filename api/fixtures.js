export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const API_KEY = process.env.FOOTBALL_DATA_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({
      error: "Football API key is not configured"
    });
  }

  try {
    const today = new Date();
    const dateFrom = today.toISOString().slice(0, 10);

    const future = new Date(today);
    future.setDate(future.getDate() + 30);
    const dateTo = future.toISOString().slice(0, 10);

    const response = await fetch(
      `https://api.football-data.org/v4/matches?dateFrom=${dateFrom}&dateTo=${dateTo}&competitions=PL,ELC,EL1`,
      {
        headers: {
          "X-Auth-Token": API_KEY
        }
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Unable to retrieve fixtures"
      });
    }

    const data = await response.json();

    const matches = (data.matches || []).map(match => ({
      id: match.id,
      home: match.homeTeam.name,
      away: match.awayTeam.name,
      league: match.competition.name,
      date: match.utcDate,
      venue: match.venue || "Venue to be confirmed",
      status: match.status
    }));

    return res.status(200).json({
      updated: new Date().toISOString(),
      matches
    });

  } catch (error) {
    return res.status(500).json({
      error: "Fixture service temporarily unavailable"
    });
  }
}
