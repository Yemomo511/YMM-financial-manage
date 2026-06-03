import type { Account, AccountRepository, CreateMockAccountInput } from './Account.types.js';

/**
 * @description 内存账户仓库。
 * 用于单元测试和本地无数据库场景，保持与真实账户仓库一致的接口。
 */
export class InMemoryAccountRepository implements AccountRepository {
  private readonly accounts = new Map<string, Account>();

  /**
   * 按业务账户 ID 查询账户。
   * @param accountId 业务账户 ID
   * @returns 命中的账户对象，不存在时返回 null
   */
  async findAccountByAccountId(accountId: string): Promise<Account | null> {
    return this.accounts.get(accountId) ?? null;
  }

  /**
   * 列出当前仓库中的所有账户。
   * @returns 账户列表
   */
  async listAccounts(): Promise<Account[]> {
    return Array.from(this.accounts.values());
  }

  /**
   * 创建 Mock 账户及其初始资金余额。
   * @param input 创建账户所需的完整账户与资金信息
   * @returns 创建完成后的账户对象
   */
  async createMockAccount(input: CreateMockAccountInput): Promise<Account> {
    const now = new Date();
    const account: Account = {
      accountId: input.accountId,
      accountName: input.accountName,
      accountType: input.accountType,
      baseCurrency: input.baseCurrency,
      riskProfile: input.riskProfile,
      maxPositionRatio: input.maxPositionRatio,
      maxDailyLossRatio: input.maxDailyLossRatio,
      balance: {
        initialCash: input.initialCash,
        availableCash: input.availableCash,
        frozenCash: input.frozenCash,
        totalAsset: input.totalAsset,
        updatedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.accounts.set(account.accountId, account);

    return account;
  }
}
