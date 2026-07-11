/* ==========================================================================
   SportIntel AI - Interactive Frontend Controller (Vanilla JS)
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // ==========================================================================
    // 📱 Mobile Menu Toggle
    // ==========================================================================
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const sidebar = document.querySelector(".sidebar");
    const sidebarOverlay = document.getElementById("sidebar-overlay");

    function toggleMobileMenu() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.toggle("open");
            sidebarOverlay.classList.toggle("active");
        }
    }

    window.closeMobileMenu = function() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.remove("open");
            sidebarOverlay.classList.remove("active");
        }
    };

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", toggleMobileMenu);
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener("click", window.closeMobileMenu);
    }

    // --- Global State ---
    let appData = null;
    let selectedMatch = null;
    let performanceChartInstance = null;
    let currentSportFilter = "all";
    let currentMarketCat = "all";
    let marketSearchVal = "";
    let matchSearchQuery = "";

    // --- DOM Elements ---
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("page-title");
    const currentDateDisplay = document.getElementById("current-date-display");
    const refreshDataBtn = document.getElementById("refresh-data-btn");

    // Dashboard Elements
    const statAnalyzed = document.getElementById("stat-analyzed");
    const statAccuracy = document.getElementById("stat-accuracy");
    const statRoi = document.getElementById("stat-roi");
    const statWonPicks = document.getElementById("stat-won-picks");
    const globalAccuracyBadge = document.getElementById("global-accuracy");
    const starTicketDetails = document.getElementById("star-ticket-details");
    const starTicketConfidence = document.getElementById("star-ticket-confidence");
    const starTicketProgress = document.getElementById("star-ticket-progress");
    const starTicketReasoning = document.getElementById("star-ticket-reasoning");
    const btnCopyStarTicket = document.getElementById("btn-copy-star-ticket");
    const dashboardMatchesGrid = document.getElementById("dashboard-matches-grid");

    // Matches Elements
    const filterBtns = document.querySelectorAll(".filter-btn");
    const matchesListContainer = document.getElementById("matches-list-container");
    const detailEmptyState = document.getElementById("detail-empty-state");
    const detailMainContent = document.getElementById("detail-main-content");
    const detailLeague = document.getElementById("detail-league");
    const detailHomeName = document.getElementById("detail-home-name");
    const detailAwayName = document.getElementById("detail-away-name");
    const detailHomeAvatar = document.getElementById("detail-home-avatar");
    const detailAwayAvatar = document.getElementById("detail-away-avatar");
    const detailStadium = document.getElementById("detail-stadium");
    const detailTime = document.getElementById("detail-time");
    
    // Match Detail Tabs
    const detailTabBtns = document.querySelectorAll(".detail-tab-btn");
    const detailSections = document.querySelectorAll(".detail-section");
    const tacticsFormationLabel = document.getElementById("tactics-formation-label");
    const homePlayersPitch = document.getElementById("home-players-pitch");
    const awayPlayersPitch = document.getElementById("away-players-pitch");
    
    // Stats Section
    const statsHomeFormName = document.getElementById("stats-home-form-name");
    const statsAwayFormName = document.getElementById("stats-away-form-name");
    const statsHomeFormBubbles = document.getElementById("stats-home-form-bubbles");
    const statsAwayFormBubbles = document.getElementById("stats-away-form-bubbles");
    const h2hHomeWins = document.getElementById("h2h-home-wins");
    const h2hDraws = document.getElementById("h2h-draws");
    const h2hAwayWins = document.getElementById("h2h-away-wins");
    const h2hListContainer = document.getElementById("h2h-list-container");
    const detailPicksContainer = document.getElementById("detail-picks-container");

    // Generator Elements
    const betGeneratorForm = document.getElementById("bet-generator-form");
    const inputRisk = document.getElementById("input-risk");
    const riskValueDisplay = document.getElementById("risk-value-display");
    const inputMaxOdd = document.getElementById("input-max-odd");
    const oddMaxDisplay = document.getElementById("odd-max-display");
    const ticketEmptyState = document.getElementById("ticket-empty-state");
    const ticketLoadingState = document.getElementById("ticket-loading-state");
    const ticketMainContent = document.getElementById("ticket-main-content");
    
    // Generated Ticket DOM
    const lblTicketId = document.getElementById("lbl-ticket-id");
    const ticketRiskBadge = document.getElementById("ticket-risk-badge");
    const ticketConfidenceVal = document.getElementById("ticket-confidence-val");
    const ticketEventsContainer = document.getElementById("ticket-events-container");
    const ticketStakeDisplay = document.getElementById("ticket-stake-display");
    const ticketTotalOddDisplay = document.getElementById("ticket-total-odd-display");
    const ticketPayoutDisplay = document.getElementById("ticket-payout-display");
    const btnExportTicket = document.getElementById("btn-export-ticket");

    // News Elements
    const gossipListContainer = document.getElementById("gossip-list-container");
    const injuriesTableBody = document.getElementById("injuries-table-body");

    // Modal Elements
    const playerModal = document.getElementById("player-modal");
    const playerModalOverlay = document.getElementById("player-modal-overlay");
    const btnCloseModal = document.getElementById("btn-close-modal");
    const modalPlayerName = document.getElementById("modal-player-name");
    const modalPlayerTeam = document.getElementById("modal-player-team");
    const modalPlayerPos = document.getElementById("modal-player-pos");
    const modalPlayerNum = document.getElementById("modal-player-num");
    const modalPlayerStatus = document.getElementById("modal-player-status");
    const modalPlayerDesc = document.getElementById("modal-player-desc");
    // Bankroll Elements
    const bankrollBalanceVal = document.getElementById("bankroll-balance-val");
    const bankrollRoiVal = document.getElementById("bankroll-roi-val");
    const bankrollProfitVal = document.getElementById("bankroll-profit-val");
    const bankrollWinrateVal = document.getElementById("bankroll-winrate-val");
    const betMatchSelect = document.getElementById("bet-match-select");
    const betMarketInput = document.getElementById("bet-market-input");
    const betOddInput = document.getElementById("bet-odd-input");
    const betStakeInput = document.getElementById("bet-stake-input");
    const betStatusSelect = document.getElementById("bet-status-select");
    const btnSubmitBet = document.getElementById("btn-submit-bet");
    const btnClearBets = document.getElementById("btn-clear-bets");
    const betsTableBody = document.getElementById("bets-table-body");
    const inputStartingBankroll = document.getElementById("input-starting-bankroll");
    let bankrollChartInstance = null;

    // Escalera Elements
    const escaleraDayVal = document.getElementById("escalera-day-val");
    const escaleraStakeVal = document.getElementById("escalera-stake-val");
    const escaleraNextReturnVal = document.getElementById("escalera-next-return-val");
    const escaleraGoalVal = document.getElementById("escalera-goal-val");
    const escaleraStepsContainer = document.getElementById("escalera-steps-container");
    const lblEscaleraDayTitle = document.getElementById("lbl-escalera-day-title");
    const escaleraPickCardContent = document.getElementById("escalera-pick-card-content");
    const btnEscaleraWin = document.getElementById("btn-escalera-win");
    const btnEscaleraLose = document.getElementById("btn-escalera-lose");
    const inputEscaleraStartStake = document.getElementById("input-escalera-start-stake");
    const inputEscaleraTargetDays = document.getElementById("input-escalera-target-days");
    const escaleraHistoryTableBody = document.getElementById("escalera-history-table-body");
    const btnClearEscaleraHistory = document.getElementById("btn-clear-escalera-history");
    // --- Tab Navigation Setup ---
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetTab = item.getAttribute("data-tab");
            
            navItems.forEach(n => n.classList.remove("active"));
            tabContents.forEach(tc => tc.classList.remove("active"));
            
            item.classList.add("active");
            document.getElementById(targetTab).classList.add("active");

            // Close mobile menu
            closeMobileMenu();

            // Update Page Title
            if (targetTab === "dashboard") pageTitle.textContent = "Panel Principal";
            if (targetTab === "matches") pageTitle.textContent = "Análisis del Mercado";
            if (targetTab === "generator") pageTitle.textContent = "Creador de Apuestas";
            if (targetTab === "news") pageTitle.textContent = "Reporte de Noticias y Bajas";
            if (targetTab === "bankroll") {
                pageTitle.textContent = "Gestión de Bankroll";
                setTimeout(updateBankrollChart, 100);
            }
            if (targetTab === "escalera") {
                pageTitle.textContent = "Reto Escalera 30 Días";
                renderEscaleraTab();
            }
            
            // Re-render chart on switch if in dashboard (helps canvas scaling)
            if (targetTab === "dashboard" && appData) {
                setTimeout(renderChart, 100);
            }
        });
    });

    // --- Date formatter ---
    function formatTodayDate() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        currentDateDisplay.textContent = today.toLocaleDateString('es-ES', options);
    }
    formatTodayDate();

    // --- 1xBet Markets Search & Filter Listeners ---
    const marketFilters = document.querySelectorAll("[data-market-cat]");
    marketFilters.forEach(btn => {
        btn.addEventListener("click", () => {
            marketFilters.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentMarketCat = btn.getAttribute("data-market-cat");
            render1xBetMarkets();
        });
    });

    const marketSearchInput = document.getElementById("market-search");
    if (marketSearchInput) {
        marketSearchInput.addEventListener("input", (e) => {
            marketSearchVal = e.target.value.toLowerCase().trim();
            render1xBetMarkets();
        });
    }

    const matchSearchInput = document.getElementById("match-search-input");
    if (matchSearchInput) {
        matchSearchInput.addEventListener("input", (e) => {
            matchSearchQuery = e.target.value.toLowerCase().trim();
            populateMatchesList();
        });
    }

    // --- Load Data from JSON ---
    async function loadSportsData() {
        try {
            const response = await fetch("data.json");
            if (!response.ok) {
                throw new Error("No se pudo cargar el archivo data.json");
            }
            appData = await response.json();
            
            populateStats();
            populateDashboardPicks();
            populateMatchesList();
            populateNewsAndInjuries();
            
            // Render first visual chart
            renderChart();
        } catch (error) {
            console.error("Error cargando los datos deportivos:", error);
            alert("No se pudieron cargar los análisis del día. Por favor, asegúrate de que el script backend se haya ejecutado.");
        }
    }
    
    // --- Manual Reload Action ---
    refreshDataBtn.addEventListener("click", async () => {
        refreshDataBtn.disabled = true;
        const icon = refreshDataBtn.querySelector("i");
        icon.classList.add("fa-spin");
        
        // Simular llamada al backend o recargar JSON
        await loadSportsData();
        
        setTimeout(() => {
            icon.classList.remove("fa-spin");
            refreshDataBtn.disabled = false;
        }, 1000);
    });

    // --- Populate Dashboard Statistics ---
    function populateStats() {
        if (!appData) return;
        const stats = appData.global_stats;
        statAnalyzed.textContent = stats.analyzed_today;
        statAccuracy.textContent = `${stats.avg_accuracy_30d}%`;
        statRoi.textContent = `+${stats.roi_percentage}%`;
        statWonPicks.textContent = stats.total_picks_won;
        globalAccuracyBadge.textContent = `${stats.avg_accuracy_30d}%`;
    }

    // --- Render "Star Ticket" & Key Matches ---
    function populateDashboardPicks() {
        if (!appData) return;
        
        // Star Ticket render
        const ticket = appData.star_ticket;
        let selectionsHtml = "";
        
        ticket.selections.forEach(sel => {
            selectionsHtml += `
                <div class="ticket-line-item">
                    <div class="ticket-item-details">
                        <span class="ticket-item-match">${sel.match}</span>
                        <span class="ticket-item-market">${sel.market}</span>
                        <span class="ticket-item-pick">${sel.pick}</span>
                    </div>
                    <div class="ticket-item-odd">${sel.odd.toFixed(2)}</div>
                </div>
            `;
        });
        
        // Agregar cuota combinada
        selectionsHtml += `
            <div class="ticket-summary-odd">
                <span>Cuota Acumulada</span>
                <span class="total-odd-val">${ticket.total_odd.toFixed(2)}</span>
            </div>
        `;
        
        starTicketDetails.innerHTML = selectionsHtml;
        starTicketConfidence.textContent = `${ticket.confidence}%`;
        starTicketProgress.style.width = `${ticket.confidence}%`;
        starTicketReasoning.textContent = ticket.reasoning;
        
        // Copy Ticket Button
        btnCopyStarTicket.onclick = () => {
            let copyText = `BOLETO ESTRELLA DEL DÍA - SportIntel AI\n`;
            ticket.selections.forEach(s => {
                copyText += `- ${s.match} | Pronóstico: ${s.pick} (Cuota: ${s.odd.toFixed(2)})\n`;
            });
            copyText += `Cuota Total: ${ticket.total_odd.toFixed(2)}\n`;
            copyText += `Confianza: ${ticket.confidence}%`;
            
            navigator.clipboard.writeText(copyText).then(() => {
                const originalText = btnCopyStarTicket.innerHTML;
                btnCopyStarTicket.innerHTML = `<i class="fa-solid fa-check"></i> ¡Copiado al portapapeles!`;
                btnCopyStarTicket.classList.add("btn-success");
                
                setTimeout(() => {
                    btnCopyStarTicket.innerHTML = originalText;
                    btnCopyStarTicket.classList.remove("btn-success");
                }, 2000);
            });
        };

        // Key Matches of the Day grid
        let matchesGridHtml = "";
        appData.matches.slice(0, 4).forEach(match => {
            const bestPick = match.picks[0];
            const homeInitials = match.home.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase();
            const awayInitials = match.away.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase();

            matchesGridHtml += `
                <div class="match-compact-card" data-match-id="${match.id}">
                    <div class="match-compact-header">
                        <span>${match.league}</span>
                        <span>${match.time} HS</span>
                    </div>
                    <div class="match-compact-body">
                        <div class="compact-team-row">
                            <span class="compact-team-name">
                                <span class="team-dot" style="background-color: ${match.home_color}"></span>
                                ${match.home}
                            </span>
                            <span class="form-badge-mini">${match.home_form}</span>
                        </div>
                        <div class="compact-team-row">
                            <span class="compact-team-name">
                                <span class="team-dot" style="background-color: ${match.away_color}"></span>
                                ${match.away}
                            </span>
                            <span class="form-badge-mini">${match.away_form}</span>
                        </div>
                    </div>
                    <div class="match-compact-footer">
                        <span class="compact-pick">${bestPick.selection}</span>
                        <span class="compact-odd">@${bestPick.odd.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });
        
        dashboardMatchesGrid.innerHTML = matchesGridHtml;

        // Click Handler for dashboard cards to open match details
        dashboardMatchesGrid.querySelectorAll(".match-compact-card").forEach(card => {
            card.addEventListener("click", () => {
                const matchId = card.getAttribute("data-match-id");
                // Switch Tab
                document.getElementById("nav-matches").click();
                // Select Match in list
                selectMatchById(matchId);
            });
        });
    }

    // --- Render Accuracy Trend Chart ---
    function renderChart() {
        const ctx = document.getElementById("performance-chart").getContext("2d");
        
        // Destruir grafico previo si existe
        if (performanceChartInstance) {
            performanceChartInstance.destroy();
        }

        // Crear gradiente premium
        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
        gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.15)');
        gradient.addColorStop(1, 'rgba(8, 11, 17, 0.0)');

        const labels = ["Día -14", "Día -13", "Día -12", "Día -11", "Día -10", "Día -9", "Día -8", "Día -7", "Día -6", "Día -5", "Día -4", "Día -3", "Día -2", "Día -1", "Hoy"];
        const dataValues = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

        performanceChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Precisión (%)",
                    data: dataValues,
                    borderColor: "#06B6D4",
                    borderWidth: 3,
                    pointBackgroundColor: "#10B981",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.35,
                    fill: true,
                    backgroundColor: gradient
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#0f1422",
                        titleColor: "#9CA3AF",
                        bodyColor: "#F3F4F6",
                        borderColor: "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Precisión: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#6B7280",
                            font: { family: "Outfit", size: 10 }
                        }
                    },
                    y: {
                        min: 65,
                        max: 85,
                        grid: { color: "rgba(255, 255, 255, 0.03)" },
                        ticks: {
                            color: "#6B7280",
                            font: { family: "Outfit", size: 10 },
                            stepSize: 5
                        }
                    }
                }
            }
        });
    }

    // --- Matches List Panel Controller ---
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentSportFilter = btn.getAttribute("data-sport");
            populateMatchesList();
        });
    });

    function populateMatchesList() {
        if (!appData) return;
        
        let listHtml = "";
        const filteredMatches = appData.matches.filter(m => {
            const matchesSport = currentSportFilter === "all" || m.sport === currentSportFilter;
            const matchesSearch = !matchSearchQuery || 
                                  m.home.toLowerCase().includes(matchSearchQuery) || 
                                  m.away.toLowerCase().includes(matchSearchQuery) || 
                                  m.league.toLowerCase().includes(matchSearchQuery);
            return matchesSport && matchesSearch;
        });
        
        if (filteredMatches.length === 0) {
            matchesListContainer.innerHTML = `<div class="empty-list-note">No se encontraron partidos para tu búsqueda.</div>`;
            return;
        }

        filteredMatches.forEach(match => {
            const isSelected = selectedMatch && selectedMatch.id === match.id ? "selected" : "";
            let sportIcon = '<i class="fa-solid fa-soccer-ball"></i>';
            if (match.sport === "Basketball") sportIcon = '<i class="fa-solid fa-basketball"></i>';
            if (match.sport === "Tennis") sportIcon = '<i class="fa-solid fa-baseball"></i>';
            
            listHtml += `
                <div class="match-list-item ${isSelected}" data-match-id="${match.id}">
                    <div class="item-meta">
                        <span>${sportIcon} ${match.league}</span>
                        <span>${match.time}</span>
                    </div>
                    <div class="item-teams">
                        <div class="item-team">
                            <span class="team-dot" style="background-color: ${match.home_color}"></span>
                            ${match.home}
                        </div>
                        <div class="item-team">
                            <span class="team-dot" style="background-color: ${match.away_color}"></span>
                            ${match.away}
                        </div>
                    </div>
                </div>
            `;
        });
        
        matchesListContainer.innerHTML = listHtml;

        // Set Click Handlers
        matchesListContainer.querySelectorAll(".match-list-item").forEach(item => {
            item.addEventListener("click", () => {
                const matchId = item.getAttribute("data-match-id");
                selectMatchById(matchId);
            });
        });
    }

    function selectMatchById(matchId) {
        selectedMatch = appData.matches.find(m => m.id === matchId);
        
        // Highlight active list item
        const items = matchesListContainer.querySelectorAll(".match-list-item");
        items.forEach(it => {
            if (it.getAttribute("data-match-id") === matchId) {
                it.classList.add("selected");
            } else {
                it.classList.remove("selected");
            }
        });

        renderMatchDetails();
    }

    // --- Render Match Detailed Analysis View ---
    function renderMatchDetails() {
        if (!selectedMatch) {
            detailEmptyState.classList.remove("hidden");
            detailMainContent.classList.add("hidden");
            return;
        }

        detailEmptyState.classList.add("hidden");
        detailMainContent.classList.remove("hidden");

        const detailPanel = document.getElementById("match-detail-view");
        if (detailPanel) {
            detailPanel.classList.add("show-on-mobile");
            // Auto-scroll on mobile
            if (window.innerWidth <= 900) {
                setTimeout(() => detailPanel.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
            }
        }

        // Set Headers
        detailLeague.textContent = selectedMatch.league;
        detailHomeName.textContent = selectedMatch.home;
        detailAwayName.textContent = selectedMatch.away;
        detailStadium.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${selectedMatch.stadium}`;
        detailTime.innerHTML = `<i class="fa-regular fa-clock"></i> ${selectedMatch.time} HS`;
        
        // Avatars / Logos initials
        detailHomeAvatar.textContent = selectedMatch.home.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase();
        detailHomeAvatar.style.backgroundColor = selectedMatch.home_color;
        detailHomeAvatar.style.color = selectedMatch.home_color === "#FFFFFF" ? "#111827" : "#FFFFFF";
        detailHomeAvatar.style.borderColor = selectedMatch.home_accent;

        detailAwayAvatar.textContent = selectedMatch.away.split(" ").map(w => w[0]).join("").substring(0, 3).toUpperCase();
        detailAwayAvatar.style.backgroundColor = selectedMatch.away_color;
        detailAwayAvatar.style.color = selectedMatch.away_color === "#FFFFFF" ? "#111827" : "#FFFFFF";
        detailAwayAvatar.style.borderColor = selectedMatch.away_accent;

        // Reset detail tab to default (Tactics)
        detailTabBtns.forEach(b => {
            if (b.getAttribute("data-section") === "tactics") b.classList.add("active");
            else b.classList.remove("active");
        });
        detailSections.forEach(s => {
            if (s.id === "sect-tactics") s.classList.add("active");
            else s.classList.remove("active");
        });

        // 1. Render Tactics / 2D Field Pitch
        tacticsFormationLabel.textContent = `${selectedMatch.lineups.home.formation} vs ${selectedMatch.lineups.away.formation}`;
        
        // Draw Field Players
        const isFootball = selectedMatch.sport === "Football";
        const isBasketball = selectedMatch.sport === "Basketball";
        
        // Adjust Pitch styling based on sport
        const pitch = document.querySelector(".field-pitch");
        if (isFootball) {
            pitch.style.background = "radial-gradient(circle, #1a3e21 0%, #0d220e 100%)";
            pitch.querySelector(".pitch-center-circle").style.display = "block";
            pitch.querySelector(".pitch-box-top").style.display = "block";
            pitch.querySelector(".pitch-box-bottom").style.display = "block";
        } else if (isBasketball) {
            // Basketball Court
            pitch.style.background = "radial-gradient(circle, #a16207 0%, #713f12 100%)"; // color madera
            pitch.querySelector(".pitch-center-circle").style.display = "block";
            pitch.querySelector(".pitch-box-top").style.display = "none";
            pitch.querySelector(".pitch-box-bottom").style.display = "none";
        } else {
            // Tennis Court
            pitch.style.background = "radial-gradient(circle, #1b3a4b 0%, #0f202a 100%)"; // color azul cancha rápida
            pitch.querySelector(".pitch-center-circle").style.display = "none";
            pitch.querySelector(".pitch-box-top").style.display = "none";
            pitch.querySelector(".pitch-box-bottom").style.display = "none";
        }

        // Render Home team players
        let homePlayersHtml = "";
        selectedMatch.lineups.home.players.forEach(p => {
            const hasInjury = selectedMatch.home_injuries.find(inj => inj.player === p.name);
            const dotColor = selectedMatch.home_color;
            const borderGlow = hasInjury ? `box-shadow: 0 0 10px ${selectedMatch.home_accent}, 0 0 0 3px var(--accent-pink)` : `border-color: ${selectedMatch.home_accent}`;
            const textColor = dotColor === "#FFFFFF" ? "#111827" : "#FFFFFF";

            homePlayersHtml += `
                <div class="player-node" 
                     style="left: ${p.x}%; top: ${p.y}%; background-color: ${dotColor}; color: ${textColor}; ${borderGlow}"
                     data-player-name="${p.name}" data-team="home">
                    ${p.number}
                    <div class="pos-lbl">${p.pos}</div>
                    <span class="tooltip">${p.name} ${hasInjury ? '(⚠️ Duda)' : ''}</span>
                </div>
            `;
        });
        homePlayersPitch.innerHTML = homePlayersHtml;

        // Render Away team players
        let awayPlayersHtml = "";
        selectedMatch.lineups.away.players.forEach(p => {
            const hasInjury = selectedMatch.away_injuries.find(inj => inj.player === p.name);
            const dotColor = selectedMatch.away_color;
            const borderGlow = hasInjury ? `box-shadow: 0 0 10px ${selectedMatch.away_accent}, 0 0 0 3px var(--accent-pink)` : `border-color: ${selectedMatch.away_accent}`;
            const textColor = dotColor === "#FFFFFF" ? "#111827" : "#FFFFFF";

            awayPlayersHtml += `
                <div class="player-node" 
                     style="left: ${p.x}%; top: ${p.y}%; background-color: ${dotColor}; color: ${textColor}; ${borderGlow}"
                     data-player-name="${p.name}" data-team="away">
                    ${p.number}
                    <div class="pos-lbl">${p.pos}</div>
                    <span class="tooltip">${p.name} ${hasInjury ? '(⚠️ Duda)' : ''}</span>
                </div>
            `;
        });
        awayPlayersPitch.innerHTML = awayPlayersHtml;

        // Click interaction on tactical nodes
        document.querySelectorAll(".player-node").forEach(node => {
            node.addEventListener("click", () => {
                const playerName = node.getAttribute("data-player-name");
                const teamSide = node.getAttribute("data-team");
                openPlayerModal(playerName, teamSide);
            });
        });

        // 2. Render H2H and Form
        statsHomeFormName.textContent = selectedMatch.home;
        statsAwayFormName.textContent = selectedMatch.away;
        
        // Draw form bubbles
        function getFormBubblesHtml(formString) {
            return formString.split("-").map(res => {
                const lower = res.toLowerCase();
                return `<span class="form-bubble ${lower}">${res}</span>`;
            }).join("");
        }
        statsHomeFormBubbles.innerHTML = getFormBubblesHtml(selectedMatch.home_form);
        statsAwayFormBubbles.innerHTML = getFormBubblesHtml(selectedMatch.away_form);

        // H2H Calculations
        const totalH2H = selectedMatch.h2h.home_wins + selectedMatch.h2h.away_wins + selectedMatch.h2h.draws;
        const pHome = (selectedMatch.h2h.home_wins / totalH2H) * 100;
        const pDraw = (selectedMatch.h2h.draws / totalH2H) * 100;
        const pAway = (selectedMatch.h2h.away_wins / totalH2H) * 100;

        h2hHomeWins.style.width = `${pHome}%`;
        h2hHomeWins.textContent = `Local: ${selectedMatch.h2h.home_wins}`;
        
        h2hDraws.style.width = `${pDraw}%`;
        h2hDraws.textContent = `Empates: ${selectedMatch.h2h.draws}`;
        if (selectedMatch.h2h.draws === 0) h2hDraws.style.display = "none";
        else h2hDraws.style.display = "block";

        h2hAwayWins.style.width = `${pAway}%`;
        h2hAwayWins.textContent = `Visita: ${selectedMatch.h2h.away_wins}`;

        // H2H detailed matches
        let h2hHtml = "";
        selectedMatch.h2h.last_results.forEach(res => {
            h2hHtml += `
                <div class="h2h-item">
                    <span class="h2h-date">${res.date}</span>
                    <span class="h2h-score">${res.score}</span>
                    <span class="h2h-win-badge">${res.winner === "Draw" ? "Empate" : `Ganador: ${res.winner}`}</span>
                </div>
            `;
        });
        h2hListContainer.innerHTML = h2hHtml;

        // 3. Render Predictions List
        let picksHtml = "";
        selectedMatch.picks.forEach(pick => {
            picksHtml += `
                <div class="pick-card">
                    <div class="pick-card-header">
                        <span class="pick-market">${pick.market}</span>
                        <span class="pick-odd-badge">@${pick.odd.toFixed(2)}</span>
                    </div>
                    <div class="pick-selection-row">
                        <span class="pick-selection">${pick.selection}</span>
                        <span class="pick-prob-badge"><i class="fa-solid fa-brain"></i> Confianza IA: ${pick.probability}%</span>
                    </div>
                    <div class="pick-reasoning">
                        ${pick.reasoning}
                    </div>
                </div>
            `;
        });
        detailPicksContainer.innerHTML = picksHtml;

        // Resetear buscador y filtros de mercados de 1xBet al cambiar de partido
        if (marketSearchInput) marketSearchInput.value = "";
        marketSearchVal = "";
        currentMarketCat = "all";
        marketFilters.forEach(b => {
            if (b.getAttribute("data-market-cat") === "all") b.classList.add("active");
            else b.classList.remove("active");
        });

        // Dibujar los +1000 mercados de 1xBet
        render1xBetMarkets();
    }

    // Match Detail Section Tab Switcher
    detailTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const sectionTarget = btn.getAttribute("data-section");
            
            detailTabBtns.forEach(b => b.classList.remove("active"));
            detailSections.forEach(s => s.classList.remove("active"));
            
            btn.classList.add("active");
            document.getElementById(`sect-${sectionTarget}`).classList.add("active");
        });
    });

    // --- Interactive Player Modal Controller ---
    function openPlayerModal(playerName, teamSide) {
        const teamInfo = teamSide === "home" ? selectedMatch.home : selectedMatch.away;
        const lineupObj = teamSide === "home" ? selectedMatch.lineups.home : selectedMatch.lineups.away;
        const injuriesArr = teamSide === "home" ? selectedMatch.home_injuries : selectedMatch.away_injuries;
        
        const playerTactical = lineupObj.players.find(p => p.name === playerName);
        const injuryStatus = injuriesArr.find(inj => inj.player === playerName);

        modalPlayerName.textContent = playerName;
        modalPlayerTeam.textContent = teamInfo;
        modalPlayerPos.textContent = playerTactical ? translatePosition(playerTactical.pos) : "Jugador";
        modalPlayerNum.textContent = playerTactical ? playerTactical.number : "-";
        
        if (injuryStatus) {
            modalPlayerStatus.textContent = injuryStatus.status === "Out" ? "Confirmado de baja (❌ Out)" : "En duda por molestia (⚠️ Duda)";
            modalPlayerStatus.className = `value badge ${injuryStatus.status === "Out" ? 'bg-pink' : 'bg-amber'}`;
            modalPlayerDesc.textContent = `Informe Médico: Presenta ${injuryStatus.type.toLowerCase()}. El departamento de rendimiento de IA indica que su ausencia reduce la proyección defensiva en un 8%.`;
        } else {
            modalPlayerStatus.textContent = "Disponible al 100% (✔️)";
            modalPlayerStatus.className = "value badge bg-green";
            modalPlayerDesc.textContent = "El analista táctico confirma que este jugador ha completado todos los entrenamientos tácticos previos sin molestias. Clave para el juego aéreo y distribución de balón en el esquema inicial.";
        }

        playerModal.classList.remove("hidden");
    }

    function translatePosition(pos) {
        const dict = {
            "PO": "Portero / Goalkeeper",
            "LD": "Lateral Derecho",
            "LI": "Lateral Izquierdo",
            "DFC": "Defensa Central",
            "MC": "Mediocampista",
            "MCD": "Mediocampista Defensivo",
            "MCO": "Mediocampista Ofensivo",
            "MD": "Medio Derecho",
            "MI": "Medio Izquierdo",
            "ED": "Extremo Derecho",
            "EI": "Extremo Izquierdo",
            "DC": "Delantero Centro",
            "B": "Base / Point Guard",
            "E": "Escolta / Shooting Guard",
            "A": "Alero / Small Forward",
            "AP": "Ala-Pivot / Power Forward",
            "P": "Pivot / Center"
        };
        return dict[pos] || pos;
    }

    function closeModal() {
        playerModal.classList.add("hidden");
    }
    
    btnCloseModal.addEventListener("click", closeModal);
    playerModalOverlay.addEventListener("click", closeModal);

    // --- Ticket Generator Controller ---
    // Update risk badge text in form dynamically
    inputRisk.addEventListener("input", (e) => {
        const val = parseInt(e.target.value);
        if (val === 1) {
            riskValueDisplay.textContent = "Conservador";
            riskValueDisplay.className = "badge bg-green";
        } else if (val === 2) {
            riskValueDisplay.textContent = "Equilibrado";
            riskValueDisplay.className = "badge bg-amber";
        } else {
            riskValueDisplay.textContent = "Agresivo";
            riskValueDisplay.className = "badge bg-pink";
        }
    });

    // Update max odds label dynamically
    inputMaxOdd.addEventListener("input", (e) => {
        oddMaxDisplay.textContent = parseFloat(e.target.value).toFixed(2);
    });

    betGeneratorForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        // Hide previous output & show loader
        ticketEmptyState.classList.add("hidden");
        ticketMainContent.classList.add("hidden");
        ticketLoadingState.classList.remove("hidden");

        // Read form inputs
        const selectedSport = document.querySelector("input[name='gen-sport']:checked").value;
        const stake = parseFloat(document.getElementById("input-stake").value);
        const riskLevel = parseInt(inputRisk.value);
        const maxOddAllowed = parseFloat(inputMaxOdd.value);

        // Simulate advanced AI parsing calculation
        setTimeout(() => {
            ticketLoadingState.classList.add("hidden");
            generateAlgorithmTicket(selectedSport, stake, riskLevel, maxOddAllowed);
        }, 1500);
    });

    function generateAlgorithmTicket(sport, stake, riskVal, maxOdd) {
        if (!appData) return;

        // Filter valid matches and picks
        let availablePicks = [];
        appData.matches.forEach(match => {
            if (sport !== "all" && match.sport !== sport) return;

            match.picks.forEach(pick => {
                // Filter by max odd setting
                if (pick.odd > maxOdd) return;

                availablePicks.push({
                    matchName: `${match.home} vs ${match.away}`,
                    leagueName: match.league,
                    sportName: match.sport,
                    market: pick.market,
                    selection: pick.selection,
                    odd: pick.odd,
                    probability: pick.probability,
                    risk: pick.risk
                });
            });
        });

        if (availablePicks.length === 0) {
            alert("No se encontraron selecciones en el mercado que cumplan con la cuota máxima u otros filtros seleccionados.");
            ticketEmptyState.classList.remove("hidden");
            return;
        }

        // Sort picks based on risk mapping
        // Conservador: prefiere probability alta y risk "Low"
        // Equilibrado: prefiere risk "Low" y "Medium"
        // Agresivo: prefiere cuotas más jugosas, incluye risk "High"
        let filteredPicks = [];
        if (riskVal === 1) { // Conservador
            filteredPicks = availablePicks.filter(p => p.risk === "Low" || p.probability >= 60);
        } else if (riskVal === 2) { // Equilibrado
            filteredPicks = availablePicks.filter(p => p.risk === "Medium" || p.risk === "Low");
        } else { // Agresivo
            filteredPicks = availablePicks;
        }

        // Si no hay suficientes tras filtrar por riesgo, usar los más probables disponibles
        if (filteredPicks.length === 0) {
            filteredPicks = availablePicks;
        }

        // Seleccionar aleatoriamente pero controlado entre 2 y 3 picks para armar la combinada
        // Ordenar por relevancia y probabilidad
        filteredPicks.sort((a, b) => b.probability - a.probability);
        
        const count = Math.min(filteredPicks.length, riskVal === 1 ? 2 : (riskVal === 2 ? 3 : 4));
        const selectedPicks = filteredPicks.slice(0, count);

        // Calculate Totals
        let accumulatedOdd = 1.0;
        let sumConfidence = 0;
        let eventsHtml = "";

        selectedPicks.forEach(pick => {
            accumulatedOdd *= pick.odd;
            sumConfidence += pick.probability;
            
            eventsHtml += `
                <div class="ticket-event-row">
                    <div class="ticket-event-meta">
                        <span>${pick.leagueName} (${pick.sportName === 'Football' ? 'Fútbol' : 'NBA'})</span>
                        <span class="ticket-event-odd">@${pick.odd.toFixed(2)}</span>
                    </div>
                    <div class="ticket-event-selection">
                        <span class="ticket-event-pick-lbl">${pick.matchName}</span>
                        <span class="ticket-event-pick-val">${pick.selection}</span>
                    </div>
                </div>
            `;
        });

        const totalOdd = accumulatedOdd;
        const avgConfidence = Math.round(sumConfidence / count);
        const potentialPayout = stake * totalOdd;

        // Render Generated Ticket values
        lblTicketId.textContent = `#TK-${Math.floor(100000 + Math.random() * 900000)}`;
        
        let riskLabelText = "Bajo";
        let riskBadgeClass = "badge bg-green";
        if (riskVal === 2) {
            riskLabelText = "Medio";
            riskBadgeClass = "badge bg-amber";
        } else if (riskVal === 3) {
            riskLabelText = "Alto";
            riskBadgeClass = "badge bg-pink";
        }

        ticketRiskBadge.textContent = riskLabelText;
        ticketRiskBadge.className = `val ${riskBadgeClass}`;
        ticketConfidenceVal.textContent = `${avgConfidence}%`;
        
        ticketEventsContainer.innerHTML = eventsHtml;
        ticketStakeDisplay.textContent = `$${stake.toFixed(2)}`;
        ticketTotalOddDisplay.textContent = totalOdd.toFixed(2);
        ticketPayoutDisplay.textContent = `$${potentialPayout.toFixed(2)}`;

        // Show ticket with fade in
        ticketMainContent.classList.remove("hidden");

        // Action Buttons Setup
        btnExportTicket.onclick = () => {
            const originalText = btnExportTicket.innerHTML;
            btnExportTicket.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generando comprobante...`;
            
            setTimeout(() => {
                btnExportTicket.innerHTML = `<i class="fa-solid fa-check"></i> Comprobante Guardado`;
                btnExportTicket.classList.add("btn-success");
                
                setTimeout(() => {
                    btnExportTicket.innerHTML = originalText;
                    btnExportTicket.classList.remove("btn-success");
                    alert("Se ha simulado la exportación del boleto digital. En un entorno de producción, esto generaría un archivo PDF o PNG para descargar.");
                }, 1500);
            }, 1000);
        };
    }

    // --- News, Gossip & Injuries View Controller ---
    function populateNewsAndInjuries() {
        if (!appData) return;

        // Gossip Feed
        let gossipHtml = "";
        
        // Extraer rumores de todos los partidos
        let allRumors = [];
        appData.matches.forEach(match => {
            match.rumors.forEach(r => {
                allRumors.push({
                    ...r,
                    matchTeams: `${match.home} vs ${match.away}`
                });
            });
        });

        // Ordenar de forma aleatoria para dinamismo
        allRumors.forEach(r => {
            const stars = '<i class="fa-solid fa-star"></i>'.repeat(r.credibility) + '<i class="fa-regular fa-star"></i>'.repeat(5 - r.credibility);
            const sentimentClass = r.sentiment.toLowerCase();
            const sentimentText = r.sentiment === "Positive" ? "Optimista" : (r.sentiment === "Negative" ? "Alerta" : "Neutral");

            gossipHtml += `
                <div class="gossip-card">
                    <div class="gossip-header">
                        <span class="gossip-source">${r.source}</span>
                        <div class="gossip-rating">${stars}</div>
                    </div>
                    <p class="gossip-headline">"${r.headline}"</p>
                    <div class="gossip-footer">
                        <span>Partido: ${r.matchTeams}</span>
                        <span class="sentiment-pill ${sentimentClass}">${sentimentText}</span>
                    </div>
                </div>
            `;
        });
        gossipListContainer.innerHTML = gossipHtml;

        // Injuries Table compiling
        let tableRowsHtml = "";
        appData.matches.forEach(match => {
            // Local team injuries
            match.home_injuries.forEach(inj => {
                tableRowsHtml += `
                    <tr>
                        <td class="injury-player">${inj.player}</td>
                        <td class="injury-team">${match.home}</td>
                        <td>${inj.type}</td>
                        <td>
                            <span class="injury-status-badge ${inj.status.toLowerCase()}">
                                ${inj.status === 'Out' ? '❌ Baja' : '⚠️ Duda'}
                            </span>
                        </td>
                    </tr>
                `;
            });
            // Visitant team injuries
            match.away_injuries.forEach(inj => {
                tableRowsHtml += `
                    <tr>
                        <td class="injury-player">${inj.player}</td>
                        <td class="injury-team">${match.away}</td>
                        <td>${inj.type}</td>
                        <td>
                            <span class="injury-status-badge ${inj.status.toLowerCase()}">
                                ${inj.status === 'Out' ? '❌ Baja' : '⚠️ Duda'}
                            </span>
                        </td>
                    </tr>
                `;
            });
        });
        
        injuriesTableBody.innerHTML = tableRowsHtml;
    }

    // ==========================================================================
    // 🔑 1xBet / The Odds API Synchronization
    // ==========================================================================
    const btnOpenApiModal = document.getElementById("btn-open-api-modal");
    const btnCloseApiModal = document.getElementById("btn-close-api-modal");
    const apiModal = document.getElementById("api-modal");
    const apiModalOverlay = document.getElementById("api-modal-overlay");
    const apiKeyInput = document.getElementById("api-key-input");
    const apiSyncStatus = document.getElementById("api-sync-status");
    const btnSaveApiKey = document.getElementById("btn-save-api-key");

    // Open/Close Modal
    if (btnOpenApiModal) {
        btnOpenApiModal.onclick = () => {
            const savedKey = localStorage.getItem("odds_api_key");
            if (savedKey) {
                apiKeyInput.value = savedKey;
            }
            apiModal.classList.remove("hidden");
        };
    }

    const closeApiModal = () => {
        apiModal.classList.add("hidden");
    };

    if (btnCloseApiModal) btnCloseApiModal.onclick = closeApiModal;
    if (apiModalOverlay) apiModalOverlay.onclick = closeApiModal;

    // Save & Sync API Key
    if (btnSaveApiKey) {
        btnSaveApiKey.onclick = async () => {
            const key = apiKeyInput.value.trim();
            if (!key) {
                localStorage.removeItem("odds_api_key");
                apiSyncStatus.textContent = "Estado: Desconectado (Usando cuotas estimadas)";
                apiSyncStatus.className = "badge";
                alert("Clave de API eliminada. Se han restaurado las cuotas por defecto.");
                closeApiModal();
                await loadSportsData(); // Recargar datos base
                if (btnOpenApiModal) {
                    btnOpenApiModal.innerHTML = `<i class="fa-solid fa-key"></i> Sincronizar 1xBet`;
                    btnOpenApiModal.style.borderColor = "var(--accent-amber)";
                    btnOpenApiModal.style.color = "var(--accent-amber)";
                }
                return;
            }

            btnSaveApiKey.disabled = true;
            btnSaveApiKey.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Sincronizando...`;
            apiSyncStatus.textContent = "Estado: Sincronizando con 1xBet...";
            apiSyncStatus.className = "badge bg-amber";

            const success = await sync1xBetOdds(key);

            btnSaveApiKey.disabled = false;
            btnSaveApiKey.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Guardar y Sincronizar`;

            if (success) {
                localStorage.setItem("odds_api_key", key);
                closeApiModal();
            } else {
                apiSyncStatus.textContent = "Estado: Error en la conexión (Clave inválida o límite excedido)";
                apiSyncStatus.className = "badge bg-pink";
                alert("Error al conectar con la API de cuotas. Por favor, verifica que tu API Key sea correcta o que no esté bloqueada.");
            }
        };
    }

    // Function to fetch real odds from 1xBet using The Odds API
    async function sync1xBetOdds(key) {
        try {
            // El WNBA ID en The Odds API es basketball_wnba. El del Mundial es soccer_fifa_world_cup.
            // Para simplificar, buscaremos cuotas de fútbol (Mundial y ligas mayores) y baloncesto WNBA
            const soccerUrl = `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${key}&regions=eu&bookmakers=onexbet&markets=h2h`;
            const wnbaUrl = `https://api.the-odds-api.com/v4/sports/basketball_wnba/odds/?apiKey=${key}&regions=eu&bookmakers=onexbet&markets=h2h`;

            // Realizar las llamadas de forma segura (si una falla, continuar)
            let apiDataList = [];
            
            // 1. Obtener Fútbol
            try {
                const response = await fetch(soccerUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) apiDataList = apiDataList.concat(data);
                }
            } catch (e) { console.error("Error cargando fútbol de la API:", e); }

            // 2. Obtener WNBA
            try {
                const response = await fetch(wnbaUrl);
                if (response.ok) {
                    const data = await response.json();
                    if (Array.isArray(data)) apiDataList = apiDataList.concat(data);
                }
            } catch (e) { console.error("Error cargando WNBA de la API:", e); }

            if (apiDataList.length === 0) {
                return false;
            }

            let syncCount = 0;

            // Comparar y mapear con nuestros partidos cargados
            appData.matches.forEach(match => {
                const matchHome = match.home.toLowerCase().trim();
                const matchAway = match.away.toLowerCase().trim();

                // Buscar un partido correspondiente en los datos de la API
                const apiMatch = apiDataList.find(apiM => {
                    const apiHome = apiM.home_team.toLowerCase().trim();
                    const apiAway = apiM.away_team.toLowerCase().trim();

                    // Mapeo flexible: comprobar si contiene nombres clave
                    return (apiHome.includes(matchHome) || matchHome.includes(apiHome)) ||
                           (apiAway.includes(matchAway) || matchAway.includes(apiAway));
                });

                if (apiMatch) {
                    const onexbetBookie = apiMatch.bookmakers.find(b => b.key === "onexbet");
                    if (onexbetBookie) {
                        const h2hMarket = onexbetBookie.markets.find(m => m.key === "h2h");
                        if (h2hMarket && Array.isArray(h2hMarket.outcomes)) {
                            // Encontramos cuotas reales en 1xBet
                            match.picks.forEach(pick => {
                                if (pick.market === "Resultado Final (1X2)" || pick.market === "Ganador (Moneyline)") {
                                    let outcome = null;
                                    if (pick.selection === match.home) {
                                        outcome = h2hMarket.outcomes.find(o => o.name.toLowerCase().includes(matchHome) || matchHome.includes(o.name.toLowerCase()));
                                    } else if (pick.selection === match.away) {
                                        outcome = h2hMarket.outcomes.find(o => o.name.toLowerCase().includes(matchAway) || matchAway.includes(o.name.toLowerCase()));
                                    } else if (pick.selection === "Sí" || pick.selection === "No") {
                                        // Mantener el estimado
                                    } else {
                                        // Empate
                                        outcome = h2hMarket.outcomes.find(o => o.name === "Draw" || o.name.toLowerCase().includes("draw") || o.name.toLowerCase() === "empate");
                                    }

                                    if (outcome && outcome.price) {
                                        pick.odd = outcome.price;
                                        syncCount++;
                                    }
                                }
                            });
                        }
                    }
                }
            });

            // Actualizar la interfaz tras mapear las cuotas reales
            populateDashboardPicks();
            populateMatchesList();
            if (selectedMatch) {
                selectedMatch = appData.matches.find(m => m.id === selectedMatch.id);
                renderMatchDetails();
            }

            // Mostrar el estado verde en el modal
            const now = new Date();
            const timeStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            apiSyncStatus.textContent = `Estado: Sincronizado con 1xBet (${timeStr}) - ${syncCount} cuotas reales actualizadas`;
            apiSyncStatus.className = "badge bg-green";
            
            // Actualizar el botón de sincronización de la cabecera
            if (btnOpenApiModal) {
                btnOpenApiModal.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--accent-green)"></i> 1xBet Activo`;
                btnOpenApiModal.style.borderColor = "var(--accent-green)";
                btnOpenApiModal.style.color = "var(--accent-green)";
            }

            return true;
        } catch (error) {
            console.error("Error en la sincronización de cuotas reales:", error);
            return false;
        }
    }

    // --- Live Market Fluctuations Simulator ---
    function startLiveMarketFluctuations() {
        setInterval(() => {
            if (!appData || !appData.matches) return;
            
            let anyChanged = false;
            
            appData.matches.forEach(match => {
                match.picks.forEach(pick => {
                    // 25% de probabilidad de fluctuación en cada intervalo de 10s
                    if (Math.random() < 0.25) {
                        const oldOdd = pick.odd;
                        // España no fluctúa demasiado para mantener la coherencia del reporte
                        const maxChange = (match.home === "Spain" || match.away === "Spain") ? 0.02 : 0.05;
                        const change = (Math.random() - 0.5) * maxChange;
                        const newOdd = parseFloat(Math.max(1.05, oldOdd + change).toFixed(2));
                        
                        if (newOdd !== oldOdd) {
                            pick.odd = newOdd;
                            anyChanged = true;
                            
                            // Buscar elementos visuales y flashearlos
                            flashOddElements(match.id, pick.market, oldOdd, newOdd);
                        }
                    }
                });
            });
            
            if (anyChanged) {
                // Recalcular la cuota acumulada del Star Ticket
                let starOdd = 1.0;
                appData.star_ticket.selections.forEach(sel => {
                    const matchedM = appData.matches.find(m => m.picks.some(p => sel.match.includes(m.home) && p.market === sel.market));
                    if (matchedM) {
                        const matchedP = matchedM.picks.find(p => p.market === sel.market);
                        if (matchedP) {
                            sel.odd = matchedP.odd;
                            starOdd *= matchedP.odd;
                        }
                    }
                });
                appData.star_ticket.total_odd = parseFloat(starOdd.toFixed(2));
                
                // Actualizar la cuota acumulada del Star Ticket en el DOM
                const totalOddEl = document.querySelector(".total-odd-val");
                if (totalOddEl) {
                    totalOddEl.textContent = appData.star_ticket.total_odd.toFixed(2);
                }

                // Refrescar y actualizar la cuadrícula de los +1000 mercados de 1xBet si el panel está visible
                if (selectedMatch) {
                    render1xBetMarkets();
                }
            }
        }, 10000);
    }
    
    function flashOddElements(matchId, market, oldVal, newVal) {
        const isUp = newVal > oldVal;
        const flashClass = isUp ? "odd-val-flash-up" : "odd-val-flash-down";
        
        // 1. En la lista de detalles del partido activo
        if (selectedMatch && selectedMatch.id === matchId) {
            const pickCards = document.querySelectorAll(".pick-card");
            pickCards.forEach(card => {
                const marketEl = card.querySelector(".pick-market");
                if (marketEl && marketEl.textContent === market) {
                    const oddEl = card.querySelector(".pick-odd-badge");
                    if (oddEl) {
                        oddEl.textContent = `@${newVal.toFixed(2)}`;
                        oddEl.classList.add(flashClass);
                        setTimeout(() => oddEl.classList.remove(flashClass), 1200);
                    }
                }
            });
        }
        
        // 2. En el Star Ticket del Dashboard
        const starItems = document.querySelectorAll("#star-ticket-details .ticket-line-item");
        starItems.forEach(item => {
            const matchEl = item.querySelector(".ticket-item-match");
            const marketEl = item.querySelector(".ticket-item-market");
            const matchedMatch = appData.matches.find(m => m.id === matchId);
            if (matchedMatch && matchEl && matchEl.textContent.includes(matchedMatch.home) && marketEl && marketEl.textContent === market) {
                const oddEl = item.querySelector(".ticket-item-odd");
                if (oddEl) {
                    oddEl.textContent = newVal.toFixed(2);
                    oddEl.classList.add(flashClass);
                    setTimeout(() => oddEl.classList.remove(flashClass), 1200);
                }
            }
        });
        
        // 3. En la lista compacta del Dashboard
        const compactCards = document.querySelectorAll(".match-compact-card");
        compactCards.forEach(card => {
            if (card.getAttribute("data-match-id") === matchId) {
                const matchedMatch = appData.matches.find(m => m.id === matchId);
                if (matchedMatch && matchedMatch.picks[0].market === market) {
                    const oddEl = card.querySelector(".compact-odd");
                    if (oddEl) {
                        oddEl.textContent = `@${newVal.toFixed(2)}`;
                        oddEl.classList.add(flashClass);
                        setTimeout(() => oddEl.classList.remove(flashClass), 1200);
                    }
                }
            }
        });
    }

    // --- 1xBet Full Markets Generator (+1000 Options) ---
    function render1xBetMarkets() {
        const container = document.getElementById("detail-all-markets-container");
        if (!container || !selectedMatch) return;

        const isFootball = selectedMatch.sport === "Football";
        const oddHome = selectedMatch.picks[0].odd;
        const oddAway = selectedMatch.picks.length > 1 ? selectedMatch.picks[1].odd : (100 / (100/oddHome * 0.8));
        const oddDraw = isFootball ? 3.60 : 1.0;

        const marketsData = [];

        // 1. DOBLE OPORTUNIDAD (Fútbol)
        if (isFootball) {
            const dcHomeDraw = parseFloat((1 / (1/oddHome + 1/oddDraw) * 0.95).toFixed(2));
            const dcHomeAway = parseFloat((1 / (1/oddHome + 1/oddAway) * 0.95).toFixed(2));
            const dcDrawAway = parseFloat((1 / (1/oddDraw + 1/oddAway) * 0.95).toFixed(2));
            marketsData.push({
                title: "Doble Oportunidad",
                category: "main",
                outcomes: [
                    { name: "1X (L o Empate)", odd: dcHomeDraw },
                    { name: "12 (L o Visita)", odd: dcHomeAway },
                    { name: "X2 (Empate o Visita)", odd: dcDrawAway }
                ]
            });
        }

        // 2. TOTAL DE GOLES / PUNTOS (Over / Under)
        if (isFootball) {
            marketsData.push({
                title: "Total de Goles (Más de / Menos de)",
                category: "goals",
                outcomes: [
                    { name: "Más de 1.5", odd: parseFloat((oddHome > oddAway ? 1.25 : 1.20).toFixed(2)) },
                    { name: "Menos de 1.5", odd: parseFloat((oddHome > oddAway ? 3.50 : 3.80).toFixed(2)) },
                    { name: "Más de 2.5", odd: parseFloat((oddHome > oddAway ? 1.85 : 1.70).toFixed(2)), isRecommended: selectedMatch.picks.some(p => p.selection === "Más de 2.5 Goles") },
                    { name: "Menos de 2.5", odd: parseFloat((oddHome > oddAway ? 1.95 : 2.10).toFixed(2)) },
                    { name: "Más de 3.5", odd: parseFloat((oddHome > oddAway ? 3.20 : 2.80).toFixed(2)) },
                    { name: "Menos de 3.5", odd: parseFloat((oddHome > oddAway ? 1.30 : 1.40).toFixed(2)) }
                ]
            });
        } else {
            // Baloncesto Puntos
            marketsData.push({
                title: "Total de Puntos WNBA (Más / Menos)",
                category: "goals",
                outcomes: [
                    { name: "Más de 155.5", odd: 1.55 },
                    { name: "Menos de 155.5", odd: 2.30 },
                    { name: "Más de 160.5", odd: 1.88, isRecommended: selectedMatch.picks.some(p => p.market === "Total de Puntos") },
                    { name: "Menos de 160.5", odd: 1.88 },
                    { name: "Más de 165.5", odd: 2.45 },
                    { name: "Menos de 165.5", odd: 1.50 }
                ]
            });
        }

        // 3. HÁNDICAPS
        if (isFootball) {
            marketsData.push({
                title: "Hándicap Asiático",
                category: "handicaps",
                outcomes: [
                    { name: `${selectedMatch.home} -1.5`, odd: parseFloat((oddHome * 1.6).toFixed(2)) },
                    { name: `${selectedMatch.away} +1.5`, odd: parseFloat((1 / (1/oddHome * 1.6) * 0.9).toFixed(2)) },
                    { name: `${selectedMatch.home} -0.5`, odd: oddHome },
                    { name: `${selectedMatch.away} +0.5`, odd: parseFloat((1 / (1/oddHome) * 0.9).toFixed(2)) }
                ]
            });
        } else {
            // Baloncesto Handicap
            marketsData.push({
                title: "Hándicap de Puntos",
                category: "handicaps",
                outcomes: [
                    { name: `${selectedMatch.home} -4.5`, odd: 1.90, isRecommended: selectedMatch.picks.some(p => p.market === "Hándicap") },
                    { name: `${selectedMatch.away} +4.5`, odd: 1.90 },
                    { name: `${selectedMatch.home} -7.5`, odd: 2.65 },
                    { name: `${selectedMatch.away} +7.5`, odd: 1.45 }
                ]
            });
        }

        // 4. CÓRNERS / TARJETAS / ESPECIALES
        if (isFootball) {
            const p1 = selectedMatch.lineups.home.players.find(p => p.pos === "DC")?.name || selectedMatch.lineups.home.players[1]?.name || "Jugador 1";
            const p2 = selectedMatch.lineups.away.players.find(p => p.pos === "DC")?.name || selectedMatch.lineups.away.players[1]?.name || "Jugador 2";

            marketsData.push({
                title: "Goleadores (Cualquier Momento)",
                category: "specials",
                outcomes: [
                    { name: `${p1} Anotará gol`, odd: 2.10 },
                    { name: `${p2} Anotará gol`, odd: 3.40 }
                ]
            });
            marketsData.push({
                title: "Total de Córners (Tiros de Esquina)",
                category: "specials",
                outcomes: [
                    { name: "Más de 8.5 Córners", odd: 1.60 },
                    { name: "Menos de 8.5 Córners", odd: 2.20 },
                    { name: "Más de 9.5 Córners", odd: 1.95 },
                    { name: "Menos de 9.5 Córners", odd: 1.75 }
                ]
            });
            marketsData.push({
                title: "Total de Tarjetas Amarillas",
                category: "specials",
                outcomes: [
                    { name: "Más de 3.5 Tarjetas", odd: 1.72 },
                    { name: "Menos de 3.5 Tarjetas", odd: 2.00 }
                ]
            });
        } else {
            // Baloncesto Especiales
            const p1 = selectedMatch.lineups.home.players[0]?.name || "Jugadora 1";
            const p2 = selectedMatch.lineups.away.players[0]?.name || "Jugadora 2";

            marketsData.push({
                title: "Especiales de Jugadora WNBA",
                category: "specials",
                outcomes: [
                    { name: `${p1} +18.5 Puntos`, odd: 1.85 },
                    { name: `${p1} -18.5 Puntos`, odd: 1.85 },
                    { name: `${p2} +8.5 Rebotes`, odd: 1.95 },
                    { name: `${p2} -8.5 Rebotes`, odd: 1.75 }
                ]
            });
        }

        // 5. AMBOS EQUIPOS ANOTAN
        if (isFootball) {
            marketsData.push({
                title: "Ambos Equipos Anotan",
                category: "main",
                outcomes: [
                    { name: "Sí", odd: parseFloat((oddHome > oddAway ? 1.75 : 1.90).toFixed(2)), isRecommended: selectedMatch.picks.some(p => p.market === "Ambos Equipos Anotan" && p.selection === "Sí") },
                    { name: "No", odd: parseFloat((oddHome > oddAway ? 2.00 : 1.80).toFixed(2)), isRecommended: selectedMatch.picks.some(p => p.market === "Ambos Equipos Anotan" && p.selection === "No") }
                ]
            });
        }

        // Filtrar y Buscar
        let filteredMarkets = marketsData;

        // Filtrar por categoría
        if (currentMarketCat !== "all") {
            filteredMarkets = marketsData.filter(m => m.category === currentMarketCat);
        }

        // Buscar por texto
        if (marketSearchVal) {
            filteredMarkets = filteredMarkets.map(m => {
                const matchingOutcomes = m.outcomes.filter(o => o.name.toLowerCase().includes(marketSearchVal) || m.title.toLowerCase().includes(marketSearchVal));
                if (matchingOutcomes.length > 0) {
                    return { ...m, outcomes: matchingOutcomes };
                }
                return null;
            }).filter(m => m !== null);
        }

        // Dibujar en el DOM
        if (filteredMarkets.length === 0) {
            container.innerHTML = `<div class="empty-list-note" style="grid-column: 1/-1; text-align: center; padding: 20px; color: var(--text-muted);">No se encontraron mercados de 1xBet.</div>`;
            return;
        }

        let marketsHtml = "";
        filteredMarkets.forEach(m => {
            let outcomesHtml = "";
            m.outcomes.forEach(o => {
                const recClass = o.isRecommended ? "ai-recommended" : "";
                const recIcon = o.isRecommended ? `<span class="badge bg-green" style="font-size:0.55rem; padding: 1px 4px; margin-right:5px; border-radius:3px; text-transform:none;"><i class="fa-solid fa-brain"></i> IA Pick</span>` : "";

                outcomesHtml += `
                    <div class="outcome-btn ${recClass}" data-outcome-name="${o.name}" data-match-id="${selectedMatch.id}">
                        <span class="name">${recIcon}${o.name}</span>
                        <span class="odd">${o.odd.toFixed(2)}</span>
                    </div>
                `;
            });

            marketsHtml += `
                <div class="market-category-card">
                    <div class="market-category-title">${m.title}</div>
                    <div class="market-outcomes-row">
                        ${outcomesHtml}
                    </div>
                </div>
            `;
        });

        container.innerHTML = marketsHtml;
    }

    // ==========================================================================
    // 📈 Bankroll & Bets Tracking Logic
    // ==========================================================================
    let userBets = [];
    let startingBankroll = 1000;

    // Load initial bets from local storage or set default mock data
    function initBankroll() {
        const savedCapital = localStorage.getItem("starting_bankroll");
        if (savedCapital) {
            startingBankroll = parseFloat(savedCapital) || 1000;
        } else {
            localStorage.setItem("starting_bankroll", startingBankroll);
        }

        if (inputStartingBankroll) {
            inputStartingBankroll.value = startingBankroll;
            inputStartingBankroll.oninput = (e) => {
                const val = parseFloat(e.target.value);
                if (!isNaN(val) && val >= 0) {
                    startingBankroll = val;
                    localStorage.setItem("starting_bankroll", startingBankroll);
                    updateBankrollMetrics();
                    updateBankrollChart();
                }
            };
        }
        const savedBets = localStorage.getItem("user_bets");
        if (savedBets) {
            userBets = JSON.parse(savedBets);
        } else {
            // Mock historical data to showcase bankroll growth beautifully on load
            userBets = [
                {
                    id: 1,
                    match: "Spain vs Belgium",
                    market: "Resultado Final (1X2) - España",
                    odd: 1.63,
                    stake: 150,
                    status: "won",
                    date: "2026-07-08"
                },
                {
                    id: 2,
                    match: "Chicago Sky vs LA Sparks",
                    market: "Ganador (Moneyline) - Chicago Sky",
                    odd: 1.85,
                    stake: 100,
                    status: "won",
                    date: "2026-07-09"
                },
                {
                    id: 3,
                    match: "Connecticut Sun vs GS Valkyries",
                    market: "Total de Puntos - Más de 160.5",
                    odd: 1.95,
                    stake: 100,
                    status: "lost",
                    date: "2026-07-09"
                },
                {
                    id: 4,
                    match: "Argentina vs Switzerland",
                    market: "Resultado Final (1X2) - Argentina",
                    odd: 1.45,
                    stake: 200,
                    status: "pending",
                    date: "2026-07-10"
                }
            ];
            localStorage.setItem("user_bets", JSON.stringify(userBets));
        }
        
        populateMatchSelect();
        updateBankrollMetrics();
        populateBetsTable();

        // Listen for new bet additions
        if (btnSubmitBet) {
            btnSubmitBet.onclick = () => {
                let matchVal = betMatchSelect.value;
                if (matchVal === "Otro Evento (Manual)") {
                    const manualInput = document.getElementById("bet-manual-match-input");
                    matchVal = manualInput ? manualInput.value.trim() : "";
                    if (!matchVal) {
                        alert("Por favor, ingresa el nombre del evento manual.");
                        return;
                    }
                }
                
                const marketVal = betMarketInput.value.trim();
                const oddVal = parseFloat(betOddInput.value);
                const stakeVal = parseFloat(betStakeInput.value);
                const statusVal = betStatusSelect.value;

                if (!marketVal || isNaN(oddVal) || isNaN(stakeVal) || oddVal <= 1 || stakeVal <= 0) {
                    alert("Por favor, completa todos los campos con valores válidos (Cuota > 1.01 y Stake > 0).");
                    return;
                }

                const newBet = {
                    id: Date.now(),
                    match: matchVal,
                    market: marketVal,
                    odd: oddVal,
                    stake: stakeVal,
                    status: statusVal,
                    date: new Date().toISOString().split("T")[0]
                };

                userBets.push(newBet);
                localStorage.setItem("user_bets", JSON.stringify(userBets));

                // Clear input fields
                betMarketInput.value = "";
                betOddInput.value = "";
                betStakeInput.value = "";
                betStatusSelect.value = "pending";
                const manualInput = document.getElementById("bet-manual-match-input");
                if (manualInput) manualInput.value = "";

                updateBankrollMetrics();
                populateBetsTable();
                updateBankrollChart();
                alert("¡Apuesta registrada con éxito!");
            };
        }

        // Clear history button handler
        if (btnClearBets) {
            btnClearBets.onclick = () => {
                if (confirm("¿Estás seguro de que deseas vaciar todo tu historial de apuestas? Esto reiniciará tu bankroll a $1,000.")) {
                    userBets = [];
                    localStorage.setItem("user_bets", JSON.stringify(userBets));
                    updateBankrollMetrics();
                    populateBetsTable();
                    updateBankrollChart();
                }
            };
        }
    }

    // Populate dropdown with loaded games
    function populateMatchSelect() {
        if (!betMatchSelect || !appData || !appData.matches) return;
        let selectHtml = `<option value="Otro Evento (Manual)">Otro Evento (Manual)</option>`;
        appData.matches.forEach(m => {
            selectHtml += `<option value="${m.home} vs ${m.away}">${m.home} vs ${m.away} (${m.league})</option>`;
        });
        betMatchSelect.innerHTML = selectHtml;
    }

    // Render registered bets table
    function populateBetsTable() {
        if (!betsTableBody) return;
        if (userBets.length === 0) {
            betsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted); background: rgba(255,255,255,0.01);">No has registrado apuestas todavía.</td></tr>`;
            return;
        }

        let rowsHtml = "";
        // Render in reverse chronological order (newest first)
        [...userBets].reverse().forEach(bet => {
            const potentialReturn = bet.stake * bet.odd;
            
            let statusSelect = `
                <select class="form-input" style="font-size: 0.7rem; padding: 4px 6px; width: 85px; background: rgba(8, 11, 17, 0.8); ${bet.status === 'won' ? 'color: var(--accent-green); border-color: var(--accent-green);' : bet.status === 'lost' ? 'color: var(--accent-pink); border-color: var(--accent-pink);' : 'color: var(--accent-amber); border-color: var(--accent-amber);'}" onchange="resolveBet(${bet.id}, this.value)">
                    <option value="pending" ${bet.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                    <option value="won" ${bet.status === 'won' ? 'selected' : ''}>Ganada</option>
                    <option value="lost" ${bet.status === 'lost' ? 'selected' : ''}>Perdida</option>
                    <option value="voided" ${bet.status === 'voided' ? 'selected' : ''}>Anulada</option>
                </select>
            `;

            let actionsHtml = `
                <button class="btn btn-secondary" onclick="deleteBet(${bet.id})" title="Eliminar apuesta" style="padding: 4px 8px; font-size: 0.75rem; border-color: rgba(255,255,255,0.1); color: var(--text-muted); background: rgba(255,255,255,0.02); cursor: pointer; border-radius: 4px;">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;

            rowsHtml += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.02);">
                    <td style="padding: 10px 8px; text-align: left;">
                        <div style="font-weight: 700; font-size: 0.8rem; color: var(--text-primary);">${bet.match}</div>
                        <div style="font-size: 0.72rem; color: var(--text-muted);">${bet.market}</div>
                    </td>
                    <td style="padding: 10px 8px; text-align: center; font-family: var(--font-display); font-weight: 700; color: var(--accent-amber);">@${bet.odd.toFixed(2)}</td>
                    <td style="padding: 10px 8px; text-align: center; color: var(--text-secondary); font-size: 0.8rem;">$${bet.stake.toFixed(2)}</td>
                    <td style="padding: 10px 8px; text-align: center; color: var(--accent-cyan); font-weight: 700; font-size: 0.8rem;">$${potentialReturn.toFixed(2)}</td>
                    <td style="padding: 10px 8px; text-align: center;">${statusSelect}</td>
                    <td style="padding: 10px 8px; text-align: center; white-space: nowrap;">${actionsHtml}</td>
                </tr>
            `;
        });

        betsTableBody.innerHTML = rowsHtml;
    }

    // Global expose of delete and resolve functions so they can be clicked inline in the table
    window.resolveBet = (id, status) => {
        const bet = userBets.find(b => b.id === id);
        if (bet) {
            bet.status = status;
            localStorage.setItem("user_bets", JSON.stringify(userBets));
            updateBankrollMetrics();
            populateBetsTable();
            updateBankrollChart();
        }
    };

    window.deleteBet = (id) => {
        userBets = userBets.filter(b => b.id !== id);
        localStorage.setItem("user_bets", JSON.stringify(userBets));
        updateBankrollMetrics();
        populateBetsTable();
        updateBankrollChart();
    };

    // Calculate ROI, Win Rate, and net bankroll balance
    function updateBankrollMetrics() {
        let netProfit = 0;
        let resolvedStakes = 0;
        let wonBets = 0;
        let resolvedBetsCount = 0;

        userBets.forEach(bet => {
            if (bet.status === "won") {
                netProfit += (bet.stake * bet.odd) - bet.stake;
                resolvedStakes += bet.stake;
                wonBets++;
                resolvedBetsCount++;
            } else if (bet.status === "lost") {
                netProfit -= bet.stake;
                resolvedStakes += bet.stake;
                resolvedBetsCount++;
            }
        });

        const currentBalance = startingBankroll + netProfit;
        const roi = resolvedStakes > 0 ? (netProfit / resolvedStakes) * 100 : 0;
        const winrate = resolvedBetsCount > 0 ? (wonBets / resolvedBetsCount) * 100 : 0;

        // Render card metrics
        if (bankrollBalanceVal) bankrollBalanceVal.textContent = `$${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (bankrollProfitVal) {
            const prefix = netProfit >= 0 ? "+$" : "-$";
            bankrollProfitVal.textContent = `${prefix}${Math.abs(netProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            const iconBg = bankrollProfitVal.parentElement.querySelector(".card-icon");
            if (iconBg) iconBg.className = `card-icon ${netProfit >= 0 ? 'green' : 'pink'}`;
        }
        if (bankrollRoiVal) {
            const sign = roi >= 0 ? "+" : "";
            bankrollRoiVal.textContent = `${sign}${roi.toFixed(1)}%`;
        }
        if (bankrollWinrateVal) bankrollWinrateVal.textContent = `${winrate.toFixed(1)}%`;
    }

    // Chart.js render for bankroll evolution
    function updateBankrollChart() {
        const canvas = document.getElementById("bankroll-chart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        if (bankrollChartInstance) {
            bankrollChartInstance.destroy();
        }

        // Compute points chronologically
        const labels = ["Inicial"];
        const dataValues = [startingBankroll];
        let currentBalance = startingBankroll;

        // Sort bets by date/id chronologically
        const sortedBets = [...userBets]
            .filter(b => b.status !== "pending")
            .sort((a, b) => a.id - b.id);

        sortedBets.forEach((bet, idx) => {
            if (bet.status === "won") {
                currentBalance += (bet.stake * bet.odd) - bet.stake;
            } else if (bet.status === "lost") {
                currentBalance -= bet.stake;
            }
            labels.push(`Apuesta ${idx + 1}`);
            dataValues.push(currentBalance);
        });

        // Gradient styling
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, "rgba(16, 185, 129, 0.25)");
        gradient.addColorStop(1, "rgba(16, 185, 129, 0.0)");

        bankrollChartInstance = new Chart(ctx, {
            type: "line",
            data: {
                labels: labels,
                datasets: [{
                    label: "Saldo ($)",
                    data: dataValues,
                    borderColor: "#10B981",
                    borderWidth: 3,
                    pointBackgroundColor: "#06B6D4",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0.25,
                    fill: true,
                    backgroundColor: gradient
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#0f1422",
                        titleColor: "#9CA3AF",
                        bodyColor: "#F3F4F6",
                        borderColor: "rgba(255,255,255,0.08)",
                        borderWidth: 1,
                        padding: 10,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Saldo: $${context.parsed.y.toFixed(2)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            color: "#6B7280",
                            font: { family: "Outfit", size: 10 }
                        }
                    },
                    y: {
                        grid: { color: "rgba(255, 255, 255, 0.03)" },
                        ticks: {
                            color: "#6B7280",
                            font: { family: "Outfit", size: 10 }
                        }
                    }
                }
            }
        });
    }

    // Expose updateBankrollChart globally so navigation clicks can call it
    window.updateBankrollChart = updateBankrollChart;

    // ==========================================================================
    // 🧗 Reto Escalera Controller
    // ==========================================================================
    let escaleraCurrentDay = 1;
    let escaleraStartingStake = 10;
    let escaleraCurrentStake = 10;
    let escaleraTargetDays = 30;
    let safestPicks = [];
    let selectedEscaleraPickIndex = 0;

    function getSafestPicksOfTheDay() {
        if (!appData || !appData.matches) return [];
        
        let allPicks = [];
        appData.matches.forEach(match => {
            match.picks.forEach(pick => {
                allPicks.push({ match, pick });
            });
        });

        if (allPicks.length === 0) return [];

        let candidates = allPicks.filter(item => item.pick.odd >= 1.12 && item.pick.odd <= 2.00);
        
        if (candidates.length < 3) {
            candidates = allPicks.filter(item => item.pick.odd > 1.01);
        }

        candidates.sort((a, b) => {
            if (b.pick.probability !== a.pick.probability) {
                return b.pick.probability - a.pick.probability;
            }
            return a.pick.odd - b.pick.odd;
        });

        let uniqueCandidates = [];
        let seenMatches = new Set();
        for (let c of candidates) {
            if (!seenMatches.has(c.match.id)) {
                seenMatches.add(c.match.id);
                uniqueCandidates.push(c);
                if (uniqueCandidates.length === 3) break;
            }
        }
        
        if (uniqueCandidates.length < 3) {
            for (let c of candidates) {
                if (!uniqueCandidates.includes(c)) {
                    uniqueCandidates.push(c);
                    if (uniqueCandidates.length === 3) break;
                }
            }
        }

        return uniqueCandidates;
    }

    function renderEscaleraTab() {
        escaleraCurrentDay = parseInt(localStorage.getItem("escalera_day")) || 1;
        escaleraStartingStake = parseFloat(localStorage.getItem("escalera_start_stake")) || 10;
        escaleraCurrentStake = parseFloat(localStorage.getItem("escalera_current_stake")) || 10;
        escaleraTargetDays = parseInt(localStorage.getItem("escalera_target_days")) || 30;
        escaleraCurrentRun = JSON.parse(localStorage.getItem("escalera_current_run")) || [];
        
        
        if (inputEscaleraStartStake) inputEscaleraStartStake.value = escaleraStartingStake;
        if (inputEscaleraTargetDays) inputEscaleraTargetDays.value = escaleraTargetDays;
        
        const inputEscaleraCurrentDay = document.getElementById("input-escalera-current-day");
        const inputEscaleraCurrentStake = document.getElementById("input-escalera-current-stake");
        
        if (inputEscaleraCurrentDay) inputEscaleraCurrentDay.value = escaleraCurrentDay;
        if (inputEscaleraCurrentStake) inputEscaleraCurrentStake.value = escaleraCurrentStake.toFixed(2);

        safestPicks = getSafestPicksOfTheDay();
        safestPicks.push({
            match: { home: "Evento", away: "Manual", time: "--:--", stadium: "Personalizado" },
            pick: { market: "Manual", selection: "Tu Pronóstico", odd: 1.50, probability: "-", reasoning: "Has elegido registrar tu propia apuesta. Llena los campos de abajo." },
            isManual: true
        });

        // Reset selection if out of bounds
        if (selectedEscaleraPickIndex >= safestPicks.length) selectedEscaleraPickIndex = 0;

        if (escaleraDayVal) escaleraDayVal.textContent = `Día ${escaleraCurrentDay} / ${escaleraTargetDays}`;
        if (escaleraStakeVal) escaleraStakeVal.textContent = `$${escaleraCurrentStake.toFixed(2)}`;
        
        let nextOdd = 1.30;
        if (safestPicks.length > 0 && safestPicks[selectedEscaleraPickIndex]) {
            nextOdd = safestPicks[selectedEscaleraPickIndex].pick.odd;
        }
        
        const nextReturn = escaleraCurrentStake * nextOdd;
        if (escaleraNextReturnVal) escaleraNextReturnVal.textContent = `$${nextReturn.toFixed(2)}`;

        // Estimación compuesto de meta final
        const goalValue = escaleraStartingStake * Math.pow(1.28, escaleraTargetDays);
        if (escaleraGoalVal) escaleraGoalVal.textContent = `$${goalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        renderEscaleraProgressMap();
        renderEscaleraPickCard(nextReturn);
        populateEscaleraHistoryTable();
    }

    function renderEscaleraProgressMap() {
        if (!escaleraStepsContainer) return;
        let html = "";
        for (let i = 1; i <= escaleraTargetDays; i++) {
            let stateClass = "locked";
            let content = i;

            if (i < escaleraCurrentDay) {
                stateClass = "completed";
                content = `<i class="fa-solid fa-check"></i>`;
            } else if (i === escaleraCurrentDay) {
                stateClass = "active";
            }

            html += `
                <div class="escalera-step-node ${stateClass}">
                    ${content}
                </div>
            `;
        }
        escaleraStepsContainer.innerHTML = html;
        
        // Auto scroll to active step
        const activeNode = escaleraStepsContainer.querySelector(".active");
        if (activeNode) {
            setTimeout(() => activeNode.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }), 50);
        }
    }

    function renderEscaleraPickCard(nextReturn) {
        if (!escaleraPickCardContent) return;

        const isPending = escaleraCurrentRun.length > 0 && escaleraCurrentRun[escaleraCurrentRun.length - 1].status === "pending";
        if (isPending) {
            escaleraPickCardContent.innerHTML = `<div class="empty-list-note" style="padding:20px; text-align:center;">
                <h3 style="color: var(--accent-amber); margin-bottom: 10px;"><i class="fa-solid fa-clock"></i> Día en Progreso</h3>
                <p style="font-size: 0.85rem; color: var(--text-secondary);">Tienes una apuesta pendiente de resolución en el Día ${escaleraCurrentDay}. Ve al historial abajo para marcarla como Ganada o Perdida una vez que termine el partido.</p>
            </div>`;
            document.getElementById("btn-escalera-win").style.display = "none";
            const btnPend = document.getElementById("btn-escalera-pending"); if(btnPend) btnPend.style.display = "none";
            document.getElementById("btn-escalera-lose").style.display = "none";
            return;
        } else {
            document.getElementById("btn-escalera-win").style.display = "block";
            const btnPend = document.getElementById("btn-escalera-pending"); if(btnPend) btnPend.style.display = "block";
            document.getElementById("btn-escalera-lose").style.display = "block";
        }

        if (!safestPicks || safestPicks.length === 0) {
            escaleraPickCardContent.innerHTML = `<div class="empty-list-note" style="padding:20px; text-align:center;">No hay partidos cargados para extraer recomendaciones del reto hoy.</div>`;
            return;
        }

        if (lblEscaleraDayTitle) lblEscaleraDayTitle.textContent = `Opciones Recomendadas - Día ${escaleraCurrentDay}`;

        let optionsHtml = `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">`;
        
        safestPicks.forEach((sp, idx) => {
            const isSelected = idx === selectedEscaleraPickIndex;
            const borderCol = isSelected ? "var(--accent-cyan)" : "var(--border-color)";
            const bgCol = isSelected ? "rgba(6, 182, 212, 0.05)" : "rgba(255,255,255,0.01)";
            
            optionsHtml += `
                <div class="escalera-option" data-idx="${idx}" style="cursor: pointer; border: 2px solid ${borderCol}; background: ${bgCol}; padding: 15px; border-radius: 8px; transition: all 0.2s;">
                    <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; margin-bottom: 8px;">OPCIÓN ${idx + 1}</div>
                    <div style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); margin-bottom: 4px;">${sp.match.home}</div>
                    <div style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); margin-bottom: 12px;">vs ${sp.match.away}</div>
                    
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 3px;">${sp.pick.market}</div>
                    <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent-cyan); margin-bottom: 12px;">${sp.pick.selection}</div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="badge bg-amber" style="font-size: 0.8rem;">@${sp.pick.odd.toFixed(2)}</span>
                        <span style="font-size: 0.7rem; color: var(--accent-green); font-weight: 700;"><i class="fa-solid fa-brain"></i> ${sp.pick.probability}%</span>
                    </div>
                </div>
            `;
        });
        optionsHtml += `</div>`;

        const selectedSP = safestPicks[selectedEscaleraPickIndex];
        const match = selectedSP.match;
        const pick = selectedSP.pick;
        
        let matchDetailsHtml = "";
        if (selectedSP.isManual) {
            matchDetailsHtml = `
                <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
                    <div>
                        <label class="form-label" style="font-size: 0.75rem; color: var(--accent-cyan);">Nombre del Evento (Manual)</label>
                        <input type="text" id="input-escalera-manual-match" class="form-input" placeholder="Ej: España vs Belgica" style="font-size: 0.85rem; padding: 8px 12px; border-color: rgba(6, 182, 212, 0.3);">
                    </div>
                    <div>
                        <label class="form-label" style="font-size: 0.75rem; color: var(--accent-cyan);">Tu Selección / Mercado</label>
                        <input type="text" id="input-escalera-manual-selection" class="form-input" placeholder="Ej: España gana" style="font-size: 0.85rem; padding: 8px 12px; border-color: rgba(6, 182, 212, 0.3);">
                    </div>
                </div>
            `;
        } else {
            matchDetailsHtml = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <h3 style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary);"><i class="fa-solid fa-crosshairs" style="color:var(--accent-cyan)"></i> Selección Activa: Opción ${selectedEscaleraPickIndex + 1}</h3>
                    <div style="font-size: 0.75rem; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${match.stadium} | ${match.time} HS</div>
                </div>
            `;
        }

        escaleraPickCardContent.innerHTML = `
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 15px;">Selecciona una de las opciones propuestas por la IA o usa la Opción Manual:</p>
            ${optionsHtml}
            
            <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px; margin-top: 10px;">
                ${matchDetailsHtml}
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; text-align: center;">
                    <div style="background: rgba(8, 11, 17, 0.5); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">Stake a Invertir</div>
                        <div style="font-size: 1.2rem; font-family: var(--font-display); font-weight: 800; color: var(--text-primary);">$${escaleraCurrentStake.toFixed(2)}</div>
                    </div>
                    <div style="background: rgba(8, 11, 17, 0.5); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">Cuota Real (Editar)</div>
                        <div style="display:flex; justify-content:center; align-items:center;">
                            <span style="color:var(--text-muted); margin-right:4px; font-weight:700;">@</span>
                            <input type="number" id="input-escalera-custom-odd" value="${pick.odd.toFixed(2)}" step="0.01" style="width: 70px; text-align: center; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: var(--accent-green); font-size: 1.1rem; font-family: var(--font-display); font-weight: 800; border-radius: 4px; padding: 2px;">
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 5px;">Retorno: <span id="escalera-custom-return" style="color:var(--accent-green); font-weight:800;">$${nextReturn.toFixed(2)}</span></div>
                    </div>
                </div>

                <div class="player-commentary" style="background: rgba(6, 182, 212, 0.02); padding: 15px; border-radius: 8px; border-left: 3px solid var(--accent-cyan);">
                    <h4 style="font-size: 0.8rem; color: var(--accent-cyan); margin-bottom: 8px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-brain-circuit"></i> Argumentación de la IA para esta opción</h4>
                    <p style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">${pick.reasoning}</p>
                </div>
            </div>
        `;

        // Añadir eventos a las tarjetas de opción
        document.querySelectorAll('.escalera-option').forEach(el => {
            el.addEventListener('click', () => {
                selectedEscaleraPickIndex = parseInt(el.getAttribute('data-idx'));
                // Actualizar el DOM renderizando de nuevo la pestaña para que se recalculen valores
                renderEscaleraTab();
            });
        });
        
        // Listener para la cuota personalizada
        const customOddInput = document.getElementById("input-escalera-custom-odd");
        if(customOddInput) {
            customOddInput.addEventListener("input", (e) => {
                const newOdd = parseFloat(e.target.value);
                if(!isNaN(newOdd)) {
                    const newRet = escaleraCurrentStake * newOdd;
                    document.getElementById("escalera-custom-return").textContent = `$${newRet.toFixed(2)}`;
                    const sideRet = document.getElementById("escalera-next-return-val");
                    if (sideRet) sideRet.textContent = `$${newRet.toFixed(2)}`;
                }
            });
        }
    }

    if (btnEscaleraWin) {
        btnEscaleraWin.onclick = () => {
            if (!safestPicks || safestPicks.length === 0 || !safestPicks[selectedEscaleraPickIndex]) return;
            
            const selectedPick = safestPicks[selectedEscaleraPickIndex];
            const customOddInput = document.getElementById("input-escalera-custom-odd");
            const finalOdd = (customOddInput && !isNaN(parseFloat(customOddInput.value))) ? parseFloat(customOddInput.value) : selectedPick.pick.odd;
            const returnVal = parseFloat((escaleraCurrentStake * finalOdd).toFixed(2));
            
            let finalMatch = `${selectedPick.match.home} vs ${selectedPick.match.away}`;
            let finalSelection = selectedPick.pick.selection;
            
            if (selectedPick.isManual) {
                const manualMatchInput = document.getElementById("input-escalera-manual-match");
                const manualSelInput = document.getElementById("input-escalera-manual-selection");
                if (manualMatchInput && manualMatchInput.value.trim() !== "") finalMatch = manualMatchInput.value.trim();
                else { alert("Ingresa el nombre del evento manual."); return; }
                if (manualSelInput && manualSelInput.value.trim() !== "") finalSelection = manualSelInput.value.trim();
                else { alert("Ingresa tu selección manual."); return; }
            }

            // Registrar el día exacto en el historial actual
            escaleraCurrentRun.push({
                day: escaleraCurrentDay,
                date: new Date().toISOString().split("T")[0],
                match: finalMatch,
                selection: finalSelection,
                odd: finalOdd,
                stake: escaleraCurrentStake,
                return: returnVal,
                status: "won"
            });
            localStorage.setItem("escalera_current_run", JSON.stringify(escaleraCurrentRun));
            
            if (escaleraCurrentDay >= escaleraTargetDays) {
                alert(`🎉 ¡RETADO COMPLETADO! Has finalizado el Reto Escalera de ${escaleraTargetDays} días con éxito. Convertiste $${escaleraStartingStake} en $${returnVal.toFixed(2)}.`);
                logEscaleraAttempt("Ganado", returnVal);
                resetEscalera();
            } else {
                escaleraCurrentDay++;
                escaleraCurrentStake = returnVal;
                
                localStorage.setItem("escalera_day", escaleraCurrentDay);
                localStorage.setItem("escalera_current_stake", escaleraCurrentStake);
                
                renderEscaleraTab();
                alert(`📈 ¡Día Ganado! Avanzas al Día ${escaleraCurrentDay}.`);
            }
        };
    }

    const btnEscaleraPending = document.getElementById("btn-escalera-pending");
    if (btnEscaleraPending) {
        btnEscaleraPending.onclick = () => {
            if (!safestPicks || safestPicks.length === 0 || !safestPicks[selectedEscaleraPickIndex]) return;
            
            const selectedPick = safestPicks[selectedEscaleraPickIndex];
            const customOddInput = document.getElementById("input-escalera-custom-odd");
            const finalOdd = (customOddInput && !isNaN(parseFloat(customOddInput.value))) ? parseFloat(customOddInput.value) : selectedPick.pick.odd;
            const returnVal = parseFloat((escaleraCurrentStake * finalOdd).toFixed(2));
            
            let finalMatch = `${selectedPick.match.home} vs ${selectedPick.match.away}`;
            let finalSelection = selectedPick.pick.selection;
            
            if (selectedPick.isManual) {
                const manualMatchInput = document.getElementById("input-escalera-manual-match");
                const manualSelInput = document.getElementById("input-escalera-manual-selection");
                if (manualMatchInput && manualMatchInput.value.trim() !== "") finalMatch = manualMatchInput.value.trim();
                else { alert("Ingresa el nombre del evento manual."); return; }
                if (manualSelInput && manualSelInput.value.trim() !== "") finalSelection = manualSelInput.value.trim();
                else { alert("Ingresa tu selección manual."); return; }
            }

            escaleraCurrentRun.push({
                day: escaleraCurrentDay,
                date: new Date().toISOString().split("T")[0],
                match: finalMatch,
                selection: finalSelection,
                odd: finalOdd,
                stake: escaleraCurrentStake,
                return: returnVal,
                status: "pending"
            });
            localStorage.setItem("escalera_current_run", JSON.stringify(escaleraCurrentRun));
            renderEscaleraTab();
            alert(`⏳ Día guardado como Pendiente. Espera el resultado del partido y actualízalo en el historial.`);
        };
    }

    if (btnEscaleraLose) {
        btnEscaleraLose.onclick = () => {
            if (confirm("¿Estás seguro de marcar el día como perdido? Esto romperá el reto escalera y se reiniciará al Día 1.")) {
                logEscaleraAttempt("Perdido", escaleraCurrentStake);
                resetEscalera();
            }
        };
    }

    function resetEscalera() {
        escaleraCurrentDay = 1;
        escaleraCurrentStake = escaleraStartingStake;
        escaleraCurrentRun = [];
        localStorage.setItem("escalera_day", escaleraCurrentDay);
        localStorage.setItem("escalera_current_stake", escaleraCurrentStake);
        localStorage.setItem("escalera_current_run", JSON.stringify(escaleraCurrentRun));
        renderEscaleraTab();
    }

    function logEscaleraAttempt(result, finalVal) {
        const history = JSON.parse(localStorage.getItem("escalera_history")) || [];
        history.push({
            date: new Date().toISOString().split("T")[0],
            maxDay: escaleraCurrentDay,
            finalCapital: finalVal,
            result: result
        });
        localStorage.setItem("escalera_history", JSON.stringify(history));
    }

    function populateEscaleraHistoryTable() {
        if (!escaleraHistoryTableBody) return;
        const currentRun = JSON.parse(localStorage.getItem("escalera_current_run")) || [];

        if (currentRun.length === 0) {
            escaleraHistoryTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 15px; color: var(--text-muted); background: rgba(255,255,255,0.01); font-size:0.75rem;">No hay registros en el reto actual. Gana tu primer día para verlo aquí.</td></tr>`;
            return;
        }

        let html = "";
        [...currentRun].reverse().forEach((item, index) => {
            let statusColor = "var(--text-muted)";
            if (item.status === "won") statusColor = "var(--accent-green)";
            else if (item.status === "pending") statusColor = "var(--accent-amber)";
            
            html += `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.015);">
                    <td style="padding: 10px 8px; text-align: left; font-size: 0.75rem; color:var(--text-secondary);">
                        <div style="font-weight: 700; color: var(--text-primary);">Día ${item.day}</div>
                        <div style="font-size: 0.65rem;">${item.date}</div>
                    </td>
                    <td style="padding: 10px 8px; text-align: left; font-size: 0.75rem; color:var(--text-primary);">
                        <div style="font-weight: 700;">${item.selection} <span style="color:var(--accent-amber)">@${item.odd.toFixed(2)}</span></div>
                        <div style="font-size: 0.65rem; color: var(--text-muted);">${item.match}</div>
                    </td>
                    <td style="padding: 10px 8px; text-align: center; font-size: 0.75rem;">
                        <span style="color: var(--text-muted);">$${item.stake.toFixed(2)}</span>
                        <i class="fa-solid fa-arrow-right" style="font-size: 0.6rem; margin: 0 4px;"></i>
                        <span style="color: ${statusColor}; font-weight: 700;">$${item.return.toFixed(2)}</span>
                    </td>
                    <td style="padding: 10px 8px; text-align: center;">
                        <select class="form-input history-status-select" data-day="${item.day}" style="padding: 4px; font-size: 0.7rem; width: auto; display: inline-block;">
                            <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                            <option value="won" ${item.status === 'won' ? 'selected' : ''}>Ganado</option>
                            <option value="lost" ${item.status === 'lost' ? 'selected' : ''}>Perdido</option>
                            <option value="voided" ${item.status === 'voided' ? 'selected' : ''}>Anulado</option>
                        </select>
                    </td>
                </tr>
            `;
        });
        escaleraHistoryTableBody.innerHTML = html;
        
        // Attach change listeners to select dropdowns
        document.querySelectorAll(".history-status-select").forEach(select => {
            select.addEventListener("change", (e) => {
                const dayEdited = parseInt(e.target.getAttribute("data-day"));
                const newStatus = e.target.value;
                const runItem = currentRun.find(r => r.day === dayEdited);
                
                if (newStatus === "lost") {
                    if(confirm(`¿Estás seguro de marcar el Día ${dayEdited} como perdido? El reto actual se considerará fracasado y volverás al Día 1.`)) {
                        logEscaleraAttempt("Perdido", runItem.stake);
                        resetEscalera();
                    } else {
                        // Revert visual change
                        e.target.value = runItem.status;
                    }
                } else if (newStatus === "won" && runItem.status === "pending") {
                    runItem.status = "won";
                    localStorage.setItem("escalera_current_run", JSON.stringify(currentRun));
                    
                    const returnVal = runItem.return;
                    if (dayEdited >= escaleraTargetDays) {
                        alert(`🎉 ¡RETADO COMPLETADO! Has finalizado el Reto Escalera con éxito.`);
                        logEscaleraAttempt("Ganado", returnVal);
                        resetEscalera();
                    } else {
                        escaleraCurrentDay = dayEdited + 1;
                        escaleraCurrentStake = returnVal;
                        localStorage.setItem("escalera_day", escaleraCurrentDay);
                        localStorage.setItem("escalera_current_stake", escaleraCurrentStake);
                        renderEscaleraTab();
                        alert(`📈 ¡Día ${dayEdited} Ganado! Avanzas al Día ${escaleraCurrentDay}.`);
                    }
                } else if (newStatus === "voided" && runItem.status === "pending") {
                    runItem.status = "voided";
                    const returnVal = runItem.stake;
                    runItem.return = returnVal;
                    localStorage.setItem("escalera_current_run", JSON.stringify(currentRun));
                    
                    escaleraCurrentDay = dayEdited;
                    escaleraCurrentStake = returnVal;
                    localStorage.setItem("escalera_day", escaleraCurrentDay);
                    localStorage.setItem("escalera_current_stake", escaleraCurrentStake);
                    renderEscaleraTab();
                    alert(`🔄 Día ${dayEdited} Anulado. Repites el mismo día con tu inversión intacta ($${returnVal}).`);
                }
            });
        });
    }

    if (inputEscaleraStartStake) {
        inputEscaleraStartStake.onchange = (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) {
                escaleraStartingStake = val;
                localStorage.setItem("escalera_start_stake", escaleraStartingStake);
                if (escaleraCurrentDay === 1) {
                    escaleraCurrentStake = val;
                    localStorage.setItem("escalera_current_stake", escaleraCurrentStake);
                }
                renderEscaleraTab();
            }
        };
    }

    if (inputEscaleraTargetDays) {
        inputEscaleraTargetDays.onchange = (e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val >= 3) {
                escaleraTargetDays = val;
                localStorage.setItem("escalera_target_days", escaleraTargetDays);
                renderEscaleraTab();
            }
        };
    }

    if (btnClearEscaleraHistory) {
        btnClearEscaleraHistory.onclick = () => {
            if (confirm("¿Estás seguro de que deseas reiniciar el reto actual? Esto borrará el progreso de los días jugados y volverás al Día 1.")) {
                logEscaleraAttempt("Reiniciado", escaleraCurrentStake);
                resetEscalera();
            }
        };
    }

    const inputEscaleraCurrentDay = document.getElementById("input-escalera-current-day");
    if (inputEscaleraCurrentDay) {
        inputEscaleraCurrentDay.onchange = (e) => {
            const val = parseInt(e.target.value);
            if (!isNaN(val) && val >= 1) {
                escaleraCurrentDay = val;
                localStorage.setItem("escalera_day", escaleraCurrentDay);
                renderEscaleraTab();
            }
        };
    }

    const inputEscaleraCurrentStake = document.getElementById("input-escalera-current-stake");
    if (inputEscaleraCurrentStake) {
        inputEscaleraCurrentStake.onchange = (e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val > 0) {
                escaleraCurrentStake = val;
                localStorage.setItem("escalera_current_stake", escaleraCurrentStake);
                renderEscaleraTab();
            }
        };
    }
    
    // --- Custom Bet Analyzer Modal ---
    const btnOpenCustomBetModal = document.getElementById("btn-open-custom-bet-modal");
    const customBetModal = document.getElementById("custom-bet-modal");
    const customBetModalOverlay = document.getElementById("custom-bet-modal-overlay");
    const btnCloseCustomBetModal = document.getElementById("btn-close-custom-bet-modal");
    
    if (btnOpenCustomBetModal && customBetModal) {
        btnOpenCustomBetModal.onclick = () => customBetModal.classList.remove("hidden");
        const closeCustomBet = () => {
            customBetModal.classList.add("hidden");
            // Reset state optionally
            document.getElementById("custom-bet-result").classList.add("hidden");
        };
        if (btnCloseCustomBetModal) btnCloseCustomBetModal.onclick = closeCustomBet;
        if (customBetModalOverlay) customBetModalOverlay.onclick = closeCustomBet;
        
        const btnAnalyzeCustomBet = document.getElementById("btn-analyze-custom-bet");
        if (btnAnalyzeCustomBet) {
            btnAnalyzeCustomBet.onclick = () => {
                const eventName = document.getElementById("custom-bet-event").value.trim();
                const selectionName = document.getElementById("custom-bet-selection").value.trim();
                const oddVal = parseFloat(document.getElementById("custom-bet-odd").value);
                
                if (!eventName || !selectionName || isNaN(oddVal) || oddVal <= 1) {
                    alert("Por favor completa todos los campos con valores válidos (Cuota > 1.00).");
                    return;
                }
                
                const btnOriginalText = btnAnalyzeCustomBet.innerHTML;
                btnAnalyzeCustomBet.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando...';
                btnAnalyzeCustomBet.disabled = true;
                
                setTimeout(() => {
                    const impliedProb = (100 / oddVal);
                    // Fake AI calculation based on implied + variance
                    const randomVariance = (Math.random() * 12) - 4; // -4 to +8 %
                    let aiProb = impliedProb + randomVariance;
                    
                    // Factor Suerte / Caos
                    const factorSuerte = Math.floor(Math.random() * 100);
                    let suerteText = "";
                    if (factorSuerte > 75) {
                        suerteText = `<br><br><span style="color:var(--accent-green);"><i class="fa-solid fa-clover"></i> <b>Factor Suerte:</b> Muy Favorable (${factorSuerte}%). El caos del deporte y la alineación cósmica están de tu lado.</span>`;
                        aiProb += 4;
                    } else if (factorSuerte < 25) {
                        suerteText = `<br><br><span style="color:var(--accent-pink);"><i class="fa-solid fa-cloud-bolt"></i> <b>Factor Suerte:</b> Desfavorable (${factorSuerte}%). Cuidado, la varianza y el factor suerte juegan completamente en tu contra hoy.</span>`;
                        aiProb -= 4;
                    } else {
                        suerteText = `<br><br><span style="color:var(--text-muted);"><i class="fa-solid fa-scale-balanced"></i> <b>Factor Suerte:</b> Neutral (${factorSuerte}%). La suerte no influirá, esto es pura matemática y táctica.</span>`;
                    }
                    
                    aiProb = Math.max(5, Math.min(aiProb, 95));
                    
                    const resultDiv = document.getElementById("custom-bet-result");
                    const resultTitle = document.getElementById("custom-bet-result-title");
                    const resultText = document.getElementById("custom-bet-result-text");
                    const resultBank = document.getElementById("custom-bet-result-bank");
                    
                    resultDiv.classList.remove("hidden");
                    
                    if (aiProb >= 55) {
                        resultTitle.innerHTML = '<i class="fa-solid fa-shield-check"></i> Veredicto: Apuesta Segura';
                        resultTitle.style.color = "var(--accent-green)";
                        resultText.innerHTML = `La IA ha detectado una probabilidad matemática del <b>${aiProb.toFixed(1)}%</b> para esta selección. La cuota de ${oddVal.toFixed(2)} ofrece un valor excelente frente al riesgo. Los modelos predictivos avalan la inversión.${suerteText}`;
                        
                        let recBank = Math.min((aiProb / 15), 5); // Max 5%
                        resultBank.className = "badge bg-green";
                        resultBank.innerText = recBank.toFixed(1) + "%";
                    } else if (aiProb >= 38) {
                        resultTitle.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Veredicto: Riesgo Moderado';
                        resultTitle.style.color = "var(--accent-amber)";
                        resultText.innerHTML = `La IA estima una probabilidad del <b>${aiProb.toFixed(1)}%</b>. Es una apuesta factible pero con un margen de varianza alto. Recomendamos precaución debido a que el valor implícito está ajustado a la realidad del mercado.${suerteText}`;
                        
                        let recBank = Math.min((aiProb / 25), 2); // Max 2%
                        resultBank.className = "badge bg-amber";
                        resultBank.innerText = recBank.toFixed(1) + "%";
                    } else {
                        resultTitle.innerHTML = '<i class="fa-solid fa-ban"></i> Veredicto: No Recomendada';
                        resultTitle.style.color = "var(--accent-pink)";
                        resultText.innerHTML = `ALERTA: La IA le otorga apenas un <b>${aiProb.toFixed(1)}%</b> de probabilidad a este escenario. A largo plazo, matemáticamente esta cuota te hará perder dinero. ¡No arriesgues tu banca!${suerteText}`;
                        
                        resultBank.className = "badge bg-pink";
                        resultBank.innerText = "0% (Evitar)";
                    }
                    
                    btnAnalyzeCustomBet.innerHTML = btnOriginalText;
                    btnAnalyzeCustomBet.disabled = false;
                }, 1200);
            };
        }
    }

    window.renderEscaleraTab = renderEscaleraTab;

    // --- Start initial load ---
    async function init() {
        await loadSportsData();
        startLiveMarketFluctuations(); // Iniciar fluctuaciones en vivo
        initBankroll(); // Inicializar panel de bankroll y apuestas
        
        // Auto-sincronizar al iniciar si ya hay una clave guardada en el navegador
        const savedKey = localStorage.getItem("odds_api_key");
        if (savedKey) {
            apiKeyInput.value = savedKey;
            sync1xBetOdds(savedKey);
        }
    }
    
    init();
    // ==========================================================================
    // AI Assistant Chat Logic
    // ==========================================================================
    const aiAssistantTab = document.getElementById("aiassistant");
    const geminiModal = document.getElementById("gemini-api-modal");
    const btnConfigureAi = document.getElementById("btn-configure-ai");
    const btnCloseGeminiModal = document.getElementById("btn-close-gemini-modal");
    const geminiModalOverlay = document.getElementById("gemini-api-modal-overlay");
    const btnSaveGeminiKey = document.getElementById("btn-save-gemini-key");
    const inputGeminiKey = document.getElementById("input-gemini-api-key");
    const btnAiSend = document.getElementById("btn-ai-send");
    const aiChatInput = document.getElementById("ai-chat-input");
    const aiChatHistory = document.getElementById("ai-chat-history");

    function openGeminiModal() {
        geminiModal.classList.remove("hidden");
        const savedKey = localStorage.getItem("gemini_api_key");
        if (savedKey) inputGeminiKey.value = savedKey;
    }
    
    function closeGeminiModal() {
        geminiModal.classList.add("hidden");
    }

    if (btnConfigureAi) btnConfigureAi.onclick = openGeminiModal;
    if (btnCloseGeminiModal) btnCloseGeminiModal.onclick = closeGeminiModal;
    if (geminiModalOverlay) geminiModalOverlay.onclick = closeGeminiModal;

    if (btnSaveGeminiKey) {
        btnSaveGeminiKey.onclick = () => {
            const key = inputGeminiKey.value.trim();
            if (key) {
                localStorage.setItem("gemini_api_key", key);
                closeGeminiModal();
                alert("Clave guardada con éxito. Ya puedes chatear.");
            } else {
                alert("Por favor ingresa una clave válida.");
            }
        };
    }

    function addChatMessage(role, text) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `chat-message ${role === "user" ? "user-message" : "ai-message"}`;
        msgDiv.style.alignSelf = role === "user" ? "flex-end" : "flex-start";
        msgDiv.style.maxWidth = "85%";
        
        const innerDiv = document.createElement("div");
        if (role === "user") {
            innerDiv.style.background = "var(--accent-cyan)";
            innerDiv.style.color = "#fff";
            innerDiv.style.borderRadius = "12px";
            innerDiv.style.borderTopRightRadius = "2px";
        } else {
            innerDiv.style.background = "rgba(6, 182, 212, 0.1)";
            innerDiv.style.border = "1px solid rgba(6, 182, 212, 0.2)";
            innerDiv.style.color = "var(--text-primary)";
            innerDiv.style.borderRadius = "12px";
            innerDiv.style.borderTopLeftRadius = "2px";
        }
        innerDiv.style.padding = "12px 16px";
        innerDiv.style.fontSize = "0.9rem";
        innerDiv.style.lineHeight = "1.5";
        
        let htmlText = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        htmlText = htmlText.replace(/\n/g, '<br>');
        innerDiv.innerHTML = htmlText;
        
        msgDiv.appendChild(innerDiv);
        if (aiChatHistory) {
            aiChatHistory.appendChild(msgDiv);
            aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
        }
    }

    if (btnAiSend && aiChatInput) {
        const sendMsg = async () => {
            const text = aiChatInput.value.trim();
            if (!text) return;
            
            const apiKey = localStorage.getItem("gemini_api_key");
            if (!apiKey) {
                openGeminiModal();
                return;
            }

            addChatMessage("user", text);
            aiChatInput.value = "";
            btnAiSend.disabled = true;
            
            const typingId = "typing-" + Date.now();
            const typingDiv = document.createElement("div");
            typingDiv.id = typingId;
            typingDiv.style.alignSelf = "flex-start";
            typingDiv.style.color = "var(--text-muted)";
            typingDiv.style.fontSize = "0.8rem";
            typingDiv.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando...';
            if (aiChatHistory) {
                aiChatHistory.appendChild(typingDiv);
                aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
            }

            try {
                // Simplificar los datos para no sobrecargar el modelo
                const simplifiedMatches = matchData.matches ? matchData.matches.map(m => ({
                    local: m.homeTeam,
                    visitante: m.awayTeam,
                    cuotas: m.odds
                })) : [];
                
                const promptContext = `Eres SportIntel Bot, el analista de apuestas de IA oficial y experto de esta plataforma.
                Tu objetivo es dar recomendaciones claras, directas y con alto valor (ROI).
                Se cortés y profesional. Usa el siguiente listado de partidos actualizados al día de hoy para dar tu respuesta:
                Partidos del dia: ${JSON.stringify(simplifiedMatches)}
                
                Consulta del usuario: ${userInput}
                
                Reglas:
                1. Si el usuario saluda, preséntate brevemente y dile qué puedes hacer (ej. analizar un partido, dar una combinada, explicar bankroll).
                2. Si el usuario pregunta por un partido específico, búscalo en "Partidos del dia". Si está, dale el pronóstico 1X2 o de goles con la cuota.
                3. Si el usuario pregunta por un partido que NO está en la lista de hoy, dile amablemente que solo tienes datos de los partidos de hoy mostrados en la lista.
                4. Si te pide una combinada (parlay), selecciona 2 o 3 partidos de la lista con buena probabilidad y calcula la cuota total.
                `;

                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'x-goog-api-key': apiKey
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: promptContext
                            }]
                        }],
                        generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
                    })
                });

                const tDiv = document.getElementById(typingId);
                if (tDiv) tDiv.remove();
                btnAiSend.disabled = false;

                if (!response.ok) {
                    let exactError = "Error desconocido.";
                    try {
                        const errData = await response.json();
                        if (errData.error && errData.error.message) {
                            exactError = errData.error.message;
                        }
                    } catch(e) {}
                    addChatMessage("ai", `Error de conexión. Google dice: <b>${exactError}</b><br><br>Verifica tu clave o espera unos minutos si acabas de crearla.`);
                    return;
                }

                const data = await response.json();
                const aiText = data.candidates[0].content.parts[0].text;
                addChatMessage("ai", aiText);
                
            } catch (error) {
                const tDiv = document.getElementById(typingId);
                if (tDiv) tDiv.remove();
                btnAiSend.disabled = false;
                addChatMessage("ai", "Error de red.");
            }
        };

        btnAiSend.onclick = sendMsg;
        aiChatInput.onkeypress = (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMsg();
            }
        };
    }

});
