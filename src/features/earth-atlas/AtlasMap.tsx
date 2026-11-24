import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export type AtlasPoint = { id: string; name: string; lat: number; lon: number; value: number | null; year: number | null; norm: number | null };
export type AtlasProject = { id: string; title: string; lat: number; lon: number; status: string };

const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || "gray";

/** Browser-only map. Country centroids from the World Bank; project dots sit on their country, never an address. */
export default function AtlasMap({ points, projects, label, onSelect }: { points: AtlasPoint[]; projects: AtlasProject[]; label: string; onSelect: (id: string) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const sel = useRef(onSelect);
  sel.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      center: [15, 20],
      zoom: 1.2,
      attributionControl: { compact: true },
      style: {
        version: 8,
        sources: { base: { type: "vector", url: "https://demotiles.maplibre.org/tiles/tiles.json", attribution: "MapLibre demo tiles · World Bank" } },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": css("--void") } },
          { id: "land", type: "fill", source: "base", "source-layer": "countries", paint: { "fill-color": css("--forest") } },
          { id: "border", type: "line", source: "base", "source-layer": "countries", paint: { "line-color": css("--moss"), "line-width": 0.6 } },
        ],
      },
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      m.addSource("pts", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addSource("prj", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "nodata", type: "circle", source: "pts", filter: ["!", ["has", "norm"]], paint: { "circle-radius": 2, "circle-color": css("--lichen"), "circle-opacity": 0.35 } });
      m.addLayer({
        id: "pts", type: "circle", source: "pts", filter: ["has", "norm"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "norm"], 0, 3, 1, 13],
          "circle-color": ["interpolate", ["linear"], ["get", "norm"], 0, css("--biolume"), 1, css("--sprout")],
          "circle-opacity": 0.75, "circle-stroke-width": 0.5, "circle-stroke-color": css("--void"),
        },
      });
      m.addLayer({ id: "prj", type: "circle", source: "prj", paint: { "circle-radius": 6, "circle-color": css("--gold"), "circle-stroke-width": 2, "circle-stroke-color": css("--void") } });
      m.on("click", "pts", (e: maplibregl.MapLayerMouseEvent) => { const f = e.features?.[0]; if (f) sel.current(String(f.properties["id"])); });
      m.on("click", "prj", (e: maplibregl.MapLayerMouseEvent) => {
        const f = e.features?.[0]; if (!f) return;
        new maplibregl.Popup({ closeButton: false }).setLngLat(e.lngLat).setHTML(`<strong>${String(f.properties["title"]).replace(/</g, "&lt;")}</strong><br/><small>${f.properties["status"]} · placed at country centre</small>`).addTo(m);
      });
      for (const l of ["pts", "prj"]) { m.on("mouseenter", l, () => (m.getCanvas().style.cursor = "pointer")); m.on("mouseleave", l, () => (m.getCanvas().style.cursor = "")); }
      map.current = m;
      m.fire("data-ready");
    });
    return () => { m.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    const push = () => {
      const m = map.current; if (!m) return;
      (m.getSource("pts") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: points.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lon, p.lat] }, properties: p.norm === null ? { id: p.id } : { id: p.id, norm: p.norm } })) });
      (m.getSource("prj") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: projects.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lon, p.lat] }, properties: { title: p.title, status: p.status } })) });
    };
    if (map.current) { push(); return undefined; }
    { const t = setInterval(() => { if (map.current) { push(); clearInterval(t); } }, 200); return () => clearInterval(t); }
  }, [points, projects]);

  return <div ref={el} className="h-[60vh] min-h-[360px] w-full" role="region" aria-label={`Map: ${label}. A table with the same data follows.`} />;
}
