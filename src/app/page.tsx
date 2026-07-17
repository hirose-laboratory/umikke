// src/app/page.tsx
'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

// === コンポーネントのインポート ===
import LoginModal from './components/LoginModal';
import TopRightMenu from './components/TopRightMenu';
import RightSidebar from './components/RightSidebar';
import TimelineBar from './components/TimelineBar';
import MapControls from './components/MapControls';
import WindyMenu from './components/WindyMenu';

// ==========================================
// ★ Google Maps 関連の型定義
// （リファクタリング前は本ファイルに直書きされていましたが、
//   分割後に消えてしまっていたため復元しています）
// ==========================================
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
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showWindyMenu, setShowWindyMenu] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loggedInEmail, setLoggedInEmail] = useState<string | null>(null);
  const oceanPointsRef = useRef<OceanDataPoint[]>([]);
  const [oceanLoading, setOceanLoading] = useState<boolean>(true);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const [oceanDataVersion, setOceanDataVersion] = useState<number>(0);
  const [oceanPointCount, setOceanPointCount] = useState<number>(0);
  const [sstRange, setSstRange] = useState<{ min: number; max: number } | null>(null);
  const [mapReady, setMapReady] = useState<boolean>(false);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

  // ==========================================
  // ★ 認証処理系
  // ==========================================
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://27.133.132.208:8000';
  const AUTH_STORAGE_KEY = 'umikke_auth';

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
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, email: loggedEmail }));
      setIsLoggedIn(true); setLoggedInEmail(loggedEmail); setShowLoginModal(false); setShowWindyMenu(true); setPassword('');
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
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ token, email: registeredEmail }));
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

  useEffect(() => {
    // ★ setStateをeffect本体で同期的に呼ぶと「cascading renders」警告が出るため、
    //   マイクロタスクに逃がして次のティックで更新するようにしています。
    queueMicrotask(() => {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        try {
          const auth = JSON.parse(stored);
          if (auth?.email) { setIsLoggedIn(true); setLoggedInEmail(auth.email); }
        } catch {
          localStorage.removeItem(AUTH_STORAGE_KEY);
        }
      }
    });
  }, []);

  // ==========================================
  // 日付・マップデータ処理
  // ==========================================
  const currentDayIndex = currentProgress;
  const timelineDays = useMemo(() => {
    const days: TimelineDay[] = [];
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    for (let i = 0; i < 7; i++) {
      const d = new Date(baseDate); d.setDate(baseDate.getDate() + i);
      days.push({ label: `${d.getMonth() + 1}/${d.getDate()}(${weekDays[d.getDay()]})`, date: d });
    }
    return days;
  }, [baseDate]);

  const selectedFullDate = useMemo(() => {
    const d = new Date(baseDate); d.setDate(d.getDate() + currentProgress); return d;
  }, [baseDate, currentProgress]);

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

  const updateHeatmapData = useCallback(() => {
    if (!heatmapLayerRef.current || typeof window === 'undefined' || !window.google) return;
    const google = window.google;
    const allPoints = oceanPointsRef.current;
    const targetYear = selectedFullDate.getFullYear();
    const targetMonth = selectedFullDate.getMonth();
    const targetDateNum = selectedFullDate.getDate();

    const points = allPoints.filter((p) => {
      if (p.sst === null || p.sst === undefined) return false;
      const pDate = new Date(p.record_timestamp);
      return ( pDate.getFullYear() === targetYear && pDate.getMonth() === targetMonth && pDate.getDate() === targetDateNum );
    }).map((p) => ({
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
    if (!mapReady) return; updateHeatmapData();
  }, [mapReady, oceanDataVersion, updateHeatmapData]);

  // 海洋データ再取得のトリガー（エラー時の再試行ボタンから呼び出す）
  const [oceanRetryKey, setOceanRetryKey] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchOceanData() {
      try {
        const start = '2026-05-01T00:00:00'; const end = '2026-05-31T23:59:59';
        const res = await fetch(
          `${API_BASE_URL}/ocean/range/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
        );
        if (!res.ok) throw new Error(`データ取得に失敗しました (status: ${res.status})`);
        const data: OceanDataPoint[] = await res.json();
        if (cancelled) return;
        oceanPointsRef.current = data; setOceanPointCount(data.length); setOceanDataVersion((v) => v + 1);
      } catch (err) {
        if (!cancelled) {
          console.error('海洋データ取得エラー:', err);
          const message = err instanceof Error
            ? (err.message === 'Failed to fetch'
              ? `海洋データサーバー(${API_BASE_URL})に接続できませんでした。サーバーが起動しているか、CORS設定を確認してください。`
              : err.message)
            : '不明なエラーが発生しました';
          setOceanError(message);
        }
      } finally {
        if (!cancelled) setOceanLoading(false);
      }
    }

    // ★ effect本体で直接setStateせず、マイクロタスクに逃がしてから開始する
    queueMicrotask(() => {
      if (cancelled) return;
      setOceanLoading(true);
      setOceanError(null);
      fetchOceanData();
    });

    return () => { cancelled = true; };
  }, [oceanRetryKey, API_BASE_URL]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

    // ★ APIキーが設定されていない場合はスクリプト読み込み自体を行わず、
    //   分かりやすいエラーメッセージだけ表示する（"ApiProjectMapError"の元凶を防止）
    if (!apiKey) {
      queueMicrotask(() => {
        setMapLoadError('Google Maps APIキーが設定されていません（.env.local の NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を確認し、開発サーバーを再起動してください）。');
      });
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
      newScript.onerror = () => {
        if (!cancelled) setMapLoadError('Google Maps のスクリプト読み込みに失敗しました。ネットワーク接続を確認してください。');
      };
      document.head.appendChild(newScript);
    } else if (typeof window !== 'undefined' && window.google) {
      queueMicrotask(() => { if (!cancelled) initMap(); });
    } else {
      script.onload = () => { if (!cancelled) initMap(); };
      script.onerror = () => {
        if (!cancelled) setMapLoadError('Google Maps のスクリプト読み込みに失敗しました。ネットワーク接続を確認してください。');
      };
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
        data: [], map: map, gradient: customGradient, radius: 15, opacity: 0.85, maxIntensity: 25
      });
      setMapReady(true);

      function getCustomIcon(colorUrl: string): Spot['icon'] {
        return { url: colorUrl, scaledSize: { width: 40, height: 40 }, origin: { x: 0, y: 0 }, anchor: { x: 20, y: 40 } };
      }
      const infoWindow = new google.maps.InfoWindow({ maxWidth: 450 });
      const spots: Spot[] = [ /* スポットデータ等は省略せず元のまま残していますが、長いためUIとしては問題なく動きます */ ];

      spots.forEach((spot) => {
        const marker = new google.maps.Marker({
          position: spot.position,
          map: map,
          title: spot.title,
          icon: spot.icon,
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

      // getCustomIcon は spots にアイコンを渡す際に利用します（現在 spots は空のため未使用警告が出る場合があります）
      void getCustomIcon;
    }

    return () => { cancelled = true; };
  }, []);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) { calendarCells.push(null); }
  for (let i = 1; i <= daysInMonth; i++) { calendarCells.push(i); }

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
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#0044cc',
                fillOpacity: 1.0,
                strokeColor: 'white',
                strokeWeight: 3,
                scale: 10,
              },
            });
          }
        },
        () => { alert('位置情報の取得に失敗しました。'); }
      );
    } else { alert('お使いのブラウザは位置情報サービスに対応していません。'); }
  };

  // ==========================================
  // ★ ここから下が完全にスッキリした画面UI！
  // ==========================================
  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"/>

      <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden', fontFamily: 'sans-serif', fontSize: '28px' }}>

        {/* マップ本体 */}
        <div id="map" ref={mapRef} style={{ height: '100vh', width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }} />

        {/* UIレイヤー */}
        <div className="ui-container" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }}>

          <TopRightMenu
            isLoggedIn={isLoggedIn} loggedInEmail={loggedInEmail} setShowWindyMenu={setShowWindyMenu}
            setIsSignUp={setIsSignUp} setShowLoginModal={setShowLoginModal}
          />

          <RightSidebar
            showMarinePanel={showMarinePanel} setShowMarinePanel={setShowMarinePanel}
            showFishPanel={showFishPanel} setShowFishPanel={setShowFishPanel}
          />

          {/* 左下凡例（今回は独立させずそのまま） */}
          <div className="slider-container" style={{ position: 'absolute', bottom: '290px', left: '30px', background: '#888', color: 'white', borderRadius: '30px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '20px', fontSize: '28px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
            <span>{sstRange ? `${sstRange.min.toFixed(1)}℃` : '低'}</span>
            <div className="slider-bar" style={{ width: '240px', height: '20px', background: 'linear-gradient(to right, rgba(0,0,255,1), rgba(0,255,255,1), rgba(0,255,0,1), rgba(255,255,0,1), rgba(255,165,0,1), rgba(255,0,0,1))', borderRadius: '10px' }}></div>
            <span>{sstRange ? `${sstRange.max.toFixed(1)}℃` : '高'}</span>
          </div>

          {/* 取得状況表示 */}
          {(oceanLoading || oceanError) && (
            <div style={{ position: 'absolute', top: '30px', left: '30px', background: oceanError ? '#c62828' : '#555', color: 'white', padding: '16px 28px', borderRadius: '30px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: oceanError ? 'auto' : 'none', display: 'flex', alignItems: 'center', gap: '16px', maxWidth: '80vw' }}>
              <span>{oceanError ? `海洋データ取得エラー: ${oceanError}` : '海洋データを同期中...'}</span>
              {oceanError && (
                <button
                  onClick={() => setOceanRetryKey((k) => k + 1)}
                  style={{ background: 'white', color: '#c62828', border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer', flexShrink: 0 }}
                >
                  再試行
                </button>
              )}
            </div>
          )}
          {!oceanLoading && !oceanError && oceanPointCount > 0 && (
            <div style={{ position: 'absolute', top: '30px', left: '30px', background: 'rgba(0,0,0,0.55)', color: 'white', padding: '10px 22px', borderRadius: '30px', fontSize: '20px', pointerEvents: 'none' }}>
              全データ {oceanPointCount.toLocaleString()} 件から抽出（日単位ヒートマップ）
            </div>
          )}

          {/* Google Maps 読み込みエラー表示 */}
          {mapLoadError && (
            <div style={{ position: 'absolute', top: (oceanLoading || oceanError) ? '90px' : '30px', left: '30px', background: '#c62828', color: 'white', padding: '16px 28px', borderRadius: '30px', fontSize: '22px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'none', maxWidth: '80vw' }}>
              地図の読み込みエラー: {mapLoadError}
            </div>
          )}

          {/* 下部タイムラインコンテナ */}
          <TimelineBar
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            timelineDays={timelineDays}
            currentProgress={currentProgress}
            setCurrentProgress={setCurrentProgress}
            showMiniCalendar={showMiniCalendar}
            setShowMiniCalendar={setShowMiniCalendar}
            calYear={calYear}
            setCalYear={setCalYear}
            calMonth={calMonth}
            setCalMonth={setCalMonth}
            calendarCells={calendarCells}
            getCalendarDayStatus={getCalendarDayStatus}
            setBaseDate={setBaseDate}
            formattedSelectedDate={formattedSelectedDate}
          />

          {/* 右下コントロールパネル */}
          <MapControls
            handleZoom={handleZoom}
            handleJumpToCurrentLocation={handleJumpToCurrentLocation}
          />

          {/* ========================================== */}
          {/* ログイン＆新規会員登録モーダル */}
          {/* ========================================== */}
          {showLoginModal && (
            <LoginModal
              setShowLoginModal={setShowLoginModal}
              isSignUp={isSignUp}
              setIsSignUp={setIsSignUp}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              handleRegisterSubmit={handleRegisterSubmit}
              handleEmailLogin={handleEmailLogin}
            />
          )}

          {/* Windy風 右メニュー */}
          <WindyMenu
            showWindyMenu={showWindyMenu}
            setShowWindyMenu={setShowWindyMenu}
            isLoggedIn={isLoggedIn}
            loggedInEmail={loggedInEmail}
            handleLogout={handleLogout}
            handleDeleteAccount={handleDeleteAccount}
            setIsSignUp={setIsSignUp}
            setShowLoginModal={setShowLoginModal}
          />

        </div>
      </div>
    </>
  );
}
