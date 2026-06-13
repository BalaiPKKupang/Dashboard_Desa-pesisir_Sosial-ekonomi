class FilterPanel {
  constructor(stateManager) {
    this.sm = stateManager;
    
    // Bind DOM elements
    this.searchEl = document.getElementById("search-desa");
    this.provinsiEl = document.getElementById("filter-provinsi");
    this.kabupatenEl = document.getElementById("filter-kabupaten");
    this.kecamatanEl = document.getElementById("filter-kecamatan");
    this.kawasanEl = document.getElementById("filter-kawasan");
    this.desaEl = document.getElementById("filter-desa");
    
    // Bind events
    this.initEvents();
    
    // Subscribe to state updates
    this.sm.subscribe("stateChanged", (state) => this.onStateChanged(state));
  }

  initEvents() {
    // Search input (debounce text search)
    let searchTimeout;
    this.searchEl.addEventListener("input", (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.sm.setFilters({ search: e.target.value.trim() });
      }, 300);
    });

    // Dropdown filters
    this.provinsiEl.addEventListener("change", (e) => {
      this.sm.setFilters({ provinsi: e.target.value });
    });

    this.kabupatenEl.addEventListener("change", (e) => {
      this.sm.setFilters({ kabupaten: e.target.value });
    });

    this.kecamatanEl.addEventListener("change", (e) => {
      this.sm.setFilters({ kecamatan: e.target.value });
    });

    this.kawasanEl.addEventListener("change", (e) => {
      this.sm.setFilters({ kawasan: e.target.value });
    });

    this.desaEl.addEventListener("change", (e) => {
      this.sm.selectVillage(e.target.value);
    });

    // Reset button link (Map Reset button)
    document.getElementById("btn-reset-map").addEventListener("click", () => {
      this.sm.resetFilters();
      this.searchEl.value = "";
    });
  }

  // Populate dropdown options based on current filtered state and parents
  populateDropdowns(state) {
    const raw = state.rawData;
    if (!raw || !raw.wilayah) return;

    const villages = Object.values(raw.wilayah);

    // Get active filter values
    const currentProv = state.filters.provinsi;
    const currentKab = state.filters.kabupaten;
    const currentKec = state.filters.kecamatan;
    const currentKaw = state.filters.kawasan;
    const currentDesa = state.selectedVillageId || state.filters.desa;

    // 1. Populate PROVINSI (Unique values)
    const provs = [...new Set(villages.map(v => v.provinsi))].sort();
    this.updateDropdownOptions(this.provinsiEl, provs, currentProv, "Semua Provinsi");

    // 2. Populate KABUPATEN (Filter by selected Provinsi)
    let kabList = villages;
    if (currentProv) kabList = kabList.filter(v => v.provinsi === currentProv);
    const kabs = [...new Set(kabList.map(v => v.kabupaten))].sort();
    this.updateDropdownOptions(this.kabupatenEl, kabs, currentKab, "Semua Kabupaten");

    // 3. Populate KECAMATAN (Filter by selected Kabupaten)
    let kecList = villages;
    if (currentProv) kecList = kecList.filter(v => v.provinsi === currentProv);
    if (currentKab) kecList = kecList.filter(v => v.kabupaten === currentKab);
    const kecs = [...new Set(kecList.map(v => v.kecamatan))].sort();
    this.updateDropdownOptions(this.kecamatanEl, kecs, currentKec, "Semua Kecamatan");

    // 4. Populate KAWASAN KONSERVASI (Unique values across ALL villages)
    const kawasans = [...new Set(villages.map(v => v.nama_kk))].sort();
    this.updateDropdownOptions(this.kawasanEl, kawasans, currentKaw, "Semua Kawasan");

    // 5. Populate DESA (Filter by selected Provinsi, Kabupaten, Kecamatan, Kawasan)
    let desaList = villages;
    if (currentProv) desaList = desaList.filter(v => v.provinsi === currentProv);
    if (currentKab) desaList = desaList.filter(v => v.kabupaten === currentKab);
    if (currentKec) desaList = desaList.filter(v => v.kecamatan === currentKec);
    if (currentKaw) {
      desaList = desaList.filter(v => v.nama_kk === currentKaw);
    }
    
    // Sort villages alphabetically
    desaList.sort((a, b) => a.desa.localeCompare(b.desa));

    // Update Desa dropdown options with ID_DESA as value and DESA as label
    const desaOptions = desaList.map(v => ({ value: v.id_desa, label: v.desa }));
    this.updateDropdownOptionsComplex(this.desaEl, desaOptions, currentDesa, "Semua Desa");
  }

  // Utility to update dropdown options (Simple array of strings)
  updateDropdownOptions(el, options, currentValue, defaultLabel) {
    // Keep track of user's active choice
    const originalValue = el.value;
    
    el.innerHTML = `<option value="">${defaultLabel}</option>`;
    options.forEach(opt => {
      const selected = opt === currentValue ? "selected" : "";
      el.innerHTML += `<option value="${opt}" ${selected}>${opt}</option>`;
    });

    // Restore selected value
    if (currentValue !== undefined) {
      el.value = currentValue;
    }
  }

  // Utility to update dropdown options (Array of objects {value, label})
  updateDropdownOptionsComplex(el, options, currentValue, defaultLabel) {
    el.innerHTML = `<option value="">${defaultLabel}</option>`;
    options.forEach(opt => {
      const selected = opt.value === currentValue ? "selected" : "";
      el.innerHTML += `<option value="${opt.value}" ${selected}>${opt.label}</option>`;
    });

    if (currentValue !== undefined) {
      el.value = currentValue;
    }
  }

  onStateChanged(state) {
    // Set search box value
    if (this.searchEl.value !== state.filters.search) {
      this.searchEl.value = state.filters.search;
    }

    // Populate and match select dropdown values
    this.populateDropdowns(state);
  }
}
