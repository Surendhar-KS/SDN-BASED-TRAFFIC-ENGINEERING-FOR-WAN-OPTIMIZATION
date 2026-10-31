import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, AlertTriangle, Gauge, Pause, Play, RefreshCcw, Route, SlidersHorizontal, TrendingDown, Zap } from 'lucide-react';
import { defaultNodes, demoNodeLayout, initialRouteLinks, routeDescriptions, trafficIntensityOptions, trafficIntensityScale } from '../demo/mockData';
import { createDemoChannels, distributeTraffic, getTotalProcessedTraffic } from '../demo/simulation';
import { computeShortestRoute, enumerateRoutes } from '../demo/shortestPath';
import type { DemoChannel, DemoLink, DemoNode, TrafficIntensity } from '../demo/types';

const channelCapacity = 180;

function DemoBadge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) {
  return <span className={`demo-badge ${tone}`}>{children}</span>;
}

function Demo() {
  const [intensity, setIntensity] = useState<TrafficIntensity>('Medium');
  const [incomingTraffic, setIncomingTraffic] = useState(100);
  const [channels, setChannels] = useState<DemoChannel[]>(() => createDemoChannels(100));
  const [routeLinks, setRouteLinks] = useState<DemoLink[]>(initialRouteLinks);
  const [nodes, setNodes] = useState<DemoNode[]>(defaultNodes);
  const [congestionPenalty, setCongestionPenalty] = useState(2.8);
  const [isRunning, setIsRunning] = useState(true);
  const [throughputHistory, setThroughputHistory] = useState<Array<{ time: string; throughput: number }>>([
    { time: '00s', throughput: 72 },
    { time: '05s', throughput: 81 },
    { time: '10s', throughput: 92 },
    { time: '15s', throughput: 100 },
    { time: '20s', throughput: 106 },
  ]);

  useEffect(() => {
    setChannels((previous) => distributeTraffic(incomingTraffic, previous));
  }, [incomingTraffic]);

  useEffect(() => {
    const handleDemoCommand = (event: Event) => {
      const action = (event as CustomEvent).detail as {
        operation?: string;
        intensity?: string;
        channel?: string;
        enabled?: boolean;
        link_id?: string;
      } | undefined;

      if (!action?.operation) {
        return;
      }

      switch (action.operation) {
        case 'start_demo':
          setIsRunning(true);
          break;
        case 'pause_demo':
          setIsRunning(false);
          break;
        case 'reset_demo':
          resetSimulation();
          break;
        case 'set_demo_traffic_intensity': {
          const nextIntensity = (action.intensity as TrafficIntensity) || 'Medium';
          if (trafficIntensityOptions.includes(nextIntensity)) {
            setIntensity(nextIntensity);
          }
          break;
        }
        case 'set_demo_channel_status': {
          const channelName = action.channel || 'Channel 1';
          setChannels((previous) => {
            const updated = previous.map((channel) => {
              if (channel.label.toLowerCase() === channelName.toLowerCase() || channel.id === channelName) {
                return { ...channel, enabled: Boolean(action.enabled) };
              }
              return channel;
            });
            return distributeTraffic(incomingTraffic, updated);
          });
          break;
        }
        case 'simulate_demo_link_failure': {
          const linkId = action.link_id || 'S-B';
          setRouteLinks((previous) => previous.map((link) => {
            if (link.id === linkId) {
              return { ...link, available: !link.available };
            }
            return link;
          }));
          break;
        }
        case 'run_demo_shortest_path':
          setCongestionPenalty((previous) => Number(Math.min(6, previous + 0.3).toFixed(1)));
          break;
        default:
          break;
      }
    };

    window.addEventListener('netpulse-demo-command', handleDemoCommand);
    return () => window.removeEventListener('netpulse-demo-command', handleDemoCommand);
  }, [incomingTraffic]);

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const timer = window.setInterval(() => {
      const next = Math.min(500, Math.max(40, incomingTraffic * trafficIntensityScale[intensity] * (0.82 + Math.random() * 0.38)));
      setThroughputHistory((history) => {
        const nextPoint = {
          time: `${history.length * 5}s`,
          throughput: Number(next.toFixed(1)),
        };
        return [...history.slice(-9), nextPoint];
      });
    }, 1800);

    return () => window.clearInterval(timer);
  }, [incomingTraffic, intensity, isRunning]);

  const totalProcessed = useMemo(() => getTotalProcessedTraffic(channels), [channels]);
  const averageLatency = useMemo(
    () => (channels.filter((channel) => channel.enabled).reduce((sum, channel) => sum + channel.processingLatency, 0) / Math.max(1, channels.filter((channel) => channel.enabled).length)),
    [channels],
  );

  const activeChannels = channels.filter((channel) => channel.enabled).length;
  const distributionEfficiency = useMemo(() => {
    const active = Math.max(1, activeChannels);
    return Number(Math.min(100, (incomingTraffic / (active * channelCapacity)) * 100).toFixed(1));
  }, [activeChannels, incomingTraffic]);

  const disabledNodeIds = useMemo(
    () => new Set(nodes.filter((node) => !node.available).map((node) => node.id)),
    [nodes],
  );

  const routeResult = useMemo(
    () => computeShortestRoute(routeLinks, nodes, 'Source', 'Destination', congestionPenalty, disabledNodeIds),
    [routeLinks, nodes, congestionPenalty, disabledNodeIds],
  );

  const availableRoutes = useMemo(
    () => enumerateRoutes(routeLinks, nodes, 'Source', 'Destination', disabledNodeIds),
    [routeLinks, nodes, disabledNodeIds],
  );

  const originalRouteLatency = 12;
  const optimizedLatency = routeResult ? routeResult.totalLatency : 0;
  const latencyReduction = Math.max(0, originalRouteLatency - optimizedLatency);
  const percentageImprovement = originalRouteLatency > 0 ? (latencyReduction / originalRouteLatency) * 100 : 0;

  const routeChartData = useMemo(
    () => [
      { name: 'Original', latency: originalRouteLatency },
      { name: 'Optimized', latency: optimizedLatency || originalRouteLatency },
    ],
    [optimizedLatency],
  );

  const channelChartData = useMemo(
    () => channels.map((channel) => ({
      name: channel.label,
      value: Number(channel.assignedTraffic.toFixed(2)),
      utilization: channel.utilization,
    })),
    [channels],
  );

  const handleChannelToggle = (channelId: string) => {
    setChannels((previous) => {
      const updated = previous.map((channel) =>
        channel.id === channelId ? { ...channel, enabled: !channel.enabled } : channel,
      );
      return distributeTraffic(incomingTraffic, updated);
    });
  };

  const handleRouteLinkToggle = (linkId: string) => {
    setRouteLinks((previous) =>
      previous.map((link) =>
        link.id === linkId ? { ...link, available: !link.available } : link,
      ),
    );
  };

  const handleNodeToggle = (nodeId: string) => {
    setNodes((previous) =>
      previous.map((node) =>
        node.id === nodeId ? { ...node, available: !node.available } : node,
      ),
    );
  };

  const handleRouteAdjustment = (linkId: string, field: 'latency' | 'congestion' | 'utilization', value: number) => {
    setRouteLinks((previous) =>
      previous.map((link) => {
        if (link.id !== linkId) return link;
        return { ...link, [field]: value };
      }),
    );
  };

  const resetSimulation = () => {
    setIncomingTraffic(100);
    setIntensity('Medium');
    setChannels(createDemoChannels(100));
    setRouteLinks(initialRouteLinks);
    setNodes(defaultNodes);
    setCongestionPenalty(2.8);
    setIsRunning(true);
    setThroughputHistory([
      { time: '00s', throughput: 72 },
      { time: '05s', throughput: 81 },
      { time: '10s', throughput: 92 },
      { time: '15s', throughput: 100 },
      { time: '20s', throughput: 106 },
    ]);
  };

  return (
    <div className="demo-page">
      <div className="demo-header card">
        <div>
          <div className="demo-topline">
            <DemoBadge tone="danger">DEMO MODE – SIMULATED DATA</DemoBadge>
            <DemoBadge tone="success">{isRunning ? 'Simulation running' : 'Simulation paused'}</DemoBadge>
          </div>
          <h1>Network Optimization Demo</h1>
          <p>Parallel Traffic Processing &amp; Latency-Aware Routing</p>
        </div>

        <div className="demo-header-actions">
          <button className="secondary-btn" onClick={() => setIsRunning((running) => !running)}>
            {isRunning ? <Pause size={15} /> : <Play size={15} />}
            {isRunning ? 'Pause simulation' : 'Start simulation'}
          </button>
          <button className="primary-btn" onClick={resetSimulation}>
            <RefreshCcw size={15} /> Reset simulation
          </button>
        </div>
      </div>

      <div className="demo-kpis">
        <div className="metric card">
          <div className="metric-top"><span>Incoming Traffic</span><span className="metric-icon green"><Zap size={17} /></span></div>
          <div className="metric-value">{incomingTraffic}<small>Mbps</small></div>
          <div className="metric-foot"><span className="positive"><TrendingDown size={14} />{intensity}</span><span>per cycle</span></div>
        </div>
        <div className="metric card">
          <div className="metric-top"><span>Active Channels</span><span className="metric-icon green"><Activity size={17} /></span></div>
          <div className="metric-value">{activeChannels}<small>/ 4</small></div>
          <div className="metric-foot"><span className="positive"><TrendingDown size={14} />{distributionEfficiency}%</span><span>load efficiency</span></div>
        </div>
        <div className="metric card">
          <div className="metric-top"><span>Average Processing Latency</span><span className="metric-icon orange"><Gauge size={17} /></span></div>
          <div className="metric-value">{averageLatency.toFixed(1)}<small>ms</small></div>
          <div className="metric-foot"><span className="positive"><TrendingDown size={14} />{Math.max(0, 40 - averageLatency).toFixed(1)}</span><span>variance</span></div>
        </div>
        <div className="metric card">
          <div className="metric-top"><span>Selected Route Latency</span><span className="metric-icon blue"><Route size={17} /></span></div>
          <div className="metric-value">{routeResult ? routeResult.totalLatency.toFixed(1) : 'N/A'}<small>ms</small></div>
          <div className="metric-foot"><span className="positive"><TrendingDown size={14} />{latencyReduction.toFixed(1)}</span><span>improvement</span></div>
        </div>
        <div className="metric card">
          <div className="metric-top"><span>Traffic Distribution Efficiency</span><span className="metric-icon teal"><SlidersHorizontal size={17} /></span></div>
          <div className="metric-value">{distributionEfficiency}<small>%</small></div>
          <div className="metric-foot"><span className="positive"><TrendingDown size={14} />{totalProcessed.toFixed(0)}</span><span>processed</span></div>
        </div>
      </div>

      <div className="demo-grid">
        <section className="card demo-panel">
          <div className="demo-panel-header">
            <div>
              <h3>Four-channel parallel processing</h3>
              <p>Incoming traffic is distributed evenly across all enabled processing channels.</p>
            </div>
            <DemoBadge tone="neutral">Routing formula = payload ÷ active channels</DemoBadge>
          </div>

          <div className="demo-controls">
            <div className="control-group">
              <label>Traffic intensity</label>
              <div className="segmented">
                {trafficIntensityOptions.map((option) => (
                  <button
                    key={option}
                    className={option === intensity ? 'segmented-btn active' : 'segmented-btn'}
                    onClick={() => setIntensity(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="control-group slider-group">
              <label>Incoming traffic: {incomingTraffic} Mbps</label>
              <input type="range" min={10} max={500} value={incomingTraffic} onChange={(e) => setIncomingTraffic(Number(e.target.value))} />
            </div>
          </div>

          <div className="traffic-flow-wrapper">
            <div className="traffic-source">
              <span>Inbound</span>
              <strong>{incomingTraffic} Mbps</strong>
            </div>
            <div className="traffic-distributor">
              <div className="distribution-node">Distributor</div>
              <div className="traffic-pipes">
                {channels.map((channel) => (
                  <div key={channel.id} className={`pipe ${channel.enabled ? 'active' : 'offline'}`} />
                ))}
              </div>
            </div>

            <div className="channel-grid">
              {channels.map((channel) => (
                <div key={channel.id} className={`demo-channel ${channel.status}`}>
                  <div className="channel-top">
                    <span>{channel.label}</span>
                    <button className={channel.enabled ? 'toggle active' : 'toggle'} onClick={() => handleChannelToggle(channel.id)}>
                      {channel.enabled ? 'On' : 'Off'}
                    </button>
                  </div>
                  <div className="channel-metrics">
                    <div><small>Assigned</small><strong>{channel.assignedTraffic.toFixed(2)} Mbps</strong></div>
                    <div><small>Util</small><strong>{channel.utilization}%</strong></div>
                    <div><small>Queue</small><strong>{channel.queueLength}</strong></div>
                    <div><small>Latency</small><strong>{channel.processingLatency.toFixed(1)} ms</strong></div>
                  </div>
                  <div className="channel-bar"><span style={{ width: `${Math.min(100, channel.utilization)}%` }} /></div>
                  <div className="channel-status-row">
                    <span>{channel.status === 'online' ? 'Processing' : channel.status === 'warning' ? 'Congested' : 'Offline'}</span>
                    <span>{channel.enabled ? 'Available' : 'Disabled'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chart-row">
            <div className="mini-chart card inner-card">
              <h4>Traffic distribution</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={channelChartData}>
                  <CartesianGrid stroke="rgba(38,70,83,0.18)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: '#617684', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#617684', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {channelChartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={channels[index].enabled ? '#2A9D8F' : '#E76F51'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mini-chart card inner-card">
              <h4>Channel utilization</h4>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={channelChartData}>
                  <CartesianGrid stroke="rgba(38,70,83,0.18)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: '#617684', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#617684', fontSize: 11 }} domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Line type="monotone" dataKey="utilization" stroke="#E76F51" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="card demo-panel">
          <div className="demo-panel-header">
            <div>
              <h3>Latency-aware shortest-path routing</h3>
              <p>Dynamic route selection uses Dijkstra on estimated latency with congestion penalty.</p>
            </div>
            <DemoBadge tone="success">Routing formula = latency + congestion penalty</DemoBadge>
          </div>

          <div className="routing-config">
            <div className="control-group slider-group">
              <label>Congestion penalty: {congestionPenalty.toFixed(1)}</label>
              <input type="range" min={0.5} max={8} step={0.1} value={congestionPenalty} onChange={(event) => setCongestionPenalty(Number(event.target.value))} />
            </div>
          </div>

          <div className="route-network-wrap">
            <svg viewBox="0 0 860 320" className="route-network" role="img" aria-label="Shortest path network diagram">
              {nodes.map((node) => (
                <g key={node.id} className={`network-node ${node.available ? 'online' : 'offline'}`} transform={`translate(${demoNodeLayout[node.id].x}, ${demoNodeLayout[node.id].y})`}>
                  <circle r={node.available ? 18 : 16} />
                  <text textAnchor="middle" dy={5}>{node.id === 'Destination' ? 'DST' : node.id === 'Source' ? 'SRC' : node.id}</text>
                </g>
              ))}

              {routeLinks.map((link) => {
                const from = demoNodeLayout[link.source];
                const to = demoNodeLayout[link.target];
                const selected = routeResult?.path.includes(link.source) && routeResult?.path.includes(link.target);
                const isOffline = !link.available;

                return (
                  <g key={link.id}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={selected ? '#2A9D8F' : isOffline ? '#E76F51' : link.congestion > 45 ? '#E76F51' : '#264653'}
                      strokeWidth={selected ? 5 : isOffline ? 2 : 3}
                      strokeDasharray={isOffline ? '6 6' : '0'}
                      opacity={selected ? 1 : 0.8}
                    />
                    <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 10} className="route-link-label">
                      {link.latency}ms
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="route-summary">
            <div className="route-summary-card">
              <span>Selected route</span>
              <strong>{routeResult && routeResult.path.length > 1 ? routeResult.path.join(' → ') : 'No valid route'}</strong>
            </div>
            <div className="route-summary-card">
              <span>Available routes</span>
              <strong>{availableRoutes.length}</strong>
            </div>
            <div className="route-summary-card">
              <span>Network status</span>
              <strong>{routeResult ? 'Route available' : 'Network unavailable'}</strong>
            </div>
          </div>

          <div className="route-control-list">
            {routeLinks.map((link) => (
              <div key={link.id} className="route-control-item">
                <div className="route-control-header">
                  <b>{link.id}</b>
                  <button className={link.available ? 'toggle active' : 'toggle'} onClick={() => handleRouteLinkToggle(link.id)}>
                    {link.available ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <div className="route-control-fields">
                  <label>
                    <span>Latency</span>
                    <input type="range" min={2} max={30} value={link.latency} onChange={(event) => handleRouteAdjustment(link.id, 'latency', Number(event.target.value))} />
                    <em>{link.latency} ms</em>
                  </label>
                  <label>
                    <span>Congestion</span>
                    <input type="range" min={0} max={100} value={link.congestion} onChange={(event) => handleRouteAdjustment(link.id, 'congestion', Number(event.target.value))} />
                    <em>{link.congestion}%</em>
                  </label>
                  <label>
                    <span>Utilization</span>
                    <input type="range" min={0} max={100} value={link.utilization} onChange={(event) => handleRouteAdjustment(link.id, 'utilization', Number(event.target.value))} />
                    <em>{link.utilization}%</em>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div className="node-toggle-list">
            {nodes.map((node) => (
              <button key={node.id} className={node.available ? 'node-toggle active' : 'node-toggle'} onClick={() => handleNodeToggle(node.id)}>
                {node.label} · {node.available ? 'Online' : 'Offline'}
              </button>
            ))}
          </div>

          <div className="chart-row">
            <div className="mini-chart card inner-card">
              <h4>Route latency comparison</h4>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={routeChartData}>
                  <CartesianGrid stroke="rgba(38,70,83,0.18)" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: '#617684', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#617684', fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="latency" radius={[6, 6, 0, 0]}>
                    {routeChartData.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={index === 1 ? '#2A9D8F' : '#E76F51'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mini-chart card inner-card">
              <h4>Traffic throughput over time</h4>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={throughputHistory}>
                  <CartesianGrid stroke="rgba(38,70,83,0.18)" strokeDasharray="3 3" />
                  <XAxis dataKey="time" tick={{ fill: '#617684', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#617684', fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="throughput" stroke="#2A9D8F" fill="#2A9D8F" fillOpacity={0.18} strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>

      <div className="latency-panel card">
        <div className="demo-panel-header">
          <div>
            <h3>Latency comparison</h3>
            <p>Measured values below are simulated mock data for the demo environment.</p>
          </div>
          <DemoBadge tone="warning">Mock data only</DemoBadge>
        </div>

        <div className="comparison-grid">
          <div className="comparison-box">
            <span>Original route latency</span>
            <strong>{originalRouteLatency} ms</strong>
          </div>
          <div className="comparison-box">
            <span>Optimized route latency</span>
            <strong>{routeResult ? routeResult.totalLatency.toFixed(1) : 'N/A'} ms</strong>
          </div>
          <div className="comparison-box">
            <span>Latency reduction</span>
            <strong>{latencyReduction.toFixed(1)} ms</strong>
          </div>
          <div className="comparison-box">
            <span>Improvement</span>
            <strong>{percentageImprovement.toFixed(1)}%</strong>
          </div>
          <div className="comparison-box">
            <span>Selected route</span>
            <strong>{routeResult && routeResult.path.length > 1 ? routeResult.path.join(' → ') : 'Unavailable'}</strong>
          </div>
          <div className="comparison-box">
            <span>Available routes</span>
            <strong>{availableRoutes.length}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Demo;
