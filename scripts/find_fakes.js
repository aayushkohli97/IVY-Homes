const fs = require('fs');

const listings = require('../data/listings.json').data;

// Find common descriptions
const descCounts = {};
for (const l of listings) {
  descCounts[l.description] = (descCounts[l.description] || 0) + 1;
}

const commonDescs = Object.entries(descCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log("Top 10 descriptions:");
console.log(commonDescs);

// Check phone numbers
const phoneCounts = {};
for (const l of listings) {
  phoneCounts[l.posted_by_contact] = (phoneCounts[l.posted_by_contact] || 0) + 1;
}

const commonPhones = Object.entries(phoneCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log("\nTop 10 phone numbers:");
console.log(commonPhones);

// Check names
const nameCounts = {};
for (const l of listings) {
  nameCounts[l.posted_by_name] = (nameCounts[l.posted_by_name] || 0) + 1;
}

const commonNames = Object.entries(nameCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log("\nTop 10 names:");
console.log(commonNames);
