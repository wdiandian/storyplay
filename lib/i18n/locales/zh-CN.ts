// Chinese (Simplified) - Source language
// Extracted from components: page.tsx, layout.tsx, CustomForm.tsx, SettingsModal.tsx, PlayCanvas.tsx, AuthModal.tsx, DialogueHistoryModal.tsx

export const zhCN = {
  // ========== Layout ==========
  layout: {
    metadata: {
      title: "StoryPlay - AI 互动剧情游戏",
      description: "StoryPlay 将故事想法转化为可游玩的 AI 互动影像故事。",
    },
  },

  // ========== Home Page (page.tsx) ==========
  home: {
    // Example phrases for typewriter
    examples: {
      male: [
        "重生到高考出分前夜，这次我不填金融，直接杀进短剧赛道",
        "全网黑的前爱豆塌房当天，只有我知道他其实是被剧本杀了",
        "我带着十年热搜记忆回到选秀初舞台，第一票先投给自己",
        "十八线编剧醒来成了爆款短剧男主，弹幕都在劝我别恋爱脑",
        "公司裁员前一天，我绑定文娱系统，把老板写进反派名单",
        "我在直播间随口讲了个爽文开头，第二天全网开始催更",
      ],
      female: [
        "重生回到恋综开播第一天，这次我不当对照组，我要拿捏全场",
        "被全网嘲的糊咖女演员，突然听见弹幕剧透谁会爆红",
        "穿成短剧里三分钟下线的恶毒女配，我决定自己改剧本",
        "顶流官宣前夜，我重生了，这次先把事业线点满",
        "我在红毯摔倒冲上热搜，却发现系统奖励是读心术",
        "被经纪公司雪藏三年后，我靠一场直播把塌房男主送上热搜",
      ],
      x: [
        "全员重生的娱乐公司里，只有前台不知道自己是最终老板",
        "热搜榜突然变成任务面板，每撤掉一条黑料就会解锁一段真相",
        "短剧世界开始内测，观众每刷一次弹幕，剧情就会多一个分支",
        "我接手一家快倒闭的剧组，发现群演全是来自未来的影帝影后",
        "一场恋综直播变成大型狼人杀，心动短信里藏着凶手线索",
        "系统说今晚全网塌房，但我只能救下一个人的职业生涯",
      ],
    },

    // Option labels
    options: {
      gender: "性向",
      artStyle: "绘画风格",
      plotStyle: "剧情风格",
      voice: "语音配音",
      pacing: "内容节奏",
    },

    // Option values - genders
    genders: {
      male: "男性向",
      female: "女性向",
      x: "通用",
    },

    // Option values - art styles
    artStyles: {
      auto: "自动",
      custom: "自定义风格",
      kyoani: "京阿尼",
      shinkai: "新海诚",
      ghibli: "吉卜力",
      "3d": "3D 动画",
      cyberpunk: "赛博朋克",
      gothic: "哥特",
      wasteland: "废土",
      pixel: "像素风",
      realistic: "真实",
      oil: "古典油画",
      monet: "莫奈",
      watercolor: "水彩",
      ink: "水墨",
      ukiyoe: "浮世绘",
      pencil: "彩铅",
      sketch: "手绘素描",
      manga: "黑白漫画",
      children: "儿童绘本",
      crayon: "儿童涂鸦",
      clay: "黏土手工",
      dunhuang: "敦煌壁画",
      miniature: "细密画",
      mosaic: "镶嵌画",
      stainedGlass: "彩绘玻璃",
      vaporwave: "蒸汽波",
      vector: "矢量插画",
      lowpoly: "低多边形",
      popart: "波普艺术",
      glitch: "故障艺术",
      papercut: "剪纸艺术",
      steampunk: "蒸汽朋克",
      xianxia: "仙侠玄幻",
      darkFairytale: "暗黑童话",
      urbanFantasy: "都市幻想",
    },

    // Option values - plot styles
    plotStyles: {
      straightforward: "平铺直叙",
      twist: "多线转折",
      suspense: "悬疑烧脑",
      healing: "治愈日常",
    },

    // Option values - voice
    voiceOptions: {
      off: "关闭",
      on: "开启",
    },

    // Option values - pacing
    pacings: {
      slow: "慢热细腻",
      fast: "紧凑爽快",
    },

    // Story cards (samples - in production these would come from presets.ts)
    stories: {
      // A few representative titles
     贤者陨落: "贤者陨落",
      画中圣手: "画中圣手",
      花魁的刀: "花魁的刀",
      // ... (full list would be presets.ts stories)
    },

    // UI labels
    ui: {
      start: "开始",
      loadStory: "载入剧情",
      settings: "设置",
      searchPlaceholder: "搜索风格…",
      noMatchingStyle: "没有匹配的风格",
      close: "关闭",
      back: "返回",
      save: "保存",
      cancel: "取消",
      saveAndSelect: "保存并选用",
    },

    // Style modal
    styleModal: {
      title: "选择绘画风格",
      subtitle: '默认「自动」· 由 AI 根据故事自动匹配画风；选择「自定义风格」可输入描述或上传参考图',
      customTitle: "自定义风格",
      customPlaceholder: `描述你想要的画面风格，例如：
梦幻水彩风格，柔和的色调，怀旧的氛围

💡 提示：部分绘图模型对英文提示词效果更佳，建议先借助 AI 对话工具生成专业的英文风格描述，再粘贴到这里`,
      uploadImage: "上传参考图",
      changeImage: "换一张",
      remove: "移除",
      parsing: "解析中…",
      importFromPreset: "从预设风格导入…",
      uploadError: "只支持图片文件",
      visionError: "视觉模型返回了空的风格描述",
      fileReadError: "读取文件失败",
      imageDecodeError: "无法解码图片",
      parseError: "解析失败",
      refImageAlt: "画风参考图",
    },

    // Hero section
    hero: {
      title: "让故事变得可玩",
      placeholder: " ",
      enterHint: "Enter 发送 · Shift+Enter 换行",
      helpAriaLabel: "查看创作说明",
      helpText: (params: { authEnabled?: boolean }) => {
        const authHint = params.authEnabled ? "测试期间需要登录，当前可免费体验。" : "";
        return `输入一个故事想法后，可以在输入框底部快速设定受众、画风、剧情风格和节奏；需要更完整的故事编辑能力时，可以进入创作者后台。${authHint}`;
      },
      creatorStudioLink: "进入创作者后台",
    },

    storyTaxonomy: {
      eyebrow: "Story Categories",
      title: "按故事类型探索",
      all: "全部",
      empty: "当前类型暂无故事。",
      genres: {
        romance: "恋爱",
        mystery: "悬疑",
        fantasy: "奇幻",
        urban: "都市",
        campus: "校园",
        workplace: "职场",
        sciFi: "科幻",
        historical: "历史",
        adventure: "冒险",
        growth: "成长",
      },
      moods: {
        sweet: "甜",
        angsty: "虐",
        tense: "紧张",
        healing: "治愈",
        flirty: "暧昧",
        powerFantasy: "爽感",
        dark: "暗黑",
        romantic: "浪漫",
        eerie: "诡异",
      },
      structures: {
        linear: "单线推进",
        branching: "多分支",
        shortDramaTwist: "短剧反转",
        relationship: "关系推进",
        puzzle: "解谜",
        progression: "养成",
      },
      visualStyles: {
        cinematic: "电影感",
        lightNovel: "轻小说",
        anime: "二次元",
        realistic: "写实",
        gothic: "哥特",
        cyberpunk: "赛博朋克",
        chineseFantasy: "国风",
        popArt: "波普",
      },
    },

    // Usage hint
    hint: {
      text: (params: { authEnabled?: boolean }) => {
        const authHint = params.authEnabled ? '（测试期间，登录即可免费畅玩）' : '';
        return `输入想法、配置风格，点击「开始」即可游玩${authHint}；也可以从下方精选故事集挑一篇快速体验 <em class="not-italic text-ember-500">StoryPlay</em>。点击「<span class="inline-flex items-center gap-1 text-ember-500"><i class="fa-solid fa-gear text-[10px]"></i>设置</span>」还能填入你的名字，以及你自己的文本、绘图、识图模型和配音 Key——全部只存在本地浏览器，体验更稳定。`;
      },
      closeAriaLabel: "不再显示此提示",
    },

    // About section
    about: {
      title: "StoryPlay",
      description: "是一款用 AI 实时生成内容的交互式剧情游戏 —— 图片、语音与剧情分支都在游玩过程中即时生成。",
      team: "团 队",
      teamText: "我们来自清华大学、兰州大学等高校，希望探索多模态模型在「直接生成图片、视频」这类 oneshot 能力之外，更多的可能性。本项目目前仍处于早期阶段，我们还在招募成员，如果你也感兴趣，欢迎联系我们，期待你的加入。",
      contact: "联 系 方 式",
      email: "邮箱",
      openSource: "开 源 地 址",
      betaUsers: "内 测 用 户 群",
      qqGroupLabel: "QQ群号：",
      qqGroupAlt: "StoryPlay 公测交流群 QQ 群二维码（群号 575404333）",
      legalNotice: (params: { analyticsOn?: boolean }) => {
        const base = `公测期间本产品可免费使用，但稳定性可能会随并发用户数量而有波动。<br />公测期间生成的内容不会在服务器上保存。如需留存，请在游玩结束后使用导出图集或分享剧情功能保存您的游玩体验。<br />AI 生成的内容不代表本团队立场。`;
        if (params.analyticsOn) {
          return `${base}<br />本站使用开源的 <a href="https://umami.is/" target="_blank" rel="noopener noreferrer">Umami</a> 进行隐私友好的匿名访问与交互统计：不使用 Cookie、不收集个人信息、不发送任何您输入的内容、不做跨站追踪。`;
        }
        return base;
      },
      privacyPolicy: "隐私政策",
      terms: "服务条款",
      copyright: "© 2026 StoryPlay. All rights reserved.",
    },

    // Story import errors
    errors: {
      emptyFile: "这个剧情文件是空的。",
      fileTooLarge: "剧情文件太大，无法载入。",
      unpackFailed: "剧情文件解包失败。",
      parseFailed: "剧情文件解析失败。",
      cardNotFound: "找不到精选剧情：{cardName}",
    },
  },

  // ========== Play Page (PlayCanvas.tsx & play/page.tsx) ==========
  play: {
    // Loading states
    loading: {
      firstFrame: "正 · 在 · 绘 · 制 · 第 · 一 · 幕",
      transitioning: "AI · 正 · 在 · 描 · 画 · 下 · 一 · 幕",
      visionThinking: "AI · 正 · 在 · 想 · 你 · 看 · 到 · 了 · 什 · 么",
      loadingFirst: "正 · 在 · 唤 · 起 · 第 · 一 · 幕",
      awakening: "载入中",
    },

    // Freeform input
    freeform: {
      placeholder: "输入你想说的或想做的...",
      title: "自由输入",
      ariaLabel: "自由输入",
    },

    // Choice disabled title
    choiceDisabled: "分享剧情未包含这条分支",

    // Tooltips
    tooltips: {
      openSettings: "打开设置",
      openHistory: "剧情回溯",
      fullscreen: "全屏 (F)",
      enterFullscreen: "进入全屏",
      exportGallery: "导出本局为可交互图集链接（含配音；只会保留最近两次的可交互图集链接）",
      exportGalleryLabel: "导出可交互图集",
      shareStory: "导出本局为可继续游玩的剧情 .storyplay（含配音）",
      shareStoryLabel: "分享当前剧情",
      mute: "静音",
      unmute: "取消静音",
      closeNudge: "关闭提示",
      silenceNudge: "效果不满意/经常没声音？填入自己的 API Key 试试",
      back: "返回",
    },

    // Image alt
    imageAlt: "Generated scene",

    // Scene/beat counter
    counter: {
      scene: "第 · {n} · 幕",
      beat: "{n} · 拍",
      middle: "·",
    },

    // Button labels
    buttons: {
      fullscreen: "F · 键 · 全 · 屏",
      exportGallery: "导 · 出 · 图 · 集",
      shareStory: "分 · 享 · 剧 · 情",
      muted: "静 · 音",
      sound: "有 · 声",
    },

    // Error state
    error: {
      title: "出 · 了 · 点 · 状 · 况",
      back: "返 · 回",
    },

    // Previous action
    previousStep: "上 · 一 · 步 ·",

    // Settings footer note
    settingsFooter: "保存后配音 Key 会立即生效，用你自己的额度合成当前这一幕的配音。",

    // Share file errors
    shareErrors: {
      notFound: "没有找到要载入的剧情文件。",
      invalid: "剧情分享文件没有可载入的剧情。",
      noImage: "剧情分享文件缺少第一幕图片。",
      noNextImage: "剧情分享文件缺少下一幕图片。",
      noMemory: "剧情分享文件缺少初始剧情记忆，无法载入。",
      packFailed: "剧情分享打包失败",
    },

    // Saved story errors
    savedStoryNotFound: "找不到保存的剧情",
    savedStoryCorrupted: "剧情数据损坏",

    // Export progress
    exportProgress: {
      preparingVoice: "正在准备配音",
    },
  },

  // ========== Settings Modal (SettingsModal.tsx) ==========
  settings: {
    title: "设置",
    subtitle: "可选 · 这些设置仅保存在本地浏览器",

    // Tabs
    tabs: {
      general: "通用",
      models: "模型",
    },

    // General tab
    general: {
      playerName: "玩家名字",
      playerNamePlaceholder: "不填则使用「你」",
      playerNameHint: "NPC 会在对话中用这个名字称呼你。不填则默认以「你」称呼。",
      visionClick: "点击画面识别",
      visionOn: "开启",
      visionOff: "关闭",
      visionHint: "开启后，在选择节点点击画面会触发 AI 识图并生成新的剧情分支。",
    },

    // Models tab
    models: {
      modeTitle: "模型使用方式",
      officialMode: "官方模型",
      officialModeSub: "默认使用平台配置，后续按平台额度或次数计费。",
      byokMode: "自带 Key",
      byokModeSub: "使用你自己的 API Key，不消耗平台模型额度。",
      officialNotice: "当前使用平台统一托管的官方模型；这里仅展示额度和可用能力，不展示具体供应商与模型参数。",
      corsNotice: "所有 Key 仅保存在本地浏览器，不会上传到服务器。请求优先从浏览器直连 API 端点；若端点不支持跨域（CORS），将自动通过我们的服务器中转——Key 仅用于当次转发，不会被记录或存储。",
      textModel: "文本模型",
      imageModel: "绘图模型",
      visionModel: "识图模型",
      baseUrl: "BASE URL",
      apiKey: "API Key",
      model: "Model",
      provider: "Provider（可选）",
      providerHint: "留空时系统会根据 Base URL 自动推断协议。",
      providerAuto: "自动推断（推荐）",
      show: "显示",
      hide: "隐藏",
    },
    billing: {
      title: "今日官方额度",
      loading: "读取中…",
      unavailable: "暂时无法读取额度",
      remaining: "剩余 {remaining} / {limit} 点",
      spent: "已用 {spent} 点",
      resets: "{time} 重置",
      refresh: "刷新额度",
      hint: "这是匿名测试期的每日免费额度，不是正式余额；自带 Key 模式不消耗官方额度。",
      byokHint: "当前使用自带 Key，请求会消耗你自己的供应商额度，不消耗今日官方额度。",
    },

    // TTS section
    tts: {
      title: "配音模型",
      description: '填入你自己的 <span class="text-clay-800">小米 MiMo API Key</span>，配音将在浏览器本地合成，Key 只保存在本地、绝不经过服务器。MiMo TTS 目前<span class="text-clay-800">限时免费</span>，申请即可使用。',
      keyType: "Key 类型",
      payg: "按量付费 Pay-as-you-go",
      paygSub: "sk- 开头",
      tokenPlan: "套餐 Token Plan",
      tokenPlanSub: "tp- 开头",
      region: "区域节点",
      regionHint: "选择与你的套餐订阅地区一致的节点（通常也是延迟最低的那个）。",
      apiKeyPlaceholderPayg: "粘贴 sk- 开头的按量 Key",
      apiKeyPlaceholderToken: "粘贴 tp- 开头的套餐 Key",
      keyMismatchPayg: '此 Key 不是 sk- 开头，可能与所选「按量付费 Pay-as-you-go」类型不符，请确认是否填错。',
      keyMismatchToken: '此 Key 不是 tp- 开头，可能与所选「套餐 Token Plan」类型不符，请确认是否填错。',
      tutorialLink: "如何免费申请 Key？查看图文教程",
    },

    // Actions
    actions: {
      save: "保存",
      clearAll: "全部清除",
    },
    account: {
      title: "账号",
      signedOutHint: "登录后，故事工程、故事存档和后续创作资产会绑定到你的账号。",
      authUnavailable: "当前环境还没有配置账号服务。上线环境配置 Supabase 后，这里会显示登录入口。",
      signIn: "登录",
      signedIn: "已登录",
      accountCenter: "账号中心",
      studio: "创作后台",
      stories: "我的故事",
      signOut: "退出登录",
    },
  },

  // ========== Auth Modal (AuthModal.tsx) ==========
  auth: {
    // Steps
    steps: {
      pick: "登录以继续",
      email: "邮箱登录",
      otp: "验证码",
    },

    // Buttons
    googleLogin: "Google 登录",
    githubLogin: "GitHub 登录",
    emailLogin: "邮箱验证码登录",
    emailHint: "输入邮箱后，我们会发送 6 位验证码。你也可以使用 Google 快速登录。",
    or: "或",

    // Email input
    emailPlaceholder: "your@email.com",
    sendCode: "发送验证码",
    sending: "发送中...",

    // OTP verification
    codeSent: "验证码已发送至 {email}",
    codePlaceholder: "6 位验证码",
    verify: "确认",
    verifying: "验证中...",
    resend: "重新发送",

    // Navigation
    back: "返回",

    // Close
    close: "关闭",

    // Aria labels
    ariaLabel: "登录",
  },

  // ========== Dialogue History Modal ==========
  history: {
    title: "剧 · 情 · 回 · 溯",
    close: "关闭",
    closeAriaLabel: "关闭剧情回溯",
    noHistory: "暂无历史。",
    scene: "第 {n} 幕",
    choice: "选择",
    action: "行动",
    ariaLabel: "剧情回溯",
  },

  // ========== Custom Form (CustomForm.tsx) ==========
  customForm: {
    world: "World · 世界观",
    style: "Style · 画风",
    worldPlaceholder: "例：1990 年代末的中国南方县城。主角是高三转学生，在多雨的六月遇到一个总在天台读诗的同学。剧情慢热、含蓄、带点伤感⋯",
    stylePlaceholder: "例：水彩柔光，午后暖意，动漫视觉小说画风，传统对话面板⋯",
    status: {
      ready: "准 · 备 · 就 · 绪",
      needMore: "两 · 段 · 即 · 可 · 开 · 场",
      starting: "正在唤起第一帧…",
    },
    start: "开 始",
  },

  // ========== Language Switcher ==========
  language: {
    title: "语言",
    current: "当前语言",
    select: "选择语言",
  },
} as const;

export type ZhCNTranslations = typeof zhCN;
