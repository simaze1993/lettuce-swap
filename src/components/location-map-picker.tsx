import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fuzzCoord } from "@/lib/countries";

const pinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const last = useRef<string>("");
  useEffect(() => {
    const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
    if (key !== last.current) {
      last.current = key;
      map.setView([lat, lng], map.getZoom() < 11 ? 12 : map.getZoom());
    }
  }, [lat, lng, map]);
  return null;
}

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(fuzzCoord(e.latlng.lat), fuzzCoord(e.latlng.lng));
    },
  });
  return null;
}

export function LocationMapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : [48.8566, 2.3522];
  return (
    <div className="h-64 w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={center}
        zoom={lat != null ? 12 : 4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onPick={onChange} />
        {lat != null && lng != null && (
          <>
            <Recenter lat={lat} lng={lng} />
            <Marker
              position={[lat, lng]}
              icon={pinIcon}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const p = m.getLatLng();
                  onChange(fuzzCoord(p.lat), fuzzCoord(p.lng));
                },
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
