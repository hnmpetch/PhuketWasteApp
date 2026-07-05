// Phuket Waste App Client-side Logic

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // DOM Elements - Navigation & Tabs
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');

    // DOM Elements - Modal & Uploads
    const btnUploadTrigger = document.getElementById('btnUploadTrigger');
    const btnEmptyUpload = document.getElementById('btnEmptyUpload');
    const uploadModal = document.getElementById('uploadModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    const btnLoadSample = document.getElementById('btnLoadSample');
    const btnEmptyLoadSample = document.getElementById('btnEmptyLoadSample');
    const btnDownloadLatest = document.getElementById('btnDownloadLatest');
    const btnThemeToggle = document.getElementById('btnThemeToggle');
    const themeToggleIcon = document.getElementById('theme-toggle-icon');

    // Theme initialization
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        if (themeToggleIcon) {
            themeToggleIcon.setAttribute('data-lucide', 'sun');
        }
    }

    // Upload Box Elements (Upload Page)
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadProgressWrapper = document.getElementById('upload-progress-wrapper');
    const uploadingFilename = document.getElementById('uploading-filename');
    const uploadingPercentage = document.getElementById('uploading-percentage');
    const uploadingBar = document.getElementById('uploading-bar');
    const uploadStatusMsg = document.getElementById('upload-status-msg');

    // Upload Box Elements (Modal)
    const modalDropZone = document.getElementById('modal-drop-zone');
    const modalFileInput = document.getElementById('modal-file-input');
    const btnBrowseModal = document.getElementById('btnBrowseModal');
    const modalProgressWrapper = document.getElementById('modal-progress-wrapper');
    const modalFilename = document.getElementById('modal-filename');
    const modalPercentage = document.getElementById('modal-percentage');
    const modalBar = document.getElementById('modal-bar');
    const modalStatusMsg = document.getElementById('modal-status-msg');

    const uploadHistoryList = document.getElementById('upload-history-list');

    // DOM Elements - Empty states vs Dashboard
    const dbEmptyState = document.getElementById('db-empty-state');
    const dbStatsGrid = document.getElementById('db-stats-grid');
    const dbChartsContainer = document.getElementById('db-charts-container');

    // DOM Elements - Stats (Spatial KPIs)
    const statTotalWaste = document.getElementById('stat-total-waste');
    const statTotalWasteKg = document.getElementById('stat-total-waste-kg');
    const statDensestArea = document.getElementById('stat-densest-area');
    const statAreaCount = document.getElementById('stat-area-count');
    const statTouristShare = document.getElementById('stat-tourist-share');
    const statTouristBar = document.getElementById('stat-tourist-bar');
    const dbInsightCard = document.getElementById('db-insight-card');
    const insightSummary = document.getElementById('insight-summary');

    // DOM Elements - Filter Drawer
    const btnToggleFilters = document.getElementById('btnToggleFilters');
    const btnCloseFilters = document.getElementById('btnCloseFilters');
    const filterDrawer = document.getElementById('filterDrawer');
    const filterDrawerBackdrop = document.getElementById('filterDrawerBackdrop');

    // DOM Elements - Filters
    const filterUpload = document.getElementById('filter-upload');
    const filterDistrict = document.getElementById('filter-district');
    const filterWasteType = document.getElementById('filter-waste-type');
    const filterTourist = document.getElementById('filter-tourist');
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const btnResetFilters = document.getElementById('btnResetFilters');

    // DOM Elements - Data Table Explorer
    const tableBody = document.getElementById('table-body');
    const tableRowCounter = document.getElementById('table-row-counter');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    const paginationInfo = document.getElementById('pagination-info');

    // Chart instances (Spatial Analysis)
    let geoMapInstance = null;
    let geoTileLayer = null;
    let geoMarkerGroup = null;
    let areaBarChartInstance = null;
    let districtBarChartInstance = null;
    let districtWasteTypeChartInstance = null;
    let touristDoughnutChartInstance = null;
    let districtTrendChartInstance = null;
    let collectionSiteBarChartInstance = null;
    let districtDisposalChartInstance = null;

    // App state
    let filteredRecords = [];
    let currentPage = 1;
    const recordsPerPage = 15;

    // Toast Notification System
    function showToast(title, message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle';
        if (type === 'error') iconName = 'alert-triangle';
        
        toast.innerHTML = `
            <i class="toast-icon" data-lucide="${iconName}"></i>
            <div class="toast-content">
                <h5>${title}</h5>
                <p>${message}</p>
            </div>
        `;
        container.appendChild(toast);
        lucide.createIcons();

        // Animate Out
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // Tab Navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // If download button, don't switch tabs
            if (item.classList.contains('download-btn-nav')) return;
            
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            tabContents.forEach(tab => {
                tab.style.display = 'none';
                if (tab.id === `${tabId}-tab`) {
                    tab.style.display = 'block';
                }
            });

            // Update title & subtitle
            if (tabId === 'hero') {
                pageTitle.textContent = "Overview Home";
                pageSubtitle.textContent = "Welcome to the Phuket Waste Data Management Suite.";
                if (btnToggleFilters) btnToggleFilters.style.display = 'none';
            } else if (tabId === 'dashboard') {
                pageTitle.textContent = "การวิเคราะห์เชิงพื้นที่ — Spatial Analysis";
                pageSubtitle.textContent = "พื้นที่ใดขยะหนาแน่นสุด? Which area has the densest waste?";
                if (btnToggleFilters) btnToggleFilters.style.display = 'inline-flex';
                fetchAndRenderDashboard(); // Refresh data
            } else if (tabId === 'upload-section') {
                pageTitle.textContent = "Upload Center";
                pageSubtitle.textContent = "Import new raw CSV datasets, clean duplications, and view histories.";
                if (btnToggleFilters) btnToggleFilters.style.display = 'none';
                fetchAndRenderHistory();
            } else if (tabId === 'data-explorer') {
                pageTitle.textContent = "Data Explorer";
                pageSubtitle.textContent = "Browse and query records from the SQLite database.";
                if (btnToggleFilters) btnToggleFilters.style.display = 'none';
                fetchAndRenderDashboard();
            }
        });
    });

    // Filter Drawer Toggle Logic
    const openFilterDrawer = () => {
        if (filterDrawer) filterDrawer.classList.add('active');
        if (filterDrawerBackdrop) filterDrawerBackdrop.classList.add('active');
    };
    const closeFilterDrawer = () => {
        if (filterDrawer) filterDrawer.classList.remove('active');
        if (filterDrawerBackdrop) filterDrawerBackdrop.classList.remove('active');
    };
    if (btnToggleFilters) btnToggleFilters.addEventListener('click', openFilterDrawer);
    if (btnCloseFilters) btnCloseFilters.addEventListener('click', closeFilterDrawer);
    if (filterDrawerBackdrop) filterDrawerBackdrop.addEventListener('click', closeFilterDrawer);

    // Hero Action Cards Click Listeners
    const heroGoDashboard = document.getElementById('hero-go-dashboard');
    const heroGoUpload = document.getElementById('hero-go-upload');
    const heroGoExplorer = document.getElementById('hero-go-explorer');

    if (heroGoDashboard) {
        heroGoDashboard.addEventListener('click', () => {
            const navLink = document.querySelector('.nav-item[data-tab="dashboard"]');
            if (navLink) navLink.click();
        });
    }
    if (heroGoUpload) {
        heroGoUpload.addEventListener('click', () => {
            const navLink = document.querySelector('.nav-item[data-tab="upload-section"]');
            if (navLink) navLink.click();
        });
    }
    if (heroGoExplorer) {
        heroGoExplorer.addEventListener('click', () => {
            const navLink = document.querySelector('.nav-item[data-tab="data-explorer"]');
            if (navLink) navLink.click();
        });
    }

    // Modal Control
    const openModal = () => {
        uploadModal.classList.add('active');
        // Reset modal progress
        modalProgressWrapper.style.display = 'none';
        modalDropZone.style.display = 'flex';
    };
    
    const closeModal = () => {
        uploadModal.classList.remove('active');
    };

    if (btnUploadTrigger) btnUploadTrigger.addEventListener('click', openModal);
    if (btnEmptyUpload) btnEmptyUpload.addEventListener('click', openModal);
    if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
    
    // Close modal on click outside
    uploadModal.addEventListener('click', (e) => {
        if (e.target === uploadModal) closeModal();
    });

    // Load Sample Dataset Trigger
    const loadSampleData = () => {
        showToast("Processing Sample", "Clearing database and loading raw waste file...", "info");
        
        fetch('/load-sample', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast("Success", `Sample data loaded successfully! Cleaned ${data.row_count} rows.`, "success");
                closeModal();
                fetchAndRenderDashboard();
                fetchAndRenderHistory();
            } else {
                showToast("Error", data.error || "Failed to load sample dataset", "error");
            }
        })
        .catch(err => {
            showToast("Error", "Network request failed. Try again.", "error");
            console.error(err);
        });
    };

    if (btnLoadSample) btnLoadSample.addEventListener('click', loadSampleData);
    if (btnEmptyLoadSample) btnEmptyLoadSample.addEventListener('click', loadSampleData);

    // Form Filter Event Listeners
    const filterElements = [filterUpload, filterDistrict, filterWasteType, filterTourist, filterStartDate, filterEndDate];
    filterElements.forEach(elem => {
        if (elem) {
            elem.addEventListener('change', () => {
                currentPage = 1;
                fetchAndRenderDashboard();
            });
        }
    });

    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', () => {
            filterElements.forEach(elem => {
                if (elem) elem.value = '';
            });
            currentPage = 1;
            fetchAndRenderDashboard();
            showToast("Filters Reset", "Showing overall dashboard data.", "info");
        });
    }

    // Theme toggle action
    if (btnThemeToggle) {
        btnThemeToggle.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            if (themeToggleIcon) {
                themeToggleIcon.setAttribute('data-lucide', isLight ? 'sun' : 'moon');
                lucide.createIcons();
            }
            updateChartsTheme();
        });
    }

    // Chart Configuration Utilities (dynamic for theme changes)
    function getChartConfigCommon() {
        const isLight = document.body.classList.contains('light-theme');
        const textColor = isLight ? '#4b5563' : '#a0aec0';
        const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
        const tooltipBg = isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(22, 24, 49, 0.95)';
        const tooltipBorder = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.08)';
        const tooltipTextColor = isLight ? '#111827' : '#f1f3f9';

        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        font: { family: 'Outfit', size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: tooltipBg,
                    titleColor: tooltipTextColor,
                    bodyColor: tooltipTextColor,
                    titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
                    bodyFont: { family: 'Outfit', size: 12 },
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    padding: 10,
                    displayColors: true
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Outfit' } }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: textColor, font: { family: 'Outfit' } }
                }
            }
        };
    }

    // Update active charts configuration dynamically on theme switch
    function updateChartsTheme() {
        const config = getChartConfigCommon();
        
        [
            areaBarChartInstance,
            districtBarChartInstance,
            districtWasteTypeChartInstance,
            touristDoughnutChartInstance,
            districtTrendChartInstance,
            collectionSiteBarChartInstance,
            districtDisposalChartInstance
        ].forEach(chart => {
            if (chart) {
                // Update scales options
                if (chart.options.scales) {
                    if (chart.options.scales.x) {
                        chart.options.scales.x.grid.color = config.scales.x.grid.color;
                        chart.options.scales.x.ticks.color = config.scales.x.ticks.color;
                    }
                    if (chart.options.scales.y) {
                        chart.options.scales.y.grid.color = config.scales.y.grid.color;
                        chart.options.scales.y.ticks.color = config.scales.y.ticks.color;
                    }
                }
                
                // Update plugins options
                if (chart.options.plugins) {
                    if (chart.options.plugins.legend && chart.options.plugins.legend.labels) {
                        chart.options.plugins.legend.labels.color = config.plugins.legend.labels.color;
                    }
                    if (chart.options.plugins.tooltip) {
                        chart.options.plugins.tooltip.backgroundColor = config.plugins.tooltip.backgroundColor;
                        chart.options.plugins.tooltip.titleColor = config.plugins.tooltip.titleColor;
                        chart.options.plugins.tooltip.bodyColor = config.plugins.tooltip.bodyColor;
                        chart.options.plugins.tooltip.borderColor = config.plugins.tooltip.borderColor;
                    }
                    
                    // Specific to doughnut legend label override
                    if (chart.config.type === 'doughnut') {
                        chart.options.plugins.legend.labels.color = document.body.classList.contains('light-theme') ? '#4b5563' : '#a0aec0';
                    }
                }
                
                chart.update();
            }
        });
        
        // Re-render map to switch basemap theme
        if (geoMapInstance) {
            const btn = document.querySelector('.nav-item.active[data-tab="dashboard"]');
            if (btn) fetchAndRenderDashboard();
        }
    }

    // Fetch and Populate Dashboard Data
    function fetchAndRenderDashboard() {
        // Collect Filter Values
        const params = new URLSearchParams();
        if (filterUpload && filterUpload.value) params.append('upload_id', filterUpload.value);
        if (filterDistrict && filterDistrict.value) params.append('district', filterDistrict.value);
        if (filterWasteType && filterWasteType.value) params.append('waste_type', filterWasteType.value);
        if (filterTourist && filterTourist.value) params.append('is_tourist_zone', filterTourist.value);
        if (filterStartDate && filterStartDate.value) params.append('start_date', filterStartDate.value);
        if (filterEndDate && filterEndDate.value) params.append('end_date', filterEndDate.value);

        fetch(`/api/data?${params.toString()}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    showToast("Query Error", data.error, "error");
                    return;
                }
                
                // Toggle state depending on whether data exists
                const totalUploadsCount = data.uploads ? data.uploads.length : 0;
                
                if (totalUploadsCount === 0) {
                    dbEmptyState.style.display = 'flex';
                    dbStatsGrid.style.display = 'none';
                    dbChartsContainer.style.display = 'none';
                    if (dbInsightCard) dbInsightCard.style.display = 'none';
                    btnDownloadLatest.style.display = 'none';
                    return;
                } else {
                    dbEmptyState.style.display = 'none';
                    dbStatsGrid.style.display = 'grid';
                    dbChartsContainer.style.display = 'grid';
                    if (dbInsightCard) dbInsightCard.style.display = 'block';
                    btnDownloadLatest.style.display = 'flex';
                }

                // Render Filter Upload List Dropdown (preserving selections)
                const currentSelectedUpload = filterUpload.value;
                filterUpload.innerHTML = '<option value="">All Uploaded Datasets</option>';
                data.uploads.forEach(up => {
                    const opt = document.createElement('option');
                    opt.value = up.id;
                    opt.textContent = `${up.filename} (${new Date(up.uploaded_at).toLocaleDateString()})`;
                    if (up.id == currentSelectedUpload) {
                        opt.selected = true;
                    }
                    filterUpload.appendChild(opt);
                });

                // Update Spatial KPIs
                const summary = data.summary;
                const charts = data.charts;
                const totalTons = (summary.total_kg / 1000).toFixed(2);
                if (statTotalWaste) {
                    statTotalWaste.innerHTML = `${totalTons} <span class="unit">tons</span>`;
                }
                if (statTotalWasteKg) {
                    statTotalWasteKg.textContent = `${summary.total_kg.toLocaleString()} kg`;
                }
                
                // Densest Area KPI
                if (statDensestArea) {
                    statDensestArea.textContent = charts.densest_area || '—';
                }
                
                // Areas Analyzed KPI
                if (statAreaCount) {
                    statAreaCount.textContent = charts.area_count || 0;
                }
                
                // Calculate Tourist Zone Percentage
                if (statTouristShare && statTouristBar) {
                    if (summary.total_kg > 0) {
                        const touristPct = ((summary.total_kg > 0) ? ((summary.tourist_zone_kg / summary.total_kg) * 100).toFixed(1) : 0);
                        statTouristShare.textContent = `${touristPct}%`;
                        statTouristBar.style.width = `${touristPct}%`;
                    } else {
                        statTouristShare.textContent = `0%`;
                        statTouristBar.style.width = `0%`;
                    }
                }

                // Store records for explorer table pagination
                filteredRecords = data.records || [];
                renderExplorerTable();

                // Render Spatial Analysis Charts
                renderGeoMap(charts.by_area);
                renderAreaBarChart(charts.by_area);
                renderDistrictBarChart(charts.by_district);
                renderDistrictWasteTypeChart(charts.by_district_waste_type);
                renderTouristDoughnutChart(charts.by_tourist);
                renderDistrictTrendChart(charts.area_over_time);
                renderCollectionSiteBarChart(charts.by_collection_site);
                renderDistrictDisposalChart(charts.by_district_disposal);
                renderInsightSummary(data);
            })
            .catch(err => {
                showToast("Data Error", `Failed to load dashboard: ${err.message || err}`, "error");
                console.error(err);
            });
    }

    // Chart 0: Geo Spatial Map (Leaflet)
    function renderGeoMap(chartData) {
        const mapContainer = document.getElementById('geoWasteMap');
        if (!mapContainer) return;
        
        const geoCoordinates = {
            'ป่าตอง': [7.8961, 98.2965],       // Patong
            'ราไวย์': [7.7770, 98.3245],       // Rawai
            'กมลา': [7.9525, 98.2831],       // Kamala
            'เชิงทะเล': [7.9897, 98.3079],     // Choeng Thale
            'ไม้ขาว': [8.1189, 98.2974],       // Mai Khao
            'ในทอน': [8.0583, 98.2778],      // Nai Thon
            'ในยาง': [8.0867, 98.2933],      // Nai Yang
            'บางเทา': [7.9944, 98.2931],     // Bang Tao
            'ย่านเมืองเก่า': [7.8841, 98.3900], // Old Town
            'ตลาดสด': [7.8800, 98.3900],     // Fresh Market
            'สะพานหิน': [7.8653, 98.3970]      // Saphan Hin
        };

        const isLight = document.body.classList.contains('light-theme');
        const tileUrl = isLight ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

        // Initialize map if it doesn't exist
        if (!geoMapInstance) {
            geoMapInstance = L.map('geoWasteMap').setView([7.9519, 98.3381], 10);
            geoTileLayer = L.tileLayer(tileUrl, {
                attribution: '&copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(geoMapInstance);
            
            geoMarkerGroup = L.layerGroup().addTo(geoMapInstance);
        } else {
            // Update tile layer if theme changed
            geoTileLayer.setUrl(tileUrl);
        }

        // Must invalidate size because map container starts as display:none
        setTimeout(() => {
            geoMapInstance.invalidateSize();
        }, 300);

        // Clear existing markers
        geoMarkerGroup.clearLayers();

        const maxKg = Math.max(...chartData.map(d => d.quantity_kg), 1);

        chartData.forEach(item => {
            const coords = geoCoordinates[item.area];
            if (coords) {
                const isMax = (item.quantity_kg === maxKg && maxKg > 0);
                const radius = Math.max(8, (item.quantity_kg / maxKg) * 30);
                
                L.circleMarker(coords, {
                    radius: radius,
                    fillColor: isMax ? '#f97316' : '#ec4899', // Orange for max, pink otherwise
                    color: isMax ? '#ffffff' : '#ffffff',
                    weight: isMax ? 3 : 1,
                    opacity: 1,
                    fillOpacity: isMax ? 0.9 : 0.7,
                    className: isMax ? 'highest-waste-pulse' : ''
                })
                .bindTooltip(`<b>${item.area}</b><br/>${item.quantity_kg.toLocaleString()} kg${isMax ? ' <br/><span style="color:#f97316">🔥 Highest Waste</span>' : ''}`)
                .addTo(geoMarkerGroup);
            }
        });
    }

    // Chart 1: Area Waste Density (Horizontal Bar Chart)
    function renderAreaBarChart(chartData) {
        const ctx = document.getElementById('areaBarChart').getContext('2d');
        
        const labels = chartData.map(item => item.area);
        const values = chartData.map(item => item.quantity_kg);

        if (areaBarChartInstance) {
            areaBarChartInstance.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 400, 0);
        gradient.addColorStop(0, '#00f2fe');
        gradient.addColorStop(1, '#4facfe');

        areaBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ปริมาณขยะ (kg)',
                    data: values,
                    backgroundColor: gradient,
                    borderRadius: 6,
                    borderWidth: 0,
                    barPercentage: 0.7
                }]
            },
            options: {
                ...getChartConfigCommon(),
                indexAxis: 'y',
                plugins: {
                    ...getChartConfigCommon().plugins,
                    legend: { display: false }
                }
            }
        });
    }

    // Chart 2: District Comparison (Bar Chart)
    function renderDistrictBarChart(chartData) {
        const ctx = document.getElementById('districtBarChart').getContext('2d');

        const labels = chartData.map(item => item.district);
        const values = chartData.map(item => item.quantity_kg);

        if (districtBarChartInstance) {
            districtBarChartInstance.destroy();
        }

        const colors = ['#8b5cf6', '#4facfe', '#f6ad55'];

        districtBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ปริมาณขยะ (kg)',
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderRadius: 8,
                    borderWidth: 0,
                    barPercentage: 0.5
                }]
            },
            options: {
                ...getChartConfigCommon(),
                plugins: {
                    ...getChartConfigCommon().plugins,
                    legend: { display: false }
                }
            }
        });
    }

    // Chart 3: Waste Type by District (Stacked Bar Chart)
    function renderDistrictWasteTypeChart(chartData) {
        const ctx = document.getElementById('districtWasteTypeChart').getContext('2d');

        // Extract unique districts and waste types
        const districts = [...new Set(chartData.map(item => item.district))];
        const wasteTypes = [...new Set(chartData.map(item => item.waste_type))];
        const wasteTypeColors = {
            'Organic': '#48bb78',
            'General': '#4facfe',
            'Recycle': '#f6ad55',
            'Hazardous': '#e53e3e'
        };
        const fallbackColors = ['#00f2fe', '#8b5cf6', '#ec4899', '#38a169', '#ed8936'];

        const datasets = wasteTypes.map((wt, idx) => {
            const data = districts.map(d => {
                const match = chartData.find(item => item.district === d && item.waste_type === wt);
                return match ? match.quantity_kg : 0;
            });
            return {
                label: wt,
                data: data,
                backgroundColor: wasteTypeColors[wt] || fallbackColors[idx % fallbackColors.length],
                borderRadius: 4,
                borderWidth: 0
            };
        });

        if (districtWasteTypeChartInstance) {
            districtWasteTypeChartInstance.destroy();
        }

        districtWasteTypeChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: districts,
                datasets: datasets
            },
            options: {
                ...getChartConfigCommon(),
                scales: {
                    ...getChartConfigCommon().scales,
                    x: {
                        ...getChartConfigCommon().scales.x,
                        stacked: true
                    },
                    y: {
                        ...getChartConfigCommon().scales.y,
                        stacked: true
                    }
                },
                plugins: {
                    ...getChartConfigCommon().plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: document.body.classList.contains('light-theme') ? '#4b5563' : '#a0aec0',
                            font: { family: 'Outfit', size: 11 }
                        }
                    }
                }
            }
        });
    }

    // Chart 4: Tourist Zone vs Standard (Doughnut Chart)
    function renderTouristDoughnutChart(chartData) {
        const ctx = document.getElementById('touristDoughnutChart').getContext('2d');

        const labels = chartData.map(item => item.is_tourist_zone === 'Y' ? 'เขตท่องเที่ยว (Tourist)' : 'พื้นที่ปกติ (Standard)');
        const values = chartData.map(item => item.quantity_kg);

        if (touristDoughnutChartInstance) {
            touristDoughnutChartInstance.destroy();
        }

        const colors = ['#ec4899', '#4facfe'];

        touristDoughnutChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: document.body.classList.contains('light-theme') ? '#ffffff' : '#161831',
                    hoverOffset: 6
                }]
            },
            options: {
                ...getChartConfigCommon(),
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                plugins: {
                    ...getChartConfigCommon().plugins,
                    legend: {
                        position: 'right',
                        labels: {
                            color: document.body.classList.contains('light-theme') ? '#4b5563' : '#a0aec0',
                            font: { family: 'Outfit', size: 11 },
                            boxWidth: 12,
                            padding: 10
                        }
                    }
                }
            }
        });
    }

    // Chart 5: District Trend Over Time (Multi-line Time Series)
    function renderDistrictTrendChart(chartData) {
        const ctx = document.getElementById('districtTrendChart').getContext('2d');

        // Group data by district
        const districtMap = {};
        chartData.forEach(item => {
            if (!districtMap[item.district]) districtMap[item.district] = {};
            districtMap[item.district][item.date] = item.quantity_kg;
        });

        // Collect all unique dates, sorted
        const allDates = [...new Set(chartData.map(item => item.date))].sort();
        const districtColors = {
            'Mueang': '#00f2fe',
            'Kathu': '#8b5cf6',
            'Thalang': '#f6ad55'
        };
        const fallbackLineColors = ['#ec4899', '#48bb78', '#e53e3e'];

        const datasets = Object.keys(districtMap).map((district, idx) => {
            const data = allDates.map(date => districtMap[district][date] || 0);
            const color = districtColors[district] || fallbackLineColors[idx % fallbackLineColors.length];
            return {
                label: district,
                data: data,
                borderColor: color,
                borderWidth: 2,
                pointBackgroundColor: color,
                pointRadius: 2,
                pointHoverRadius: 5,
                fill: false,
                tension: 0.3
            };
        });

        if (districtTrendChartInstance) {
            districtTrendChartInstance.destroy();
        }

        districtTrendChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allDates,
                datasets: datasets
            },
            options: {
                ...getChartConfigCommon(),
                plugins: {
                    ...getChartConfigCommon().plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: document.body.classList.contains('light-theme') ? '#4b5563' : '#a0aec0',
                            font: { family: 'Outfit', size: 11 }
                        }
                    }
                }
            }
        });
    }

    // Chart 6: Collection Sites (Horizontal Bar Chart)
    function renderCollectionSiteBarChart(chartData) {
        const ctx = document.getElementById('collectionSiteBarChart').getContext('2d');

        const translationMap = {
            'โรงพยาบาล': 'Hospital',
            'โรงเรียน': 'School',
            'ชายหาด': 'Beach',
            'ท่าเรือ': 'Pier / Harbor',
            'ชุมชน': 'Community',
            'ห้างสรรพสินค้า': 'Department Store',
            'ตลาดสด': 'Fresh Market',
            'Unknown': 'Unspecified'
        };

        const labels = chartData.map(item => translationMap[item.collection_site] || item.collection_site);
        const values = chartData.map(item => item.quantity_kg);

        if (collectionSiteBarChartInstance) {
            collectionSiteBarChartInstance.destroy();
        }

        const gradient = ctx.createLinearGradient(0, 0, 400, 0);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#00f2fe');

        collectionSiteBarChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'ปริมาณขยะ (kg)',
                    data: values,
                    backgroundColor: gradient,
                    borderRadius: 6,
                    borderWidth: 0,
                    barPercentage: 0.6
                }]
            },
            options: {
                ...getChartConfigCommon(),
                indexAxis: 'y',
                plugins: {
                    ...getChartConfigCommon().plugins,
                    legend: { display: false }
                }
            }
        });
    }

    // Chart 7: Disposal Method by District (Stacked Horizontal Bar Chart)
    function renderDistrictDisposalChart(chartData) {
        const ctx = document.getElementById('districtDisposalChart').getContext('2d');

        const districts = [...new Set(chartData.map(item => item.district))];
        const disposalMethods = [...new Set(chartData.map(item => item.disposal_method))];
        const disposalColors = ['#00f2fe', '#8b5cf6', '#f6ad55', '#ec4899', '#48bb78', '#e53e3e', '#4facfe'];

        const datasets = disposalMethods.map((method, idx) => {
            const data = districts.map(d => {
                const match = chartData.find(item => item.district === d && item.disposal_method === method);
                return match ? match.quantity_kg : 0;
            });
            return {
                label: method,
                data: data,
                backgroundColor: disposalColors[idx % disposalColors.length],
                borderRadius: 4,
                borderWidth: 0
            };
        });

        if (districtDisposalChartInstance) {
            districtDisposalChartInstance.destroy();
        }

        districtDisposalChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: districts,
                datasets: datasets
            },
            options: {
                ...getChartConfigCommon(),
                indexAxis: 'y',
                scales: {
                    ...getChartConfigCommon().scales,
                    x: {
                        ...getChartConfigCommon().scales.x,
                        stacked: true
                    },
                    y: {
                        ...getChartConfigCommon().scales.y,
                        stacked: true
                    }
                },
                plugins: {
                    ...getChartConfigCommon().plugins,
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            color: document.body.classList.contains('light-theme') ? '#4b5563' : '#a0aec0',
                            font: { family: 'Outfit', size: 11 }
                        }
                    }
                }
            }
        });
    }

    // Insight Summary — generates data-driven spatial analysis insights
    function renderInsightSummary(data) {
        if (!insightSummary) return;

        const charts = data.charts;
        const summary = data.summary;
        let html = '';

        // 1. Densest area insight
        if (charts.densest_area && charts.by_area && charts.by_area.length > 0) {
            const densestRecord = charts.by_area.find(a => a.area === charts.densest_area);
            const densestKg = densestRecord ? densestRecord.quantity_kg.toLocaleString() : '0';
            html += `<div class="insight-item highlight"><i data-lucide="target"></i><span>พื้นที่ที่มีขยะหนาแน่นที่สุดคือ <strong>${charts.densest_area}</strong> ด้วยปริมาณขยะรวม <strong>${densestKg} กก.</strong></span></div>`;
        }

        // 2. District with most waste
        if (charts.by_district && charts.by_district.length > 0) {
            const topDistrict = charts.by_district[0];
            html += `<div class="insight-item info"><i data-lucide="bar-chart-3"></i><span>อำเภอที่มีขยะสูงสุดคือ <strong>${topDistrict.district}</strong> ด้วยปริมาณ <strong>${topDistrict.quantity_kg.toLocaleString()} กก.</strong></span></div>`;
        }

        // 3. Tourist zone impact
        if (summary.total_kg > 0) {
            const touristPct = ((summary.tourist_zone_kg / summary.total_kg) * 100).toFixed(1);
            const comparison = summary.tourist_zone_kg > summary.non_tourist_zone_kg ? 'มากกว่า' : 'น้อยกว่า';
            html += `<div class="insight-item warning"><i data-lucide="palmtree"></i><span>เขตท่องเที่ยวสร้างขยะคิดเป็น <strong>${touristPct}%</strong> ของทั้งหมด ซึ่ง${comparison}พื้นที่ปกติ (Tourist: <strong>${summary.tourist_zone_kg.toLocaleString()} กก.</strong> vs Standard: <strong>${summary.non_tourist_zone_kg.toLocaleString()} กก.</strong>)</span></div>`;
        }

        // 4. Most common waste type
        if (charts.by_type && charts.by_type.length > 0) {
            const topType = charts.by_type[0];
            const typePct = summary.total_kg > 0 ? ((topType.quantity_kg / summary.total_kg) * 100).toFixed(1) : '0';
            html += `<div class="insight-item info"><i data-lucide="trash-2"></i><span>ประเภทขยะที่พบมากที่สุดคือ <strong>${topType.waste_type}</strong> คิดเป็น <strong>${typePct}%</strong> ของปริมาณขยะทั้งหมด (<strong>${topType.quantity_kg.toLocaleString()} กก.</strong>)</span></div>`;
        }

        // 5. Number of areas
        if (charts.area_count > 0) {
            html += `<div class="insight-item highlight"><i data-lucide="map"></i><span>มีพื้นที่ทั้งหมด <strong>${charts.area_count} พื้นที่</strong> ที่ถูกวิเคราะห์ในชุดข้อมูลนี้ โดยปริมาณขยะรวม <strong>${(summary.total_kg / 1000).toFixed(2)} ตัน</strong></span></div>`;
        }

        insightSummary.innerHTML = html;
        lucide.createIcons();
    }

    // Render Data Table Explorer (Paginated)
    function renderExplorerTable() {
        tableBody.innerHTML = '';

        if (filteredRecords.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center text-muted">No records match the current filters.</td>
                </tr>
            `;
            tableRowCounter.textContent = `Showing 0 of 0 records (filtered)`;
            btnPrevPage.disabled = true;
            btnNextPage.disabled = true;
            paginationInfo.textContent = "Page 1 of 1";
            return;
        }

        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * recordsPerPage;
        const endIndex = Math.min(startIndex + recordsPerPage, filteredRecords.length);

        tableRowCounter.textContent = `Showing ${startIndex + 1}-${endIndex} of ${filteredRecords.length.toLocaleString()} records (filtered)`;
        
        // Paginate slice
        const pageRecords = filteredRecords.slice(startIndex, endIndex);

        pageRecords.forEach(rec => {
            const tr = document.createElement('tr');
            
            const isTouristBadge = rec.is_tourist_zone === 'Y' 
                ? '<span style="background: rgba(236,72,153,0.15); color: #ec4899; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight:600">Tourist</span>'
                : '<span style="background: rgba(255,255,255,0.06); color: #a0aec0; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem;">Standard</span>';

            tr.innerHTML = `
                <td><strong>${rec.date}</strong></td>
                <td>${rec.district}</td>
                <td>${rec.area || 'Unknown'}</td>
                <td><span style="font-weight: 500">${rec.waste_type}</span></td>
                <td>${parseFloat(rec.quantity_kg).toLocaleString()} kg</td>
                <td>${rec.collection_site || 'Unknown'}</td>
                <td>${rec.disposal_method || 'Unknown'}</td>
                <td>${isTouristBadge}</td>
                <td class="text-muted" style="font-size: 0.8rem; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${rec.upload_filename || 'System'}
                </td>
            `;
            tableBody.appendChild(tr);
        });

        // Pagination buttons state
        btnPrevPage.disabled = currentPage === 1;
        btnNextPage.disabled = currentPage === totalPages;
        paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }

    // Pagination Click Events
    btnPrevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderExplorerTable();
        }
    });

    btnNextPage.addEventListener('click', () => {
        const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            renderExplorerTable();
        }
    });

    // Fetch and Populate History List
    function fetchAndRenderHistory() {
        fetch('/api/data')
            .then(res => res.json())
            .then(data => {
                uploadHistoryList.innerHTML = '';
                
                if (!data.uploads || data.uploads.length === 0) {
                    uploadHistoryList.innerHTML = `<div class="no-history">No datasets loaded into SQLite. Upload a CSV to begin.</div>`;
                    return;
                }

                data.uploads.forEach(up => {
                    const item = document.createElement('div');
                    item.className = 'history-item';
                    
                    const uploadTimeStr = new Date(up.uploaded_at).toLocaleString();
                    
                    item.innerHTML = `
                        <div class="history-info">
                            <span class="history-filename" title="${up.filename}">${up.filename}</span>
                            <div class="history-meta">
                                <span>Rows: <strong>${up.row_count}</strong></span>
                                <span>Uploaded: ${uploadTimeStr}</span>
                            </div>
                        </div>
                        <div class="history-actions">
                            <a href="/download/raw/${up.raw_filename}" class="btn-icon" title="Download Raw CSV">
                                <i data-lucide="file-down" style="width:16px;height:16px;"></i>
                            </a>
                            <a href="/download/clean/${up.clean_filename}" class="btn-icon" title="Download Cleaned CSV">
                                <i data-lucide="download" style="width:16px;height:16px;"></i>
                            </a>
                            <button class="btn-icon delete btn-delete-upload" data-id="${up.id}" title="Remove Dataset">
                                <i data-lucide="trash" style="width:16px;height:16px;"></i>
                            </button>
                        </div>
                    `;
                    uploadHistoryList.appendChild(item);
                });
                
                lucide.createIcons();

                // Delete Events
                document.querySelectorAll('.btn-delete-upload').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const uploadId = btn.getAttribute('data-id');
                        if (confirm("Are you sure you want to delete this dataset? This will remove all associated records from the database and delete raw/cleaned files from disk.")) {
                            deleteUploadDataset(uploadId);
                        }
                    });
                });
            })
            .catch(err => {
                console.error(err);
            });
    }

    // Delete Upload Request
    function deleteUploadDataset(uploadId) {
        fetch(`/api/delete-upload/${uploadId}`, {
            method: 'POST'
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                showToast("Deleted", "Dataset removed from database.", "success");
                fetchAndRenderDashboard();
                fetchAndRenderHistory();
            } else {
                showToast("Error", data.error || "Could not delete dataset", "error");
            }
        })
        .catch(err => {
            showToast("Error", "Request failed", "error");
            console.error(err);
        });
    }

    // File Upload AJAX Helper
    function uploadCSVFile(file, isModal = false) {
        const formData = new FormData();
        formData.append('file', file);

        const progressWrapper = isModal ? modalProgressWrapper : uploadProgressWrapper;
        const filenameLabel = isModal ? modalFilename : uploadingFilename;
        const percentageLabel = isModal ? modalPercentage : uploadingPercentage;
        const progressBar = isModal ? modalBar : uploadingBar;
        const statusMsg = isModal ? modalStatusMsg : uploadStatusMsg;
        const zone = isModal ? modalDropZone : dropZone;

        zone.style.display = 'none';
        progressWrapper.style.display = 'block';
        filenameLabel.textContent = file.name;
        progressBar.style.width = '0%';
        percentageLabel.textContent = '0%';
        statusMsg.textContent = 'Uploading raw file to server...';

        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/upload', true);

        // Upload progress callback
        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressBar.style.width = `${percent}%`;
                percentageLabel.textContent = `${percent}%`;
                if (percent === 100) {
                    statusMsg.textContent = 'Data sanitizing, resolving duplicates & writing to database...';
                }
            }
        };

        xhr.onload = () => {
            if (xhr.status === 200) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    showToast("Import Success", `Loaded dataset "${res.filename}" (${res.row_count} records).`, "success");
                    
                    // Reset upload panel
                    progressWrapper.style.display = 'none';
                    zone.style.display = isModal ? 'flex' : 'flex';
                    
                    if (isModal) closeModal();
                    
                    fetchAndRenderDashboard();
                    fetchAndRenderHistory();
                } catch (e) {
                    showToast("Import Error", "Failed to parse server response", "error");
                    progressWrapper.style.display = 'none';
                    zone.style.display = 'flex';
                }
            } else {
                try {
                    const err = JSON.parse(xhr.responseText);
                    showToast("Upload Failed", err.error || "An error occurred", "error");
                } catch (e) {
                    showToast("Upload Failed", "Server error. Check file format.", "error");
                }
                progressWrapper.style.display = 'none';
                zone.style.display = 'flex';
            }
        };

        xhr.onerror = () => {
            showToast("Upload Failed", "Network failure. Could not connect to server.", "error");
            progressWrapper.style.display = 'none';
            zone.style.display = 'flex';
        };

        xhr.send(formData);
    }

    // Dropzone Event Listeners Setup
    function setupDragAndDrop(zone, input, isModal) {
        zone.addEventListener('click', () => input.click());

        input.addEventListener('change', () => {
            if (input.files.length > 0) {
                uploadCSVFile(input.files[0], isModal);
            }
        });

        zone.addEventListener('dragover', (e) => {
            e.preventDefault();
            zone.classList.add('dragover');
        });

        zone.addEventListener('dragleave', () => {
            zone.classList.remove('dragover');
        });

        zone.addEventListener('drop', (e) => {
            e.preventDefault();
            zone.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.name.endsWith('.csv')) {
                    uploadCSVFile(file, isModal);
                } else {
                    showToast("Invalid File Type", "Please drop a CSV waste file.", "error");
                }
            }
        });
    }

    setupDragAndDrop(dropZone, fileInput, false);
    setupDragAndDrop(modalDropZone, modalFileInput, true);
    btnBrowseModal.addEventListener('click', (e) => {
        e.stopPropagation();
        modalFileInput.click();
    });

    // App Initialization
    fetchAndRenderDashboard();
    fetchAndRenderHistory();

    // Rainbow Canvas Particle System (Cursor Glow & Splash Trail)
    const cursorCanvas = document.getElementById('cursorCanvas');
    if (cursorCanvas) {
        const ctx = cursorCanvas.getContext('2d');
        
        let mouseX = window.innerWidth / 2;
        let mouseY = window.innerHeight / 2;
        let glowX = mouseX;
        let glowY = mouseY;
        let lastMouseX = mouseX;
        let lastMouseY = mouseY;
        let idleTimer = 0;
        
        let particles = [];
        let glowHue = 0;

        // Resize canvas to fill window
        function resizeCanvas() {
            cursorCanvas.width = window.innerWidth;
            cursorCanvas.height = window.innerHeight;
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Helper to create a single confetti particle
        function createConfetti(x, y, isCannon = false) {
            const colors = [
                '#ff7675', // light red
                '#74b9ff', // sky blue
                '#55efc4', // mint green
                '#ffeaa7', // pale yellow
                '#a29bfe', // lavender purple
                '#fd79a8', // pink
                '#ff9f43', // orange
                '#00d2d3', // cyan/teal
                '#ffe599'  // soft gold
            ];
            
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            let vx, vy;
            if (isCannon) {
                // Confetti cannon: upward spray
                const angle = Math.random() * Math.PI - Math.PI; // -180 to 0 degrees
                const speed = 4.0 + Math.random() * 9.0;
                vx = Math.cos(angle) * speed;
                vy = Math.sin(angle) * speed - 3.0;
            } else {
                // Cursor trail: slight scatter with mouse velocity drag
                const dragAngle = Math.random() * Math.PI * 2;
                const dragSpeed = 0.6 + Math.random() * 1.6;
                const mouseDx = mouseX - lastMouseX;
                const mouseDy = mouseY - lastMouseY;
                vx = Math.cos(dragAngle) * dragSpeed + mouseDx * 0.12;
                vy = Math.sin(dragAngle) * dragSpeed + mouseDy * 0.12 - 0.4;
            }
            
            return {
                x: x,
                y: y,
                vx: vx,
                vy: vy,
                width: 5 + Math.random() * 6,
                height: 7 + Math.random() * 7,
                color: color,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.22,
                wobble: Math.random() * 10,
                wobbleSpeed: 0.08 + Math.random() * 0.08,
                opacity: 1.0,
                decay: 0.008 + Math.random() * 0.012,
                gravity: 0.18 + Math.random() * 0.12,
                drag: 0.96 + Math.random() * 0.02
            };
        }
        
        // Track mouse movement
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
            
            const dist = Math.hypot(mouseX - lastMouseX, mouseY - lastMouseY);
            if (dist > 4) {
                // Spawn trail confetti
                const spawnCount = Math.min(Math.floor(dist / 5), 3);
                for (let i = 0; i < spawnCount; i++) {
                    const t = i / spawnCount;
                    const x = lastMouseX + (mouseX - lastMouseX) * t;
                    const y = lastMouseY + (mouseY - lastMouseY) * t;
                    particles.push(createConfetti(x, y, false));
                }
                
                lastMouseX = mouseX;
                lastMouseY = mouseY;
            }
        });
        
        // Spawn burst on click (Confetti Cannon)
        document.addEventListener('mousedown', (e) => {
            const burstCount = 60;
            for (let i = 0; i < burstCount; i++) {
                particles.push(createConfetti(e.clientX, e.clientY, true));
            }
        });
        
        // Animation Loop
        function update() {
            // Clear canvas
            ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height);
            
            const isLightTheme = document.body.classList.contains('light-theme');
            
            // 1. Lerp main cursor glow coordinates
            const easeFactor = 0.08;
            glowX += (mouseX - glowX) * easeFactor;
            glowY += (mouseY - glowY) * easeFactor;
            
            // 2. Draw the primary underlying glowing orb (multi-color radial gradient)
            glowHue = (glowHue + 0.4) % 360;
            const mainGlowRadius = isLightTheme ? 200 : 260;
            const mainGlowGrad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, mainGlowRadius);
            
            if (isLightTheme) {
                mainGlowGrad.addColorStop(0, `hsla(${(glowHue + 180) % 360}, 80%, 75%, 0.18)`);
                mainGlowGrad.addColorStop(0.3, `hsla(${glowHue}, 80%, 75%, 0.10)`);
                mainGlowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            } else {
                mainGlowGrad.addColorStop(0, `hsla(${(glowHue + 180) % 360}, 90%, 60%, 0.14)`);
                mainGlowGrad.addColorStop(0.3, `hsla(${glowHue}, 90%, 62%, 0.08)`);
                mainGlowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            }
            
            ctx.fillStyle = mainGlowGrad;
            ctx.beginPath();
            ctx.arc(glowX, glowY, mainGlowRadius, 0, Math.PI * 2);
            ctx.fill();
            
            // 3. Update and Draw Confetti Particles
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                
                // Physics: Gravity & Drag
                p.vy += p.gravity;
                p.vx *= p.drag;
                p.vy *= p.drag;
                
                // Update position
                p.x += p.vx;
                p.y += p.vy;
                
                // Oscillations & Flutter (3D rotation simulation)
                p.rotation += p.rotationSpeed;
                p.wobble += p.wobbleSpeed;
                
                // Decay opacity
                p.opacity -= p.decay;
                
                if (p.opacity <= 0) {
                    particles.splice(i, 1);
                    continue;
                }
                
                // Draw confetti piece
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                
                // Calculate current width to simulate 3D flip
                const currentWidth = p.width * Math.sin(p.wobble);
                
                // Drop shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1.5;
                
                ctx.globalAlpha = p.opacity;
                ctx.fillStyle = p.color;
                
                ctx.beginPath();
                ctx.rect(-currentWidth / 2, -p.height / 2, currentWidth, p.height);
                ctx.fill();
                
                ctx.restore();
            }
            
            requestAnimationFrame(update);
        }
        
        // Start animation
        requestAnimationFrame(update);
    }
});
