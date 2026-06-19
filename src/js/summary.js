class SummaryPanel {
  constructor(stateManager) {
    this.sm = stateManager;
    
    // Bind DOM Card Elements
    this.titleScopeEl = document.getElementById("summary-title-scope");
    this.activeVillagesCountEl = document.getElementById("active-villages-count");
    
    this.cards = {
      penduduk: document.getElementById("metric-penduduk"),
      kk: document.getElementById("metric-kk"),
      nelayan: document.getElementById("metric-nelayan"),
      kapal: document.getElementById("metric-kapal"),
      alat_tangkap: document.getElementById("metric-alat-tangkap"),
      kelompok: document.getElementById("metric-kelompok"),
      infrastruktur: document.getElementById("metric-infrastruktur"),
      umkm: document.getElementById("metric-umkm")
    };

    // Initialize Card Click Events (Drill-down)
    this.initCardClicks();

    // Subscribe to state updates
    this.sm.subscribe("stateChanged", (state) => this.onStateChanged(state));
  }

  initCardClicks() {
    const cardElements = document.querySelectorAll(".metric-card");
    cardElements.forEach(card => {
      card.addEventListener("click", () => {
        const tabTarget = card.getAttribute("data-drill");
        if (tabTarget) {
          this.sm.setActiveTab(tabTarget);
        }
      });
    });
  }

  formatNumber(val) {
    if (val === undefined || val === null || isNaN(val)) return "0";
    return val.toLocaleString("id-ID");
  }

  updateMetrics(state) {
    let targetData = state.filteredData;

    // Update summary title scope and isolate data if a village is selected
    if (state.selectedVillageId && state.rawData && state.rawData.wilayah[state.selectedVillageId]) {
      const vName = state.rawData.wilayah[state.selectedVillageId].desa;
      this.titleScopeEl.innerText = `Desa ${vName}`;
      targetData = [state.rawData.wilayah[state.selectedVillageId]];
    } else {
      const count = state.filteredData.length;
      this.titleScopeEl.innerText = `${count} Desa`;
    }

    const metrics = DataManager.getAggregatedMetrics(targetData, state.rawData);

    // Update active villages count badge on top of map
    this.activeVillagesCountEl.innerText = `${state.filteredData.length} desa sesuai filter`;

    // Write metric numbers to cards
    this.cards.penduduk.innerText = this.formatNumber(metrics.penduduk);
    this.cards.kk.innerText = this.formatNumber(metrics.kk);
    this.cards.nelayan.innerText = this.formatNumber(metrics.nelayan);
    this.cards.kapal.innerText = this.formatNumber(metrics.kapal);
    this.cards.alat_tangkap.innerText = this.formatNumber(metrics.alat_tangkap);
    this.cards.kelompok.innerText = this.formatNumber(metrics.kelompok);
    this.cards.infrastruktur.innerText = this.formatNumber(metrics.infrastruktur);
    this.cards.umkm.innerText = this.formatNumber(metrics.umkm);
  }

  onStateChanged(state) {
    this.updateMetrics(state);
  }
}
