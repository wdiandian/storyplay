import type {
  StorySkuGenre,
  StorySkuInteraction,
  StorySkuMood,
  StorySkuStructure,
  StorySkuVisualStyle,
} from "@/lib/storySku/taxonomy";

export const storySkuGenreKeys: Record<StorySkuGenre, string> = {
  恋爱: "romance",
  悬疑: "mystery",
  奇幻: "fantasy",
  都市: "urban",
  校园: "campus",
  职场: "workplace",
  科幻: "sciFi",
  历史: "historical",
  冒险: "adventure",
  成长: "growth",
};

export const storySkuMoodKeys: Record<StorySkuMood, string> = {
  甜: "sweet",
  虐: "angsty",
  紧张: "tense",
  治愈: "healing",
  暧昧: "flirty",
  爽感: "powerFantasy",
  暗黑: "dark",
  浪漫: "romantic",
  诡异: "eerie",
};

export const storySkuStructureKeys: Record<StorySkuStructure, string> = {
  单线推进: "linear",
  多分支: "branching",
  短剧反转: "shortDramaTwist",
  关系推进: "relationship",
  解谜: "puzzle",
  养成: "progression",
};

export const storySkuVisualStyleKeys: Record<StorySkuVisualStyle, string> = {
  电影感: "cinematic",
  轻小说: "lightNovel",
  二次元: "anime",
  写实: "realistic",
  哥特: "gothic",
  赛博朋克: "cyberpunk",
  国风: "chineseFantasy",
  波普: "popArt",
};

export const storySkuInteractionKeys: Record<StorySkuInteraction, string> = {
  轻互动: "light",
  中互动: "medium",
  强互动: "strong",
};
