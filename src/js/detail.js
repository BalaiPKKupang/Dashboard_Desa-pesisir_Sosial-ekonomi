class DetailPanel {
  constructor(stateManager) {
    this.sm = stateManager;
    
    // Bind DOM Elements
    this.panelTitleEl = document.getElementById("detail-panel-title");
    this.scopeTextEl = document.getElementById("selected-scope-text");
    this.contentEl = document.getElementById("detail-panel-content");
    
    // Track active chart instance to destroy before redraw
    this.detailChart = null;

    // Subscribe to events
    this.sm.subscribe("stateChanged", () => this.render());
    this.sm.subscribe("tabChanged", () => this.render());
  }

  // Helper to get active village IDs in current scope
  getActiveVillageIds(state) {
    if (state.selectedVillageId) {
      return [state.selectedVillageId];
    }
    return state.filteredData.map(v => v.id_desa);
  }

  formatNumber(val) {
    if (val === undefined || val === null || isNaN(val)) return "-";
    return val.toLocaleString("id-ID");
  }

  render() {
    const state = this.sm.state;
    if (!state.rawData) return;

    const activeIds = this.getActiveVillageIds(state);
    const tab = state.activeTab;

    // Destroy existing chart if any
    if (this.detailChart) {
      this.detailChart.destroy();
      this.detailChart = null;
    }

    // Update Scope Title
    if (state.selectedVillageId && state.rawData.wilayah[state.selectedVillageId]) {
      const v = state.rawData.wilayah[state.selectedVillageId];
      this.scopeTextEl.innerText = `Desa: ${v.desa} (${v.kabupaten})`;
    } else {
      this.scopeTextEl.innerText = `Cakupan: ${state.filteredData.length} Desa`;
    }

    // Render based on Tab
    switch (tab) {
      case "informasi_umum":
        this.renderInformasiUmum(state, activeIds);
        break;
      case "demografi":
        this.renderDemografi(state, activeIds);
        break;
      case "sosial_ekonomi":
        this.renderSosialEkonomi(state, activeIds);
        break;
      case "kapal":
        this.renderKapal(state, activeIds);
        break;
      case "alat_tangkap":
        this.renderAlatTangkap(state, activeIds);
        break;
      case "kelompok":
        this.renderKelompok(state, activeIds);
        break;
      case "infrastruktur":
        this.renderInfrastruktur(state, activeIds);
        break;
      default:
        this.contentEl.innerHTML = `<p class="empty-state">Tab tidak dikenali.</p>`;
    }
  }

  // Tab 1: Informasi Umum
  renderInformasiUmum(state, activeIds) {
    this.panelTitleEl.innerHTML = `<i class="fa-solid fa-circle-info"></i> Informasi Umum`;
    
    // Skenario A: Single Village Selected
    if (state.selectedVillageId && state.rawData.wilayah[state.selectedVillageId]) {
      const v = state.rawData.wilayah[state.selectedVillageId];
      const se = state.rawData.sosial_ekonomi.find(x => x.id_desa === v.id_desa) || {};
      const demo = state.rawData.demografi.find(x => x.id_desa === v.id_desa && x.tahun === 2025) || {};

      this.contentEl.innerHTML = `
        <div class="detail-grid-cards" style="margin-bottom: 20px;">
          <div class="info-profile-card">
            <span class="profile-card-lbl">Kecamatan</span>
            <span class="profile-card-val" style="font-size: 1.15rem;">${v.kecamatan}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">Kabupaten</span>
            <span class="profile-card-val" style="font-size: 1.15rem;">${v.kabupaten}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">Kawasan Konservasi</span>
            <span class="profile-card-val" style="font-size: 1.05rem; color: var(--accent-color);">${v.nama_kk}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">Koordinat</span>
            <span class="profile-card-val" style="font-size: 1.1rem; font-family: monospace;">${v.latitude.toFixed(5)}, ${v.longitude.toFixed(5)}</span>
          </div>
        </div>

        <div class="detail-table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th colspan="2">Profil Tambahan Desa ${v.desa}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong>Badan Usaha Milik Desa (BUMDes)</strong></td><td>${se.bumdes === 1 ? '<span class="badge-status badge-active">Ada BUMDes</span>' : '<span class="badge-status badge-inactive">Tidak Ada</span>'}</td></tr>
              <tr><td><strong>Koperasi Desa / KDMP</strong></td><td>${se.koperasi || "Tidak Ada"}</td></tr>
              <tr><td><strong>Unit Pengolahan Ikan (UPI)</strong></td><td>${se.upi === 1 ? '<span class="badge-status badge-active">Ada Perusahaan/UPI</span>' : "Tidak Ada"}</td></tr>
              <tr><td><strong>Pelaku Usaha Wisata Perairan</strong></td><td>${se.wisata_alam === 1 ? '<span class="badge-status badge-active">Aktif</span>' : "Tidak Ada"}</td></tr>
              <tr><td><strong>Kearifan Lokal</strong></td><td>${se.kearifan_lokal || "-"}</td></tr>
              <tr><td><strong>Luas Wilayah</strong></td><td>${demo.luas_wilayah ? this.formatNumber(demo.luas_wilayah) + ' Ha' : "-"}</td></tr>
            </tbody>
          </table>
        </div>
      `;
    } 
    // Skenario B: Aggregated List of Villages (General Dashboard Status)
    else {
      const metrics = DataManager.getAggregatedMetrics(state.filteredData, state.rawData);
      const uniqueKabs = [...new Set(state.filteredData.map(v => v.kabupaten))].length;
      const uniqueKecs = [...new Set(state.filteredData.map(v => v.kecamatan))].length;
      const uniqueProvs = [...new Set(state.filteredData.map(v => v.provinsi))].length;
      const uniqueKaws = [...new Set(state.filteredData.map(v => v.nama_kk).filter(k => k !== "DILUAR KAWASAN KONSERVASI"))].length;

      this.contentEl.innerHTML = `
        <div class="detail-grid-cards">
          <div class="info-profile-card">
            <span class="profile-card-lbl">JUMLAH DESA</span>
            <span class="profile-card-val">${state.filteredData.length}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">PROVINSI</span>
            <span class="profile-card-val">${uniqueProvs}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">KABUPATEN/KOTA</span>
            <span class="profile-card-val">${uniqueKabs}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">KECAMATAN</span>
            <span class="profile-card-val">${uniqueKecs}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">KAWASAN KONSERVASI</span>
            <span class="profile-card-val">${uniqueKaws}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">TOTAL PENDUDUK</span>
            <span class="profile-card-val">${this.formatNumber(metrics.penduduk)}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">TOTAL NELAYAN</span>
            <span class="profile-card-val">${this.formatNumber(metrics.nelayan)}</span>
          </div>
          <div class="info-profile-card">
            <span class="profile-card-lbl">TOTAL KAPAL</span>
            <span class="profile-card-val">${this.formatNumber(metrics.kapal)}</span>
          </div>
        </div>
      `;
    }
  }

  // Tab 2: Demografi (Line chart + yearly table)
  renderDemografi(state, activeIds) {
    this.panelTitleEl.innerHTML = `<i class="fa-solid fa-users"></i> Demografi Kependudukan`;

    const history = DataManager.getDemografiHistory(activeIds, state.rawData);
    
    if (history.length === 0) {
      this.contentEl.innerHTML = `<p class="empty-state"><i class="fa-solid fa-circle-question"></i> Tidak ada data demografi tersedia.</p>`;
      return;
    }

    this.contentEl.innerHTML = `
      <div class="detail-dual-layout">
        <div class="chart-container" style="background-color:white; min-height: 250px; position:relative;">
          <h3 class="chart-title">Tren Pertumbuhan Penduduk (Tahun)</h3>
          <canvas id="chart-detail-demografi" style="max-height:220px;"></canvas>
        </div>
        <div class="detail-table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th>Tahun</th>
                <th>Laki-laki (Jiwa)</th>
                <th>Perempuan (Jiwa)</th>
                <th>Total Penduduk (Jiwa)</th>
                <th>Kepala Keluarga (KK)</th>
              </tr>
            </thead>
            <tbody>
              ${history.map(row => `
                <tr>
                  <td><strong>${row.year}</strong></td>
                  <td>${row.laki_laki > 0 ? this.formatNumber(row.laki_laki) : "-"}</td>
                  <td>${row.perempuan > 0 ? this.formatNumber(row.perempuan) : "-"}</td>
                  <td>${this.formatNumber(row.total_penduduk)}</td>
                  <td>${row.kk > 0 ? this.formatNumber(row.kk) : "-"}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Render Line Chart
    const ctx = document.getElementById("chart-detail-demografi").getContext("2d");
    this.detailChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: history.map(h => h.year),
        datasets: [
          {
            label: "Total Penduduk",
            data: history.map(h => h.total_penduduk),
            borderColor: "#0f4c5c",
            backgroundColor: "rgba(15, 76, 92, 0.05)",
            fill: true,
            tension: 0.3,
            borderWidth: 3
          },
          {
            label: "Laki-laki",
            data: history.map(h => h.laki_laki || null),
            borderColor: "#00b4d8",
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: "Perempuan",
            data: history.map(h => h.perempuan || null),
            borderColor: "#e36414",
            borderDash: [5, 5],
            fill: false,
            tension: 0.3,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { size: 10, family: "Inter" } } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { 
            grid: { color: "rgba(0,0,0,0.05)" },
            ticks: { callback: (val) => this.formatNumber(val) }
          }
        }
      }
    });
  }

  // Tab 3: Sosial Ekonomi
  renderSosialEkonomi(state, activeIds) {
    this.panelTitleEl.innerHTML = `<i class="fa-solid fa-coins"></i> Profil Sosial Ekonomi`;

    const seData = state.rawData.sosial_ekonomi.filter(x => activeIds.includes(x.id_desa));

    if (seData.length === 0) {
      this.contentEl.innerHTML = `<p class="empty-state">Tidak ada data sosial ekonomi tersedia.</p>`;
      return;
    }

    this.contentEl.innerHTML = `
      <div class="detail-table-wrapper">
        <table class="detail-table">
          <thead>
            <tr>
              <th>Desa</th>
              <th>Nelayan</th>
              <th>Pembudidaya</th>
              <th>Pengolah/Pemasar</th>
              <th>Kapal</th>
              <th>Alat Tangkap</th>
              <th>UMKM</th>
              <th>Kearifan Lokal</th>
            </tr>
          </thead>
          <tbody>
            ${seData.map(row => `
              <tr>
                <td><strong>Desa ${row.desa}</strong></td>
                <td>${this.formatNumber(row.nelayan)} Orang</td>
                <td>${this.formatNumber(row.pembudidaya)} Orang</td>
                <td>${this.formatNumber(row.pengolah_pemasar)} Orang</td>
                <td>${this.formatNumber(row.kapal)} Unit</td>
                <td>${this.formatNumber(row.alat_tangkap)} Unit</td>
                <td>${this.formatNumber(row.umkm)} Usaha</td>
                <td><span style="font-size: 0.8rem; color:var(--text-muted);">${row.kearifan_lokal || "-"}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // Tab 4: Data Kapal (Pie chart + Table breakdown)
  renderKapal(state, activeIds) {
    this.panelTitleEl.innerHTML = `<i class="fa-solid fa-ship"></i> Data Armada Kapal Perikanan (2025)`;

    const shipTypes = DataManager.getVesselsData(activeIds, state.rawData);
    
    // Get table records
    const shipRecords = state.rawData.data_kapal.filter(x => activeIds.includes(x.id_desa) && x.tahun === 2025);

    if (shipTypes.length === 0) {
      this.contentEl.innerHTML = `<p class="empty-state"><i class="fa-solid fa-circle-question"></i> Tidak ada data kapal tersedia.</p>`;
      return;
    }

    this.contentEl.innerHTML = `
      <div class="detail-dual-layout">
        <div class="chart-container" style="background-color:white; min-height: 250px; position:relative;">
          <h3 class="chart-title">Proporsi Jenis Kapal</h3>
          <canvas id="chart-detail-kapal" style="max-height:220px;"></canvas>
        </div>
        <div class="detail-table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th>Desa</th>
                <th>Jenis Kapal</th>
                <th>Jumlah Kapal</th>
              </tr>
            </thead>
            <tbody>
              ${shipRecords.map(row => `
                <tr>
                  <td>Desa ${row.desa}</td>
                  <td><span class="badge-status" style="background-color:#e0f7fa; color:#006064; font-weight:700;">${row.jenis}</span></td>
                  <td><strong>${this.formatNumber(row.jumlah)} Unit</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Render Pie/Doughnut Chart
    const ctx = document.getElementById("chart-detail-kapal").getContext("2d");
    this.detailChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: shipTypes.map(s => s.jenis),
        datasets: [{
          data: shipTypes.map(s => s.jumlah),
          backgroundColor: ["#00b4d8", "#e36414", "#ffb703", "#2ec4b6"],
          borderWidth: 2,
          borderColor: "#ffffff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { font: { size: 10, family: "Inter" } } }
        }
      }
    });
  }

  // Tab 5: Alat Tangkap (Bar chart + Table breakdown)
  renderAlatTangkap(state, activeIds) {
    this.panelTitleEl.innerHTML = `<i class="fa-solid fa-anchor"></i> Jenis Alat Tangkap Perikanan (2025)`;

    const gearTypes = DataManager.getGearsData(activeIds, state.rawData);
    const gearRecords = state.rawData.data_alat_tangkap.filter(x => activeIds.includes(x.id_desa) && x.tahun === 2025);

    if (gearTypes.length === 0) {
      this.contentEl.innerHTML = `<p class="empty-state"><i class="fa-solid fa-circle-question"></i> Tidak ada data alat tangkap tersedia.</p>`;
      return;
    }

    this.contentEl.innerHTML = `
      <div class="detail-dual-layout">
        <div class="chart-container" style="background-color:white; min-height: 250px; position:relative;">
          <h3 class="chart-title">Distribusi Alat Tangkap</h3>
          <canvas id="chart-detail-alat" style="max-height:220px;"></canvas>
        </div>
        <div class="detail-table-wrapper">
          <table class="detail-table">
            <thead>
              <tr>
                <th>Desa</th>
                <th>Alat Tangkap</th>
                <th>Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${gearRecords.map(row => `
                <tr>
                  <td>Desa ${row.desa}</td>
                  <td><span class="badge-status" style="background-color:#ffebee; color:#b71c1c; font-weight:700;">${row.jenis}</span></td>
                  <td><strong>${this.formatNumber(row.jumlah)} Unit</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Render Bar Chart
    const ctx = document.getElementById("chart-detail-alat").getContext("2d");
    this.detailChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: gearTypes.map(g => g.jenis),
        datasets: [{
          label: "Jumlah Unit",
          data: gearTypes.map(g => g.jumlah),
          backgroundColor: "#e36414",
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: "rgba(0,0,0,0.05)" } }
        }
      }
    });
  }

  // Tab 6: Kelompok
  renderKelompok(state, activeIds) {
    this.panelTitleEl.innerHTML = `<i class="fa-solid fa-people-group"></i> Kelompok Pembinaan Masyarakat Pesisir`;

    const groups = DataManager.getGroupsData(activeIds, state.rawData);

    if (groups.length === 0) {
      this.contentEl.innerHTML = `<p class="empty-state"><i class="fa-solid fa-circle-question"></i> Tidak ada kelompok terdaftar di wilayah ini.</p>`;
      return;
    }

    this.contentEl.innerHTML = `
      <div class="detail-table-wrapper">
        <table class="detail-table">
          <thead>
            <tr>
              <th>Desa</th>
              <th>Nama Kelompok</th>
              <th>Jenis Kelompok</th>
              <th>Tahun Berdiri</th>
              <th>Status</th>
              <th>Sumber Data</th>
            </tr>
          </thead>
          <tbody>
            ${groups.map(row => `
              <tr>
                <td>Desa ${row.desa}</td>
                <td><strong>${row.nama}</strong></td>
                <td><span class="badge-status" style="background-color:#e8eaf6; color:#1a237e; font-weight:700;">${row.jenis}</span></td>
                <td>${row.tahun_berdiri || "-"}</td>
                <td><span class="badge-status ${row.status === 'AKTIF' ? 'badge-active' : 'badge-inactive'}">${row.status}</span></td>
                <td><span style="font-size:0.75rem; color:var(--text-muted);">${row.sumber || "-"}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // Tab 7: Infrastruktur
  renderInfrastruktur(state, activeIds) {
    this.panelTitleEl.innerHTML = `<i class="fa-solid fa-warehouse"></i> Infrastruktur Perikanan (2025)`;

    const infraData = DataManager.getInfrastructureData(activeIds, state.rawData);

    if (infraData.length === 0) {
      this.contentEl.innerHTML = `<p class="empty-state"><i class="fa-solid fa-circle-question"></i> Tidak ada data infrastruktur terdaftar di wilayah ini.</p>`;
      return;
    }

    this.contentEl.innerHTML = `
      <div class="detail-table-wrapper">
        <table class="detail-table">
          <thead>
            <tr>
              <th>Desa</th>
              <th>Jenis Infrastruktur</th>
              <th>Jumlah Unit</th>
              <th>Sumber Data</th>
            </tr>
          </thead>
          <tbody>
            ${infraData.map(row => `
              <tr>
                <td>Desa ${row.desa}</td>
                <td><strong>${row.jenis}</strong></td>
                <td>${this.formatNumber(row.jumlah)} Unit</td>
                <td><span style="font-size:0.75rem; color:var(--text-muted);">${row.sumber || "-"}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
}
