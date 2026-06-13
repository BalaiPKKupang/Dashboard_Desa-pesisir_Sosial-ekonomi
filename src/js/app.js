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

  // Initialize and load datasets asynchronously
  async init() {
    try {
      console.log("Loading datasets...");
      
      // Fetch JSON data
      const jsonRes = await fetch("src/data/desa_pesisir.json");
      this.state.rawData = await jsonRes.json();
      
      // Fetch GeoJSON data
      const geojsonRes = await fetch("src/data/Desa_Banda_KKAru.geojson");
      this.state.geojsonData = await geojsonRes.json();
      
      console.log("Data loaded successfully.");
      
      // Trigger initial filtering
      this.updateFilteredData();
      
    } catch (err) {
      console.error("Error loading application data:", err);
      alert("Gagal memuat data aplikasi. Silakan muat ulang halaman.");
    }
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
    
    // Notify components
    this.publish("stateChanged", this.state);
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
