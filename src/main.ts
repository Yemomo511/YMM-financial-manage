import 'dotenv/config';
import path from 'node:path';
import { MarketApplication, type MarketApplicationOptions } from './app/MarketApplication.js';

export function createMarketApplicationOptions(env: Record<string, string | undefined>): MarketApplicationOptions {
  return {
    port: Number(env.PORT ?? 3000),
    symbols: (env.WATCH_SYMBOLS ?? '600519.SH,000001.SZ')
      .split(',')
      .map((symbol) => symbol.trim())
      .filter(Boolean),
    pollIntervalMs: Number(env.POLL_INTERVAL_MS ?? 3000),
    nextDir: path.resolve(process.cwd()),
    isDev: env.NODE_ENV !== 'production',
  };
}

/**
 * @description A 股实时行情服务入口。
 * 负责读取环境配置，并启动公共行情源轮询与 WebSocket 看板。
 */
export async function bootstrap(): Promise<void> {
  const options = createMarketApplicationOptions(process.env);
  const application = new MarketApplication(options);

  await application.start();
  console.log(`YMM financial manage service listening on http://127.0.0.1:${options.port}`);
}

if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
  bootstrap().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
