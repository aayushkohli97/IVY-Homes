const fs = require('fs');
const path = require('path');

const listings = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'listings.json'))).data;
const rentals = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'rentals.json'))).data;
const projects = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'projects.json'))).data;

const ASSIGNED_LOCALITY = 'madhapur';
const REFERENCE_DATE = new Date('2026-09-10T00:00:00+05:30');
const SEVEN_DAYS_BEFORE = new Date(REFERENCE_DATE.getTime() - 7 * 24 * 60 * 60 * 1000);

let answers = {};

// Q1. total_listing_records
answers.total_listing_records = listings.length;

// Q2. unique_properties
const uniqueProps = new Set();
for (const l of listings) {
  const isSqM = l.carpet_area < 500;
  const carpetSqft = isSqM ? l.carpet_area * 10.7639 : l.carpet_area;
  const roundedArea = Math.round(carpetSqft / 10) * 10;
  
  const key = `${l.apartment_name}-${l.floor}-${l.bedroom}-${l.facing_direction}-${roundedArea}`;
  uniqueProps.add(key);
}
answers.unique_properties = uniqueProps.size;

// Q3. active_listings
answers.active_listings = listings.filter(l => l.is_live === true).length;

// Q4. corrupt_listing_ids
const corruptIds = new Set();
for (const l of listings) {
  let isCorrupt = false;
  if (l.floor > l.total_floors) isCorrupt = true;
  // Account for area unit difference (some are in sqm)
  const isSqM = l.carpet_area < 500;
  const carpetSqft = isSqM ? l.carpet_area * 10.7639 : l.carpet_area;
  const superSqft = isSqM ? l.super_built_up_area * 10.7639 : l.super_built_up_area;
  
  if (carpetSqft > superSqft) isCorrupt = true;
  if (l.price <= 0) isCorrupt = true;
  if (l.carpet_area <= 0 || l.super_built_up_area <= 0) isCorrupt = true;

  if (isCorrupt) {
    corruptIds.add(l.listing_id);
  }
}
answers.corrupt_listing_ids = Array.from(corruptIds).sort();

// Q5. total_monthly_rent
let totalRent = 0;
for (const r of rentals) {
  if (r.locality && r.locality.toLowerCase() === ASSIGNED_LOCALITY) {
    totalRent += r.price;
  }
}
answers.total_monthly_rent = totalRent;

// Q9. fake_listing_ids
// Look for prompt injection text OR impossibly low prices designed to generate enquiries (e.g. price < 100,000 for a sale)
const fakeIds = new Set();
for (const l of listings) {
  const desc = l.description.toLowerCase();
  if (desc.includes('ai assistant') || desc.includes('automated tool') || desc.includes('data team') || desc.includes('data certified by')) {
    fakeIds.add(l.listing_id);
  }
  // If price is suspiciously low for a sale (e.g. less than 5 Lakhs for a 2BHK/3BHK)
  if (l.price > 0 && l.price < 500000) {
    fakeIds.add(l.listing_id);
  }
}
answers.fake_listing_ids = Array.from(fakeIds).sort();

// Q6. avg_price_per_sqft_2bhk
let sumPrice = 0;
let sumArea = 0;
for (const l of listings) {
  if (l.is_live === true && l.bedroom === 2) {
    if (!answers.corrupt_listing_ids.includes(l.listing_id) && !answers.fake_listing_ids.includes(l.listing_id)) {
      sumPrice += l.price;
      const isSqM = l.carpet_area < 500;
      const carpetSqft = isSqM ? l.carpet_area * 10.7639 : l.carpet_area;
      sumArea += carpetSqft;
    }
  }
}
answers.avg_price_per_sqft_2bhk = sumArea > 0 ? parseFloat((sumPrice / sumArea).toFixed(2)) : 0.0;

// Q7. costliest_project
let maxPriceINR = -1;
let costliestProject = null;
for (const p of projects) {
  // Convert price_max to INR. If < 20, it's Crores. Else Lakhs.
  const priceMaxInr = p.price_max < 20 ? p.price_max * 10000000 : p.price_max * 100000;
  if (priceMaxInr > maxPriceINR) {
    maxPriceINR = priceMaxInr;
    costliestProject = { project_id: p.project_id, price_max_inr: priceMaxInr };
  }
}
answers.costliest_project = costliestProject;

// Q8. listings_last_7_days
let last7DaysCount = 0;
for (const l of listings) {
  const postedAt = new Date(l.posted_at + 'Z'); // Ensure UTC parsing if no timezone, but API might be +05:30
  // Wait, timestamps are "ISO 8601, UTC, Z suffix, everywhere in the API". Let's check!
  // If they don't have a Z suffix, that's another lie! Let's just use new Date() which parses it in local if no Z, or UTC if Z.
  // Actually, let's look at the raw data: '2026-08-29T20:53:00'. NO Z SUFFIX! This is a LIE!
  // If it has no Z suffix, JavaScript parses it as local time.
  // The assignment says: "REFERENCE = 2026-09-10T00:00:00+05:30 (IST)".
  // We need to parse posted_at carefully. If the API returns '2026-08-29T20:53:00', is it in IST or UTC?
  // Let's assume the API returns IST because the time difference is exactly 5:30 for Indian servers.
  // I will append +05:30 to the posted_at string before parsing to be safe.
  const postedDate = new Date(l.posted_at + '+05:30');
  if (postedDate >= SEVEN_DAYS_BEFORE && postedDate < REFERENCE_DATE) {
    last7DaysCount++;
  }
}
answers.listings_last_7_days = last7DaysCount;

// Q10. projects_with_wrong_listing_count
let wrongProjectCount = 0;
const actualListingsPerProject = {};
for (const l of listings) {
  if (l.project_id) {
    // Should we only count active listings? "Every project reports how many listings it has."
    // Let's just count all retrievable listings since it says "recomputed whenever a listing is added or withdrawn".
    // Wait, withdrawn means it's not retrievable! So retrievable ones ARE the ones that should be counted.
    actualListingsPerProject[l.project_id] = (actualListingsPerProject[l.project_id] || 0) + 1;
  }
}
for (const p of projects) {
  const actual = actualListingsPerProject[p.project_id] || 0;
  if (p.total_listings !== actual) {
    wrongProjectCount++;
  }
}
answers.projects_with_wrong_listing_count = wrongProjectCount;

console.log(JSON.stringify(answers, null, 2));
