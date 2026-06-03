## 1. 架构约束

### 1.1 代码核心设计约束
代码设计上采用面向对象的设计思想
- 每个功能模块单独一个文件夹，文件夹命名以模块名命名。任何模块必须包含一个 interface 接口，该接口作为唯一的对外暴露，其他模块使用类型时只使用此接口的API。定义的 interface 的每个API必须有注释!!!，详细参考2.1 接口注释
**每次创建类方法时，想清楚哪些应该是对外 public 的，哪些是 private 的**

- 函数划分的核心准则为复用性和功能复用。对于超过两行的操作，如果被重复使用也建议使用函数。

## 2. 命名风格
### 2.1 函数命名规范
- 函数名采用驼峰命名法，首字母小写，后续字母大写，单词之间用驼峰命名法连接。
- 针对通用的命名，命名采用 `{操作}{操作对象}`
``` TS
// 构建代码
buildClassCode(classObj)
buildClassMethodCode(classMethodObj)
buildComment(commentObj)

// 加入池子
pool.pushFinancialStrategy(strategy);
```
- 针对不同入参对象，但是最终的操作路径会被归属，采用`{操作}{操作对象}with{入参对象}`
```TS
createAccount() // 创建账户
createAccountWithName(name) // 创建账户并初始化命名
createAccountWithInfo(accountInfo) // 基于账户信息创建账户
```

## 3. 注释说明
### 2.1 接口注释
每个接口的 API 注释需要三个部分，作用部分、参数部分。
``` ts
interface AccountService {
    /**
     * 创建 Mock 账户
     * @param input 创建账户输入参数
     * @returns 创建的账户对象
     */
  createMockAccount(input: CreateMockAccountInput): Promise<Account>;
}
```