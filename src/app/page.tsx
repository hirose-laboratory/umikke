'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

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

export default function HeatmapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null); 
  const heatmapLayerRef = useRef<GoogleHeatmapLayerInstance | null>(null);
  const currentLocationMarkerRef = useRef<GoogleMarkerInstance | null>(null);

  const initDate = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }, []);

  // --- 状態管理 (State) ---
  const [baseDate, setBaseDate] = useState<Date>(initDate); 
  const [currentProgress, setCurrentProgress] = useState<number>(0); 
  const [isPlaying, setIsPlaying] = useState<boolean>(false); 
  
  const [showMiniCalendar, setShowMiniCalendar] = useState<boolean>(false);
  const [calYear, setCalYear] = useState<number>(initDate.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(initDate.getMonth()); 

  const [showMarinePanel, setShowMarinePanel] = useState<boolean>(true);
  const [showFishPanel, setShowFishPanel] = useState<boolean>(true);

  // ログインモーダル・メニューの状態
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showWindyMenu, setShowWindyMenu] = useState<boolean>(false);

  // フォーム用State
  const [username, setUsername] = useState<string>(''); // ★新規追加: ユーザー名
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false); 

  // ログイン状態（Windy風：ログイン後は右メニューにアカウント情報を表示する）
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);

  // 海洋データ関連の状態
  const oceanPointsRef = useRef<OceanDataPoint[]>([]);
  const [oceanLoading, setOceanLoading] = useState<boolean>(true);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const [oceanDataVersion, setOceanDataVersion] = useState<number>(0);
  const [oceanPointCount, setOceanPointCount] = useState<number>(0); 
  const [sstRange, setSstRange] = useState<{ min: number; max: number } | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false); 

  // ==========================================
  // ★ 認証処理系（自前APIによるユーザー登録・ログイン・削除）
  // ==========================================
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://27.133.132.208:8000';
  const AUTH_STORAGE_KEY = 'umikke_auth';

  // 1. メールアドレスでのログイン処理（自前API）
  const handleEmailLogin = async () => {
    if (!email || !password) {
      alert('メールアドレスとパスワードを入力してください。');
      return;
    }
    try {
      // ★送信先を /users/login に修正
      const res = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        // ★ errBody?.detail を追加してFastAPIのエラーを拾うように修正
        const errorMessage = errBody?.detail || errBody?.message || `status ${res.status}`;
        alert('ログインに失敗しました: ' + errorMessage);
        return;
      }
      const data = await res.json();
      const token = data.token ?? data.access_token ?? '';
      const loggedEmail = data.email ?? email;

      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, email: loggedEmail }));
      setIsLoggedIn(true);
      setLoggedInEmail(loggedEmail);
      setShowLoginModal(false);
      setShowWindyMenu(true);
      setPassword('');
    } catch (err) {
      console.error(err);
      alert('ログイン処理中にエラーが発生しました。通信環境をご確認ください。');
    }
  };

  // 2. 新規会員登録処理（自前API）
  const handleRegisterSubmit = async () => {
    // ★バリデーションに username を追加
    if (!username || !email || !password) {
      alert('ユーザー名、メールアドレス、パスワードを入力してください。');
      return;
    }
    if (password.length < 6) {
      alert('パスワードは6文字以上で設定してください。');
      return;
    }
    try {
      // ★送信先を FastAPIのルーターに合わせて /users/ に修正
      const res = await fetch(`${API_BASE_URL}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ★ペイロードに username を追加
        body: JSON.stringify({ username, email, password }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        alert('登録に失敗しました: ' + (errBody?.message || `status ${res.status}`));
        return;
      }
      const data = await res.json();
      const token = data.token ?? data.access_token ?? '';
      const registeredEmail = data.email ?? email;

      if (token) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, email: registeredEmail }));
        setIsLoggedIn(true);
        setLoggedInEmail(registeredEmail);
        setShowLoginModal(false);
        setShowWindyMenu(true);
      } else {
        alert('アカウント登録が完了しました！ログインしてください。');
        setIsSignUp(false);
      }
      setPassword('');
      setUsername(''); // フォームをクリア
    } catch (err) {
      console.error(err);
      alert('登録処理中にエラーが発生しました。通信環境をご確認ください。');
    }
  };

  // 3. ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsLoggedIn(false);
    setLoggedInEmail(null);
    setShowWindyMenu(false);
  };

  // 4. アカウント削除処理（自前API）
  const handleDeleteAccount = async () => {
    if (!window.confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) return;
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      const auth = stored ? JSON.parse(stored) : null;
      const res = await fetch(`${API_BASE_URL}/users/delete/`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({ email: loggedInEmail }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        alert('アカウント削除に失敗しました: ' + (errBody?.message || `status ${res.status}`));
        return;
      }
      alert('アカウントを削除しました。');
      handleLogout();
    } catch (err) {
      console.error(err);
      alert('削除処理中にエラーが発生しました。通信環境をご確認ください。');
    }
  };

  // 5. ページ読み込み時、保存されたログイン情報を復元
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const auth = JSON.parse(stored);
        if (auth?.email) {
          setIsLoggedIn(true);
          setLoggedInEmail(auth.email);
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  }, []);

  // ==========================================

  const currentDayIndex = currentProgress;
  const timelineDays = useMemo(() => {
    const days: TimelineDay[] = [];
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      days.push({
        label: `${d.getMonth() + 1}/${d.getDate()}(${weekDays[d.getDay()]})`,
        date: d
      });
    }
    return days; 
  }, [baseDate]);

  const selectedFullDate = useMemo(() => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + currentProgress);
    return d;
  }, [baseDate, currentProgress]);

  const formattedSelectedDate = useMemo(() => {
    const y = selectedFullDate.getFullYear();
    const m = selectedFullDate.getMonth() + 1;
    const d = selectedFullDate.getDate();
    return `${y}年${m}月${d}日`;
  }, [selectedFullDate]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentProgress((prev) => (prev + 1) % 7); 
      }, 1000); 
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying]);

  const updateHeatmapData = useCallback(() => {
    if (!heatmapLayerRef.current || typeof window === 'undefined' || !window.google) return;

    const google = window.google;
    const allPoints = oceanPointsRef.current;

    const targetYear = selectedFullDate.getFullYear();
    const targetMonth = selectedFullDate.getMonth();
    const targetDateNum = selectedFullDate.getDate();

    const points = allPoints
      .filter((p) => {
        if (p.sst === null || p.sst === undefined) return false;
        const pDate = new Date(p.record_timestamp);
        return (
          pDate.getFullYear() === targetYear &&
          pDate.getMonth() === targetMonth &&
          pDate.getDate() === targetDateNum
        );
      })
      .map((p) => ({
        location: new google.maps.LatLng(p.latitude, p.longitude),
        weight: p.sst as number,
      }));

    heatmapLayerRef.current.setData(points);

    if (points.length > 0) {
      const weights = points.map((p) => p.weight);
      const min = Math.min(...weights);
      const max = Math.min(...weights) === Math.max(...weights) ? Math.max(...weights) + 1 : Math.max(...weights);
      setSstRange({ min, max: Math.max(...weights) });
      heatmapLayerRef.current.setOptions({ maxIntensity: max, radius: 45 });
    } else {
      setSstRange(null);
    }
  }, [selectedFullDate]);

  useEffect(() => {
    if (!mapReady) return;
    updateHeatmapData();
  }, [mapReady, oceanDataVersion, updateHeatmapData]);

  useEffect(() => {
    let cancelled = false;

    async function fetchOceanData() {
      setOceanLoading(true);
      setOceanError(null);
      try {
        const start = '2026-05-01T00:00:00';
        const end = '2026-05-31T23:59:59';
        const res = await fetch(
          `http://27.133.132.208:8000/ocean/range/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
        if (!res.ok) {
          throw new Error(`データ取得に失敗しました (status: ${res.status})`);
        }
        const data: OceanDataPoint[] = await res.json();
        if (cancelled) return;

        oceanPointsRef.current = data;
        setOceanPointCount(data.length);
        setOceanDataVersion((v) => v + 1);
      } catch (err) {
        if (!cancelled) {
          console.error('海洋データ取得エラー:', err);
          setOceanError(err instanceof Error ? err.message : '不明なエラーが発生しました');
        }
      } finally {
        if (!cancelled) setOceanLoading(false);
      }
    }

    fetchOceanData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const scriptId = 'google-maps-script';
    const script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      const newScript = document.createElement('script');
      newScript.id = scriptId;
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      newScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=3.64&libraries=visualization`;
      newScript.async = true;
      newScript.defer = true;
      newScript.onload = () => initMap();
      document.head.appendChild(newScript);
    } else if (typeof window !== 'undefined' && window.google) {
      initMap();
    } else {
      script.onload = () => initMap();
    }

    function initMap() {
      if (!mapRef.current) return;
      if (typeof window === 'undefined' || !window.google || !window.google.maps) return;

      const google = window.google;

      const map = new google.maps.Map(mapRef.current, {
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
        'rgba(0, 255, 0, 1.0)', 'rgba(255, 255, 0, 1.0)', 'rgba(255, 165, 0, 1.0)',
        'rgba(255, 0, 0, 1.0)'
      ];
      heatmapLayerRef.current = new google.maps.visualization.HeatmapLayer({
        data: [],
        map: map,
        gradient: customGradient,
        radius: 15,
        opacity: 0.85,
        maxIntensity: 25
      });
      setMapReady(true);

      function getCustomIcon(colorUrl: string): Spot['icon'] {
        return {
          url: colorUrl,
          scaledSize: { width: 40, height: 40 }, 
          origin: { x: 0, y: 0 },
          anchor: { x: 20, y: 40 }
        };
      }

      const infoWindow = new google.maps.InfoWindow({ maxWidth: 450 });
      const spots: Spot[] = [
        {
          position: { lat: 34.485, lng: 136.842 },
          title: 'アジ・サバ・ヒラメ・カレイ混合エリア',
          content: `
            <div class="info-window-content">
                <h3 style="margin: 0 0 16px 0; font-size: 34px; color: #333; border-bottom: 2px solid #ccc; padding-bottom: 8px; font-weight: bold;">浮遊魚・底物<br>混合エリア</h3>
                <p style="margin: 0 0 12px 0; font-size: 28px; color: #8e24aa; font-weight: bold;">漁場構成</p>
                <ul style="margin: 0; padding-left: 36px; font-size: 28px; color: #333; list-style-type: disc;">
                    <li style="margin-bottom: 8px;">アジ・サバ</li>
                    <li style="margin-bottom: 8px;">ヒラメ・カレイ</li>
                    <li style="margin-bottom: 8px;">イワシ</li>
                </ul>
            </div>
          `,
          initialOpen: true,
          icon: getCustomIcon('https://maps.google.com/mapfiles/ms/icons/red-dot.png')
        },
        {
          position: { lat: 34.502, lng: 136.861 },
          title: '東部アウターエッジ：アジ・サバホットスポット',
          content: `
            <div class="info-window-content">
                <h3 style="margin: 0 0 16px 0; font-size: 34px; color: #333; border-bottom: 2px solid #ccc; padding-bottom: 8px; font-weight: bold;">東部沖：アジ・サバ特選地区</h3>
                <p style="margin: 0 0 12px 0; font-size: 28px; color: #8e24aa; font-weight: bold;">高確率ヒットスポット</p>
                <ul style="margin: 0; padding-left: 36px; font-size: 28px; color: #333; list-style-type: disc;">
                    <li style="margin-bottom: 8px;">マアジ（大型中心）</li>
                    <li style="margin-bottom: 8px;">サバ（回遊活性：高）</li>
                    <li style="margin-bottom: 8px;">さわら（随伴傾向）</li>
                </ul>
            </div>
          `,
          initialOpen: false,
          icon: getCustomIcon('https://maps.google.com/mapfiles/ms/icons/green-dot.png')
        }
      ];

      spots.forEach(spot => {
        const marker = new google.maps.Marker({
          position: spot.position,
          map: map,
          title: spot.title,
          icon: spot.icon
        });

        marker.addListener('click', () => {
          infoWindow.setContent(spot.content);
          infoWindow.open(map, marker);
        });

        if (spot.initialOpen) {
          infoWindow.setContent(spot.content);
          infoWindow.open(map, marker);
        }
      });
    }
  }, []);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const calendarCells = [];
  for (let i = 0; i < firstDayIndex; i++) {
    calendarCells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push(i);
  }

  const getCalendarDayStatus = (dateNum: number | null) => {
    if (!dateNum) return { isToday: false, isSelected: false };
    const today = new Date();
    const cellDate = new Date(calYear, calMonth, dateNum);
    const isToday = cellDate.getDate() === today.getDate() &&
                    cellDate.getMonth() === today.getMonth() &&
                    cellDate.getFullYear() === today.getFullYear();
    const isSelected = cellDate.getDate() === baseDate.getDate() &&
                       cellDate.getMonth() === baseDate.getMonth() &&
                       cellDate.getFullYear() === baseDate.getFullYear();
    return { isToday, isSelected };
  };

  const handleZoom = (amount: number) => {
    if (!mapInstanceRef.current) return;
    const currentZoom = mapInstanceRef.current.getZoom();
    mapInstanceRef.current.setZoom(currentZoom + amount);
  };

  const handleJumpToCurrentLocation = () => {
    if (!mapInstanceRef.current || typeof window === 'undefined' || !window.google) return;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const google = window.google;
          const currentLatLng = new google.maps.LatLng(
            position.coords.latitude,
            position.coords.longitude
          );
          
          mapInstanceRef.current?.setCenter(currentLatLng);

          if (currentLocationMarkerRef.current) {
            currentLocationMarkerRef.current.setPosition(currentLatLng);
          } else {
            currentLocationMarkerRef.current = new google.maps.Marker({
              position: currentLatLng,
              map: mapInstanceRef.current,
              title: '現在地',
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#0044cc',     
                fillOpacity: 1.0,        
                strokeColor: 'white',    
                strokeWeight: 3,         
                scale: 10                 
              }
            });
          }
        },
        () => {
          alert('位置情報の取得に失敗しました。');
        }
      );
    } else {
      alert('お使いのブラウザは位置情報サービスに対応していません。');
    }
  };

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"/>
      
      <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', fontSize: '28px' }}>
        
        <div id="map" ref={mapRef} style={{ height: '100vh', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />

        <div className="ui-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>
        
          {/* 右上ボタン */}
          <div className="top-right" style={{ position: 'absolute', top: '30px', right: '30px', display: 'flex', gap: '16px', alignItems: 'center', pointerEvents: 'auto' }}>
            {isLoggedIn ? (
              <button className="btn-account" onClick={() => setShowWindyMenu(true)} style={{ background: '#0044cc', color: 'white', border: 'none', padding: '16px 32px', borderRadius: '40px', fontSize: '26px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', maxWidth: '360px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>account_circle</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loggedInEmail}</span>
              </button>
            ) : (
              <button className="btn-login" onClick={() => { setIsSignUp(false); setShowLoginModal(true); }} style={{ background: '#888', color: 'white', border: 'none', padding: '16px 32px', borderRadius: '40px', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>account_circle</span> ログイン
              </button>
            )}
            <button className="btn-menu" onClick={() => setShowWindyMenu(true)} style={{ background: 'white', border: '1px solid #ccc', borderRadius: '50%', width: '80px', height: '80px', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>menu</span>
            </button>
          </div>

          {/* 右側レイヤー切り替えメニュー */}
          <div className="right-sidebar" style={{ position: 'absolute', top: '140px', right: '30px', display: 'flex', flexDirection: 'column', gap: '24px', pointerEvents: 'auto' }}>
            <div className="layer-container" style={{ background: '#888', borderRadius: '24px', width: '560px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="layer-btn" onClick={() => setShowMarinePanel(!showMarinePanel)} style={{ background: '#888', color: 'white', padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }}>
                <div className="layer-left" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div className="layer-color blue" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0, backgroundColor: '#1a237e' }}></div>
                  <div className="layer-text" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="layer-title" style={{ fontSize: '40px', fontWeight: 'bold', lineHeight: 1.2 }}>海況状況</span>
                    <span className="layer-sub" style={{ fontSize: '28px', color: '#e0e0e0', marginTop: '8px' }}>海況データ</span>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
                  {showMarinePanel ? 'expand_more' : 'expand_less'}
                </span>
              </div>
              
              {showMarinePanel && (
                <div className="checkbox-panel" style={{ padding: '0 32px 32px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
                    <input type="radio" name="marine-data" defaultChecked style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} /> 水温
                  </label>
                  <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
                    <input type="radio" name="marine-data" style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} /> クロロフィルa濃度
                  </label>
                  <label className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
                    <input type="radio" name="marine-data" style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} /> 流向・流速
                  </label>
                </div>
              )}
            </div>

            <div className="layer-container" style={{ background: '#888', borderRadius: '24px', width: '560px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div className="layer-btn" onClick={() => setShowFishPanel(!showFishPanel)} style={{ background: '#888', color: 'white', padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }}>
                <div className="layer-left" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <div className="layer-color purple" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0, backgroundColor: '#8e24aa' }}></div>
                  <div className="layer-text" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span className="layer-title" style={{ fontSize: '40px', fontWeight: 'bold', lineHeight: 1.2 }}>魚種分布</span>
                    <span className="layer-sub" style={{ fontSize: '28px', color: '#e0e0e0', marginTop: '8px' }}>魚種カテゴリ別表示</span>
                  </div>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
                  {showFishPanel ? 'expand_more' : 'expand_less'}
                </span>
              </div>

              {showFishPanel && (
                <div className="checkbox-panel" style={{ padding: '0 32px 32px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {['アジ・サバ', 'ヒラメ・カレイ', 'エビ・カニ', 'イカ・タコ'].map((fish, index) => (
                    <label key={fish} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
                      <input type="checkbox" defaultChecked={index < 2} style={{ width: '32px', height: '32px', cursor: 'pointer', accentColor: '#8e24aa' }} /> {fish}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 左下凡例 */}
          <div className="slider-container" style={{ position: 'absolute', bottom: '290px', left: '30px', background: '#888', color: 'white', borderRadius: '30px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '20px', fontSize: '28px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
            <span>{sstRange ? `${sstRange.min.toFixed(1)}℃` : '低'}</span>
            <div className="slider-bar" style={{ width: '240px', height: '20px', background: 'linear-gradient(to right, rgba(0,0,255,1), rgba(0,255,255,1), rgba(0,255,0,1), rgba(255,255,0,1), rgba(255,165,0,1), rgba(255,0,0,1))', borderRadius: '10px' }}></div>
            <span>{sstRange ? `${sstRange.max.toFixed(1)}℃` : '高'}</span>
          </div>

          {/* 取得状況表示 */}
          {(oceanLoading || oceanError) && (
            <div style={{ position: 'absolute', top: '30px', left: '30px', background: oceanError ? '#c62828' : '#555', color: 'white', padding: '16px 28px', borderRadius: '30px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
              {oceanError ? `海洋データ取得エラー: ${oceanError}` : '海洋データを同期中...'}
            </div>
          )}
          {!oceanLoading && !oceanError && oceanPointCount > 0 && (
            <div style={{ position: 'absolute', top: '30px', left: '30px', background: 'rgba(0,0,0,0.55)', color: 'white', padding: '10px 22px', borderRadius: '30px', fontSize: '20px', pointerEvents: 'none' }}>
              全データ {oceanPointCount.toLocaleString()} 件から抽出（日単位ヒートマップ）
            </div>
          )}

          {/* 下部タイムラインコンテナ */}
          <div className="bottom-bar" style={{ position: 'absolute', bottom: '40px', left: '30px', width: 'calc(100% - 150px)', maxWidth: '1200px', background: '#888', borderRadius: '24px', minHeight: '180px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '24px 32px', color: 'white', gap: '16px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', boxSizing: 'border-box', pointerEvents: 'auto' }}>
            
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '24px' }}>
              <button 
                className="play-btn" 
                onClick={() => setIsPlaying(!isPlaying)}
                style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'white', border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', color: 'black', flexShrink: 0, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '56px' }}>
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
              </button>

              <div className="timeline" style={{ display: 'flex', flexGrow: 1, justifyContent: 'space-between', fontSize: '30px', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                {timelineDays.map((day, idx) => (
                  <span 
                    key={idx} 
                    onClick={() => {
                      setCurrentProgress(idx); 
                      setIsPlaying(false);
                    }}
                    style={{ 
                      color: currentDayIndex === idx ? '#ffdd55' : 'white', 
                      borderBottom: currentDayIndex === idx ? '4px solid #ffdd55' : 'none', 
                      paddingBottom: '4px', 
                      cursor: 'pointer',
                      fontWeight: currentDayIndex === idx ? 'bold' : 'normal',
                    }}
                  >
                    {day.label}
                  </span>
                ))}
              </div>

              <div style={{ position: 'relative', flexShrink: 0, width: '64px', height: '64px' }}>
                <span 
                  className="material-symbols-outlined" 
                  onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                  style={{ fontSize: '56px', color: 'white', cursor: 'pointer' }}
                >
                  calendar_today
                </span>

                {/* ミニカレンダーポップアップ */}
                {showMiniCalendar && (
                  <div style={{
                    position: 'absolute', bottom: '80px', right: '0px', background: 'white', color: '#333', borderRadius: '16px', padding: '16px', width: '320px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 100
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                      <span className="material-symbols-outlined" style={{ cursor: 'pointer' }} onClick={() => {
                        if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else { setCalMonth(calMonth - 1); }
                      }}>chevron_left</span>
                      <span>{calYear}年 {calMonth + 1}月</span>
                      <span className="material-symbols-outlined" style={{ cursor: 'pointer' }} onClick={() => {
                        if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else { setCalMonth(calMonth + 1); }
                      }}>chevron_right</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                      {['日', '月', '火', '水', '木', '金', '土'].map(w => <span key={w}>{w}</span>)}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '16px' }}>
                      {calendarCells.map((dateNum, index) => {
                        const { isToday, isSelected } = getCalendarDayStatus(dateNum);
                        
                        let cellBg = 'transparent';
                        let cellTextColor = '#333';
                        if (isSelected) {
                          cellBg = '#ffdd55'; 
                          cellTextColor = 'white'; 
                        } else if (isToday) {
                          cellBg = '#e8f0fe';
                        }

                        return (
                          <div key={index} style={{ width: '100%', aspectRatio: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {dateNum && (
                              <button
                                onClick={() => {
                                  setBaseDate(new Date(calYear, calMonth, dateNum));
                                  setCurrentProgress(0); 
                                  setShowMiniCalendar(false);
                                  setIsPlaying(false);
                                }}
                                style={{
                                  width: '100%', height: '100%', border: 'none', background: cellBg, color: cellTextColor, borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold'
                                }}
                              >
                                {dateNum}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 下段：シークバー ＆ 日付表示 */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input 
                type="range" 
                min="0" 
                max="6"  
                value={currentProgress}
                onChange={(e) => {
                  setCurrentProgress(Number(e.target.value));
                  setIsPlaying(false);
                }}
                style={{
                  width: '100%', cursor: 'pointer', accentColor: 'white', background: 'rgba(255, 255, 255, 0.3)', height: '10px', borderRadius: '5px', outline: 'none'
                }}
              />
              
              <div style={{ fontSize: '24px', textAlign: 'left', color: '#e0e0e0', fontWeight: 'bold', paddingLeft: '4px' }}>
                選択日: <span style={{ color: '#ffdd55' }}>{formattedSelectedDate}</span>
              </div>
            </div>
          </div>

          {/* 右下コントロールパネル */}
          <div className="bottom-right-controls" style={{ position: 'absolute', bottom: '40px', right: '30px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', pointerEvents: 'auto' }}>
            <button className="nav-btn" onClick={handleJumpToCurrentLocation} style={{ background: '#888', color: 'white', border: 'none', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>near_me</span>
            </button>
            <div className="zoom-controls" style={{ background: '#888', color: 'white', borderRadius: '35px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
              <button className="zoom-btn" onClick={() => handleZoom(1)} style={{ background: 'transparent', color: 'white', border: 'none', width: '70px', height: '70px', fontSize: '40px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '2px solid #aaa' }}>＋</button>
              <button className="zoom-btn" onClick={() => handleZoom(-1)} style={{ background: 'transparent', color: 'white', border: 'none', width: '70px', height: '70px', fontSize: '40px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>−</button>
            </div>
          </div>

          {/* ========================================== */}
          {/* ログイン＆新規会員登録モーダル（完全修復・高機能版） */}
          {/* ========================================== */}
          {showLoginModal && (
            <div 
              onClick={() => setShowLoginModal(false)}
              style={{
                position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, pointerEvents: 'auto'
              }}
            >
              <div 
                onClick={(e) => e.stopPropagation()} 
                style={{
                  background: '#ffffff', borderRadius: '32px', padding: '72px', width: '820px', minHeight: '760px', maxWidth: '92vw', boxShadow: '0 16px 48px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '32px', color: '#333', position: 'relative', boxSizing: 'border-box'
                }}
              >
                {/* 閉じるボタン */}
                <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '-24px', right: '-24px', background: '#0044cc', color: 'white', border: 'none', borderRadius: '50%', width: '64px', height: '64px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>close</span>
                </button>
                
                {/* タイトルの切り替え */}
                <h2 style={{ fontSize: '50px', fontWeight: 'bold', margin: '0 0 8px 0', color: isSignUp ? '#28a745' : '#111' }}>
                  {isSignUp ? '【新規会員登録】' : '【ログイン】'}
                </h2>

                {/* ★新規追加: 新規登録時のみユーザー名入力フィールドを表示 */}
                {isSignUp && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <label style={{ fontSize: '26px', color: '#555', fontWeight: '500' }}>ユーザー名</label>
                    <input 
                      type="text" 
                      placeholder="ユーザー名を入力"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{ width: '100%', padding: '24px', borderRadius: '18px', border: '2px solid #ddd', background: '#f8f9fa', fontSize: '26px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} 
                    />
                  </div>
                )}
                
                {/* メールアドレス入力 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ fontSize: '26px', color: '#555', fontWeight: '500' }}>メールアドレス</label>
                  <input 
                    type="email" 
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', padding: '24px', borderRadius: '18px', border: '2px solid #ddd', background: '#f8f9fa', fontSize: '26px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} 
                  />
                </div>
                
                {/* パスワード入力 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <label style={{ fontSize: '26px', color: '#555', fontWeight: '500' }}>パスワード</label>
                  <input 
                    type="password" 
                    placeholder="6文字以上のパスワード"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '24px', borderRadius: '18px', border: '2px solid #ddd', background: '#f8f9fa', fontSize: '26px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} 
                  />
                </div>
                
                {/* メインアクションボタン（ログイン or 登録） */}
                {isSignUp ? (
                  <button onClick={handleRegisterSubmit} style={{ width: '100%', background: '#28a745', color: 'white', border: 'none', padding: '28px', borderRadius: '52px', fontSize: '32px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px', boxShadow: '0 4px 12px rgba(40,167,69,0.3)' }}>
                    新しくアカウントを作成する
                  </button>
                ) : (
                  <button onClick={handleEmailLogin} style={{ width: '100%', background: '#0044cc', color: 'white', border: 'none', padding: '28px', borderRadius: '52px', fontSize: '32px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px', boxShadow: '0 4px 12px rgba(0,68,204,0.3)' }}>
                    ログインする
                  </button>
                )}
                
                {/* 画面モード切り替え用のUIエリア */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '26px', marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '24px' }}>
                  {isSignUp ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                      <span style={{ color: '#666' }}>すでにアカウントをお持ちの方はこちら</span>
                      <button 
                        onClick={() => setIsSignUp(false)} 
                        style={{ background: '#f0f0f0', color: '#333', border: '1px solid #ccc', padding: '12px 32px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        ログイン画面へ戻る
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', width: '100%' }}>
                      <span style={{ color: '#666' }}>アカウントをお持ちではありませんか？</span>
                      <button 
                        onClick={() => setIsSignUp(true)} 
                        style={{ width: '100%', background: '#28a745', color: 'white', border: 'none', padding: '16px', borderRadius: '32px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(40,167,69,0.2)' }}
                      >
                        今すぐ新規会員登録する
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {/* ========================================== */}

          {/* Windy風 右メニュー */}
          <div 
            onClick={() => setShowWindyMenu(false)}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.3)', zIndex: 3000, opacity: showWindyMenu ? 1 : 0, visibility: showWindyMenu ? 'visible' : 'hidden', transition: 'opacity 0.3s ease, visibility 0.3s ease', pointerEvents: 'auto'
            }}
          />

          <div 
            style={{
              position: 'fixed', top: 0, right: 0, width: '500px', height: '100vh', backgroundColor: '#222222', color: '#e0e0e0', boxShadow: '-4px 0 24px rgba(0,0,0,0.5)', zIndex: 3100, transform: showWindyMenu ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease-in-out', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'
            }}
          >
            <div style={{ padding: '32px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#0044cc' }}>settings</span>
                <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>詳細設定・メニュー</span>
              </div>
              <button onClick={() => setShowWindyMenu(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '44px' }}>close</span>
              </button>
            </div>

            <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '40px', flexGrow: 1, overflowY: 'auto' }}>
              {/* Windy風：アカウント情報エリア */}
              {isLoggedIn ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px', borderBottom: '1px solid #444' }}>
                  <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>ACCOUNT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#0044cc' }}>account_circle</span>
                    <span style={{ fontSize: '26px', color: 'white', wordBreak: 'break-all' }}>{loggedInEmail}</span>
                  </div>
                  <button onClick={handleLogout} style={{ background: '#444', color: 'white', border: '1px solid #666', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ログアウト
                  </button>
                  <button onClick={handleDeleteAccount} style={{ background: 'transparent', color: '#e57373', border: '1px solid #e57373', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}>
                    アカウントを削除
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px', borderBottom: '1px solid #444' }}>
                  <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>ACCOUNT</div>
                  <button onClick={() => { setShowWindyMenu(false); setIsSignUp(false); setShowLoginModal(true); }} style={{ background: '#0044cc', color: 'white', border: 'none', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}>
                    ログイン / 新規登録
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>MAP DISPLAY OPTIONS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '26px', color: '#ccc' }}>ベース地図のタイプ</span>
                  <select style={{ width: '100%', background: '#333', color: 'white', border: '1px solid #444', padding: '16px', borderRadius: '12px', fontSize: '24px', outline: 'none' }}>
                    <option>標準マップ</option>
                    <option>衛星写真マップ</option>
                    <option>地形・白地図</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}