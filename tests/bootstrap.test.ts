import { describe, expect, it } from 'vitest';
import { bootstrap } from '../src/main.js';

describe('bootstrap', () => {
  it('exposes an async service bootstrap entrypoint', async () => {
    await expect(bootstrap()).resolves.toBeUndefined();
  });
});
