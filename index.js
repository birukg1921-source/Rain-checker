import express from "express";
import bodyParser from "body-parser";
import axios from "axios";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.post("/check", async (req, res) => {
  const cityName = req.body.city;

  try {
    // 1. Get coordinates (latitude & longitude) for the city
    const geoResponse = await axios.get(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        cityName
      )}&count=1&language=en&format=json`
    );

    // Check if the city exists in the API results
    if (!geoResponse.data.results || geoResponse.data.results.length === 0) {
      return res.render("index.ejs", {
        error: `No city found matching "${cityName}". Please try again.`,
      });
    }

    const location = geoResponse.data.results[0];
    const lat = location.latitude;
    const lon = location.longitude;

    // 2. Get weather forecast using those coordinates
    const weatherResponse = await axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,precipitation_sum,precipitation_probability_max&timezone=auto`
    );

    const dailyData = weatherResponse.data.daily;

    // Index 1 is tomorrow's forecast (Index 0 is today)
    const rainVolume = dailyData.precipitation_sum[1] ?? 0;
    const rainChance = dailyData.precipitation_probability_max[1] ?? 0;
    const maxTemp = dailyData.temperature_2m_max[1] ?? "N/A";
    const tomorrowDate = dailyData.time[1];

    // Decide if it will rain (either measurable rain > 0mm or probability >= 50%)
    const willRain = rainVolume > 0 || rainChance >= 50;

    res.render("index.ejs", {
      weather: {
        city: location.name,
        country: location.country || "",
        date: tomorrowDate,
        willRain: willRain,
        rainVolume: rainVolume,
        rainChance: rainChance,
        maxTemp: maxTemp,
      },
    });
  } catch (error) {
    console.error("Failed to make request:", error.message);
    res.render("index.ejs", {
      error: "Failed to fetch weather data. Please try again.",
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});