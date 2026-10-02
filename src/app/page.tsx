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
  id: number;
  fish_id: number;
  latitude: number;
  longitude: number;
  target_timestamp: string;
  heatmap_value: number;
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

export default function HeatmapPage() {
  // ==========================================
  // 3. Google Maps オブジェクト参照 (Ref)
  // ==========================================
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const heatmapLayerRef = useRef<GoogleHeatmapLayerInstance | null>(null);
  const currentLocationMarkerRef = useRef<GoogleMarkerInstance | null>(null);
  const fishPointsRef = useRef<FishPredictionPoint[]>([]);
  const fishHeatmapLayerRef = useRef<GoogleHeatmapLayerInstance | null>(null);
  const infoWindowRef = useRef<GoogleInfoWindowInstance | null>(null);
  const hotpointMarkersRef = useRef<GoogleMarkerInstance[]>([]);
  const arrowMarkersRef = useRef<any[]>([]);
  const oceanPointsRef = useRef<OceanDataPoint[]>([]);

  // ==========================================
  // 4. アプリケーション状態管理 (State)
  // ==========================================
  const initDate = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, []);

  // UI・タイムライン状態
  const [baseDate, setBaseDate] = useState<Date>(initDate);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState<boolean>(false);
  const [calYear, setCalYear] = useState<number>(initDate.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(initDate.getMonth());
  const [isMounted, setIsMounted] = useState(false);

  // レイヤー・テーマ選択状態
  const [showMarinePanel, setShowMarinePanel] = useState<boolean>(true);
  const [showFishPanel, setShowFishPanel] = useState<boolean>(true);
  const [activeMarineLayers, setActiveMarineLayers] = useState<string[]>(['sst', 'current']);
  const [activeFishLayers, setActiveFishLayers] = useState<string[]>([]);
  const [marineTheme, setMarineTheme] = useState<string>('default');
  const [fishTheme, setFishTheme] = useState<string>('default');

  // ユーザー認証・モーダル状態
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showWindyMenu, setShowWindyMenu] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('名無しアングラー');
  const [targetFish, setTargetFish] = useState<string>('');

  // データ取得・マップ読み込み状態
  const [oceanLoading, setOceanLoading] = useState<boolean>(true);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const [oceanDataVersion, setOceanDataVersion] = useState<number>(0);
  const [oceanPointCount, setOceanPointCount] = useState<number>(0);
  const [hotpoints, setHotpoints] = useState<Hotpoint[]>([]);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);
  const [oceanRetryKey, setOceanRetryKey] = useState<number>(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 水温とクロロフィルを切り替え式にするフィルター
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

  // 選択中の日付保持
  const selectedFullDate = useMemo(() => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + currentProgress);
    return d;
  }, [baseDate, currentProgress]);

  const selectedFullDateRef = useRef(selectedFullDate);
  useEffect(() => {
    selectedFullDateRef.current = selectedFullDate;
  }, [selectedFullDate]);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://27.133.132.208:8000';
  const AUTH_STORAGE_KEY = 'umikke_auth';

  // ==========================================
  // 5. 凡例カラーバーのスタイル定義
  // ==========================================
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
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ 
        ...existingAuth,
        token, 
        email: loggedEmail 
      }));
      setIsLoggedIn(true); setLoggedInEmail(loggedEmail); setShowLoginModal(false); setShowWindyMenu(true); setPassword('');
    } catch (err) {
      console.error(err); alert('ログイン処理中にエラーが発生しました。');
    }
  };

  const handleRegisterSubmit = async () => {
    if (!email || !password) { alert('登録するメールアドレスとパスワードを入力してください。'); return; }
    if (password.length < 6) { alert('パスワードは6文字以上で設定してください。'); return; }
    try {
      const res = await fetch(`${API_BASE_URL}/users/register`, { // ← /register に変更
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
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ 
          ...existingAuth,
          token, 
          email: registeredEmail 
        }));
        
        setIsLoggedIn(true); setLoggedInEmail(registeredEmail); setShowLoginModal(false); setShowWindyMenu(true);
      } else {
        alert('アカウント登録が完了しました！ログインしてください。'); setIsSignUp(false);
      }
      setPassword('');
    } catch (err) {
      console.error(err); alert('登録処理中にエラーが発生しました。');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsLoggedIn(false); setLoggedInEmail(null); setShowWindyMenu(false);
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
      alert('アカウントを削除しました。'); handleLogout();
    } catch (err) {
      console.error(err); alert('削除処理中にエラーが発生しました。');
    }
  };

  // プロフィールの保存とレイヤー切り替え処理
  const handleUpdateProfile = (newName: string, newTarget: string) => {
    setUserName(newName);
    setTargetFish(newTarget);

    // ターゲット魚種が変更されたら、地図のレイヤーもそれに切り替える
    if (newTarget) {
      setActiveFishLayers([newTarget]);
    }

    // ローカルストレージ内のデータを上書き保存
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
    queueMicrotask(() => {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const auth = JSON.parse(stored);
          if (auth?.email) { 
            setIsLoggedIn(true); 
            setLoggedInEmail(auth.email); 
            
            // プロフィール情報があればStateに復元
            if (auth.name) setUserName(auth.name);
            if (auth.targetFish) {
              setTargetFish(auth.targetFish);
              // 初期表示レイヤーをターゲット魚種に自動切り替え
              setActiveFishLayers([auth.targetFish]); 
            }
          }
        } catch {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    });
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

    // 海況ヒートマップ (水温・クロロフィル)
    if (heatmapLayerRef.current) {
      const hasSst = activeMarineLayers.includes('sst');
      const hasChl = activeMarineLayers.includes('chl');

      if ((hasSst || hasChl) && todayPoints.length > 0) {
        // ----------------------------------------------------
        // 1. 本日データの最小値 (min) ・ 最大値 (max) を抽出
        // ----------------------------------------------------
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

        // ----------------------------------------------------
        // 2. 最小〜最大の中で 0〜100 に動的スケール変換 (weight計算)
        // ----------------------------------------------------
        const heatPoints = todayPoints.map((p) => {
          let normalizedSst = 0;
          let normalizedChl = 0;

          if (hasSst && p.sst !== null && p.sst !== undefined) {
            const val = Number(p.sst);
            // 範囲差がある場合は 0〜100 に換算（範囲がない場合は中央値50）
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

        // ----------------------------------------------------
        // 3. テーマごとのグラデーション定義
        // ----------------------------------------------------
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
        
        // ----------------------------------------------------
        // 4. 表示オプション設定
        // ----------------------------------------------------
        heatmapLayerRef.current.setOptions({ 
          maxIntensity: 100, // 0〜100に規格化しているため100固定で常にフルスケール表示
          radius: 45,        // 点同士が太く綺麗につながるサイズ
          gradient: gradient
        });
      } else {
        heatmapLayerRef.current.setData([]);
      }
    }

    // 流向・流速ベクトル (矢印)
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

    // 魚種分布 (eDNA予測) ヒートマップ
    if (fishHeatmapLayerRef.current) {
      if (activeFishLayers.length > 0) {
        const allFishPoints = fishPointsRef.current;
        const selectedFishIds: number[] = Array.from(
          new Set(activeFishLayers.map((fishName) => getFishIdByName(fishName)))
        );

        const targetFishPoints = allFishPoints.filter((p: any) => {
          const currentFishId = Number(p?.fish_id ?? p?.fishId ?? 0);
          return selectedFishIds.includes(currentFishId);
          
          // 【修正点1】
          // 以下の日付フィルターを一旦コメントアウト（または削除）して、
          // 取得できたデータを日付関係なく全て強制的に表示させます。
          /*
          const timeString = p?.target_timestamp || p?.sample_timestamp || p?.record_timestamp;
          if (!timeString) return true;
          const safeTimeStr = timeString.replace(' ', 'T');
          const pDate = new Date(safeTimeStr);
          return (
            pDate.getFullYear() === targetYear &&
            pDate.getMonth() === targetMonth &&
            pDate.getDate() === targetDateNum
          );
          */
        });

        // 1. その日のデータから最小値と最大値を取得してレンジを計算
        const fishValues = targetFishPoints
          .map((p: any) => Number(p?.heatmap_value ?? p?.value ?? p?.count ?? 0))
          .filter((v: number) => !isNaN(v) && v > 0);

        const minFishVal = fishValues.length > 0 ? Math.min(...fishValues) : 0;
        const maxFishVal = fishValues.length > 0 ? Math.max(...fishValues) : 1;
        const fishValRange = maxFishVal - minFishVal;

        const fishHeatData = targetFishPoints.map((p: any) => {
          const rawVal = Number(p?.heatmap_value ?? p?.value ?? p?.count ?? 0);
          const lat = Number(p?.latitude ?? p?.lat ?? 0);
          const lng = Number(p?.longitude ?? p?.lng ?? 0);

          // 最小値が0になって透明化してしまうのを防ぎます
          const normalizedWeight = fishValRange > 0 
            ? ((rawVal - minFishVal) / fishValRange) * 80 + 20 
            : 50;

          return {
            location: new window.google.maps.LatLng(lat, lng),
            weight: normalizedWeight,
          };
        });


        let fishGradient: string[];
        if (fishTheme === 'rainbow') {
          fishGradient = ['rgba(0,0,255,0)', 'blue', 'cyan', 'lime', 'yellow', 'red'];
        } else if (fishTheme === 'colorblind') {
          fishGradient = ['rgba(230,159,0,0)', '#E69F00', '#56B4E9', '#009E73', '#F0E442'];
        } else {
          fishGradient = ['rgba(142, 36, 170, 0)', 'rgba(142, 36, 170, 1)', 'rgba(255, 152, 0, 1)', 'rgba(255, 235, 59, 1)'];
        }

        fishHeatmapLayerRef.current.setData(fishHeatData);
        fishHeatmapLayerRef.current.setOptions({
          gradient: fishGradient,
          radius: 25, 
          maxIntensity: 100, 
        });
      } else {
        fishHeatmapLayerRef.current.setData([]);
      }
    }
  }, [selectedFullDate, activeMarineLayers, activeFishLayers, marineTheme, fishTheme]);


  useEffect(() => {
    if (!mapReady) return;
    updateMapLayers();
  }, [mapReady, oceanDataVersion, updateMapLayers]);

  // ==========================================
  // 9. バックエンドAPI通信 (海況 / eDNA)
  // ==========================================
  
  // 海上状況データ（OceanData）を取得
  useEffect(() => {
    // 🟢 起動時ログ
    console.log("🟢 海上状況(Ocean)API取得のuseEffectが起動しました", { selectedFullDate, oceanRetryKey });

    let cancelled = false;
    async function fetchOceanData() {
      try {
        const year = selectedFullDate.getFullYear();
        const month = String(selectedFullDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedFullDate.getDate()).padStart(2, '0');
        
        const start = `${year}-${month}-${day}T00:00:00`;
        const end = `${year}-${month}-${day}T23:59:59`;

        const url = `${API_BASE_URL}/ocean/range/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;
        
        // 🔵 リクエスト前ログ
        console.log(`🔵 APIにリクエストを送ります(海上状況): 期間=${start} ~ ${end}`);
        console.log(`➡️ fetch実行: ${url}`);

        const res = await fetch(url);
        if (!res.ok) throw new Error(`データ取得に失敗しました (status: ${res.status})`);
        
        const data: OceanDataPoint[] = await res.json();
        if (cancelled) return;
        
        oceanPointsRef.current = data;
        setOceanPointCount(data.length);
        setOceanDataVersion((v) => v + 1);

        // ✅ 成功ログ
        console.log(`✅ バックエンドから海上状況データ取得成功！: ${data.length}件のデータを取得しました`, data);

      } catch (err) {
        // ❌ エラーログ
        console.error('❌ 海上状況データの取得に失敗しました:', err);
        
        if (!cancelled) {
          const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
          setOceanError(message);
        }
      } finally {
        if (!cancelled) setOceanLoading(false);
      }
    }

    setOceanLoading(true);
    setOceanError(null);
    fetchOceanData();

    return () => { cancelled = true; };
  }, [oceanRetryKey, API_BASE_URL, selectedFullDate]);
  

  // 魚種(eDNA)データ取得 (1, 2, 3 の個別IDでリクエスト)
  useEffect(() => {
    console.log("🟢 魚種API取得のuseEffectが起動しました", { activeFishLayers, selectedFullDate });

    async function fetchFishData() {
      if (activeFishLayers.length === 0) {
        console.log("🟡 魚種が選択されていないため、データ取得をスキップします");
        fishPointsRef.current = [];
        setOceanDataVersion((v) => v + 1);
        return;
      }

      // 選択された魚種からそれぞれの正確な固有ID（重複除去）を取得
      const fishIds: number[] = Array.from(
        new Set(activeFishLayers.map((name) => getFishIdByName(name)))
      );

      const year = selectedFullDate.getFullYear();
      const month = String(selectedFullDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedFullDate.getDate()).padStart(2, '0');
      const targetDateStr = `${year}-${month}-${day}`;

      console.log(`🔵 APIにリクエストを送ります: 魚種IDs=[${fishIds.join(', ')}], 日付=${targetDateStr}`);

      try {
        const requests = fishIds.map((id) => {
          const url = `${API_BASE_URL}/fish/${id}/edna?date=${targetDateStr}`;
          console.log(`➡️ fetch実行: ${url}`);
          return fetch(url).then((res) => {
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return res.json();
          });
        });

        const results = await Promise.all(requests);
        fishPointsRef.current = results.flat();
        console.log("✅ バックエンドからデータ取得成功！:", fishPointsRef.current);
        setOceanDataVersion((v) => v + 1);
      } catch (err) {
        console.error('❌ eDNAデータの取得に失敗しました:', err);
      }
    }

    fetchFishData();
  }, [API_BASE_URL, activeFishLayers, selectedFullDate]);

  // ==========================================
  // 10. Google Maps 初期化 ＆ イベント設定
  // ==========================================
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
    if (!apiKey) {
      queueMicrotask(() => { setMapLoadError('Google Maps APIキーが設定されていません。'); });
      return;
    }

    let cancelled = false;
    const scriptId = 'google-maps-script';
    const script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      const newScript = document.createElement('script');
      newScript.id = scriptId;
      newScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3.64&libraries=visualization`;
      newScript.async = true; newScript.defer = true;
      newScript.onload = () => { if (!cancelled) initMap(); };
      newScript.onerror = () => { if (!cancelled) setMapLoadError('スクリプト読み込みに失敗しました。'); };
      document.head.appendChild(newScript);
    } else if (typeof window !== 'undefined' && window.google) {
      queueMicrotask(() => { if (!cancelled) initMap(); });
    } else {
      script.onload = () => { if (!cancelled) initMap(); };
    }

    function initMap() {
      if (!mapRef.current) return;
      if (typeof window === 'undefined' || !window.google || !window.google.maps) return;
      
      const google = window.google;
      const map = new google.maps.Map(mapRef.current, {
        center: { lat: 34.420, lng: 136.880 }, zoom: 11, mapTypeId: 'roadmap',
        styles: [
          { elementType: 'labels', stylers: [{ visibility: 'off' }] },
          { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
          { featureType: 'road', stylers: [{ visibility: 'off' }] }
        ], disableDefaultUI: true,
      });
      mapInstanceRef.current = map;

      const customGradient = [ 'rgba(0, 0, 0, 0)', 'rgba(0, 0, 255, 1.0)', 'rgba(0, 255, 255, 1.0)', 'rgba(0, 255, 0, 1.0)', 'rgba(255, 255, 0, 1.0)', 'rgba(255, 165, 0, 1.0)', 'rgba(255, 0, 0, 1.0)' ];
      heatmapLayerRef.current = new google.maps.visualization.HeatmapLayer({
        data: [], map: map, gradient: customGradient, radius: 20, opacity: 0.85
      });

      fishHeatmapLayerRef.current = new google.maps.visualization.HeatmapLayer({
        data: [], map: map, radius: 25, opacity: 0.85
      });
      
      infoWindowRef.current = new google.maps.InfoWindow({ maxWidth: 450 });

      map.addListener('click', (e: any) => {
        const clickLat = e.latLng.lat();
        const clickLng = e.latLng.lng();
        
        const targetDate = selectedFullDateRef.current;
        const targetYear = targetDate.getFullYear();
        const targetMonth = targetDate.getMonth();
        const targetDateNum = targetDate.getDate();

        const todayPoints = oceanPointsRef.current.filter((p) => {
          if (p.sst === null || p.sst === undefined) return false;
          const pDate = new Date(p.record_timestamp);
          return (pDate.getFullYear() === targetYear && pDate.getMonth() === targetMonth && pDate.getDate() === targetDateNum);
        });

        if (todayPoints.length === 0) return;

        let nearestPoint = todayPoints[0];
        let minDistance = Number.MAX_VALUE;
        for (const p of todayPoints) {
          const dist = Math.pow(p.latitude - clickLat, 2) + Math.pow(p.longitude - clickLng, 2);
          if (dist < minDistance) {
            minDistance = dist;
            nearestPoint = p;
          }
        }

        if (minDistance > 0.05) return;

        const timeStr = new Date(nearestPoint.record_timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
        
        infoWindowRef.current?.setContent(`
          <div style="padding: 12px; color: #333; font-size: 16px;">
            <strong style="font-size: 18px; color: #0044cc;">観測ポイント詳細</strong><br/>
            水温: <b>${nearestPoint.sst?.toFixed(1)} ℃</b><br/>
            取得時間: ${timeStr}<br/>
            <span style="font-size: 12px; color: #666;">Lat: ${nearestPoint.latitude.toFixed(4)}, Lng: ${nearestPoint.longitude.toFixed(4)}</span>
          </div>
        `);
        infoWindowRef.current?.setPosition({ lat: nearestPoint.latitude, lng: nearestPoint.longitude });
        infoWindowRef.current?.open(map);
      });

      setMapReady(true);
    }
    return () => { cancelled = true; };
  }, []);

  // 漁場サジェストマーカー描画
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.google) return;
    const map = mapInstanceRef.current;
    const google = window.google;

    hotpointMarkersRef.current.forEach(m => m.setMap(null));
    hotpointMarkersRef.current = [];

    hotpoints.forEach(hp => {
      const marker = new google.maps.Marker({
        position: { lat: hp.latitude, lng: hp.longitude },
        map: map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#e65100',
          fillOpacity: 0.8,
          strokeColor: 'white',
          strokeWeight: 2,
          scale: 9
        },
        title: '漁場サジェスト'
      });

      marker.addListener('click', () => {
        if (infoWindowRef.current) {
          const displayScore = hp.intensity_score || hp.score || 'N/A';
          infoWindowRef.current.setContent(`
            <div style="padding: 12px; color: #333; font-size: 16px;">
              <strong style="font-size: 18px; color: #e65100;">漁場サジェストポイント (環境予測ベース)</strong><br/>
              <span style="font-size: 14px; color: #666;">※水温と潮目の環境データから算出</span><br/><br/>
              スコア: <b>${typeof displayScore === 'number' ? displayScore.toFixed(2) : displayScore}</b><br/>
              ${hp.suggestion ? `提案: ${hp.suggestion}` : ''}
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
  for (let i = 0; i < firstDayIndex; i++) { calendarCells.push(null); }
  for (let i = 1; i <= daysInMonth; i++) { calendarCells.push(i); }

  while (calendarCells.length < 42) {
    calendarCells.push(null);
  }

  const getCalendarDayStatus = (dateNum: number | null) => {
    if (!dateNum) return { isToday: false, isSelected: false };
    const today = new Date(); const cellDate = new Date(calYear, calMonth, dateNum);
    const isToday = cellDate.getDate() === today.getDate() && cellDate.getMonth() === today.getMonth() && cellDate.getFullYear() === today.getFullYear();
    const isSelected = cellDate.getDate() === baseDate.getDate() && cellDate.getMonth() === baseDate.getMonth() && cellDate.getFullYear() === baseDate.getFullYear();
    return { isToday, isSelected };
  };

  const handleZoom = (amount: number) => {
    if (!mapInstanceRef.current) return;
    const currentZoom = mapInstanceRef.current.getZoom(); mapInstanceRef.current.setZoom(currentZoom + amount);
  };

  const handleJumpToCurrentLocation = () => {
    if (!mapInstanceRef.current || typeof window === 'undefined' || !window.google) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const google = window.google;
          const currentLatLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
          mapInstanceRef.current?.setCenter(currentLatLng);

          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setPosition(currentLatLng);
          } else {
            currentLocationMarkerRef.current = new google.maps.Marker({
              position: currentLatLng,
              map: mapInstanceRef.current,
              title: '現在地',
              icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#0044cc', fillOpacity: 1.0, strokeColor: 'white', strokeWeight: 3, scale: 4 },
            });
          }
        },
        () => { alert('位置情報の取得に失敗しました。'); }
      );
    } else { alert('ブラウザが位置情報に対応していません。'); }
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

        {/* メインUIオーバーレイ */}
        <div className="ui-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>

          {/* ヘッダーロゴ */}
          <div style={{
            position: 'absolute',
            top: '25px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img 
              src="/site-logo.png" 
              alt="サイトロゴ" 
              style={{ 
                height: '70px', 
                width: 'auto',
                filter: `
                  drop-shadow(2px 0 0 #ffffff) 
                  drop-shadow(-2px 0 0 #ffffff) 
                  drop-shadow(0 2px 0 #ffffff) 
                  drop-shadow(0 -2px 0 #ffffff) 
                  drop-shadow(0 3px 6px rgba(0, 30, 60, 0.5))
                `
              }} 
            />
          </div>

          {/* 右上アカウント・メニュー操作 */}
          <TopRightMenu
            isLoggedIn={isLoggedIn} 
            loggedInEmail={loggedInEmail} 
            setShowWindyMenu={setShowWindyMenu}
            setIsSignUp={setIsSignUp} 
            setShowLoginModal={setShowLoginModal}
          />

          {/* 右側レイヤー選択サイドバー */}
          <RightSidebar
            showMarinePanel={showMarinePanel} setShowMarinePanel={setShowMarinePanel}
            showFishPanel={showFishPanel} setShowFishPanel={setShowFishPanel}
            activeMarineLayers={activeMarineLayers} setActiveMarineLayers={handleMarineLayersUpdate}
            activeFishLayers={activeFishLayers} setActiveFishLayers={setActiveFishLayers}
          />

          {/* 左下動的凡例 */}
          <div style={{ position: 'absolute', bottom: '290px', left: '30px', display: 'flex', flexDirection: 'column', gap: '16px', zIndex: 15 }}>
            {activeMarineLayers.includes('sst') && (
              <div className="slider-container" style={{ background: '#888', color: 'white', borderRadius: '30px', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '24px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
                <span style={{ fontWeight: 'bold', width: '60px', textAlign: 'right' }}>15℃</span>
                <div className="slider-bar" style={{ width: '260px', height: '24px', background: legendGradientStyle, borderRadius: '12px' }}></div>
                <span style={{ fontWeight: 'bold', width: '60px' }}>25℃</span>
              </div>
            )}

            {activeMarineLayers.includes('chl') && (
              <div className="slider-container" style={{ background: '#888', color: 'white', borderRadius: '30px', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '24px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
                <span style={{ fontWeight: 'bold', minWidth: '70px', textAlign: 'right', fontSize: '18px' }}>0 mg/m³</span>
                <div className="slider-bar" style={{ width: '260px', height: '24px', background: chlLegendGradientStyle, borderRadius: '12px' }}></div>
                <span style={{ fontWeight: 'bold', minWidth: '70px', fontSize: '18px' }}>20 mg/m³</span>
              </div>
            )}

            {activeFishLayers.length > 0 && (
              <div className="slider-container" style={{ background: '#888', color: 'white', borderRadius: '30px', padding: '16px 28px', display: 'flex', alignItems: 'center', gap: '24px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
                <span style={{ fontWeight: 'bold', width: '60px', textAlign: 'right', fontSize: '18px' }}>低濃度</span>
                <div className="slider-bar" style={{ width: '260px', height: '24px', background: fishLegendGradientStyle, borderRadius: '12px' }}></div>
                <span style={{ fontWeight: 'bold', width: '60px', fontSize: '18px' }}>高濃度</span>
              </div>
            )}
          </div>

          {/* 左上データ取得ステータス表示 */}
          {(oceanLoading || oceanError) && (
            <div style={{ position: 'absolute', top: '30px', left: '30px', background: oceanError ? '#c62828' : '#555', color: 'white', padding: '16px 28px', borderRadius: '30px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: oceanError ? 'auto' : 'none', display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '80vw' }}>
              <span>{oceanError ? `データ取得エラー: ${oceanError}` : 'データを同期中...'}</span>
              {oceanError && (
                <button onClick={() => setOceanRetryKey((k) => k + 1)} style={{ background: 'white', color: '#c62828', border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}>再試行</button>
              )}
            </div>
          )}
          {!oceanLoading && !oceanError && oceanPointCount > 0 && (
            <div style={{ position: 'absolute', top: '30px', left: '30px', background: 'rgba(0,0,0,0.55)', color: 'white', padding: '10px 22px', borderRadius: '30px', fontSize: '20px', pointerEvents: 'none' }}>
              全 {oceanPointCount.toLocaleString()} 件から抽出（日単位表示）
            </div>
          )}

          {/* 地図読み込みエラー表示 */}
          {mapLoadError && (
            <div style={{ position: 'absolute', top: (oceanLoading || oceanError) ? '90px' : '30px', left: '30px', background: '#c62828', color: 'white', padding: '16px 28px', borderRadius: '30px', fontSize: '22px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'none', maxWidth: '80vw' }}>
              地図エラー: {mapLoadError}
            </div>
          )}

          {/* 下部タイムライン操作バー */}
          <TimelineBar
            isPlaying={isPlaying} setIsPlaying={setIsPlaying} timelineDays={timelineDays} currentProgress={currentProgress} setCurrentProgress={setCurrentProgress}
            showMiniCalendar={showMiniCalendar} setShowMiniCalendar={setShowMiniCalendar} calYear={calYear} setCalYear={setCalYear} calMonth={calMonth} setCalMonth={setCalMonth}
            calendarCells={calendarCells} getCalendarDayStatus={getCalendarDayStatus} setBaseDate={setBaseDate} formattedSelectedDate={formattedSelectedDate}
          />

          {/* 右下マップ操作ボタン */}
          <MapControls handleZoom={handleZoom} handleJumpToCurrentLocation={handleJumpToCurrentLocation} />

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

        </div>
      </div>
    </>
  );
}