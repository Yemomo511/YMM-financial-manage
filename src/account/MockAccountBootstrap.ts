import type { AccountRepository, CreateMockAccountInput } from './Account.types.js';

const DEFAULT_A_SHARE_ACCOUNT: CreateMockAccountInput = {
  accountId: 'mock-cn-a-001',
  accountName: 'A股模拟账户',
  accountType: 'mock',
  baseCurrency: 'CNY',
  initialCash: 1_000_000,
  availableCash: 1_000_000,
  frozenCash: 0,
  totalAsset: 1_000_000,
  riskProfile: 'balanced',
  maxPositionRatio: 0.2,
  maxDailyLossRatio: 0.03,
};

/**
 * @description Mock 账户初始化器。
 * 负责在系统启动时保证默认 A 股模拟账户存在，供后续 AI 上下文读取。
 */
export class MockAccountBootstrap {
  constructor(private readonly accountRepository: AccountRepository) {}

  /**
   * 初始化默认 Mock 账户。
   * @returns 初始化完成信号
   */
  async bootstrapDefaultAccounts(): Promise<void> {
    const account = await this.accountRepository.findAccountByAccountId(
      DEFAULT_A_SHARE_ACCOUNT.accountId,
    );

    if (account) {
      return;
    }

    await this.accountRepository.createMockAccount(DEFAULT_A_SHARE_ACCOUNT);
  }
}
