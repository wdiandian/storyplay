import type { StorySku } from "@/lib/storySku/manifest";

export const storySkuGenreOptions = [
  "恋爱",
  "悬疑",
  "奇幻",
  "都市",
  "校园",
  "职场",
  "科幻",
  "历史",
  "冒险",
  "成长",
] as const;

export const storySkuMoodOptions = [
  "甜",
  "虐",
  "紧张",
  "治愈",
  "暧昧",
  "爽感",
  "暗黑",
  "浪漫",
  "诡异",
] as const;

export const storySkuInteractionOptions = ["轻互动", "中互动", "强互动"] as const;

export const storySkuStructureOptions = [
  "单线推进",
  "多分支",
  "短剧反转",
  "关系推进",
  "解谜",
  "养成",
] as const;

export const storySkuVisualStyleOptions = [
  "电影感",
  "轻小说",
  "二次元",
  "写实",
  "哥特",
  "赛博朋克",
  "国风",
  "波普",
] as const;

export const storySkuContentWarningOptions = [
  "惊悚",
  "暴力",
  "血腥",
  "权谋",
  "情感压迫",
  "身份欺骗",
] as const;

export type StorySkuGenre = (typeof storySkuGenreOptions)[number];
export type StorySkuMood = (typeof storySkuMoodOptions)[number];
export type StorySkuInteraction = (typeof storySkuInteractionOptions)[number];
export type StorySkuStructure = (typeof storySkuStructureOptions)[number];
export type StorySkuVisualStyle = (typeof storySkuVisualStyleOptions)[number];
export type StorySkuContentWarning = (typeof storySkuContentWarningOptions)[number];

export type StorySkuTaxonomy = {
  genres: StorySkuGenre[];
  moods: StorySkuMood[];
  interaction: StorySkuInteraction;
  structure: StorySkuStructure;
  visualStyle: StorySkuVisualStyle;
  contentWarnings: StorySkuContentWarning[];
};

export const defaultStorySkuTaxonomy: StorySkuTaxonomy = {
  genres: ["恋爱"],
  moods: ["浪漫"],
  interaction: "中互动",
  structure: "关系推进",
  visualStyle: "电影感",
  contentWarnings: [],
};

function includesAny(source: string, patterns: string[]) {
  return patterns.some((pattern) => source.includes(pattern));
}

function pushUnique<T extends string>(items: T[], value: T) {
  if (!items.includes(value)) items.push(value);
}

export function inferStorySkuTaxonomy(sku: StorySku): StorySkuTaxonomy {
  const source = [sku.title, sku.logline, sku.synopsis, sku.genreTagsRaw, sku.stylePrompt, ...sku.tags].join(" ");
  const genres: StorySkuGenre[] = [];
  const moods: StorySkuMood[] = [];
  const contentWarnings: StorySkuContentWarning[] = [];

  if (includesAny(source, ["恋", "爱", "甜宠", "暗恋", "言情", "浪漫", "虐恋"])) {
    pushUnique(genres, "恋爱");
  }
  if (includesAny(source, ["悬疑", "追凶", "谜", "侦探", "秘辛"])) pushUnique(genres, "悬疑");
  if (includesAny(source, ["奇幻", "神话", "魔", "克苏鲁", "童话"])) pushUnique(genres, "奇幻");
  if (includesAny(source, ["都市", "商战", "家族", "现代"])) pushUnique(genres, "都市");
  if (includesAny(source, ["校园", "同学", "学园"])) pushUnique(genres, "校园");
  if (includesAny(source, ["职场", "公司", "总裁"])) pushUnique(genres, "职场");
  if (includesAny(source, ["科幻", "赛博", "时间循环", "时空", "未来"])) pushUnique(genres, "科幻");
  if (includesAny(source, ["历史", "宫廷", "权谋", "敦煌"])) pushUnique(genres, "历史");
  if (includesAny(source, ["冒险", "逃亡", "探索"])) pushUnique(genres, "冒险");
  if (includesAny(source, ["成长", "逆袭", "觉醒"])) pushUnique(genres, "成长");

  if (includesAny(source, ["甜", "高甜", "甜宠"])) pushUnique(moods, "甜");
  if (includesAny(source, ["虐", "悲情", "牺牲"])) pushUnique(moods, "虐");
  if (includesAny(source, ["紧张", "惊悚", "追凶", "危机", "悬疑"])) pushUnique(moods, "紧张");
  if (includesAny(source, ["治愈", "救赎", "守护"])) pushUnique(moods, "治愈");
  if (includesAny(source, ["暧昧", "暗恋"])) pushUnique(moods, "暧昧");
  if (includesAny(source, ["爽", "逆袭", "反转"])) pushUnique(moods, "爽感");
  if (includesAny(source, ["暗黑", "黑暗", "黑色", "哥特", "克苏鲁"])) pushUnique(moods, "暗黑");
  if (includesAny(source, ["浪漫", "爱情", "恋"])) pushUnique(moods, "浪漫");
  if (includesAny(source, ["诡异", "怪谈", "克苏鲁"])) pushUnique(moods, "诡异");

  if (includesAny(source, ["惊悚", "恐怖", "克苏鲁", "诡异"])) pushUnique(contentWarnings, "惊悚");
  if (includesAny(source, ["暴力", "复仇", "追杀"])) pushUnique(contentWarnings, "暴力");
  if (includesAny(source, ["血腥", "血色"])) pushUnique(contentWarnings, "血腥");
  if (includesAny(source, ["权谋", "权斗", "宫廷", "商战"])) pushUnique(contentWarnings, "权谋");
  if (includesAny(source, ["虐恋", "压迫", "牺牲"])) pushUnique(contentWarnings, "情感压迫");
  if (includesAny(source, ["身份", "伪装", "欺骗"])) pushUnique(contentWarnings, "身份欺骗");

  let structure: StorySkuStructure = "关系推进";
  if (includesAny(source, ["反转", "短剧"])) structure = "短剧反转";
  if (includesAny(source, ["多线", "多重", "分支"])) structure = "多分支";
  if (includesAny(source, ["解谜", "谜", "追凶"])) structure = "解谜";
  if (includesAny(source, ["养成", "成长"])) structure = "养成";

  let visualStyle: StorySkuVisualStyle = "电影感";
  if (includesAny(source, ["轻小说", "新海诚", "Makoto Shinkai"])) visualStyle = "轻小说";
  if (includesAny(source, ["二次元", "动漫"])) visualStyle = "二次元";
  if (includesAny(source, ["写实"])) visualStyle = "写实";
  if (includesAny(source, ["哥特", "黑色电影"])) visualStyle = "哥特";
  if (includesAny(source, ["赛博", "蒸汽波"])) visualStyle = "赛博朋克";
  if (includesAny(source, ["国风", "敦煌", "宫廷"])) visualStyle = "国风";
  if (includesAny(source, ["Pop Art", "波普"])) visualStyle = "波普";

  return {
    genres: genres.length > 0 ? genres.slice(0, 3) : defaultStorySkuTaxonomy.genres,
    moods: moods.length > 0 ? moods.slice(0, 4) : defaultStorySkuTaxonomy.moods,
    interaction: sku.runtimeSummary.choicesCount >= 4 ? "强互动" : sku.runtimeSummary.choicesCount >= 2 ? "中互动" : "轻互动",
    structure,
    visualStyle,
    contentWarnings,
  };
}
