"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function markerIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 0 6px rgba(0,0,0,0.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

export default function StaticMap({
  lat,
  lng,
  zoom = 14,
  label,
  interactive = true,
  color = "#7C3AED",
}: {
  lat: number;
  lng: number;
  zoom?: number;
  label?: string;
  interactive?: boolean;
  color?: string;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      scrollWheelZoom={interactive}
      dragging={interactive}
      zoomControl={interactive}
      touchZoom={interactive}
      doubleClickZoom={interactive}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={markerIcon(color)}>
        {label && <Popup>{label}</Popup>}
      </Marker>
    </MapContainer>
  );
}
