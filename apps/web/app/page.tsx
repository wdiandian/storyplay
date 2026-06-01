"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

/* ============================================================================
   InfiPlot · 低保真原型首页
   - 1900px 设计画布 + 等比缩放至视口宽度，最大程度还原原型版式
   - 顶部 Hero 浮动散落卡片；下方瀑布流；尾部项目介绍
   ========================================================================== */

const HERO_CANVAS_W = 1900;
const HERO_CANVAS_H = 980;

const EXAMPLE_PHRASES: Record<"男性向" | "女性向", string[]> = {
  男性向: [
    "从小一起长大的青梅竹马，突然红着脸向我告白",
    "一觉醒来，班上的女生好像都偷偷喜欢上了我",
    "三年之期已到，原来我是富家公子，报仇时机已到",
    "我带着无限 Token 穿越回了互联网诞生前夕……",
  ],
  女性向: [
    "穿越成将军府的废物嫡女，冷面摄政王却独宠我一人",
    "重生回到分手前夜，这一次换我先放手",
    "一觉醒来成了乙游里的恶役千金，要躲开所有死亡结局",
  ],
};

type Opt = {
  label: string;
  items: string[];
  defaultIndex?: number;
  modal?: boolean;
};

const OPTS: Opt[] = [
  { label: "性向", items: ["男性向", "女性向"] },
  {
    label: "绘画风格",
    modal: true,
    items: [
      "自动",
      "二次元",
      "吉卜力",
      "真实系",
      "超写实",
      "水彩",
      "像素风",
      "日系动画",
      "3D 渲染",
      "蒸汽朋克",
      "玄幻",
      "国风水墨",
      "赛博朋克",
    ],
  },
  { label: "剧情风格", items: ["平铺直叙", "多线转折", "悬疑烧脑", "治愈日常"], defaultIndex: 1 },
  { label: "语音配音", items: ["关闭", "开启"], defaultIndex: 1 },
  { label: "内容节奏", items: ["慢热细腻", "紧凑爽快"], defaultIndex: 1 },
];

/* Hero slot geometry — 7 fixed positions, contents switch by 性向 */
const HERO_SLOTS = [
  { x: 55,   y: 470, w: 330, h: 196, rot: -1.6 },
  { x: 55,   y: 690, w: 330, h: 196, rot: 1.3 },
  { x: 418,  y: 566, w: 286, h: 352, rot: -1.1 },
  { x: 765,  y: 642, w: 326, h: 258, rot: 1.1 },
  { x: 1130, y: 570, w: 326, h: 352, rot: 1.4 },
  { x: 1492, y: 478, w: 358, h: 200, rot: 1.6 },
  { x: 1492, y: 688, w: 358, h: 200, rot: -1.3 },
] as const;

type HeroContent = { title: string; outline: string };

const HERO_CONTENT: Record<"男性向" | "女性向", HeroContent[]> = {
  男性向: [
    { title: "樱の约定", outline: "樱花纷飞的黄昏，他终于鼓起勇气，向并肩走过六年的青梅竹马说出那句话……" },
    { title: "锈色边境", outline: "漫天黄沙的废土，机械心脏在胸腔中沉重轰鸣。我从钢铁山中挖出一个完好的休眠舱……" },
    { title: "云海仙踪", outline: "凡骨少年偶得神秘残碑，登顶云海仙山，神魔同修之路自此开启。" },
    { title: "六月雨季", outline: "南方县城的多雨六月，转学第一天，注意到那个总在天台读诗的同学。雨水打湿了未送出的伞……" },
    { title: "雨夜霓虹", outline: "2087 年东亚特区的酸雨之夜，丢失了三天记忆的我，手腕终端响起一通匿名警告：「他们来找你了」。" },
    { title: "学院秘闻", outline: "深夜图书馆地下密室，清冷孤僻的班长跪在圆环阵法前，吟诵着不属于人类的咒词。" },
    { title: "异界召唤", outline: "再睁眼，没有班主任，只有昏暗的魔法阵与一位哭得梨花带雨的圣女：「勇者大人，请拯救这个世界。」" },
  ],
  女性向: [
    { title: "摄政王独宠", outline: "穿越成将军府的废物嫡女，冷面摄政王却把整个京城最名贵的红玉镯，亲手戴在了我的腕上……" },
    { title: "重生前夕",   outline: "重生回到分手前夜，他还没说出那句「对不起」。这一次，让我先转身。" },
    { title: "恶役千金",   outline: "一觉醒来，竟成了乙游里被命运钦点的恶役千金，要躲开所有 BAD END……" },
    { title: "天台之上",   outline: "南方多雨的六月，转学第一天，我把伞悄悄递给了那个在天台读诗的少年。" },
    { title: "登基之夜",   outline: "登基大典上群臣俯首，而我只想看那个一直立在阴影里的人，今夜会不会上前一步。" },
    { title: "江湖玉颜",   outline: "江湖传言，那位执剑女侠从不动情。可那个雨夜，她为他收剑而立。" },
    { title: "学长的告白", outline: "夕阳染红了天台，那个总在篮球场被全校女生围观的学长，第一次叫住了我。" },
  ],
};

const GALLERY: Array<{ h: number; rot: number; title: string; outline: string }> = [
  { h: 300, rot: -0.8, title: "花火之夜", outline: "夏祭的夜空下，浴衣女孩与你约定，今晚最后一发烟火，要一起看完。" },
  { h: 200, rot: 0.6, title: "霓虹之外", outline: "漂浮的飞车与古老方块字的全息广告——这是赛博东亚的另一种黎明。" },
  { h: 260, rot: 0.9, title: "放学后的车站", outline: "夕阳染红的乡间月台，无人列车迟迟未来，你和她沉默并立。" },
  { h: 330, rot: -0.6, title: "星辰咒语", outline: "古老图书馆深处，星纹长袍下的法师女孩低声念出禁咒。" },
  { h: 200, rot: 1.1, title: "战姬启动", outline: "紧急警报红光中，少女握紧操纵杆——决战时刻已到。" },
  { h: 300, rot: -1.0, title: "街灯之下", outline: "午夜独行的女侦探，雨雾中藏着尚未揭晓的真相。" },
  { h: 240, rot: 0.7, title: "全息伞下", outline: "霓虹雨夜，两人共撑全息伞——这一次，是道别还是开始？" },
  { h: 200, rot: -0.7, title: "竹林之约", outline: "竹林深处的快意一战，落叶纷飞——谁先收剑？" },
  { h: 330, rot: 0.8, title: "暗夜王座", outline: "烛光摇曳的古老王座之上，公主等待着她唯一的回信。" },
  { h: 200, rot: -1.1, title: "放学独白", outline: "阳光斜射的空教室，最后一个学生在笔记本上写着什么？" },
  { h: 260, rot: 0.5, title: "第七封信", outline: "樱花树下展开的信纸，淡淡的笔迹，字字千钧。" },
  { h: 300, rot: -0.6, title: "月神降临", outline: "银发倾泻、极光环绕——传说中的月神，今夜降临凡间。" },
  { h: 200, rot: 0.9, title: "血月武士", outline: "血色满月之下，刀光与樱瓣同时落下。" },
  { h: 330, rot: -0.9, title: "森林女巫", outline: "烛光摇曳的森林小屋，女巫熬制着能改变命运的魔药。" },
  { h: 200, rot: 0.6, title: "夏日海岸", outline: "粉橙色的夕阳，两个挚友坐在海岸边，把秘密轻轻放进海风里。" },
  { h: 260, rot: -0.7, title: "屏幕之间", outline: "霓虹青光映在脸上，全屏代码下藏着被遗忘的真相。" },
];

/* ---------- shared primitives ---------- */

function ImgGlyph() {
  return (
    <svg viewBox="0 0 120 90" fill="none" stroke="#6f6e69" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <rect x={6} y={6} width={108} height={78} rx={6} />
      <circle cx={38} cy={32} r={9} />
      <path d="M14 76 L46 46 L66 64 L84 44 L106 76" />
    </svg>
  );
}

function Frame({ className = "" }: { className?: string }) {
  return <div className={"frame " + className} />;
}

function CardBody({
  title,
  outline,
  image,
}: {
  title: string;
  outline: string;
  image?: string;
}) {
  return (
    <div className="inner">
      <div className="img">
        {image ? (
          <img className="card-photo" src={image} alt={title} loading="lazy" />
        ) : (
          <ImgGlyph />
        )}
      </div>
      <div className="ip-hover">
        <h4 className="ip-hover-title">{title}</h4>
        <p className="ip-hover-outline">{outline}</p>
      </div>
    </div>
  );
}

/* ---------- typewriter ---------- */

function Typewriter({ phrases }: { phrases: string[] }) {
  const [txt, setTxt] = useState("");

  useEffect(() => {
    let p = 0;
    let i = 0;
    let del = false;
    let timer: ReturnType<typeof setTimeout>;
    setTxt("");
    const tick = () => {
      const full = phrases[p] ?? "";
      if (!del) {
        i++;
        setTxt(full.slice(0, i));
        if (i >= full.length) {
          del = true;
          timer = setTimeout(tick, 1700);
          return;
        }
        timer = setTimeout(tick, 70);
      } else {
        i--;
        setTxt(full.slice(0, i));
        if (i <= 0) {
          del = false;
          p = (p + 1) % phrases.length;
          timer = setTimeout(tick, 450);
          return;
        }
        timer = setTimeout(tick, 28);
      }
    };
    timer = setTimeout(tick, 500);
    return () => clearTimeout(timer);
  }, [phrases]);

  return (
    <>
      <span>{txt}</span>
      <span className="ip-cursor" />
    </>
  );
}

/* ---------- collapsible category selector ---------- */

function CategorySelect({
  label,
  items,
  value,
  open,
  onToggle,
  onPick,
}: {
  label: string;
  items: string[];
  value: number;
  open: boolean;
  onToggle: () => void;
  onPick: (i: number) => void;
}) {
  return (
    <div className={"ip-cat" + (open ? " open" : "")}>
      <button type="button" className="ip-catbtn" onClick={onToggle}>
        <span className="ip-catname">{label}</span>
        <span className="ip-catval">{items[value]}</span>
        <span className="ip-caret">▾</span>
        <Frame />
      </button>
      {open && (
        <div className="ip-catmenu">
          {items.map((it, i) => (
            <button
              key={i}
              type="button"
              className={"ip-catopt" + (i === value ? " on" : "")}
              onClick={() => onPick(i)}
            >
              {it}
            </button>
          ))}
          <Frame />
        </div>
      )}
    </div>
  );
}

/* ---------- style picker modal ---------- */

function StyleModal({
  items,
  value,
  onPick,
  onClose,
}: {
  items: string[];
  value: number;
  onPick: (i: number) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const close = () => {
    setShown(false);
    setTimeout(onClose, 300);
  };
  const list = items.map((name, i) => ({ name, i })).filter((x) => x.name.includes(q.trim()));
  return (
    <div className={"ip-modal-ov" + (shown ? " show" : "")} onMouseDown={close}>
      <div className="ip-modal" onMouseDown={(e) => e.stopPropagation()}>
        <Frame />
        <div className="ip-modal-hd">
          <div className="ip-modal-ttl">
            选择绘画风格
            <span className="ip-modal-sub">默认「自动」· 由模型根据 prompt 判断风格</span>
          </div>
          <div className="ip-modal-search">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索风格…"
              autoFocus
            />
            <span className="si">⌕</span>
          </div>
          <button type="button" className="ip-modal-x" onClick={close} aria-label="close">
            ×
          </button>
        </div>
        <div className="ip-modal-grid">
          {list.map(({ name, i }) => (
            <div
              key={i}
              className={"ip-scard" + (i === value ? " on" : "")}
              onClick={() => {
                onPick(i);
                close();
              }}
            >
              <div className="sthumb">
                <ImgGlyph />
              </div>
              <div className="sname">{name}</div>
            </div>
          ))}
          {list.length === 0 && <div className="ip-noresult">没有匹配的风格</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- scale-to-fit hero canvas ---------- */

function HeroCanvas({ children }: { children: React.ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const fit = () => {
      const stage = stageRef.current;
      const canvas = canvasRef.current;
      if (!stage || !canvas) return;
      // scale to fit width; clamp so very wide screens don't pixel-up the design
      const s = Math.min(1, stage.clientWidth / HERO_CANVAS_W);
      canvas.style.transform = `scale(${s})`;
      stage.style.height = HERO_CANVAS_H * s + "px";
    };
    fit();
    window.addEventListener("resize", fit);
    const ro = new ResizeObserver(fit);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => {
      window.removeEventListener("resize", fit);
      ro.disconnect();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      style={{ position: "relative", width: "100%", overflow: "hidden" }}
    >
      <div
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: HERO_CANVAS_W,
          height: HERO_CANVAS_H,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function HomePage() {
  const router = useRouter();

  const [sel, setSel] = useState<number[]>(OPTS.map((o) => o.defaultIndex ?? 0));
  const [open, setOpen] = useState<number>(-1);
  const [styleOpen, setStyleOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const styleRow = OPTS.findIndex((o) => o.modal);
  const genderIndex = sel[0] ?? 0;
  const gender = (OPTS[0]!.items[genderIndex] as "男性向" | "女性向") ?? "男性向";
  const phrases = EXAMPLE_PHRASES[gender];

  /* close any open dropdown on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest?.(".ip-cat")) setOpen(-1);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const start = () => {
    const userPrompt = prompt.trim();
    const artStyle = OPTS[1]!.items[sel[1] ?? 0]!;
    const plotStyle = OPTS[2]!.items[sel[2] ?? 1]!;
    const voice = OPTS[3]!.items[sel[3] ?? 1]!;
    const pace = OPTS[4]!.items[sel[4] ?? 1]!;

    const worldSetting = [
      `这是一款面向【${gender}】观众的 AI 交互剧情游戏。`,
      `剧情风格：${plotStyle}。内容节奏：${pace}。`,
      userPrompt ? `玩家给出的故事种子：「${userPrompt}」。` : "",
      `请依据上述设定，以极致的戏剧张力与细腻的情感起伏，为玩家编织精彩的故事分支与对话。`,
    ]
      .filter(Boolean)
      .join("\n");

    const styleMap: Record<string, string> = {
      二次元: "唯美二次元动漫插画，日系 galgame 精致质感，柔和温暖的自然光照。",
      吉卜力: "吉卜力工作室风格，手绘动画质感，柔和水彩底色，温暖治愈的氛围。",
      真实系: "真实电影感，柔和自然光照，胶片颗粒。",
      超写实: "超写实人像与场景，电影级布光，皮肤与材质细节精致。",
      水彩: "水彩插画，湿润晕染笔触，纸纹底色。",
      像素风: "像素风格，复古游戏 16-bit 调色，方块化几何造型。",
      日系动画: "现代日系动画 cel-shading，硬光阴影分层，赛璐璐风。",
      "3D 渲染": "3D 渲染卡通风格，柔和次表面散射，干净的电影级布光。",
      蒸汽朋克: "蒸汽朋克美学，铜色齿轮与蒸汽，工业革命氛围。",
      玄幻: "国风玄幻插画，仙气缭绕，群山烟雨与神兽萦绕。",
      国风水墨: "国潮唯美古风插画，水墨微晕渲染，仙侠浪漫色彩，极具东方神韵。",
      赛博朋克: "赛博朋克都市，霓虹反射湿润街道，电子义体高光。",
    };
    // 「自动」→ fall back to 二次元 (project default). Plain prompts like
    // "由模型自动判断画风" are not understood by FLUX — it just paints them
    // literally, so we'd rather lock in a sensible default.
    const effectiveStyle = artStyle === "自动" ? "二次元" : artStyle;
    const styleGuide = styleMap[effectiveStyle] ?? styleMap["二次元"]!;
    const audioEnabled = voice === "开启";

    sessionStorage.setItem(
      "yume:custom",
      JSON.stringify({ worldSetting, styleGuide, audioEnabled }),
    );
    router.push("/play?custom=1");
  };

  const onCardClick = (seed?: string) => {
    if (seed) setPrompt(seed);
    inputRef.current?.focus();
  };

  return (
    <div className="w-full relative">
      {/* ================== HERO (scale-to-fit 1900×980 canvas) ================== */}
      <HeroCanvas>
        {/* tagline */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 172,
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          <div className="ip-tagline" style={{ fontSize: 33 }}>
            今天想穿越到什么故事？
          </div>
        </div>

        {/* prompt bar */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 250,
            transform: "translateX(-50%)",
            width: 1100,
            height: 68,
          }}
        >
          <form
            className="ip-bar"
            style={{ width: 1100, height: 68 }}
            onSubmit={(e) => {
              e.preventDefault();
              start();
            }}
          >
            <div className="ip-field">
              <input
                ref={inputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder=" "
                spellCheck={false}
              />
              {!prompt && (
                <div className="ph">
                  <Typewriter phrases={phrases} />
                </div>
              )}
              <Frame />
            </div>
            <button type="submit" className="ip-start">
              <span>开 始</span>
              <Frame />
            </button>
          </form>
        </div>

        {/* category selectors */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: 352,
            transform: "translateX(-50%)",
            width: 1180,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "center",
          }}
        >
          {OPTS.map((o, r) => (
            <CategorySelect
              key={r}
              label={o.label}
              items={o.items}
              value={sel[r] ?? 0}
              open={open === r}
              onToggle={() => {
                if (o.modal) {
                  setStyleOpen(true);
                } else {
                  setOpen(open === r ? -1 : r);
                }
              }}
              onPick={(i) => {
                setSel((s) => s.map((v, j) => (j === r ? i : v)));
                setOpen(-1);
              }}
            />
          ))}
        </div>

        {/* hero scattered cards — content switches by 性向 */}
        {HERO_SLOTS.map((slot, i) => {
          const content = HERO_CONTENT[gender][i]!;
          const suffix = gender === "女性向" ? "_f" : "";
          return (
            <div
              key={`${gender}-${i}`}
              className="ip-card"
              style={{
                left: slot.x,
                top: slot.y,
                width: slot.w,
                height: slot.h,
                transform: `rotate(calc(${slot.rot}deg * var(--jit)))`,
              }}
              onClick={() => onCardClick(content.outline)}
            >
              <CardBody
                title={content.title}
                outline={content.outline}
                image={`/home/hero${i}${suffix}.webp`}
              />
              <Frame />
            </div>
          );
        })}

      </HeroCanvas>

      {/* ================== SCROLL HINT + GALLERY ================== */}
      <div className="ip-sectionnote">
        <span className="arr">↓</span>
        继续下滑 · 加载更多示例卡片
      </div>

      <div className="ip-gallery">
        {GALLERY.map((g, i) => (
          <div
            key={i}
            className="ip-card gcard"
            style={{ height: g.h, ["--gr" as string]: g.rot + "deg" } as React.CSSProperties}
            onClick={() => onCardClick(g.outline)}
          >
            <CardBody
              title={g.title}
              outline={g.outline}
              image={`/home/gallery${i}.webp`}
            />
            <Frame />
          </div>
        ))}
      </div>

      {/* ================== PROJECT INTRO ================== */}
      <div className="ip-intro">
        <div className="kicker">INFIPLOT · AI 实时交互剧情游戏 · Demo</div>

        <p>
          <b>InfiPlot</b> 是一款用 AI 实时生成内容的交互式剧情游戏 —— 图片、语音与剧情分支都在游玩过程中即时生成。我们希望探索多模态模型在「直接生成图片、视频」这类
          one-shot 能力之外，更多的可能性。
        </p>
        <p>
          我们希望通过这个页面，与<b>赞助商</b>、未来的<b>团队成员</b>以及<b>内测用户</b>建立联系。
        </p>

        <div className="label">团 队</div>
        <p>
          我们是一群来自<b>清华大学</b>等海内外高校、充满激情的年轻人，目前仍处于早期阶段。产品还在打磨，团队也在<b>招募成员</b>。
        </p>

        <div className="label">加 入 / 合 作</div>
        <p>
          如有意加入团队，请将简历发送至 <span className="mail">hi@infiplot.com</span>
        </p>

        <div className="label">联 系 方 式</div>
        <p>
          邮箱 <span className="mail">hi@infiplot.com</span>　·　Founder X / Twitter <b>@yzh_im</b>
        </p>

        <div className="label">内 测 用 户 群</div>
        <p>
          群二维码 / 邀请链接 <span style={{ color: "var(--ink-faint)" }}>（待补充）</span>
        </p>

        <p style={{ fontSize: 13, color: "var(--ink-faint)", lineHeight: 1.75, marginTop: 32 }}>
          内测期间本产品可免费使用，但稳定性可能会随并发用户数量而有波动。欢迎赞助商联系我们，提供更多算力资源和商讨长期合作事宜。
          <br />
          内测期间生成的内容不会被保存，如有需要，请通过录屏或截图等方式保存游玩体验，并记录下生成故事时的提示词与风格选项等。
          <br />
          AI 生成的内容不代表本团队立场。
        </p>
        <Frame />
      </div>

      {styleOpen && styleRow >= 0 && (
        <StyleModal
          items={OPTS[styleRow]!.items}
          value={sel[styleRow] ?? 0}
          onPick={(i) => setSel((s) => s.map((v, j) => (j === styleRow ? i : v)))}
          onClose={() => setStyleOpen(false)}
        />
      )}
    </div>
  );
}
