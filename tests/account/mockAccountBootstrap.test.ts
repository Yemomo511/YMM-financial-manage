import { describe, expect, it } from 'vitest';
import { InMemoryAccountRepository } from '../../src/account/InMemoryAccountRepository.js';
import { MockAccountBootstrap } from '../../src/account/MockAccountBootstrap.js';

describe('MockAccountBootstrap', () => {
  it('creates the default A share mock account only once', async () => {
    const repository = new InMemoryAccountRepository();
    const bootstrap = new MockAccountBootstrap(repository);

    await bootstrap.bootstrapDefaultAccounts();
    await bootstrap.bootstrapDefaultAccounts();

    const account = await repository.findAccountByAccountId('mock-cn-a-001');
    const accounts = await repository.listAccounts();

    expect(accounts).toHaveLength(1);
    expect(account?.accountName).toBe('A股模拟账户');
    expect(account?.balance.availableCash).toBe(1_000_000);
    expect(account?.balance.totalAsset).toBe(1_000_000);
    expect(account?.riskProfile).toBe('balanced');
  });
});
