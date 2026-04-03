import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet 기본 마커 아이콘 버그 픽스
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// 지정학 키워드
const GEO_KEYWORDS = [
  '이란', '전쟁', '지정학', '휴전', '분쟁', '제재', '러시아', '우크라이나',
  '중국', '대만', '북한', '중동', 'Gaza', 'Russia', 'China', 'Iran',
  'Ukraine', 'geopolitical', 'war', 'conflict', 'sanction'
];

// 키워드 → 지도 중심 좌표 매핑
const KEYWORD_LOCATIONS = {
  '이란': { lat: 32.4, lng: 53.7, label: '이란' },
  'Iran': { lat: 32.4, lng: 53.7, label: '이란' },
  '러시아': { lat: 55.7, lng: 37.6, label: '러시아' },
  'Russia': { lat: 55.7, lng: 37.6, label: '러시아' },
  '우크라이나': { lat: 48.3, lng: 31.2, label: '우크라이나' },
  'Ukraine': { lat: 48.3, lng: 31.2, label: '우크라이나' },
  '중국': { lat: 35.8, lng: 104.1, label: '중국' },
  'China': { lat: 35.8, lng: 104.1, label: '중국' },
  '대만': { lat: 23.7, lng: 120.9, label: '대만' },
  '북한': { lat: 40.3, lng: 127.5, label: '북한' },
  '중동': { lat: 29.3, lng: 42.5, label: '중동' },
  'Gaza': { lat: 31.5, lng: 34.4, label: 'Gaza' },
};



const isGeopolitical = (thread) => {
  if (!thread) return false;
  const text = `${thread.title} ${thread.briefing} ${thread.nodes?.map(n => n.label).join(' ')}`;
  return GEO_KEYWORDS.some(kw => text.includes(kw));
};



const getLocations = (thread) => {
  const text = `${thread.title} ${thread.briefing}`;
  const found = [];
  Object.entries(KEYWORD_LOCATIONS).forEach(([kw, loc]) => {
    if (text.includes(kw) && !found.find(f => f.label === loc.label)) {
      found.push(loc);
    }
  });
  return found.length > 0 ? found : [{ lat: 36.0, lng: 60.0, label: '중동/중앙아시아' }];
};

function GeoMap({ thread }) {
  if (!thread || !isGeopolitical(thread)) return null;

  const locations = getLocations(thread);
  const center = [locations[0].lat, locations[0].lng];

  return (
    <div className="geomap-container">
      <div className="geomap-header">
        <span className="geomap-title">🌍 지정학 지도</span>
        <span className="geomap-thread">{thread.title}</span>
      </div>
      <MapContainer
        center={center}
        zoom={4}
        style={{ height: '200px', width: '100%' }}
        zoomControl={false}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />
        {locations.map((loc, i) => (
          <Marker key={i} position={[loc.lat, loc.lng]}>
            <Popup>{loc.label}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default GeoMap;