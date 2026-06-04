import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import MarketDashboardPage from '../../app/page.js';

describe('MarketDashboardPage', () => {
  it('renders the A share realtime dashboard as React JSX', () => {
    const html = renderToString(<MarketDashboardPage />);

    expect(html).toContain('A 股实时行情看板');
    expect(html).toContain('600519.SH,000001.SZ');
    expect(html).toContain('等待实时行情推送');
    expect(html).toContain('Trace ID');
  });
});
