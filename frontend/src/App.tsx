import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Treemap
} from 'recharts';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

// PowerBI Color Palette for Consistent Corporate BI Rendering
const CLUSTER_COLORS: { [key: string]: string } = {
  "VIP / High-Value Champions": "#10b981", // Emerald
  "Loyal Regular Customers": "#2563eb",   // Royal Blue
  "New / Recent Customers": "#f59e0b",    // Amber
  "Lost / Inactive Customers": "#ef4444"   // Crimson
};

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function App() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'recommender' | 'clusters' | 'rules'>('analytics');

  // Interactive PowerBI Filter Slicers
  const [metricView, setMetricView] = useState<'revenue' | 'orders'>('revenue');
  const [timeGranularity, setTimeGranularity] = useState<'monthly' | 'quarterly'>('monthly');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>('All');
  const [selectedSegmentFilter, setSelectedSegmentFilter] = useState<string>('All');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '2011' | 'h2_2011'>('all');

  // Search & Basket State for Recommender
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [selectedBasket, setSelectedBasket] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);

  // Apriori Threshold Sliders (Support & Confidence)
  const [minSupport, setMinSupport] = useState<number>(0.015);
  const [minConfidence, setMinConfidence] = useState<number>(0.15);

  // Dashboard & Analytics State
  const [analytics, setAnalytics] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);

  // Association Rules Filtering & Pagination State
  const [rulesSearch, setRulesSearch] = useState<string>('');
  const [rulesFilterType, setRulesFilterType] = useState<'all' | 'single' | 'multi'>('all');
  const [rulesSortBy, setRulesSortBy] = useState<'confidence' | 'support'>('confidence');
  const [rulesPage, setRulesPage] = useState<number>(1);
  const rulesPerPage = 15;

  useEffect(() => {
    fetchAnalytics();
    fetchCustomers();
    fetchRules();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics`);
      const data = await res.json();
      if (data.success) setAnalytics(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/customers`);
      const data = await res.json();
      if (data.success) setCustomers(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRules = async () => {
    try {
      const res = await fetch(`${API_BASE}/rules`);
      const data = await res.json();
      if (data.success) setRules(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchChange = async (val: string) => {
    setQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/products?query=${encodeURIComponent(val)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const addToBasket = (prod: string) => {
    if (!selectedBasket.includes(prod)) {
      setSelectedBasket((prev) => [...prev, prod]);
    }
    setQuery('');
    setSearchResults([]);
    setIsCheckedOut(false);
  };

  const removeFromBasket = (prod: string) => {
    setSelectedBasket(selectedBasket.filter((p) => p !== prod));
    setRecommendations([]);
    setIsCheckedOut(false);
  };

  // Automatically fetch recommendations when entering checkout mode
  const handleProceedToCheckout = async () => {
    if (selectedBasket.length === 0) return;

    setIsCheckedOut(true);
    setLoadingRecs(true);
    setHasSearched(true);
    try {
      const res = await fetch(`${API_BASE}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: selectedBasket,
          min_support: minSupport,
          min_confidence: minConfidence,
          top_n: 10
        })
      });
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Dynamic Slicer Computation: Compute filtered metrics when Region or Segment filters change
  const getFilteredMetrics = () => {
    if (!analytics) return null;

    let countryItem = null;
    if (selectedCountryFilter !== 'All') {
      if (selectedCountryFilter === 'United Kingdom') {
        countryItem = (analytics.country_matrix || []).find((c: any) => c.Country === 'United Kingdom');
      } else if (selectedCountryFilter === 'International') {
        const intlList = (analytics.country_matrix || []).filter((c: any) => c.Country !== 'United Kingdom');
        const rev = intlList.reduce((acc: number, c: any) => acc + (c.revenue || 0), 0);
        const orders = intlList.reduce((acc: number, c: any) => acc + (c.orders || 0), 0);
        const custs = intlList.reduce((acc: number, c: any) => acc + (c.customers || 0), 0);
        countryItem = {
          Country: 'International',
          revenue: rev,
          orders: orders,
          customers: custs,
          aov: orders > 0 ? rev / orders : 0
        };
      } else {
        countryItem = (analytics.country_matrix || []).find((c: any) => c.Country === selectedCountryFilter);
      }
    }

    let segmentCount = null;
    if (selectedSegmentFilter !== 'All') {
      segmentCount = analytics.cluster_distribution ? analytics.cluster_distribution[selectedSegmentFilter] : null;
    }

    // Dynamic KPI Cards
    const totalRevenue = countryItem ? countryItem.revenue : analytics.total_revenue;
    const totalOrders = countryItem ? countryItem.orders : analytics.total_transactions;
    const totalCustomers = segmentCount !== null 
      ? segmentCount 
      : (countryItem ? countryItem.customers : analytics.total_customers);
    const avgOrderValue = countryItem ? countryItem.aov : analytics.avg_order_value;

    // Filtered monthly trend (for Date slicer)
    let monthlyTrend = analytics.monthly_trend || [];
    if (dateRangeFilter === '2011') {
      monthlyTrend = monthlyTrend.filter((m: any) => m.MonthYear && m.MonthYear.startsWith('2011'));
    }

    // Filtered Donut Segments
    let clusterDist = { ...analytics.cluster_distribution };
    if (selectedSegmentFilter !== 'All') {
      clusterDist = { [selectedSegmentFilter]: clusterDist[selectedSegmentFilter] || 0 };
    }

    return {
      totalRevenue,
      totalOrders,
      totalCustomers,
      avgOrderValue,
      monthlyTrend,
      clusterDist
    };
  };

  const filteredMetrics = getFilteredMetrics();

  return (
    <div className="amz-layout">
      {/* Amazon Top Navigation Bar */}
      <header className="amz-navbar">
        <div className="amz-brand">
          <span className="amz-logo">Cart<span className="logo-suffix">analytics</span></span>
          <span className="amz-badge">PowerBI Enterprise Edition</span>
        </div>

        <div className="amz-search-bar">
          <span className="amz-search-cat">All Categories</span>
          <input
            type="text"
            placeholder="Search items for basket analysis (e.g. HEART, BAG, MUG)..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <button className="amz-search-btn">🔍</button>

          {searchResults.length > 0 && (
            <div className="amz-dropdown">
              {searchResults.map((item, idx) => (
                <div
                  key={idx}
                  className="amz-dropdown-item"
                  onClick={() => { addToBasket(item); }}
                >
                  ➕ Add to Cart: <strong>{item}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="amz-nav-right">
          <div className="amz-cart-widget" onClick={() => setActiveTab('recommender')}>
            <span className="cart-icon">🛒</span>
            <span className="cart-count">{selectedBasket.length}</span>
            <span className="cart-text">Basket</span>
          </div>
        </div>
      </header>

      {/* Main Container with Amazon Left Sidebar */}
      <div className="amz-body">
        <aside className="amz-sidebar">
          <div className="sidebar-group">
            <div className="sidebar-title">NAVIGATION MENU</div>
            <button
              className={`sidebar-link ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <span className="icon">📈</span> PowerBI Executive BI
            </button>
            <button
              className={`sidebar-link ${activeTab === 'recommender' ? 'active' : ''}`}
              onClick={() => setActiveTab('recommender')}
            >
              <span className="icon">🛒</span> Shopping Cart & Checkout
            </button>
            <button
              className={`sidebar-link ${activeTab === 'clusters' ? 'active' : ''}`}
              onClick={() => setActiveTab('clusters')}
            >
              <span className="icon">👥</span> K-Means Customer Clusters
            </button>
            <button
              className={`sidebar-link ${activeTab === 'rules' ? 'active' : ''}`}
              onClick={() => setActiveTab('rules')}
            >
              <span className="icon">🔗</span> Association Rules Table
            </button>
          </div>

          {/* PowerBI Interactive Controls in Sidebar */}
          {activeTab === 'analytics' && (
            <div className="sidebar-group sliders-group">
              <div className="sidebar-title">POWERBI SLICERS & FILTERS</div>

              <div className="slicer-box">
                <label className="slicer-label">Metric Measure:</label>
                <div className="btn-toggle-row">
                  <button
                    className={`toggle-btn ${metricView === 'revenue' ? 'active' : ''}`}
                    onClick={() => setMetricView('revenue')}
                  >
                    Revenue (£)
                  </button>
                  <button
                    className={`toggle-btn ${metricView === 'orders' ? 'active' : ''}`}
                    onClick={() => setMetricView('orders')}
                  >
                    Orders
                  </button>
                </div>
              </div>

              <div className="slicer-box" style={{ marginTop: '12px' }}>
                <label className="slicer-label">Time Interval:</label>
                <div className="btn-toggle-row">
                  <button
                    className={`toggle-btn ${timeGranularity === 'monthly' ? 'active' : ''}`}
                    onClick={() => setTimeGranularity('monthly')}
                  >
                    Monthly
                  </button>
                  <button
                    className={`toggle-btn ${timeGranularity === 'quarterly' ? 'active' : ''}`}
                    onClick={() => setTimeGranularity('quarterly')}
                  >
                    Quarterly
                  </button>
                </div>
              </div>

              <div className="slicer-box" style={{ marginTop: '12px' }}>
                <label className="slicer-label">Region Filter:</label>
                <select
                  className="slicer-select"
                  value={selectedCountryFilter}
                  onChange={(e) => setSelectedCountryFilter(e.target.value)}
                >
                  <option value="All">All Regions (Global)</option>
                  <option value="United Kingdom">United Kingdom Only</option>
                  <option value="International">International Only</option>
                  <option value="Netherlands">Netherlands</option>
                  <option value="EIRE">EIRE (Ireland)</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Australia">Australia</option>
                </select>
              </div>

              <div className="slicer-box" style={{ marginTop: '12px' }}>
                <label className="slicer-label">Customer Segment Slicer:</label>
                <select
                  className="slicer-select"
                  value={selectedSegmentFilter}
                  onChange={(e) => setSelectedSegmentFilter(e.target.value)}
                >
                  <option value="All">All Customer Segments</option>
                  <option value="VIP / High-Value Champions">VIP / High-Value Champions</option>
                  <option value="Loyal Regular Customers">Loyal Regular Customers</option>
                  <option value="New / Recent Customers">New / Recent Customers</option>
                  <option value="Lost / Inactive Customers">Lost / Inactive Customers</option>
                </select>
              </div>

              <div className="slicer-box" style={{ marginTop: '12px' }}>
                <label className="slicer-label">Date Range / Period:</label>
                <div className="btn-toggle-row">
                  <button
                    className={`toggle-btn ${dateRangeFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDateRangeFilter('all')}
                  >
                    Full History
                  </button>
                  <button
                    className={`toggle-btn ${dateRangeFilter === '2011' ? 'active' : ''}`}
                    onClick={() => setDateRangeFilter('2011')}
                  >
                    2011 YTD
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommender' && (
            <div className="sidebar-group sliders-group">
              <div className="sidebar-title">APRIORI PARAMETERS</div>
              
              <div className="amz-slider-box">
                <label>Min Support: <strong>{(minSupport * 100).toFixed(1)}%</strong></label>
                <input
                  type="range"
                  min="0"
                  max="0.05"
                  step="0.005"
                  value={minSupport}
                  onChange={(e) => { setMinSupport(Number(e.target.value)); setHasSearched(false); }}
                />
              </div>

              <div className="amz-slider-box">
                <label>Min Confidence: <strong>{(minConfidence * 100).toFixed(1)}%</strong></label>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={minConfidence}
                  onChange={(e) => { setMinConfidence(Number(e.target.value)); setHasSearched(false); }}
                />
              </div>
            </div>
          )}
        </aside>

        {/* Main Content Workspace */}
        <main className="amz-content">
          {/* VIEW 1: POWERBI STYLE EXECUTIVE ANALYTICAL DASHBOARD */}
          {activeTab === 'analytics' && analytics && (
            <div className="content-view">
              <div className="view-header">
                <h2>PowerBI Business Intelligence Analytics Dashboard</h2>
                <p>Enterprise data mining metrics computed across 392,692 retail transactions (Interactive Slicers Active).</p>
              </div>

              {/* KPI Summary Cards */}
              <div className="kpi-row">
                <div className="kpi-card">
                  <span className="kpi-label">Total Unique Customers</span>
                  <span className="kpi-val">{(filteredMetrics ? filteredMetrics.totalCustomers : analytics.total_customers).toLocaleString()}</span>
                  <span className="kpi-sub">{selectedSegmentFilter !== 'All' ? selectedSegmentFilter : (selectedCountryFilter !== 'All' ? `${selectedCountryFilter} Users` : 'Cleaned Profiles')}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Total Products Catalog</span>
                  <span className="kpi-val">{analytics.total_products.toLocaleString()}</span>
                  <span className="kpi-sub">Unique StockCodes</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Total Baskets / Invoices</span>
                  <span className="kpi-val">{(filteredMetrics ? filteredMetrics.totalOrders : analytics.total_transactions).toLocaleString()}</span>
                  <span className="kpi-sub">{selectedCountryFilter !== 'All' ? `${selectedCountryFilter} Orders` : 'Distinct Orders'}</span>
                </div>
                <div className="kpi-card highlight">
                  <span className="kpi-label">Total Revenue</span>
                  <span className="kpi-val">£{(filteredMetrics ? filteredMetrics.totalRevenue : analytics.total_revenue).toLocaleString()}</span>
                  <span className="kpi-sub">{selectedCountryFilter !== 'All' ? `${selectedCountryFilter} Market` : 'Gross E-Commerce Sales'}</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Average Order Value (AOV)</span>
                  <span className="kpi-val">£{(filteredMetrics ? filteredMetrics.avgOrderValue : analytics.avg_order_value).toFixed(2)}</span>
                  <span className="kpi-sub">Spend per Basket</span>
                </div>
                <div className="kpi-card">
                  <span className="kpi-label">Selected Filter Focus</span>
                  <span className="kpi-val" style={{ fontSize: '15px' }}>{selectedCountryFilter !== 'All' ? selectedCountryFilter : 'Global Market'}</span>
                  <span className="kpi-sub">{selectedSegmentFilter !== 'All' ? selectedSegmentFilter : 'All 4 Clusters'}</span>
                </div>
              </div>

              {/* ROW 2: PowerBI LINE CHART (Monthly Sales Trends) */}
              <div className="amz-card" style={{ marginTop: '20px' }}>
                <div className="chart-header-row">
                  <div>
                    <h3>📈 Line Chart — Monthly Sales & Orders Trend</h3>
                    <span className="chart-subtext">Continuous time series trajectory across 2010 - 2011 | Slicer Granularity: <strong>{timeGranularity.toUpperCase()}</strong> {dateRangeFilter === '2011' && ' (Filtered: 2011 YTD)'}</span>
                  </div>
                  <div className="chart-actions">
                    <button
                      className={`btn-pill ${timeGranularity === 'monthly' ? 'active' : ''}`}
                      onClick={() => setTimeGranularity('monthly')}
                    >
                      Monthly
                    </button>
                    <button
                      className={`btn-pill ${timeGranularity === 'quarterly' ? 'active' : ''}`}
                      onClick={() => setTimeGranularity('quarterly')}
                    >
                      Quarterly
                    </button>
                  </div>
                </div>

                <div style={{ width: '100%', height: 260, marginTop: '15px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={timeGranularity === 'monthly' ? (filteredMetrics ? filteredMetrics.monthlyTrend : analytics.monthly_trend) : analytics.quarterly_trend}
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey={timeGranularity === 'monthly' ? "MonthYear" : "Quarter"} stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} tickFormatter={(val) => metricView === 'revenue' ? `£${(val / 1000).toFixed(0)}k` : val.toLocaleString()} />
                      <Tooltip
                        formatter={(val: any) => [metricView === 'revenue' ? `£${Number(val).toLocaleString()}` : Number(val).toLocaleString(), metricView === 'revenue' ? 'Revenue' : 'Orders']}
                        contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '6px', border: 'none', fontSize: '13px' }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey={metricView === 'revenue' ? "revenue" : (timeGranularity === 'monthly' ? "transactions" : "orders")}
                        name={metricView === 'revenue' ? "Gross Revenue (£)" : "Distinct Orders"}
                        stroke="#0284c7"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#0284c7' }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ROW 3: BAR CHART (Top-Selling Products) & DONUT CHART (Customer Segments) */}
              <div className="grid-2col" style={{ marginTop: '25px' }}>
                {/* Bar Chart — Top-selling products */}
                <div className="amz-card">
                  <div className="chart-header-row">
                    <div>
                      <h3>📊 Bar Chart — Top-Selling Products</h3>
                      <span className="chart-subtext">Highest sales volume products across orders</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 270, marginTop: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={(analytics.top_products || []).slice(0, 6).map((p: any) => {
                          const desc = p.Description || p.description || 'Unknown Product';
                          return {
                            name: desc.length > 22 ? desc.substring(0, 22) + '...' : desc,
                            fullName: desc,
                            quantity: p.quantity || p.total_quantity || 0
                          };
                        })}
                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                        <XAxis type="number" stroke="#64748b" fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="name" type="category" stroke="#475569" fontSize={11} width={130} />
                        <Tooltip
                          formatter={(v: any, n: any, item: any) => [`${Number(v).toLocaleString()} units`, item.payload.fullName]}
                          contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                        />
                        <Bar dataKey="quantity" fill="#f59e0b" radius={[0, 4, 4, 0]} name="Units Sold" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Chart — Customer Segment Distribution */}
                <div className="amz-card">
                  <div className="chart-header-row">
                    <div>
                      <h3>🍩 Donut Chart — Customer Segment Distribution</h3>
                      <span className="chart-subtext">K-Means RFM Segments with interactive vector slices</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 270, marginTop: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={Object.entries(filteredMetrics ? filteredMetrics.clusterDist : analytics.cluster_distribution).map(([name, count]: any) => ({
                            name,
                            value: count
                          }))}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {Object.keys(filteredMetrics ? filteredMetrics.clusterDist : analytics.cluster_distribution).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CLUSTER_COLORS[entry] || CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(val: any, name: any) => [`${Number(val).toLocaleString()} customers (${((Number(val) / (filteredMetrics ? filteredMetrics.totalCustomers : analytics.total_customers)) * 100).toFixed(1)}%)`, name]}
                          contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ROW 4: SCATTER PLOT (K-Means Recency vs Monetary) & STACKED COLUMN (Category Monthly) */}
              <div className="grid-2col" style={{ marginTop: '25px' }}>
                {/* Scatter plot — Customer segmentation using K-means */}
                <div className="amz-card">
                  <div className="chart-header-row">
                    <div>
                      <h3>🎯 Scatter Plot — Customer Segmentation (K-Means)</h3>
                      <span className="chart-subtext">Recency (Days) vs Monetary Spend (£) colored by Cluster</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 270, marginTop: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis
                          type="number"
                          dataKey="Recency"
                          name="Recency"
                          unit="d"
                          stroke="#64748b"
                          fontSize={11}
                          label={{ value: 'Recency (Days)', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#64748b' }}
                        />
                        <YAxis
                          type="number"
                          dataKey="Monetary"
                          name="Monetary"
                          unit="£"
                          stroke="#64748b"
                          fontSize={11}
                          tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`}
                          label={{ value: 'Monetary Spend', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#64748b' }}
                        />
                        <ZAxis range={[25, 30]} />
                        <Tooltip
                          cursor={{ strokeDasharray: '3 3' }}
                          formatter={(val: any, name: any, item: any) => {
                            if (name === 'Recency') return [`${val} days`, 'Recency'];
                            if (name === 'Monetary') return [`£${Number(val).toLocaleString()}`, 'Monetary'];
                            return [val, name];
                          }}
                          contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                        />
                        {["VIP / High-Value Champions", "Loyal Regular Customers", "New / Recent Customers", "Lost / Inactive Customers"].map((seg) => {
                          const clusterData = (analytics.scatter_data || []).filter((d: any) => {
                            if (selectedSegmentFilter !== 'All' && d.Segment_Name !== selectedSegmentFilter) return false;
                            return d.Segment_Name === seg;
                          });
                          return (
                            <Scatter
                              key={seg}
                              name={seg}
                              data={clusterData}
                              fill={CLUSTER_COLORS[seg] || '#3b82f6'}
                            />
                          );
                        })}
                        <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: '11px' }} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Stacked column chart — Sales by category and month */}
                <div className="amz-card">
                  <div className="chart-header-row">
                    <div>
                      <h3>📚 Stacked Column Chart — Sales by Category & Month</h3>
                      <span className="chart-subtext">Product category revenue contribution across months</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 270, marginTop: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={analytics.stacked_category_monthly || []}
                        margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="Month" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v: any, name: any) => [`£${Number(v).toLocaleString()}`, name]}
                          contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Bar dataKey="Home & Decor" stackId="a" fill="#3b82f6" />
                        <Bar dataKey="Stationery & Accessories" stackId="a" fill="#10b981" />
                        <Bar dataKey="Bags & Storage" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="Kitchen & Dining" stackId="a" fill="#8b5cf6" />
                        <Bar dataKey="Seasonal & Gifts" stackId="a" fill="#ec4899" />
                        <Bar dataKey="Toys & Novelty" stackId="a" fill="#06b6d4" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ROW 5: TREEMAP (Product Sales Contribution) & REGIONAL DONUT */}
              <div className="grid-2col" style={{ marginTop: '25px' }}>
                {/* Treemap — Product sales contribution */}
                <div className="amz-card">
                  <div className="chart-header-row">
                    <div>
                      <h3>🗺️ Treemap — Product Category Sales Contribution</h3>
                      <span className="chart-subtext">Proportional revenue share by retail category hierarchy</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 260, marginTop: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <Treemap
                        data={(analytics.category_contributions || []).map((c: any, idx: number) => ({
                          name: c.Category,
                          size: c.revenue,
                          fill: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
                        }))}
                        dataKey="size"
                        stroke="#fff"
                        fill="#3b82f6"
                      >
                        <Tooltip
                          formatter={(v: any, name: any, item: any) => [`£${Number(v).toLocaleString()}`, item.payload.name]}
                          contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                        />
                      </Treemap>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut Chart — Regional Share (UK vs International) */}
                <div className="amz-card">
                  <div className="chart-header-row">
                    <div>
                      <h3>🌐 Donut Chart — Geographical Sales Distribution</h3>
                      <span className="chart-subtext">Domestic UK vs International E-commerce revenue</span>
                    </div>
                  </div>
                  <div style={{ width: '100%', height: 260, marginTop: '10px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'United Kingdom', value: analytics.regional_distribution["United Kingdom"] },
                            { name: 'International', value: analytics.regional_distribution["International"] }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          <Cell fill="#0284c7" />
                          <Cell fill="#f97316" />
                        </Pie>
                        <Tooltip
                          formatter={(val: any, name: any) => {
                            const total = analytics.regional_distribution["United Kingdom"] + analytics.regional_distribution["International"];
                            return [`£${Number(val).toLocaleString()} (${((Number(val) / total) * 100).toFixed(1)}%)`, name];
                          }}
                          contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '6px', fontSize: '12px' }}
                        />
                        <Legend verticalAlign="bottom" height={36} iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* ROW 6: MATRIX — Detailed Country-Wise Sales Analysis Table */}
              <div className="amz-card" style={{ marginTop: '25px' }}>
                <div className="chart-header-row">
                  <div>
                    <h3>🌍 Matrix — Detailed Country-Wise Sales Analysis</h3>
                    <span className="chart-subtext">Geographical revenue, orders, distinct customers, units sold, and average order value (AOV)</span>
                  </div>
                  <span className="badge-powerbi">37 Global Markets</span>
                </div>
                <div className="table-scroll-wrapper" style={{ maxHeight: '320px', overflowY: 'auto', marginTop: '12px' }}>
                  <table className="amz-table">
                    <thead>
                      <tr>
                        <th>Country</th>
                        <th>Revenue (£)</th>
                        <th>Orders</th>
                        <th>Customers</th>
                        <th>Items Sold</th>
                        <th>Average Order Value</th>
                        <th>Market Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics.country_matrix || analytics.country_distribution || []).filter((c: any) => {
                        if (selectedCountryFilter === 'All') return true;
                        if (selectedCountryFilter === 'United Kingdom') return c.Country === 'United Kingdom';
                        if (selectedCountryFilter === 'International') return c.Country !== 'United Kingdom';
                        return c.Country === selectedCountryFilter;
                      }).map((c: any, idx: number) => {
                        const totalRev = analytics.total_revenue;
                        const share = ((c.revenue / totalRev) * 100).toFixed(2);
                        return (
                          <tr key={idx}>
                            <td><strong>{c.Country}</strong></td>
                            <td><strong style={{ color: '#059669' }}>£{c.revenue.toLocaleString()}</strong></td>
                            <td>{c.orders ? c.orders.toLocaleString() : '-'}</td>
                            <td>{c.customers ? c.customers.toLocaleString() : '-'}</td>
                            <td>{c.items_sold ? c.items_sold.toLocaleString() : '-'}</td>
                            <td><strong>£{c.aov ? c.aov.toFixed(2) : '-'}</strong></td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '60px', height: '6px', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                  <div style={{ width: `${Math.min(100, Math.max(3, parseFloat(share)))}%`, height: '100%', backgroundColor: '#0284c7' }}></div>
                                </div>
                                <span style={{ fontSize: '11px', color: '#64748b' }}>{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ROW 7: Hourly Peak Hours & Day of Week Pattern */}
              <div className="grid-2col" style={{ marginTop: '25px' }}>
                <div className="amz-card">
                  <h3>⏰ Peak Transaction Hours (Hourly Breakdown)</h3>
                  <div className="chart-bars" style={{ height: '170px' }}>
                    {analytics.hourly_distribution.map((h: any, idx: number) => {
                      const maxTx = Math.max(...analytics.hourly_distribution.map((x: any) => x.transactions));
                      const heightPct = Math.round((h.transactions / maxTx) * 100);
                      return (
                        <div key={idx} className="bar-col">
                          <div className="bar-fill blue-fill" style={{ height: `${heightPct}%` }}>
                            <span className="bar-tooltip">{h.transactions}</span>
                          </div>
                          <span className="bar-label">{h.hour}:00</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="amz-card">
                  <h3>📆 Day of Week Shopping Frequency</h3>
                  <div className="list-rows">
                    {analytics.day_distribution.map((d: any, idx: number) => {
                      const maxDay = Math.max(...analytics.day_distribution.map((x: any) => x.transactions));
                      const widthPct = Math.round((d.transactions / maxDay) * 100);
                      return (
                        <div key={idx} className="data-row-container">
                          <div className="data-row-header">
                            <span className="row-title">{d.day}</span>
                            <span className="row-stat">{d.transactions.toLocaleString()} orders</span>
                          </div>
                          <div className="row-bar-bg">
                            <div className="row-bar-fill" style={{ width: `${widthPct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ROW 8: Product Price Range Distribution & Order Basket Sizing */}
              <div className="grid-2col" style={{ marginTop: '25px' }}>
                <div className="amz-card">
                  <h3>🏷️ Product Catalog Price Range Breakdown</h3>
                  <div className="list-rows">
                    {Object.entries(analytics.price_distribution).map(([band, count]: any, idx: number) => {
                      const maxCount = Math.max(...Object.values(analytics.price_distribution) as number[]);
                      const pct = Math.round((count / maxCount) * 100);
                      return (
                        <div key={idx} className="data-row-container">
                          <div className="data-row-header">
                            <span className="row-title">{band}</span>
                            <span className="row-stat">{count.toLocaleString()} products</span>
                          </div>
                          <div className="row-bar-bg">
                            <div className="row-bar-fill orange-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="amz-card">
                  <h3>📦 Order Basket Size Segmentation</h3>
                  <div className="list-rows">
                    {Object.entries(analytics.basket_size_distribution).map(([cat, count]: any, idx: number) => {
                      const maxB = Math.max(...Object.values(analytics.basket_size_distribution) as number[]);
                      const pct = Math.round((count / maxB) * 100);
                      return (
                        <div key={idx} className="data-row-container">
                          <div className="data-row-header">
                            <span className="row-title">{cat}</span>
                            <span className="row-stat">{count.toLocaleString()} invoices</span>
                          </div>
                          <div className="row-bar-bg">
                            <div className="row-bar-fill green-fill" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ROW 9: Top 5 Highest Spending Customers */}
              <div className="amz-card" style={{ marginTop: '25px' }}>
                <h3>⭐ Top 5 Highest Spending Customers</h3>
                <table className="amz-table">
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      <th>Orders</th>
                      <th>Total Spend</th>
                      <th>Cluster</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.top_customers.map((c: any, idx: number) => (
                      <tr key={idx}>
                        <td><strong>#{c.CustomerID}</strong></td>
                        <td>{c.Frequency} orders</td>
                        <td><strong style={{ color: '#059669' }}>£{c.Monetary.toLocaleString()}</strong></td>
                        <td><span className="segment-badge">{c.Segment_Name}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>



              {/* ROW 7: Full RFM Segmentation Breakdown */}
              <div className="amz-card" style={{ marginTop: '25px' }}>
                <h3>👥 K-Means RFM Segment Profiles & Averages</h3>
                <table className="amz-table">
                  <thead>
                    <tr>
                      <th>Cluster Segment</th>
                      <th>Avg Recency (Days)</th>
                      <th>Avg Frequency (Orders)</th>
                      <th>Avg Monetary Spend</th>
                      <th>Customer Count</th>
                      <th>Strategic Action Plan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.rfm_cluster_means.map((c: any, idx: number) => (
                      <tr key={idx}>
                        <td><strong>{c.Segment_Name}</strong></td>
                        <td>{c.Recency.toFixed(1)} days</td>
                        <td>{c.Frequency.toFixed(1)} orders</td>
                        <td>£{c.Monetary.toFixed(2)}</td>
                        <td><span className="segment-badge">{c.CustomerID}</span></td>
                        <td>
                          {c.Segment_Name.includes('VIP') && <span className="action-tag vip">Exclusive Perks & Loyalty Program</span>}
                          {c.Segment_Name.includes('Loyal') && <span className="action-tag loyal">Cross-sell & Seasonal Bundles</span>}
                          {c.Segment_Name.includes('New') && <span className="action-tag new">Welcome Offers & Nurture Series</span>}
                          {c.Segment_Name.includes('Lost') && <span className="action-tag lost">Win-Back Discounts & Re-engagement</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: APRIORI RECOMMENDER */}
          {activeTab === 'recommender' && (
            <div className="content-view">
              <div className="view-header">
                <h2>Amazon-Style Basket Recommendation Engine</h2>
                <p>Add items to your basket to generate explainable association rule recommendations derived via Apriori (Support & Confidence).</p>
              </div>

              <div className="amz-card" style={{ marginBottom: '25px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>🛒 Shopping Cart ({selectedBasket.length} {selectedBasket.length === 1 ? 'item' : 'items'})</h3>
                  {selectedBasket.length > 0 && (
                    <button
                      onClick={() => { setSelectedBasket([]); setRecommendations([]); setIsCheckedOut(false); }}
                      style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Clear Cart
                    </button>
                  )}
                </div>

                {selectedBasket.length === 0 ? (
                  <div className="empty-msg" style={{ marginTop: '12px' }}>
                    Your shopping cart is currently empty. Use the search bar at the top to add products.
                  </div>
                ) : (
                  <>
                    <div className="chips-row" style={{ marginTop: '12px' }}>
                      {selectedBasket.map((item, idx) => (
                        <div key={idx} className="amz-chip">
                          <span>{item}</span>
                          <button onClick={() => removeFromBasket(item)}>✕</button>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="amz-btn-gold"
                        disabled={selectedBasket.length === 0 || loadingRecs}
                        onClick={handleProceedToCheckout}
                        style={{ fontSize: '14px', padding: '10px 22px', fontWeight: 700 }}
                      >
                        {loadingRecs ? 'Analyzing Basket...' : '💳 Proceed to Checkout (Get Auto-Recommendations)'}
                      </button>
                      {isCheckedOut && (
                        <span style={{ color: '#059669', fontSize: '13px', fontWeight: 600 }}>
                          ✅ Checkout mode active — Auto-recommendations generated below!
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Recommendation Results (Displayed automatically upon Proceed to Checkout) */}
              <div className="view-header">
                <h3>Recommended Add-ons ("Customers who bought your cart items also bought...")</h3>
              </div>

              {loadingRecs && <div className="loading-box">Running Apriori basket rule inference...</div>}

              {!loadingRecs && !isCheckedOut && selectedBasket.length > 0 && (
                <div className="info-box">
                  Review your items above and click <strong>Proceed to Checkout</strong> to automatically discover complementary pairing recommendations.
                </div>
              )}

              {!loadingRecs && isCheckedOut && recommendations.length === 0 && (
                <div className="warning-box">
                  No Apriori pairing rules passed the active threshold settings (Min Support: {(minSupport * 100).toFixed(1)}%, Min Confidence: {(minConfidence * 100).toFixed(1)}%). Try relaxing the sliders in the sidebar.
                </div>
              )}

              {!loadingRecs && hasSearched && recommendations.length > 0 && (
                <div className="amz-products-grid">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="amz-product-card">
                      <div className="card-badge">RECOMMENDED PAIRING #{idx + 1}</div>
                      <h4 className="prod-name">{rec.recommended_product}</h4>
                      <p className="prod-exp">💡 {rec.explanation}</p>
                      
                      <div className="metrics-pill-row">
                        <span className="metric-pill">Confidence: {(rec.confidence * 100).toFixed(1)}%</span>
                        <span className="metric-pill">Support: {(rec.support * 100).toFixed(2)}%</span>
                      </div>

                      <div className="rule-string">Rule: {rec.matched_rule}</div>

                      <div style={{ marginTop: '8px' }}>
                        <button
                          className="toggle-btn active"
                          style={{ width: '100%', padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => {
                            (rec.recommended_products || [rec.recommended_product]).forEach((p: string) => addToBasket(p));
                          }}
                        >
                          🛒 Add Recommended to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW 3: CUSTOMER CLUSTERS TABLE */}
          {activeTab === 'clusters' && (
            <div className="content-view">
              <div className="view-header">
                <h2>K-Means RFM Customer Segments</h2>
                <p>Derived via Python `scikit-learn` KMeans model on scaled Recency, Frequency, and Monetary metrics.</p>
              </div>

              <div className="amz-card">
                <table className="amz-table">
                  <thead>
                    <tr>
                      <th>Customer ID</th>
                      <th>Recency (Days)</th>
                      <th>Frequency (Orders)</th>
                      <th>Monetary Spend</th>
                      <th>Assigned K-Means Cluster</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.slice(0, 40).map((c) => (
                      <tr key={c.CustomerID}>
                        <td><strong>{c.CustomerID}</strong></td>
                        <td>{c.Recency} days</td>
                        <td>{c.Frequency} orders</td>
                        <td>£{c.Monetary.toLocaleString()}</td>
                        <td><span className="segment-badge">{c.Segment_Name}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 4: APRIORI RULES TABLE */}
          {activeTab === 'rules' && (() => {
            // Filter and sort rules
            const filteredRules = rules.filter((r) => {
              const ant = String(r.antecedents || '').toUpperCase();
              const cons = String(r.consequents || '').toUpperCase();
              const term = rulesSearch.trim().toUpperCase();
              const matchesSearch = !term || ant.includes(term) || cons.includes(term);

              if (!matchesSearch) return false;

              const isMulti = ant.includes(',') || cons.includes(',');
              if (rulesFilterType === 'single') return !isMulti;
              if (rulesFilterType === 'multi') return isMulti;
              return true;
            }).sort((a, b) => {
              if (rulesSortBy === 'confidence') return (b.confidence || 0) - (a.confidence || 0);
              return (b.support || 0) - (a.support || 0);
            });

            const totalPages = Math.ceil(filteredRules.length / rulesPerPage) || 1;
            const currentPage = Math.min(rulesPage, totalPages);
            const paginatedRules = filteredRules.slice((currentPage - 1) * rulesPerPage, currentPage * rulesPerPage);

            return (
              <div className="content-view">
                <div className="view-header">
                  <h2>Mined Apriori Association Rules</h2>
                  <p>Mined across 18,532 basket transactions using downward closure property (Support & Confidence).</p>
                </div>

                {/* Rules Interactive Slicer & Filter Bar */}
                <div className="amz-card" style={{ marginBottom: '18px', padding: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flex: 1, minWidth: '260px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>🔍 Search Product:</span>
                      <input
                        type="text"
                        placeholder="Filter by product name (e.g. TEACUP, BAG, HEART)..."
                        value={rulesSearch}
                        onChange={(e) => { setRulesSearch(e.target.value); setRulesPage(1); }}
                        style={{ flex: 1, padding: '7px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '13px' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Rule Type:</span>
                        <select
                          className="slicer-select"
                          value={rulesFilterType}
                          onChange={(e: any) => { setRulesFilterType(e.target.value); setRulesPage(1); }}
                          style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
                          <option value="all">All Rules ({rules.length})</option>
                          <option value="single">Single Item Pairs (A ➔ B)</option>
                          <option value="multi">Multi-Item Bundles (A+B ➔ C or A ➔ B+C)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Sort By:</span>
                        <select
                          className="slicer-select"
                          value={rulesSortBy}
                          onChange={(e: any) => setRulesSortBy(e.target.value)}
                          style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        >
                          <option value="confidence">Highest Confidence (%)</option>
                          <option value="support">Highest Support (%)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
                    Showing <strong>{filteredRules.length}</strong> matching rules | Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                  </div>
                </div>

                <div className="amz-card">
                  <table className="amz-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Antecedents (If Customer Buys...)</th>
                        <th>Consequents (Then Recommend...)</th>
                        <th>Rule Pattern</th>
                        <th>Support (%)</th>
                        <th>Confidence (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRules.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '25px', color: '#64748b' }}>
                            No association rules matched your filter criteria.
                          </td>
                        </tr>
                      ) : (
                        paginatedRules.map((r, idx) => {
                          const globalIdx = (currentPage - 1) * rulesPerPage + idx + 1;
                          const isMulti = String(r.antecedents).includes(',') || String(r.consequents).includes(',');
                          return (
                            <tr key={globalIdx}>
                              <td><span style={{ color: '#94a3b8', fontSize: '12px' }}>{globalIdx}</span></td>
                              <td><strong>{r.antecedents}</strong></td>
                              <td className="text-orange"><strong>{r.consequents}</strong></td>
                              <td>
                                {isMulti ? (
                                  <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
                                    Multi-Item Bundle
                                  </span>
                                ) : (
                                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 7px', borderRadius: '10px', fontSize: '11px' }}>
                                    Pair (1 ➔ 1)
                                  </span>
                                )}
                              </td>
                              <td><strong>{(r.support * 100).toFixed(2)}%</strong></td>
                              <td><strong style={{ color: '#059669' }}>{(r.confidence * 100).toFixed(2)}%</strong></td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>

                  {/* Pagination Navigation Bar */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '20px', paddingBottom: '10px' }}>
                      <button
                        className="btn-pill"
                        disabled={currentPage === 1}
                        onClick={() => setRulesPage((prev) => Math.max(1, prev - 1))}
                        style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                      >
                        ◀ Previous
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        // Display sliding window around current page
                        if (totalPages > 10 && Math.abs(p - currentPage) > 3 && p !== 1 && p !== totalPages) {
                          if (Math.abs(p - currentPage) === 4) {
                            return <span key={p} style={{ color: '#94a3b8' }}>...</span>;
                          }
                          return null;
                        }

                        return (
                          <button
                            key={p}
                            className={`btn-pill ${currentPage === p ? 'active' : ''}`}
                            onClick={() => setRulesPage(p)}
                            style={{ minWidth: '32px', textAlign: 'center' }}
                          >
                            {p}
                          </button>
                        );
                      })}

                      <button
                        className="btn-pill"
                        disabled={currentPage === totalPages}
                        onClick={() => setRulesPage((prev) => Math.min(totalPages, prev + 1))}
                        style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1 }}
                      >
                        Next ▶
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </main>
      </div>
    </div>
  );
}
