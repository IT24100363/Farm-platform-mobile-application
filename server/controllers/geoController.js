const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const GEO_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'FarmerCustomerPlatform/1.0'
};

const fetchJson = async (url) => {
  const response = await fetch(url, { headers: GEO_HEADERS });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(body || 'Geocoding request failed');
  }
  return response.json();
};

export const searchLocations = async (req, res, next) => {
  try {
    const query = String(req.query.q || '').trim();
    if (!query) return res.json([]);

    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 10);
    const url = `${NOMINATIM_BASE}/search?format=jsonv2&addressdetails=1&limit=${limit}&q=${encodeURIComponent(query)}`;
    const results = await fetchJson(url);
    res.json(results);
  } catch (err) {
    next(err);
  }
};

export const reverseLocation = async (req, res, next) => {
  try {
    const latitude = Number(req.query.lat);
    const longitude = Number(req.query.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return res.status(400).json({ message: 'Valid lat and lon are required' });
    }

    const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`;
    const result = await fetchJson(url);
    res.json(result);
  } catch (err) {
    next(err);
  }
};
