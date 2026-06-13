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

    // Chart.js instances
    this.genderChart = null;
    this.sosekChart = null;

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
    const metrics = DataManager.getAggregatedMetrics(state.filteredData, state.rawData);

    // Update summary title scope
    if (state.selectedVillageId && state.rawData && state.rawData.wilayah[state.selectedVillageId]) {
      const vName = state.rawData.wilayah[state.selectedVillageId].desa;
      this.titleScopeEl.innerText = `Desa ${vName}`;
    } else {
      const count = state.filteredData.length;
      this.titleScopeEl.innerText = `${count} Desa`;
    }

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

    // Update charts
    this.updateCharts(metrics);
  }

  updateCharts(metrics) {
    // 1. Gender Composition Chart (Doughnut)
    const genderCtx = document.getElementById("chart-gender").getContext("2d");
    const genderData = [metrics.gender.laki_laki, metrics.gender.perempuan];
    const totalGender = metrics.gender.laki_laki + metrics.gender.perempuan;

    if (this.genderChart) {
      this.genderChart.data.datasets[0].data = genderData;
      this.genderChart.update();
    } else {
      this.genderChart = new Chart(genderCtx, {
        type: "doughnut",
        data: {
          labels: ["Laki-laki", "Perempuan"],
          datasets: [{
            data: genderData,
            backgroundColor: ["#0f4c5c", "#e36414"],
            borderWidth: 2,
            borderColor: "#ffffff"
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 12,
                font: { size: 10, family: "Inter" }
              }
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const val = context.raw;
                  const pct = totalGender > 0 ? ((val / totalGender) * 100).toFixed(1) : 0;
                  return ` ${context.label}: ${this.formatNumber(val)} jiwa (${pct}%)`;
                }
              }
            }
          },
          cutout: "60%"
        }
      });
    }

    // 2. Socioeconomic Chart (Horizontal Bar)
    const sosekCtx = document.getElementById("chart-sosek").getContext("2d");
    const sosekData = [
      metrics.se_composition.nelayan,
      metrics.se_composition.pembudidaya,
      metrics.se_composition.pengolah,
      metrics.se_composition.umkm,
      metrics.se_composition.wisata
    ];

    if (this.sosekChart) {
      this.sosekChart.data.datasets[0].data = sosekData;
      this.sosekChart.update();
    } else {
      this.sosekChart = new Chart(sosekCtx, {
        type: "bar",
        data: {
          labels: ["Nelayan", "Pembudidaya", "Pengolah/Pemasar", "UMKM", "Pelaku Wisata"],
          datasets: [{
            data: sosekData,
            backgroundColor: "#00b4d8",
            borderRadius: 4,
            barThickness: 12
          }]
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ` ${this.formatNumber(context.raw)} Orang`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { size: 9, family: "Inter" } }
            },
            y: {
              grid: { display: false },
              ticks: { font: { size: 9, family: "Inter" } }
            }
          }
        }
      });
    }
  }

  onStateChanged(state) {
    this.updateMetrics(state);
  }
}
