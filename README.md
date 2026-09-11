# 《AI局中局》微信小游戏 - MVP「AI内鬼局」

微信熟人社交推理小游戏，专为微信群、聚会与好友开黑场景打造。首发主题《公司深夜密谈》，支持 4~8 人实时在线互动。由 Gemini AI 作为「AI 剧情导演」，在对局决战轮动态生成剧情大反转，并在终局生成幽默毒舌的赛后复盘战报与个性称号。

---

## 核心特色与架构安全

1. **隐私优先机制 (Zero Knowledge to Client)**
   - 秘密隔离：内鬼名单与角色绝密任务独立存储于服务端专属安全表中，公共游戏状态及轮询接口 `toPublicGame()` 彻底剔除 `spyPlayerIds`，仅在终局结算后公开。
   - 绝密任务获取：每个玩家只能通过带有合法签名 Token 的接口 `/api/game/:gameId/secret` 安全解密本人专属身份。

2. **严谨身份认证 (HMAC SHA-256 Token)**
   - 告别明文 `playerId` 冒名伪造。所有关键写操作（创建房间、加入、准备、开始、发言、推进、投票、再来一局）均通过 `Authorization: Bearer <token>` 验证。
   - 采用定长比较 `crypto.timingSafeEqual`，抵御时序侧信道攻击。

3. **并发安全与乐观并发控制 (Optimistic Concurrency Control)**
   - 阶段推进并发锁：通过内存中锁 `advancing.has(gameId)` 防止网络抖动造成的阶段双重推进。
   - 版本乐观锁：每次操作自增 `game.version`，前端携带 `expectedVersion`，有效防止竞态。
   - 严格权限校验：仅房主有权开始游戏、推进回合和发起「再来一局」。

4. **AI 导演防护机制 (Prompt Injection Hardening)**
   - 三层安全防护：
     1. 玩家发言过滤清洗 (`sanitize`)，剔除控制字符及关键代码符号，防字符溢出。
     2. Prompt 隔离信道：使用 `<player_data>` 隔离不可信内容，并配置系统级反抗指令。
     3. 输出审计兜底 (`leaksIdentity`)：实时审计 AI 输出，若发生直接宣判内鬼则自动切换至预设剧本。

5. **P0 核心体验：无缝「再来一局 (One More Game)」**
   - 保留当前房间成员及连接关系，自动重置准备、发言、投票记录，清除上一局废弃游戏，杜绝内存泄漏，重新随机分配全新秘密与开局剧本。

---

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
在 `.env` 中添加你的 Gemini API Key（本地若未配置则自动使用高拟真剧情兜底模板）：
```env
GEMINI_API_KEY="your-gemini-api-key"
SESSION_SECRET="your-session-secret-key"
```

### 3. 运行自动化测试
```bash
npm run test
```

### 4. 启动本地开发服务
```bash
npm run dev
```
打开浏览器访问 [http://localhost:3000](http://localhost:3000)。

### 5. 生产环境构建与启动
```bash
npm run build
npm start
```

---

## 游戏阶段流转状态机

```text
[大厅等候 (WAITING)]
        │ 房主点击「开始游戏」
        ▼
[身份解密 (ROLE_ASSIGNMENT, 30s)]
        │ 房主推进阶段
        ▼
[第 1 轮：开场公共线索与初次盘问 (ROUND_1)]
        │ 玩家发表质疑/辩护/公开线索/调查
        ▼
[第 2 轮：第二重监控与物证曝光 (ROUND_2)]
        │
        ▼
[第 3 轮：AI 导演剧情大反转 (ROUND_3)]
        │ Gemini 结合全场前两轮发言动态生成反转冲突
        ▼
[指认投票 (VOTING)]
        │ 全员投票或倒计时结束
        ▼
[终局结算与赛后战报 (RESULT)]
        │ AI 生成全场称号、推理王、戏精大奖
        ▼
[再来一局 (One More Game)] ── 回到大厅或重新开局
```
