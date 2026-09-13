const fs = require('fs');

const BASE_URL = 'https://solve.ivy.homes';
const API_KEY = 'IVY26-01F5888E9D57';

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY 
    },
    body: JSON.stringify({ email: "demo1@ivy.homes", password: "bcd04974aa" })
  });
  const data = await res.json();
  return data.access_token || data.token;
}

async function test() {
  const token = await login();

  const fetchPage = async (page) => {
    const res = await fetch(`${BASE_URL}/v1/listings?page=${page}&limit=50`, {
      headers: {
        'X-API-Key': API_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    return res.json();
  };

  const page1 = await fetchPage(1);
  const p1Keys = {...page1};
  delete p1Keys.results;
  console.log("Page 1 Metadata:", p1Keys);
  const page2 = await fetchPage(2);

  const p1Ids = page1.results.map(r => r.listing_id);
  const p2Ids = page2.results.map(r => r.listing_id);

  console.log("Page 1 first 5 IDs:", p1Ids.slice(0, 5));
  console.log("Page 2 first 5 IDs:", p2Ids.slice(0, 5));
  
  if (JSON.stringify(p1Ids) === JSON.stringify(p2Ids)) {
    console.log("❌ Pagination is broken! Page 1 and Page 2 return the exact same results.");
  } else {
    console.log("✅ Pagination works.");
  }
}

test();
