const DataManager = {
  // Filters wilayah based on active filters
  filterData(rawData, filters) {
    if (!rawData || !rawData.wilayah) return [];
    
    return Object.values(rawData.wilayah).filter(village => {
      // 1. Text Search (case-insensitive)
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!village.desa.toLowerCase().includes(q)) return false;
      }
      
      // 2. Provinsi Dropdown
      if (filters.provinsi && village.provinsi !== filters.provinsi) {
        return false;
      }
      
      // 3. Kabupaten Dropdown
      if (filters.kabupaten && village.kabupaten !== filters.kabupaten) {
        return false;
      }
      
      // 4. Kecamatan Dropdown
      if (filters.kecamatan && village.kecamatan !== filters.kecamatan) {
        return false;
      }
      
      // 5. Kawasan Konservasi Dropdown
      if (filters.kawasan) {
        if (filters.kawasan === "DILUAR KAWASAN KONSERVASI") {
          if (village.nama_kk !== "DILUAR KAWASAN KONSERVASI") return false;
        } else {
          if (village.nama_kk !== filters.kawasan) return false;
        }
      }
      
      // 6. Desa Dropdown
      if (filters.desa && village.id_desa !== filters.desa) {
        return false;
      }
      
      return true;
    });
  },

  // Summarize overall metrics for selected villages
  getAggregatedMetrics(filteredData, rawData) {
    const metrics = {
      penduduk: 0,
      kk: 0,
      nelayan: 0,
      kapal: 0,
      alat_tangkap: 0,
      kelompok: 0,
      infrastruktur: 0,
      umkm: 0,
      gender: { laki_laki: 0, perempuan: 0 },
      se_composition: { nelayan: 0, pembudidaya: 0, pengolah: 0, umkm: 0, wisata: 0 }
    };

    if (filteredData.length === 0 || !rawData) return metrics;

    const activeIds = filteredData.map(v => v.id_desa);

    // 1. Accumulate Demographic Data (latest year, 2025)
    if (rawData.demografi) {
      rawData.demografi.forEach(record => {
        if (activeIds.includes(record.id_desa) && Number(record.tahun) === 2025) {
          metrics.penduduk += (record.total_penduduk || 0);
          metrics.kk += (record.jumlah_kk || 0);
          metrics.gender.laki_laki += (record.laki_laki || 0);
          metrics.gender.perempuan += (record.perempuan || 0);
        }
      });
    }

    // 2. Accumulate Sosial Ekonomi Data
    if (rawData.sosial_ekonomi) {
      rawData.sosial_ekonomi.forEach(record => {
        if (activeIds.includes(record.id_desa)) {
          metrics.nelayan += (record.nelayan || 0);
          metrics.umkm += (record.umkm || 0);
          metrics.kapal += (record.kapal || 0);
          metrics.alat_tangkap += (record.alat_tangkap || 0);
          metrics.kelompok += (record.kelompok || 0);
          metrics.infrastruktur += (record.infrastruktur || 0);

          // For the horizontal bar chart
          metrics.se_composition.nelayan += (record.nelayan || 0);
          metrics.se_composition.pembudidaya += (record.pembudidaya || 0);
          metrics.se_composition.pengolah += (record.pengolah_pemasar || 0);
          metrics.se_composition.umkm += (record.umkm || 0);
          metrics.se_composition.wisata += (record.wisata_alam || 0);
        }
      });
    }

    return metrics;
  },

  // Get Demographic history by village or active scope
  getDemografiHistory(activeIds, rawData) {
    const history = {}; // year -> { laki_laki, perempuan, total_penduduk, kk }
    if (!rawData || !rawData.demografi) return [];

    rawData.demografi.forEach(record => {
      if (activeIds.includes(record.id_desa)) {
        const yr = record.tahun;
        if (!history[yr]) {
          history[yr] = { laki_laki: 0, perempuan: 0, total_penduduk: 0, kk: 0 };
        }
        history[yr].laki_laki += (record.laki_laki || 0);
        history[yr].perempuan += (record.perempuan || 0);
        history[yr].total_penduduk += (record.total_penduduk || 0);
        history[yr].kk += (record.jumlah_kk || 0);
      }
    });

    return Object.entries(history)
      .map(([year, val]) => ({ year: parseInt(year), ...val }))
      .sort((a, b) => a.year - b.year);
  },

  // Get Vessel distribution details
  getVesselsData(activeIds, rawData) {
    const vessels = {}; // type -> count
    if (!rawData || !rawData.data_kapal) return [];

    rawData.data_kapal.forEach(record => {
      if (activeIds.includes(record.id_desa) && Number(record.tahun) === 2025) {
        const j = record.jenis || "Lainnya";
        vessels[j] = (vessels[j] || 0) + (record.jumlah || 0);
      }
    });

    return Object.entries(vessels).map(([jenis, jumlah]) => ({ jenis, jumlah }));
  },

  // Get Gear distribution details
  getGearsData(activeIds, rawData) {
    const gears = {}; // type -> count
    if (!rawData || !rawData.data_alat_tangkap) return [];

    rawData.data_alat_tangkap.forEach(record => {
      if (activeIds.includes(record.id_desa) && Number(record.tahun) === 2025) {
        const j = record.jenis || "Lainnya";
        gears[j] = (gears[j] || 0) + (record.jumlah || 0);
      }
    });

    return Object.entries(gears).map(([jenis, jumlah]) => ({ jenis, jumlah }));
  },

  // Get Groups details
  getGroupsData(activeIds, rawData) {
    if (!rawData || !rawData.data_kelompok) return [];
    return rawData.data_kelompok.filter(record => activeIds.includes(record.id_desa));
  },

  // Get Infrastructure details
  getInfrastructureData(activeIds, rawData) {
    if (!rawData || !rawData.data_infrastruktur) return [];
    return rawData.data_infrastruktur.filter(record => activeIds.includes(record.id_desa) && Number(record.tahun) === 2025);
  }
};
