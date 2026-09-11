import { Team } from "../src/types/game.js";

export interface RoleDef {
  roleName: string;
  duty: string;
  defaultSecret: string;
  defaultMission: string;
  knownClues: string[];
}

export interface ThemeTemplate {
  themeId: string;
  themeName: string;
  background: string;
  roles: RoleDef[];
  spySecrets: {
    secret: string;
    mission: string;
    knownInformation: string[];
  }[];
  normalSecretsPool: {
    secret: string;
    mission: string;
    knownInformation: string[];
  }[];
  openingEvents: {
    title: string;
    description: string;
    publicClue: string;
    discussionPrompt: string;
  }[];
  round2Events: {
    title: string;
    description: string;
    publicClue: string;
    discussionPrompt: string;
  }[];
  twistFallbacks: {
    title: string;
    description: string;
    publicClue: string;
    discussionPrompt: string;
  }[];
}

export const COMPANY_THEME: ThemeTemplate = {
  themeId: "company_impostor",
  themeName: "公司内鬼 · 消失的商业机密",
  background: "清晨9点，星云科技绝密的A轮融资商业企划案在全员高层会议开始前10分钟不翼而飞。办公室门禁显示昨晚21点后有数人进出，但有人蓄意切断了部分走廊监控！",
  roles: [
    {
      roleName: "产品经理",
      duty: "负责企划案的核心架构与产品规划",
      defaultSecret: "你在昨晚21:00最后一个离开主会议室，离开时企划案还平放在投影仪旁的桌面上。",
      defaultMission: "洗清自己的嫌疑，并通过大家说出的时间线抓出真正的内鬼。",
      knownClues: [
        "你昨晚离开时，看到财务独自在走廊尽头的打印机旁徘徊。",
        "主会议室的大门密码只有核心项目组4人知晓。"
      ]
    },
    {
      roleName: "财务总监",
      duty: "掌管公司预算与融资对赌条款",
      defaultSecret: "你昨晚21:20因为忘拿审计报表返回过一次公司，在茶水间听到了轻微的碎纸机声音。",
      defaultMission: "找出谁在转移证据，同时证明自己只是回来取季度报表。",
      knownClues: [
        "碎纸机旁的垃圾桶里残留着带有红色批注的草稿纸。",
        "老板昨晚在办公室喝了咖啡，咖啡杯留在茶水间水槽里。"
      ]
    },
    {
      roleName: "资深程序员",
      duty: "管理公司内部服务器与数据访问权限",
      defaultSecret: "你昨晚在家里远程排查线上故障时，发现内部内网服务器在21:15有一笔异常数据下载记录。",
      defaultMission: "用技术线索对比嫌疑人的言行，找出内鬼。",
      knownClues: [
        "监控服务器在昨晚21:15至21:18之间出现了3分钟的日志黑洞。",
        "当时使用的是一张临时未实名的运维管理临时卡。"
      ]
    },
    {
      roleName: "HR主管",
      duty: "掌握全员档案与门禁出入权限分配",
      defaultSecret: "你昨天下午收到了一封关于某个员工可能被竞品公司高薪挖角的匿名举报信，还没来得及核实。",
      defaultMission: "观察谁的发言最具有攻击性或过度防卫，引导大家理性投票。",
      knownClues: [
        "有一位员工本周多次向行政打听过安保巡逻换岗的具体时间。",
        "会议室备用机械钥匙一直存放在前台带密码的抽屉里。"
      ]
    },
    {
      roleName: "实习生",
      duty: "负责会议准备、复印材料与端茶送水",
      defaultSecret: "你昨天下班前按吩咐复印了整整3份企划案备用，其中一份被锁在了前台的文件柜里。",
      defaultMission: "证明自己的清白，不要被老员工当作替罪羊投票出局。",
      knownClues: [
        "你今早开门时，发现前台文件柜的锁似乎有被金属发卡拨弄过的划痕。",
        "销售昨天下班前曾主动向你打听企划案是否已经打印出来。"
      ]
    },
    {
      roleName: "金牌销售",
      duty: "负责对接大客户与对外商务合作",
      defaultSecret: "你昨晚为了赶第二天的客户提案，一直在公司隔壁的咖啡厅加班到22:00，期间回过公司借充电宝。",
      defaultMission: "找出故意混淆视听的人，洗脱自己回过公司的嫌疑。",
      knownClues: [
        "你在电梯里碰到了一个戴鸭舌帽的人，手里拿着牛皮纸文件袋迅速离开。",
        "老板最近曾私下表示，如果这份文件泄漏，公司估值将腰斩。"
      ]
    },
    {
      roleName: "行政主管",
      duty: "管理办公室物资、钥匙及访客登记",
      defaultSecret: "你昨天下班前丢失了一张通用的访客临时出入磁卡，因为害怕被责备所以隐瞒未报。",
      defaultMission: "找出真正偷走文件的人，避免责任落在自己管理失职上。",
      knownClues: [
        "那张丢失的临时卡恰好有主会议室的感应通行权限。",
        "今早有人在前台垃圾桶发现了一枚被扯掉的访客胸针。"
      ]
    },
    {
      roleName: "创始人/老板",
      duty: "主持大局，掌控公司最高机密",
      defaultSecret: "其实那份企划案并不是唯一版本，里面有两处故意留下的隐藏水印暗记。",
      defaultMission: "观察所有人的陈述，保护普通员工，揪出潜伏在团队深处的内鬼。",
      knownClues: [
        "水印暗记只有在紫外线灯照射下才会显现荧光色。",
        "昨晚21点后唯一被门禁系统记录但未实名的人使用了4号电梯。"
      ]
    }
  ],
  spySecrets: [
    {
      secret: "正是你暗中拿走了商业企划案并藏在了地下车库通风管道中！你还借用了他人的临时卡来制造混淆。",
      mission: "极力隐藏内鬼身份，将怀疑引向昨晚回过公司的其他员工，确保最终投票不投给你！",
      knownInformation: [
        "会议室监控故障并非意外，而是你拔掉了交换机网线3分钟。",
        "你故意在现场留下了带有其他人特征的杂物混淆视听。"
      ]
    },
    {
      secret: "你已经把企划案拍照传送给了竞品商业间谍！你必须在众人反应过来之前把水搅浑。",
      mission: "诱导普通员工互相猜疑与对立，让大家将票投给最容易被怀疑的人！",
      knownInformation: [
        "你清楚地知道谁在昨晚哪个确切时间点出现过。",
        "只要投票结果不是你，你就能获得间谍报酬并全身而退！"
      ]
    }
  ],
  normalSecretsPool: [
    {
      secret: "你昨晚走得虽然晚，但纯粹是因为把工作电脑落下了回去取，没有碰过会议室。",
      mission: "核对大家的离场时间，找出时间线有矛盾的谎言者。",
      knownInformation: [
        "昨晚21点10分左右大楼灯光出现过一次闪烁。"
      ]
    },
    {
      secret: "你昨晚在楼梯间听到有人压低声音在用英文或者方言打电话汇报进度。",
      mission: "找出是谁在伪装不在场证明，协助好人阵营投票胜出。",
      knownInformation: [
        "打电话的人提到了『文件已经到手，今晚安排交接』。"
      ]
    }
  ],
  openingEvents: [
    {
      title: "第一轮事件 · 损坏的门禁刷卡记录",
      description: "AI导演调取了昨晚办公室的门禁日志：昨晚21:17分，有一名员工刷卡进入了主会议室，但该记录的员工编号被恶意软件覆盖为乱码！六名在场人员均有出入可能。",
      publicClue: "公共线索：刷卡记录显示该人员只在会议室停留了1分40秒，目标极其明确。",
      discussionPrompt: "请各位依据自己的公开职业和昨晚行踪发言，谁的嫌疑最大？"
    },
    {
      title: "第一轮事件 · 会议桌上的半截咖啡纸杯",
      description: "AI导演勘察现场：失窃的企划案原本锁在主会议室展台上，现在展台玻璃罩被无损开启，展台旁遗留了一杯还冒着微温的拿铁咖啡纸杯与模糊指纹。",
      publicClue: "公共线索：茶水间今晨的咖啡渣显示，昨晚21点后只有2种饮品被制作过。",
      discussionPrompt: "大家昨晚都在哪里？谁有打开玻璃罩的钥匙或权限？"
    }
  ],
  round2Events: [
    {
      title: "第二轮追加线索 · 恢复的3分钟走廊监控截帧",
      description: "AI导演配合IT部门技术修复：提取到21:16分走廊监控恢复前的一帧模糊倒影！倒影中出现了一条灰色袖口，并且胸前挂着公司工牌的挂绳扣。",
      publicClue: "公共线索：倒影中的嫌疑人身高在165~180cm之间，手腕上有一块反光的金属表带或饰品。",
      discussionPrompt: "对照各自身份细节，有人在掩盖自己的着装或配饰！"
    },
    {
      title: "第二轮追加线索 · 废纸篓中的碎纸机复原",
      description: "AI导演拼接碎纸机碎片：碎纸机中被切碎的并不是商业企划案，而是一份『昨晚安保巡检排班表』，有人在有预谋地避开保安巡逻路线！",
      publicClue: "公共线索：碎纸机开启时间锁定在昨晚21:24，这证明作案者在得手后并未立刻离开。",
      discussionPrompt: "在场谁熟悉安保巡查时间？谁在昨晚21:24分还在公司逗留？"
    }
  ],
  twistFallbacks: [
    {
      title: "第三轮AI反转 · 被忽略的绝对时间差",
      description: "AI导演深度比对全场口供与底层日志，发现了一个致命破绽：走廊监控故障发生在21:15，而门禁刷卡发生在21:17！这意味着制造技术盲区的人，很可能与拿走文件的人不是同一种手法！",
      publicClue: "反转线索：真正拿走文件的人利用了一张伪造的访客临时卡，而现场某人一直在极力转移视线，引导大家怀疑技术岗或最晚离开的人！",
      discussionPrompt: "现在局势出现重大反转！审视前两轮发言中最能『带节奏』的人，谁是内鬼？"
    },
    {
      title: "第三轮AI反转 · 保险柜的紫外线暗记激活",
      description: "AI导演开启全场紫外线侦测：发现失踪企划案的真实复印件并没有被带出大楼，而是被藏在了现场某个人的随身公文包或衣服夹层中！且作案者手上沾染了无色荧光粉！",
      publicClue: "反转线索：根据前两轮被指责最多的对象分析，真正的内鬼一直在『顺水推舟』附和他人，表现得极其无辜！",
      discussionPrompt: "内鬼就在我们之中！请结合前两轮每个人的投票倾向与发言破绽，锁定终极目标！"
    }
  ]
};

export const TRAP_MISSIONS = [
  { keyword: "加班", description: "诱导任意好人在公开发言中主动说出「加班」" },
  { keyword: "发誓", description: "诱导任意好人在公开发言中主动说出「发誓」或「我发誓」" },
  { keyword: "监控", description: "诱导任意好人在公开发言中主动说出「监控」" },
  { keyword: "不信", description: "诱导任意好人在公开发言中主动说出「不信」" },
  { keyword: "年终奖", description: "诱导任意好人在公开发言中主动说出「年终奖」" },
  { keyword: "背锅", description: "诱导任意好人在公开发言中主动说出「背锅」" },
  { keyword: "证据", description: "诱导任意好人在公开发言中主动说出「证据」" },
  { keyword: "清白", description: "诱导任意好人在公开发言中主动说出「清白」" },
  { keyword: "开玩笑", description: "诱导任意好人在公开发言中主动说出「开玩笑」" },
  { keyword: "查账", description: "诱导任意好人在公开发言中主动说出「查账」" },
];

export const LIVESTREAM_THEME: ThemeTemplate = {
  themeId: "livestream_disaster",
  themeName: "电商直播翻车案 · 恶意0元购",
  background: "昨晚破亿GMV的年中大促直播间，一款原价9999元的旗舰手机被神秘人改成了『0元秒杀』，瞬间被薅走上万台！负责商品链接配置、运营、中控和主播全员被召集紧急复盘。",
  roles: [
    {
      roleName: "王牌带货主播",
      duty: "负责台前叫卖促单，掌握全场节奏",
      defaultSecret: "你在开播前10分钟，曾催促运营赶紧把秒杀链接挂上，没仔细看后台价格确认单。",
      defaultMission: "证明自己的口播节奏无误，把责任从直播表现上剥离。",
      knownClues: ["中控台在20:15分曾经发生过一次断网重连。", "老板在直播间特意强调过这款手机利润极薄。"]
    },
    {
      roleName: "核心运营主管",
      duty: "掌管商家后台价格配置与优惠券生成",
      defaultSecret: "你昨晚因连轴加班昏昏欲睡，但你清晰记得自己在后台输入的是9999元并点击了二级审核。",
      defaultMission: "找出谁动了你的电脑后台，证明不是你手抖输错价格。",
      knownClues: ["后台修改日志的IP地址居然来自直播间现场的公用Wi-Fi。", "桌上留着一张写有管理员临时密码的便签。"]
    },
    {
      roleName: "中控台技术",
      duty: "负责直播推流设备、上架弹窗与网络环境",
      defaultSecret: "昨晚商品弹窗突然弹出时，你发现弹窗标题多了两个特殊字符，像是被脚本批量替换的。",
      defaultMission: "利用技术排查洗清自己的嫌疑，指出真正上传异常数据的人。",
      knownClues: ["现场有一部没有插SIM卡的备用手机曾经连接过中控蓝牙。", "推流电脑的浏览记录里有二手倒卖群的网页。"]
    },
    {
      roleName: "商家驻场代表",
      duty: "监督品牌价格形象，核实库存损耗",
      defaultSecret: "你其实在秒杀开始前30秒就发现了价格异常，但当时因为跟运营有私人过节犹豫了一下没喊停。",
      defaultMission: "隐藏自己知情不报的失职，引导大家把焦点放在恶意修改者身上。",
      knownClues: ["今早已经有黄牛群在低价出这批订单提货码。", "现场某人在秒杀爆发时嘴角露出过一丝笑意。"]
    },
    {
      roleName: "场控小助理",
      duty: "搬运样品、递纸巾并管理现场人员出入",
      defaultSecret: "你昨晚在洗手间听到有人兴奋地发语音说：『今晚准备大赚一笔换新车』。",
      defaultMission: "让大家相信你的证言，别被当做替罪羊。",
      knownClues: ["洗手间走出来的人穿了一件黑色连帽衫。", "更衣室垃圾桶里有一盒被撕碎的手机包装条码。"]
    },
    {
      roleName: "品牌合伙人",
      duty: "统筹全盘，负责最终盈亏问责",
      defaultSecret: "公司后台其实设定了『单笔最高亏损预警』，但昨晚这道防火墙被人故意关闭了。",
      defaultMission: "揪出团队里的蛀虫，挽回品牌声誉和重大经济损失。",
      knownClues: ["关闭防火墙的权限只有高管和技术核心账号拥有。", "昨晚直播间门禁在事故发生后有人匆忙跑出大楼。"]
    }
  ],
  spySecrets: [
    {
      secret: "正是你提前串通黄牛工作室，利用备用设备植入篡改脚本修改了商品券！",
      mission: "极力隐藏内鬼身份，将锅甩给运营的手误或者中控网络故障！",
      knownInformation: ["你知道脚本的具体生效时间在20:18分。", "只要投票不被抓，黄牛分润几百万就能到手！"]
    }
  ],
  normalSecretsPool: [
    {
      secret: "你昨晚忙于对接水军控评，没有碰过任何商品价格配置后台。",
      mission: "比对大家的行动轨迹，找出那个真正有作案时间和动机的内鬼。",
      knownInformation: ["昨晚20:10分左右现场有人动过前台主机。"]
    }
  ],
  openingEvents: [
    {
      title: "第一轮事件 · 诡异的后台操作IP",
      description: "AI导演锁定服务器审计日志：恶意0元购发生前3分钟，一个匿名设备通过直播间内网向价格库发送了强制覆盖指令！",
      publicClue: "公共线索：指令来源设备是一台iOS设备，且带有蓝牙调试标记。",
      discussionPrompt: "昨晚在场谁一直在摆弄手机或具备后台权限？请交代你们的操作！"
    }
  ],
  round2Events: [
    {
      title: "第二轮追加线索 · 微信黄牛群的神秘截图",
      description: "AI导演截获某大型薅羊毛群的爆料图：早在秒杀前2小时，就有人预告了『今晚某头部直播间有万台0元机』！",
      publicClue: "公共线索：爆料截图中的手机电量和顶部通知栏暴露了一个特殊APP的图标。",
      discussionPrompt: "内鬼早就提前策划好了一切！对照各自的工作习惯与言辞破绽！"
    }
  ],
  twistFallbacks: [
    {
      title: "第三轮AI反转 · 消失的权限回收记录",
      description: "AI导演深度复盘安全网关日志：原本被大家指责为失职的人，其账号在案发时其实处于被锁死状态！真正的改价者伪造了他人的登录态！",
      publicClue: "反转线索：真正操作者在直播间假装十分焦急，却在关键时刻引导大家去排查外部黑客！",
      discussionPrompt: "现在，全场最具嫌疑的人瞬间逆转！谁在故意把水搅浑？"
    }
  ]
};

export const CAMPUS_THEME: ThemeTemplate = {
  themeId: "campus_night",
  themeName: "大学宿舍 · 深夜失窃的绝版外卖",
  background: "凌晨1点，期末周的404男生宿舍，期盼已久、排队3小时才买到的限量版绝味烤串外卖在门口走廊凭空消失！只留下一袋撕开的湿纸巾与扑鼻的孜然香气。",
  roles: [
    {
      roleName: "舍长(学霸)",
      duty: "统筹寝室纪律与熄灯作息",
      defaultSecret: "你昨晚在走廊背英语单词到凌晨1点，隐约看到走廊尽头有个鬼祟的身影在嚼东西。",
      defaultMission: "用缜密的逻辑维护寝室正义，找出谁偷吃了兄弟们的大餐。",
      knownClues: ["走廊声控灯昨晚坏了两个。", "垃圾桶旁有一根带有骨肉相连印记的竹签。"]
    },
    {
      roleName: "电竞大神",
      duty: "夜夜通宵排位，掌握深夜网速与门外动静",
      defaultSecret: "你昨晚戴着降噪耳机打排位，但中间下楼打过一次开水，路过门外时外卖还在。",
      defaultMission: "证明自己专注电竞毫无作案时间，找出真正嘴馋的罪魁祸首。",
      knownClues: ["隔壁402宿舍昨晚有人聚众打扑克。", "门缝底下曾飘进过浓郁的麻辣孜然味。"]
    },
    {
      roleName: "健身达人",
      duty: "严格控制热量与蛋白质摄入",
      defaultSecret: "你昨晚断碳水饥肠辘辘，梦里全是肉串，但你坚称自己喝了蛋白粉就睡了。",
      defaultMission: "证明自己拥有严苛的自律意志，绝不可能是偷吃宵夜的人！",
      knownClues: ["洗漱台上有一滴疑似甜面酱的污渍。", "有人昨晚悄悄开过窗户散味。"]
    },
    {
      roleName: "隔壁蹭网常客",
      duty: "常年混迹404寝室蹭空调蹭网",
      defaultSecret: "你昨晚在404宿舍沙发上刷短视频到12:40，离开时顺手拿了张纸巾擦汗。",
      defaultMission: "洗清自己外人作案的重大嫌疑，找出404内部的偷吃真凶。",
      knownClues: ["404某人今天的书包里散发着挥之不去的烧烤香味。", "宿管阿姨昨晚12点半就锁了大门。"]
    }
  ],
  spySecrets: [
    {
      secret: "正是你忍不住诱惑，在走廊黑灯瞎火中把整袋烤串偷偷拿回床帘里炫完了！",
      mission: "打死不承认！把怀疑引向外卖员送错或者隔壁寝室路过顺走！",
      knownInformation: ["你把吃剩的竹签藏在了上铺床垫夹层里。", "只要熬过投票，明天大家就会把这事当成未解之谜！"]
    }
  ],
  normalSecretsPool: [
    {
      secret: "你昨晚肚子疼跑了3次卫生间，每次出来走廊都静悄悄的。",
      mission: "比对大家的时间差，抓出那个满嘴谎言的偷吃内鬼！",
      knownInformation: ["凌晨00:50分听到过走廊塑料袋沙沙作响。"]
    }
  ],
  openingEvents: [
    {
      title: "第一轮事件 · 门把手上的孜然指纹",
      description: "AI导演勘察案发现场：门外放置外卖的凳子上只剩塑料袋底托，门外把手上检测到了高浓度的孜然与特辣辣椒面痕迹！",
      publicClue: "公共线索：作案者是用右手握住门把手的，指尖留有微量酱汁。",
      discussionPrompt: "昨晚谁碰过门把手？谁在深夜离开过寝室？快坦白！"
    }
  ],
  round2Events: [
    {
      title: "第二轮追加线索 · 宿管走廊监控的模糊反光",
      description: "AI导演调取楼道监控：虽然夜视模糊，但00:55分有一道穿着灰色睡裤的身影出现在外卖摆放点！",
      publicClue: "公共线索：嫌疑人身材中等，且吃完后有一系列舔手指的动作！",
      discussionPrompt: "对照各自身份和昨晚穿着，有人在隐瞒自己的作案动机！"
    }
  ],
  twistFallbacks: [
    {
      title: "第三轮AI反转 · 床帘缝隙漏出的微弱气味",
      description: "AI导演启动空气动力学分析：走廊窗户是通风口，真正的气味源头根本不是从门外飘进来的，而是从宿舍内某位同学的床铺正上方飘散开的！",
      publicClue: "反转线索：偷吃者就藏在寝室内部！而且昨晚一直在假装义愤填膺，疯狂帮失主骂小偷！",
      discussionPrompt: "好一招贼喊捉贼！谁昨晚骂得最凶、分析得最起劲，谁就是内鬼！"
    }
  ]
};

export const PRESET_THEMES: ThemeTemplate[] = [
  COMPANY_THEME,
  LIVESTREAM_THEME,
  CAMPUS_THEME,
];

export function getThemeById(themeId?: string): ThemeTemplate {
  if (!themeId) return COMPANY_THEME;
  const found = PRESET_THEMES.find((t) => t.themeId === themeId);
  return found || COMPANY_THEME;
}

export function getRandomTrapMission() {
  return TRAP_MISSIONS[Math.floor(Math.random() * TRAP_MISSIONS.length)];
}

export const FALLBACK_REPORTS: Record<Team, {
  summary: string;
  bestDetective: string;
  bestActor: string;
  funniestMoment: string;
  biggestTwist: string;
}> = {
  [Team.NORMAL]: {
    summary: "普通员工阵营凭借敏锐的逻辑推理与严密的时间线还原，在第三轮AI反转的关键时刻识破了内鬼的诡辩，成功在最终投票中将真凶逮捕归案！商业机密得以保全！",
    bestDetective: "凭借对时间差破绽的致命一击，成功带领全场逆风翻盘！",
    bestActor: "内鬼虽然伪装得极其逼真，但由于急于甩锅，最终在细节中露出了马脚。",
    funniestMoment: "当事人坚称自己昨晚只是回公司给绿植浇水，引得全场爆笑。",
    biggestTwist: "原本所有人都怀疑最晚离开会议室的人，第三轮AI揭露临时卡真相后瞬间全员反水！"
  },
  [Team.SPY]: {
    summary: "内鬼阵营运筹帷幄，成功借助虚实交替的线索挑拨了普通员工之间的互信，最终让大家在投票时误杀了无辜同事，内鬼携绝密机密从容脱身！",
    bestDetective: "试图力挽狂澜但被全场节奏淹没的悲情侦探。",
    bestActor: "全程无辜纯良，演技堪比奥斯卡影帝，甚至带头为受害者喊冤！",
    funniestMoment: "无辜的好人被大家当成铁内鬼围攻，辩解到语无伦次。",
    biggestTwist: "直到最终结算页面揭晓，大家才震惊地发现真正的小丑竟是自己！"
  }
};
