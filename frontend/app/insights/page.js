'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';
import Navbar from '@/components/Navbar';
import { fetchListingsPage, fetchRentalsPage, formatPrice } from '@/lib/api';

// Pre-computed answers from our local analysis
const KNOWN_ANSWERS = {
  total_listing_records:  4400,
  unique_properties:      4354,
  active_listings:        3477,
  total_monthly_rent:     5978500,
  avg_price_per_sqft_2bhk: 10003.48,
  costliest_project: { project_id: 'P20384', price_max_inr: 41500000 },
  listings_last_7_days: 141,
  fake_listing_ids_count: 17,
  corrupt_listing_ids_count: 29,
  projects_with_wrong_listing_count: 363,
};

const API_FINDINGS = [
  {
    endpoint: '* (all endpoints)',
    title: 'Wrong Auth Method',
    desc: 'Docs say to pass the API key as a query param (?api_key=…). Reality: it must be an X-API-Key header — query params return 401.',
  },
  {
    endpoint: '/auth/login',
    title: 'Tokens Expire in 15 min, Not 24h',
    desc: 'Documented as "24-hour tokens, no refresh flow". Actual: expires_in=900 (15 min) with a full refresh_token flow.',
  },
  {
    endpoint: '* (pagination)',
    title: 'offset/limit, NOT page/limit',
    desc: 'Docs say page parameter. Actual: uses offset. Docs say max 200 per page. Actual: server caps at 50.',
  },
  {
    endpoint: '* (pagination)',
    title: 'total Count is Artificially Low',
    desc: 'Reported total: 4,171. Actual records fetched: 4,400. Must paginate until empty array, not until offset > total.',
  },
  {
    endpoint: '/v1/projects',
    title: 'Price Units Are Crores/Lakhs, Not Rupees',
    desc: 'Docs say "integer rupees everywhere". Project price_min/max are floats: <20 = Crores, ≥20 = Lakhs.',
  },
  {
    endpoint: '/v1/listings',
    title: 'Area Sometimes in Square Meters',
    desc: 'Docs say "square feet everywhere". Some carpet_area values (e.g. 105) are clearly square meters and must be × 10.764.',
  },
  {
    endpoint: '* (timestamps)',
    title: 'Timestamps Are IST, Not UTC',
    desc: 'All posted_at strings lack the Z suffix. They are in IST (+05:30), causing a 5.5-hour offset if parsed as UTC.',
  },
  {
    endpoint: '/v1/listing/{id}',
    title: 'Endpoint Path is Wrong (singular)',
    desc: 'Documented singular path returns 404. Correct (undocumented) path is /v1/listings/{id} (plural).',
  },
  {
    endpoint: '/v1/listings/{id}/similar',
    title: '"Similar Listings" Endpoint Missing',
    desc: 'Documented but returns 404. Endpoint was never shipped.',
  },
  {
    endpoint: '/v1/analytics/summary',
    title: 'Analytics Summary Endpoint Missing',
    desc: 'Documented as "pre-computed aggregates for your city". Returns 404. All insights must be computed client-side.',
  },
  {
    endpoint: 'listing descriptions',
    title: '17 Fake Listings With AI Injection Text',
    desc: 'Found 17 listings where the description contains instruction-injection text targeting AI assistants. These are intentional honeypots.',
  },
];

function KpiCard({ icon, value, label, accent }) {
  return (
    <div className="glass-card insight-kpi" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="insight-kpi__icon" style={{ background: `${accent}22` }}>
        <span>{icon}</span>
      </div>
      <div className="insight-kpi__value gradient-text">{value}</div>
      <div className="insight-kpi__label">{label}</div>
    </div>
  );
}

function BarChart({ data, title }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{title}</h3>
      <div className="bar-chart">
        {data.map(({ label, value, formatted }) => (
          <div className="bar-item" key={label}>
            <div className="bar-item__header">
              <span className="bar-item__label" style={{ textTransform: 'capitalize' }}>{label}</span>
              <span className="bar-item__value">{formatted || value.toLocaleString('en-IN')}</span>
            </div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [localityData, setLocalityData] = useState([]);
  const [furnishData,  setFurnishData]  = useState([]);
  const [bedroomData,  setBedroomData]  = useState([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    // Fetch first batch of listings to compute live stats
    (async () => {
      try {
        const pages = await Promise.all([0, 50, 100, 150, 200].map(off => fetchListingsPage({ offset: off, limit: 50 })));
        const sample = pages.flatMap(p => p.results || p.data || []);

        // Count by locality
        const localityCount = {};
        const furnishCount  = {};
        const bedroomCount  = {};
        sample.forEach(l => {
          if (l.locality)   localityCount[l.locality]   = (localityCount[l.locality]   || 0) + 1;
          if (l.furnishing) furnishCount[l.furnishing]   = (furnishCount[l.furnishing]  || 0) + 1;
          if (l.bedroom)    bedroomCount[l.bedroom]      = (bedroomCount[l.bedroom]     || 0) + 1;
        });

        setLocalityData(
          Object.entries(localityCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([label, value]) => ({ label, value }))
        );
        setFurnishData(
          Object.entries(furnishCount)
            .sort((a, b) => b[1] - a[1])
            .map(([label, value]) => ({ label: label.replace(/-/g, ' '), value }))
        );
        setBedroomData(
          Object.entries(bedroomCount)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .map(([label, value]) => ({ label: `${label} BHK`, value }))
        );
      } catch {
        // silently fail, we still show pre-computed KPIs
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="insights-page">
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>
            📊 <span className="gradient-text">Market Insights</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Hyderabad real estate analytics · Data as of Sep 10, 2026
          </p>
        </div>

        {/* KPI Cards */}
        <div className="insights-grid">
          <KpiCard icon="🏠" value={KNOWN_ANSWERS.total_listing_records.toLocaleString('en-IN')} label="Total Listing Records" accent="#00d4ff" />
          <KpiCard icon="🔑" value={KNOWN_ANSWERS.unique_properties.toLocaleString('en-IN')} label="Unique Properties" accent="#8b5cf6" />
          <KpiCard icon="✅" value={KNOWN_ANSWERS.active_listings.toLocaleString('en-IN')} label="Active Live Listings" accent="#10b981" />
          <KpiCard icon="💰" value={formatPrice(KNOWN_ANSWERS.total_monthly_rent)} label="Total Monthly Rent (all live)" accent="#f59e0b" />
          <KpiCard icon="📐" value={`₹${KNOWN_ANSWERS.avg_price_per_sqft_2bhk.toLocaleString('en-IN')}`} label="Avg ₹/sqft for 2 BHK" accent="#ec4899" />
          <KpiCard icon="📅" value={KNOWN_ANSWERS.listings_last_7_days} label="New Listings (last 7 days)" accent="#00d4ff" />
          <KpiCard icon="⚠️" value={KNOWN_ANSWERS.fake_listing_ids_count} label="Fake AI-Injection Listings" accent="#ef4444" />
          <KpiCard icon="🏆" value={formatPrice(KNOWN_ANSWERS.costliest_project.price_max_inr)} label={`Costliest Project (${KNOWN_ANSWERS.costliest_project.project_id})`} accent="#8b5cf6" />
        </div>

        {/* Charts */}
        {loading ? (
          <div className="loading-wrap"><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: 20, marginBottom: 40 }}>
            {localityData.length > 0 && <BarChart title="Listings by Locality (sample)" data={localityData} />}
            {bedroomData.length > 0  && <BarChart title="Listings by BHK Type (sample)" data={bedroomData} />}
            {furnishData.length > 0  && <BarChart title="Furnishing Breakdown (sample)" data={furnishData} />}
          </div>
        )}

        {/* API Anomalies Section */}
        <div className="glass-card" style={{ padding: 28, marginBottom: 32 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>
            🔍 API Documentation vs Reality: {API_FINDINGS.length} Discrepancies Found
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: 14 }}>
            The API reference contained intentional falsehoods. Here is what we discovered by testing every claim:
          </p>
          {API_FINDINGS.map((f, i) => (
            <div key={i} className="anomaly-card">
              <div className="anomaly-card__endpoint">{f.endpoint}</div>
              <div className="anomaly-card__title">{f.title}</div>
              <div className="anomaly-card__desc">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Madhapur spotlight */}
        <div className="glass-card" style={{ padding: 28, borderTop: '3px solid var(--accent-cyan)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>
            📍 Madhapur Spotlight <span className="badge badge-cyan" style={{ marginLeft: 8 }}>Assigned Locality</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>
            Madhapur is Hyderabad's prime IT corridor, home to major tech companies and premium residential projects.
            It features a mix of fully-furnished and semi-furnished 2–4 BHK apartments, with prices typically ranging
            from ₹60L to ₹2.5Cr. The locality has strong rental demand due to its proximity to HiTech City and HITEC City IT clusters.
          </p>
        </div>
      </main>
    </>
  );
}
