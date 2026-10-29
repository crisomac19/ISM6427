const DEFAULT_LOCATION = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

// WMO weather codes used by Open-Meteo
const WEATHER = {
  0: ["Clear", "☀️"],
  1: ["Mostly Clear", "🌤️"],
  2: ["Partly Cloudy", "⛅"],
  3: ["Cloudy", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Fog", "🌫️"],
  51: ["Light Drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy Drizzle", "🌧️"],
  61: ["Light Rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy Rain", "🌧️"],
  71: ["Light Snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy Snow", "❄️"],
  80: ["Showers", "🌦️"],
  81: ["Showers", "🌧️"],
  82: ["Heavy Showers", "⛈️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm", "⛈️"],
  99: ["Thunderstorm", "⛈️"],
};

const weather = (code) => WEATHER[code] || ["Unknown", "🌡️"];
const $ = (id) => document.getElementById(id);

async function loadWeather({ name, lat, lon }) {
  $("error").hidden = true;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
    "&hourly=temperature_2m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7";

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather request failed");
    render(name, await res.json());
  } catch (err) {
    showError("Couldn't load weather. Please try again.");
  }
}

function render(name, data) {
  const { current, hourly, daily } = data;
  const [desc] = weather(current.weather_code);

  $("city").textContent = name;
  $("temp").textContent = `${Math.round(current.temperature_2m)}°`;
  $("desc").textContent = desc;
  $("hilo").textContent =
    `H:${Math.round(daily.temperature_2m_max[0])}°  L:${Math.round(daily.temperature_2m_min[0])}°`;
  $("feels").textContent = `${Math.round(current.apparent_temperature)}°`;
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(current.wind_speed_10m)} mph`;

  // Next 24 hours starting from the current hour
  const start = hourly.time.findIndex((t) => t >= current.time.slice(0, 13));
  $("hourly").innerHTML = hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const idx = start + i;
      const hour = i === 0 ? "Now" : new Date(t).toLocaleTimeString([], { hour: "numeric" });
      return `<div class="hour">
        <span>${hour}</span>
        <span class="icon">${weather(hourly.weather_code[idx])[1]}</span>
        <strong>${Math.round(hourly.temperature_2m[idx])}°</strong>
      </div>`;
    })
    .join("");

  $("daily").innerHTML = daily.time
    .map((d, i) => {
      const day = i === 0 ? "Today" : new Date(d + "T00:00").toLocaleDateString([], { weekday: "short" });
      return `<li>
        <span>${day}</span>
        <span class="icon">${weather(daily.weather_code[i])[1]}</span>
        <span class="range">${Math.round(daily.temperature_2m_max[i])}°<span class="lo">${Math.round(daily.temperature_2m_min[i])}°</span></span>
      </li>`;
    })
    .join("");
}

async function searchCity(query) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results?.length) return showError(`No results for "${query}".`);
    const { name, latitude, longitude } = data.results[0];
    loadWeather({ name, lat: latitude, lon: longitude });
  } catch {
    showError("Search failed. Please try again.");
  }
}

function showError(msg) {
  $("error").textContent = msg;
  $("error").hidden = false;
}

$("search").addEventListener("submit", (e) => {
  e.preventDefault();
  const query = $("query").value.trim();
  if (query) searchCity(query);
});

loadWeather(DEFAULT_LOCATION);
