export type BorderStyle = "solid" | "dashed" | "dotted" | "none";
export type FlexDir = "row" | "column" | "row-reverse" | "column-reverse";
export type JustifyContent =
  | "flex-start" | "flex-end" | "center"
  | "space-between" | "space-around" | "space-evenly";
export type AlignItems = "flex-start" | "flex-end" | "center";

export interface TextConfig {
  content: string;
  color: string;
  fontSize: number;
  fontWeight: 400 | 600 | 700;
}

export interface SvgPlacement {
  name: string;
  color: string;
  size: number;
  alignItems: string;
  justifyContent: string;
  /** Extra padding so icon doesn't poke out of rounded corners (= borderRadius / 2) */
  padding: number;
}

export interface BoxConfig {
  id: string;
  width: number;
  height: number;
  bgColor: string;
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  borderStyle: BorderStyle;
  text?: TextConfig;
  svg?: SvgPlacement;
}

export type GapMode =
  | {
      kind: "auto";
      containerWidth: number;
      containerHeight: number;
    }
  | {
      kind: "fixed";
      gap: number;
      px: number;
      py: number;
      containerWidth: number;
      containerHeight: number;
    };

export interface TaskConfig {
  gapMode: GapMode;
  flexDirection: FlexDir;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
  bgColor: string;
  boxes: BoxConfig[];
  svgNames: string[];
}

export type InspectedItem =
  | { kind: "container"; task: TaskConfig }
  | { kind: "box"; box: BoxConfig; index: number };
