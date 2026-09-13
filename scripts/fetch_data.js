const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-01F5888E9D57';
const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let sessionToken = null;

async function login() {
  console.log('Logging in...');
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY 
    },
    body: JSON.stringify({ email: "demo1@ivy.homes", password: "bcd04974aa" })
  });
  
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Login failed: ${res.status} - ${errorBody}`);
  }
  
  const data = await res.json();
  console.log('Login response:', data);
  sessionToken = data.token || data.access_token;
  console.log('Logged in successfully! Token:', sessionToken);
}

async function fetchAllPages(endpoint) {
  let allResults = [];
  let page = 1;
  const limit = 50; 
  let hasMore = true;
  let totalReported = 0;

  console.log(`Starting to fetch ${endpoint}...`);

  while (hasMore) {
    const offset = (page - 1) * limit;
    const url = `${BASE_URL}${endpoint}?offset=${offset}&limit=${limit}`;
    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': API_KEY,
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorBody} for URL: ${url}`);
      }
      
      const data = await response.json();
      
      if (!data.results || !Array.isArray(data.results)) {
        console.error(`Unexpected response format for ${url}`, data);
        break;
      }

      allResults = allResults.concat(data.results);
      totalReported = data.total || 0;

      console.log(`Fetched page ${page} from ${endpoint}. Got ${data.results.length} items. Total so far: ${allResults.length} / ${totalReported}`);

      if (data.results.length === 0) {
        hasMore = false;
      } else {
        page++;
      }
    } catch (error) {
      console.error(`Error fetching ${endpoint} on page ${page}:`, error);
      hasMore = false;
    }
  }

  return { results: allResults, totalReported };
}

async function main() {
  try {
    await login();
  } catch (err) {
    console.error(err);
    return;
  }

  const endpoints = ['/v1/listings', '/v1/rentals', '/v1/projects'];

  for (const endpoint of endpoints) {
    const { results, totalReported } = await fetchAllPages(endpoint);
    
    const filename = endpoint.replace('/v1/', '') + '.json';
    const filepath = path.join(DATA_DIR, filename);
    
    const outputData = {
      endpoint,
      total_reported_by_api: totalReported,
      actual_records_fetched: results.length,
      timestamp: new Date().toISOString(),
      data: results
    };

    fs.writeFileSync(filepath, JSON.stringify(outputData, null, 2));
    console.log(`✅ Saved ${results.length} records to ${filepath}\n`);
  }
}

main();
