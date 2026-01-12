
export enum ToolType {
  MOVE = 'MOVE',
  SELECT_RECT = 'SELECT_RECT',
  CROP = 'CROP',
  MAGIC_WAND = 'MAGIC_WAND',
  TEXT = 'TEXT',
  ERASER = 'ERASER',
  ADJUST = 'ADJUST'
}

export interface LayerData {
  id: string;
  name: string;
  dataUrl: string;
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  bgColor: string;
  opacity: number;
  adjustments: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
}

export interface DocumentState {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: LayerData[];
  selectedLayerId: string | null;
}

export interface PagePreset {
  name: string;
  width: number;
  height: number;
  description: string;
}
