const fs = require('fs');
const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-01F5888E9D57';

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ email: "demo1@ivy.homes", password: "bcd04974aa" })
  });
  const data = await res.json();
  return data.access_token || data.token;
}

async function testEndpoint() {
  const token = await login();
  
  // Test /v1/listings/{id}/similar
  const id = 'MAG-2001953';
  const res = await fetch(`${BASE_URL}/v1/listings/${id}/similar`, {
    headers: { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${token}` }
  });
  console.log("Status for /similar:", res.status);

  // Test /v1/listing/{listing_id} (docs say /v1/listing, not /v1/listings)
  const res2 = await fetch(`${BASE_URL}/v1/listing/${id}`, {
    headers: { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${token}` }
  });
  console.log("Status for /v1/listing/{id}:", res2.status);
  
  // Test /v1/listings/{listing_id} (just in case docs have a typo)
  const res3 = await fetch(`${BASE_URL}/v1/listings/${id}`, {
    headers: { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${token}` }
  });
  console.log("Status for /v1/listings/{id}:", res3.status);

  // Test /v1/analytics/summary
  const res4 = await fetch(`${BASE_URL}/v1/analytics/summary`, {
    headers: { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${token}` }
  });
  console.log("Status for /v1/analytics/summary:", res4.status);
}

testEndpoint();
