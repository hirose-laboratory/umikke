export default function Header() {
  return 
    interface GoogleMapInstance {
  getZoom: () => number;
  setZoom: (zoom: number) => void;
  setCenter: (latLng: object) => void;
}
type GoogleLatLngInstance = object;
type GoogleHeatmapLayerInstance = {
  setData: (data: object[]) => void;
  setOptions: (options: object) => void;
};
interface GoogleMarkerInstance {
  addListener: (event: string, handler: () => void) => void;
  setPosition: (latLng: object) => void;
  setMap: (map: GoogleMapInstance | null) => void;
}

interface GoogleInfoWindowInstance {
  setContent: (content: string) => void;
  open: (map: GoogleMapInstance, marker: GoogleMarkerInstance) => void;
}

interface GoogleSizeInstance {
  width: number;
  
  height: number;
}

interface GooglePointInstance {
  x: number;
  y: number;
}

// window.google の構造を型定義
declare global {
  interface Window {
    google: {
      maps: {
        Map: new (el: HTMLElement, options: object) => GoogleMapInstance;
        LatLng: new (lat: number, lng: number) => GoogleLatLngInstance;
        Marker: new (options: object) => GoogleMarkerInstance;
        InfoWindow: new (options: object) => GoogleInfoWindowInstance;
        SymbolPath: {
          CIRCLE: number;
        };
        visualization: {
          HeatmapLayer: new (options: object) => GoogleHeatmapLayerInstance;
        };
      };
    };
  }
}

interface Spot {
  position: { lat: number; lng: number };
  title: string;
  content: string;
  initialOpen: boolean;
  icon: {
    url: string;
    scaledSize: GoogleSizeInstance;
    origin: GooglePointInstance;
    anchor: GooglePointInstance;
  };
}

interface TimelineDay {
  label: string;
  date: Date;
}

interface OceanDataPoint {
  id: number;
  latitude: number;
  longitude: number;
  record_timestamp: string;
  sst: number | null;
  cha: number | null;
  current_speed: number | null;
  current_direction: number | null;
}
}
