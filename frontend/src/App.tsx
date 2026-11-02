import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Boxes, BrainCircuit, ChevronDown, CircleHelp, Filter, LayoutDashboard, LoaderCircle, PackageSearch, RefreshCw, Search, ShoppingBasket, Sparkles, Users, X, Plus, Minus, Tag, ShoppingBag } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import './App.css';

const API = 'http://localhost:5000/api';
type Tab = 'overview' | 'marketplace' | 'basket' | 'customers' | 'rules';
type AnyRow = Record<string, any>;
const COLORS = ['#5b66e8', '#28a879', '#f3a844', '#e66d83', '#3da6bc'];
const money = (n: number) => String.fromCharCode(163) + Number(n || 0).toLocaleString('en-GB', { maximumFractionDigits: 2 });

function App() {
  const [tab, setTab] = useState<Tab>('overview');
  const [analytics, setAnalytics] = useState<AnyRow | null>(null);
  const [customers, setCustomers] = useState<AnyRow[]>([]);
  const [rules, setRules] = useState<AnyRow[]>([]);
  const [problem, setProblem] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<string[]>([]);
  const [basket, setBasket] = useState<string[]>([]);
  const [algorithm, setAlgorithm] = useState<'apriori' | 'fpgrowth' | 'compare'>('fpgrowth');
  const [minConfidence, setMinConfidence] = useState(.15);
  const [recommendations, setRecommendations] = useState<AnyRow[]>([]);
  const [comparison, setComparison] = useState<AnyRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [segment, setSegment] = useState('All');
  const [ruleSearch, setRuleSearch] = useState('');
  const [catalog, setCatalog] = useState<AnyRow[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSort, setCatalogSort] = useState('popular');
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [priceIndex, setPriceIndex] = useState<AnyRow[]>([]);
  const [cartQty, setCartQty] = useState<Record<string, number>>({});
  const [discountedItems, setDiscountedItems] = useState<string[]>([]);

  const load = async () => {
    setLoading(true); setProblem('');
    try {
      const [a, c, r] = await Promise.all([fetch(`${API}/analytics`), fetch(`${API}/customers`), fetch(`${API}/rules`)]);
      const [ad, cd, rd] = await Promise.all([a.json(), c.json(), r.json()]);
      if (!a.ok || !ad.success) throw new Error(ad.error || 'Analytics API is unavailable. Start the backend and confirm its Python dependencies are installed.');
      setAnalytics(ad.data); setCustomers(cd.data || []); setRules(rd.data || []);
    } catch (e: any) { setProblem(e.message || 'Could not connect to the analytics service.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (query.trim().length < 2) { setMatches([]); return; }
    const timer = setTimeout(async () => {
      try { const r = await fetch(`${API}/products?query=${encodeURIComponent(query)}`); setMatches(await r.json()); } catch { setMatches([]); }
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (tab !== 'marketplace') return;
    let cancelled = false;
    setCatalogBusy(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/marketplace?query=${encodeURIComponent(catalogSearch)}&sort_by=${catalogSort}&page=1&limit=24`);
        const data = await res.json();
        if (!cancelled && res.ok && data.success) { setCatalog(data.products || []); setCatalogTotal(data.total_count || 0); }
      } catch { if (!cancelled) setProblem('Could not load products from the catalog.'); }
      finally { if (!cancelled) setCatalogBusy(false); }
    }, 180);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [tab, catalogSearch, catalogSort]);

  useEffect(() => {
    if (tab !== 'marketplace' || priceIndex.length) return;
    fetch(`${API}/marketplace?page=1&limit=5000`).then(r => r.json()).then(data => {
      if (data.success) setPriceIndex(data.products || []);
    }).catch(() => undefined);
  }, [tab, priceIndex.length]);

  useEffect(() => {
    if (tab !== 'marketplace' || basket.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/recommend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: basket, algorithm: 'fpgrowth', min_confidence: .1, min_support: .003, top_n: 8 }) });
        const data = await res.json();
        if (!cancelled && res.ok && data.success) setRecommendations(data.recommendations || []);
      } catch { if (!cancelled) setRecommendations([]); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [tab, basket]);

  const filteredCustomers = useMemo(() => customers.filter(c => segment === 'All' || c.Segment_Name === segment), [customers, segment]);
  const filteredRules = useMemo(() => rules.filter(r => `${r.antecedents} ${r.consequents}`.toLowerCase().includes(ruleSearch.toLowerCase())).slice(0, 100), [rules, ruleSearch]);
  const add = (product: string, applyDeal = false) => {
    setBasket(prev => prev.includes(product) ? prev : [...prev, product]);
    setCartQty(prev => ({ ...prev, [product]: (prev[product] || 0) + 1 }));
    if (applyDeal) setDiscountedItems(prev => prev.includes(product) ? prev : [...prev, product]);
    setQuery(''); setMatches([]); setRecommendations([]); setComparison(null);
  };
  const remove = (product: string) => {
    setBasket(prev => prev.filter(item => item !== product)); setRecommendations([]); setComparison(null);
    setCartQty(prev => { const next = { ...prev }; delete next[product]; return next; });
    setDiscountedItems(prev => prev.filter(item => item !== product));
  };
  const changeQty = (product: string, delta: number) => {
    const nextQty = (cartQty[product] || 1) + delta;
    if (nextQty <= 0) { remove(product); return; }
    setCartQty(prev => ({ ...prev, [product]: nextQty }));
  };
  const productByName = useMemo(() => new Map([...priceIndex, ...catalog].map(p => [String(p.description), p])), [catalog, priceIndex]);
  const cartSubtotal = basket.reduce((sum, name) => sum + Number(productByName.get(name)?.unit_price || 0) * (cartQty[name] || 1), 0);
  const cartSavings = discountedItems.reduce((sum, name) => sum + Number(productByName.get(name)?.unit_price || 0) * (cartQty[name] || 1) * .1, 0);
  const offerProducts = useMemo(() => {
    const seen = new Set<string>();
    return recommendations.flatMap(r => (r.recommended_products || [r.recommended_product]).map((name: string) => ({ ...r, offerProduct: name })))
      .filter(r => !basket.includes(r.offerProduct) && !seen.has(r.offerProduct) && Boolean(seen.add(r.offerProduct))).slice(0, 4);
  }, [recommendations, basket]);
  const recommend = async () => {
    if (!basket.length) return;
    setBusy(true); setRecommendations([]); setComparison(null);
    try {
      const res = await fetch(`${API}/recommend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ products: basket, algorithm, min_confidence: minConfidence, min_support: .003, top_n: 12 }) });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Recommendation request failed.');
      if (algorithm === 'compare') { setComparison(data.recommendations); setRecommendations([]); }
      else setRecommendations(data.recommendations || []);
    } catch (e: any) { setProblem(e.message); }
    finally { setBusy(false); }
  };

  const nav: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={18}/> },
    { id: 'marketplace', label: 'Marketplace', icon: <ShoppingBag size={18}/> },
    { id: 'basket', label: 'Basket analysis', icon: <ShoppingBasket size={18}/> },
    { id: 'customers', label: 'Customer segments', icon: <Users size={18}/> },
    { id: 'rules', label: 'Association rules', icon: <Boxes size={18}/> },
  ];

  return <div className="shell">
    <aside className="sidebar">
      <a className="brand" href="#overview"><span className="brand-mark"><ShoppingBasket size={20}/></span><span>Basket<span className="brand-accent">IQ</span><small>RETAIL INTELLIGENCE</small></span></a>
      <div className="nav-label">WORKSPACE</div>
      <nav>{nav.map(n => <button key={n.id} className={`nav-item ${tab === n.id ? 'active' : ''}`} onClick={() => setTab(n.id)}>{n.icon}<span>{n.label}</span>{tab === n.id && <i/>}</button>)}</nav>
      <div className="side-spacer"/>
      <div className="model-mini"><div className="mini-title"><span className="status-dot"/> MODELS READY</div><div><b>Apriori</b><span>Itemset mining</span></div><div><b>FP-Growth</b><span>Frequent patterns</span></div><div><b>K-Means</b><span>RFM segments</span></div></div>
      <div className="side-footer"><span className="avatar">DW</span><span><b>DWM Project</b><small>Retail analytics workspace</small></span><ChevronDown size={15}/></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="crumb"><span>Workspace</span><b>/</b>{nav.find(n => n.id === tab)?.label}</div><div className="top-actions"><span className="period"><span className="status-dot"/> ONLINE RETAIL · 2010—2011</span><button className="icon-button" aria-label="Help"><CircleHelp size={17}/></button><button className="icon-button" aria-label="Refresh data" onClick={load}><RefreshCw size={16}/></button><span className="avatar small-avatar">SS</span></div></header>
      <div className="page">
        {problem && <div className="alert"><CircleHelp size={18}/><div><b>Data service unavailable</b><span>{problem}</span></div><button onClick={() => setProblem('')}><X size={16}/></button></div>}
        {loading && <div className="loading"><LoaderCircle className="spin"/> Loading retail analytics…</div>}
        {!loading && tab === 'marketplace' && <>
          <div className="page-heading"><div><div className="eyebrow">BASKETIQ STORE</div><h1>Find your next favourite<span className="period-dot">.</span></h1><p>Shop popular products, then add a recommended pairing to unlock a bundle offer.</p></div><div className="store-basket-badge"><ShoppingBag size={17}/><span>{basket.reduce((n,p)=>n+(cartQty[p]||1),0)} items</span></div></div>
          <div className="promo-banner"><span className="promo-icon"><Tag size={20}/></span><div><strong>Add a recommended item. Save an extra 10%.</strong><span>Live FP-Growth recommendations mined from the project's invoice data.</span></div><span className="promo-tag">FP-GROWTH</span></div>
          <div className="store-toolbar"><div className="store-search"><Search size={16}/><input value={catalogSearch} onChange={e=>setCatalogSearch(e.target.value)} placeholder="Search the product catalogue"/><span>{catalogTotal.toLocaleString()} items</span></div><select aria-label="Sort products" value={catalogSort} onChange={e=>setCatalogSort(e.target.value)}><option value="popular">Most popular</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="name">Name: A to Z</option></select></div>
          <div className="market-layout"><section className="store-main"><div className="store-grid">{catalogBusy?<div className="store-loading"><LoaderCircle className="spin"/> Loading products…</div>:catalog.map((product,i)=><article className="store-card" key={product.stock_code || product.description}><div className={`store-product-art art-${i%6}`}><PackageSearch size={31}/><span>{product.category || 'Curated pick'}</span></div><div className="store-product-meta"><span>{product.category || 'Retail pick'}</span><span className="popularity">{Number(product.orders_count||0).toLocaleString()} orders</span></div><h3>{product.description}</h3><div className="store-price">{money(Number(product.unit_price||0))}<small>historical unit price</small></div><button className={`add-to-cart ${basket.includes(product.description)?'in-cart':''}`} onClick={()=>add(product.description)}>{basket.includes(product.description)?<><Plus size={15}/> Add another</>:<><ShoppingBag size={15}/> Add to basket</>}</button></article>)}{!catalogBusy&&catalog.length===0&&<div className="empty-results"><PackageSearch size={23}/><span>No matching products</span><small>Try another search term.</small></div>}</div><div className="store-footnote">Prices are historical average unit prices from the project dataset. Discounts are a simulated product demonstration; checkout and payment are not enabled.</div></section>
            <aside className="store-rail"><div className="panel cart-panel"><div className="panel-head"><div><h2>Your basket</h2><p>{basket.reduce((n,p)=>n+(cartQty[p]||1),0)} items · {basket.length} products</p></div><ShoppingBag className="head-icon" size={18}/></div>{basket.length===0?<div className="cart-empty"><ShoppingBag size={25}/><span>Your basket is empty</span><small>Add a product to see matching add-on deals.</small></div>:<><div className="cart-lines">{basket.map(product=>{const item=productByName.get(product);const qty=cartQty[product]||1;const discounted=discountedItems.includes(product);const price=Number(item?.unit_price||0);return <div className="cart-line" key={product}><div className="cart-line-copy"><b>{product}</b><span>{money(price)} each{discounted?' · 10% offer applied':''}</span></div><div className="qty-control"><button onClick={()=>changeQty(product,-1)} aria-label="Decrease quantity"><Minus size={12}/></button><span>{qty}</span><button onClick={()=>changeQty(product,1)} aria-label="Increase quantity"><Plus size={12}/></button></div><button className="remove-line" onClick={()=>remove(product)} aria-label="Remove product"><X size={14}/></button></div>})}</div><div className="cart-totals"><div><span>Subtotal</span><b>{money(cartSubtotal)}</b></div><div className="savings-row"><span>Bundle savings</span><b>−{money(cartSavings)}</b></div><div className="cart-total"><span>Estimated total</span><b>{money(Math.max(0,cartSubtotal-cartSavings))}</b></div></div><button className="clear-basket" onClick={()=>{setBasket([]);setCartQty({});setDiscountedItems([]);setRecommendations([])}}>Clear basket</button></>}
              <div className="add-on-title"><span><Sparkles size={14}/> Recommended for this basket</span><small>ADD & SAVE 10%</small></div>{basket.length===0?<p className="offer-hint">Add any product to get personalized add-on offers.</p>:busy?<p className="offer-hint">Finding products bought together…</p>:offerProducts.length?offerProducts.map((offer,i)=>{const item=productByName.get(offer.offerProduct);const price=Number(item?.unit_price||0);return <div className="addon-card" key={`${offer.offerProduct}-${i}`}><div className="addon-art"><PackageSearch size={19}/></div><div className="addon-copy"><b>{offer.offerProduct}</b><span>{price? <><s>{money(price)}</s> <strong>{money(price*.9)}</strong></>:'10% off when added'}</span><small>{(offer.confidence*100).toFixed(0)}% of matching baskets also include this</small></div><button onClick={()=>add(offer.offerProduct,true)} disabled={discountedItems.includes(offer.offerProduct)}>{discountedItems.includes(offer.offerProduct)?'Added ✓':'Add deal'}</button></div>}):<p className="offer-hint">No matching offer found for this basket yet. Try adding a popular product.</p>}
              <div className="offer-disclaimer">Offer preview: the 10% add-on discount is simulated and applies to recommended items in this demo basket.</div>
            </div></aside>
          </div>
        </>}
        {!loading && tab === 'overview' && <>
          <div className="page-heading"><div><div className="eyebrow">RETAIL PERFORMANCE</div><h1>Good morning<span className="period-dot">.</span></h1><p>Your store performance and customer behavior at a glance.</p></div><button className="button-secondary" onClick={load}><RefreshCw size={15}/> Refresh data</button></div>
          <section className="kpi-grid">
            <Kpi label="Total revenue" value={money(analytics?.total_revenue)} sub="Across all completed orders" icon={<Activity/>} tone="purple" />
            <Kpi label="Transactions" value={Number(analytics?.total_transactions || 0).toLocaleString()} sub="Unique customer invoices" icon={<ShoppingBasket/>} tone="blue" />
            <Kpi label="Customers" value={Number(analytics?.total_customers || 0).toLocaleString()} sub="Identified retail customers" icon={<Users/>} tone="green" />
            <Kpi label="Products" value={Number(analytics?.total_products || 0).toLocaleString()} sub="Distinct catalog items" icon={<PackageSearch/>} tone="amber" />
          </section>
          <section className="chart-grid">
            <div className="panel revenue-panel"><div className="panel-head"><div><h2>Revenue over time</h2><p>Monthly sales performance</p></div><span className="tag"><i/> Revenue</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={analytics?.monthly_trend || []} margin={{top:10,right:16,left:0,bottom:0}}><CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="MonthYear" tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:11}}/><YAxis tickFormatter={v => `£${Math.round(v/1000)}k`} tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:11}}/><Tooltip formatter={(v:any)=>[money(v),'Revenue']} contentStyle={{borderRadius:12,border:'1px solid #edf0f5',boxShadow:'0 8px 24px #19234412'}}/><Line type="monotone" dataKey="revenue" stroke="#6267e8" strokeWidth={3} dot={false} activeDot={{r:5,fill:'#6267e8'}}/></LineChart></ResponsiveContainer></div></div>
            <div className="panel segment-panel"><div className="panel-head"><div><h2>Customer mix</h2><p>RFM customer segments</p></div><span className="subtle-link" onClick={()=>setTab('customers')}>View segments →</span></div><div className="chart donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={Object.entries(analytics?.cluster_distribution || {}).map(([name,value])=>({name,value}))} dataKey="value" nameKey="name" innerRadius={63} outerRadius={88} paddingAngle={3} stroke="none">{Object.keys(analytics?.cluster_distribution || {}).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer><div className="donut-center"><b>{Number(analytics?.total_customers || 0).toLocaleString()}</b><span>customers</span></div></div><div className="legend-list">{Object.entries(analytics?.cluster_distribution || {}).map(([name,value],i)=><div key={name}><i style={{background:COLORS[i%COLORS.length]}}/><span>{name}</span><b>{Number(value).toLocaleString()}</b></div>)}</div></div>
          </section>
          <section className="lower-grid"><div className="panel"><div className="panel-head"><div><h2>Top products</h2><p>Best sellers by quantity</p></div><span className="subtle-link" onClick={()=>setTab('basket')}>Explore baskets →</span></div><div className="chart product-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={(analytics?.top_products || []).slice(0,7)} layout="vertical" margin={{left:5,right:20}}><CartesianGrid stroke="#edf0f5" horizontal={false}/><XAxis type="number" hide/><YAxis type="category" dataKey="Description" width={155} tickLine={false} axisLine={false} tick={{fill:'#667085',fontSize:11}}/><Tooltip/><Bar dataKey="quantity" fill="#8589ee" radius={[0,5,5,0]} barSize={16}/></BarChart></ResponsiveContainer></div></div><div className="panel algo-panel"><div className="panel-head"><div><h2>Mining toolkit</h2><p>Three methods, two analytical tasks</p></div><BrainCircuit size={18} className="head-icon"/></div><div className="algo-row"><span className="algo-icon purple"><Boxes size={17}/></span><div><b>Apriori</b><small>Association rule mining · baseline</small></div><span className="algo-state">READY</span></div><div className="algo-row"><span className="algo-icon blue"><Sparkles size={17}/></span><div><b>FP-Growth</b><small>Association rule mining · scalable</small></div><span className="algo-state">READY</span></div><div className="algo-row"><span className="algo-icon green"><Users size={17}/></span><div><b>K-Means</b><small>Customer segmentation · RFM</small></div><span className="algo-state">READY</span></div><div className="note-box">Association algorithms find products purchased together. K-Means groups customers by recency, frequency, and spend.</div></div></section>
          <section className="analysis-grid">
            <div className="panel analytical-panel"><div className="panel-head"><div><h2>Revenue by country</h2><p>Top sales markets in the dataset</p></div><span className="tag"><i/> Market view</span></div><div className="analysis-chart country-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics?.country_distribution || []} layout="vertical" margin={{left:4,right:22,top:4,bottom:0}}><CartesianGrid stroke="#edf0f5" horizontal={false}/><XAxis type="number" tickFormatter={v=>`£${Math.round(v/1000)}k`} tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:10}}/><YAxis type="category" dataKey="Country" width={118} tickLine={false} axisLine={false} tick={{fill:'#667085',fontSize:10}}/><Tooltip formatter={(v:any)=>[money(v),'Revenue']}/><Bar dataKey="revenue" fill="#696de7" radius={[0,5,5,0]} barSize={16}/></BarChart></ResponsiveContainer></div></div>
            <div className="panel analytical-panel"><div className="panel-head"><div><h2>When customers shop</h2><p>Distinct invoices by day of week</p></div><span className="tag"><i/> Demand pattern</span></div><div className="analysis-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={analytics?.day_distribution || []} margin={{left:-18,right:4,top:15,bottom:0}}><CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:9}}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:9}}/><Tooltip/><Bar dataKey="transactions" name="Invoices" fill="#42b38c" radius={[5,5,0,0]} barSize={24}/></BarChart></ResponsiveContainer></div></div>
          </section>
          <section className="analysis-grid">
            <div className="panel analytical-panel"><div className="panel-head"><div><h2>Sales by hour</h2><p>Invoice activity across the day</p></div><span className="tag"><i/> Hourly</span></div><div className="analysis-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics?.hourly_distribution || []} margin={{left:-18,right:5,top:12,bottom:0}}><defs><linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#898cf0" stopOpacity={.28}/><stop offset="95%" stopColor="#898cf0" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="hour" tickFormatter={v=>`${v}:00`} tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:9}}/><YAxis tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:9}}/><Tooltip labelFormatter={v=>`${v}:00`}/><Area type="monotone" dataKey="transactions" name="Invoices" stroke="#696de7" fill="url(#hourFill)" strokeWidth={2.5}/></AreaChart></ResponsiveContainer></div></div>
            <div className="panel analytical-panel"><div className="panel-head"><div><h2>Order size distribution</h2><p>Invoices grouped by total item quantity</p></div><span className="tag"><i/> Basket profile</span></div><div className="analysis-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={Object.entries(analytics?.basket_size_distribution || {}).map(([name,value])=>({name,orders:value}))} layout="vertical" margin={{left:8,right:22,top:6,bottom:0}}><CartesianGrid stroke="#edf0f5" horizontal={false}/><XAxis type="number" tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:9}}/><YAxis type="category" dataKey="name" width={148} tickLine={false} axisLine={false} tick={{fill:'#667085',fontSize:9}}/><Tooltip/><Bar dataKey="orders" name="Invoices" fill="#e3a84e" radius={[0,5,5,0]} barSize={17}/></BarChart></ResponsiveContainer></div></div>
          </section>
          <section className="analysis-grid">
            <div className="panel analytical-panel"><div className="panel-head"><div><h2>Category contribution</h2><p>Revenue share · keyword-derived product groups</p></div><span className="tag"><i/> Product mix</span></div><div className="category-layout"><div className="category-donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics?.category_contributions || []} dataKey="revenue" nameKey="Category" innerRadius={54} outerRadius={79} paddingAngle={2} stroke="none">{(analytics?.category_contributions || []).map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip formatter={(v:any)=>[money(v),'Revenue']}/></PieChart></ResponsiveContainer></div><div className="category-legend">{(analytics?.category_contributions || []).map((row:any,i:number)=><div key={row.Category}><i style={{background:COLORS[i%COLORS.length]}}/><span>{row.Category}</span><b>{money(row.revenue)}</b></div>)}</div></div></div>
            <div className="panel analytical-panel"><div className="panel-head"><div><h2>Monthly sales by category</h2><p>Revenue across estimated product groups</p></div><span className="tag"><i/> Monthly</span></div><div className="analysis-chart category-trend"><ResponsiveContainer width="100%" height="100%"><AreaChart data={analytics?.stacked_category_monthly || []} margin={{left:0,right:10,top:12,bottom:0}}><CartesianGrid stroke="#edf0f5" vertical={false}/><XAxis dataKey="Month" tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:9}}/><YAxis tickFormatter={v=>`£${Math.round(v/1000)}k`} tickLine={false} axisLine={false} tick={{fill:'#8991a4',fontSize:9}}/><Tooltip formatter={(v:any)=>[money(v),'Revenue']}/><Legend iconType="circle" wrapperStyle={{fontSize:9}}/>{(analytics?.category_contributions || []).map((row:any,i:number)=><Area key={row.Category} type="monotone" dataKey={row.Category} name={row.Category} stackId="1" stroke={COLORS[i%COLORS.length]} fill={COLORS[i%COLORS.length]} fillOpacity={.72}/>)}</AreaChart></ResponsiveContainer></div></div>
          </section>
          <section className="panel country-table-panel"><div className="panel-head"><div><h2>Market performance</h2><p>Revenue, order count, and average order value by country</p></div></div><div className="table-scroll"><table><thead><tr><th>Country</th><th>Revenue</th><th>Orders</th><th>Customers</th><th>Average order value</th><th>Items sold</th></tr></thead><tbody>{(analytics?.country_matrix || []).slice(0,10).map((row:any)=><tr key={row.Country}><td className="strong">{row.Country}</td><td>{money(row.revenue)}</td><td>{Number(row.orders).toLocaleString()}</td><td>{Number(row.customers).toLocaleString()}</td><td>{money(row.aov)}</td><td>{Number(row.items_sold).toLocaleString()}</td></tr>)}</tbody></table></div></section>
          <div className="footnote"><span>Dataset: UCI Online Retail</span><span>Customer behavior analytics · historical data</span></div>
        </>}
        {!loading && tab === 'basket' && <><div className="page-heading"><div><div className="eyebrow">PRODUCT DISCOVERY</div><h1>Basket analysis<span className="period-dot">.</span></h1><p>Compare frequent-itemset approaches and discover products often bought together.</p></div><span className="context-badge"><Boxes size={15}/> 2 mining algorithms + comparison</span></div><div className="algorithm-switch"><button className={algorithm==='apriori'?'selected':''} onClick={()=>{setAlgorithm('apriori');setRecommendations([]);setComparison(null)}}><span className="algo-icon purple"><Boxes size={17}/></span><span><b>Apriori</b><small>Precomputed rules</small></span></button><button className={algorithm==='fpgrowth'?'selected':''} onClick={()=>{setAlgorithm('fpgrowth');setRecommendations([]);setComparison(null)}}><span className="algo-icon blue"><Sparkles size={17}/></span><span><b>FP-Growth</b><small>Live FP-tree mining</small></span></button><button className={algorithm==='compare'?'selected':''} onClick={()=>{setAlgorithm('compare');setRecommendations([]);setComparison(null)}}><span className="algo-icon green"><Activity size={17}/></span><span><b>Compare both</b><small>Same inputs</small></span></button><div className="algo-explain">{algorithm==='apriori'?'Filters the saved Apriori rule set for your basket and thresholds. FP-Growth mines transaction data at request time.':'FP-Growth builds an FP-tree from real invoice baskets and mines without candidate generation. Compare runs both on the same basket and thresholds.'}</div></div><div className="basket-layout"><div className="panel basket-panel"><div className="panel-head"><div><h2>Build a sample basket</h2><p>Search the product catalog and select items</p></div><ShoppingBasket className="head-icon"/></div><div className="search-wrap"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products, e.g. candle holder"/><kbd>⌘ K</kbd>{matches.length>0&&<div className="suggestions">{matches.map(p=><button key={p} onClick={()=>add(p)}>{p}<span>+ Add</span></button>)}</div>}</div><div className="basket-items">{basket.length===0?<div className="basket-empty"><ShoppingBasket size={24}/><span>Your basket is empty</span><small>Search above to add products</small></div>:basket.map(item=><div className="basket-item" key={item}><span className="product-square"><PackageSearch size={17}/></span><span>{item}</span><button onClick={()=>remove(item)} aria-label="Remove"><X size={16}/></button></div>)}</div><div className="basket-actions"><span>{basket.length} selected</span><button className="button-primary" onClick={recommend} disabled={!basket.length||busy}>{busy?<LoaderCircle className="spin" size={16}/>:<Sparkles size={16}/>} Find complementary items</button></div><div className="slider-wrap"><label>Minimum confidence <b>{(minConfidence*100).toFixed(0)}%</b></label><input type="range" min="0.05" max="0.8" step="0.05" value={minConfidence} onChange={e=>setMinConfidence(Number(e.target.value))}/><div><span>5%</span><span>80%</span></div></div></div><div className="panel method-panel"><div className="panel-head"><div><h2>How it works</h2><p>Interpretable product relationships</p></div><CircleHelp size={17} className="head-icon"/></div><div className="method-step"><span>01</span><div><b>Find co-purchases</b><p>The selected algorithm searches historical transactions for item combinations.</p></div></div><div className="method-step"><span>02</span><div><b>Generate rules</b><p>Rules are ranked by support, confidence, and lift to describe useful patterns.</p></div></div><div className="method-step"><span>03</span><div><b>Review suggestions</b><p>Recommendations describe association in this dataset, not causation.</p></div></div><div className="metric-def"><b>Confidence</b><span>Among baskets containing the selected item(s), the share that also contain the recommendation.</span></div><div className="metric-def"><b>Support</b><span>Share of all baskets containing the complete item combination.</span></div></div></div><div className="results-head"><div><h2>Recommended pairings</h2><p>{comparison?'Side-by-side results on the same basket and thresholds':recommendations.length?`Results using ${algorithm==='apriori'?'Apriori':'FP-Growth'}`:'Run the analysis to see complementary products'}</p></div></div>{comparison?<div className="comparison-grid">{['apriori','fpgrowth'].map(key=>{const rows=comparison[key]||[];return <section className="panel comparison-panel" key={key}><div className="panel-head"><div><h2>{key==='apriori'?'Apriori · saved rules':'FP-Growth · live mining'}</h2><p>{rows.length} recommendations meet these thresholds</p></div></div>{rows.length?rows.slice(0,5).map((r:any,i:number)=><div className="compare-rule" key={i}><b>{r.recommended_product}</b><span>Confidence {(r.confidence*100).toFixed(1)}% · Support {(r.support*100).toFixed(2)}% · Lift {Number(r.lift).toFixed(2)}×</span><small>{r.matched_rule}</small></div>):<div className="empty-results compact-empty">No rules matched the selected thresholds.</div>}</section>})}</div>:recommendations.length>0?<div className="recommend-grid">{recommendations.map((r,i)=><div className="recommend-card" key={`${r.matched_rule}-${i}`}><div className="recommend-rank">PAIRING {String(i+1).padStart(2,'0')}</div><h3>{r.recommended_product}</h3><p>{r.explanation}</p><div className="metric-pills"><span>Confidence <b>{(r.confidence*100).toFixed(1)}%</b></span><span>Support <b>{(r.support*100).toFixed(2)}%</b></span>{r.lift&&<span>Lift <b>{Number(r.lift).toFixed(2)}×</b></span>}</div><code>{r.matched_rule}</code></div>)}</div>:<div className="empty-results"><Sparkles size={22}/><span>No recommendations to show yet</span><small>Add one or more products, then run basket analysis.</small></div>}</>}
        {!loading && tab === 'customers' && <><div className="page-heading"><div><div className="eyebrow">CUSTOMER INTELLIGENCE</div><h1>Customer segments<span className="period-dot">.</span></h1><p>K-Means groups customers using their recency, order frequency, and monetary value.</p></div><span className="context-badge"><Users size={15}/> {customers.length.toLocaleString()} customers</span></div><div className="segment-cards">{Object.entries(analytics?.cluster_distribution||{}).map(([name,count],i)=><button className={`segment-card ${segment===name?'chosen':''}`} key={name} onClick={()=>setSegment(segment===name?'All':name)}><i style={{background:COLORS[i%COLORS.length]}}/><span>{name}</span><b>{Number(count).toLocaleString()}</b><small>customers · {customers.length?((Number(count)/customers.length)*100).toFixed(1):0}%</small></button>)}</div><div className="panel table-panel"><div className="panel-head"><div><h2>Customer profiles</h2><p>RFM values and assigned segment</p></div><button className="filter-button" onClick={()=>setSegment('All')}><Filter size={14}/>{segment==='All'?'All segments':'Clear filter'}</button></div><div className="table-scroll"><table><thead><tr><th>Customer ID</th><th>Segment</th><th>Recency</th><th>Frequency</th><th>Monetary value</th></tr></thead><tbody>{filteredCustomers.slice(0,100).map(c=><tr key={c.CustomerID}><td className="strong">{c.CustomerID}</td><td><span className="segment-pill"><i style={{background:COLORS[Number(c.Cluster)%COLORS.length]}}/>{c.Segment_Name}</span></td><td>{c.Recency} days</td><td>{c.Frequency} orders</td><td>{money(c.Monetary)}</td></tr>)}</tbody></table></div><div className="table-foot">Showing {Math.min(100,filteredCustomers.length)} of {filteredCustomers.length.toLocaleString()} customers</div></div></>}
        {!loading && tab === 'rules' && <><div className="page-heading"><div><div className="eyebrow">ASSOCIATION DISCOVERY</div><h1>Association rules<span className="period-dot">.</span></h1><p>Explore product relationships discovered by Apriori in historical baskets.</p></div><span className="context-badge"><Boxes size={15}/> {rules.length.toLocaleString()} rules</span></div><div className="panel table-panel"><div className="panel-head"><div><h2>Discovered relationships</h2><p>Ranked by lift · Apriori output</p></div><div className="table-search"><Search size={15}/><input placeholder="Find a product" value={ruleSearch} onChange={e=>setRuleSearch(e.target.value)}/></div></div><div className="table-scroll"><table><thead><tr><th>When basket includes</th><th>Often includes</th><th>Support</th><th>Confidence</th><th>Lift</th></tr></thead><tbody>{filteredRules.map((r,i)=><tr key={i}><td>{r.antecedents}</td><td className="strong">{r.consequents}</td><td>{(Number(r.support)*100).toFixed(2)}%</td><td>{(Number(r.confidence)*100).toFixed(1)}%</td><td><span className="lift-pill">{Number(r.lift).toFixed(2)}×</span></td></tr>)}</tbody></table></div><div className="table-foot">Showing {filteredRules.length} matching rules</div></div></>}
        <footer className="app-footer"><span>BasketIQ · Retail intelligence</span><span>Historical associations are descriptive, not causal.</span></footer>
      </div>
    </main>
  </div>;
}

function Kpi({label,value,sub,icon,tone}:{label:string;value:string;sub:string;icon:React.ReactNode;tone:string}) { return <div className="kpi-card"><div className={`kpi-icon ${tone}`}>{icon}</div><div className="kpi-label">{label}</div><div className="kpi-value">{value||'—'}</div><div className="kpi-sub">{sub}</div></div>; }
export default App;
