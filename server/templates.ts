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
  { keyword: "报警", description: "诱导任意好人在公开发言中主动说出「报警」" },
  { keyword: "前任", description: "诱导任意好人在公开发言中主动说出「前任」" },
  { keyword: "手抖", description: "诱导任意好人在公开发言中主动说出「手抖」" },
  { keyword: "窗帘", description: "诱导任意好人在公开发言中主动说出「窗帘」" },
  { keyword: "胃痛", description: "诱导任意好人在公开发言中主动说出「胃痛」" },
  { keyword: "失眠", description: "诱导任意好人在公开发言中主动说出「失眠」" },
  { keyword: "借钱", description: "诱导任意好人在公开发言中主动说出「借钱」" },
  { keyword: "红酒", description: "诱导任意好人在公开发言中主动说出「红酒」" },
  { keyword: "耳鸣", description: "诱导任意好人在公开发言中主动说出「耳鸣」" },
  { keyword: "密码", description: "诱导任意好人在公开发言中主动说出「密码」" },
  { keyword: "梦游", description: "诱导任意好人在公开发言中主动说出「梦游」" },
  { keyword: "录音笔", description: "诱导任意好人在公开发言中主动说出「录音笔」" },
  { keyword: "发卡", description: "诱导任意好人在公开发言中主动说出「发卡」" },
  { keyword: "墨镜", description: "诱导任意好人在公开发言中主动说出「墨镜」" },
  { keyword: "过敏", description: "诱导任意好人在公开发言中主动说出「过敏」" },
  { keyword: "打针", description: "诱导任意好人在公开发言中主动说出「打针」" },
  { keyword: "双胞胎", description: "诱导任意好人在公开发言中主动说出「双胞胎」" },
  { keyword: "私房钱", description: "诱导任意好人在公开发言中主动说出「私房钱」" },
  { keyword: "辞职信", description: "诱导任意好人在公开发言中主动说出「辞职信」" },
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

export const CRUISE_THEME: ThemeTemplate = {
  themeId: "cruise_heist",
  themeName: "豪华游轮慈善夜 · 消失的海洋之星",
  background: "公海航行的维多利亚号顶层宴会厅，价值两亿的稀世蓝钻「海洋之星」在熄灯切蛋糕的瞬间被调包成玻璃仿制品！游轮目前全速航行在无信号公海，大门已锁，嫌疑人就在贵宾之中！",
  roles: [
    {
      roleName: "珠宝大亨",
      duty: "项链提供者，负责验真与慈善拍卖主导",
      defaultSecret: "你在开宴前半小时发现保险柜封条有轻微裂纹，但由于拍卖在即未敢声张。",
      defaultMission: "查明谁动过保险柜，洗脱自导自演骗保的嫌疑。",
      knownClues: ["保险柜备用钥匙只有船长和你各有一把。", "现场侍应生有人换过餐盘布。"]
    },
    {
      roleName: "维多利亚船长",
      duty: "统筹全船安保与航行航线",
      defaultSecret: "熄灯前5分钟，配电室报告曾发生一次毫秒级的电压骤降，监控有半分钟雪花屏。",
      defaultMission: "在靠岸前揪出盗贼，防止游轮声誉扫地。",
      knownClues: ["轮机舱通往宴会厅的货梯有一次未经授权的使用记录。", "有人携带了微型激光切割工具。"]
    },
    {
      roleName: "当红影星",
      duty: "受邀佩戴项链登台走秀的慈善大使",
      defaultSecret: "你在后台摘下项链交接给安保时，隐约感觉锁扣的刻字手感与试戴时不同。",
      defaultMission: "证明自己的交接全程透明，揪出幕后黑手。",
      knownClues: ["后台更衣室有一面活动全身镜后面通向通风管道。", "有一位侍者在你走秀前递了杯香槟。"]
    },
    {
      roleName: "私家侦探",
      duty: "受主办方秘密委托的随船便衣安保顾问",
      defaultSecret: "你追踪国际大盗「夜枭」登船，发现他的作案手法与今晚的调包高度吻合！",
      defaultMission: "利用排查排除无辜者，锁定全场嫌疑最大的潜伏内鬼！",
      knownClues: ["有人在半小时前向海里扔下过一个带荧光浮标的防水包。", "宴会厅吊灯上的螺丝有松动过的痕迹。"]
    }
  ],
  spySecrets: [
    {
      secret: "正是你提前伪造了高仿宝石，在全场熄灯的刹那完成了精准掉包！真宝石正藏在你的随身物品中！",
      mission: "极力指责某位贵宾监守自盗，拖延到投票结束，顺利脱身！",
      knownInformation: ["你将真宝石藏在了香槟冰桶底层的隔水密封层里。", "只要熬过今晚，公海接应快艇就会抵达。"]
    }
  ],
  normalSecretsPool: [
    {
      secret: "你昨晚在甲板吹风，撞见有人在黑暗中用英文低声打卫星电话谈论价格。",
      mission: "比对在场人员的外语习惯和时间线，揪出内鬼！",
      knownInformation: ["通话者佩戴着一枚带有蛇形纹章的袖扣。"]
    }
  ],
  openingEvents: [
    {
      title: "第一轮调查 · 冰桶里的假宝石荧光",
      description: "AI导演现场验光：展示台上的宝石在紫外线照射下无任何荧光反应，确系劣质玻璃仿品！而现场配电闸刀上检测到了防滑滑石粉残留！",
      publicClue: "公共线索：作案者在熄灯瞬间不仅动作快，而且对宴会厅地形极为熟悉，能盲走至展台！",
      discussionPrompt: "熄灯瞬间，你们每个人到底在什么方位？谁的手心沾有滑石粉？"
    }
  ],
  round2Events: [
    {
      title: "第二轮追加线索 · 通风口散落的黑色手套",
      description: "AI导演勘测宴会厅上方吊顶：在贵宾席正上方的通风排气扇叶上发现了一只带有微量红酒污渍的黑色特制手套！",
      publicClue: "公共线索：谁在今晚碰过红酒？手套尺寸属于中等偏大骨架！",
      discussionPrompt: "对比全场手型与今晚饮品记录，嫌疑范围已大幅收窄！"
    }
  ],
  twistFallbacks: [
    {
      title: "第三轮AI反转 · 船长室的虚假报警信号",
      description: "AI导演解密航海日志：所谓的断电故障根本不是意外，而是有人从贵宾内线电话伪造了机舱险情指令！",
      publicClue: "反转线索：真正的大盗一直在伪装成热心的组织者，甚至带头催促大家搜身！",
      discussionPrompt: "带头查凶手的人往往最想转移注意力！重新审视最积极的人！"
    }
  ]
};

export const MOVIE_THEME: ThemeTemplate = {
  themeId: "movie_set_sabotage",
  themeName: "剧组杀青宴 · 突如其来的威亚事故",
  background: "大制作玄幻武侠巨制《青云诀》杀青宴当晚，男一号的替身演员在最终航拍特技时威亚钢丝离奇断裂险些酿成惨祸。道具组坚称出库前三次过检，究竟是谁剪断了钢丝？",
  roles: [
    {
      roleName: "总导演",
      duty: "统筹全戏拍摄与各组人员协作",
      defaultSecret: "你此前因为补拍镜头与动作指导发生过激烈争执，且剧组投了巨额保额。",
      defaultMission: "查明事故真相，证明自己绝没有为骗保或炒作动过手脚。",
      knownClues: ["道具间的监控钥匙此前由场记保管。", "男一号昨晚曾要求更换拍摄顺序。"]
    },
    {
      roleName: "武术动作指导",
      duty: "设计高危动作并负责威亚与防护垫布置",
      defaultSecret: "你在开拍前曾发现钢丝承重扣有些许生锈，但以为只是表层氧化便没有立刻换新。",
      defaultMission: "证明自己的专业性，找出蓄意物理剪断钢丝的元凶。",
      knownClues: ["断口呈明显的斜角剪切痕迹，绝非自然拉伸磨损！", "昨晚有剧组非技术人员进入过器械棚。"]
    },
    {
      roleName: "场记统筹",
      duty: "记录拍摄日志、保管各部门备用物资与排班",
      defaultSecret: "你在昨晚收工时，发现道具间借还登记册有两页被人撕掉了。",
      defaultMission: "还原谁在昨晚最晚归还工具，找出嫌疑人。",
      knownClues: ["化妆间有一把工业级液压剪不翼而飞。", "有演员昨晚偷偷将剧组工作证借给过助理。"]
    },
    {
      roleName: "领衔主演男一号",
      duty: "剧组票房核心，原本该由他亲自完成该组高空戏",
      defaultSecret: "你临上场前因为突然拉肚子让替身上场，因此侥幸躲过一劫。",
      defaultMission: "洗刷自己故意找替身背锅的嫌疑，揪出想谋害自己的内鬼。",
      knownClues: ["你昨天喝的矿泉水盖子曾经被拧开过。", "有竞争对手此前买通剧组人员的传闻。"]
    }
  ],
  spySecrets: [
    {
      secret: "正是你蓄意破坏了威亚装置，意图制造重大停工事故阻碍影片上映！",
      mission: "将责任推给武术组疏忽或器材老化，安全隐匿！",
      knownInformation: ["液压剪被你塞进了道具假山底部的夹层中。", "你故意在现场留下了混淆视听的假脚印。"]
    }
  ],
  normalSecretsPool: [
    {
      secret: "你昨晚在片场听到有人在棚后小树林商量『明天一早戏肯定拍不成』。",
      mission: "寻找谁拥有破坏道具的直接动机！",
      knownInformation: ["说话的人穿的是带有剧组Logo的黄色工装裤。"]
    }
  ],
  openingEvents: [
    {
      title: "第一轮勘验 · 威亚接口的整齐斜切面",
      description: "AI导演现场微观分析：威亚主承重钢丝的7股细丝中有5股被工业剪整齐剪断，仅靠2股残余支撑，受力到30公斤即崩断！这是百分之百的人为谋害！",
      publicClue: "公共线索：作案时间在昨晚20点道具封箱后至今天凌晨6点开机前！",
      discussionPrompt: "昨晚谁最后一个离开器械大棚？谁有机会拿到液压剪？"
    }
  ],
  round2Events: [
    {
      title: "第二轮追加线索 · 化妆镜上的口红恐吓信",
      description: "AI导演在主演休息室勘查：镜面上留下了『好戏在后头』的口红字迹，所用色号竟是剧组特定配发的道具口红！",
      publicClue: "公共线索：作案者能自由出入主演私密休息室，关系极为熟稔！",
      discussionPrompt: "内鬼不是外部人员，就是天天抬头不见低头见的熟人！"
    }
  ],
  twistFallbacks: [
    {
      title: "第三轮AI反转 · 剧照师偷拍到的花絮背景",
      description: "AI导演智能增强一张幕后照片：在昨晚22点的一张花絮自拍背景模糊角落，清晰出现了一双手正将金属剪刀塞进羽绒服！",
      publicClue: "反转线索：羽绒服左袖口有一道明显的银色反光标！全场谁穿过这件衣服？",
      discussionPrompt: "物证确凿！衣服的主人和替罪羊是谁？立刻对质！"
    }
  ]
};

export const SPACE_THEME: ThemeTemplate = {
  themeId: "space_station_crisis",
  themeName: "深空科考站 · 致命的供氧阀过载",
  background: "地月轨道L2拉格朗日点的「逐日号」深空科考站，主生命维持系统的大容量氧气调节阀被恶意注入逻辑炸弹，导致储备氧气正以3倍速度泄漏！距离外部穿梭机救援还有2小时，内鬼就在舱内4名航天员中！",
  roles: [
    {
      roleName: "空间站站长",
      duty: "统筹全站物资分配与紧急避险决策",
      defaultSecret: "你在警报响起前，曾收到地面指挥中心关于站内某人可能有严重心理评估不合格的加密预警。",
      defaultMission: "在氧气耗尽前找出破坏者，手动恢复备用阀门！",
      knownClues: ["主控计算机的物理覆盖权限卡一直插在中央机房。", "生命舱备用氧气罐已被提前挂锁。"]
    },
    {
      roleName: "首席维保工程师",
      duty: "负责空间站外壳、循环管路与阀门维护",
      defaultSecret: "你昨晚在进行出舱例行巡检时，发现供氧管路的旁路截止阀螺栓被故意反向拧紧！",
      defaultMission: "用机械工程专业知识证明自己的清白，揪出乱动阀门的凶手。",
      knownClues: ["反向螺栓需要专用的力矩扳手才能操作。", "中央气闸舱的气压日志有10分钟记录被覆写。"]
    },
    {
      roleName: "天体生物学家",
      duty: "负责月壤微生态与封闭温室氧气产出实验",
      defaultSecret: "你的温室植物培养箱今天早上被突然注入了超标杀菌剂，导致全舱光合释氧中断！",
      defaultMission: "指出谁最害怕真相被带回地球，找出深空叛徒。",
      knownClues: ["杀菌剂的调用记录使用了站长的通用权限代码。", "实验日志显示有人昨晚下载了全部菌种样本。"]
    },
    {
      roleName: "通信与导航官",
      duty: "维系与地面测控站的深空高频激光通信",
      defaultSecret: "在阀门过载前1小时，你截获了一段通过短波向未知深空探测器发送的高密电文。",
      defaultMission: "解析出内鬼的通讯特征，带领大家识别破坏分子。",
      knownClues: ["激光发射天线昨晚被手动调整了15度指向未公开空域。", "通信终端键盘上检测到有微量导热硅脂。"]
    }
  ],
  spySecrets: [
    {
      secret: "正是你为了掩盖窃取绝密天体样本的行径，蓄意制造供氧危机以迫使空间站全员弃站！",
      mission: "将泄漏原因伪装成宇宙微流星撞击或系统软硬件冲突，隐藏到底！",
      knownInformation: ["你将力矩扳手吸附在失重睡眠舱的脚底盲区。", "只要坚持到全员进入休眠舱，样本就是你的了。"]
    }
  ],
  normalSecretsPool: [
    {
      secret: "你昨晚失眠在观察窗看星空，看到有人在气闸舱穿着轻便宇航服摆弄工具箱。",
      mission: "盘问每个人的活动路线，揪出偷动管路的人！",
      knownInformation: ["嫌疑人身材矫健，动作非常麻利。"]
    }
  ],
  openingEvents: [
    {
      title: "第一轮警报 · 氧气浓度骤降至16%",
      description: "AI导演空间站中枢广播：主生命保障区氧气浓度已从标准的21%骤降至16.2%！主阀门传感器被代码篡改，强制处于全开排空状态！",
      publicClue: "公共线索：该修改指令是从站内物理控制台输入的，排除了地面黑客远程攻击的可能！",
      discussionPrompt: "案发时谁坐在物理控制台旁？快坦白各自的操作记录！"
    }
  ],
  round2Events: [
    {
      title: "第二轮追加线索 · 气闸舱失落的备用磁卡",
      description: "AI导演扫描减压舱地板：在通往废气排空口的管道旁发现了一张折断的黄色操作磁卡！",
      publicClue: "公共线索：磁卡表面沾有植物营养液痕迹！",
      discussionPrompt: "谁去过植物温室？谁有理由接触这张绝密磁卡？"
    }
  ],
  twistFallbacks: [
    {
      title: "第三轮AI反转 · 黑匣子冗余备份被唤醒",
      description: "AI导演成功恢复一段被删除的机舱内拾音音频：案发前3分钟，有人在低声自言自语『抱歉，我不能让这个成果回到地面』！",
      publicClue: "反转线索：音频声纹与在场某位平时话最少、表现最老实的人高度吻合！",
      discussionPrompt: "深空内鬼已经走投无路！全员合力票选将其关进禁闭舱！"
    }
  ]
};

export const AUCTION_THEME: ThemeTemplate = {
  themeId: "art_gallery_counterfeit",
  themeName: "拍卖行之夜 · 换掉国宝的瞒天过海",
  background: "嘉德国际春拍预展最后一夜，估值过亿的北宋绝品青花瓷在特级恒温金库被调包！金库装有重量感应托盘与微波雷达，警报居然一声未响，只有行内顶尖专家才具备这种技术！",
  roles: [
    {
      roleName: "首席古董鉴定师",
      duty: "负责全部拍品真伪终审与出库鉴定签名",
      defaultSecret: "你在昨晚闭馆复核时，曾用放大镜发现瓷器釉底的开片有极其细微的化学做旧酸味。",
      defaultMission: "洗刷自己开出假证明的失职嫌疑，揪出将真品带出金库的人。",
      knownClues: ["金库重力感应器公差在5克之内，掉包者准备了分毫不差的配重仿品！", "押运公司昨晚送来了空的保险箱。"]
    },
    {
      roleName: "安保部技术主管",
      duty: "掌控全馆高清红外热成像与双重门禁",
      defaultSecret: "昨晚金库门禁系统记录显示，你的主管理员账号曾在02:14登录并关闭了微波探测器30秒。",
      defaultMission: "证明自己的账号遭到盗用或克隆，找出真正的技术窃贼。",
      knownClues: ["登录IP来自馆内贵宾休息室的内网插孔。", "有一名保洁员昨晚在金库外滞留过长。"]
    },
    {
      roleName: "拍卖行高级合伙人",
      duty: "负责大客户撮合与本次春拍的海外买家联络",
      defaultSecret: "你欠下了数千万的海外离岸债务，急需巨额资金周转，今晚曾独自接待神秘买家。",
      defaultMission: "证明自己的商业操守，洗清监守自盗的嫌疑。",
      knownClues: ["一位中东买家昨天提出愿意以私洽形式全款截胡该拍品。", "公文包里有调配好的特种硅胶手模。"]
    },
    {
      roleName: "艺术品修复大师",
      duty: "负责古董瓷器的表面除尘、保护膜喷涂与微损修复",
      defaultSecret: "你曾亲手参与过该瓷器的无痕加固，世上只有你和制作者深知其胎体厚度与重心位置。",
      defaultMission: "证明自己的艺术名誉，指出那个懂行却走上邪路的真凶！",
      knownClues: ["高仿品所用的做旧土料正是来自你工作室惯用的定制配方！", "昨天有人向你借过高精度电子天平。"]
    }
  ],
  spySecrets: [
    {
      secret: "正是你勾结买家完成了这起天衣无缝的掉包，真品已被你通过特许艺术品物流通道运走！",
      mission: "将怀疑引向安保系统的技术故障或买家监守自盗，顺利脱身！",
      knownInformation: ["你利用了3D扫描打印的高仿瓷胎，重量误差仅1.2克。", "假瓷器的底部藏有你擦拭指纹遗留的纤维。"]
    }
  ],
  normalSecretsPool: [
    {
      secret: "你昨晚在贵宾室门口听到过瓷器轻微碰撞的清脆声响，当时时间是凌晨两点多。",
      mission: "比对在场各位的不在场证明，抓出监守自盗者！",
      knownInformation: ["走廊留有一道特殊的皮鞋胶底擦痕。"]
    }
  ],
  openingEvents: [
    {
      title: "第一轮公开展验 · 荧光下的微观现代颜料",
      description: "AI导演高光谱仪器现场扫描：国宝青花瓷盘口边缘在伍德灯下显现出荧光反应，其青花发色并非苏麻离青，而是现代化学钴料！国宝被调包了！",
      publicClue: "公共线索：仿品的重心比例与真品相差无几，作案者必定掌握极其精准的古董物理数据！",
      discussionPrompt: "谁能如此清楚国宝的精确克重？谁昨晚去过金库？"
    }
  ],
  round2Events: [
    {
      title: "第二轮追加线索 · 咖啡杯底的安眠成分",
      description: "AI导演化验值班安保桌上的外卖咖啡：里面被掺入了速效无味安眠药！",
      publicClue: "公共线索：外卖单上的付款人电话尾号与在场某人的副卡一致！",
      discussionPrompt: "给安保下药的罪证已经浮出水面，谁在自相矛盾？"
    }
  ],
  twistFallbacks: [
    {
      title: "第三轮AI反转 · 恒温箱暗盒里的录音",
      description: "AI导演发现金库温控箱背面吸附着一只正在闪烁红光的微型传输器！",
      publicClue: "反转线索：传输器正将数据传往在场某人的智能手表！真正的幕后主谋就在现场掌控全局！",
      discussionPrompt: "看好每个人的电子设备！内鬼就在眼前！"
    }
  ]
};

export const ESCAPE_THEME: ThemeTemplate = {
  themeId: "escape_room_trap",
  themeName: "密室逃脱店 · 假戏真做的失踪机关",
  background: "人气恐怖实景密室「404诡校」午夜测试场，扮演NPC的资深店长在终极机关室里离奇反锁且彻底失踪！机关门需要三把特制铜钥匙同时插入，现场却留下一滩血色油漆与凌乱的道具假发。",
  roles: [
    {
      roleName: "密室机关总设计师",
      duty: "负责全场气动门、磁吸锁与电路逻辑排布",
      defaultSecret: "你在今晚测试前发现终极机关门的气阀被偷偷加装了物理机械暗锁，只有你能开。",
      defaultMission: "查明谁动了电路，洗清自己故意困住店长的嫌疑。",
      knownClues: ["中控台的紧急断电开关曾被拉下过一次。", "店长的随身对讲机被丢在走廊道具棺材里。"]
    },
    {
      roleName: "控台场务GM",
      duty: "负责通过监控全场引导玩家、播放BGM与触发音效",
      defaultSecret: "你在店长进入终极房间时，因忙着接私人电话将监控画面切到了预录画面3分钟。",
      defaultMission: "证明自己的失职只是偶然摸鱼，并非与失踪案蓄谋串通。",
      knownClues: ["那3分钟里监控曾闪过一道穿着白大褂道具服的人影。", "现场配电柜有闻到焦糊味。"]
    },
    {
      roleName: "当家NPC演员",
      duty: "负责在密室各拐角追逐戏吓人，体力充沛且熟记所有暗道",
      defaultSecret: "你此前因为店长拖欠绩效奖金与他在休息室爆发过抓头发撕扯的肢体冲突。",
      defaultMission: "证明自己只是单纯敬业演鬼，没有伺机实施人身报复。",
      knownClues: ["你的演出白大褂袖口沾着红色油漆，但你坚称是道具血浆。", "店长今天带了一份解约协议。"]
    },
    {
      roleName: "内测VIP骨灰玩家",
      duty: "受邀前来刷榜破纪录的密室老玩家，对解谜逻辑了如指掌",
      defaultSecret: "你在上一轮测试中偶然解开了通向店长办公室私人保险柜的密码，发现了店长的秘密账本。",
      defaultMission: "证明自己只是单纯来玩密室，找出这场局中局的真正设计者！",
      knownClues: ["终极暗室的通风窗可以爬出一个成年人。", "现场留下了一串带有金属挂扣的钥匙。"]
    }
  ],
  spySecrets: [
    {
      secret: "正是你策划了店长的『伪失踪』与暗室反锁，意图嫁祸给剧组其他人以吞并密室所有权！",
      mission: "将一切怪异现象渲染为『密室真闹鬼』或『机械故障意外』，掩人耳目！",
      knownInformation: ["你把真实的第三把铜钥匙藏在了走廊假人模特的喉咙里。", "只要坚持到大家放弃搜寻，计划就成了。"]
    }
  ],
  normalSecretsPool: [
    {
      secret: "你在暗道里摸索时，碰到了一个戴着夜视仪的人正急匆匆把一件沉重大衣往暗格里塞。",
      mission: "辨别谁在黑灯瞎火中藏匿关键证物！",
      knownInformation: ["暗格旁边贴着安全出口的夜光指示贴。"]
    }
  ],
  openingEvents: [
    {
      title: "第一轮探查 · 锁死的双向气动合金门",
      description: "AI导演现场解析密室中控：原本应该用磁卡感应打开的安全门被从内侧用机械螺栓卡死！门缝下渗出带有刺鼻松香气味的红色液体！",
      publicClue: "公共线索：该螺栓必须在断电后的短短90秒内手动拧紧，作案者必定早有预谋！",
      discussionPrompt: "断电的90秒内，你们每个人各自在密室的哪个房间？"
    }
  ],
  round2Events: [
    {
      title: "第二轮追加线索 · 散落一地的道具符咒与手印",
      description: "AI导演在黑板机关前提取到一枚带油漆的完整掌纹！",
      publicClue: "公共线索：掌纹的主人惯用左手，且手掌边缘有老茧！",
      discussionPrompt: "伸出双手！谁符合这枚掌纹的特征？"
    }
  ],
  twistFallbacks: [
    {
      title: "第三轮AI反转 · 广播音箱里传来的暗号杂音",
      description: "AI导演过滤全场BGM音轨：在背景阴森音乐中，混入了一段极具节奏感的摩斯密码，正是在场某人手机闹钟的震动声！",
      publicClue: "反转线索：这场失踪从头到尾就是内鬼自导自演的调虎离山计！",
      discussionPrompt: "真相大白！找出那个伪造不在场证明的人！"
    }
  ]
};

export const PRESET_THEMES: ThemeTemplate[] = [
  COMPANY_THEME,
  LIVESTREAM_THEME,
  CAMPUS_THEME,
  CRUISE_THEME,
  MOVIE_THEME,
  SPACE_THEME,
  AUCTION_THEME,
  ESCAPE_THEME,
];

// 动态剧本池（包含预设 + AI动态生成沉淀的剧本）
export const dynamicThemesPool: ThemeTemplate[] = [...PRESET_THEMES];

export function registerDynamicTheme(theme: ThemeTemplate): void {
  const existingIdx = dynamicThemesPool.findIndex((t) => t.themeId === theme.themeId);
  if (existingIdx >= 0) {
    dynamicThemesPool[existingIdx] = theme;
  } else {
    dynamicThemesPool.unshift(theme); // 放在前面，最新生成优先
  }
}

export function getAllThemes(): ThemeTemplate[] {
  return dynamicThemesPool;
}

export function getThemeById(themeId?: string): ThemeTemplate {
  if (!themeId) return COMPANY_THEME;
  const found = dynamicThemesPool.find((t) => t.themeId === themeId) || PRESET_THEMES.find((t) => t.themeId === themeId);
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

