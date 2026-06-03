/**
 * @description A 股实时行情服务入口。
 * 后续任务会在此组合数据采集、消息发布和 WebSocket 看板能力。
 */
export async function bootstrap(): Promise<void> {
  console.log('YMM financial manage service bootstrapping...');
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
