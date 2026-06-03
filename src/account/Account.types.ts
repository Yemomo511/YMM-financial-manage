export type RiskProfile = 'balanced' | 'conservative' | 'aggressive';

export interface AccountBalance {
  initialCash: number;
  availableCash: number;
  frozenCash: number;
  totalAsset: number;
  updatedAt: Date;
}

export interface Account {
  accountId: string;
  accountName: string;
  accountType: string;
  baseCurrency: string;
  riskProfile: RiskProfile;
  maxPositionRatio: number;
  maxDailyLossRatio: number;
  balance: AccountBalance;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMockAccountInput {
  accountId: string;
  accountName: string;
  accountType: string;
  baseCurrency: string;
  initialCash: number;
  availableCash: number;
  frozenCash: number;
  totalAsset: number;
  riskProfile: RiskProfile;
  maxPositionRatio: number;
  maxDailyLossRatio: number;
}

export interface AccountRepository {
  /**
   * 按业务账户 ID 查询账户。
   * @param accountId 业务账户 ID
   * @returns 命中的账户对象，不存在时返回 null
   */
  findAccountByAccountId(accountId: string): Promise<Account | null>;

  /**
   * 创建 Mock 账户及其初始资金余额。
   * @param input 创建账户所需的完整账户与资金信息
   * @returns 创建完成后的账户对象
   */
  createMockAccount(input: CreateMockAccountInput): Promise<Account>;
}
