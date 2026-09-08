# B2 P3 四张知识点卡片与 50 题映射审计

日期：2026-09-06

执行状态：`Gate 0 accepted with 3 needs-review items`

执行授权：用户已要求按 [实施文档](READER_B2_P3_KNOWLEDGE_CARDS_1234_IMPLEMENTATION.md) 完成任务。本审计冻结的是“卡片负责什么、题目主要跳到哪里”的边界；它不改动原题、答案、来源或学习记录。

## 审计结果

| 项目 | 结果 |
|---|---:|
| P3 正式题 | 50 |
| 有且只有一个主要卡片与主要分支 | 50 |
| `confirmed` | 47 |
| `needs-review` | 3 |
| `blocked` | 0 |
| 需要拆分稳定卡片 ID | 0 |

三项 `needs-review` 是 P3-Q011、P3-Q022、P3-Q024。它们都已经有可用的主要学习位置，但现行教材答案与题面可支持的范围之间存在限制，不能拿来写成绝对规则。

## 整体边界

```text
主动形动词卡：修饰的名词是动作发出者，怎样找中心名词、判断时间并让词尾一致。
被动形动词卡：修饰的名词是动作承受者，怎样区分过程、结果、长短尾及一致。
副动词意义卡：同一动作人已能成立时，两个动作之间是同时、先后、条件、原因还是让步。
副动词主体一致卡：两个动作能否由同一人或事物承担，以及不能时怎样改写。
```

因此，“副动词意义”不能代替“副动词主体一致”。前者回答“两个动作是什么关系”，后者回答“是谁做两个动作”。形动词两张卡都讲性、数、格，但主动卡先追问动作发出者，被动卡先追问动作承受者。

次要关联只供卡内跳读，不重复完整原题，也不创建第二份题目成绩。

## 卡片 A：主动形动词的一致

卡片 ID：`p3-active-participles`

### 概念覆盖账本

| 字段 | 冻结内容 |
|---|---|
| `learningTarget` | 读者能从句子中指出“哪个名词自己做动作”，再决定主动形动词的时间意义和性、数、格。 |
| `coreIdea` | 主动形动词把一个名词自己发出的动作压缩成这个名词的特征；它的词尾跟被说明名词，不跟短语中最近的名词。 |
| `necessaryBranches` | 先找中心名词；主动关系；现在时的同时、经常或固有特征；过去时的先前经历或完成结果；非主格位置的一致；与 `который` 从句的互换；带 `-ся` 的形式先看实际关系、不能只看词尾。 |
| `allowedCases` | 名词是动作的发出者；现在时形动词说明与谓语同时、经常或固有的行为；过去时形动词说明此前发生或完成的行为。 |
| `disallowedCases` | 名词只是动作承受者时，转交被动形动词卡；空位是句子状语而不是名词定语时，转交副动词卡。 |
| `limits` | 词尾一致、体和相对时间是三步判断，不能只凭一个词尾决定；某些试题答案只是在教材给定语境中优先。 |
| `repairOrProductionUse` | 先还原“哪个名词做动作”的两行句，再把从句压缩为形动词短语；压缩时不改变动作人和时间关系。 |
| `neighborHandoffs` | “名词承受动作”交给 `p3-passive-participles`；副动词怎样作为状语连接主句交给两张副动词卡。 |
| `sourceEvidence` | B2 原书文字版 1-15 题及其解析；同文件 `1883-1943` 的主动形动词说明；《新编俄语语法》`06 动词.md` 中形动词总则、主动形动词用法与从句互换。 |
| `unresolvedRisks` | Q011 的完成体答案符合教材选择，但未完成体在“项目当前包含规划”语境中也可能自然，不能写成后者绝对错误。 |

### 逐题映射

| exerciseId | primaryBranchId | secondaryBranchIds | mappingReason | evidenceRefs | status / risk |
|---|---|---|---|---|---|
| P3-Q001 | `head-before-ending` | `active-relation` | `продолжающего` 先修饰第二格 `художника`，再谈词尾。 | B2 题 1；原书 1-7 解析 | `confirmed` |
| P3-Q002 | `active-relation` | `head-before-ending` | `изображающего` 表示肖像“描绘”政治活动家，仍须从语法关系判断谁发出所述行为。 | B2 题 2；原书 1-7 解析 | `confirmed` |
| P3-Q003 | `present-characteristic` | `head-before-ending` | `открывающийся` 描述景色此刻呈现的特征，词尾跟 `вид`。 | B2 题 3；原书 `1883-1912` | `confirmed` |
| P3-Q004 | `present-characteristic` | `active-relation` | 药物自身具有增强免疫力的当前作用。 | B2 题 4；原书 `1883-1912` | `confirmed` |
| P3-Q005 | `present-characteristic` | `active-relation` | `излагающееся` 说明规则正在被阐述；不把 `-ся` 单独当成选择答案。 | B2 题 5；原书 `1883-1912` | `confirmed` |
| P3-Q006 | `present-characteristic` | `relative-clause` | `поднимающаяся` 可还原为 `которая поднимается`，说明钟楼当前耸立的特征。 | B2 题 6；原书 1-7 解析 | `confirmed` |
| P3-Q007 | `present-characteristic` | `head-before-ending` | 公司是生产仪器的动作发出者，表示持续经营特征。 | B2 题 7；原书 1-7 解析 | `confirmed` |
| P3-Q008 | `past-experience` | `head-before-ending` | 人一生投入教育被教材理解为已形成的经历，`посвятившего` 跟第二格 `человека`。 | B2 题 8；原书 `1915-1943` | `confirmed` |
| P3-Q009 | `past-experience` | `head-before-ending` | 先锁定被谈话的学生，再表达他此前没有完成作业。 | B2 题 9；原书 `1915-1943` | `confirmed` |
| P3-Q010 | `past-experience` | `head-before-ending` | “国家已经决定”是过去完成的主动行为，形动词随第六格 `стране`。 | B2 题 10；原书 `1915-1943` | `confirmed` |
| P3-Q011 | `past-experience` | `present-characteristic` | 教材把项目“已规定新城区建设”读为完成的规划；需同时看另一种当前规划读法的边界。 | B2 题 11；现行 `answerAnalysis` | `needs-review`：`предусматривающий` 在另一语境可成立。 |
| P3-Q012 | `agreement-beyond-nominative` | `relative-clause` | `внесшими` 修饰工具格复数 `читателями`，是非主格一致与从句压缩。 | B2 题 12；原书 8-15 解析 | `confirmed` |
| P3-Q013 | `agreement-beyond-nominative` | `relative-clause` | `заложившей` 修饰第二格 `грамматики`，不能被近处名词干扰。 | B2 题 13；原书 8-15 解析 | `confirmed` |
| P3-Q014 | `relative-clause` | `past-experience` | `прошедший` 与 `который прошел` 保留电影节已经举办完的意义。 | B2 题 14；原书 8-15 解析 | `confirmed` |
| P3-Q015 | `relative-clause` | `past-experience` | `вошедшему` 与 `который вошел` 保留年轻人已进入房间的先后。 | B2 题 15；原书 8-15 解析 | `confirmed` |

## 卡片 B：被动形动词的一致

卡片 ID：`p3-passive-participles`

### 概念覆盖账本

| 字段 | 冻结内容 |
|---|---|
| `learningTarget` | 读者能先指出“哪个名词承受动作”，再判断是正在、经常发生还是已经完成的结果，最后处理形式一致。 |
| `coreIdea` | 被动形动词说明中心名词是动作的承受者；动作执行者可以出现，也可以省略，但不能被误当作中心名词。 |
| `necessaryBranches` | 先找承受者；现在时被动关系；过去完成结果；动作执行者与工具格；长尾作定语和短尾作谓语；非主格位置的一致；从 `который` 从句压缩；选项无法保留原句施受关系时不把应试答案扩大为规则。 |
| `allowedCases` | 及物动作有明确或可恢复的承受者；未完成体现在时表示进行、通常或持续的承受关系；完成体过去时表示已经形成的结果。 |
| `disallowedCases` | 名词自己完成动作时，转交主动形动词卡；没有可靠证据时，不用“被动词尾”替代对施受关系的判断。 |
| `limits` | 长尾与短尾不是单纯的“词尾题”；Q022 的选项不能完整复刻原句主动反身关系，不能从该题推出“所有 закончились 都改成 законченные”。 |
| `repairOrProductionUse` | 写出“谁对谁做什么”，再把关系从句压缩；若强调结果作谓语，才考虑短尾形式。 |
| `neighborHandoffs` | 主动动作发出者交给 `p3-active-participles`；副动词与主句的附加动作关系交给副动词两卡。 |
| `sourceEvidence` | B2 原书文字版 16-23 题及其解析；同文件 `1945-1977` 的被动形动词说明；《新编俄语语法》`06 动词.md` 的形动词总则、被动形动词构成和短尾说明。 |
| `unresolvedRisks` | Q022 的原关系从句为主动反身 `закончились`，选项中没有严格等价的 `закончившиеся`；教材答案为 `законченные`，需保留应试限制。 |

### 逐题映射

| exerciseId | primaryBranchId | secondaryBranchIds | mappingReason | evidenceRefs | status / risk |
|---|---|---|---|---|---|
| P3-Q016 | `current-or-regular-receiver` | `agent-and-recipient` | 研讨会承受教研室组织这一通常或当前的动作。 | B2 题 16；原书 `1945-1977` | `confirmed` |
| P3-Q017 | `agent-and-recipient` | `current-or-regular-receiver` | 方法是 народная медицина 应用的对象；第五格标出执行者。 | B2 题 17；原书 `1945-1977` | `confirmed` |
| P3-Q018 | `completed-result` | `head-before-ending` | 建筑是已完成建造的对象，`построенное` 表示结果。 | B2 题 18；原书 16-23 解析 | `confirmed` |
| P3-Q019 | `completed-result` | `head-before-ending` | 柱子是按设计建成的对象，`созданная` 跟阴性主格一致。 | B2 题 19；原书 16-23 解析 | `confirmed` |
| P3-Q020 | `relative-clause-result` | `completed-result` | `установленным` 压缩“有人已在条例中确立规则”的完成被动关系。 | B2 题 20；原书 16-23 解析 | `confirmed` |
| P3-Q021 | `relative-clause-result` | `completed-result` | 委员会是按区域原则被组建的对象，执行者可省略。 | B2 题 21；原书 16-23 解析 | `confirmed` |
| P3-Q022 | `option-limit-preserve-relation` | `completed-result` | 题目考已结束的实验，但主动反身原句和可选被动形动词并不严格同构。 | B2 题 22；现行 `answerAnalysis` | `needs-review`：保留教材答案，不升级成一般改写规则。 |
| P3-Q023 | `head-before-ending` | `completed-result` | 手套是昨天被买的对象，`купленные` 随复数第四格 `перчатки`。 | B2 题 23；原书 16-23 解析 | `confirmed` |

## 卡片 C：副动词的时间、条件、原因与让步

卡片 ID：`p3-gerund-meanings`

### 概念覆盖账本

| 字段 | 冻结内容 |
|---|---|
| `learningTarget` | 读者看到副动词后，能把它临时展开成从句，说明两个动作是同时、先后、条件、原因、让步还是方式，并说出句中哪项事实支持该判断。 |
| `coreIdea` | 副动词不是固定译作“……着”；体和句式给线索，完整语境决定它与主句的逻辑关系。 |
| `necessaryBranches` | 未完成体的同时或相伴方式；完成体先完成、后发生；时间从句展开；条件；原因；让步；一个句子可能兼有时间与其他关系，不能见到副动词就机械套连接词。 |
| `allowedCases` | 同时关系可用 `когда` 展开；先后关系可用 `после того как`；条件、原因、让步分别必须由结果关系、原因事实、反预期结果支撑。 |
| `disallowedCases` | 不用动作发生顺序单独断定原因或条件；不把“动作人是否相同”当成本卡的最终判断，那个问题交给主体一致卡。 |
| `limits` | 体是重要提示，不是自动答案；Q024 现有题干疑似 OCR 或词尾问题，不能把修订读法冒充成未争议原文。 |
| `repairOrProductionUse` | 用 `когда / после того как / если / потому что / хотя` 展开，再检查展开句有没有保留原来事实；不同主体时回到主体一致卡改写。 |
| `neighborHandoffs` | 两动作由谁承担交给 `p3-gerund-subject`；副动词形态构成、标点的细节不在本卡用单题替代完整教学。 |
| `sourceEvidence` | B2 原书文字版 24-44 题、解析和 `1979-2077` 的讲解；《新编俄语语法》`06 动词.md` 的副动词用法资料；现有逐题 `answerAnalysis` 的范围提示。 |
| `unresolvedRisks` | Q024 的 `кровообращения` 与选项不能形成教材预期搭配，现行答案依赖“修订为 кровообращение”的假设。 |

### 逐题映射

| exerciseId | primaryBranchId | secondaryBranchIds | mappingReason | evidenceRefs | status / risk |
|---|---|---|---|---|---|
| P3-Q024 | `simultaneous-or-manner` | `context-before-form` | 教材意图是 `улучшая` 与“有益地作用”同时发生；先确认题干词形才能教此关系。 | B2 题 24；原书 `1979-1998` | `needs-review`：现有题干疑似 OCR/词尾问题。 |
| P3-Q025 | `simultaneous-or-manner` | `time-clause-rewrite` | `Начиная` 把“开始做任务”放在主句建议所涉及的同一时间阶段。 | B2 题 25；原书 `1979-1998` | `confirmed` |
| P3-Q026 | `completed-before-main` | `time-clause-rewrite` | 先进房间、后打招呼；逗号说明此处是状语不是定语。 | B2 题 26；原书 `1999-2018` | `confirmed` |
| P3-Q027 | `completed-before-main` | `time-clause-rewrite` | 教材按一次游历完成后才获得认识的读法安排 `Побывав`。 | B2 题 27；原书 `1999-2018` | `confirmed` |
| P3-Q028 | `completed-before-main` | `time-clause-rewrite` | 站起完成后才离开教室。 | B2 题 28；原书 `1999-2018` | `confirmed` |
| P3-Q029 | `completed-before-main` | `time-clause-rewrite` | 大专毕业在前、考入大学在后；不把先后偷偷扩大为原因。 | B2 题 29；原书 `1999-2018` | `confirmed` |
| P3-Q030 | `simultaneous-or-manner` | `context-before-form` | 笑与讲述相伴，`смеясь` 接近方式状语，不是先笑完再讲。 | B2 题 30；原书 `2019-2080` | `confirmed` |
| P3-Q031 | `time-clause-rewrite` | `completed-before-main` | 离境是将来过程中的时间点，展开时须保留未来语境。 | B2 题 31；原书 30-44 解析 | `confirmed` |
| P3-Q032 | `time-clause-rewrite` | `simultaneous-or-manner` | 每次到陌生城市时的重复关系，用 `когда` 展开最清楚。 | B2 题 32；原书 30-44 解析 | `confirmed` |
| P3-Q033 | `simultaneous-or-manner` | `time-clause-rewrite` | 打电话与在房间走动同时发生。 | B2 题 33；原书 30-44 解析 | `confirmed` |
| P3-Q034 | `simultaneous-or-manner` | `time-clause-rewrite` | 城市扩建的过程与变美同步发展。 | B2 题 34；原书 30-44 解析 | `confirmed` |
| P3-Q035 | `completed-before-main` | `time-clause-rewrite` | 大学毕业结束后，彼得返回家乡。 | B2 题 35；原书 30-44 解析 | `confirmed` |
| P3-Q036 | `completed-before-main` | `time-clause-rewrite` | 文章发表完成后，才收到稿费。 | B2 题 36；原书 30-44 解析 | `confirmed` |
| P3-Q037 | `completed-before-main` | `time-clause-rewrite` | 问题解决完成后，才要求打电话。 | B2 题 37；原书 30-44 解析 | `confirmed` |
| P3-Q038 | `completed-before-main` | `time-clause-rewrite` | 从散步回来完成后，孩子们集合。 | B2 题 38；原书 30-44 解析 | `confirmed` |
| P3-Q039 | `condition` | `completed-before-main` | 稍作休息是“能够回到工作”的前提，可展开为 `если`。 | B2 题 39；原书 `2063-2069` | `confirmed` |
| P3-Q040 | `condition` | `completed-before-main` | 邀请客人是准备晚饭的条件，不只是两件事的先后。 | B2 题 40；原书 `2063-2069` | `confirmed` |
| P3-Q041 | `cause` | `completed-before-main` | 掌握法语解释了去法国工作的原因，可展开为 `поскольку / потому что`。 | B2 题 41；原书 `2055-2061` | `confirmed` |
| P3-Q042 | `cause` | `completed-before-main` | 在森林迷路解释孩子们很晚到家的原因。 | B2 题 42；原书 `2055-2061` | `confirmed` |
| P3-Q043 | `cause` | `context-before-form` | 想看卫城是购买旅游券的动机，不是已经完成后才发生的动作。 | B2 题 43；原书 `2055-2061` | `confirmed` |
| P3-Q044 | `concession` | `completed-before-main` | “早到”本来预期有好座位，`всё равно` 表明结果反预期，应展开为 `хотя`。 | B2 题 44；原书 `2071-2077` | `confirmed` |

## 卡片 D：副动词的主体一致

卡片 ID：`p3-gerund-subject`

### 概念覆盖账本

本卡已作为第二版样板接受，不重新改写范围。它完整处理：写明的共同动作人、句中提到的人不一定是行动者、命令式省略的 `ты`、无主格时可恢复的行动承担者、被动句里的承受者、位置不改变动作人，以及不改变意思的改写。

相邻交接点已冻结：副动词的时间、条件、原因、让步交给 `p3-gerund-meanings`；副动词构成细节不由本卡代替。依据为 B2 文字版 45-50 题、现有卡片来源记录及《新编俄语语法》第 10.2 节。

### 逐题映射

| exerciseId | primaryBranchId | secondaryBranchIds | mappingReason | evidenceRefs | status / risk |
|---|---|---|---|---|---|
| P3-Q045 | `relative-time` | `shared-actor` | 睡眠承担两个动作后，还要另查一般事实与特定将来语境。 | B2 题 45；现有 `teachingMapping` | `confirmed`：教材答案 A，未来语境下 B 也可能成立。 |
| P3-Q046 | `passive-recipient` | `shared-actor`, `rewrite-preserve-meaning` | 分辨准备旅行、购买物品和“我生病”各自的承担者。 | B2 题 46；现有 `teachingMapping` | `confirmed`：现行答案 V 已与来源账本更正记录对齐。 |
| P3-Q047 | `implicit-person` | `shared-actor` | 从 `не забудь` 找回省略的“你”，再理解礼貌请求。 | B2 题 47；现有 `teachingMapping` | `confirmed` |
| P3-Q048 | `position` | `shared-actor`, `relative-time` | 副动词句末仍借主句 `студенты` 作为动作人。 | B2 题 48；现有 `teachingMapping` | `confirmed`：文字版已核，原 PDF 图像未复核。 |
| P3-Q049 | `shared-actor` | `mentioned-is-not-actor`, `rewrite-preserve-meaning` | 写信和去邮局都由 `он` 完成，天气、地点、物品状态不能接上。 | B2 题 49；现有 `teachingMapping` | `confirmed` |
| P3-Q050 | `recoverable-impersonal` | `mentioned-is-not-actor`, `relative-time` | “我得找工作”由我承担，“别人给我工作”由别人承担。 | B2 题 50；现有 `teachingMapping` | `confirmed`：教材答案 A，另一时间读法下 V 也可能成立。 |

## Gate 0 判定与后续

1. 四张稳定卡可以共同覆盖 P3，当前没有教学上必须拆卡的证据。
2. `p3-gerund-meanings` 范围最宽，先升级。它将把 Q024-Q044 分散放在“同时/方式、先后、时间展开、条件、原因、让步”这些知识分支中，而不是把 21 道题逐题变成 21 节课。
3. 在正式接入前，所有 `primaryBranchId` 都会成为对应新版 `teachingNarrative.sections[].id`；测试将验证 50 题恰好一个主要分支、补看分支有效、每题只完整出现一次。
4. Q011、Q022、Q024 在新版卡片中保留风险说明，原题入口、题号、答案和解析不被静默修改。
5. 用户已授权继续执行，因此下一步进入计划 1：先为 `p3-gerund-meanings` 写概念优先教学稿，再做独立审阅、接入和页面检查。
