const USER_NAME = "Cristian";
// Used when the visitor's location isn't available
const DEFAULT_LOCATION = { name: "Boca Raton", lat: 26.3683, lon: -80.1289 };

let location_ = DEFAULT_LOCATION;
let unit = "fahrenheit";
try { unit = localStorage.getItem("unit") || unit; } catch {}

// WMO weather codes used by Open-Meteo
const REFRESH_MS = 10 * 60 * 1000;
let lastLoaded = 0;

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

// Show a moon instead of the sun for clear or partly cloudy nights
const icon = (code, isDay) =>
  isDay || code > 2 ? weather(code)[1] : code === 2 ? "☁️" : "🌙";
const $ = (id) => document.getElementById(id);

async function loadWeather(place) {
  location_ = place;
  const { name, lat, lon } = place;
  const windUnit = unit === "celsius" ? "kmh" : "mph";
  $("error").hidden = true;
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day" +
    "&hourly=temperature_2m,weather_code,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min" +
    `&temperature_unit=${unit}&wind_speed_unit=${windUnit}&timezone=auto&forecast_days=7`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Weather request failed");
    render(name, await res.json());
    lastLoaded = Date.now();
  } catch (err) {
    showError("Couldn't load weather. Please try again.");
  }
}

function render(name, data) {
  const { current, hourly, daily } = data;
  const [desc] = weather(current.weather_code);

  renderScene(current.weather_code, current.is_day === 1);
  $("city").textContent = name;
  $("temp").textContent = `${Math.round(current.temperature_2m)}°`;
  $("desc").textContent = desc;
  $("hilo").textContent =
    `H:${Math.round(daily.temperature_2m_max[0])}°  L:${Math.round(daily.temperature_2m_min[0])}°`;
  $("feels").textContent = `${Math.round(current.apparent_temperature)}°`;
  $("humidity").textContent = `${current.relative_humidity_2m}%`;
  $("wind").textContent = `${Math.round(current.wind_speed_10m)} ${unit === "celsius" ? "km/h" : "mph"}`;

  // Next 24 hours starting from the current hour in the city's time zone
  const nowHour = new Date(Date.now() + data.utc_offset_seconds * 1000).toISOString().slice(0, 13);
  const start = Math.max(0, hourly.time.findIndex((t) => t.slice(0, 13) === nowHour));
  $("hourly").innerHTML = hourly.time
    .slice(start, start + 24)
    .map((t, i) => {
      const idx = start + i;
      // "Now" uses the live reading so it matches the card above
      const isNow = i === 0;
      const code = isNow ? current.weather_code : hourly.weather_code[idx];
      const isDay = (isNow ? current.is_day : hourly.is_day[idx]) === 1;
      const temp = isNow ? current.temperature_2m : hourly.temperature_2m[idx];
      const hour = isNow ? "Now" : new Date(t).toLocaleTimeString([], { hour: "numeric" });
      return `<div class="hour">
        <span>${hour}</span>
        <span class="icon">${icon(code, isDay)}</span>
        <strong>${Math.round(temp)}°</strong>
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

// Picks a background scene for the current conditions card
function sceneType(code) {
  if (code <= 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}

function scatter(className, count, extraStyle = () => "") {
  return Array.from({ length: count }, () =>
    `<span class="${className}" style="left:${Math.random() * 100}%;` +
    `animation-delay:-${(Math.random() * 5).toFixed(2)}s;${extraStyle()}"></span>`
  ).join("");
}

function clouds(count) {
  return Array.from({ length: count }, (_, i) =>
    // Alternate clouds between the left and right edges so the text stays readable
    `<span class="cloud" style="top:${[6, 14, 62, 70][i]}%;left:${i % 2 ? 72 : -6}%;` +
    `--scale:${(0.7 + Math.random() * 0.6).toFixed(2)};animation-duration:${30 + i * 8}s"></span>`
  ).join("");
}

function renderScene(code, isDay) {
  const type = sceneType(code);
  let html = "";

  if (type === "clear" || type === "partly") {
    html += isDay ? '<span class="sun"></span>' : '<span class="moon"></span>';
    if (!isDay) html += scatter("star", 40, () => `top:${Math.random() * 100}%`);
  }
  if (type !== "clear" && type !== "fog") html += clouds(type === "partly" ? 2 : 4);
  if (type === "rain" || type === "storm") html += scatter("drop", 50);
  if (type === "snow") html += scatter("flake", 35);
  if (type === "storm") html += '<span class="flash"></span>';
  if (type === "fog") html += '<span class="mist"></span><span class="mist mist-2"></span>';

  $("scene").className = `scene ${type} ${isDay ? "day" : "night"}`;
  $("scene").innerHTML = html;
}

// Turns coordinates into a city name (Open-Meteo has no reverse geocoding)
async function placeName(lat, lon) {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || "My Location";
  } catch {
    return "My Location";
  }
}

// Approximate location from the visitor's IP address (no permission needed)
async function locateFromIp() {
  try {
    const res = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en");
    const data = await res.json();
    if (typeof data.latitude !== "number") throw new Error("No IP location");
    const name = data.city || data.locality || data.principalSubdivision || "My Location";
    loadWeather({ name, lat: data.latitude, lon: data.longitude });
  } catch {
    loadWeather(DEFAULT_LOCATION);
  }
}

// Loads weather for the visitor's location: precise browser location first,
// then IP-based location, then Boca Raton
function locateUser() {
  $("city").textContent = "Locating…";
  if (!navigator.geolocation) return locateFromIp();
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      const lat = coords.latitude;
      const lon = coords.longitude;
      loadWeather({ name: await placeName(lat, lon), lat, lon });
    },
    (err) => {
      console.warn("Browser location unavailable:", err.message);
      locateFromIp();
    },
    { timeout: 10000, maximumAge: 10 * 60 * 1000 }
  );
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

$("locate").addEventListener("click", () => {
  $("query").value = "";
  locateUser();
});

function greet() {
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  $("greeting").textContent = `${part}, ${USER_NAME}`;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem("theme", theme); } catch {}
  document.querySelectorAll("[data-theme-option]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.themeOption === theme);
  });
}

document.querySelectorAll("[data-theme-option]").forEach((btn) => {
  btn.addEventListener("click", () => setTheme(btn.dataset.themeOption));
});

function setUnit(newUnit) {
  unit = newUnit;
  try { localStorage.setItem("unit", unit); } catch {}
  document.querySelectorAll("[data-unit-option]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.unitOption === unit);
  });
}

document.querySelectorAll("[data-unit-option]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (btn.dataset.unitOption === unit) return;
    setUnit(btn.dataset.unitOption);
    loadWeather(location_);
  });
});

setTheme(document.documentElement.dataset.theme);
setUnit(unit);
function refresh() {
  greet();
  loadWeather(location_);
}

// Keep the forecast current while the tab stays open or comes back into view
setInterval(refresh, REFRESH_MS);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && Date.now() - lastLoaded > REFRESH_MS / 2) refresh();
});

greet();
locateUser();
