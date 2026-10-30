import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, type ApiAlert, type ApiEvent, type MetricsSummary } from './services/api';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Cable,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gauge,
  LayoutDashboard,
  Menu,
  Network,
  RefreshCw,
  Route,
  Search,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Page = 'Overview' | 'Topology' | 'Traffic monitoring' | 'Traffic engineering' | 'Congestion alerts' | 'Link management' | 'Analytics' | 'Event logs' | 'Settings';

const pages: { name: Page; icon: any; group: string }[] = [
  { name: 'Overview', icon: LayoutDashboard, group: 'MONITOR' },
  { name: 'Topology', icon: Network, group: 'MONITOR' },
  { name: 'Traffic monitoring', icon: Activity, group: 'MONITOR' },
  { name: 'Traffic engineering', icon: Route, group: 'OPTIMIZATION' },
  { name: 'Congestion alerts', icon: AlertTriangle, group: 'OPTIMIZATION' },
  { name: 'Link management', icon: Cable, group: 'OPTIMIZATION' },
  { name: 'Analytics', icon: Gauge, group: 'INSIGHTS' },
  { name: 'Event logs', icon: Clock3, group: 'INSIGHTS' },
  { name: 'Settings', icon: Settings, group: 'SYSTEM' },
];

const traffic = Array.from({ length: 16 }, (_, i) => ({
  time: `${String(9 + Math.floor((i * 5) / 60)).padStart(2, '0')}:${String((i * 5) % 60).padStart(2, '0')}`,
  inbound: 38 + Math.sin(i / 2) * 13 + i * 0.7,
  outbound: 24 + Math.cos(i / 2.2) * 8 + i * 0.35,
}));

const initialLinks = [
  { id: 'WAN-LINK-01', from: 'Branch A', to: 'Core 01', capacity: 100, usage: 86, latency: 42, status: 'Congested', path: 'Primary' },
  { id: 'WAN-LINK-02', from: 'Core 01', to: 'Data Center', capacity: 100, usage: 34, latency: 18, status: 'Healthy', path: 'Primary' },
  { id: 'WAN-LINK-03', from: 'Branch A', to: 'Core 02', capacity: 200, usage: 28, latency: 24, status: 'Healthy', path: 'Backup' },
  { id: 'WAN-LINK-04', from: 'Core 02', to: 'Data Center', capacity: 200, usage: 19, latency: 21, status: 'Healthy', path: 'Backup' },
  { id: 'WAN-LINK-05', from: 'Branch B', to: 'Core 01', capacity: 100, usage: 63, latency: 31, status: 'Warning', path: 'Primary' },
];

const events = [
  { id: 'evt-1', time: '10:42:18', type: 'Congestion', severity: 'Critical', message: 'WAN-LINK-01 crossed 85% utilization' },
  { id: 'evt-2', time: '10:39:04', type: 'Topology', severity: 'Info', message: 'OpenFlow switch core-02 connected' },
  { id: 'evt-3', time: '10:35:51', type: 'Monitoring', severity: 'Warning', message: 'Latency on Branch B path increased to 31 ms' },
  { id: 'evt-4', time: '10:30:12', type: 'Controller', severity: 'Info', message: 'Controller heartbeat received' },
];

function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Metric({
  title,
  value,
  unit,
  change,
  icon: Icon,
  tone = 'blue',
}: {
  title: string;
  value: string;
  unit: string;
  change: string;
  icon: any;
  tone?: string;
}) {
  return (
    <div className="metric card">
      <div className="metric-top">
        <span>{title}</span>
        <span className={`metric-icon ${tone}`}><Icon size={17} /></span>
      </div>
      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>
      <div className="metric-foot">
        <span className="positive"><ArrowUpRight size={14} />{change}</span>
        <span>vs previous hour</span>
      </div>
    </div>
  );
}

function Topology() {
  return (
    <div className="topology card">
      <div className="topology-head">
        <div>
          <h3>WAN network topology</h3>
          <p>Logical view · 5 nodes · 5 links</p>
        </div>
        <div className="legend">
          <span><i className="dot green" />Healthy</span>
          <span><i className="dot amber" />Congested</span>
          <span><i className="dot red" />Down</span>
        </div>
      </div>
      <svg viewBox="0 0 760 300" role="img" aria-label="WAN topology with two paths from Branch A through Core 01 or Core 02 to Data Center">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path d="M120 145 L300 75 L500 145 L670 145" className="edge amberline" />
        <path d="M120 145 L300 230 L500 145" className="edge greenline" />
        <path d="M500 145 L670 145" className="edge greenline" />
        <path d="M300 75 L500 145" className="edge amberline" />

        <g className="node" transform="translate(120 145)">
          <circle r="31" />
          <circle r="22" className="node-inner" />
          <text y="5" textAnchor="middle">BR</text>
          <text y="55" textAnchor="middle" className="node-label">Branch A</text>
        </g>
        <g className="node warning" transform="translate(300 75)">
          <circle r="31" />
          <circle r="22" className="node-inner" />
          <text y="5" textAnchor="middle">C1</text>
          <text y="55" textAnchor="middle" className="node-label">Core 01</text>
        </g>
        <g className="node" transform="translate(300 230)">
          <circle r="31" />
          <circle r="22" className="node-inner" />
          <text y="5" textAnchor="middle">C2</text>
          <text y="55" textAnchor="middle" className="node-label">Core 02</text>
        </g>
        <g className="node" transform="translate(500 145)">
          <circle r="31" />
          <circle r="22" className="node-inner" />
          <text y="5" textAnchor="middle">GW</text>
          <text y="55" textAnchor="middle" className="node-label">WAN Gateway</text>
        </g>
        <g className="node destination" transform="translate(670 145)">
          <circle r="31" />
          <circle r="22" className="node-inner" />
          <text y="5" textAnchor="middle">DC</text>
          <text y="55" textAnchor="middle" className="node-label">Data Center</text>
        </g>

        <text x="204" y="91" className="edge-label">86% · 42 ms</text>
        <text x="205" y="205" className="edge-label">28% · 24 ms</text>
        <text x="570" y="128" className="edge-label">34% · 18 ms</text>
      </svg>
      <div className="topology-note"><span className="pulse" /> Live topology preview <span className="muted">· Demonstration network data</span></div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState<Page>('Overview');
  const [links, setLinks] = useState(initialLinks);
  const [reroutes, setReroutes] = useState(3);
  const [alerts, setAlerts] = useState(true);
  const [mobile, setMobile] = useState(false);
  const [query, setQuery] = useState('');

  const [apiConnected, setApiConnected] = useState(false);
  const [controllerConnected, setControllerConnected] = useState(false);
  const [apiMode, setApiMode] = useState('offline');
  const [apiError, setApiError] = useState('');
  const [apiEvents, setApiEvents] = useState<ApiEvent[]>([]);
  const [apiAlerts, setApiAlerts] = useState<ApiAlert[]>([]);
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    let active = true;

    async function loadBackendData() {
      try {
        const [health, linksResponse, metricsResponse, eventsResponse, alertsResponse] = await Promise.all([
          api.health(),
          api.links(),
          api.metrics(),
          api.events(),
          api.alerts(),
        ]);

        if (!active) return;

        const nodeNames: Record<string, string> = {
          h1: 'Branch A',
          s1: 'Edge Switch',
          s2: 'Primary Core',
          s3: 'Backup Core',
          s4: 'Data Centre Gateway',
          h2: 'Data Centre',
        };

        const convertedLinks = linksResponse.data.map((link) => ({
          id: link.id,
          from: nodeNames[link.source] || link.source,
          to: nodeNames[link.target] || link.target,
          capacity: link.capacity_mbps,
          usage: link.utilization_percent,
          latency: link.latency_ms,
          status:
            link.status === 'down'
              ? 'Down'
              : link.utilization_percent >= 85
                ? 'Congested'
                : link.utilization_percent >= 70
                  ? 'Warning'
                  : 'Healthy',
          path: ['L2', 'L3'].includes(link.id)
            ? 'Primary'
            : ['L4', 'L5'].includes(link.id)
              ? 'Backup'
              : 'Edge',
        }));

        setLinks(convertedLinks);
        setMetrics(metricsResponse.data);
        setApiEvents(eventsResponse.data);
        setApiAlerts(alertsResponse.data);
        setControllerConnected(health.controller_connected);
        setApiMode(health.mode);
        setApiConnected(true);
        setApiError('');
      } catch (error) {
        if (!active) return;

        setApiConnected(false);
        setApiError(error instanceof Error ? error.message : 'Unable to connect to backend');
      }
    }

    loadBackendData();
    const interval = window.setInterval(loadBackendData, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const avg = useMemo(
    () => Math.round(links.reduce((total, link) => total + link.usage, 0) / links.length),
    [links]
  );

  const reroute = async () => {
    setActionMessage('Contacting traffic engineering API...');

    try {
      const response = await api.optimize('h1', 'h2');
      const result = await response.json();

      if (!response.ok) {
        setActionMessage(result.message || 'Optimization is currently unavailable.');
        return;
      }

      if (result.openflow_rules_installed === true) {
        setReroutes((value) => value + 1);
        setActionMessage('Traffic route successfully updated.');
      } else {
        setActionMessage('No OpenFlow rules were confirmed as installed.');
      }
    } catch {
      setActionMessage('Unable to contact the backend.');
    }

    setPage('Traffic engineering');
  };

  const filtered = links.filter((link) =>
    (link.id + link.from + link.to + link.status).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobile ? 'show' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Activity size={21} /></div>
          <div><b>NetPulse</b><small>SDN WAN MANAGER</small></div>
          <button className="mobile-close" onClick={() => setMobile(false)}><X size={18} /></button>
        </div>

        <div className="workspace">
          <div className="workspace-icon"><Network size={17} /></div>
          <div><b>Enterprise WAN</b><small>Production environment</small></div>
          <ChevronDown size={15} />
        </div>

        {['MONITOR', 'OPTIMIZATION', 'INSIGHTS', 'SYSTEM'].map((group) => (
          <div className="nav-group" key={group}>
            <div className="nav-label">{group}</div>
            {pages.filter((pageItem) => pageItem.group === group).map((item) => (
              <button
                key={item.name}
                className={`nav-item ${page === item.name ? 'active' : ''}`}
                onClick={() => {
                  setPage(item.name);
                  setMobile(false);
                }}
              >
                <item.icon size={17} />
                <span>{item.name}</span>
                {item.name === 'Congestion alerts' && <em>2</em>}
              </button>
            ))}
          </div>
        ))}

        <div className="sidebar-bottom">
          <div className="controller-status">
            <span className="pulse" />
            <div>
              <b>{controllerConnected ? 'Controller connected' : 'Controller disconnected'}</b>
              <small>{apiConnected ? `API connected · ${apiMode} mode` : 'Backend unavailable'}</small>
            </div>
          </div>
          <div className="user-row">
            <div className="avatar">NA</div>
            <div><b>Network Admin</b><small>Administrator</small></div>
            <ChevronDown size={15} />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="top-left">
            <button className="hamburger" onClick={() => setMobile(true)}><Menu /></button>
            <div className="breadcrumb">Network management <span>/</span> <b>{page}</b></div>
          </div>

          <div className="top-actions">
            <div className="system-live"><span className="pulse" />All systems operational</div>
            <button className="icon-btn" title="Search"><Search size={18} /></button>
            <button className="icon-btn notification" title="Notifications" onClick={() => setPage('Congestion alerts')}><Bell size={18} /><i /></button>
            <div className="top-avatar">NA</div>
          </div>
        </header>

        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">NETWORK OPERATIONS CENTER <span>•</span> FRIDAY, OCTOBER 30, 2026</div>
              <h1>{page === 'Overview' ? 'Network overview' : page}</h1>
              <p>
                {page === 'Overview'
                  ? 'Monitor WAN health, traffic performance and optimization activity in real time.'
                  : `Manage and inspect ${page.toLowerCase()} across your enterprise WAN.`}
              </p>
            </div>

            <div className="heading-actions">
              <Badge tone={apiConnected ? 'success' : 'danger'}>{apiConnected ? 'API CONNECTED' : 'API OFFLINE'}</Badge>
              {apiError && (
                <div className="alert-row">
                  <AlertTriangle className="danger-text" />
                  <div>
                    <b>Backend connection error</b>
                    <p>{apiError}</p>
                  </div>
                  <Badge tone="danger">Offline</Badge>
                </div>
              )}
              <button className="secondary-btn" onClick={() => { setLinks(initialLinks); setReroutes(3); }}><RefreshCw size={15} /> Reset demo</button>
              <button className="primary-btn" onClick={reroute}><Route size={15} /> Optimize traffic</button>
            </div>
          </div>

          {page === 'Overview' && (
            <div className="metrics-grid">
              <Metric title="Network availability" value="N/A" unit="" change="Not measured" icon={ShieldCheck} tone="green" />
              <Metric title="Average throughput" value="N/A" unit="" change="Not measured" icon={Activity} />
              <Metric title="Average latency" value="N/A" unit="" change="Not measured" icon={Clock3} tone="purple" />
              <Metric title="Active links" value={String(metrics?.links_up ?? 0)} unit={`/ ${metrics?.links_total ?? 0}`} change={apiConnected ? 'Backend data' : 'API offline'} icon={Cable} tone="green" />
            </div>
          )}

          {page === 'Topology' && <Topology />}

          {page === 'Traffic monitoring' && (
            <div className="card chart-card">
              <div className="card-heading">
                <div>
                  <h3>Live traffic monitoring</h3>
                  <p>Sample throughput series · replace with controller metrics during integration</p>
                </div>
                <Badge tone="info">DEMO STREAM</Badge>
              </div>
              <div className="chart tall">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={traffic}>
                    <CartesianGrid stroke="#222b3b" strokeDasharray="3 5" />
                    <XAxis dataKey="time" tick={{ fill: '#78869b', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#78869b', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#111a29', border: '1px solid #29364a' }} />
                    <Line dataKey="inbound" stroke="#24c8d8" strokeWidth={2} dot={false} />
                    <Line dataKey="outbound" stroke="#9277f5" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {page === 'Traffic engineering' && (
            <div className="engineering-grid">
              <div className="card">
                <div className="card-heading">
                  <div>
                    <h3>Traffic optimization</h3>
                    <p>Capacity-aware path selection · demonstration action</p>
                  </div>
                  <Badge tone="success">Ready</Badge>
                </div>

                <div className="route-box">
                  <div className="route-head">
                    <b>Current route</b>
                    <Badge tone="warning">High utilization</Badge>
                  </div>
                  <div className="route-flow">
                    <span>Branch A</span><i /><span>Core 01</span><i /><span>Gateway</span><i /><span>Data Center</span>
                  </div>
                  <small>WAN-LINK-01 · 86% utilization · 42 ms</small>
                </div>

                <div className="route-box recommended">
                  <div className="route-head">
                    <b>Recommended route</b>
                    <Badge tone="success">Available capacity</Badge>
                  </div>
                  <div className="route-flow">
                    <span>Branch A</span><i /><span>Core 02</span><i /><span>Gateway</span><i /><span>Data Center</span>
                  </div>
                  <small>Backup path · 28% utilization · 24 ms</small>
                </div>

                <button className="primary-btn full" onClick={reroute}><Route size={16} /> Apply demo reroute</button>

                {actionMessage && (
                  <div className="alert-row">
                    <div>
                      <b>Optimization response</b>
                      <p>{actionMessage}</p>
                    </div>
                  </div>
                )}

                <p className="disclaimer">Demo interaction only: updates local sample values. No OpenFlow rules are sent yet.</p>
              </div>

              <div className="card">
                <h3>Optimization summary</h3>
                <div className="summary-stat"><span>Reroutes executed</span><b>{reroutes}</b></div>
                <div className="summary-stat"><span>Current avg. link utilization</span><b>{avg}%</b></div>
                <div className="summary-stat"><span>Routing algorithm</span><b>Weighted shortest path</b></div>
                <div className="summary-stat"><span>Capacity validation</span><Badge tone="success">Enabled in design</Badge></div>
              </div>
            </div>
          )}

          {page === 'Congestion alerts' && (
            <div className="card table-card">
              <div className="card-heading">
                <div>
                  <h3>Congestion and network alerts</h3>
                  <p>Threshold-based events · demonstration data</p>
                </div>
                <Badge tone="warning">2 open</Badge>
              </div>

              <div className="alert-row">
                <AlertTriangle className="danger-text" />
                <div>
                  <b>WAN-LINK-01 utilization above threshold</b>
                  <p>86% utilization exceeds configured 85% trigger.</p>
                </div>
                <Badge tone="danger">Critical</Badge>
              </div>

              <div className="alert-row">
                <Clock3 className="warning-text" />
                <div>
                  <b>Branch B latency elevated</b>
                  <p>31 ms is above the 30 ms warning threshold.</p>
                </div>
                <Badge tone="warning">Warning</Badge>
              </div>

              <button className="secondary-btn" onClick={() => setAlerts(false)}><CheckCircle2 size={15} /> Acknowledge alerts</button>
            </div>
          )}

          {page === 'Link management' && (
            <div className="card table-card">
              <div className="card-heading">
                <div>
                  <h3>WAN links</h3>
                  <p>Inspect capacity, utilization and link health</p>
                </div>
                <div className="search-box">
                  <Search size={15} />
                  <input placeholder="Filter links..." value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
              </div>
              <LinkTable links={filtered} />
            </div>
          )}

          {page === 'Analytics' && (
            <div className="metrics-grid">
              <Metric title="Average utilization" value={`${avg}`} unit="%" change="Live demo" icon={Gauge} />
              <Metric title="Reroutes executed" value={`${reroutes}`} unit="" change="Session total" icon={Route} tone="purple" />
              <Metric title="Mean latency" value="24.6" unit="ms" change="Sample data" icon={Clock3} />
              <Metric title="Availability" value="99.98" unit="%" change="Sample data" icon={ShieldCheck} tone="green" />
              <div className="card chart-card span-2">
                <h3>Traffic trend</h3>
                <div className="chart tall">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={traffic}>
                      <CartesianGrid stroke="#222b3b" />
                      <XAxis dataKey="time" tick={{ fill: '#78869b' }} />
                      <YAxis tick={{ fill: '#78869b' }} />
                      <Tooltip />
                      <Area dataKey="inbound" stroke="#24c8d8" fill="#24c8d8" fillOpacity={0.12} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {page === 'Event logs' && (
            <div className="card table-card">
              <div className="card-heading">
                <div>
                  <h3>System event log</h3>
                  <p>Recent controller and monitoring events</p>
                </div>
                <Badge tone="info">Latest events</Badge>
              </div>

              {(apiEvents.length ? apiEvents : events).map((event) => (
                <div className="alert-row" key={event.id ?? `${event.type}-${event.message}`}>
                  <div>
                    <b>{event.type}</b>
                    <p>{event.message}</p>
                  </div>
                  <Badge tone={event.severity === 'Critical' ? 'danger' : event.severity === 'Warning' ? 'warning' : 'info'}>{event.severity}</Badge>
                </div>
              ))}

              {apiEvents.length === 0 && !events.length && <div className="empty">No recent events.</div>}
            </div>
          )}

          {page === 'Settings' && (
            <div className="card settings-card">
              <h3>Monitoring configuration</h3>
              <p>Thresholds are local UI settings in this frontend preview.</p>
              <label>Congestion trigger (%)<input type="number" defaultValue={85} /></label>
              <label>Warning threshold (%)<input type="number" defaultValue={70} /></label>
              <label>Metrics polling interval (seconds)<input type="number" defaultValue={5} /></label>
              <button className="primary-btn" onClick={() => alert('Demo settings saved locally for this session.')}>Save settings</button>
            </div>
          )}

          <footer>
            <span>NetPulse NMS <b>v1.0.0</b></span>
            <span>
              <i className="dot green" />
              {apiConnected ? `Backend connected · ${apiMode} fixtures` : 'Backend disconnected'}
            </span>
            <span>Built for SDN WAN Optimization</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function LinkTable({ links }: { links: typeof initialLinks }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>LINK ID</th>
            <th>CONNECTION</th>
            <th>UTILIZATION</th>
            <th>LATENCY</th>
            <th>PATH</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {links.map((link) => (
            <tr key={link.id}>
              <td><b className="link-id">{link.id}</b></td>
              <td>{link.from} <span className="muted">→</span> {link.to}</td>
              <td>
                <div className="usage">
                  <div className="usage-bar">
                    <i style={{ width: `${link.usage}%`, background: link.usage >= 80 ? '#f0a34b' : link.usage >= 60 ? '#d9bd5d' : '#31c99a' }} />
                  </div>
                  <b>{link.usage}%</b>
                </div>
              </td>
              <td>{link.latency} ms</td>
              <td><span className="path-tag">{link.path}</span></td>
              <td><Badge tone={link.status === 'Healthy' ? 'success' : link.status === 'Congested' ? 'danger' : 'warning'}>{link.status}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
      {links.length === 0 && <div className="empty">No matching links found.</div>}
    </div>
  );
}

export default App;
