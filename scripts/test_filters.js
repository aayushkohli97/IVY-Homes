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

async function testFilter() {
  const token = await login();
  
  // Test bedroom filter
  const res = await fetch(`${BASE_URL}/v1/listings?bhk=2&limit=50`, {
    headers: { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  
  const allBhk2 = data.results.every(l => l.bedroom === 2);
  console.log("Did bhk=2 filter work?", allBhk2);
  if (!allBhk2) {
    console.log("Bedrooms in results:", data.results.map(l => l.bedroom).slice(0, 10));
  }

  // Test min_price filter
  const res2 = await fetch(`${BASE_URL}/v1/listings?min_price=10000000&limit=50`, {
    headers: { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${token}` }
  });
  const data2 = await res2.json();
  const allPrice = data2.results.every(l => l.price >= 10000000);
  console.log("Did min_price=10000000 filter work?", allPrice);
  if (!allPrice) {
    console.log("Prices in results:", data2.results.map(l => l.price).slice(0, 10));
  }
}

testFilter();
