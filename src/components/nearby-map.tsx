import { MapContainer, TileLayer, Marker, Circle, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const meIcon = L.divIcon({
  className: "swap-me-marker",
  html: `<div style="
    width:18px;height:18px;border-radius:9999px;
    background:#16a34a;
    border:3px solid #fff;
    box-shadow:0 0 0 2px rgba(0,0,0,.15);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

export type MapMember = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city: string;
  km?: number;
  matchScore?: number;
};

export function NearbyMap({
  center,
  others,
  radiusKm,
  onStartSwap,
}: {
  center: { lat: number; lng: number };
  others: MapMember[];
  radiusKm: number;
  onStartSwap?: (m: MapMember) => void;
}) {
  // Zoom approximation that fits the radius nicely
  const zoom = radiusKm <= 10 ? 12 : radiusKm <= 25 ? 11 : radiusKm <= 50 ? 10 : 9;

  return (
    <MapContainer
      key={`${center.lat.toFixed(2)}_${center.lng.toFixed(2)}_${radiusKm}`}
      center={[center.lat, center.lng]}
      zoom={zoom}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Circle
        center={[center.lat, center.lng]}
        radius={radiusKm * 1000}
        pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 0.08 }}
      />
      <Marker position={[center.lat, center.lng]} icon={meIcon}>
        <Popup>You are here (approx.)</Popup>
      </Marker>

      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={50}>
        {others.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={defaultIcon}>
            <Popup>
              <div style={{ minWidth: 160 }}>
                <strong>{m.name}</strong>
                {(m.city || m.km != null) && (
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>
                    {m.city}
                    {m.km != null ? ` · ${m.km.toFixed(1)} km` : ""}
                  </div>
                )}
                {m.matchScore != null && m.matchScore > 0 && (
                  <div style={{ fontSize: 12, color: "#16a34a", marginTop: 2 }}>
                    {m.matchScore} shared categor{m.matchScore === 1 ? "y" : "ies"}
                  </div>
                )}
                {onStartSwap && (
                  <button
                    onClick={() => onStartSwap(m)}
                    style={{
                      marginTop: 8,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "#16a34a",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    Start swap
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
