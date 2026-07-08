'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';

// Google Mapsの各クラスのインスタンス型を明示的に定義（any完全排除）
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

// FastAPI (/ocean/range/) から返ってくる海洋データ1件分の型
// schemas.py の OceanDataResponse に対応
interface OceanDataPoint {
  id: number;
  latitude: number;
  longitude: number;
  record_timestamp: string; // ISO日時文字列
  sst: number | null;         // 水温(℃)
  cha: number | null;         // クロロフィルa濃度
  current_speed: number | null;
  current_direction: number | null;
}

export default function HeatmapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null); 
  const heatmapLayerRef = useRef<GoogleHeatmapLayerInstance | null>(null);
  const currentLocationMarkerRef = useRef<GoogleMarkerInstance | null>(null);

  // 取得対象データの初期表示日（2026年5月1日固定：FastAPIから取得するのが2026年5月のデータのため）
  const initDate = new Date(2026, 4, 1); // 月は0始まりなので 4 = 5月
  const initHour = 0;

  // --- 状態管理 (State) ---
  const [baseDate, setBaseDate] = useState<Date>(initDate); 
  const [currentProgress, setCurrentProgress] = useState<number>(initHour); 
  const [isPlaying, setIsPlaying] = useState<boolean>(false); 
  
  // ミニカレンダー用の状態
  const [showMiniCalendar, setShowMiniCalendar] = useState<boolean>(false);
  const [calYear, setCalYear] = useState<number>(initDate.getFullYear());
  const [calMonth, setCalMonth] = useState<number>(initDate.getMonth()); 

  // 右側サイドパネルの開閉状態
  const [showMarinePanel, setShowMarinePanel] = useState<boolean>(true);
  const [showFishPanel, setShowFishPanel] = useState<boolean>(true);

  // ログインモーダルの表示・非表示状態
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);

  // Windy風右側メニューの開閉状態
  const [showWindyMenu, setShowWindyMenu] = useState<boolean>(false);

  // --- 海洋データ(FastAPI /ocean/range/)関連の状態 ---
  // 2026年5月全期間のデータを取得し、時間で絞り込まず「まとめて」ヒートマップに表示する
  // (将来的にタイムラインと連動させたくなったら、ここをoceanBucketsRef方式に戻せばよい)
  const oceanPointsRef = useRef<OceanDataPoint[]>([]);
  const [oceanLoading, setOceanLoading] = useState<boolean>(true);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const [oceanDataVersion, setOceanDataVersion] = useState<number>(0); // データ取得完了を検知して再描画をトリガーするためのカウンタ
  const [oceanPointCount, setOceanPointCount] = useState<number>(0); // 取得件数(画面表示用)
  const [sstRange, setSstRange] = useState<{ min: number; max: number } | null>(null); // 現在表示中データのSST最小・最大値（凡例表示用）
  const [mapReady, setMapReady] = useState<boolean>(false); // Google Map & HeatmapLayerの初期化完了フラグ

  // 現在選択されている「日（0〜6）」と「時間（0〜23）」を計算
  const currentDayIndex = Math.floor(currentProgress / 24);
  const currentHour = currentProgress % 24;

  // currentDayIndex / currentHour は上で計算済み

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
    return days; // setTimelineDaysの代わりにreturnする
  }, [baseDate]);

  // 超なめらかアニメーション
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentProgress((prev) => (prev + 1) % 168); 
      }, 50); 
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying]);

  // ヒートマップの座標データ(実データ: sst=水温)を生成してレイヤーに反映する共通関数
  // ※ 地図初期化完了時(mapReady)と、海洋データ取得完了時(oceanDataVersion)の両方から呼び出す
  // 5月全期間のデータをまとめて表示するので、時刻による絞り込みは行わない
  const updateHeatmapData = useCallback(() => {
    if (!heatmapLayerRef.current || typeof window === 'undefined' || !window.google) return;

    const google = window.google;
    const allPoints = oceanPointsRef.current;

    // sstがnullの地点は除外し、weight(重み)にsst(水温)をそのまま使用
    const points = allPoints
      .filter((p) => p.sst !== null && p.sst !== undefined)
      .map((p) => ({
        location: new google.maps.LatLng(p.latitude, p.longitude),
        weight: p.sst as number,
      }));

    heatmapLayerRef.current.setData(points);

    if (points.length > 0) {
      const weights = points.map((p) => p.weight);
      const min = Math.min(...weights);
      const max = Math.max(...weights);
      setSstRange({ min, max });
      // 水温の実際の値域(通常十数〜30℃程度)に合わせてmaxIntensityを動的に調整し、
      // 見た目の濃淡が水温の高低を反映するようにする
      heatmapLayerRef.current.setOptions({ maxIntensity: max, radius: 40 });
    } else {
      setSstRange(null);
    }
  }, []);

  // マップ準備完了、または海洋データ取得完了のたびにヒートマップを再描画する
  useEffect(() => {
    if (!mapReady) return;
    updateHeatmapData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, oceanDataVersion, updateHeatmapData]);

  // 2026年5月の海洋データをFastAPI経由(Next.jsのAPIルート/api/ocean)で一括取得
  useEffect(() => {
    let cancelled = false;

    async function fetchOceanData() {
      setOceanLoading(true);
      setOceanError(null);
      try {
        const start = '2026-05-01T00:00:00';
        const end = '2026-05-31T23:59:59';
        const res = await fetch(
          `/api/ocean?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(end)}`
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

  // 初回の地図初期化
  useEffect(() => {
    const scriptId = 'google-maps-script';
    const script = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (!script) {
      const newScript = document.createElement('script');
      newScript.id = scriptId;
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
      newScript.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`;
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
        center: { lat: 34.350, lng: 136.870 },
        zoom: 12,
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
        radius: 12,
        opacity: 0.85,
        maxIntensity: 1000
      });

      // HeatmapLayer生成完了をstateで通知 → 上のuseEffectが検知して
      // その時点で選択されている日時のヒートマップデータを描画する
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
          position: { lat: 34.340, lng: 136.885 },
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
          position: { lat: 34.320, lng: 136.910 },
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
        },
        {
          position: { lat: 34.310, lng: 136.905 },
          title: 'ヒラメ・カレイホットスポット',
          content: `
            <div class="info-window-content">
                <h3 style="margin: 0 0 16px 0; font-size: 34px; color: #333; border-bottom: 2px solid #ccc; padding-bottom: 8px; font-weight: bold;">ヒラメ・カレイ漁獲可</h3>
                <ul style="margin: 0; padding-left: 36px; font-size: 28px; color: #333; list-style-type: disc;">
                    <li style="margin-bottom: 8px;">マヒラメ（着底多数検知）</li>
                    <li style="margin-bottom: 8px;">マコガレイ（好漁場）</li>
                    <li style="margin-bottom: 8px;">うつぼ（一部混在）</li>
                </ul>
            </div>
          `,
          initialOpen: false,
          icon: getCustomIcon('https://maps.google.com/mapfiles/ms/icons/yellow-dot.png')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- カレンダー生成用ロジック ---
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
        (error) => {
          alert('位置情報の取得に失敗しました。ブラウザの位置情報許可を確認してください。');
          console.error(error);
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
            <button className="btn-login" onClick={() => setShowLoginModal(true)} style={{ background: '#888', color: 'white', border: 'none', padding: '16px 32px', borderRadius: '40px', fontSize: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>account_circle</span> ログイン
            </button>
            <button className="btn-menu" onClick={() => setShowWindyMenu(true)} style={{ background: 'white', border: '1px solid #ccc', borderRadius: '50%', width: '80px', height: '80px', color: '#333', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>menu</span>
            </button>
          </div>

          {/* 右側レイヤー切り替えメニュー */}
          <div className="right-sidebar" style={{ position: 'absolute', top: '140px', right: '30px', display: 'flex', flexDirection: 'column', gap: '24px', pointerEvents: 'auto' }}>
            
            {/* 海況状況パネル */}
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

            {/* 魚種分布パネル */}
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

          {/* 左下スライダー（凡例：水温 sst の実際の値域を表示） */}
          <div className="slider-container" style={{ position: 'absolute', bottom: '290px', left: '30px', background: '#888', color: 'white', borderRadius: '30px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '20px', fontSize: '28px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'auto' }}>
            <span>{sstRange ? `${sstRange.min.toFixed(1)}℃` : '低'}</span>
            <div className="slider-bar" style={{ width: '240px', height: '20px', background: 'linear-gradient(to right, rgba(0,0,255,1), rgba(0,255,255,1), rgba(0,255,0,1), rgba(255,255,0,1), rgba(255,165,0,1), rgba(255,0,0,1))', borderRadius: '10px' }}></div>
            <span>{sstRange ? `${sstRange.max.toFixed(1)}℃` : '高'}</span>
          </div>

          {/* 海洋データ(FastAPI)の取得状況表示 */}
          {(oceanLoading || oceanError) && (
            <div style={{ position: 'absolute', top: '30px', left: '30px', background: oceanError ? '#c62828' : '#555', color: 'white', padding: '16px 28px', borderRadius: '30px', fontSize: '24px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', pointerEvents: 'none' }}>
              {oceanError ? `海洋データ取得エラー: ${oceanError}` : '2026年5月の海洋データを読み込み中...'}
            </div>
          )}
          {!oceanLoading && !oceanError && oceanPointCount > 0 && (
            <div style={{ position: 'absolute', top: '30px', left: '30px', background: 'rgba(0,0,0,0.55)', color: 'white', padding: '10px 22px', borderRadius: '30px', fontSize: '20px', pointerEvents: 'none' }}>
              2026年5月の海洋データ {oceanPointCount.toLocaleString()}件を表示中(水温ヒートマップ)
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
                      setCurrentProgress(idx * 24 + currentHour); 
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
                                  setCurrentProgress(currentHour); 
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

            {/* 下段：シークバー ＆ 現在時間表示 */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input 
                type="range" 
                min="0" 
                max="167" 
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
                選択時刻: <span style={{ color: '#ffdd55' }}>{currentHour < 10 ? `0${currentHour}` : currentHour}:00</span>
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

          {/* 中央のログインモーダル */}
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
                  background: 'white', borderRadius: '32px', padding: '48px', width: '560px', boxShadow: '0 12px 36px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '28px', color: '#333', position: 'relative', boxSizing: 'border-box'
                }}
              >
                {/* ↓↓↓ ここの justify.Content を justifyContent に修正しました！ ↓↓↓ */}
                <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '44px' }}>close</span>
                </button>
                <h2 style={{ fontSize: '44px', fontWeight: 'bold', textAlign: 'center', margin: '10px 0 0 0', color: '#111' }}>ログイン</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '24px', fontWeight: 'bold', color: '#555' }}>メールアドレス または ID</label>
                  <input type="text" placeholder="example@email.com" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '2px solid #ccc', fontSize: '24px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '24px', fontWeight: 'bold', color: '#555' }}>パスワード</label>
                  <input type="password" placeholder="パスワードを入力" style={{ width: '100%', padding: '18px', borderRadius: '16px', border: '2px solid #ccc', fontSize: '24px', boxSizing: 'border-box', outline: 'none' }} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <a href="#forgot" style={{ fontSize: '22px', color: '#0044cc', textDecoration: 'none', fontWeight: '500' }}>ID・パスワードをお忘れの方</a>
                </div>
                <button style={{ width: '100%', background: '#0044cc', color: 'white', border: 'none', padding: '20px', borderRadius: '16px', fontSize: '28px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,68,204,0.3)' }}>ログイン</button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
                  <div style={{ flex: 1, height: '2px', backgroundColor: '#eee' }}></div>
                  <span style={{ fontSize: '22px', color: '#999' }}>または</span>
                  <div style={{ flex: 1, height: '2px', backgroundColor: '#eee' }}></div>
                </div>
                <button style={{ width: '100%', background: 'white', color: '#333', border: '2px solid #ddd', padding: '18px', borderRadius: '16px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxSizing: 'border-box' }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
                    <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.315 1.886-2.135 5.542-6.887 5.542-4.09 0-7.43-3.39-7.43-7.57s3.34-7.57 7.43-7.57c2.33 0 3.89 1.01 4.78 1.87l3.24-3.14C18.16 1.57 15.42 1 12.24 1 6.03 1 1 6.03 1 12.24s5.03 11.24 11.24 11.24c6.48 0 10.79-4.56 10.79-10.97 0-.74-.08-1.3-.18-1.77H12.24z"/>
                  </svg>
                  Googleでログイン
                </button>
                <div style={{ textAlign: 'center', marginTop: '12px', borderTop: '2px solid #eee', paddingTop: '24px' }}>
                  <span style={{ fontSize: '24px', color: '#666' }}>アカウントをお持ちでないですか？</span>
                  <div style={{ marginTop: '10px' }}>
                    <a href="#register" style={{ fontSize: '26px', color: '#0044cc', textDecoration: 'none', fontWeight: 'bold' }}>新規会員登録はこちら</a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Windy風 右スライドインメニュー */}
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>ACCOUNT</div>
                <button onClick={() => { setShowWindyMenu(false); setShowLoginModal(true); }} style={{ width: '100%', background: '#333', border: '1px solid #444', padding: '20px', borderRadius: '12px', color: 'white', fontSize: '26px', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#0044cc' }}>verified_user</span> プレミアムプランを試す
                </button>
              </div>

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '26px', color: '#ccc' }}>
                    <span>レイヤーの不透明度</span>
                    <span>85%</span>
                  </div>
                  <input type="range" min="10" max="100" defaultValue="85" style={{ width: '100%', accentColor: '#0044cc', background: '#444', height: '8px', borderRadius: '4px' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>SETTINGS</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '26px',cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '28px', height: '28px', accentColor: '#0044cc' }} /> 漁場ピンの名前を常に表示
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '26px', cursor: 'pointer' }}>
                  <input type="checkbox" style={{ width: '28px', height: '28px', accentColor: '#0044cc' }} /> グリッド（緯度経度線）を表示
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '26px', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ width: '28px', height: '28px', accentColor: '#0044cc' }} /> 12時間表記（AM/PM表示に変更）
                </label>
              </div>
            </div>

            <div style={{ padding: '24px 32px', borderTop: '1px solid #444', fontSize: '22px', color: '#666', textAlign: 'center', background: '#1a1a1a' }}>
              海況データビューアー v2.4.0
            </div>
          </div>

        </div>
      </div>
    </>
  );
}