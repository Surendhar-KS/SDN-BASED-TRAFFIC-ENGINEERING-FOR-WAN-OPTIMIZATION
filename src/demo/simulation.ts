import type { DemoChannel } from './types';

export function distributeTraffic(totalTraffic: number, channels: DemoChannel[]) {
  const enabledChannels = channels.filter((channel) => channel.enabled);
  const safeIncoming = Number(Math.max(0, totalTraffic).toFixed(2));

  if (enabledChannels.length === 0) {
    return channels.map((channel) => ({
      ...channel,
      assignedTraffic: 0,
      utilization: 0,
      processingLatency: 0,
      queueLength: 0,
      status: 'offline' as const,
    }));
  }

  const perChannel = safeIncoming / enabledChannels.length;

  return channels.map((channel) => {
    if (!channel.enabled) {
      return {
        ...channel,
        assignedTraffic: 0,
        utilization: 0,
        processingLatency: 0,
        queueLength: 0,
        status: 'offline' as const,
      };
    }

    const assignedTraffic = Number(perChannel.toFixed(2));
    const utilization = Number(Math.min(100, (assignedTraffic / channel.capacity) * 100).toFixed(1));
    const queueLength = Math.max(0, Math.round((utilization / 100) * 20));
    const processingLatency = Number((18 + utilization * 0.35 + queueLength * 0.9).toFixed(1));
    const status: 'online' | 'warning' = utilization >= 85 ? 'warning' : 'online';

    return {
      ...channel,
      assignedTraffic,
      utilization,
      processingLatency,
      queueLength,
      status,
    };
  });
}

export function getTotalProcessedTraffic(channels: DemoChannel[]) {
  return Number(channels.reduce((sum, channel) => sum + channel.assignedTraffic, 0).toFixed(2));
}

export function createDemoChannels(initialTraffic = 100): DemoChannel[] {
  return [
    { id: 'ch-1', label: 'Channel 1', enabled: true, capacity: 180, assignedTraffic: 25, utilization: 25, processingLatency: 26, queueLength: 5, status: 'online' as const },
    { id: 'ch-2', label: 'Channel 2', enabled: true, capacity: 180, assignedTraffic: 25, utilization: 25, processingLatency: 26, queueLength: 5, status: 'online' as const },
    { id: 'ch-3', label: 'Channel 3', enabled: true, capacity: 180, assignedTraffic: 25, utilization: 25, processingLatency: 26, queueLength: 5, status: 'online' as const },
    { id: 'ch-4', label: 'Channel 4', enabled: true, capacity: 180, assignedTraffic: 25, utilization: 25, processingLatency: 26, queueLength: 5, status: 'online' as const },
  ].map((channel) => {
    const derived = distributeTraffic(initialTraffic, [channel])[0];
    return { ...channel, ...derived };
  });
}
