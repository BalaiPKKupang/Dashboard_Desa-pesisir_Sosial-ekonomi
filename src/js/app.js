const SPREADSHEET_ID = '1G5in7iZ43hbp-520xaAl7coe1v_GUCI3M7p_PY3evCc';

const keyMappers = {
  source: {
    "col_0": "sumber"
  },
  wilayah: {
    "DESA": "desa",
    "ID_DESA": "id_desa",
    "LATITUDE_Y": "latitude",
    "LONGITUDE_X": "longitude",
    "KECAMATAN": "kecamatan",
    "KABUPATEN": "kabupaten",
    "PROVINSI": "provinsi",
    "KETERANGAN_KK": "keterangan_kk",
    "NAMA_KK": "nama_kk"
  },
  demografi: {
    "ID_DESA": "id_desa",
    "DESA": "desa",
    "TAHUN": "tahun",
    "JUMLAH PENDUDUK LAKI LAKI": "laki_laki",
    "JUMLAH PENDUDUK PEREMPUAN": "perempuan",
    "JUMLAH PENDUDUK": "total_penduduk",
    "JUMLAH KEPALA KELUARGA": "jumlah_kk",
    "JUMLAH DUSUN": "jumlah_dusun",
    "LUAS WILAYAH (HA)": "luas_wilayah",
    "SUMBER DATA": "sumber"
  },
  sosial_ekonomi: {
    "ID_DESA": "id_desa",
    "DESA": "desa",
    "JUMLAH_PELAKU_USAHA_UMKM": "umkm",
    "JUMLAH_NELAYAN": "nelayan",
    "JUMLAH_PEMBUDIDAYA_PERIKANAN": "pembudidaya",
    "JUMLAH_PENGOLAH_DAN_PEMASAR_HASIL_PERIKANAN": "pengolah_pemasar",
    "JUMLAH_KAPAL": "kapal",
    "JUMLAH_ALAT_TANGKAP": "alat_tangkap",
    "JUMLAH_KELOMPOK": "kelompok",
    "BADAN_USAHA_MILIK_DESA": "bumdes",
    "KOPERASI_DESA_KDMP": "koperasi",
    "PERUSAHAAN_BIDANG_PERIKANAN_UPI": "upi",
    "PELAKU_USAHA_PARIWISATA_ALAM_PERAIRAN": "wisata_alam",
    "JUMLAH_WISATAWAN_DOMESTIK_MANCANEGARA": "wisatawan",
    "MASYARAKAT_ADAT": "masyarakat_adat",
    "KEARIFAN_LOKAL": "kearifan_lokal",
    "INFRASTRUKTUR_PERIKANAN": "infrastruktur",
    "SUMBER_DATA": "sumber"
  },
  data_kapal: {
    "ID_DESA": "id_desa",
    "DESA": "desa",
    "TAHUN": "tahun",
    "JENIS KAPAL": "jenis",
    "JUMLAH KAPAL": "jumlah",
    "SUMBER DATA": "sumber"
  },
  data_alat_tangkap: {
    "ID_DESA": "id_desa",
    "DESA": "desa",
    "TAHUN": "tahun",
    "JENIS ALAT TANGKAP": "jenis",
    "JUMLAH ALAT TANGKAP": "jumlah",
    "SUMBER DATA": "sumber"
  },
  data_kelompok: {
    "ID_DESA": "id_desa",
    "DESA": "desa",
    "JENIS KELOMPOK": "jenis",
    "NAMA KELOMPOK": "nama",
    "TAHUN BERDIRI": "tahun_berdiri",
    "STATUS": "status",
    "SUMBER DATA": "sumber"
  },
  data_infrastruktur: {
    "ID_DESA": "id_desa",
    "DESA": "desa",
    "TAHUN": "tahun",
    "JENIS INFRASTRUKTUR": "jenis",
    "JUMLAH": "jumlah",
    "SUMBER DATA": "sumber"
  }
};

class StateManager {
  constructor() {
    this.state = {
      filters: {
        search: '',
        provinsi: '',
        kabupaten: '',
        kecamatan: '',
        kawasan: '',
        desa: ''
      },
      selectedVillageId: null,      // ID desa terpilih (e.g. 'BAN001')
      activeTab: 'informasi_umum',  // Tab sidebar aktif
      rawData: null,               // Data desa_pesisir.json mentah
      geojsonData: null,           // Data GeoJSON mentah
      conservationGeojsonData: null, // Data GeoJSON Kawasan Konservasi eksternal
      filteredData: []             // Data setelah difilter
    };
    
    // Subscriptions dictionary
    this.listeners = {
      stateChanged: [],
      villageSelected: [],
      tabChanged: []
    };
  }

  // Register subscription callbacks
  subscribe(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  // Publish / Notify subscribers
  publish(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  // Fetch individual sheet using Google Visualization API (allows CORS)
  async fetchGoogleSheet(sheetName, sheetKey) {
    const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const res = await fetch(url);
    const text = await res.text();
    
    // Remove the google visualization wrapper response
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);
    
    const table = data.table;
    const cols = table.cols.map((c, idx) => c.label && c.label.trim() ? c.label.trim() : "col_" + idx);
    
    return table.rows.map(row => {
      const obj = {};
      row.c.forEach((cell, idx) => {
        const colHeader = cols[idx];
        if (colHeader) {
          const mappedKey = keyMappers[sheetKey][colHeader] || colHeader.toLowerCase().replace(/\s+/g, '_');
          obj[mappedKey] = (cell && cell.v !== undefined && cell.v !== null) ? cell.v : null;
        }
      });
      return obj;
    });
  }

  // Fetch all sheets from Google Sheets in parallel
  async loadDataFromGoogleSheets() {
    const sheets = [
      { name: 'MASTER WILAYAH', key: 'wilayah', type: 'object' },
      { name: 'DEMOGRAFI', key: 'demografi', type: 'array' },
      { name: 'SOSIAL EKONOMI', key: 'sosial_ekonomi', type: 'array' },
      { name: 'DATA KAPAL', key: 'data_kapal', type: 'array' }, // space in name
      { name: 'DATA ALAT TANGKAP', key: 'data_alat_tangkap', type: 'array' },
      { name: 'DATA KELOMPOK', key: 'data_kelompok', type: 'array' },
      { name: 'DATA INFRASTRUKTUR PERIKANAN', key: 'data_infrastruktur', type: 'array' },
      { name: 'MASTER SOURCE', key: 'source', type: 'array' }
    ];

    const rawData = {
      wilayah: {},
      demografi: [],
      sosial_ekonomi: [],
      data_kapal: [],
      data_alat_tangkap: [],
      data_kelompok: [],
      data_infrastruktur: [],
      source: []
    };

    const fetchPromises = sheets.map(async (sheet) => {
      const rows = await this.fetchGoogleSheet(sheet.name, sheet.key);
      if (sheet.type === 'object') {
        rows.forEach(row => {
          if (row.id_desa) {
            rawData.wilayah[row.id_desa] = row;
          }
        });
      } else {
        rawData[sheet.key] = rows;
      }
    });

    await Promise.all(fetchPromises);
    return rawData;
  }

  // Initialize and load datasets asynchronously
  async init() {
    try {
      console.log("Loading datasets from Google Sheets...");
      
      // Load live data from Google Sheet
      this.state.rawData = await this.loadDataFromGoogleSheets();
      console.log("Live Google Sheets data loaded:", this.state.rawData);
      
      // Fetch local GeoJSON data
      const geojsonRes = await fetch("src/data/Desa_Banda_KKAru.geojson");
      this.state.geojsonData = await geojsonRes.json();
      
      console.log("Data loaded successfully.");
    } catch (err) {
      console.warn("Failed to load live Google Sheets data, falling back to local JSON:", err);
      try {
        // Fetch local JSON data
        const jsonRes = await fetch("src/data/desa_pesisir.json");
        this.state.rawData = await jsonRes.json();
        
        // Fetch local GeoJSON data
        const geojsonRes = await fetch("src/data/Desa_Banda_KKAru.geojson");
        this.state.geojsonData = await geojsonRes.json();
        
        console.log("Local data loaded successfully.");
      } catch (fallbackErr) {
        console.error("Local fallback also failed:", fallbackErr);
        alert("Gagal memuat data aplikasi dari online maupun lokal.");
      }
    }
    // Render bottom sources footer
    this.renderGlobalSourceFooter();
    
    // Trigger initial filtering
    this.updateFilteredData();

    // Fetch external Conservation GeoJSON data asynchronously (non-blocking)
    this.loadExternalConservationGeoJSON();
  }

  // Load external GeoJSON in the background to prevent blocking dashboard render
  async loadExternalConservationGeoJSON() {
    try {
      console.log("Loading external Conservation GeoJSON in background...");
      const consRes = await fetch("https://balaipkkupang.github.io/Data_Kawasan_Konservasi/KKN_BPK_Kupang.geojson");
      this.state.conservationGeojsonData = await consRes.json();
      console.log("External Conservation GeoJSON loaded successfully.");
      
      // Trigger a map update by publishing stateChanged
      this.publish("stateChanged", this.state);
    } catch (consErr) {
      console.error("Failed to load external Conservation GeoJSON:", consErr);
    }
  }

  // Render the global source list at the bottom of the page
  renderGlobalSourceFooter() {
    const el = document.getElementById("footer-sources");
    if (!el) return;

    if (!this.state.rawData || !this.state.rawData.source) {
      el.style.display = "none";
      return;
    }

    // Filter out header row "Sumber" and empty elements
    const items = this.state.rawData.source
      .map(row => row.sumber)
      .filter(s => s && s.trim() && s.toLowerCase() !== "sumber");

    if (items.length === 0) {
      el.style.display = "none";
      return;
    }

    el.style.display = "block";
    el.innerHTML = `<strong>Sumber Data:</strong> ${items.join(" &bull; ")}`;
  }

  // Update filtered list based on active filters
  updateFilteredData() {
    this.state.filteredData = DataManager.filterData(this.state.rawData, this.state.filters);
    
    // If a village was selected but is no longer in the filtered subset, deselect it
    if (this.state.selectedVillageId) {
      const isStillActive = this.state.filteredData.some(v => v.id_desa === this.state.selectedVillageId);
      if (!isStillActive) {
        this.state.selectedVillageId = null;
      }
    }
    
    // Notify components
    this.publish("stateChanged", this.state);
  }

  // Update specific filters
  setFilters(newFilters) {
    this.state.filters = { ...this.state.filters, ...newFilters };
    
    // If specific cascading dropdown is cleared, clear downstream selections too
    if (newFilters.provinsi === "") {
      this.state.filters.kabupaten = "";
      this.state.filters.kecamatan = "";
      this.state.filters.desa = "";
    }
    if (newFilters.kabupaten === "") {
      this.state.filters.kecamatan = "";
      this.state.filters.desa = "";
    }
    if (newFilters.kecamatan === "") {
      this.state.filters.desa = "";
    }
    
    this.updateFilteredData();
  }

  // Reset all filters to default
  resetFilters() {
    this.state.filters = {
      search: '',
      provinsi: '',
      kabupaten: '',
      kecamatan: '',
      kawasan: '',
      desa: ''
    };
    this.state.selectedVillageId = null;
    this.updateFilteredData();
  }

  // Select a specific village (click polygon or dropdown)
  selectVillage(villageId) {
    this.state.selectedVillageId = villageId;
    
    if (villageId) {
      // If a village is selected, update the Desa filter dropdown to match
      this.state.filters.desa = villageId;
      
      // Auto-populate administrative parent filters if we have raw data
      const info = this.state.rawData.wilayah[villageId];
      if (info) {
        this.state.filters.provinsi = info.provinsi;
        this.state.filters.kabupaten = info.kabupaten;
        this.state.filters.kecamatan = info.kecamatan;
      }
    } else {
      this.state.filters.desa = "";
    }
    
    // Trigger filtering and data recalculation
    this.updateFilteredData();
    this.publish("villageSelected", villageId);
  }

  // Change active sidebar tab
  setActiveTab(tabName) {
    if (this.state.activeTab !== tabName) {
      this.state.activeTab = tabName;
      this.publish("tabChanged", tabName);
    }
  }
}

// Global state instance, initialized when index.html finishes loading
document.addEventListener("DOMContentLoaded", async () => {
  window.appStateManager = new StateManager();
  
  // Create component instances
  window.filterPanel = new FilterPanel(window.appStateManager);
  window.mapPanel = new MapPanel(window.appStateManager);
  window.sidebarNav = new SidebarNav(window.appStateManager);
  window.summaryPanel = new SummaryPanel(window.appStateManager);
  window.detailPanel = new DetailPanel(window.appStateManager);
  
  // Load data
  await window.appStateManager.init();
});
