export interface OceanDataPoint {
  latitude: number;
  longitude: number;
  sst?: number;
  record_timestamp: string;
  current_speed?: number;   
  current_direction?: number;
}

export interface EDnaDataPoint {
  id?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

export interface Hotpoint {
  id?: string;
  latitude?: number;
  longitude?: number;
  [key: string]: any;
}

export interface TimelineDay {
  label: string;
  date: Date;
}

export interface Spot {
  id: string | number;
  name: string;
  lat: number;
  lng: number;
  icon?: {
    url: string;
    scaledSize: { width: number; height: number };
    origin: { x: number; y: number };
    anchor: { x: number; y: number };
  };
}

export interface GoogleMapInstance {
  setCenter(latLng: any): void;
  setZoom(zoom: number): void;
  getZoom(): number;
  [key: string]: any; 
}

export interface GoogleHeatmapLayerInstance {
  setData(data: any[]): void;
  setOptions(options: any): void;
  setMap(map: any): void;
  [key: string]: any;
}

export interface GoogleMarkerInstance {
  setMap(map: any): void;
  setPosition(latLng: any): void;
  [key: string]: any;
}

export interface GoogleInfoWindowInstance {
  open(options?: any): void;
  close(): void;
  setContent(content: any): void;
  [key: string]: any;
}

declare global {
  interface Window {
    google: any;
  }
}