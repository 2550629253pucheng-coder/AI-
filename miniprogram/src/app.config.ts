/**
 * Taro 微信小程序全局页面与窗口路由配置
 */
export default defineAppConfig({
  pages: [
    "pages/home/index",
    "pages/lobby/index",
    "pages/identity/index",
    "pages/game/index",
    "pages/voting/index",
    "pages/result/index",
  ],
  window: {
    backgroundTextStyle: "dark",
    navigationBarBackgroundColor: "#0f172a",
    navigationBarTitleText: "AI局中局",
    navigationBarTextStyle: "white",
    backgroundColor: "#0b0f19",
  },
  permission: {
    "scope.record": {
      desc: "你的录音将用于在对局中发言与传递秘密线索",
    },
  },
});
