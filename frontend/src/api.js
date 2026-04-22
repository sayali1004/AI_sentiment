/* API client — all calls proxy through Vite to FastAPI on :8000 */

const BASE = '/api'

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json()
}

function buildParams(base, extras = {}) {
  const p = new URLSearchParams(base)
  for (const [k, v] of Object.entries(extras)) {
    if (Array.isArray(v)) v.forEach(item => p.append(k, item))
    else if (v !== null && v !== undefined && v !== '') p.set(k, v)
  }
  return p.toString()
}

export async function getSentimentByCountry(startDate, endDate, orgFilter = []) {
  const q = buildParams({ start_date: startDate, end_date: endDate }, { org_filter: orgFilter })
  return fetchJSON(`${BASE}/sentiment/country?${q}`)
}

export async function getSentimentByUsState(startDate, endDate, orgFilter = []) {
  const q = buildParams({ start_date: startDate, end_date: endDate }, { org_filter: orgFilter })
  return fetchJSON(`${BASE}/sentiment/us-state?${q}`)
}

export async function getSentimentTimeseries(startDate, endDate, orgFilter = []) {
  const q = buildParams({ start_date: startDate, end_date: endDate }, { org_filter: orgFilter })
  return fetchJSON(`${BASE}/sentiment/timeseries?${q}`)
}

export async function getTimeseriesPerOrg(startDate, endDate, orgList = []) {
  const q = buildParams({ start_date: startDate, end_date: endDate }, { org_list: orgList })
  return fetchJSON(`${BASE}/sentiment/timeseries-per-org?${q}`)
}

export async function getSentimentByOrg(startDate, endDate, orgList = []) {
  const q = buildParams({ start_date: startDate, end_date: endDate }, { org_list: orgList })
  return fetchJSON(`${BASE}/sentiment/by-org?${q}`)
}

export async function getTimeseriesByCountry(startDate, endDate, countryCode, orgFilter = []) {
  const q = buildParams(
    { start_date: startDate, end_date: endDate, country_code: countryCode },
    { org_filter: orgFilter }
  )
  return fetchJSON(`${BASE}/sentiment/timeseries-by-country?${q}`)
}

export async function getTimeseriesPerOrgByCountry(startDate, endDate, countryCode, orgList = []) {
  const q = buildParams(
    { start_date: startDate, end_date: endDate, country_code: countryCode },
    { org_list: orgList }
  )
  return fetchJSON(`${BASE}/sentiment/timeseries-per-org-by-country?${q}`)
}

export async function postChat(userMessage, history = []) {
  const res = await fetch(`${BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_message: userMessage, history }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
