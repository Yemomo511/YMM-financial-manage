import { firstValueFrom } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { RxServiceBusBase } from '../../src/service/bus/RxServiceBusBase.js';
import type { ServiceEventEnvelope } from '../../src/service/bus/ServiceEvent.types.js';

interface TestPayload {
  value: string;
}

class TestServiceBus extends RxServiceBusBase<ServiceEventEnvelope<TestPayload>> {
  publish(value: string): void {
    this.emitEvent({
      eventId: `test:${value}`,
      topic: 'test.event',
      source: 'TestServiceBus',
      traceId: `trace:${value}`,
      occurredAt: new Date('2026-06-04T00:00:00.000Z').toISOString(),
      payload: { value },
    });
  }
}

describe('RxServiceBusBase', () => {
  it('exposes an observable event stream without exposing Subject.next', async () => {
    const serviceBus = new TestServiceBus();
    const eventPromise = firstValueFrom(serviceBus.events$);

    serviceBus.publish('hello');

    await expect(eventPromise).resolves.toMatchObject({
      topic: 'test.event',
      payload: {
        value: 'hello',
      },
    });
    expect('next' in serviceBus.events$).toBe(false);
  });
});
