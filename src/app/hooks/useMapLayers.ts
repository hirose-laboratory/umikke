import { useEffect, useRef, useCallback } from 'react';
import { OceanDataPoint, EDnaDataPoint, Hotpoint, GoogleHeatmapLayerInstance, GoogleMarkerInstance, GoogleInfoWindowInstance } from '../types/google-maps';
export function useMapLayers(
  mapInstance: any,
  mapReady: boolean,
  selectedFullDate: Date,
  oceanPointsRef: React.MutableRefObject<OceanDataPoint[]>,
  eDnaPointsRef: React.MutableRefObject<EDnaDataPoint[]>,
  heatmapType: 'ocean' | 'edna',
  dataVersion: number
) {
  const heatmapLayerRef = useRef<GoogleHeatmapLayerInstance | null>(null);
  const infoWindowRef = useRef<GoogleInfoWindowInstance | null>(null);
  const arrowMarkersRef = useRef<GoogleMarkerInstance[]>([]);

  // 初期化
  useEffect(() => {
    if (!mapReady || typeof window === 'undefined' || !window.google || !mapInstance) return;
    
    heatmapLayerRef.current = new window.google.maps.visualization.HeatmapLayer({
      data: [], map: mapInstance, radius: 15, opacity: 0.85
    });
    infoWindowRef.current = new window.google.maps.InfoWindow({ maxWidth: 450 });

    return () => {
      if (heatmapLayerRef.current) heatmapLayerRef.current.setMap(null);
    };
  }, [mapReady, mapInstance]);

  // レイヤー更新（ヒートマップ切り替え ＆ 流向流速の矢印表示）
  const updateLayers = useCallback(() => {
    if (!heatmapLayerRef.current || !window.google || !mapInstance) return;

    const targetYear = selectedFullDate.getFullYear();
    const targetMonth = selectedFullDate.getMonth();
    const targetDateNum = selectedFullDate.getDate();

    // 矢印マーカーのクリア
    arrowMarkersRef.current.forEach(m => m.setMap(null));
    arrowMarkersRef.current = [];

    if (heatmapType === 'ocean') {
      const customGradient = [ 'rgba(0,0,0,0)', 'rgba(0,0,255,1)', 'rgba(0,255,255,1)', 'rgba(0,255,0,1)', 'rgba(255,255,0,1)', 'rgba(255,165,0,1)', 'rgba(255,0,0,1)' ];
      const todayPoints = oceanPointsRef.current.filter((p) => {
        const d = new Date(p.record_timestamp);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth && d.getDate() === targetDateNum;
      });

      // 海況ヒートマップ描画
      heatmapLayerRef.current.setData(todayPoints.map(p => ({
        location: new window.google.maps.LatLng(p.latitude, p.longitude),
        weight: Math.max(0, (p.sst || 15) - 15),
      })));
      heatmapLayerRef.current.setOptions({ gradient: customGradient, maxIntensity: 10, radius: 45 });

      todayPoints.forEach(p => {
        if (p.current_direction !== null && p.current_speed !== null) {
          const arrowMarker = new window.google.maps.Marker({
            position: { lat: p.latitude, lng: p.longitude },
            map: mapInstance,
            icon: {
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: Math.max(2, (p.current_speed??0) * 4), // 流速に応じて矢印の大きさを変える
              rotation: p.current_direction, // 流向に合わせて回転
              fillColor: 'white', fillOpacity: 0.9, strokeColor: 'black', strokeWeight: 1
            }
          });
          arrowMarkersRef.current.push(arrowMarker);
        }
      });
    } else {
      // eDNAヒートマップ描画
      const eDnaGradient = [ 'rgba(0,0,0,0)', 'rgba(128,0,128,1)', 'rgba(255,0,255,1)' ];
      const todayEDna = eDnaPointsRef.current.filter((p) => {
        const d = new Date(p.record_timestamp);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth && d.getDate() === targetDateNum;
      });
      heatmapLayerRef.current.setData(todayEDna.map(p => ({
        location: new window.google.maps.LatLng(p.latitude, p.longitude),
        weight: p.score,
      })));
      heatmapLayerRef.current.setOptions({ gradient: eDnaGradient, maxIntensity: 10, radius: 45 });
    }
  }, [selectedFullDate, heatmapType, mapInstance, oceanPointsRef, eDnaPointsRef]);

  useEffect(() => { updateLayers(); }, [updateLayers, dataVersion]);

  // ★追加: マップクリック時のポップアップテキスト
  useEffect(() => {
    if (!mapReady || !mapInstance || !window.google) return;

    const clickListener = mapInstance.addListener('click', (e: any) => {
      const clickLat = e.latLng.lat();
      const clickLng = e.latLng.lng();
      
      const targetYear = selectedFullDate.getFullYear();
      const targetMonth = selectedFullDate.getMonth();
      const targetDate = selectedFullDate.getDate();

      const todayPoints = oceanPointsRef.current.filter((p) => {
        const d = new Date(p.record_timestamp);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth && d.getDate() === targetDate;
      });

      if (todayPoints.length === 0) return;
      let nearestPoint = todayPoints[0];
      let minDistance = Number.MAX_VALUE;
      for (const p of todayPoints) {
        const dist = Math.pow(p.latitude - clickLat, 2) + Math.pow(p.longitude - clickLng, 2);
        if (dist < minDistance) { minDistance = dist; nearestPoint = p; }
      }
      if (minDistance > 0.05) return;

      const timeStr = new Date(nearestPoint.record_timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
      
      // 文章生成: 水温、流向、流速、取得時間を表示
      infoWindowRef.current?.setContent(`
        <div style="padding: 12px; color: #333; font-size: 16px;">
          <strong style="font-size: 18px; color: #0044cc;">観測ポイント詳細</strong><br/>
          <span style="font-size: 14px; color: #666;">取得時間: ${timeStr}</span><br/><br/>
          <strong>🌊 海況データ</strong><br/>
          ・水温: <b>${nearestPoint.sst?.toFixed(1) ?? '--'} ℃</b><br/>
          ・流速: <b>${nearestPoint.current_speed?.toFixed(2) ?? '--'} m/s</b><br/>
          ・流向: <b>${nearestPoint.current_direction ?? '--'} °</b><br/><br/>
          <span style="font-size: 12px; color: #999;">Lat: ${nearestPoint.latitude.toFixed(4)}, Lng: ${nearestPoint.longitude.toFixed(4)}</span>
        </div>
      `);
      infoWindowRef.current?.setPosition({ lat: nearestPoint.latitude, lng: nearestPoint.longitude });
      infoWindowRef.current?.open(mapInstance);
    });

    return () => { window.google.maps.event.removeListener(clickListener); };
  }, [mapReady, mapInstance, selectedFullDate, oceanPointsRef]);
}