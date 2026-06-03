import { describe, expect, it, vi } from 'vitest';
import { RedisStreamEventHubService } from '../../src/event/RedisStreamEventHubService.js';

describe('RedisStreamEventHubService', () => {
  it('publishes an event envelope to the topic stream', async () => {
    const xadd = vi.fn().mockResolvedValue('1-0');
    const eventHub = new RedisStreamEventHubService({ xadd });

    await eventHub.publish('market.stock.tick', {
      eventId: 'event-1',
      payload: { symbol: '600519.SH' },
    });

    expect(xadd).toHaveBeenCalledWith(
      'stream:market.stock.tick',
      '*',
      'event',
      JSON.stringify({ eventId: 'event-1', payload: { symbol: '600519.SH' } }),
    );
  });
});
