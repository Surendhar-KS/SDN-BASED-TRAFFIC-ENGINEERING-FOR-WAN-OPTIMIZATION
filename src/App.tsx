import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  api,
  type ApiAlert,
  type ApiEvent,
  type MetricsSummary,
  type ControllerStatus,
  type TrafficSample,
} from './services/api';
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

function normalizeControllerStatus(rawStatus: Partial<ControllerStatus> | null | undefined): ControllerStatus | null {
  if (!rawStatus || typeof rawStatus !== 'object') {
    return null;
  }

  const activePath = rawStatus.active_path === 'primary' || rawStatus.active_path === 'backup'
    ? rawStatus.active_path
    : 'unknown';

  const primaryUtilization = Number(rawStatus.primary_utilization ?? rawStatus.utilization ?? 0);
  const backupUtilization = Number(rawStatus.backup_utilization ?? 0);

  return {
    active_path: activePath,
    congestion: Boolean(rawStatus.congestion),
    controller: typeof rawStatus.controller === 'string' ? rawStatus.controller : 'disconnected',
    last_event: typeof rawStatus.last_event === 'string' ? rawStatus.last_event : 'Waiting for controller event',
    monitored_capacity_mbps: Number(rawStatus.monitored_capacity_mbps ?? 0),
    monitored_link: typeof rawStatus.monitored_link === 'string' ? rawStatus.monitored_link : 'Unknown',
    primary_threshold: Number(rawStatus.primary_threshold ?? 85),
    recovery_threshold: Number(rawStatus.recovery_threshold ?? 60),
    updated_at: typeof rawStatus.updated_at === 'string' ? rawStatus.updated_at : new Date().toISOString(),
    utilization: primaryUtilization,
    primary_utilization: primaryUtilization,
    backup_utilization: backupUtilization,
  };
}

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

function Topology({
  controllerStatus,
  trafficSamples,
}: {
  controllerStatus: ControllerStatus | null;
  trafficSamples: TrafficSample[];
}) {
  const latest = trafficSamples.length
    ? trafficSamples[trafficSamples.length - 1]
    : null;

  const activePath = controllerStatus?.active_path ?? 'unknown';

  const primaryUtilization =
    latest?.primary_utilization ??
    controllerStatus?.primary_utilization ??
    0;

  const backupUtilization =
    latest?.backup_utilization ??
    controllerStatus?.backup_utilization ??
    0;

  const primaryCongested = primaryUtilization >= 85;
  const backupCongested = backupUtilization >= 85;

  const primaryColor = primaryCongested
    ? '#E76F51'
    : activePath === 'primary'
      ? '#2A9D8F'
      : '#264653';

  const backupColor = backupCongested
    ? '#E76F51'
    : activePath === 'backup'
      ? '#2A9D8F'
      : '#264653';

  const edgeColor = '#264653';

  return (
    <div className="topology card">
      <div className="topology-head">
        <div>
          <h3>NetPulse Mininet WAN topology</h3>
          <p>6 nodes · 6 links · Primary and backup WAN paths</p>
        </div>

        <div className="legend">
          <span>
            <i className="dot green" /> Active
          </span>
          <span>
            <i className="dot amber" /> Congested
          </span>
          <span>
            <i className="dot red" /> Standby
          </span>
        </div>
      </div>

      <svg
        viewBox="0 0 860 300"
        role="img"
        aria-label="Live Mininet WAN topology with primary and backup paths"
      >
        {/* Host-to-switch links */}
        <path
          d="M100 150 L260 150"
          stroke={edgeColor}
          strokeWidth="3"
          fill="none"
        />

        <path
          d="M600 150 L760 150"
          stroke={edgeColor}
          strokeWidth="3"
          fill="none"
        />

        {/* Primary WAN path */}
        <path
          d="M260 150 L430 70 L600 150"
          stroke={primaryColor}
          strokeWidth={activePath === 'primary' ? 5 : 3}
          strokeDasharray={activePath === 'primary' ? 'none' : '7 5'}
          fill="none"
        />

        {/* Backup WAN path */}
        <path
          d="M260 150 L430 230 L600 150"
          stroke={backupColor}
          strokeWidth={activePath === 'backup' ? 5 : 3}
          strokeDasharray={activePath === 'backup' ? 'none' : '7 5'}
          fill="none"
        />

        {/* Primary utilization */}
        <text x="345" y="75" className="edge-label" textAnchor="middle">
          {`Primary: ${primaryUtilization.toFixed(1)}%`}
        </text>

        {/* Backup utilization */}
        <text x="345" y="238" className="edge-label" textAnchor="middle">
          {`Backup: ${backupUtilization.toFixed(1)}%`}
        </text>

        {/* Host h1 */}
        <g className="node" transform="translate(100 150)">
          <circle r="30" />
          <circle r="21" className="node-inner" />
          <text y="5" textAnchor="middle">h1</text>
          <text y="52" textAnchor="middle" className="node-label">
            Host 1
          </text>
        </g>

        {/* Switch s1 */}
        <g className="node destination" transform="translate(260 150)">
          <circle r="30" />
          <circle r="21" className="node-inner" />
          <text y="5" textAnchor="middle">s1</text>
          <text y="52" textAnchor="middle" className="node-label">
            Edge Switch
          </text>
        </g>

        {/* Primary switch s2 */}
        <g
          className={`node ${primaryCongested ? 'warning' : ''}`}
          transform="translate(430 70)"
        >
          <circle r="30" />
          <circle r="21" className="node-inner" />
          <text y="5" textAnchor="middle">s2</text>
          <text y="52" textAnchor="middle" className="node-label">
            Primary Core
          </text>
        </g>

        {/* Backup switch s3 */}
        <g
          className={`node ${backupCongested ? 'warning' : ''}`}
          transform="translate(430 230)"
        >
          <circle r="30" />
          <circle r="21" className="node-inner" />
          <text y="5" textAnchor="middle">s3</text>
          <text y="52" textAnchor="middle" className="node-label">
            Backup Core
          </text>
        </g>

        {/* Switch s4 */}
        <g className="node destination" transform="translate(600 150)">
          <circle r="30" />
          <circle r="21" className="node-inner" />
          <text y="5" textAnchor="middle">s4</text>
          <text y="52" textAnchor="middle" className="node-label">
            Gateway
          </text>
        </g>

        {/* Host h2 */}
        <g className="node" transform="translate(760 150)">
          <circle r="30" />
          <circle r="21" className="node-inner" />
          <text y="5" textAnchor="middle">h2</text>
          <text y="52" textAnchor="middle" className="node-label">
            Host 2
          </text>
        </g>
      </svg>

      <div className="topology-note">
        <span className="pulse" />
        {controllerStatus
          ? `Controller connected · Active path: ${activePath.toUpperCase()}`
          : 'Waiting for controller connection'}
        <span className="muted">
          {' '}· Link capacities: Primary 10 Mbps / Backup 20 Mbps
        </span>
      </div>
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
  const [controllerStatus, setControllerStatus] = useState<ControllerStatus | null>(null);
  const [trafficSamples, setTrafficSamples] = useState<TrafficSample[]>([]);
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

        console.log('[NetPulse] API response received', {
          health,
          links: linksResponse,
          metrics: metricsResponse,
          events: eventsResponse,
          alerts: alertsResponse,
        });

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

        try {
          const controllerResponse = await api.controllerStatus();

          if (!active) return;

          console.log('[NetPulse] controller status received', controllerResponse);

          const nextStatus = normalizeControllerStatus(controllerResponse.data);
          const nextConnected = Boolean(nextStatus && (nextStatus.controller === 'connected' || health.controller_connected));

          console.log('[NetPulse] active_path', nextStatus?.active_path, 'updated_at', nextStatus?.updated_at, 'controllerConnected', nextConnected);

          setControllerStatus(nextStatus);
          setControllerConnected(nextConnected);
          if (nextStatus) {
            console.log('[NetPulse] frontend state update', {
              active_path: nextStatus.active_path,
              updated_at: nextStatus.updated_at,
              primary_utilization: nextStatus.primary_utilization,
              backup_utilization: nextStatus.backup_utilization,
              controllerConnected: nextConnected,
            });
          }
        } catch (error) {
          if (!active) return;

          console.warn('[NetPulse] controller status stale or disconnected', error);
          setControllerStatus(null);
          setControllerConnected(false);
        }

        try {
          const trafficResponse = await api.controllerTraffic();

          if (!active) return;

          const nextSamples = Array.isArray(trafficResponse.data?.samples) ? trafficResponse.data.samples : [];
          console.log('[NetPulse] traffic samples received', nextSamples.at(-1));
          setTrafficSamples(nextSamples);
        } catch (error) {
          if (!active) return;

          console.warn('[NetPulse] traffic samples unavailable', error);
          setTrafficSamples([]);
        }
      } catch (error) {
        if (!active) return;

        console.error('[NetPulse] backend API failure', error);
        setApiConnected(false);
        setApiError(error instanceof Error ? error.message : 'Unable to connect to backend');
        setControllerStatus(null);
        setControllerConnected(false);
      }
    }

    loadBackendData();
    const interval = window.setInterval(loadBackendData, 5000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const liveLinks = useMemo(() => {
    const baseLinks = links.length ? links : initialLinks;
    const primaryUtilization = controllerStatus?.primary_utilization ?? null;
    const backupUtilization = controllerStatus?.backup_utilization ?? null;

    return baseLinks.map((link) => {
      const isPrimaryRoute = link.path === 'Primary';
      const computedUsage = isPrimaryRoute
        ? (primaryUtilization ?? link.usage)
        : (backupUtilization ?? link.usage);
      const usage = Number(Math.min(Math.max(computedUsage, 0), 100).toFixed(2));

      return {
        ...link,
        usage,
        status: usage >= 85 ? 'Congested' : usage >= 70 ? 'Warning' : 'Healthy',
        path: isPrimaryRoute ? 'Primary' : 'Backup',
      };
    });
  }, [controllerStatus, links]);

  const avg = useMemo(
    () => Math.round(liveLinks.reduce((total, link) => total + link.usage, 0) / Math.max(liveLinks.length, 1)),
    [liveLinks]
  );

  const analyticsTrendData = useMemo(() => {
    if (trafficSamples.length > 0) {
      return trafficSamples.map((sample) => ({
        time: sample.timestamp.slice(11, 19),
        inbound: Number(sample.primary_utilization.toFixed(2)),
        outbound: Number(sample.backup_utilization.toFixed(2)),
      }));
    }

    return traffic;
  }, [trafficSamples]);

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

  const filtered = liveLinks.filter((link) =>
    (link.id + link.from + link.to + link.status).toLowerCase().includes(query.toLowerCase())
  );

  const liveEventRows = useMemo(() => {
    if (apiEvents.length > 0) {
      return apiEvents;
    }

    if (controllerStatus) {
      return [{
        id: `controller-${controllerStatus.updated_at}`,
        type: 'Controller',
        severity: controllerStatus.congestion ? 'Critical' : 'Info',
        message: controllerStatus.last_event,
        source: 'live-controller',
      }];
    }

    return events;
  }, [apiEvents, controllerStatus]);

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
  <>
    <div className="metrics-grid">
      <Metric
        title="Active WAN path"
        value={controllerStatus?.active_path?.toUpperCase() ?? 'N/A'}
        unit=""
        change={controllerConnected ? 'Live controller' : 'Controller offline'}
        icon={Route}
        tone="green"
      />

      <Metric
        title="Primary link utilization"
        value={controllerStatus ? (controllerStatus.primary_utilization ?? controllerStatus.utilization).toFixed(2) : 'N/A'}
        unit="%"
        change={controllerStatus?.monitored_link ?? 'Waiting for data'}
        icon={Activity}
      />

      <Metric
        title="Congestion status"
        value={controllerStatus
          ? controllerStatus.congestion ? 'Detected' : 'Normal'
          : 'N/A'}
        unit=""
        change={controllerStatus
          ? `Threshold ${controllerStatus.primary_threshold}%`
          : 'Controller offline'}
        icon={AlertTriangle}
        tone={controllerStatus?.congestion ? 'red' : 'green'}
      />

      <Metric
        title="Active links"
        value={String(metrics?.links_up ?? 0)}
        unit={`/ ${metrics?.links_total ?? 0}`}
        change={apiConnected ? 'Backend data' : 'API offline'}
        icon={Cable}
        tone="green"
      />
    </div>

    <div className="card" style={{ marginTop: 20, padding: 20 }}>
      <h3>Latest SDN controller event</h3>
      <p>
        {controllerStatus?.last_event ?? 'Waiting for controller event'}
      </p>
      <small>
        Active route: {controllerStatus?.active_path ?? 'Unknown'}
        {' · '}
        Last update: {controllerStatus?.updated_at ?? 'Unavailable'}
      </small>
    </div>
  </>
)}

         {page === 'Topology' && (
  <Topology
    controllerStatus={controllerStatus}
    trafficSamples={trafficSamples}
  />
)}

          {page === 'Traffic monitoring' && (
            <div className="card chart-card">
              <div className="card-heading">
                <div>
                  <h3>Live WAN traffic utilization</h3>
                  <p>
                    Real-time primary and backup link measurements ·
                    OS-Ken SDN Controller
                  </p>
                </div>

                <Badge tone={trafficSamples.length > 0 ? 'success' : 'danger'}>
                  {trafficSamples.length > 0 ? 'LIVE DATA' : 'WAITING FOR DATA'}
                </Badge>
              </div>

              {trafficSamples.length > 0 ? (
                <>
                  <div className="chart tall">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={trafficSamples.map((sample) => ({
                          ...sample,
                          time: sample.timestamp.slice(11, 19),
                        }))}
                      >
                        <CartesianGrid
                          stroke="rgba(38,70,83,0.18)"
                          strokeDasharray="3 5"
                        />

                        <XAxis
                          dataKey="time"
                          tick={{ fill: '#617684', fontSize: 11 }}
                        />

                        <YAxis
                          domain={[0, 100]}
                          tick={{ fill: '#617684', fontSize: 11 }}
                          unit="%"
                        />

                        <Tooltip
                          contentStyle={{
                            background: '#264653',
                            border: '1px solid rgba(244,237,228,0.2)',
                            color: '#F4EDE4',
                          }}
                          formatter={(value) => [
                            `${Number(value).toFixed(2)}%`,
                            'Utilization',
                          ]}
                        />

                        <Line
                          type="monotone"
                          dataKey="primary_utilization"
                          name="Primary WAN"
                          stroke="#2A9D8F"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />

                        <Line
                          type="monotone"
                          dataKey="backup_utilization"
                          name="Backup WAN"
                          stroke="#E76F51"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="summary-stat">
                    <span>Collected samples</span>
                    <b>{trafficSamples.length}</b>
                  </div>

                  <div className="summary-stat">
                    <span>Current active route</span>
                    <b>
                      {trafficSamples[trafficSamples.length - 1].active_path.toUpperCase()}
                    </b>
                  </div>

                  <div className="summary-stat">
                    <span>Latest primary utilization</span>
                    <b>
                      {trafficSamples[trafficSamples.length - 1].primary_utilization.toFixed(2)}%
                    </b>
                  </div>

                  <div className="summary-stat">
                    <span>Latest backup utilization</span>
                    <b>
                      {trafficSamples[trafficSamples.length - 1].backup_utilization.toFixed(2)}%
                    </b>
                  </div>
                </>
              ) : (
                <div className="empty">
                  Waiting for live traffic measurements from the SDN controller.
                </div>
              )}
            </div>
          )}

          {page === 'Traffic engineering' && (
            <div className="engineering-grid">
              <div className="card">
                <div className="card-heading">
                  <div>
                    <h3>SDN Traffic Engineering</h3>
                    <p>Live routes from the NetPulse Mininet topology</p>
                  </div>
                  <Badge tone={controllerConnected ? 'success' : 'danger'}>
                    {controllerConnected ? 'Controller connected' : 'Controller offline'}
                  </Badge>
                </div>

                <div className={`route-box ${
                  controllerStatus?.active_path === 'primary' ? 'recommended' : ''
                }`}>
                  <div className="route-head">
                    <b>Primary WAN path</b>
                    <Badge tone={controllerStatus?.active_path === 'primary' ? 'success' : 'neutral'}>
                      {controllerStatus?.active_path === 'primary' ? 'ACTIVE' : 'STANDBY'}
                    </Badge>
                  </div>
                  <div className="route-flow">
                    <span>h1</span><i /><span>s1</span><i /><span>s2</span><i /><span>s4</span><i /><span>h2</span>
                  </div>
                  <small>
                    S1 → S2 → S4 · 10 Mbps bottleneck capacity
                  </small>
                  <small>
                    Monitored utilization: {controllerStatus
                      ? `${controllerStatus.utilization.toFixed(2)}%`
                      : 'Unavailable'}
                  </small>
                </div>

                <div className={`route-box ${
                  controllerStatus?.active_path === 'backup' ? 'recommended' : ''
                }`}>
                  <div className="route-head">
                    <b>Backup WAN path</b>
                    <Badge tone={controllerStatus?.active_path === 'backup' ? 'success' : 'neutral'}>
                      {controllerStatus?.active_path === 'backup' ? 'ACTIVE' : 'STANDBY'}
                    </Badge>
                  </div>
                  <div className="route-flow">
                    <span>h1</span><i /><span>s1</span><i /><span>s3</span><i /><span>s4</span><i /><span>h2</span>
                  </div>
                  <small>
                    S1 → S3 → S4 · 20 Mbps bottleneck capacity
                  </small>
                  <small>
                    Separate backup-link utilization is not currently monitored.
                  </small>
                </div>

                <div className="alert-row">
                  <div>
                    <b>Latest controller event</b>
                    <p>
                      {controllerStatus?.last_event ?? 'Waiting for controller data'}
                    </p>
                    <small>
                      Last update: {controllerStatus?.updated_at ?? 'Unavailable'}
                    </small>
                  </div>
                </div>

                <p className="disclaimer">
                  Routes are controlled automatically by the OS-Ken controller.
                  Manual optimization through the dashboard is not enabled yet.
                </p>
              </div>

              <div className="card">
                <h3>Optimization summary</h3>

                <div className="summary-stat">
                  <span>Active route</span>
                  <b>{controllerStatus?.active_path?.toUpperCase() ?? 'UNKNOWN'}</b>
                </div>

                <div className="summary-stat">
                  <span>Congestion threshold</span>
                  <b>{controllerStatus
                    ? `${controllerStatus.primary_threshold}%`
                    : 'Unavailable'}</b>
                </div>

                <div className="summary-stat">
                  <span>Recovery threshold</span>
                  <b>{controllerStatus
                    ? `${controllerStatus.recovery_threshold}%`
                    : 'Unavailable'}</b>
                </div>

                <div className="summary-stat">
                  <span>Monitored link</span>
                  <b>{controllerStatus?.monitored_link ?? 'Unavailable'}</b>
                </div>

                <div className="summary-stat">
                  <span>Monitored capacity</span>
                  <b>{controllerStatus
                    ? `${controllerStatus.monitored_capacity_mbps} Mbps`
                    : 'Unavailable'}</b>
                </div>

                <div className="summary-stat">
                  <span>Congestion status</span>
                  <Badge tone={controllerStatus
                    ? controllerStatus.congestion ? 'danger' : 'success'
                    : 'neutral'}>
                    {controllerStatus
                      ? controllerStatus.congestion ? 'Detected' : 'Normal'
                      : 'Unknown'}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {page === 'Congestion alerts' && (
  <div className="card table-card">
    <div className="card-heading">
      <div>
        <h3>Congestion and network alerts</h3>
        <p>Live events from the NetPulse SDN controller</p>
      </div>
      <Badge tone={
        !controllerConnected
          ? 'danger'
          : controllerStatus?.congestion
            ? 'danger'
            : 'success'
      }>
        {!controllerConnected
          ? 'Controller offline'
          : controllerStatus?.congestion
            ? 'Congestion detected'
            : 'No active congestion'}
      </Badge>
    </div>

    {!controllerConnected || !controllerStatus ? (
      <div className="alert-row">
        <AlertTriangle className="danger-text" />
        <div>
          <b>Controller unavailable</b>
          <p>Live congestion information cannot currently be retrieved.</p>
        </div>
        <Badge tone="danger">Offline</Badge>
      </div>
    ) : (
      <>
        <div className="alert-row">
          {controllerStatus.congestion
            ? <AlertTriangle className="danger-text" />
            : <CheckCircle2 className="positive" />}
          <div>
            <b>
              {controllerStatus.congestion
                ? 'Primary WAN congestion detected'
                : 'Primary WAN link is operating normally'}
            </b>
            <p>
              Current monitored utilization: {controllerStatus.utilization.toFixed(2)}%.
              Congestion threshold: {controllerStatus.primary_threshold}%.
            </p>
          </div>
          <Badge tone={controllerStatus.congestion ? 'danger' : 'success'}>
            {controllerStatus.congestion ? 'Critical' : 'Healthy'}
          </Badge>
        </div>

        <div className="alert-row">
          <Route className="warning-text" />
          <div>
            <b>Active WAN route</b>
            <p>
              Traffic is currently using the {controllerStatus.active_path.toUpperCase()} path.
            </p>
          </div>
          <Badge tone="info">
            {controllerStatus.active_path.toUpperCase()}
          </Badge>
        </div>

        <div className="alert-row">
          <Clock3 className="warning-text" />
          <div>
            <b>Latest controller event</b>
            <p>{controllerStatus.last_event}</p>
            <small>Updated: {controllerStatus.updated_at}</small>
          </div>
          <Badge tone="info">Event</Badge>
        </div>

        <div className="alert-row">
          <CheckCircle2 className="positive" />
          <div>
            <b>Recovery configuration</b>
            <p>
              Recovery threshold: {controllerStatus.recovery_threshold}%.
              The controller requires utilization to remain below this threshold
              for 10 seconds before returning to the primary route.
            </p>
          </div>
          <Badge tone="success">Configured</Badge>
        </div>
      </>
    )}
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
                    <AreaChart data={analyticsTrendData}>
                      <CartesianGrid stroke="rgba(38,70,83,0.18)" />
                      <XAxis dataKey="time" tick={{ fill: '#617684' }} />
                      <YAxis tick={{ fill: '#617684' }} />
                      <Tooltip />
                      <Area dataKey="inbound" stroke="#2A9D8F" fill="#2A9D8F" fillOpacity={0.12} />
                      <Area dataKey="outbound" stroke="#E76F51" fill="#E76F51" fillOpacity={0.08} />
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

              {liveEventRows.map((event) => (
                <div className="alert-row" key={event.id ?? `${event.type}-${event.message}`}>
                  <div>
                    <b>{event.type}</b>
                    <p>{event.message}</p>
                  </div>
                  <Badge tone={event.severity === 'Critical' ? 'danger' : event.severity === 'Warning' ? 'warning' : 'info'}>{event.severity}</Badge>
                </div>
              ))}

              {liveEventRows.length === 0 && <div className="empty">No recent events.</div>}
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
