// 全站統一的分數色彩語言。提升對比,避免中段分數洗白。

export type ScoreTone = {
  color: string; // 主色(文字/線條)
  bg: string; // 淡底
  ring: string; // 邊框/環
};

export function scoreTone(score: number): ScoreTone {
  if (score >= 75) return { color: "#157a5b", bg: "rgba(21,122,91,0.10)", ring: "rgba(21,122,91,0.30)" };
  if (score >= 60) return { color: "#2f9e6f", bg: "rgba(47,158,111,0.12)", ring: "rgba(47,158,111,0.30)" };
  if (score >= 45) return { color: "#cf9b32", bg: "rgba(207,155,50,0.14)", ring: "rgba(207,155,50,0.32)" };
  return { color: "#e0664c", bg: "rgba(224,102,76,0.12)", ring: "rgba(224,102,76,0.30)" };
}

export function scoreColor(score: number): string {
  return scoreTone(score).color;
}

export function ratingLabel(score: number): string {
  if (score >= 75) return "優異";
  if (score >= 60) return "良好";
  if (score >= 45) return "中性";
  return "偏弱";
}
