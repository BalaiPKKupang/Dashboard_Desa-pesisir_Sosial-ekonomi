class MapPanel {
  constructor(stateManager) {
    this.sm = stateManager;
    this.map = null;
    this.geojsonLayer = null;
    this.markersLayer = null; // Layer group for village point markers
    this.conservationLayer = null; // External conservation GeoJSON layer
    this.layerControl = null; // Layer switcher control
    
    // Mapping from NAMA_KK to polygon colors
    this.conservationColors = {
      "KK LAUT BANDA": "#00b4d8",
      "KK KEPULAUAN ARU BAGIAN TENGGARA": "#2ec4b6",
      "DILUAR KAWASAN KONSERVASI": "#fb8500"
    };

    // Default styles
    this.defaultStyle = {
      weight: 2,
      opacity: 0.9,
      color: "#ffffff",
      dashArray: "3",
      fillOpacity: 0.6
    };

    // Initialize map
    this.initMap();
    
    // Subscribe to state updates
    this.sm.subscribe("stateChanged", () => this.onStateChanged());
    this.sm.subscribe("villageSelected", () => this.onVillageSelected());
  }

  initMap() {
    // Center map between Banda and Aru islands
    this.map = L.map("map", {
      center: [-5.8, 132.2],
      zoom: 6,
      zoomControl: true
    });

    // Basemap 1: OpenStreetMap
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });

    // Basemap 2: ESRI Satellite Imagery
    const esriSatellite = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19,
      attribution: "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
    });

    // Add default basemap
    osm.addTo(this.map);

    // Layer control
    const baseMaps = {
      "OpenStreetMap": osm,
      "ESRI Satellite": esriSatellite
    };
    this.layerControl = L.control.layers(baseMaps, null, { position: "topright" }).addTo(this.map);

    // Add Legend
    this.addLegend();
  }

  addLegend() {
    const legend = L.control({ position: "bottomleft" });
    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "info legend");
      div.innerHTML = '<h4>Kawasan Konservasi</h4>';
      for (const [key, color] of Object.entries(this.conservationColors)) {
        const label = key === "DILUAR KAWASAN KONSERVASI" ? "Luar Kawasan" : key.replace("KK ", "KK ");
        div.innerHTML += `<i style="background:${color}"></i> ${label}<br>`;
      }
      return div;
    };
    legend.addTo(this.map);
  }

  renderPolygons() {
    if (this.geojsonLayer) {
      this.map.removeLayer(this.geojsonLayer);
    }

    const geojsonData = this.sm.state.geojsonData;
    const filteredData = this.sm.state.filteredData;
    const selectedId = this.sm.state.selectedVillageId;

    if (!geojsonData) return;

    // Create a dictionary of village coordinates/IDs from rawData
    const vilDict = {};
    if (this.sm.state.rawData && this.sm.state.rawData.wilayah) {
      Object.entries(this.sm.state.rawData.wilayah).forEach(([id, info]) => {
        vilDict[info.desa.toLowerCase()] = { id_desa: id, ...info };
      });
    }

    // Filter GeoJSON features to match active filteredData
    const activeIds = filteredData.map(v => v.id_desa);

    this.geojsonLayer = L.geoJSON(geojsonData, {
      filter: (feature) => {
        const name = feature.properties.NAMOBJ.toLowerCase();
        const info = vilDict[name];
        return info && activeIds.includes(info.id_desa);
      },
      style: (feature) => {
        const name = feature.properties.NAMOBJ.toLowerCase();
        const info = vilDict[name];
        
        let fillColor = "#6c757d"; // Fallback grey
        if (info && info.nama_kk) {
          fillColor = this.conservationColors[info.nama_kk] || fillColor;
        }

        const isSelected = info && info.id_desa === selectedId;

        return {
          ...this.defaultStyle,
          fillColor: fillColor,
          weight: isSelected ? 4 : 2,
          color: isSelected ? "#e36414" : "#ffffff", // Highlighting border for selected village
          fillOpacity: isSelected ? 0.85 : 0.6
        };
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.NAMOBJ;
        const info = vilDict[name.toLowerCase()];

        // Tooltip hover
        layer.bindTooltip(`<strong>Desa ${name}</strong><br>${info ? info.kecamatan : ""}`, {
          direction: "top",
          sticky: true,
          className: "leaflet-tooltip-custom"
        });

        // Click interaction
        layer.on({
          mouseover: (e) => {
            const l = e.target;
            if (info && info.id_desa !== this.sm.state.selectedVillageId) {
              l.setStyle({ fillOpacity: 0.8, weight: 3 });
            }
          },
          mouseout: (e) => {
            const l = e.target;
            if (info && info.id_desa !== this.sm.state.selectedVillageId) {
              this.geojsonLayer.resetStyle(l);
            }
          },
          click: (e) => {
            if (info) {
              L.DomEvent.stopPropagation(e);
              this.sm.selectVillage(info.id_desa);
            }
          }
        });
      }
    }).addTo(this.map);

    // Zoom maps to fit polygons
    this.fitMapBounds();
  }

  // Render Circle Markers for all filtered villages based on MASTER WILAYAH coordinates
  renderMarkers() {
    if (this.markersLayer) {
      this.map.removeLayer(this.markersLayer);
    }

    this.markersLayer = L.layerGroup().addTo(this.map);
    
    const filteredData = this.sm.state.filteredData;
    const selectedId = this.sm.state.selectedVillageId;

    filteredData.forEach(village => {
      const lat = parseFloat(village.latitude);
      const lng = parseFloat(village.longitude);

      if (!isNaN(lat) && !isNaN(lng)) {
        const isSelected = village.id_desa === selectedId;
        const color = this.conservationColors[village.nama_kk] || "#6c757d";

        // Circle marker for modern aesthetics
        const marker = L.circleMarker([lat, lng], {
          radius: isSelected ? 9 : 6,
          fillColor: color,
          color: isSelected ? "#e36414" : "#ffffff",
          weight: isSelected ? 3 : 1.5,
          opacity: 1,
          fillOpacity: 0.9,
          zIndexOffset: isSelected ? 1000 : 0
        });

        // Bind custom tooltip
        marker.bindTooltip(`
          <div style="font-family: 'Inter', sans-serif; font-size: 0.8rem; line-height: 1.4;">
            <strong>Desa ${village.desa}</strong><br>
            Kec. ${village.kecamatan}<br>
            Kab. ${village.kabupaten}<br>
            <span style="font-size: 0.7rem; color: #777;">Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}</span>
          </div>
        `, {
          direction: "top",
          offset: [0, -5]
        });

        // Click action
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          this.sm.selectVillage(village.id_desa);
        });

        marker.addTo(this.markersLayer);
      }
    });
  }

  fitMapBounds() {
    if (this.geojsonLayer && this.geojsonLayer.getLayers().length > 0) {
      this.map.fitBounds(this.geojsonLayer.getBounds(), {
        padding: [30, 30],
        maxZoom: 13
      });
    }
  }

  onStateChanged() {
    // Invalidate map size to correct for Grid/Flex height adjustments
    setTimeout(() => {
      this.map.invalidateSize();
    }, 100);

    this.renderConservationAreas();
    this.renderPolygons();
    this.renderMarkers();
  }

  onVillageSelected() {
    const selectedId = this.sm.state.selectedVillageId;
    
    // Invalidate size to ensure clean centering
    this.map.invalidateSize();

    // Reset styles on all layers and highlight selected one
    if (this.geojsonLayer) {
      this.geojsonLayer.eachLayer((layer) => {
        const name = layer.feature.properties.NAMOBJ.toLowerCase();
        const id_desa = this.getVillageIdByName(name);
        
        if (id_desa === selectedId) {
          layer.setStyle({
            weight: 4,
            color: "#e36414",
            fillOpacity: 0.85
          });
          layer.bringToFront();
          
          this.map.fitBounds(layer.getBounds(), {
            padding: [50, 50],
            maxZoom: 13,
            animate: true,
            duration: 1
          });
        } else {
          this.geojsonLayer.resetStyle(layer);
        }
      });
    }

    // Redraw markers to highlight selected circle
    this.renderMarkers();
  }

  getVillageIdByName(name) {
    if (this.sm.state.rawData && this.sm.state.rawData.wilayah) {
      const match = Object.values(this.sm.state.rawData.wilayah).find(v => v.desa.toLowerCase() === name.toLowerCase());
      return match ? match.id_desa : null;
    }
    return null;
  }

  // Render external conservation areas as a background overlay with custom styles and tooltip
  renderConservationAreas() {
    // Return early if already rendered or if data is not available yet
    if (this.conservationLayer) return;

    const data = this.sm.state.conservationGeojsonData;
    if (!data) return;

    // Create a custom Leaflet pane with a lower z-index than the default overlayPane (which has z-index 400).
    // This places the conservation area polygons underneath the village boundaries, preventing them from blocking clicks/hovers.
    if (!this.map.getPane('conservationPane')) {
      const pane = this.map.createPane('conservationPane');
      pane.style.zIndex = 350;
    }

    // Color mapper based on ZONE attribute
    const getZoneColor = (zone) => {
      if (!zone) return "#118ab2";
      const z = zone.toLowerCase();
      if (z.includes("inti")) return "#ef476f"; // Coral Red
      if (z.includes("pemanfaatan terbatas") || z.includes("terbatas")) return "#06d6a0"; // Mint Green
      return "#118ab2"; // Teal/Blue for others
    };

    // Construct the GeoJSON layer
    this.conservationLayer = L.geoJSON(data, {
      pane: 'conservationPane',
      style: (feature) => {
        const zone = feature.properties.ZONE;
        return {
          color: getZoneColor(zone),
          weight: 1.5,
          opacity: 0.8,
          dashArray: "4, 4", // dashed boundaries
          fillColor: getZoneColor(zone),
          fillOpacity: 0.25
        };
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const name = props.NKK || "Kawasan Konservasi";
        const nzKk = props.NZ_KK || "-";
        const areaSize = props.LS_ZONA ? parseFloat(props.LS_ZONA).toLocaleString('id-ID', { maximumFractionDigits: 2 }) : "-";

        layer.bindTooltip(`
          <div style="font-family: 'Inter', sans-serif; font-size: 0.75rem; line-height: 1.4; padding: 4px;">
            <strong style="color: #1d3557;">${name}</strong><br>
            <strong>Zona:</strong> ${nzKk}<br>
            <strong>Luas:</strong> ${areaSize} Ha
          </div>
        `, {
          direction: "top",
          sticky: true,
          className: "leaflet-tooltip-custom"
        });

        // Hover styles for background feedback
        layer.on({
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({ fillOpacity: 0.4, weight: 2 });
          },
          mouseout: (e) => {
            const l = e.target;
            this.conservationLayer.resetStyle(l);
          }
        });
      }
    }).addTo(this.map);

    // Register this layer as an overlay in Leaflet layer control
    if (this.layerControl) {
      this.layerControl.addOverlay(this.conservationLayer, "Kawasan Konservasi BPK");
    }
  }
}
