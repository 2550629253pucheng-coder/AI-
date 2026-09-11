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
