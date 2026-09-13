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

async function testSort() {
  const token = await login();
  
  // Test sort by price desc
  const res = await fetch(`${BASE_URL}/v1/listings?sort_by=price&order=desc&limit=50`, {
    headers: { 'X-API-Key': API_KEY, 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  
  const prices = data.results.map(l => l.price);
  let isSorted = true;
  for (let i = 1; i < prices.length; i++) {
    if (prices[i] > prices[i-1]) {
      isSorted = false;
      break;
    }
  }
  
  console.log("Did sort_by=price&order=desc work?", isSorted);
  if (!isSorted) {
    console.log("First 10 prices:", prices.slice(0, 10));
  }
}

testSort();
