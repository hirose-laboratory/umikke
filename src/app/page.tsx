'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

// ==========================================
// 1. 外部コンポーネントのインポート
// ==========================================
import LoginModal from './components/LoginModal';
import TopRightMenu from './components/TopRightMenu';
import RightSidebar from './components/RightSidebar';
import TimelineBar from './components/TimelineBar';
import MapControls from './components/MapControls';
import WindyMenu from './components/WindyMenu';

// ==========================================
// 2. Google Maps ＆ データ型の定義
// ==========================================
interface GoogleMapInstance {
  getZoom: () => number;
  setZoom: (zoom: number) => void;
  setCenter: (latLng: object) => void;
  addListener: (event: string, handler: (e: any) => void) => object;
  panTo?: (latLng: object) => void; // panToを追加
}

interface GoogleHeatmapLayerInstance {
  setData: (data: object[]) => void;
  setOptions: (options: object) => void;
}

interface GoogleMarkerInstance {
  addListener: (event: string, handler: () => void) => void;
  setPosition: (latLng: object) => void;
  setMap: (map: GoogleMapInstance | null) => void;
}

interface GoogleInfoWindowInstance {
  setContent: (content: string) => void;
  setPosition: (latLng: object) => void;
  open: (map: GoogleMapInstance, marker?: GoogleMarkerInstance) => void;
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

interface FishPredictionPoint {
  id?: number;
  fish_id?: number;
  latitude: number;
  longitude: number;
  target_timestamp?: string;
  heatmap_value?: number;
  value?: number;
  score?: number;
}

interface FishEdnaPinPoint {
  id?: number;
  fish_id?: number;
  latitude: number;
  longitude: number;
  sample_date?: string;
  value?: number | string;
  dna_copies?: number;
}

interface Hotpoint {
  id?: number;
  latitude: number;
  longitude: number;
  score?: number;
  fish_id?: number;
  suggestion?: string;
  intensity_score?: number;
}

// 魚種名からバックエンドの固有ID(1, 2, 3...)へ変換する関数
const getFishIdByName = (name: string): number => {
  if (name.includes('伊勢エビ') || name.includes('エビ')) return 2;
  if (name.includes('ブリ') || name.includes('ワラサ') || name.includes('ハマチ')) return 3;
  if (name.includes('イワシ') || name.includes('カタクチ')) return 1;
  return 1; // デフォルトID
};

// 2地点間の距離 (km) を計算する関数 (球面三角法 / Haversine式)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // 地球の半径 (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 2km以内の近接ポイントを間引き、最もスコアが高い地点だけを残す関数 (NMS)
function filterNearbyHotpoints(points: Hotpoint[], minDistanceKm = 2.0): Hotpoint[] {
  const sorted = [...points].sort((a, b) => {
    const scoreA = Number(a.intensity_score ?? a.score ?? 0);
    const scoreB = Number(b.intensity_score ?? b.score ?? 0);
    return scoreB - scoreA;
  });
  const selected: Hotpoint[] = [];

  for (const point of sorted) {
    const isTooClose = selected.some((chosen) => {
      const dist = getDistanceKm(
        Number(point.latitude),
        Number(point.longitude),
        Number(chosen.latitude),
        Number(chosen.longitude)
      );
      return dist < minDistanceKm;
    });
    if (!isTooClose) {
      selected.push(point);
    }
  }

  return selected;
}

export default function HeatmapPage() {
  // ==========================================
  // 3. Google Maps オブジェクト参照 (Ref)
  // ==========================================
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const heatmapLayerRef = useRef<GoogleHeatmapLayerInstance | null>(null);
  const currentLocationMarkerRef = useRef<any>(null);
  const fishPointsRef = useRef<FishPredictionPoint[]>([]);
  const fishHeatmapLayerRef = useRef<GoogleHeatmapLayerInstance | null>(null);
  const infoWindowRef = useRef<GoogleInfoWindowInstance | null>(null);
  const hotpointMarkersRef = useRef<GoogleMarkerInstance[]>([]);
  const ednaMarkersRef = useRef<GoogleMarkerInstance[]>([]);
  const arrowMarkersRef = useRef<any[]>([]);
  const oceanPointsRef = useRef<OceanDataPoint[]>([]);

  // ==========================================
  // 4. アプリケーション状態管理 (State)
  // ==========================================
  const initDate = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, []);

  const [baseDate, setBaseDate] = useState<Date>(initDate);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState<boolean>(false);
  const [calYear, setCalYear] = useState<number>(initDate.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(initDate.getMonth());
  const [isMounted, setIsMounted] = useState(false);

  const [showMarinePanel, setShowMarinePanel] = useState<boolean>(true);
  const [showFishPanel, setShowFishPanel] = useState<boolean>(true);
  const [activeMarineLayers, setActiveMarineLayers] = useState<string[]>(['sst', 'current']);
  const [activeFishLayers, setActiveFishLayers] = useState<string[]>([]);
  const [marineTheme, setMarineTheme] = useState<string>('default');
  const [fishTheme, setFishTheme] = useState<string>('default');

  const [ednaPinPoints, setEdnaPinPoints] = useState<FishEdnaPinPoint[]>([]);

  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showWindyMenu, setShowWindyMenu] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('名無しアングラー');
  const [targetFish, setTargetFish] = useState<string>(''); 

  const [oceanLoading, setOceanLoading] = useState<boolean>(true);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const [oceanDataVersion, setOceanDataVersion] = useState<number>(0);
  const [oceanPointCount, setOceanPointCount] = useState<number>(0);
  const [hotpoints, setHotpoints] = useState<Hotpoint[]>([]);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [oceanRetryKey, setOceanRetryKey] = useState<number>(0);

  // --- GPS用 State 追加 --- 
  const [currentPosition, setCurrentPosition] = useState<{lat: number, lng: number} | null>(null); 
  
  const activeMarineLayersRef = useRef<string[]>(activeMarineLayers);
  const activeFishLayersRef = useRef<string[]>(activeFishLayers);

  useEffect(() => { 
    activeMarineLayersRef.current = activeMarineLayers; 
  }, [activeMarineLayers]);

  useEffect(() => {
    activeFishLayersRef.current = activeFishLayers;
  }, [activeFishLayers]);

  useEffect(() => { 
    setIsMounted(true); 
  }, []);

  const handleMarineLayersUpdate = useCallback((val: string[] | ((prev: string[]) => string[])) => {
    setActiveMarineLayers((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      if (next.includes('sst') && next.includes('chl')) {
        if (prev.includes('sst')) return next.filter((l) => l !== 'sst');
        if (prev.includes('chl')) return next.filter((l) => l !== 'chl');
      }
      return next;
    });
  }, []);

  const handleFishLayersUpdate = useCallback((val: string[] | ((prev: string[]) => string[])) => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
      return;
    }
    setActiveFishLayers(val);
  }, [isLoggedIn]);

  const selectedFullDate = useMemo(() => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + currentProgress);
    return d;
  }, [baseDate, currentProgress]);

  const selectedFullDateRef = useRef(selectedFullDate);
  useEffect(() => {
    selectedFullDateRef.current = selectedFullDate;
  }, [selectedFullDate]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://umikke.duckdns.org/api';
  const AUTH_STORAGE_KEY = 'umikke_auth';

  const legendGradientStyle = useMemo(() => {
    if (marineTheme === 'rainbow') return 'linear-gradient(to right, blue, cyan, lime, yellow, red)';
    if (marineTheme === 'ocean') return 'linear-gradient(to right, #001219, #005f73, #0a9396, #94d2bd)';
    return 'linear-gradient(to right, blue, cyan, lime, yellow, red)';
  }, [marineTheme]);

  const chlLegendGradientStyle = useMemo(() => {
    return 'linear-gradient(to right, #7b1fa2, #e91e63, #ff1744)';
  }, []);

  const fishLegendGradientStyle = useMemo(() => {
    if (fishTheme === 'rainbow') return 'linear-gradient(to right, blue, cyan, lime, yellow, red)';
    if (fishTheme === 'colorblind') return 'linear-gradient(to right, #E69F00, #56B4E9, #009E73, #F0E442)';
    return 'linear-gradient(to right, rgba(142, 36, 170, 1), rgba(255, 152, 0, 1), rgba(255, 235, 59, 1))';
  }, [fishTheme]);

  // ==========================================
  // 6. ユーザー認証機能
  // ==========================================
  const handleEmailLogin = async () => {
    if (!email || !password) { alert('メールアドレスとパスワードを入力してください。'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        alert('ログインに失敗しました: ' + (errBody?.message || `status ${res.status}`)); return;
      }
      const data = await res.json();
      const token = data.token ?? data.access_token ?? '';
      const loggedEmail = data.email ?? email;
      
      const existingAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
      const fetchedName = data.name ?? existingAuth.name ?? '名無しアングラー';
      const fetchedTargetFish = data.targetFish ?? existingAuth.targetFish ?? '';
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ 
        ...existingAuth,
        token, 
        email: loggedEmail,
        name: fetchedName,
        targetFish: fetchedTargetFish
      }));
      setIsLoggedIn(true); 
      setLoggedInEmail(loggedEmail); 
      setUserName(fetchedName);
      setTargetFish(fetchedTargetFish);
      if (fetchedTargetFish) {
        setActiveFishLayers([fetchedTargetFish]);
      } else {
        setActiveFishLayers([]);
      }
      
      setShowLoginModal(false); 
      setShowWindyMenu(true); 
      setPassword('');
    } catch (err) {
      console.error(err); alert('ログイン処理中にエラーが発生しました。');
    }
  };

  const handleRegisterSubmit = async () => {
    if (!email || !password) { alert('登録するメールアドレスとパスワードを入力してください。'); return; }
    if (password.length < 6) { alert('パスワードは6文字以上で設定してください。'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        alert('登録に失敗しました: ' + (errBody?.message || `status ${res.status}`)); return;
      }
      const data = await res.json();
      const token = data.token ?? data.access_token ?? '';
      const registeredEmail = data.email ?? email;
      if (token) {
        const existingAuth = JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) || '{}');
        const fetchedName = data.name ?? existingAuth.name ?? '名無しアングラー';
        const fetchedTargetFish = data.targetFish ?? existingAuth.targetFish ?? '';
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ 
          ...existingAuth,
          token, 
          email: registeredEmail,
          name: fetchedName,
          targetFish: fetchedTargetFish
        }));
        setIsLoggedIn(true); 
        setLoggedInEmail(registeredEmail); 
        setUserName(fetchedName);
        setTargetFish(fetchedTargetFish);
        if (fetchedTargetFish) {
          setActiveFishLayers([fetchedTargetFish]);
        }

        setShowLoginModal(false); 
        setShowWindyMenu(true);
      } else {
        alert('アカウント登録が完了しました！ログインしてください。'); setIsSignUp(false);
      }
      setPassword('');
    } catch (err) {
      console.error(err); alert('登録処理中にエラーが発生しました。');
    }
  };

  const handleLogout = () => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const auth = JSON.parse(stored);
        delete auth.token;
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
      } catch (err) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setIsLoggedIn(false); 
    setLoggedInEmail(null); 
    setShowWindyMenu(false);
    setActiveFishLayers([]);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) return;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      const auth = stored ? JSON.parse(stored) : null;
      const res = await fetch(`${API_BASE_URL}/users/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({ email: loggedInEmail }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        alert('アカウント削除に失敗しました: ' + (errBody?.message || `status ${res.status}`)); return;
      }
      alert('アカウントを削除しました。'); 
      localStorage.removeItem(AUTH_STORAGE_KEY);
      handleLogout();
    } catch (err) {
      console.error(err); alert('削除処理中にエラーが発生しました。');
    }
  };

  const handleUpdateProfile = (newName: string, newTarget: string) => {
    setUserName(newName);
    setTargetFish(newTarget);
    if (newTarget !== '') {
      setActiveFishLayers([newTarget]);
    } else {
      setActiveFishLayers([]);
    }

    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    const auth = stored ? JSON.parse(stored) : {};
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      ...auth,
      name: newName,
      targetFish: newTarget 
    }));
    alert('プロフィールを保存しました！');
  };

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const auth = JSON.parse(stored);
        if (auth?.token) { 
          setIsLoggedIn(true); 
          if (auth.email) setLoggedInEmail(auth.email); 
          if (auth.name) setUserName(auth.name);

          let fishToSet = '';
          if (typeof auth.targetFish === 'string') {
            fishToSet = auth.targetFish;
          } else if (Array.isArray(auth.targetFish) && auth.targetFish.length > 0) {
            fishToSet = auth.targetFish[0];
          }
          if (fishToSet) {
            setTargetFish(fishToSet);
            setActiveFishLayers([fishToSet]);
          }
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  // ==========================================
  // 7. タイムライン・日付制御
  // ==========================================
  const timelineDays = useMemo(() => {
    const days: TimelineDay[] = [];
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate); d.setDate(baseDate.getDate() + i);
      days.push({ label: `${d.getMonth() + 1}/${d.getDate()}(${weekDays[d.getDay()]})`, date: d });
    }
    return days;
  }, [baseDate]);

  const formattedSelectedDate = useMemo(() => {
    const y = selectedFullDate.getFullYear(); const m = selectedFullDate.getMonth() + 1; const d = selectedFullDate.getDate();
    return `${y}年${m}月${d}日`;
  }, [selectedFullDate]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isPlaying) {
      intervalId = setInterval(() => { setCurrentProgress((prev) => (prev + 1) % 7); }, 1000);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isPlaying]);

  // ==========================================
  // 8. 地図レイヤー描画処理 (海況・流速・魚種)
  // ==========================================
  const updateMapLayers = useCallback(() => {
    if (!mapInstanceRef.current || typeof window === 'undefined' || !window.google) return;
    const google = window.google;
    const allPoints = oceanPointsRef.current;
    
    const targetYear = selectedFullDate.getFullYear();
    const targetMonth = selectedFullDate.getMonth();
    const targetDateNum = selectedFullDate.getDate();

    const todayPoints = allPoints.filter((p) => {
      if (!p.record_timestamp) return false;
      const safeTimestamp = p.record_timestamp.replace(' ', 'T');
      const pDate = new Date(safeTimestamp);
      return ( pDate.getFullYear() === targetYear && pDate.getMonth() === targetMonth && pDate.getDate() === targetDateNum );
    });

    if (heatmapLayerRef.current) {
      const hasSst = activeMarineLayers.includes('sst');
      const hasChl = activeMarineLayers.includes('chl');
      if ((hasSst || hasChl) && todayPoints.length > 0) {
        const sstValues = todayPoints
          .map((p) => (p.sst !== null && p.sst !== undefined ? Number(p.sst) : null))
          .filter((v): v is number => v !== null && !isNaN(v));
        const chlValues = todayPoints
          .map((p) => {
            const raw = (p as any).chl ?? (p as any).cha;
            return raw !== null && raw !== undefined ? Number(raw) : null;
          })
          .filter((v): v is number => v !== null && !isNaN(v));

        const minSst = sstValues.length > 0 ? Math.min(...sstValues) : 0;
        const maxSst = sstValues.length > 0 ? Math.max(...sstValues) : 0;
        const sstRange = maxSst - minSst;

        const minChl = chlValues.length > 0 ? Math.min(...chlValues) : 0;
        const maxChl = chlValues.length > 0 ? Math.max(...chlValues) : 0;
        const chlRange = maxChl - minChl;

        const heatPoints = todayPoints.map((p) => {
          let normalizedSst = 0;
          let normalizedChl = 0;

          if (hasSst && p.sst !== null && p.sst !== undefined) {
            const val = Number(p.sst);
            normalizedSst = sstRange > 0 ? ((val - minSst) / sstRange) * 100 : 50;
          }

          if (hasChl) {
            const rawChl = (p as any).chl ?? (p as any).cha;
            if (rawChl !== null && rawChl !== undefined) {
              const val = Number(rawChl);
              normalizedChl = chlRange > 0 ? ((val - minChl) / chlRange) * 100 : 50;
            }
          }

          let weightValue = 0;
          if (hasSst && hasChl) weightValue = (normalizedSst + normalizedChl) / 2;
          else if (hasSst) weightValue = normalizedSst;
          else if (hasChl) weightValue = normalizedChl;

          return {
            location: new google.maps.LatLng(Number(p.latitude), Number(p.longitude)),
            weight: weightValue,
          };
        });

        let gradient = null;
        if (marineTheme === 'rainbow') {
          gradient = ['rgba(0,0,255,0)', 'blue', 'cyan', 'lime', 'yellow', 'red'];
        } else if (marineTheme === 'ocean') {
          gradient = ['rgba(0,105,148,0)', '#006994', '#00b4d8', '#90e0ef', '#caf0f8'];
        } else {
          if (hasSst && hasChl) {
            gradient = ['rgba(255, 0, 255, 0)', 'rgba(128, 0, 128, 1)', 'rgba(255, 0, 255, 1)', 'rgba(255, 0, 0, 1)'];
          } else if (hasChl) {
            gradient = [
              'rgba(123, 31, 162, 0)',
              'rgba(123, 31, 162, 1)',
              'rgba(233, 30, 99, 1)',
              'rgba(255, 23, 68, 1)'
            ];
          } else {
            gradient = [
              'rgba(0, 0, 0, 0)',
              'rgba(0, 0, 255, 1.0)',
              'rgba(0, 255, 255, 1.0)',
              'rgba(0, 255, 0, 1.0)',
              'rgba(255, 255, 0, 1.0)',
              'rgba(255, 165, 0, 1.0)',
              'rgba(255, 0, 0, 1.0)'
            ];
          }
        }

        heatmapLayerRef.current.setData(heatPoints);
        heatmapLayerRef.current.setOptions({ 
          maxIntensity: 100, 
          radius: 45,        
          gradient: gradient
        });
      } else {
        heatmapLayerRef.current.setData([]);
      }
    }

    arrowMarkersRef.current.forEach(marker => marker.setMap(null));
    arrowMarkersRef.current = [];
    if (activeMarineLayers.includes('current')) {
      const validSpeeds = todayPoints
        .map(p => Number(p.current_speed ?? 0))
        .filter(s => s > 0);
      if (validSpeeds.length > 0) {
        const minSpeed = Math.min(...validSpeeds);
        const maxSpeed = Math.max(...validSpeeds);
        const speedRange = maxSpeed - minSpeed;
        const MIN_ARROW_LENGTH = 5;
        const MAX_ARROW_LENGTH = 20;

        todayPoints.forEach(p => {
          const speed = Number(p.current_speed ?? 0);
          const direction = Number(p.current_direction ?? 0);

          if (speed > 0) {
            let arrowLength = MIN_ARROW_LENGTH;
            if (speedRange > 0) {
              const normalizedRatio = (speed - minSpeed) / speedRange;
              arrowLength = MIN_ARROW_LENGTH + (normalizedRatio * (MAX_ARROW_LENGTH - MIN_ARROW_LENGTH));
            }

            const arrowWidth = 4 + ((speed - minSpeed) / (speedRange || 1)) * 2;
            const customArrowPath = `M 0,-${arrowLength} L ${arrowWidth},5 L 0,2 L -${arrowWidth},5 Z`;

            const arrowMarker = new google.maps.Marker({
              position: { lat: Number(p.latitude), lng: Number(p.longitude) },
              map: mapInstanceRef.current,
              icon: {
                path: customArrowPath,
                scale: 0.9,
                rotation: direction,
                fillColor: '#FF0000',
                fillOpacity: 0.9,
                strokeColor: 'white',
                strokeWeight: 1
              },
              zIndex: 1000
            });
            arrowMarkersRef.current.push(arrowMarker);
          }
        });
      }
    }

    if (fishHeatmapLayerRef.current) {
      if (activeFishLayers.length > 0) {
        const allFishPoints = fishPointsRef.current;
        const selectedFishIds: number[] = Array.from(
          new Set(activeFishLayers.map((fishName) => getFishIdByName(fishName)))
        );
        const targetFishPoints = allFishPoints.filter((p: any) => {
          const currentFishId = Number(p?.fish_id ?? p?.fishId ?? 0);
          return selectedFishIds.length === 0 || selectedFishIds.includes(currentFishId);
        });

        const THRESHOLD = 0.02; 

        const fishHeatData = targetFishPoints
          .map((p: any) => {
            const rawVal = Number(p?.heatmap_value ?? p?.value ?? p?.score ?? 0);
            const lat = Number(p?.latitude ?? p?.lat ?? 0);
            const lng = Number(p?.longitude ?? p?.lng ?? 0);

            return {
              location: new window.google.maps.LatLng(lat, lng),
              weight: rawVal,
            };
          })
          .filter((item) => item.weight >= THRESHOLD);

        let fishGradient: string[];
        if (fishTheme === 'rainbow') {
          fishGradient = ['rgba(0,0,255,0)', 'blue', 'cyan', 'lime', 'yellow', 'red'];
        } else if (fishTheme === 'colorblind') {
          fishGradient = ['rgba(230,159,0,0)', '#E69F00', '#56B4E9', '#009E73', '#F0E442'];
        } else {
          fishGradient = [
            'rgba(142, 36, 170, 0)', 
            'rgba(142, 36, 170, 0.6)', 
            'rgba(186, 104, 200, 0.8)', 
            'rgba(239, 108, 0, 0.85)', 
            'rgba(255, 152, 0, 0.9)', 
            'rgba(255, 235, 59, 1)'
          ];
        }

        fishHeatmapLayerRef.current.setData(fishHeatData);
        fishHeatmapLayerRef.current.setOptions({ 
          maxIntensity: 1, 
          radius: 35,
          gradient: fishGradient 
        });
      } else {
        fishHeatmapLayerRef.current.setData([]);
      }
    }
  }, [activeMarineLayers, marineTheme, selectedFullDate, activeFishLayers, fishTheme, oceanPointCount, oceanDataVersion]);

  // ==========================================
  // 9. バックエンドAPI通信 (海況 / eDNA予測 / 実測 / 提案)
  // ==========================================
  useEffect(() => {
    async function fetchOceanData() {
      setOceanLoading(true); setOceanError(null);
      const startD = new Date(baseDate); startD.setDate(startD.getDate() - 7);
      const endD = new Date(baseDate); endD.setDate(endD.getDate() + 7);
      const startStr = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-${String(startD.getDate()).padStart(2, '0')}T00:00:00`;
      const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}T23:59:59`;

      try {
        const url = `${API_BASE_URL}/ocean-data/data?start_time=${encodeURIComponent(startStr)}&end_time=${encodeURIComponent(endStr)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`API returned status ${res.status}`);
        const data = await res.json();
        oceanPointsRef.current = Array.isArray(data) ? data : [];
        setOceanPointCount(oceanPointsRef.current.length);
        setOceanDataVersion(v => v + 1);
      } catch (err) {
        setOceanError("海況データの取得に失敗しました。");
        console.error(err);
      } finally {
        setOceanLoading(false);
      }
    }
    fetchOceanData();
  }, [API_BASE_URL, baseDate, oceanRetryKey]);

  useEffect(() => {
    async function fetchFishData() {
      if (!isLoggedIn || activeFishLayers.length === 0) {
        fishPointsRef.current = [];
        setEdnaPinPoints([]);
        setHotpoints([]); 
        setOceanDataVersion((v) => v + 1);
        return;
      }
      const fishIds: number[] = Array.from(
        new Set(activeFishLayers.map((name) => getFishIdByName(name)))
      );

      const startD = new Date(baseDate);
      const endD = new Date(baseDate);
      endD.setDate(endD.getDate() + 6);
      const startStr = `${startD.getFullYear()}-${String(startD.getMonth() + 1).padStart(2, '0')}-${String(startD.getDate()).padStart(2, '0')}T00:00:00`;
      const endStr = `${endD.getFullYear()}-${String(endD.getMonth() + 1).padStart(2, '0')}-${String(endD.getDate()).padStart(2, '0')}T23:59:59`;

      try {
        const predictionRequests = fishIds.map((id) => {
          const predUrl = `${API_BASE_URL}/fish/${id}/edna-prediction?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`;
          return fetch(predUrl).then((res) => (res.ok ? res.json() : [])).catch(() => []);
        });

        const pinRequests = fishIds.map((id) => {
          const pinUrl = `${API_BASE_URL}/fish/${id}/edna?start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`;
          return fetch(pinUrl).then((res) => (res.ok ? res.json() : [])).catch(() => []);
        });

        const hotpointUrl = `${API_BASE_URL}/fish/hotpoints/high-score?min_score=0.5&limit=50&start=${encodeURIComponent(startStr)}&end=${encodeURIComponent(endStr)}`;
        const hotpointRequest = fetch(hotpointUrl).then((res) => (res.ok ? res.json() : [])).catch(() => []);

        const suggestionRequests = fishIds.map((id) => {
          const suggestUrl = `${API_BASE_URL}/fish/${id}/suggestions`;
          return fetch(suggestUrl).then((res) => (res.ok ? res.json() : [])).catch(() => []);
        });

        const [predictionResults, pinResults, rawHotpoints, suggestionResults] = await Promise.all([
          Promise.all(predictionRequests),
          Promise.all(pinRequests),
          hotpointRequest,
          Promise.all(suggestionRequests),
        ]);

        const flatPred = predictionResults.flat();
        const flatPin = pinResults.flat();
        const flatSuggestions = suggestionResults.flat();

        const filteredRawHotpoints = rawHotpoints.filter((hp: any) => {
          if (!hp.fish_id) return true;
          return fishIds.includes(Number(hp.fish_id));
        });

        const enrichedHotpoints = filteredRawHotpoints.map((hp: any) => {
          const suggestionObj = hp.fish_id 
            ? flatSuggestions.find((s: any) => s.fish_id === hp.fish_id) 
            : null;
          return {
            ...hp,
            suggestion: suggestionObj ? suggestionObj.suggestion_text : hp.suggestion,
          };
        });

        const filteredHotpoints = filterNearbyHotpoints(enrichedHotpoints, 2.0);

        fishPointsRef.current = flatPred;
        setEdnaPinPoints(flatPin);
        setHotpoints(filteredHotpoints);
        setOceanDataVersion((v) => v + 1);
      } catch (err) {
        console.error('❌ 魚種データの予期せぬエラー:', err);
      }
    }
    fetchFishData();
  }, [API_BASE_URL, activeFishLayers, baseDate, isLoggedIn]);

  // ==========================================
  // 10. 初期化・Google Maps 読み込み
  // ==========================================
  useEffect(() => {
    let cancelled = false;
    if (typeof window === 'undefined') return;

    if (!window.document.querySelector('script[src*="maps.googleapis.com"]')) {
      const script = window.document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=visualization&loading=async`;
      script.async = true;
      script.defer = true;
      script.onload = () => { if (!cancelled) initMap(); };
      window.document.head.appendChild(script);
    } else if (typeof window !== 'undefined' && window.google) {
      queueMicrotask(() => { if (!cancelled) initMap(); });
    } else {
      const script = window.document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement;
      if (script) {
        script.onload = () => { if (!cancelled) initMap(); };
      }
    }

    async function initMap() {
      if (!mapRef.current) return;
      if (typeof window === 'undefined' || !window.google || !window.google.maps) return;
      const google = window.google;

      try {
        const { Map } = await google.maps.importLibrary("maps") as any;
        const { HeatmapLayer } = await google.maps.importLibrary("visualization") as any;
        const map = new Map(mapRef.current, {
          center: { lat: 34.420, lng: 136.880 },
          zoom: 11,
          mapTypeId: 'roadmap',
          styles: [
            { elementType: 'labels', stylers: [{ visibility: 'off' }] },
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'off' }] },
            { featureType: 'road', stylers: [{ visibility: 'off' }] }
          ],
          disableDefaultUI: true,
        });

        mapInstanceRef.current = map;

        const customGradient = [
          'rgba(0, 0, 0, 0)', 'rgba(0, 0, 255, 1.0)', 'rgba(0, 255, 255, 1.0)', 
          'rgba(0, 255, 0, 1.0)', 'rgba(255, 255, 0, 1.0)', 'rgba(255, 165, 0, 1.0)', 'rgba(255, 0, 0, 1.0)'
        ];

        heatmapLayerRef.current = new HeatmapLayer({ data: [], map: map, gradient: customGradient, radius: 20, opacity: 0.85 });
        fishHeatmapLayerRef.current = new HeatmapLayer({ data: [], map: map, radius: 35, opacity: 0.85 });
        infoWindowRef.current = new google.maps.InfoWindow({ maxWidth: 450 });

        // ▼▼▼ マップクリック時の吹き出し制御 ▼▼▼
        map.addListener('click', (e: any) => {
          const clickLat = e.latLng.lat();
          const clickLng = e.latLng.lng();
          const CLICK_TOLERANCE_KM = 5.0; // クリック判定の許容範囲（半径5km）

          // --------------------------------------------------
          // 1. 周辺の「魚種データ（スコア）」を探す
          // --------------------------------------------------
          let targetFishPoint = null;
          let minFishDistKm = Number.MAX_VALUE;
          const currentFishLayers = activeFishLayersRef.current || [];

          if (currentFishLayers.length > 0 && fishPointsRef.current) {
            const allFishPoints = fishPointsRef.current;
            const selectedFishIds = Array.from(new Set(currentFishLayers.map(getFishIdByName)));
            
            const targetFishPoints = allFishPoints.filter((p: any) => {
              const currentFishId = Number(p?.fish_id ?? p?.fishId ?? 0);
              return selectedFishIds.length === 0 || selectedFishIds.includes(currentFishId);
            });

            for (const p of targetFishPoints) {
              const pLat = Number((p as any).latitude ?? (p as any).lat ?? 0);
              const pLng = Number((p as any).longitude ?? (p as any).lng ?? 0);
              const distKm = getDistanceKm(pLat, pLng, clickLat, clickLng);
              if (distKm < minFishDistKm) {
                minFishDistKm = distKm;
                targetFishPoint = p;
              }
            }
          }

          // --------------------------------------------------
          // 2. 周辺の「海況データ（水温・クロロフィル）」を探す
          // --------------------------------------------------
          let targetMarinePoint = null;
          let minMarineDistKm = Number.MAX_VALUE;
          const currentMarineLayers = activeMarineLayersRef.current || [];
          const isChlActive = currentMarineLayers.includes('chl');
          const isSstActive = currentMarineLayers.includes('sst');

          if ((isChlActive || isSstActive) && oceanPointsRef.current) {
            const targetDate = selectedFullDateRef.current;
            const targetYear = targetDate.getFullYear();
            const targetMonth = targetDate.getMonth();
            const targetDateNum = targetDate.getDate();

            const todayPoints = oceanPointsRef.current.filter((p) => {
              if (!p.record_timestamp) return false;
              const pDate = new Date(p.record_timestamp.replace(' ', 'T'));
              const isTargetDate = pDate.getFullYear() === targetYear && pDate.getMonth() === targetMonth && pDate.getDate() === targetDateNum;
              if (!isTargetDate) return false;

              if (isChlActive) {
                const rawChl = (p as any).chl ?? (p as any).cha;
                return rawChl !== null && rawChl !== undefined;
              } else {
                return p.sst !== null && p.sst !== undefined;
              }
            });

            for (const p of todayPoints) {
              const distKm = getDistanceKm(p.latitude, p.longitude, clickLat, clickLng);
              if (distKm < minMarineDistKm) {
                minMarineDistKm = distKm;
                targetMarinePoint = p;
              }
            }
          }

          // --------------------------------------------------
          // 3. 吹き出しの分岐表示（魚種：紫枠 / 海況：青枠）
          // --------------------------------------------------
          const hasValidFish = targetFishPoint && minFishDistKm <= CLICK_TOLERANCE_KM;
          const hasValidMarine = targetMarinePoint && minMarineDistKm <= CLICK_TOLERANCE_KM;

          // 【パターンA】魚種データが有効で、海況データより近い（または海況データがない）場合
          if (hasValidFish && (!hasValidMarine || minFishDistKm <= minMarineDistKm)) {
            const rawVal = Number((targetFishPoint as any).heatmap_value ?? (targetFishPoint as any).value ?? (targetFishPoint as any).score ?? 0);
            const scoreText = rawVal.toFixed(2);
            const fLat = Number((targetFishPoint as any).latitude ?? (targetFishPoint as any).lat ?? 0);
            const fLng = Number((targetFishPoint as any).longitude ?? (targetFishPoint as any).lng ?? 0);

            infoWindowRef.current?.setContent(`
              <div style="min-width: 230px; padding: 16px; color: #222; font-family: sans-serif; line-height: 1.6; border: 3px solid #8e24aa; border-radius: 12px; background-color: #fff; box-sizing: border-box;">
                <div style="font-size: 20px; font-weight: bold; color: #8e24aa; margin-bottom: 8px; border-bottom: 2px solid #8e24aa; padding-bottom: 4px;">魚種予測スコア</div>
                <div style="font-size: 18px; color: #222; font-weight: bold; margin-top: 8px;">スコア: <span style="font-size: 24px; color: #8e24aa;">${scoreText}</span></div>
                <div style="font-size: 14px; color: #666; margin-top: 8px; font-weight: 500;">Lat: ${fLat.toFixed(4)}, Lng: ${fLng.toFixed(4)}</div>
              </div>
            `);
            infoWindowRef.current?.setPosition({ lat: fLat, lng: fLng });
            infoWindowRef.current?.open(map);
            return;
          }

          // 【パターンB】海況データ（水温・クロロフィル）がヒットした場合
          if (hasValidMarine) {
            const timeStr = new Date(targetMarinePoint.record_timestamp.replace(' ', 'T')).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

            let displayDataHTML = '';
            if (isChlActive) {
              const rawChl = (targetMarinePoint as any).chl ?? (targetMarinePoint as any).cha;
              const chlVal = rawChl !== null && rawChl !== undefined ? Number(rawChl).toFixed(1) : '--';
              displayDataHTML = `<div style="font-size: 18px; color: #222; font-weight: bold; margin-top: 8px;">クロロフィルa濃度<br/><span style="font-size: 24px; color: #0044cc;">${chlVal} mg/m³</span></div>`;
            } else {
              const sstVal = targetMarinePoint.sst !== null && targetMarinePoint.sst !== undefined ? targetMarinePoint.sst.toFixed(1) : '--';
              displayDataHTML = `<div style="font-size: 18px; color: #222; font-weight: bold; margin-top: 8px;">水温: <span style="font-size: 24px; color: #0044cc;">${sstVal} ℃</span></div>`;
            }

            infoWindowRef.current?.setContent(`
              <div style="min-width: 250px; padding: 16px; color: #222; font-family: sans-serif; line-height: 1.6; border: 3px solid #0044cc; border-radius: 12px; background-color: #fff; box-sizing: border-box;">
                <div style="font-size: 22px; font-weight: bold; color: #0044cc; margin-bottom: 8px; border-bottom: 2px solid #0044cc; padding-bottom: 4px;">観測ポイント詳細</div>
                ${displayDataHTML}
                <div style="font-size: 20px; color: #222; font-weight: bold; margin-top: 8px;">取得時間: <span style="font-size: 22px;">${timeStr}</span></div>
                <div style="font-size: 18px; color: #444; margin-top: 8px; font-weight: 500;">Lat: ${targetMarinePoint.latitude.toFixed(4)}, Lng: ${targetMarinePoint.longitude.toFixed(4)}</div>
              </div>
            `);
            infoWindowRef.current?.setPosition({ lat: targetMarinePoint.latitude, lng: targetMarinePoint.longitude });
            infoWindowRef.current?.open(map);
          }
        });
        // ▲▲▲ 吹き出し制御ここまで ▲▲▲

        setMapReady(true);
      } catch (err) {
        setMapLoadError("地図の初期化に失敗しました。");
      }
    }

    return () => { cancelled = true; };
  }, []);

  // ==========================================
  // 10.5. 現在地の継続監視とマーカー表示
  // ==========================================
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || typeof window === 'undefined' || !window.google) return;
    const map = mapInstanceRef.current;
    const google = window.google as any;

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
          setCurrentPosition(pos);

          if (!currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current = new google.maps.Marker({
              position: pos,
              map: map,
              title: '現在地',
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#0044cc',
                fillOpacity: 1.0,
                strokeColor: 'white',
                strokeWeight: 3,
                scale: 6
              },
            });
          } else {
            currentLocationMarkerRef.current.setPosition(pos);
          }
        },
        (error) => { console.error("GPS Watch Error:", error); },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
      return () => { navigator.geolocation.clearWatch(watchId); };
    }
  }, [mapReady]);

  useEffect(() => {
    updateMapLayers();
  }, [updateMapLayers]);

  // ==========================================
  // 10.6. ピンマーカー (eDNA観測 / 予測地点) 描画
  // ==========================================
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    ednaMarkersRef.current.forEach(m => m.setMap(null));
    ednaMarkersRef.current = [];
    ednaPinPoints.forEach((p) => {
      const marker = new window.google.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map: map,
        title: 'eDNA 観測',
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#8e24aa',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: 'white'
        }
      });
      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          const valDisplay = p.value ?? p.dna_copies ?? 'N/A';
          const lat = Number(p.latitude);
          const lng = Number(p.longitude);
          infoWindowRef.current.setContent(`
            <div style="min-width: 250px; padding: 16px; color: #222; font-family: sans-serif; line-height: 1.6; border: 3px solid #8e24aa; border-radius: 12px; background-color: #fff; box-sizing: border-box;">
              <div style="font-size: 20px; font-weight: bold; color: #8e24aa; margin-bottom: 8px; border-bottom: 2px solid #8e24aa; padding-bottom: 4px;">eDNA 観測</div>
              <div style="font-size: 18px; color: #222; font-weight: bold; margin-top: 8px;">数値: <span style="font-size: 24px; color: #8e24aa;">${valDisplay}</span></div>
              <div style="font-size: 14px; color: #666; margin-top: 8px; font-weight: 500;">Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}</div>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        }
      });
      ednaMarkersRef.current.push(marker);
    });
  }, [ednaPinPoints, mapReady]);

  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;

    hotpointMarkersRef.current.forEach(m => m.setMap(null));
    hotpointMarkersRef.current = [];
    hotpoints.forEach(hp => {
      const marker = new window.google.maps.Marker({
        position: { lat: hp.latitude, lng: hp.longitude },
        map: map,
        title: '予測ポイント詳細'
      });
      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          const displayScore = hp.intensity_score || hp.score || 'N/A';
          const scoreText = typeof displayScore === 'number' ? displayScore.toFixed(2) : displayScore;
          infoWindowRef.current.setContent(`
            <div style="min-width: 250px; padding: 16px; color: #222; font-family: sans-serif; line-height: 1.6; border: 3px solid #8e24aa; border-radius: 12px; background-color: #fff; box-sizing: border-box;">
              <div style="font-size: 20px; font-weight: bold; color: #8e24aa; margin-bottom: 8px; border-bottom: 2px solid #8e24aa; padding-bottom: 4px;">魚種予測スコア</div>
              <div style="font-size: 18px; color: #222; font-weight: bold; margin-top: 8px;">スコア: <span style="font-size: 24px; color: #8e24aa;">${scoreText}</span></div>
              <div style="font-size: 14px; color: #666; margin-top: 8px; font-weight: 500;">Lat: ${hp.latitude.toFixed(4)}, Lng: ${hp.longitude.toFixed(4)}</div>
            </div>
          `);
          infoWindowRef.current.open(map, marker);
        }
      });
      hotpointMarkersRef.current.push(marker);
    });
  }, [hotpoints, mapReady]);

  // ==========================================
  // 11. カレンダー ＆ マップコントロール処理
  // ==========================================
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const calendarCells: (number | null)[] = [];
  
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }
  while (calendarCells.length < 42) {
    calendarCells.push(null);
  }

  const getCalendarDayStatus = (dateNum: number | null) => {
    if (!dateNum) return { isToday: false, isSelected: false, hasData: false };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const d = new Date(calYear, calMonth, dateNum);
    
    const isToday = d.getTime() === today.getTime();
    const isSelected =
      d.getFullYear() === selectedFullDate.getFullYear() &&
      d.getMonth() === selectedFullDate.getMonth() &&
      d.getDate() === selectedFullDate.getDate();

    const diffTime = d.getTime() - today.getTime();
    const diffDays = diffTime / (1000 * 3600 * 24);
    const hasData = diffDays >= 0 && diffDays <= 6;

    return { isToday, isSelected, hasData };
  };

  const handleZoom = (amount: number) => {
    if (mapInstanceRef.current) {
      const currentZoom = mapInstanceRef.current.getZoom();
      mapInstanceRef.current.setZoom(currentZoom + amount);
    }
  };

  const handleJumpToCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = { lat: position.coords.latitude, lng: position.coords.longitude };
          if (mapInstanceRef.current && mapInstanceRef.current.panTo) {
            mapInstanceRef.current.panTo(pos);
            mapInstanceRef.current.setZoom(14);
          }
        },
        () => { alert('位置情報の取得に失敗しました。'); }
      );
    } else {
      alert('ブラウザが位置情報に対応していません。');
    }
  };

  if (!isMounted) return null;

  // ==========================================
  // 12. 画面UI描画 (JSX)
  // ==========================================
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"/>
      <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', fontSize: '28px' }}>
        
        {/* 地図キャンバス */}
        <div id="map" ref={mapRef} style={{ height: '100vh', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />
        
        <div className="ui-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
          
          {/* ヘッダーロゴ */}
          <div style={{ position: 'absolute', top: '25px', left: '50%', transform: 'translateX(-50%)', zIndex: 20, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/site-logo.png" alt="サイトロゴ" 
              style={{ height: '70px', width: 'auto', filter: `drop-shadow(2px 0 0 #ffffff) drop-shadow(-2px 0 0 #ffffff) drop-shadow(0 2px 0 #ffffff) drop-shadow(0 -2px 0 #ffffff) drop-shadow(0 3px 6px rgba(0, 30, 60, 0.5))` }} 
            />
          </div>

          {/* 右上アカウント・メニュー操作 */}
          <TopRightMenu 
            isLoggedIn={isLoggedIn} loggedInEmail={loggedInEmail} userName={userName} 
            setShowWindyMenu={setShowWindyMenu} setIsSignUp={setIsSignUp} setShowLoginModal={setShowLoginModal} 
          />
          
          {/* 右側レイヤー選択サイドバー */}
          <RightSidebar 
            showMarinePanel={showMarinePanel} setShowMarinePanel={setShowMarinePanel} 
            showFishPanel={showFishPanel} setShowFishPanel={setShowFishPanel} 
            activeMarineLayers={activeMarineLayers} setActiveMarineLayers={handleMarineLayersUpdate} 
            activeFishLayers={activeFishLayers} setActiveFishLayers={handleFishLayersUpdate} 
            isLoggedIn={isLoggedIn} setShowLoginModal={setShowLoginModal}
          />
          
          {/* 下部タイムライン・プログレスバー */}
          <TimelineBar 
            timelineDays={timelineDays} currentProgress={currentProgress} setCurrentProgress={setCurrentProgress} 
            isPlaying={isPlaying} setIsPlaying={setIsPlaying} showMiniCalendar={showMiniCalendar} setShowMiniCalendar={setShowMiniCalendar} 
            calYear={calYear} setCalYear={setCalYear} calMonth={calMonth} setCalMonth={setCalMonth}
            calendarCells={calendarCells} getCalendarDayStatus={getCalendarDayStatus} setBaseDate={setBaseDate} formattedSelectedDate={formattedSelectedDate}
          />

          {/* 右下マップ操作ボタン */}
          <MapControls handleZoom={handleZoom} handleJumpToCurrentLocation={handleJumpToCurrentLocation} />

        </div>
        
        {/* ログイン・新規登録モーダル */}
        {showLoginModal && (
          <LoginModal
            setShowLoginModal={setShowLoginModal} isSignUp={isSignUp} setIsSignUp={setIsSignUp}
            email={email} setEmail={setEmail} password={password} setPassword={setPassword}
            handleRegisterSubmit={handleRegisterSubmit} handleEmailLogin={handleEmailLogin}
          />
        )}

        {/* マイページ・テーマ設定メニュー */}
        <WindyMenu
          showWindyMenu={showWindyMenu} setShowWindyMenu={setShowWindyMenu} isLoggedIn={isLoggedIn} loggedInEmail={loggedInEmail}
          handleLogout={handleLogout} handleDeleteAccount={handleDeleteAccount} setIsSignUp={setIsSignUp} setShowLoginModal={setShowLoginModal}
          marineTheme={marineTheme} setMarineTheme={setMarineTheme}
          fishTheme={fishTheme} setFishTheme={setFishTheme}
          userName={userName} 
          targetFish={targetFish} 
          handleUpdateProfile={handleUpdateProfile}
        />

        {/* 右下 凡例表示 (海況・魚種) */}
        <div style={{ position: 'absolute', bottom: '150px', right: '30px', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 10, pointerEvents: 'none' }}>
          
          {/* 1. 海況の凡例 (水温) */}
          {(activeMarineLayers.includes('sst')) && (
            <div className="legend-box" style={{ background: 'rgba(255,255,255,0.95)', padding: '16px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '24px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
              <span style={{ fontWeight: 'bold', width: '60px', textAlign: 'right', fontSize: '18px' }}>低温</span>
              <div className="slider-bar" style={{ width: '260px', height: '24px', background: legendGradientStyle, borderRadius: '12px' }}></div>
              <span style={{ fontWeight: 'bold', width: '60px', fontSize: '18px' }}>高温</span>
            </div>
          )}

          {/* 2. 海況の凡例 (クロロフィル) */}
          {(activeMarineLayers.includes('chl')) && (
            <div className="legend-box" style={{ background: 'rgba(255,255,255,0.95)', padding: '16px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '24px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
              <span style={{ fontWeight: 'bold', width: '60px', textAlign: 'right', fontSize: '18px' }}>低濃度</span>
              <div className="slider-bar" style={{ width: '260px', height: '24px', background: chlLegendGradientStyle, borderRadius: '12px' }}></div>
              <span style={{ fontWeight: 'bold', width: '60px', fontSize: '18px' }}>高濃度</span>
            </div>
          )}
          
          {/* 3. 魚種の凡例 */}
          {activeFishLayers.length > 0 && (
            <div className="legend-box" style={{ background: 'rgba(255,255,255,0.95)', padding: '16px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '24px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
              <span style={{ fontWeight: 'bold', width: '60px', textAlign: 'right', fontSize: '18px' }}>低濃度</span>
              <div className="slider-bar" style={{ width: '260px', height: '24px', background: fishLegendGradientStyle, borderRadius: '12px' }}></div>
              <span style={{ fontWeight: 'bold', width: '60px', fontSize: '18px' }}>高濃度</span>
            </div>
          )}
        </div>

        {/* 左上データ取得ステータス表示 */}
        {(oceanLoading || oceanError) && (
          <div style={{ position: 'absolute', top: '30px', left: '30px', background: oceanError ? '#c62828' : '#555', color: 'white', padding: '16px 28px', borderRadius: '30px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: oceanError ? 'auto' : 'none', display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '80vw' }}>
            {oceanLoading && !oceanError && ( <> <span className="material-symbols-outlined" style={{ animation: 'spin 1.5s linear infinite', fontSize: '28px' }}>sync</span> <span>データ準備中...</span> </> )}
            {oceanError && (
              <>
                <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>error</span> <span>{oceanError}</span>
                <button onClick={() => setOceanRetryKey(k => k + 1)} style={{ marginLeft: '12px', padding: '8px 16px', background: 'white', color: '#c62828', border: 'none', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', fontSize: '20px' }}> 再試行 </button>
              </>
            )}
          </div>
        )}

      </div>
    </>
  );
}