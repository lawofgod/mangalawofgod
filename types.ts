export enum BubbleType {
  SPEECH = 'SPEECH',
  THOUGHT = 'THOUGHT',
  SHOUT = 'SHOUT',
  BOX = 'BOX',
  PLAIN_TEXT = 'PLAIN_TEXT',
  WHISPER = 'WHISPER',
  FLASH = 'FLASH'
}

export interface TextBubble {
  id: string;
  x: number;
  y: number;
  text: string;
  type: BubbleType;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: string;
  fontFamily?: string;
  letterSpacing?: number;
  lineHeight?: number;
  padding?: number;
  // Visual Styles
  textColor?: string;
  textStrokeColor?: string;
  textStrokeWidth?: number;
  backgroundColor?: string;
  borderColor?: string;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export interface GenerationConfig {
  style: string;
  panelCount: string;
}