# AI局中局 - 微信小程序 (Taro 4 移植架构与开发指引)

本项目为《AI局中局》微信小程序的原生级跨端解决方案，基于 **Taro 4 + React 18 + TypeScript** 构建，无缝复用服务端的全部状态机规则、数据契约与安全机制。

---

## 目录结构规划

```
miniprogram/
├── config/                 # Taro 编译与打包配置
├── src/
│   ├── app.config.ts       # 小程序页面路由与权限声明 (6大核心页面)
│   ├── app.tsx             # 小程序入口
│   ├── services/
│   │   ├── api.taro.ts     # Taro.request 网络层 (替换 Web fetch)
│   │   └── socket.taro.ts  # Taro.connectSocket 实时同步 (替换 Web WS)
│   ├── types/
│   │   └── game.ts         # 与主工程严格对齐的类型契约
│   └── pages/              # 对应 Web 端 Screens 的 6 大界面
│       ├── home/           # 首页 (建房、加入、适龄公示)
│       ├── lobby/          # 候场大厅 (选剧本、加好友Bot、微信分享)
│       ├── identity/       # 秘密抽取与钓鱼暗令翻牌
│       ├── game/           # 辩论主控台 (语音对讲、AI导演实时点评)
│       ├── voting/         # 终局审判与中期放逐投票
│       └── result/         # AI复盘报告与海报分享
└── package.json
```

---

## 关键技术适配与落地步骤

### 1. 登录与身份鉴权 (`wx.login`)
在 `api.taro.ts` 中直接调用 `TaroGameAPI.wxLogin()`：
- 自动调用 `Taro.login()` 获取微信临时凭证 `code`
- 发送给服务端 `/api/login`，在服务器端换取真实稳定的 `openid`
- 颁发安全 HMAC Token 并存入 `Taro.setStorageSync('ai_impostor_token')`

### 2. 社交裂变分享 (`onShareAppMessage`)
在 `pages/lobby/index.tsx` 中声明：
```ts
useShareAppMessage(() => {
  return {
    title: `【AI局中局】房间号 ${room.roomCode}，缺你一个，速来破案！`,
    path: `/pages/home/index?roomCode=${room.roomCode}`,
    imageUrl: "/assets/share-cover.png",
  };
});
```

### 3. UGC 语音消息与微信异步安全审核 (`mediaCheckAsync`)
- 录音使用微信小程序原生 `Taro.getRecorderManager()`
- 录音完成调用 `Taro.uploadFile()` 上传至腾讯云 COS 获得公网 URL
- 传给服务端 `/api/room/voice` 或 `/api/game/action`（携带 `mediaUrl` 参数）
- 后端自动调用微信 `media_check_async` 异步审核；若违规，微信回调 `/api/security/media-callback` 自动撤回并广播全房间

---

## 本地启动与调试

1. **安装依赖**：
   ```bash
   cd miniprogram
   npm install
   ```

2. **微信小程序开发环境编译**：
   ```bash
   npm run dev:weapp
   ```

3. **微信开发者工具**：
   - 打开微信开发者工具，导入 `miniprogram/dist` 目录
   - 勾选「不校验合法域名、web-view (业务域名)、TLS 版本以及 HTTPS 证书」（本地测试时）
   - 正式上线前在微信公众平台配置服务端对应的 `request` 和 `socket` 域名
