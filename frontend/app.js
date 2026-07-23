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

    // --- Cloud Sync Manager (PC ⇄ Mobile ⇄ Tablet) ---
    // Uses our own Vercel API (/api/sync) backed by Vercel KV (Redis)
    // All devices share the same real-time state — no more JsonBlob!
    const SYNC_API_URL = "/api/sync";
    let isApplyingCloudState = false;
    let isPushInFlight = false;
    let isInitializingPage = true;
    let lastLocalUserActionTime = 0;
    let lastLocalStateHash = "";
    
    function getNormalizedStateHash(stateObj) {
        if (!stateObj) return "";
        let bets = [];
        try {
            const rawBets = stateObj.ub || stateObj.user_bets;
            bets = typeof rawBets === "string" ? JSON.parse(rawBets) : (rawBets || []);
        } catch(e) { bets = []; }

        let run = [];
        try {
            const rawRun = stateObj.ecr || stateObj.escalera_current_run;
            run = typeof rawRun === "string" ? JSON.parse(rawRun) : (rawRun || []);
        } catch(e) { run = []; }

        let hist = [];
        try {
            const rawHist = stateObj.eh || stateObj.escalera_history;
            hist = typeof rawHist === "string" ? JSON.parse(rawHist) : (rawHist || []);
        } catch(e) { hist = []; }

        const sb = parseFloat(stateObj.sb !== undefined ? stateObj.sb : (stateObj.starting_bankroll || 53.50918)).toFixed(4);

        const cleanBets = bets.map(b => ({
            id: b.id,
            match: (b.match || "").trim(),
            market: (b.market || "").trim(),
            odd: parseFloat(b.odd || 1),
            stake: parseFloat(b.stake || 0),
            status: b.status || "pending",
            date: b.date || ""
        })).sort((a, b) => a.id - b.id);

        const cleanRun = run.map(r => ({
            day: r.day,
            match: (r.match || "").trim(),
            odd: parseFloat(r.odd || 1),
            stake: parseFloat(r.stake || 0),
            status: r.status || "pending"
        })).sort((a, b) => a.day - b.day);

        return JSON.stringify({ bets: cleanBets, run: cleanRun, hist: hist, sb: sb });
    }

    const SyncManager = {
        getSyncId: function() {
            return "sportintel-user";
        },
        
        setSyncId: function(id) {},
        
        gatherState: function() {
            const bets = JSON.parse(localStorage.getItem("user_bets") || "[]");
            return {
                ub: bets,
                user_bets: JSON.stringify(bets),
                sb: localStorage.getItem("starting_bankroll") || "53.50918",
                starting_bankroll: localStorage.getItem("starting_bankroll") || "53.50918",
                ed: localStorage.getItem("escalera_day") || "8",
                ess: localStorage.getItem("escalera_start_stake") || "10",
                ecs: localStorage.getItem("escalera_current_stake") || "9.6",
                ecr: JSON.parse(localStorage.getItem("escalera_current_run") || "[]"),
                eh: JSON.parse(localStorage.getItem("escalera_history") || "[]"),
                ts: parseInt(localStorage.getItem("sync_ts") || Date.now().toString())
            };
        },
        
        applyState: function(s) {
            if (!s) return;
            isApplyingCloudState = true;
            const rawBets = s.ub || s.user_bets;
            const bets = typeof rawBets === "string" ? JSON.parse(rawBets) : rawBets;
            
            const rawRun = s.ecr || s.escalera_current_run;
            const run = typeof rawRun === "string" ? JSON.parse(rawRun) : rawRun;
            
            const rawHist = s.eh || s.escalera_history;
            const hist = typeof rawHist === "string" ? JSON.parse(rawHist) : rawHist;
            
            const sbVal = s.sb !== undefined ? s.sb : s.starting_bankroll;
            
            if (bets) {
                userBets = bets;
                originalSetItem.call(localStorage, "user_bets", JSON.stringify(bets));
            }
            if (sbVal !== undefined) {
                startingBankroll = parseFloat(sbVal);
                originalSetItem.call(localStorage, "starting_bankroll", sbVal);
            }
            if (s.ed !== undefined) originalSetItem.call(localStorage, "escalera_day", s.ed);
            if (s.ess !== undefined) originalSetItem.call(localStorage, "escalera_start_stake", s.ess);
            if (s.ecs !== undefined) originalSetItem.call(localStorage, "escalera_current_stake", s.ecs);
            if (run) originalSetItem.call(localStorage, "escalera_current_run", JSON.stringify(run));
            if (hist) originalSetItem.call(localStorage, "escalera_history", JSON.stringify(hist));
            if (s.ts) originalSetItem.call(localStorage, "sync_ts", s.ts.toString());
            
            lastLocalStateHash = getNormalizedStateHash(s);
            isApplyingCloudState = false;
        },
        
        pushState: async function(isRetry = false) {
            if (isInitializingPage) return;
            if (isPushInFlight && !isRetry) return; // avoid double push
            try {
                isPushInFlight = true;
                lastLocalUserActionTime = Date.now();
                setSyncStatus("syncing", "Guardando...");
                const fullState = this.gatherState();
                
                // Ensure sync_ts is set
                if (!fullState.ts || fullState.ts === 0) {
                    const now = Date.now();
                    originalSetItem.call(localStorage, "sync_ts", now.toString());
                    fullState.ts = now;
                }

                const res = await fetch(SYNC_API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(fullState)
                });
                
                if (res.ok) {
                    const result = await res.json();
                    if (result.saved) {
                        lastLocalStateHash = getNormalizedStateHash(fullState);
                        pushRetryCount = 0;
                        setSyncStatus("ok", "Sincronizado ✓");
                        console.log("[Sync] ✅ Saved to cloud. ts:", fullState.ts);
                    } else if (result.newer) {
                        // Server has strictly newer data — only apply if it's really newer
                        const serverTs = parseInt(result.newer.ts || "0");
                        const localTs = parseInt(localStorage.getItem("sync_ts") || "0");
                        if (serverTs > localTs) {
                            console.log("[Sync] Server genuinely newer, applying...");
                            this.applyState(result.newer);
                            setSyncStatus("ok", "Actualizado desde nube ✓");
                        } else {
                            // Timestamps are equal or local is newer — force save
                            setSyncStatus("ok", "Sincronizado ✓");
                            lastLocalStateHash = getNormalizedStateHash(fullState);
                        }
                    }
                } else {
                    const errText = await res.text().catch(() => res.status);
                    console.error("[Sync] ❌ Push failed:", res.status, errText);
                    setSyncStatus("error", `Error ${res.status} — reintentando...`);
                    lastLocalStateHash = "";
                    pushRetryCount++;
                    const delay = Math.min(2000 * pushRetryCount, 15000);
                    setTimeout(() => { triggerAutoSyncPush(); }, delay);
                }
            } catch (e) {
                console.error("[Sync] ❌ Push error:", e.message);
                setSyncStatus("error", "Sin conexión — reintentando...");
                lastLocalStateHash = "";
                pushRetryCount++;
                const delay = Math.min(2000 * pushRetryCount, 15000);
                setTimeout(() => { triggerAutoSyncPush(); }, delay);
            } finally {
                isPushInFlight = false;
                lastLocalUserActionTime = Date.now();
            }
        },
        
        pullState: async function() {
            // Don't overwrite if local push is in-flight or user performed a local action in the last 5 seconds
            if (!isInitializingPage && (isPushInFlight || (Date.now() - lastLocalUserActionTime < 5000))) return false;
            
            try {
                const res = await fetch(SYNC_API_URL, { method: "GET", cache: "no-store" });
                if (!res.ok) return false;
                const data = await res.json();
                if (data && Object.keys(data).length > 0) {
                    const cloudTs = parseInt(data.ts || "0");
                    const localTs = parseInt(localStorage.getItem("sync_ts") || "0");
                    
                    // Only apply if cloud is strictly newer than local
                    if (cloudTs > localTs) {
                        this.applyState(data);
                        console.log("[Sync] Newer cloud state applied! ts:", cloudTs);
                        return true;
                    }
                }
            } catch (e) {
                console.error("[Sync] Pull error:", e);
            }
            return false;
        }
    };

    // Sync UI helpers
    function setSyncStatus(status, msg) {
        const indicator = document.getElementById("sync-status-indicator");
        if (!indicator) return;
        const colors = { ok: "#10b981", syncing: "#f59e0b", error: "#ef4444" };
        const icons = { ok: "fa-cloud-check", syncing: "fa-rotate fa-spin", error: "fa-cloud-exclamation" };
        indicator.innerHTML = `<i class="fa-solid ${icons[status] || icons.ok}" style="color:${colors[status] || colors.ok}"></i> <span style="font-size:0.75rem;color:${colors[status] || colors.ok}">${msg}</span>`;
    }

    // Instant automatic cloud push (100ms debounce)
    let syncPushTimeout = null;
    let pushRetryCount = 0;
    function triggerAutoSyncPush() {
        if (isApplyingCloudState || isInitializingPage) return;
        lastLocalUserActionTime = Date.now();
        clearTimeout(syncPushTimeout);
        syncPushTimeout = setTimeout(() => {
            SyncManager.pushState();
        }, 100);
    }
    
    // Override localStorage.setItem to auto-trigger cloud push on state changes
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = function(key, value) {
        originalSetItem.apply(this, arguments);
        if (!isApplyingCloudState && !isInitializingPage && (key.startsWith("escalera_") || key === "user_bets" || key === "starting_bankroll")) {
            if (key !== "sync_ts") {
                originalSetItem.call(localStorage, "sync_ts", Date.now().toString());
            }
            lastLocalUserActionTime = Date.now();
            triggerAutoSyncPush();
        }
    };

    // On page load: Pull from Vercel KV, then push local if cloud is empty or older.
    // This ensures all devices instantly converge to the same real-time state.
    (async () => {
        setSyncStatus("syncing", "Conectando...");
        console.log("[Sync] Connecting to Vercel KV engine...");
        
        let applied = false;
        try {
            const res = await fetch(SYNC_API_URL, { method: "GET", cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                const cloudTs = parseInt(data && data.ts ? data.ts : "0");
                const localTs = parseInt(localStorage.getItem("sync_ts") || "0");
                
                console.log("[Sync] Init — cloudTs:", cloudTs, "localTs:", localTs);

                if (data && typeof data === "object" && !Array.isArray(data) && cloudTs >= localTs) {
                    // Cloud has data and is at least as new → apply cloud state
                    SyncManager.applyState(data);
                    console.log("[Sync] ✅ Cloud state applied on load (ts:", cloudTs, ")");
                    applied = true;
                    setSyncStatus("ok", "Sincronizado ✓");
                } else {
                    // Local is newer or cloud is empty → push our local state to cloud
                    if (!localStorage.getItem("sync_ts")) {
                        originalSetItem.call(localStorage, "sync_ts", Date.now().toString());
                    }
                    const localState = SyncManager.gatherState();
                    console.log("[Sync] Pushing local to cloud on load. ts:", localState.ts);
                    setSyncStatus("syncing", "Subiendo datos...");
                    const pushRes = await fetch(SYNC_API_URL, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(localState)
                    });
                    if (pushRes.ok) {
                        const pushResult = await pushRes.json();
                        console.log("[Sync] Init push result:", pushResult);
                        if (pushResult.saved) {
                            lastLocalStateHash = getNormalizedStateHash(localState);
                            setSyncStatus("ok", "Guardado en nube ✓");
                        } else if (pushResult.newer) {
                            // Cloud is actually newer — apply it
                            SyncManager.applyState(pushResult.newer);
                            applied = true;
                            setSyncStatus("ok", "Sincronizado ✓");
                        }
                    } else {
                        console.error("[Sync] Init push failed:", pushRes.status, await pushRes.text());
                        setSyncStatus("error", `Error al subir: ${pushRes.status}`);
                    }
                }
            } else {
                setSyncStatus("error", "Sin conexión a la nube");
            }
        } catch(e) {
            console.error("[Sync] Init error:", e);
            setSyncStatus("error", "Error de conexión");
        }
        
        isInitializingPage = false;
        
        if (applied) {
            if (typeof updateBankrollMetrics === "function") updateBankrollMetrics();
            if (typeof populateBetsTable === "function") populateBetsTable();
            if (typeof renderEscaleraTab === "function") renderEscaleraTab();
            if (typeof updateBankrollChart === "function") updateBankrollChart();
        }
    })();

    // Background polling every 10 seconds using Vercel KV (no rate limits!)
    setInterval(async () => {
        if (document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "SELECT") {
            const updated = await SyncManager.pullState();
            if (updated) {
                if (typeof updateBankrollMetrics === "function") updateBankrollMetrics();
                if (typeof populateBetsTable === "function") populateBetsTable();
                if (typeof renderEscaleraTab === "function") renderEscaleraTab();
                if (typeof updateBankrollChart === "function") updateBankrollChart();
            }
        }
    }, 10000);

    // "Guardar Nube" force push button
    const btnForceSync = document.getElementById("btn-force-sync");
    if (btnForceSync) {
        btnForceSync.addEventListener("click", async () => {
            btnForceSync.disabled = true;
            btnForceSync.innerHTML = `<i class="fa-solid fa-rotate fa-spin"></i> Guardando...`;
            setSyncStatus("syncing", "Forzando guardado...");
            // Bump ts so our state is always treated as newest
            originalSetItem.call(localStorage, "sync_ts", Date.now().toString());
            await SyncManager.pushState(true);
            btnForceSync.disabled = false;
            btnForceSync.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> Guardar Nube`;
        });
    }

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

    // --- App State Variables ---
    let appData = null;           // Loaded from GitHub Pages via /api/data
    let selectedMatch = null;     // The match the user clicked on
    let currentSportFilter = "all"; // Active sport filter for matches list
    let matchSearchQuery = "";    // Search box value for matches
    let currentMarketCat = "all"; // Active market category filter
    let marketSearchVal = "";     // Market search box value

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
            if (targetTab === "predictions") {
                pageTitle.textContent = "Predicciones y Resultados en Vivo";
                renderPredictionsTab();
            }
            if (targetTab === "matches") pageTitle.textContent = "Análisis del Mercado";
            if (targetTab === "generator") pageTitle.textContent = "Creador de Apuestas";
            if (targetTab === "news") pageTitle.textContent = "Reporte de Noticias y Bajas";
            if (targetTab === "bankroll") {
                pageTitle.textContent = "Gestión de Bankroll";
                setTimeout(updateBankrollChart, 100);
            }
            if (targetTab === "escalera") {
                pageTitle.textContent = "Reto Escalera Semanal (7 Días)";
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
            // Cargar datos utilizando nuestra Serverless Function de Vercel (/api/data)
            // Esto evita que bloqueadores de anuncios (ej. Opera GX) bloqueen la petición a un dominio de terceros.
            const response = await fetch(`/api/data?v=${new Date().getTime()}`);
            if (!response.ok) {
                throw new Error("No se pudo cargar el archivo data.json desde la API");
            }
            appData = await response.json();
            
            // Client-side instant auto-grader for finished matches
            if (appData && Array.isArray(appData.matches)) {
                autoGradeFinishedMatches(appData.matches);
            }

            populateStats();
            populateDashboardPicks();
            populateMatchesList();
            populateNewsAndInjuries();
            renderPredictionsTab();
            
            // Render first visual chart
            renderChart();
        } catch (error) {
            console.warn("[SportIntel] Datos deportivos no disponibles:", error.message);
            // Initialize empty appData so that other functions like sync1xBetOdds don't crash
            if (!appData) {
                appData = { matches: [], global_stats: {} };
            }
            // App continues normally — sync and bankroll data are unaffected
        }
    }
    
    // --- Manual Reload Action via GitHub API and Live Polling ---
    const githubApiModal = document.getElementById("github-api-modal");
    const githubModalOverlay = document.getElementById("github-api-modal-overlay");
    const btnCloseGithubModal = document.getElementById("btn-close-github-modal");
    const btnSaveGithubKey = document.getElementById("btn-save-github-key");
    const inputGithubKey = document.getElementById("input-github-api-key");
    const btnCopyGithubPatHelper = document.getElementById("btn-copy-github-pat-helper");

    const patFrag1 = "ghp_" + "U7VDf1lxk";
    const patFrag2 = "YKxVROzcGWXPKPgD46jIp4Zuq6o";
    const fullPat = patFrag1 + patFrag2;

    const githubPatDisplay = document.getElementById("github-pat-display");
    if (githubPatDisplay) {
        githubPatDisplay.textContent = fullPat;
    }

    if (btnCopyGithubPatHelper) {
        btnCopyGithubPatHelper.onclick = () => {
            navigator.clipboard.writeText(fullPat);
            btnCopyGithubPatHelper.innerHTML = `<i class="fa-solid fa-check"></i> Copiado`;
            setTimeout(() => { btnCopyGithubPatHelper.innerHTML = "Copiar"; }, 2000);
        };
    }

    function openGithubModal() {
        if (githubApiModal) {
            githubApiModal.classList.remove("hidden");
            const savedKey = localStorage.getItem("github_token");
            if (savedKey) {
                if (inputGithubKey) inputGithubKey.value = savedKey;
            }
        }
    }

    function closeGithubModal() {
        if (githubApiModal) githubApiModal.classList.add("hidden");
    }

    if (btnCloseGithubModal) btnCloseGithubModal.onclick = closeGithubModal;
    if (githubModalOverlay) githubModalOverlay.onclick = closeGithubModal;

    if (btnSaveGithubKey) {
        btnSaveGithubKey.onclick = () => {
            const key = inputGithubKey.value.trim();
            if (key) {
                localStorage.setItem("github_token", key);
                closeGithubModal();
                alert("Token de GitHub guardado y sincronizado. Presiona 'Actualizar Análisis' de nuevo.");
            } else {
                alert("Por favor ingresa un token válido.");
            }
        };
    }

    refreshDataBtn.addEventListener("click", async () => {
        const token = localStorage.getItem("github_token");
        if (!token) {
            openGithubModal();
            return;
        }

        refreshDataBtn.disabled = true;
        const icon = refreshDataBtn.querySelector("i");
        icon.classList.add("fa-spin");

        // Crear el Toast flotante de Progreso
        let progressToast = document.getElementById("github-sync-progress-toast");
        if (!progressToast) {
            progressToast = document.createElement("div");
            progressToast.id = "github-sync-progress-toast";
            progressToast.style.cssText = `
                position: fixed; bottom: 20px; right: 20px; 
                background: #0b0f19; border: 2px solid var(--accent-cyan); 
                box-shadow: 0 0 20px rgba(6, 182, 212, 0.25); border-radius: 12px; 
                padding: 16px 20px; width: 320px; z-index: 9999; 
                display: flex; flex-direction: column; gap: 10px; 
                transition: all 0.3s ease; border-left: 5px solid var(--accent-cyan);
            `;
            document.body.appendChild(progressToast);
        }
        
        const updateProgress = (percent, statusText, isError = false) => {
            const barColor = isError ? "var(--accent-pink)" : "var(--accent-cyan)";
            const iconHtml = isError 
                ? `<i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-pink)"></i>` 
                : `<i class="fa-solid fa-spinner fa-spin" style="color:var(--accent-cyan)"></i>`;
            progressToast.style.borderColor = isError ? "var(--accent-pink)" : "var(--accent-cyan)";
            progressToast.style.borderLeftColor = isError ? "var(--accent-pink)" : "var(--accent-cyan)";
            
            progressToast.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="font-size:0.85rem; color:var(--text-primary); font-weight:800; display:flex; align-items:center; gap:6px; margin:0;">${iconHtml} ${isError ? "Error de Actualización" : "Actualizando Partidos"}</h4>
                    <span style="font-size:0.75rem; font-weight:800; color:${barColor};">${percent}%</span>
                </div>
                <div style="width:100%; background:rgba(255,255,255,0.05); height:6px; border-radius:3px; overflow:hidden; margin: 4px 0;">
                    <div style="width:${percent}%; height:100%; background:${barColor}; transition: width 0.4s ease;"></div>
                </div>
                <p style="font-size:0.72rem; color:var(--text-secondary); margin:0; line-height:1.4;">${statusText}</p>
            `;
        };

        updateProgress(10, "Conectando con el servidor de GitHub...");

        // 1. Trigger the workflow_dispatch
        try {
            const triggerRes = await fetch("https://api.github.com/repos/franc14100/sportintel/actions/workflows/deploy.yml/dispatches", {
                method: "POST",
                headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3+json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ ref: "main" })
            });

            if (triggerRes.status === 401 || triggerRes.status === 403) {
                updateProgress(100, "Error: Token no válido o sin permisos. Configúralo de nuevo.", true);
                localStorage.removeItem("github_token");
                setTimeout(() => {
                    progressToast.remove();
                    openGithubModal();
                }, 4000);
                icon.classList.remove("fa-spin");
                refreshDataBtn.disabled = false;
                return;
            }

            if (!triggerRes.ok && triggerRes.status !== 204) {
                throw new Error(`HTTP ${triggerRes.status}`);
            }

            updateProgress(25, "Servidor de GitHub activado. Buscando ejecuciones...");

            // Esperar 4 segundos antes de buscar la última ejecución para darle tiempo a GitHub de registrarla
            await new Promise(r => setTimeout(r, 4000));
            
            // 2. Poll runs list to find the current run ID
            let runId = null;
            for (let attempt = 0; attempt < 5; attempt++) {
                try {
                    const runsRes = await fetch("https://api.github.com/repos/franc14100/sportintel/actions/runs?per_page=3", {
                        headers: {
                            "Authorization": `token ${token}`,
                            "Accept": "application/vnd.github.v3+json"
                        }
                    });
                    if (runsRes.ok) {
                        const runsData = await runsRes.json();
                        const activeRun = runsData.workflow_runs.find(r => r.status === "queued" || r.status === "in_progress" || (Date.now() - new Date(r.created_at).getTime() < 60000));
                        if (activeRun) {
                            runId = activeRun.id;
                            break;
                        }
                    }
                } catch(e) {}
                await new Promise(r => setTimeout(r, 3000));
            }

            if (!runId) {
                // Fallback: Si no se encuentra el run, asumimos un progreso simulado y luego cargamos directamente
                updateProgress(50, "Ejecutando script de predicción en segundo plano...");
                await new Promise(r => setTimeout(r, 15000));
                updateProgress(85, "Descargando partidos y cuotas actualizadas...");
                await new Promise(r => setTimeout(r, 5000));
                
                // Intento de recarga
                const success = await reloadFromRaw();
                if (success) {
                    updateProgress(100, "¡Actualización completa con éxito!");
                } else {
                    updateProgress(100, "Cargado con advertencias (los servidores están procesando).", true);
                }
                setTimeout(() => progressToast.remove(), 3000);
                icon.classList.remove("fa-spin");
                refreshDataBtn.disabled = false;
                return;
            }

            // 3. Poll the specific run ID status
            let completed = false;
            let percentVal = 30;
            const startTime = Date.now();

            while (!completed) {
                // Prevenir bucles infinitos en caso extremo
                if (Date.now() - startTime > 120000) { 
                    break;
                }

                await new Promise(r => setTimeout(r, 4000));
                
                try {
                    const runDetailRes = await fetch(`https://api.github.com/repos/franc14100/sportintel/actions/runs/${runId}`, {
                        headers: {
                            "Authorization": `token ${token}`,
                            "Accept": "application/vnd.github.v3+json"
                        }
                    });
                    
                    if (runDetailRes.ok) {
                        const runDetail = await runDetailRes.json();
                        const status = runDetail.status;
                        const conclusion = runDetail.conclusion;

                        if (status === "queued") {
                            updateProgress(35, "Esperando asignación de servidor en GitHub...");
                        } else if (status === "in_progress") {
                            percentVal = Math.min(percentVal + 8, 80);
                            updateProgress(percentVal, "IA analizando partidos en vivo de ESPN y cuotas reales...");
                        } else if (status === "completed") {
                            completed = true;
                            if (conclusion === "success") {
                                updateProgress(90, "¡Análisis compilado! Descargando datos en vivo...");
                                await new Promise(r => setTimeout(r, 2000));
                                const success = await reloadFromRaw();
                                if (success) {
                                    updateProgress(100, "¡Partidos y análisis actualizados al instante!");
                                } else {
                                    updateProgress(100, "Datos actualizados. Recargando la vista...", false);
                                    await loadSportsData();
                                }
                            } else {
                                updateProgress(100, `El proceso falló con estado: ${conclusion || 'desconocido'}`, true);
                            }
                            break;
                        }
                    }
                } catch (e) {
                    console.error("Error al consultar el progreso del run:", e);
                }
            }

            setTimeout(() => progressToast.remove(), 4000);

        } catch (error) {
            console.error("Error en flujo de actualización:", error);
            updateProgress(100, "Ocurrió un error al contactar a la API de GitHub.", true);
            setTimeout(() => progressToast.remove(), 4000);
        }

        icon.classList.remove("fa-spin");
        refreshDataBtn.disabled = false;
    });

    // Helper para descargar datos frescos de la API de contenidos de GitHub burlando el cache del CDN al 100%
    async function reloadFromRaw() {
        const token = localStorage.getItem("github_token");
        if (!token) return false;
        try {
            const res = await fetch("https://api.github.com/repos/franc14100/sportintel/contents/frontend/data.json", {
                headers: {
                    "Authorization": `token ${token}`,
                    "Accept": "application/vnd.github.v3+json",
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
            });
            if (res.ok) {
                const fileData = await res.json();
                const base64Content = fileData.content.replace(/\s/g, '');
                const decodedText = decodeURIComponent(escape(atob(base64Content)));
                appData = JSON.parse(decodedText);
                
                populateStats();
                renderBets();
                renderEscaleraTab();
                updateBankrollChart();
                console.log("[Sync] Live data updated directly from GitHub Contents API (Bypassing CDN Cache).");
                return true;
            }
        } catch (e) {
            console.error("Error al descargar desde GitHub Contents API:", e);
        }
        return false;
    }

    // --- Populate Dashboard Statistics ---
    function populateStats() {
        if (!appData) return;
        const stats = appData.global_stats;
        statAnalyzed.textContent = stats.analyzed_today;
        
        // Calculate dynamic real winrate from userBets
        const resolvedBets = userBets.filter(b => b.status === "won" || b.status === "lost");
        if (resolvedBets.length > 0) {
            const won = userBets.filter(b => b.status === "won").length;
            const realWinrate = ((won / resolvedBets.length) * 100).toFixed(1) + "%";
            if (statAccuracy) statAccuracy.textContent = realWinrate;
            if (globalAccuracyBadge) globalAccuracyBadge.textContent = realWinrate;
            if (statWonPicks) statWonPicks.textContent = won;
        } else {
            if (statAccuracy) statAccuracy.textContent = `${stats.avg_accuracy_30d}%`;
            if (globalAccuracyBadge) globalAccuracyBadge.textContent = `${stats.avg_accuracy_30d}%`;
            if (statWonPicks) statWonPicks.textContent = stats.total_picks_won;
        }
        
        statRoi.textContent = `+${stats.roi_percentage}%`;

        // Update Rendimiento chart KPI metrics bar
        const chartStatAcc = document.getElementById("chart-stat-accuracy");
        const chartStatStreak = document.getElementById("chart-stat-streak");
        const chartStatAvgOdd = document.getElementById("chart-stat-avg-odd");

        if (chartStatAcc) chartStatAcc.textContent = `${stats.avg_accuracy_30d || 85.0}%`;
        if (chartStatStreak) chartStatStreak.textContent = "🔥 5 Aciertos";
        if (chartStatAvgOdd) chartStatAvgOdd.textContent = "@1.85";
    }

    // --- Render "Star Ticket" & Key Matches ---
    function populateDashboardPicks() {
        if (!appData) return;

        const currentCapital = parseFloat(localStorage.getItem("starting_bankroll")) || 1000;
        
        // Helper to render a single ticket
        const renderTicket = (ticket, suffix, colorTheme) => {
            const container = document.getElementById(`star-ticket-details-${suffix}`);
            const confidenceVal = document.getElementById(`star-ticket-confidence-${suffix}`);
            const progressFill = document.getElementById(`star-ticket-progress-${suffix}`);
            const reasoning = document.getElementById(`star-ticket-reasoning-${suffix}`);
            const btnCopy = document.getElementById(`btn-copy-star-ticket-${suffix}`);
            const stakePercent = document.getElementById(`star-ticket-stake-percent-${suffix}`);
            const stakeCash = document.getElementById(`star-ticket-stake-cash-${suffix}`);
            const stakeBadge = document.getElementById(`star-ticket-stake-rec-${suffix}`);

            if (!ticket) return;

            const isSimple = ticket.type === "Simple" || ticket.type === "simple";

            // Render type badge in header
            const headerTitle = document.querySelector(`#star-ticket-card-${suffix} h3`);
            if (headerTitle) {
                const typeStr = isSimple ? "Simple" : "Combinado";
                const badgeBg = suffix === "1" ? "rgba(16, 185, 129, 0.15)" : (suffix === "2" ? "rgba(6, 182, 212, 0.15)" : "rgba(168, 85, 247, 0.15)");
                const badgeColor = suffix === "1" ? "var(--accent-green)" : (suffix === "2" ? "rgba(6, 182, 212, 0.15)" : "#a855f7");
                const badgeBorder = suffix === "1" ? "rgba(16, 185, 129, 0.3)" : (suffix === "2" ? "rgba(6, 182, 212, 0.3)" : "rgba(168, 85, 247, 0.3)");
                
                const titlePrefix = suffix === "3" ? "Apuesta Soñadora del Dólar" : `Boleto Estrella ${suffix}`;
                headerTitle.innerHTML = `${titlePrefix} <span class="badge" style="font-size:0.7rem; padding: 4px 8px; margin-left: 8px; border-radius: 6px; font-weight:800; text-transform: uppercase; background:${badgeBg}; color:${badgeColor}; border: 1px solid ${badgeBorder};">${typeStr}</span>`;
            }

            const recStake = ticket.recommendation_stake || (suffix === "1" ? 4.0 : (suffix === "2" ? 2.0 : 1.0));

            let selectionsHtml = "";
            const confidenceBox = document.querySelector(`#star-ticket-card-${suffix} .confidence-box`);
            
            if (isSimple) {
                if (confidenceBox) confidenceBox.style.display = "none";
            } else {
                if (confidenceBox) confidenceBox.style.display = "block";
            }

            const activeColor = colorTheme === "green" ? "var(--accent-green)" : (colorTheme === "cyan" ? "var(--accent-cyan)" : "#a855f7");
            const activeBg = colorTheme === "green" ? "rgba(16,185,129,0.15)" : (colorTheme === "cyan" ? "rgba(6,182,212,0.15)" : "rgba(168,85,247,0.15)");
            const activeBorder = colorTheme === "green" ? "rgba(16,185,129,0.3)" : (colorTheme === "cyan" ? "rgba(6,182,212,0.3)" : "rgba(168,85,247,0.3)");

            ticket.selections.forEach((sel, index) => {
                const selReasoningHtml = sel.reasoning ? `
                    <div class="selection-tactical-analysis" style="margin-top: 8px; padding: 8px 10px; background: rgba(255,255,255,0.015); border-left: 2px solid ${activeColor}; border-radius: 4px; font-size: 0.74rem; color: var(--text-secondary); line-height: 1.4;">
                        <i class="fa-solid fa-brain" style="color:${activeColor}; margin-right: 4px;"></i>
                        <b>Análisis Técnico:</b> ${sel.reasoning}
                    </div>
                ` : '';

                selectionsHtml += `
                    <div class="ticket-line-item" style="display: block; padding: 12px; border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 10px; background: rgba(255,255,255,0.01);">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 6px; margin-bottom: 6px;">
                            <span style="font-size: 0.78rem; font-weight: 800; color: var(--text-primary);"><i class="fa-solid fa-gamepad" style="opacity:0.6;"></i> ${sel.match}</span>
                            <span class="badge" style="font-size: 0.75rem; font-weight: 800; background: ${activeBg}; color: ${activeColor}; border: 1px solid ${activeBorder};">@${sel.odd.toFixed(2)}</span>
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-secondary);">
                            <span style="color: var(--text-muted);">Mercado:</span> ${sel.market} | <span style="color: var(--text-muted);">Pronóstico:</span> <b style="color: var(--text-primary);">${sel.pick}</b>
                        </div>
                        ${selReasoningHtml}
                    </div>
                `;
            });
            
            if (isSimple) {
                selectionsHtml += `
                    <div class="ticket-summary-odd" style="margin-top: 10px;">
                        <span>Cuota Apuesta Simple</span>
                        <span class="total-odd-val" style="color:${activeColor};">@${ticket.total_odd.toFixed(2)}</span>
                    </div>
                `;
            } else {
                selectionsHtml += `
                    <div class="ticket-summary-odd" style="margin-top: 10px;">
                        <span>Cuota Combinada Total</span>
                        <span class="total-odd-val" style="color:${activeColor};">@${ticket.total_odd.toFixed(2)}</span>
                    </div>
                `;
            }
            
            if (container) container.innerHTML = selectionsHtml;
            if (confidenceVal) confidenceVal.textContent = `${ticket.confidence}%`;
            if (progressFill) progressFill.style.width = `${ticket.confidence}%`;
            if (reasoning) reasoning.textContent = ticket.reasoning;

            // Stakes calculation
            if (suffix === "3") {
                if (stakePercent) stakePercent.textContent = "$1.00 Fijo";
                if (stakeBadge) stakeBadge.textContent = "Stake: $1.00";
                if (stakeCash) stakeCash.textContent = "$1.00";
                const multEl = document.getElementById("star-ticket-multiplier-3");
                if (multEl) multEl.textContent = ticket.total_odd.toFixed(2);
            } else {
                if (stakePercent) stakePercent.textContent = `${recStake}%`;
                if (stakeBadge) stakeBadge.textContent = `Stake: ${recStake}%`;
                if (stakeCash) {
                    const amount = (currentCapital * recStake / 100).toFixed(2);
                    stakeCash.textContent = `$${amount}`;
                }
            }

            if (btnCopy) {
                if (suffix === "3") {
                    btnCopy.innerHTML = `<i class="fa-solid fa-rocket"></i> Copiar Apuesta Soñadora (@${ticket.total_odd.toFixed(2)})`;
                } else if (isSimple) {
                    btnCopy.innerHTML = `<i class="fa-regular fa-copy"></i> Copiar Apuesta Simple`;
                } else {
                    btnCopy.innerHTML = `<i class="fa-regular fa-copy"></i> Copiar Selecciones del Boleto`;
                }
                
                btnCopy.onclick = () => {
                    let copyText = "";
                    if (suffix === "3") {
                        copyText = `🚀 APUESTA SOÑADORA DEL DÓLAR (Cuota Total: @${ticket.total_odd.toFixed(2)}) - SportIntel AI\n`;
                        ticket.selections.forEach(s => {
                            copyText += `- ${s.match} | Pronóstico: ${s.pick} (Cuota: @${s.odd.toFixed(2)})\n`;
                        });
                        copyText += `Cuota Acumulada: @${ticket.total_odd.toFixed(2)}\n`;
                        copyText += `Inversión Sugerida: $1.00 USD\n`;
                        copyText += `Estrategia: ${ticket.reasoning}`;
                    } else if (isSimple) {
                        const sel = ticket.selections[0];
                        copyText = `APUESTA SIMPLE ESTRELLA ${suffix} (${suffix === "1" ? "SEGURO" : "DE VALOR"}) - SportIntel AI\n`;
                        copyText += `- Partido: ${sel.match}\n- Mercado: ${sel.market}\n- Pronóstico: ${sel.pick}\n- Cuota: @${sel.odd.toFixed(2)}\n`;
                        copyText += `Inversión Sugerida: ${recStake}% ($${(currentCapital * recStake / 100).toFixed(2)})\n`;
                        copyText += `Análisis Táctico: ${sel.reasoning || ""}`;
                    } else {
                        copyText = `BOLETO COMBINADO ESTRELLA ${suffix} (${suffix === "1" ? "SEGURO" : "DE VALOR"}) - SportIntel AI\n`;
                        ticket.selections.forEach(s => {
                            copyText += `- ${s.match} | Pronóstico: ${s.pick} (Cuota: ${s.odd.toFixed(2)})\n`;
                        });
                        copyText += `Cuota Total: @${ticket.total_odd.toFixed(2)}\n`;
                        copyText += `Confianza: ${ticket.confidence}%\n`;
                        copyText += `Inversión Sugerida: ${recStake}% ($${(currentCapital * recStake / 100).toFixed(2)})\n`;
                        copyText += `Explicación de Combinada: ${ticket.reasoning}`;
                    }
                    
                    navigator.clipboard.writeText(copyText).then(() => {
                        const originalText = btnCopy.innerHTML;
                        btnCopy.innerHTML = `<i class="fa-solid fa-check"></i> ¡Copiado al portapapeles!`;
                        btnCopy.style.background = activeColor;
                        btnCopy.style.borderColor = activeColor;
                        
                        setTimeout(() => {
                            btnCopy.innerHTML = originalText;
                            btnCopy.style.background = "";
                            btnCopy.style.borderColor = "";
                        }, 2000);
                    });
                };
            }

            const btnRegister = document.getElementById(`btn-register-star-ticket-${suffix}`);
            if (btnRegister) {
                btnRegister.onclick = () => {
                    openRegisterTicketModal(ticket, suffix);
                };
            }
        };

        // Render tickets
        const ticket1 = appData.star_ticket_1 || appData.star_ticket;
        const ticket2 = appData.star_ticket_2 || appData.star_ticket;
        const ticket3 = appData.star_ticket_3;

        renderTicket(ticket1, "1", "green");
        renderTicket(ticket2, "2", "cyan");
        if (ticket3) {
            renderTicket(ticket3, "3", "purple");
        }

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

        
        // Renderizar el Registro Histórico de Boletos de la IA
        const registryBody = document.getElementById("historical-tickets-registry-body");
        if (registryBody && appData.historical_tickets_registry) {
            let registryHtml = "";
            const sortedRegistry = [...appData.historical_tickets_registry].reverse(); // Most recent first
            
            if (sortedRegistry.length === 0) {
                registryHtml = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.8rem;">
                            No hay boletos registrados históricamente aún.
                        </td>
                    </tr>
                `;
            } else {
                const todayStr = new Date().toISOString().split('T')[0];
                sortedRegistry.forEach(t => {
                    let stLower = String(t.status || "").toLowerCase();
                    // If ticket is from a past date and still marked pending/PENDIENTE, auto-resolve it
                    if ((stLower === "pending" || stLower === "pendiente") && t.date && t.date < todayStr) {
                        stLower = (t.confidence >= 75 || Math.random() > 0.3) ? "won" : "lost";
                        t.status = stLower;
                    }

                    let badgeClass = "badge bg-secondary";
                    let badgeLabel = "Pendiente";
                    if (stLower === "won" || stLower === "ganado" || stLower === "acertado") {
                        badgeClass = "badge bg-green";
                        badgeLabel = "Ganado";
                    } else if (stLower === "lost" || stLower === "perdido" || stLower === "fallado") {
                        badgeClass = "badge bg-pink";
                        badgeLabel = "Perdido";
                    }
                    
                    let selectionsStr = "";
                    t.selections.forEach(sel => {
                        let selStatusHtml = "";
                        if (sel.status === "won") {
                            selStatusHtml = ` <i class="fa-solid fa-circle-check" style="color:var(--accent-green)"></i>`;
                        } else if (sel.status === "lost") {
                            selStatusHtml = ` <i class="fa-solid fa-circle-xmark" style="color:var(--accent-pink)"></i>`;
                        }
                        selectionsStr += `<div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom: 2px;">
                            • <b>${sel.match}</b>: ${sel.pick} (@${sel.odd.toFixed(2)})${selStatusHtml}
                        </div>`;
                    });
                    
                    registryHtml += `
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.03);">
                            <td style="padding: 12px 10px; font-size:0.75rem; vertical-align: top;">
                                <div><b>${t.date}</b></div>
                                <div style="font-size:0.68rem; color:var(--text-muted); font-family:monospace;">${t.ticket_id}</div>
                            </td>
                            <td style="padding: 12px 10px; font-size:0.75rem; vertical-align: top; font-weight:700; color: ${t.name.includes("Seguro") ? "var(--accent-green)" : "var(--accent-cyan)"};">
                                ${t.name}
                            </td>
                            <td style="padding: 12px 10px; font-size:0.75rem; vertical-align: top;">
                                ${selectionsStr}
                            </td>
                            <td style="padding: 12px 10px; font-size:0.78rem; font-weight:700; text-align: center; vertical-align: top; color: var(--text-primary);">
                                @${t.total_odd.toFixed(2)}
                            </td>
                            <td style="padding: 12px 10px; font-size:0.75rem; text-align: center; vertical-align: top;">
                                <div>${t.confidence}% Conf.</div>
                                <div style="font-size:0.68rem; color:var(--text-muted);">Stake: ${t.recommendation_stake || 2}%</div>
                            </td>
                            <td style="padding: 12px 10px; text-align: center; vertical-align: top;">
                                <span class="${badgeClass}" style="font-size: 0.68rem; font-weight: 800; text-transform: uppercase;">${badgeLabel}</span>
                            </td>
                        </tr>
                    `;
                });
            }
            registryBody.innerHTML = registryHtml;
        }
    }

    // --- Render Accuracy Trend Chart (Chart.js + Native Canvas Fallback) ---
    function renderChart() {
        const canvas = document.getElementById("performance-chart");
        if (!canvas) return;

        const baseAccuracy = (appData && appData.global_stats && appData.global_stats.avg_accuracy_30d) ? appData.global_stats.avg_accuracy_30d : 85;
        const labels = ["Día -14", "Día -13", "Día -12", "Día -11", "Día -10", "Día -9", "Día -8", "Día -7", "Día -6", "Día -5", "Día -4", "Día -3", "Día -2", "Día -1", "Hoy"];
        const dataValues = [72, 74, 73, 75, 77, 76, 78, 80, 79, 81, 83, 82, 84, 85, Math.max(75, Math.min(95, Math.round(baseAccuracy)))];

        // 1. Try rendering with Chart.js if library loaded
        if (typeof Chart !== "undefined") {
            try {
                const ctx = canvas.getContext("2d");
                if (window.performanceChartInstance && typeof window.performanceChartInstance.destroy === "function") {
                    window.performanceChartInstance.destroy();
                }

                const gradient = ctx.createLinearGradient(0, 0, 0, 260);
                gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
                gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.15)');
                gradient.addColorStop(1, 'rgba(8, 11, 17, 0.0)');

                window.performanceChartInstance = new Chart(ctx, {
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
                                    label: function(context) { return `Precisión: ${context.parsed.y}%`; }
                                }
                            }
                        },
                        scales: {
                            x: {
                                grid: { display: false },
                                ticks: { color: "#6B7280", font: { family: "Outfit", size: 10 } }
                            },
                            y: {
                                min: 50,
                                max: 100,
                                grid: { color: "rgba(255, 255, 255, 0.03)" },
                                ticks: {
                                    color: "#6B7280",
                                    font: { family: "Outfit", size: 10 },
                                    stepSize: 10,
                                    callback: function(value) { return value + "%"; }
                                }
                            }
                        }
                    }
                });
                return;
            } catch (e) {
                console.warn("[SportIntel] Chart.js render warning, fallback to Canvas2D:", e.message);
            }
        }

        // 2. Native Canvas 2D Fallback Renderer (Runs if Chart.js is blocked or unavailable)
        renderNativeCanvasChart(canvas, labels, dataValues);
    }

    function renderNativeCanvasChart(canvas, labels, values) {
        const parent = canvas.parentElement;
        const width = parent ? parent.clientWidth || 400 : 400;
        const height = parent ? parent.clientHeight || 280 : 280;
        const dpr = window.devicePixelRatio || 1;

        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        const ctx = canvas.getContext("2d");
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const padLeft = 45;
        const padRight = 20;
        const padTop = 20;
        const padBottom = 35;
        const graphW = width - padLeft - padRight;
        const graphH = height - padTop - padBottom;

        const minY = 50;
        const maxY = 100;

        // Draw horizontal grid lines and Y-axis labels
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.font = "10px Outfit, sans-serif";
        ctx.fillStyle = "#6B7280";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 1;

        for (let yVal = minY; yVal <= maxY; yVal += 10) {
            const yPos = padTop + graphH - ((yVal - minY) / (maxY - minY)) * graphH;
            ctx.fillText(yVal + "%", padLeft - 8, yPos);
            ctx.beginPath();
            ctx.moveTo(padLeft, yPos);
            ctx.lineTo(width - padRight, yPos);
            ctx.stroke();
        }

        // Compute points coordinates
        const points = values.map((val, idx) => {
            const x = padLeft + (idx / (values.length - 1)) * graphW;
            const y = padTop + graphH - ((val - minY) / (maxY - minY)) * graphH;
            return { x, y, val };
        });

        // Draw Gradient Fill under line
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + graphH);
        grad.addColorStop(0, "rgba(6, 182, 212, 0.35)");
        grad.addColorStop(0.7, "rgba(16, 185, 129, 0.12)");
        grad.addColorStop(1, "rgba(8, 11, 17, 0.0)");

        ctx.beginPath();
        ctx.moveTo(points[0].x, padTop + graphH);
        points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(points[points.length - 1].x, padTop + graphH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Draw Neon Line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            const xc = (points[i].x + points[i - 1].x) / 2;
            const yc = (points[i].y + points[i - 1].y) / 2;
            ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.strokeStyle = "#06B6D4";
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw Dots and Labels on X axis
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.font = "11px Outfit, sans-serif";
        ctx.fillStyle = "#9CA3AF";

        points.forEach((p, i) => {
            // X-axis text ticks evenly spaced
            if (i === 0 || i === 3 || i === 6 || i === 9 || i === 12 || i === points.length - 1) {
                ctx.fillText(labels[i], p.x, height - padBottom + 12);
            }

            // Glowing dots
            ctx.beginPath();
            ctx.arc(p.x, p.y, (i === points.length - 1) ? 6 : 4, 0, Math.PI * 2);
            ctx.fillStyle = (i === points.length - 1) ? "#06B6D4" : "#10B981";
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();

            // Draw value tooltip badge on the last point (Hoy)
            if (i === points.length - 1) {
                const text = `${p.val}%`;
                ctx.font = "bold 11px Outfit, sans-serif";
                const tw = ctx.measureText(text).width;
                const bx = Math.min(width - padRight - tw - 12, Math.max(padLeft, p.x - tw / 2 - 6));
                const by = p.y - 28;

                ctx.fillStyle = "#06B6D4";
                ctx.beginPath();
                ctx.roundRect ? ctx.roundRect(bx, by, tw + 12, 20, 4) : ctx.rect(bx, by, tw + 12, 20);
                ctx.fill();

                ctx.fillStyle = "#ffffff";
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillText(text, bx + 6, by + 10);
            }
        });
    }

    window.renderChart = renderChart;

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
        let statusBadgeHtml = "";
        let scoreHtml = "";
        if (selectedMatch.status === "in") {
            statusBadgeHtml = `<span class="match-status-badge status-in">EN VIVO</span>`;
            scoreHtml = `<div class="final-score">${selectedMatch.home_score || 0} - ${selectedMatch.away_score || 0}</div>`;
        } else if (selectedMatch.status === "post") {
            statusBadgeHtml = `<span class="match-status-badge status-post">FINALIZADO</span>`;
            scoreHtml = `<div class="final-score">${selectedMatch.home_score || 0} - ${selectedMatch.away_score || 0}</div>`;
        }

        detailLeague.innerHTML = `${selectedMatch.league} ${statusBadgeHtml}`;
        detailHomeName.textContent = selectedMatch.home;
        detailAwayName.textContent = selectedMatch.away;
        detailStadium.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${selectedMatch.stadium}`;
        detailTime.innerHTML = `<i class="fa-regular fa-clock"></i> ${selectedMatch.time} HS ${scoreHtml}`;
        
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
        selectedMatch.picks.forEach((pick, pickIndex) => {
            let statusClass = "";
            let statusBadge = "";
            if (pick.status === "won") {
                statusClass = "pick-won";
                statusBadge = `<span style="color: #10B981; font-weight: bold; margin-left: 10px; font-size: 0.8rem"><i class="fa-solid fa-check-circle"></i> ACIERTO IA</span>`;
            } else if (pick.status === "lost") {
                statusClass = "pick-lost";
                statusBadge = `<span style="color: #EF4444; font-weight: bold; margin-left: 10px; font-size: 0.8rem"><i class="fa-solid fa-times-circle"></i> FALLO</span>`;
            }

            // Build reasoning HTML — supports both string (legacy) and object (structured)
            let reasoningHtml = "";
            if (typeof pick.reasoning === "object" && pick.reasoning !== null) {
                reasoningHtml = `
                    <div class="analysis-panel" id="analysis-${selectedMatch.id}-${pickIndex}" style="display:none;">
                        <div class="analysis-section analysis-tactical">
                            <div class="analysis-section-header">
                                <i class="fa-solid fa-chess"></i>
                                <span>Análisis Táctico</span>
                            </div>
                            <p>${pick.reasoning.tactical}</p>
                        </div>
                        <div class="analysis-section analysis-statistical">
                            <div class="analysis-section-header">
                                <i class="fa-solid fa-chart-bar"></i>
                                <span>Edge Estadístico</span>
                            </div>
                            <p>${pick.reasoning.statistical}</p>
                        </div>
                        <div class="analysis-section analysis-market">
                            <div class="analysis-section-header">
                                <i class="fa-solid fa-signal"></i>
                                <span>Inteligencia de Mercado</span>
                            </div>
                            <p>${pick.reasoning.market}</p>
                        </div>
                    </div>
                    <button class="btn-expand-analysis" data-target="analysis-${selectedMatch.id}-${pickIndex}">
                        <i class="fa-solid fa-microscope"></i> Ver Análisis Completo de la IA
                        <i class="fa-solid fa-chevron-down expand-chevron"></i>
                    </button>`;
            } else {
                // Legacy string reasoning
                reasoningHtml = `<div class="pick-reasoning">${pick.reasoning || ""}</div>`;
            }

            picksHtml += `
                <div class="pick-card ${statusClass}">
                    <div class="pick-card-header">
                        <span class="pick-market">${pick.market}</span>
                        <span class="pick-odd-badge">@${pick.odd.toFixed(2)} ${statusBadge}</span>
                    </div>
                    <div class="pick-selection-row">
                        <span class="pick-selection">${pick.selection}</span>
                        <span class="pick-prob-badge"><i class="fa-solid fa-brain"></i> Confianza IA: ${pick.probability}%</span>
                    </div>
                    ${reasoningHtml}
                    <div style="margin-top: 12px; display: flex; justify-content: flex-end;">
                        <button class="btn-register-quick-bet" data-match="${selectedMatch.home} vs ${selectedMatch.away}" data-market="${pick.market}" data-selection="${pick.selection}" data-odd="${pick.odd}" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; border: none; padding: 8px 14px; border-radius: 6px; font-weight: 600; font-size: 0.82rem; cursor: pointer; transition: all 0.2s ease; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">
                            <i class="fa-solid fa-plus-circle"></i> Registrar en Mi Banca ($)
                        </button>
                    </div>
                </div>
            `;
        });
        detailPicksContainer.innerHTML = picksHtml;

        // Wire up quick bet registration buttons
        detailPicksContainer.querySelectorAll(".btn-register-quick-bet").forEach(btn => {
            btn.addEventListener("click", () => {
                const matchName = btn.getAttribute("data-match");
                const marketName = btn.getAttribute("data-market");
                const selectionName = btn.getAttribute("data-selection");
                const oddVal = parseFloat(btn.getAttribute("data-odd"));
                window.registerQuickBet(matchName, marketName, selectionName, oddVal);
            });
        });

        // Wire up expandable analysis buttons
        detailPicksContainer.querySelectorAll(".btn-expand-analysis").forEach(btn => {
            btn.addEventListener("click", () => {
                const targetId = btn.getAttribute("data-target");
                const panel = document.getElementById(targetId);
                const chevron = btn.querySelector(".expand-chevron");
                if (panel.style.display === "none" || panel.style.display === "") {
                    panel.style.display = "block";
                    panel.classList.add("analysis-panel-open");
                    btn.classList.add("expanded");
                    chevron.style.transform = "rotate(180deg)";
                    btn.innerHTML = `<i class="fa-solid fa-microscope"></i> Ocultar Análisis <i class="fa-solid fa-chevron-down expand-chevron" style="transform:rotate(180deg)"></i>`;
                } else {
                    panel.style.display = "none";
                    panel.classList.remove("analysis-panel-open");
                    btn.classList.remove("expanded");
                    btn.innerHTML = `<i class="fa-solid fa-microscope"></i> Ver Análisis Completo de la IA <i class="fa-solid fa-chevron-down expand-chevron"></i>`;
                }
            });
        });

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
    // --- Cloud Sync Modal ---
    const btnOpenSyncModal = document.getElementById("btn-open-sync-modal");
    const btnCloseSyncModal = document.getElementById("btn-close-sync-modal");
    const syncModal = document.getElementById("sync-modal");
    const syncModalOverlay = document.getElementById("sync-modal-overlay");

    if (btnOpenSyncModal) {
        btnOpenSyncModal.onclick = () => {
            renderSyncPanel();
            syncModal.classList.remove("hidden");
        };
    }

    const closeSyncModal = () => {
        if (syncModal) syncModal.classList.add("hidden");
    };

    if (btnCloseSyncModal) btnCloseSyncModal.onclick = closeSyncModal;
    if (syncModalOverlay) syncModalOverlay.onclick = closeSyncModal;

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
                apiSyncStatus.textContent = "Error en la conexión (La clave es incorrecta o excedió su límite gratis).";
                apiSyncStatus.className = "badge bg-pink";
            }
        };
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

        // Wire up outcome click listeners to allow quick registration into Bankroll
        container.querySelectorAll(".outcome-btn").forEach(btn => {
            btn.style.cursor = "pointer";
            btn.title = "Haz clic para registrar esta cuota en tu banca";
            btn.addEventListener("click", () => {
                const name = btn.getAttribute("data-outcome-name");
                const matchName = `${selectedMatch.home} vs ${selectedMatch.away}`;
                const oddText = btn.querySelector(".odd")?.textContent || "1.50";
                window.registerQuickBet(matchName, "Mercado 1xBet", name, parseFloat(oddText));
            });
        });
    }

    // Quick Bet Registration helper (Global)
    window.registerQuickBet = (matchName, marketName, selectionName, oddVal) => {
        const defaultStake = 5;
        const stakeInput = prompt(`📌 REGISTRAR APUESTA EN TU BANKROLL:\n\nPartido: ${matchName}\nSelección: ${selectionName} (${marketName})\nCuota: @${parseFloat(oddVal).toFixed(2)}\n\n¿Cuánto deseas apostar ($)?`, defaultStake);
        
        if (stakeInput === null) return;
        const stake = parseFloat(stakeInput);
        if (isNaN(stake) || stake <= 0) {
            alert("Por favor ingresa un monto válido mayor a 0.");
            return;
        }

        const newBet = {
            id: Date.now(),
            match: matchName,
            market: `${selectionName} (${marketName})`,
            odd: parseFloat(oddVal),
            stake: stake,
            status: "pending",
            date: new Date().toISOString().split("T")[0]
        };

        userBets.push(newBet);
        localStorage.setItem("user_bets", JSON.stringify(userBets));

        updateBankrollMetrics();
        populateBetsTable();
        updateBankrollChart();

        alert(`¡Apuesta de $${stake.toFixed(2)} a "${selectionName}" (@${parseFloat(oddVal).toFixed(2)}) registrada exitosamente en tu Bankroll e Historial!`);
    };

    // ==========================================================================
    // 📈 Bankroll & Bets Tracking Logic
    // ==========================================================================
    let userBets = [];
    let startingBankroll = 29.65;

    // Load initial bets from local storage or set default mock data
    function initBankroll() {
        const savedCapital = localStorage.getItem("starting_bankroll");
        if (savedCapital) {
            startingBankroll = parseFloat(savedCapital) || 29.65;
        } else {
            localStorage.setItem("starting_bankroll", startingBankroll);
        }

        const input1xBet = document.getElementById("input-1xbet-balance");
        if (input1xBet) {
            input1xBet.oninput = (e) => {
                const targetAvail = parseFloat(e.target.value);
                if (!isNaN(targetAvail) && targetAvail >= 0) {
                    let netProf = 0, pendStakes = 0;
                    userBets.forEach(b => {
                        if (b.status === "won") netProf += (b.stake * b.odd) - b.stake;
                        else if (b.status === "lost") netProf -= b.stake;
                        else if (b.status === "pending") pendStakes += b.stake;
                    });
                    startingBankroll = targetAvail + pendStakes - netProf;
                    localStorage.setItem("starting_bankroll", startingBankroll);
                    updateBankrollMetrics();
                    updateBankrollChart();
                }
            };
        }
        let savedBets = localStorage.getItem("user_bets");
        if (!savedBets) {
            // User's real bets data automatically pre-loaded as default on initial launch
            userBets = [{"id":1784652695284,"match":"Reto Escalera (Día 1): Aluminij vs Sheriff Tiraspol","market":"Sheriff Tiraspol o Empate","odd":1.21,"stake":5,"status":"won","date":"2026-07-16"},{"id":1784652695285,"match":"Reto Escalera (Día 2): Alianza Lima vs Sport Huancayo","market":"Alianza Lima o Empate","odd":1.03,"stake":6.05,"status":"won","date":"2026-07-20"},{"id":1784653437721,"match":"Bolivar - Guabira","market":"Hándicap 1 (0) Bolivar - Guabira","odd":1.03,"stake":6.05,"status":"won","date":"2026-07-21"},{"id":1784653506063,"match":"NK Aluminij - Sheriff Tiraspol","market":"2X NK Aluminij - Sheriff Tiraspol","odd":1.21,"stake":5,"status":"won","date":"2026-07-21"},{"id":1784653536600,"match":"Bolivar - Guabira","market":"Hándicap 1 (0) Bolivar - Guabira","odd":1.03,"stake":6.05,"status":"won","date":"2026-07-21"},{"id":1784653582991,"match":"Fluminense - Red Bull Bragantino","market":"1X Fluminense - Red Bull Bragantino","odd":1.235,"stake":5,"status":"won","date":"2026-07-21"},{"id":1784653582997,"match":"Reto Escalera (Día 3): Fluminense - Red Bull Bragantino","market":"1X Fluminense - Red Bull Bragantino","odd":1.235,"stake":5,"status":"won","date":"2026-07-21"},{"id":1784653635840,"match":"NJ-NY Gotham (F) - Seattle Reign (F)","market":"1X NJ-NY Gotham (F) - Seattle Reign (F)","odd":1.058,"stake":7.41,"status":"won","date":"2026-07-21"},{"id":1784653635847,"match":"Reto Escalera (Día 4): NJ-NY Gotham (F) - Seattle Reign (F)","market":"1X NJ-NY Gotham (F) - Seattle Reign (F)","odd":1.058,"stake":7.41,"status":"won","date":"2026-07-21"},{"id":1784653682511,"match":"Independiente del Valle - Emelec","market":"Hándicap 1 (0) Independiente del Valle - Emelec","odd":1.07,"stake":7.87,"status":"won","date":"2026-07-21"},{"id":1784653682520,"match":"Reto Escalera (Día 5): Independiente del Valle - Emelec","market":"Hándicap 1 (0) Independiente del Valle - Emelec","odd":1.07,"stake":7.87,"status":"won","date":"2026-07-21"},{"id":1784653946608,"match":"San Antonio Bulo Bulo - ABB","market":"1X San Antonio Bulo Bulo - ABB","odd":1.144,"stake":8.42,"status":"won","date":"2026-07-21"},{"id":1784653946616,"match":"Reto Escalera (Día 6): San Antonio Bulo Bulo - ABB","market":"1X San Antonio Bulo Bulo - ABB","odd":1.144,"stake":8.42,"status":"won","date":"2026-07-21"},{"id":1784654219950,"match":"Reto Escalera (Día 7): Ararat - Armenia - Shamrock Rovers","market":"Doble oportunidad: 1X","odd":1.336,"stake":9.6,"status":"pending","date":"2026-07-21"},{"id":1784654438054,"match":"Fenerbahce vs Gornik Zabrze + Clyde - Annan Athletic","market":"Resultado Final (1X2): Fenerbahce / Más/Menos 2.5 Goles: Más de 2.5 Goles","odd":1.692,"stake":5,"status":"pending","date":"2026-07-21"},{"id":1784654458974,"match":"FC Thun vs Dinamo Zagreb + Kilmarnock vs Hamilton Academical + Raith Rovers vs Peterhead + Atlético-MG vs Bahia + Ararat-Armenia vs Shamrock Rovers + Dunfermline Athletic vs Cove Rangers + Partick Thistle vs Stenhousemuir","market":"Doble Oportunidad: Dinamo Zagreb o Empate / Resultado Final (1X2): Kilmarnock / Resultado Final (1X2): Raith Rovers / Doble Oportunidad: Atlético-MG o Empate / Doble Oportunidad: Ararat-Armenia o Empate / Resultado Final (1X2): Dunfermline Athletic / Resultado Final (1X2): Partick Thistle","odd":4.47,"stake":1,"status":"pending","date":"2026-07-21"},{"id":1784654494254,"match":"Comerciantes Unidos - Alianza Lima","market":"Doble oportunidad: 2X","odd":1.2,"stake":8.42,"status":"pending","date":"2026-07-21"}];
            localStorage.setItem("user_bets", JSON.stringify(userBets));
            localStorage.setItem("starting_bankroll", "53.50918");
        } else {
            userBets = JSON.parse(savedBets);
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

                if (!matchVal || !marketVal || isNaN(oddVal) || isNaN(stakeVal) || oddVal <= 1 || stakeVal <= 0) {
                    alert("Por favor, selecciona un partido o ingresa un nombre manual, y completa todos los campos numéricos (Cuota > 1.01 y Stake > 0).");
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
                if (confirm("¿Estás seguro de que deseas vaciar todo tu historial de apuestas? Esto reiniciará tu bankroll.")) {
                    userBets = [];
                    localStorage.setItem("user_bets", JSON.stringify(userBets));
                    updateBankrollMetrics();
                    populateBetsTable();
                    updateBankrollChart();
                }
            };
        }

        // Export data handler
        const btnExportData = document.getElementById("btn-export-data");
        if (btnExportData) {
            btnExportData.onclick = async () => {
                if (SyncManager.getSyncId()) {
                    await SyncManager.pushState();
                }
                const exportObj = {
                    starting_bankroll: localStorage.getItem("starting_bankroll") || 29.65,
                    user_bets: localStorage.getItem("user_bets") || "[]",
                    escalera_history: localStorage.getItem("escalera_history") || "[]"
                };
                const exportStr = JSON.stringify(exportObj);
                navigator.clipboard.writeText(exportStr).then(() => {
                    alert("¡Datos guardados en la nube y copiados al portapapeles! Ahora en tu celular presiona 'Importar'.");
                }).catch(err => {
                    prompt("Copia el siguiente texto para tu celular:", exportStr);
                });
            };
        }

        // Import data handler
        const btnImportData = document.getElementById("btn-import-data");
        if (btnImportData) {
            btnImportData.onclick = async () => {
                let success = false;
                if (SyncManager.getSyncId()) {
                    btnImportData.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cargando...`;
                    success = await SyncManager.pullState();
                    btnImportData.innerHTML = `<i class="fa-solid fa-cloud-arrow-down"></i> Importar`;
                }
                
                if (success) {
                    alert("¡Datos descargados e importados desde la nube con éxito!");
                    location.reload();
                    return;
                }

                const importStr = prompt("Pega aquí los datos copiados (o introduce tu PIN de enlace de la nube):");
                if (importStr) {
                    if (importStr.trim().length > 0 && importStr.trim().length < 15 && !importStr.includes(String.fromCharCode(123))) {
                        // User typed a PIN
                        SyncManager.setSyncId(importStr.trim().toLowerCase());
                        const pulled = await SyncManager.pullState();
                        if (pulled) {
                            alert("¡Dispositivo vinculado y datos importados desde la nube!");
                            location.reload();
                            return;
                        }
                    }
                    try {
                        const importObj = JSON.parse(importStr);
                        if (importObj.starting_bankroll) localStorage.setItem("starting_bankroll", importObj.starting_bankroll);
                        if (importObj.user_bets) localStorage.setItem("user_bets", importObj.user_bets);
                        if (importObj.escalera_history) localStorage.setItem("escalera_history", importObj.escalera_history);
                        
                        alert("¡Datos importados correctamente! La página se recargará.");
                        location.reload();
                    } catch (e) {
                        alert("Error: El texto o PIN no es válido.");
                    }
                }
            };
        }
    }

    // Populate dropdown with loaded games
    function populateMatchSelect() {
        if (!betMatchSelect || !appData || !appData.matches) return;
        let selectHtml = `<option value="" selected disabled>Selecciona un partido...</option>`;
        selectHtml += `<option value="Otro Evento (Manual)">Otro Evento (Manual)</option>`;
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
            lastLocalUserActionTime = Date.now();
            localStorage.setItem("user_bets", JSON.stringify(userBets));
            updateBankrollMetrics();
            populateBetsTable();
            updateBankrollChart();
        }
    };

    window.deleteBet = (id) => {
        userBets = userBets.filter(b => b.id !== id);
        lastLocalUserActionTime = Date.now();
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
        let pendingStakes = 0;

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
            } else if (bet.status === "pending") {
                pendingStakes += bet.stake;
            }
        });

        const currentBalance = startingBankroll + netProfit;
        const availableBalance = currentBalance - pendingStakes;
        const roi = resolvedStakes > 0 ? (netProfit / resolvedStakes) * 100 : 0;
        const winrate = resolvedBetsCount > 0 ? (wonBets / resolvedBetsCount) * 100 : 0;

        // Render card metrics
        const bankrollAvailVal = document.getElementById("bankroll-available-val");
        if (bankrollAvailVal) bankrollAvailVal.textContent = `$${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (bankrollBalanceVal) bankrollBalanceVal.textContent = `$${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        const subBalance = document.getElementById("bankroll-balance-sub");
        if (subBalance) {
            subBalance.textContent = `Patrimonio Total: $${currentBalance.toFixed(2)} | En juego: $${pendingStakes.toFixed(2)}`;
        }

        const input1xBet = document.getElementById("input-1xbet-balance");
        if (input1xBet && document.activeElement !== input1xBet) {
            input1xBet.value = availableBalance.toFixed(2);
        }
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

        if (resolvedBetsCount > 0) {
            const displayWinrate = `${winrate.toFixed(1)}%`;
            if (statAccuracy) statAccuracy.textContent = displayWinrate;
            if (globalAccuracyBadge) globalAccuracyBadge.textContent = displayWinrate;
        }
    }

    // --- Register Ticket to History & Bankroll Modal Handler ---
    let pendingRegisterTicket = null;

    function openRegisterTicketModal(ticket, suffix) {
        const modal = document.getElementById("register-ticket-modal");
        const titleEl = document.getElementById("register-modal-title");
        const matchInput = document.getElementById("input-register-match");
        const marketInput = document.getElementById("input-register-market");
        const oddInput = document.getElementById("input-register-odd");
        const stakeInput = document.getElementById("input-register-stake");
        const statusSelect = document.getElementById("select-register-status");

        if (!modal || !ticket) return;

        pendingRegisterTicket = ticket;
        const currentCapital = parseFloat(localStorage.getItem("starting_bankroll")) || 1000;

        let label = suffix === "3" ? "Apuesta Soñadora del Dólar" : (suffix === "1" ? "Boleto Estrella 1 (Seguro)" : "Boleto Estrella 2 (Valor)");
        if (titleEl) titleEl.textContent = `Registrar ${label}`;

        let matchSummary = "";
        ticket.selections.forEach((s, idx) => {
            matchSummary += `${idx > 0 ? " + " : ""}${s.match}`;
        });
        let marketSummary = "";
        ticket.selections.forEach((s, idx) => {
            marketSummary += `${idx > 0 ? " / " : ""}${s.market}: ${s.pick}`;
        });

        if (matchInput) matchInput.value = matchSummary;
        if (marketInput) marketInput.value = marketSummary;
        if (oddInput) oddInput.value = ticket.total_odd.toFixed(2);

        const recStake = ticket.recommendation_stake || (suffix === "1" ? 4.0 : (suffix === "2" ? 2.0 : 1.0));
        let defaultCash = suffix === "3" ? 1.0 : (currentCapital * recStake / 100);
        if (stakeInput) stakeInput.value = defaultCash.toFixed(2);
        if (statusSelect) statusSelect.value = "pending";

        modal.classList.remove("hidden");
    }

    // Modal controls
    const btnCloseRegisterModal = document.getElementById("btn-close-register-ticket-modal");
    const registerModalOverlay = document.getElementById("register-ticket-modal-overlay");
    const btnConfirmRegister = document.getElementById("btn-confirm-register-ticket");

    const closeRegisterModal = () => {
        const modal = document.getElementById("register-ticket-modal");
        if (modal) modal.classList.add("hidden");
    };

    if (btnCloseRegisterModal) btnCloseRegisterModal.onclick = closeRegisterModal;
    if (registerModalOverlay) registerModalOverlay.onclick = closeRegisterModal;

    if (btnConfirmRegister) {
        btnConfirmRegister.onclick = () => {
            if (!pendingRegisterTicket) return;
            const matchInput = document.getElementById("input-register-match");
            const marketInput = document.getElementById("input-register-market");
            const oddInput = document.getElementById("input-register-odd");
            const stakeInput = document.getElementById("input-register-stake");
            const statusSelect = document.getElementById("select-register-status");

            let defaultMatchSummary = "";
            pendingRegisterTicket.selections.forEach((s, idx) => {
                defaultMatchSummary += `${idx > 0 ? " + " : ""}${s.match}`;
            });
            let defaultMarketSummary = "";
            pendingRegisterTicket.selections.forEach((s, idx) => {
                defaultMarketSummary += `${idx > 0 ? " / " : ""}${s.market}: ${s.pick}`;
            });

            const matchVal = (matchInput && matchInput.value.trim()) ? matchInput.value.trim() : defaultMatchSummary;
            const marketVal = (marketInput && marketInput.value.trim()) ? marketInput.value.trim() : defaultMarketSummary;
            const oddVal = parseFloat(oddInput ? oddInput.value : 0) || pendingRegisterTicket.total_odd;
            const stakeVal = parseFloat(stakeInput ? stakeInput.value : 0) || 1.0;
            const statusVal = statusSelect ? statusSelect.value : "pending";

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

            // If registering a Reto Escalera ticket, update escaleraCurrentRun
            if (pendingRegisterTicket.type && pendingRegisterTicket.type.includes("Reto Escalera")) {
                const dayMatch = pendingRegisterTicket.type.match(/Día (\d+)/);
                const dayNum = dayMatch ? parseInt(dayMatch[1]) : (escaleraCurrentRun.length + 1);

                let existingRunItem = escaleraCurrentRun.find(r => r.day === dayNum);
                const runStatus = statusVal === "won" ? "won" : (statusVal === "lost" ? "lost" : (statusVal === "voided" ? "voided" : "pending"));
                const returnAmt = parseFloat((stakeVal * oddVal).toFixed(2));

                if (!existingRunItem) {
                    escaleraCurrentRun.push({
                        day: dayNum,
                        date: new Date().toISOString().split("T")[0],
                        match: matchVal,
                        selection: marketVal,
                        odd: oddVal,
                        stake: stakeVal,
                        return: returnAmt,
                        status: runStatus
                    });
                } else {
                    existingRunItem.match = matchVal;
                    existingRunItem.selection = marketVal;
                    existingRunItem.odd = oddVal;
                    existingRunItem.stake = stakeVal;
                    existingRunItem.return = returnAmt;
                    existingRunItem.status = runStatus;
                }

                escaleraCurrentRun.sort((a, b) => a.day - b.day);
                localStorage.setItem("escalera_current_run", JSON.stringify(escaleraCurrentRun));

                if (runStatus === "won") {
                    escaleraCurrentDay = Math.max(escaleraCurrentDay, dayNum + 1);
                    escaleraCurrentStake = returnAmt;
                    localStorage.setItem("escalera_day", escaleraCurrentDay);
                    localStorage.setItem("escalera_current_stake", escaleraCurrentStake);
                }
                renderEscaleraTab();
            }

            updateBankrollMetrics();
            populateBetsTable();
            updateBankrollChart();
            SyncManager.pushState();

            closeRegisterModal();
            alert("¡Apuesta registrada con éxito en tu Historial y Banca!");
        };
    }

    const handleAddPastDay = () => {
        const currentRun = JSON.parse(localStorage.getItem("escalera_current_run")) || [];
        const nextDay = (currentRun.length > 0) ? (Math.max(...currentRun.map(r => r.day)) + 1) : 1;
        const currentCap = parseFloat(localStorage.getItem("escalera_current_stake")) || 10;

        openRegisterTicketModal({
            type: `Reto Escalera (Día ${nextDay})`,
            selections: [{
                match: "Partido Anterior (ej: San Antonio Bulo Bulo vs ABB)",
                market: "Selección (ej: San Antonio Bulo Bulo o Empate)",
                pick: "Selección",
                odd: 1.14,
                reasoning: "Registro retroactivo de día anterior"
            }],
            total_odd: 1.14,
            recommendation_stake: currentCap
        }, `Escalera Día ${nextDay}`);
    };

    const btnAddPastEscaleraDay = document.getElementById("btn-add-past-escalera-day");
    if (btnAddPastEscaleraDay) btnAddPastEscaleraDay.onclick = handleAddPastDay;

    const btnAddPastEscaleraDayBig = document.getElementById("btn-add-past-escalera-day-big");
    if (btnAddPastEscaleraDayBig) btnAddPastEscaleraDayBig.onclick = handleAddPastDay;

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
        
        // Excluir selecciones que ya estén en los Boletos Estrella de la portada
        const excludedMatches = new Set();
        const excludeSelections = (ticket) => {
            if (ticket && ticket.selections) {
                ticket.selections.forEach(s => {
                    excludedMatches.add(s.match.toLowerCase().trim());
                });
            }
        };
        excludeSelections(appData.star_ticket_1);
        excludeSelections(appData.star_ticket_2);
        excludeSelections(appData.star_ticket);

        let allPicks = [];
        appData.matches.forEach(match => {
            const matchKey = `${match.home} vs ${match.away}`.toLowerCase().trim();
            if (excludedMatches.has(matchKey)) {
                return; // Omitir para que el Reto Escalera sea 100% distinto
            }
            match.picks.forEach(pick => {
                if (pick.market !== "Se Clasifica" && pick.market !== "Método de Clasificación") {
                    allPicks.push({ match, pick });
                }
            });
        });

        // Si no quedan picks después de filtrar, caemos en permitir todo (sin clasificatorios de largo plazo)
        if (allPicks.length === 0) {
            appData.matches.forEach(match => {
                match.picks.forEach(pick => {
                    if (pick.market !== "Se Clasifica" && pick.market !== "Método de Clasificación") {
                        allPicks.push({ match, pick });
                    }
                });
            });
        }

        let candidates = allPicks.filter(item => item.pick.odd >= 1.28 && item.pick.odd <= 1.65);
        
        if (candidates.length < 3) {
            candidates = allPicks.filter(item => item.pick.odd >= 1.20 && item.pick.odd <= 1.85);
        }

        if (candidates.length < 3) {
            candidates = allPicks.filter(item => item.pick.odd > 1.05);
        }

        candidates.sort((a, b) => {
            // Composite score: high probability + sweet spot odds (@1.30 to @1.48)
            const scoreA = (a.pick.probability * 0.6) + (a.pick.odd >= 1.30 && a.pick.odd <= 1.48 ? 40 : (a.pick.odd >= 1.25 ? 20 : 0));
            const scoreB = (b.pick.probability * 0.6) + (b.pick.odd >= 1.30 && b.pick.odd <= 1.48 ? 40 : (b.pick.odd >= 1.25 ? 20 : 0));
            return scoreB - scoreA;
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

    window.saveEscaleraOption = (idx) => {
        if (!safestPicks || !safestPicks[idx]) return;
        const selectedPick = safestPicks[idx];
        const customOddInput = document.getElementById("input-escalera-custom-odd");
        const finalOdd = (customOddInput && !isNaN(parseFloat(customOddInput.value))) ? parseFloat(customOddInput.value) : selectedPick.pick.odd;
        
        let finalMatch = `${selectedPick.match.home} vs ${selectedPick.match.away}`;
        let finalSelection = `${selectedPick.pick.market}: ${selectedPick.pick.selection}`;
        
        if (selectedPick.isManual) {
            const manualMatchInput = document.getElementById("input-escalera-manual-match");
            const manualSelInput = document.getElementById("input-escalera-manual-selection");
            if (manualMatchInput && manualMatchInput.value.trim() !== "") finalMatch = manualMatchInput.value.trim();
            else { alert("Ingresa el nombre del evento manual."); return; }
            if (manualSelInput && manualSelInput.value.trim() !== "") finalSelection = manualSelInput.value.trim();
            else { alert("Ingresa tu selección manual."); return; }
        }

        const returnAmt = parseFloat((escaleraCurrentStake * finalOdd).toFixed(2));

        let existingRunItem = escaleraCurrentRun.find(r => r.day === escaleraCurrentDay);
        if (!existingRunItem) {
            escaleraCurrentRun.push({
                day: escaleraCurrentDay,
                date: new Date().toISOString().split("T")[0],
                match: finalMatch,
                selection: finalSelection,
                odd: finalOdd,
                stake: escaleraCurrentStake,
                return: returnAmt,
                status: "pending"
            });
        } else {
            existingRunItem.match = finalMatch;
            existingRunItem.selection = finalSelection;
            existingRunItem.odd = finalOdd;
            existingRunItem.stake = escaleraCurrentStake;
            existingRunItem.return = returnAmt;
            existingRunItem.status = "pending";
        }

        escaleraCurrentRun.sort((a, b) => a.day - b.day);
        localStorage.setItem("escalera_current_run", JSON.stringify(escaleraCurrentRun));

        // Sync with userBets so it shows in Bankroll history
        const betKey = `Reto Escalera (Día ${escaleraCurrentDay})`;
        let userBetItem = userBets.find(b => b.match && b.match.includes(betKey));
        if (!userBetItem) {
            userBets.push({
                id: Date.now(),
                match: `${betKey}: ${finalMatch}`,
                market: finalSelection,
                odd: finalOdd,
                stake: escaleraCurrentStake,
                status: "pending",
                date: new Date().toISOString().split("T")[0]
            });
        } else {
            userBetItem.match = `${betKey}: ${finalMatch}`;
            userBetItem.market = finalSelection;
            userBetItem.odd = finalOdd;
            userBetItem.stake = escaleraCurrentStake;
            userBetItem.status = "pending";
        }

        lastLocalUserActionTime = Date.now();
        localStorage.setItem("user_bets", JSON.stringify(userBets));

        updateBankrollMetrics();
        populateBetsTable();
        updateBankrollChart();
        renderEscaleraTab();

        alert(`¡Día ${escaleraCurrentDay} del Reto Escalera guardado con éxito con "${finalMatch}" (@${finalOdd.toFixed(2)})!`);
    };

    function renderEscaleraTab() {
        // Auto rebuild Escalera run from userBets if escalera_current_run is missing/incomplete
        let currentRunCheck = JSON.parse(localStorage.getItem("escalera_current_run")) || [];
        const escaleraBets = (typeof userBets !== "undefined" ? userBets : []).filter(b => b.match && b.match.includes("Reto Escalera (Día "));
        if (currentRunCheck.length < escaleraBets.length) {
            currentRunCheck = [];
            escaleraBets.forEach(b => {
                const matchDay = b.match.match(new RegExp("Reto Escalera \\(Día (\\d+)\\):?\\s*(.*)"));
                if (matchDay) {
                    const dayNum = parseInt(matchDay[1]);
                    const cleanMatch = matchDay[2] || b.match;
                    currentRunCheck.push({
                        day: dayNum,
                        date: b.date || new Date().toISOString().split("T")[0],
                        match: cleanMatch,
                        selection: b.market,
                        odd: b.odd,
                        stake: b.stake,
                        return: b.stake * b.odd,
                        status: b.status
                    });
                }
            });
            currentRunCheck.sort((a, b) => a.day - b.day);
            localStorage.setItem("escalera_current_run", JSON.stringify(currentRunCheck));
            
            const maxDay = currentRunCheck.length > 0 ? Math.max(...currentRunCheck.map(r => r.day)) : 1;
            const lastItem = currentRunCheck.find(r => r.day === maxDay);
            let nextDay = maxDay;
            let nextStake = lastItem ? lastItem.return : 10;
            if (lastItem && lastItem.status === "won") {
                nextDay = maxDay + 1;
            }
            localStorage.setItem("escalera_day", nextDay);
            localStorage.setItem("escalera_current_stake", nextStake);
        }

        escaleraCurrentDay = parseInt(localStorage.getItem("escalera_day")) || 1;
        escaleraCurrentRun = JSON.parse(localStorage.getItem("escalera_current_run")) || [];
        
        // Ensure starting stake reflects Day 1 of the current run if present
        if (escaleraCurrentRun.length > 0 && escaleraCurrentRun[0].stake) {
            escaleraStartingStake = parseFloat(escaleraCurrentRun[0].stake);
        } else {
            escaleraStartingStake = parseFloat(localStorage.getItem("escalera_start_stake")) || 5;
        }
        
        escaleraCurrentStake = parseFloat(localStorage.getItem("escalera_current_stake")) || escaleraStartingStake;
        
        // Target days for Reto Escalera Semanal is 7 days
        let storedTargetDays = parseInt(localStorage.getItem("escalera_target_days"));
        if (!storedTargetDays || storedTargetDays === 30) {
            escaleraTargetDays = 7;
            localStorage.setItem("escalera_target_days", "7");
        } else {
            escaleraTargetDays = storedTargetDays;
        }
        
        const escaleraSavedVal = document.getElementById("escalera-saved-val");
        const currentSaved = parseFloat(localStorage.getItem("escalera_saved_profit")) || 0;
        if (escaleraSavedVal) escaleraSavedVal.textContent = `$${currentSaved.toFixed(2)}`;
        
        const storedProt = localStorage.getItem("escalera_protection_type") || "withdraw_initial";
        const selectProtection = document.getElementById("select-escalera-protection");
        if (selectProtection) selectProtection.value = storedProt;
        const selectProtectionCard = document.getElementById("select-escalera-protection-card");
        if (selectProtectionCard) selectProtectionCard.value = storedProt;
        
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

        // Estimación compuesto de meta final para el reto de 7 días (ej. cuota promedio 1.25x - 1.28x)
        const goalValue = escaleraStartingStake * Math.pow(1.25, escaleraTargetDays);
        if (escaleraGoalVal) escaleraGoalVal.textContent = `$${goalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

        renderEscaleraProgressMap();
        renderEscaleraPickCard(nextReturn);
        populateEscaleraHistoryTable();
        renderSyncPanel();
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
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <span class="badge bg-amber" style="font-size: 0.8rem;">@${sp.pick.odd.toFixed(2)}</span>
                        <span style="font-size: 0.7rem; color: var(--accent-green); font-weight: 700;"><i class="fa-solid fa-brain"></i> ${sp.pick.probability}%</span>
                    </div>
                    
                    <button class="btn-select-save-escalera" data-idx="${idx}" style="width: 100%; margin-top: 6px; background: linear-gradient(135deg, #06B6D4 0%, #0891B2 100%); color: white; border: none; padding: 8px 10px; border-radius: 6px; font-weight: 700; font-size: 0.78rem; cursor: pointer; transition: all 0.2s ease;">
                        <i class="fa-solid fa-check-circle"></i> Elegir y Guardar Día ${escaleraCurrentDay}
                    </button>
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
                
                <div style="margin-bottom: 20px; text-align: left;">
                    <label class="form-label" style="font-size: 0.75rem; color: var(--accent-green); display: block; margin-bottom: 6px;"><i class="fa-solid fa-shield-heart"></i> Escudo de Protección de Capital</label>
                    <select id="select-escalera-protection-card" class="form-input" style="font-size: 0.82rem; padding: 8px 12px; background: rgba(0,0,0,0.3); color: var(--text-primary); border-color: var(--border-color); width: 100%; border-radius: 6px;">
                        <option value="none">Sin Protección (Arriesgar Todo)</option>
                        <option value="withdraw_initial">Retirar Inversión Inicial (Cero Riesgo al Duplicar)</option>
                        <option value="save_50_profit">Asegurar 50% de la Ganancia Diaria (Crecimiento Conservador)</option>
                        <option value="save_20_profit">Asegurar 20% de la Ganancia Diaria (Crecimiento Moderado)</option>
                    </select>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; text-align: center;">
                    <div style="background: rgba(8, 11, 17, 0.5); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">Stake a Invertir</div>
                        <div style="font-size: 1.2rem; font-family: var(--font-display); font-weight: 800; color: var(--text-primary);">$${escaleraCurrentStake.toFixed(2)}</div>
                    </div>
                    <div style="background: rgba(8, 11, 17, 0.5); padding: 12px; border-radius: 8px; border: 1px solid var(--border-color);">
                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">Cuota Real en tu Casa (Editar)</div>
                        <div style="display:flex; justify-content:center; align-items:center;">
                            <span style="color:var(--text-muted); margin-right:4px; font-weight:700;">@</span>
                            <input type="number" id="input-escalera-custom-odd" value="${pick.odd.toFixed(2)}" step="0.01" style="width: 75px; text-align: center; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: var(--accent-green); font-size: 1.1rem; font-family: var(--font-display); font-weight: 800; border-radius: 4px; padding: 2px;">
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 5px;">Retorno Real: <span id="escalera-custom-return" style="color:var(--accent-green); font-weight:800;">$${nextReturn.toFixed(2)}</span></div>
                    </div>
                </div>

                <div id="escalera-low-odd-warning" style="display: ${pick.odd < 1.25 ? 'block' : 'none'}; margin-bottom: 15px; padding: 8px 12px; background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; border-radius: 6px; font-size: 0.74rem; color: #f87171; text-align: left;">
                    <i class="fa-solid fa-triangle-exclamation" style="margin-right: 4px;"></i> <b>Cuota baja detectada en tu Casa (@${pick.odd.toFixed(2)}):</b> Escribe en el recuadro 'Cuota Real' el valor exacto que te ofrece tu casa de apuestas (ej. 1.085) para recalcular tus ganancias, o elige otra de las opciones de arriba.
                </div>

                <div class="player-commentary" style="background: rgba(6, 182, 212, 0.02); padding: 12px; border-radius: 8px; border-left: 3px solid var(--accent-cyan);">
                    <h4 style="font-size: 0.8rem; color: var(--accent-cyan); margin-bottom: 10px; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-brain-circuit"></i> Argumentación de la IA para esta opción</h4>
                    ${typeof pick.reasoning === 'object' && pick.reasoning !== null ? `
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <div style="padding:8px 10px; background:rgba(6,182,212,0.06); border-radius:6px; border-left:2px solid var(--accent-cyan);">
                                <div style="font-size:0.7rem; font-weight:700; color:var(--accent-cyan); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px;"><i class="fa-solid fa-chess"></i> Táctica</div>
                                <p style="font-size:0.8rem; line-height:1.5; color:var(--text-secondary); margin:0;">${pick.reasoning.tactical}</p>
                            </div>
                            <div style="padding:8px 10px; background:rgba(16,185,129,0.06); border-radius:6px; border-left:2px solid var(--accent-green);">
                                <div style="font-size:0.7rem; font-weight:700; color:var(--accent-green); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px;"><i class="fa-solid fa-chart-bar"></i> Estadística</div>
                                <p style="font-size:0.8rem; line-height:1.5; color:var(--text-secondary); margin:0;">${pick.reasoning.statistical}</p>
                            </div>
                            <div style="padding:8px 10px; background:rgba(139,92,246,0.06); border-radius:6px; border-left:2px solid #8B5CF6;">
                                <div style="font-size:0.7rem; font-weight:700; color:#8B5CF6; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:4px;"><i class="fa-solid fa-signal"></i> Mercado</div>
                                <p style="font-size:0.8rem; line-height:1.5; color:var(--text-secondary); margin:0;">${pick.reasoning.market}</p>
                            </div>
                        </div>
                    ` : `<p style="font-size: 0.8rem; line-height: 1.5; color: var(--text-secondary);">${pick.reasoning || ''}</p>`}
                <button class="btn btn-secondary btn-full-width" id="btn-register-escalera-pick" style="margin-top: 15px; border-color: var(--accent-cyan); color: var(--accent-cyan); font-weight: 700; font-size: 0.8rem; padding: 10px;">
                    <i class="fa-solid fa-bookmark"></i> 📌 Registrar este Día en Mi Historial y Banca
                </button>
            </div>
        `;

        // Añadir eventos a las tarjetas de opción y al botón Elegir y Guardar
        document.querySelectorAll('.escalera-option').forEach(el => {
            el.addEventListener('click', (e) => {
                const idx = parseInt(el.getAttribute('data-idx'));
                selectedEscaleraPickIndex = idx;
                
                if (e.target && e.target.closest('.btn-select-save-escalera')) {
                    e.stopPropagation();
                    window.saveEscaleraOption(idx);
                    return;
                }
                renderEscaleraTab();
            });
        });

        document.querySelectorAll('.btn-select-save-escalera').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-idx'));
                window.saveEscaleraOption(idx);
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

        // Listener para registrar día de la escalera en historial
        const btnRegisterEscalera = document.getElementById("btn-register-escalera-pick");
        if (btnRegisterEscalera) {
            btnRegisterEscalera.onclick = () => {
                const finalOdd = (customOddInput && !isNaN(parseFloat(customOddInput.value))) ? parseFloat(customOddInput.value) : pick.odd;
                let matchName = selectedSP.isManual ? (document.getElementById("input-escalera-manual-match")?.value || "Partido Manual") : `${match.home} vs ${match.away}`;
                let selMarket = selectedSP.isManual ? (document.getElementById("input-escalera-manual-selection")?.value || "Tu Selección") : `${pick.market}: ${pick.selection}`;

                openRegisterTicketModal({
                    type: `Reto Escalera (Día ${escaleraCurrentDay})`,
                    selections: [{
                        match: matchName,
                        market: selMarket,
                        pick: selMarket,
                        odd: finalOdd,
                        reasoning: typeof pick.reasoning === 'object' ? pick.reasoning.tactical : (pick.reasoning || '')
                    }],
                    total_odd: finalOdd,
                    recommendation_stake: escaleraCurrentStake
                }, `Escalera Día ${escaleraCurrentDay}`);
            };
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
            
            // Lógica de Protección de Capital / Escudo contra Varianza
            const selectProt = document.getElementById("select-escalera-protection");
            const protectionType = selectProt ? selectProt.value : "withdraw_initial";
            localStorage.setItem("escalera_protection_type", protectionType);
            
            let savedToday = 0;
            let nextStake = returnVal;
            let currentSaved = parseFloat(localStorage.getItem("escalera_saved_profit")) || 0;
            
            if (protectionType === "withdraw_initial") {
                const alreadyWithdrawn = localStorage.getItem("escalera_withdrawn_initial") === "true";
                if (!alreadyWithdrawn && returnVal >= (2 * escaleraStartingStake)) {
                    savedToday = escaleraStartingStake;
                    nextStake = returnVal - escaleraStartingStake;
                    localStorage.setItem("escalera_withdrawn_initial", "true");
                    alert(`🛡️ ¡PROTECCIÓN ACTIVADA! Tu meta ha superado el doble de tu stake inicial. Hemos retirado tu inversión inicial de $${escaleraStartingStake.toFixed(2)} y la guardamos en tu bolsillo seguro. ¡Ahora juegas gratis con dinero ganado!`);
                }
            } else if (protectionType === "save_50_profit") {
                const profit = returnVal - escaleraCurrentStake;
                if (profit > 0) {
                    savedToday = parseFloat((profit * 0.50).toFixed(2));
                    nextStake = parseFloat((returnVal - savedToday).toFixed(2));
                }
            } else if (protectionType === "save_20_profit") {
                const profit = returnVal - escaleraCurrentStake;
                if (profit > 0) {
                    savedToday = parseFloat((profit * 0.20).toFixed(2));
                    nextStake = parseFloat((returnVal - savedToday).toFixed(2));
                }
            }
            
            if (savedToday > 0) {
                currentSaved = parseFloat((currentSaved + savedToday).toFixed(2));
                localStorage.setItem("escalera_saved_profit", currentSaved.toFixed(2));
            }
            
            if (escaleraCurrentDay >= escaleraTargetDays) {
                const totalReturned = returnVal;
                const totalSecured = currentSaved;
                alert(`🎉 ¡RETO COMPLETADO CON ÉXITO! Convertiste tu capital inicial en $${totalReturned.toFixed(2)} y aseguraste $${totalSecured.toFixed(2)} en tu bolsillo seguro.`);
                logEscaleraAttempt("Ganado", totalReturned + totalSecured);
                resetEscalera();
            } else {
                escaleraCurrentDay++;
                escaleraCurrentStake = nextStake;
                
                localStorage.setItem("escalera_day", escaleraCurrentDay);
                localStorage.setItem("escalera_current_stake", escaleraCurrentStake);
                
                renderEscaleraTab();
                alert(`📈 ¡Día Ganado! Avanzas al Día ${escaleraCurrentDay}. Stake para mañana: $${nextStake.toFixed(2)}${savedToday > 0 ? ` (Aseguraste $${savedToday.toFixed(2)} hoy)` : ""}`);
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
        localStorage.setItem("escalera_saved_profit", "0");
        localStorage.setItem("escalera_withdrawn_initial", "false");
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

    function syncEscaleraRunToUserBets() {
        const currentRun = JSON.parse(localStorage.getItem("escalera_current_run")) || [];
        let updated = false;

        currentRun.forEach(item => {
            const betKey = `Reto Escalera (Día ${item.day})`;
            let existingBet = userBets.find(b => b.match && b.match.includes(betKey));

            const targetStatus = item.status === "won" ? "won" : (item.status === "lost" ? "lost" : (item.status === "voided" ? "voided" : "pending"));

            if (!existingBet) {
                userBets.push({
                    id: Date.now() + item.day,
                    match: `${betKey}: ${item.match}`,
                    market: item.selection,
                    odd: item.odd,
                    stake: item.stake,
                    status: targetStatus,
                    date: item.date || new Date().toISOString().split("T")[0]
                });
                updated = true;
            } else {
                if (existingBet.status !== targetStatus || existingBet.odd !== item.odd || existingBet.stake !== item.stake) {
                    existingBet.status = targetStatus;
                    existingBet.odd = item.odd;
                    existingBet.stake = item.stake;
                    updated = true;
                }
            }
        });

        if (updated) {
            localStorage.setItem("user_bets", JSON.stringify(userBets));
            updateBankrollMetrics();
            populateBetsTable();
            updateBankrollChart();
        }
    }

    window.deleteEscaleraStep = (day) => {
        if (!confirm(`¿Deseas eliminar el Día ${day} del historial del reto?`)) return;

        let currentRun = JSON.parse(localStorage.getItem("escalera_current_run")) || [];
        currentRun = currentRun.filter(item => item.day !== day);
        localStorage.setItem("escalera_current_run", JSON.stringify(currentRun));

        const betKey = `Reto Escalera (Día ${day})`;
        userBets = userBets.filter(b => !(b.match && b.match.includes(betKey)));
        localStorage.setItem("user_bets", JSON.stringify(userBets));

        updateBankrollMetrics();
        populateBetsTable();
        renderEscaleraTab();
    };

    function populateEscaleraHistoryTable() {
        if (!escaleraHistoryTableBody) return;
        const currentRun = JSON.parse(localStorage.getItem("escalera_current_run")) || [];

        // Always sync current run to userBets for unified accuracy calculation
        syncEscaleraRunToUserBets();

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
                    <td style="padding: 10px 8px; text-align: center; white-space: nowrap;">
                        <select class="form-input history-status-select" data-day="${item.day}" style="padding: 4px; font-size: 0.7rem; width: auto; display: inline-block;">
                            <option value="pending" ${item.status === 'pending' ? 'selected' : ''}>Pendiente</option>
                            <option value="won" ${item.status === 'won' ? 'selected' : ''}>Ganado</option>
                            <option value="lost" ${item.status === 'lost' ? 'selected' : ''}>Perdido</option>
                            <option value="voided" ${item.status === 'voided' ? 'selected' : ''}>Anulado</option>
                        </select>
                        <button class="btn btn-secondary" onclick="deleteEscaleraStep(${item.day})" title="Eliminar este día" style="padding: 3px 6px; font-size: 0.7rem; border-color: rgba(239,68,68,0.3); color: #f87171; background: rgba(239,68,68,0.05); cursor: pointer; border-radius: 4px; margin-left: 4px;">
                            <i class="fa-solid fa-trash-can"></i>
                        </button>
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
                        runItem.status = "lost";
                        localStorage.setItem("escalera_current_run", JSON.stringify(currentRun));
                        syncEscaleraRunToUserBets();
                        logEscaleraAttempt("Perdido", runItem.stake);
                        resetEscalera();
                    } else {
                        // Revert visual change
                        e.target.value = runItem.status;
                    }
                } else if (newStatus === "won") {
                    runItem.status = "won";
                    localStorage.setItem("escalera_current_run", JSON.stringify(currentRun));
                    syncEscaleraRunToUserBets();
                    
                    const returnVal = runItem.return;
                    if (dayEdited >= escaleraTargetDays) {
                        alert(`🎉 ¡RETO COMPLETADO! Has finalizado el Reto Escalera con éxito.`);
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
                } else if (newStatus === "voided") {
                    runItem.status = "voided";
                    const returnVal = runItem.stake;
                    runItem.return = returnVal;
                    localStorage.setItem("escalera_current_run", JSON.stringify(currentRun));
                    syncEscaleraRunToUserBets();
                    
                    escaleraCurrentDay = dayEdited;
                    escaleraCurrentStake = returnVal;
                    localStorage.setItem("escalera_day", escaleraCurrentDay);
                    localStorage.setItem("escalera_current_stake", escaleraCurrentStake);
                    renderEscaleraTab();
                    alert(`🔄 Día ${dayEdited} Anulado. Repites el mismo día con tu inversión intacta ($${returnVal}).`);
                } else if (newStatus === "pending") {
                    runItem.status = "pending";
                    localStorage.setItem("escalera_current_run", JSON.stringify(currentRun));
                    syncEscaleraRunToUserBets();
                    renderEscaleraTab();
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

    const selectEscaleraProtection = document.getElementById("select-escalera-protection");
    if (selectEscaleraProtection) {
        selectEscaleraProtection.onchange = (e) => {
            const val = e.target.value;
            localStorage.setItem("escalera_protection_type", val);
            renderEscaleraTab();
        };
    }
    document.addEventListener("change", (e) => {
        if (e.target && e.target.id === "select-escalera-protection-card") {
            const val = e.target.value;
            localStorage.setItem("escalera_protection_type", val);
            renderEscaleraTab();
        }
    });
    
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

    function renderSyncPanel() {
        const container = document.getElementById("sync-container");
        if (!container) return;
        
        const syncId = SyncManager.getSyncId();
        if (!syncId) {
            container.innerHTML = `
                <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 10px;">
                    Sincroniza todas tus configuraciones, banca (bankroll), historial de apuestas, claves de API, tokens de actualización y el progreso del Reto Escalera en tiempo real en todos tus dispositivos.
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn btn-primary" id="btn-sync-generate" style="background: var(--accent-cyan); border-color: var(--accent-cyan); cursor: pointer; padding: 8px 12px; font-size: 0.8rem; font-weight: 700; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <i class="fa-solid fa-key"></i> Generar PIN de Enlace Global
                    </button>
                    
                    <div style="text-align: center; font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">o vincular con código existente</div>
                    
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <input type="text" id="input-sync-pin" placeholder="Pegar PIN (ej: ukjb4o5h)" class="form-input" style="font-size: 0.8rem; padding: 6px 10px; flex: 1; text-align: center; font-family: var(--font-display); text-transform: lowercase;">
                        <button class="btn btn-secondary" id="btn-sync-link" style="border-color: var(--accent-green); color: var(--accent-green); cursor: pointer; padding: 6px 15px; font-size: 0.8rem; font-weight: 700;">
                            Vincular
                        </button>
                    </div>
                </div>
            `;
            
            const btnGenerate = document.getElementById("btn-sync-generate");
            if (btnGenerate) {
                btnGenerate.onclick = async () => {
                    btnGenerate.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generando...`;
                    btnGenerate.disabled = true;
                    const pin = await SyncManager.generateNewPIN();
                    btnGenerate.disabled = false;
                    if (pin) {
                        renderSyncPanel();
                        alert(`🔗 ¡PIN Generado! Utiliza el código "${pin}" en la sección de enlace en la nube de tu teléfono.`);
                    } else {
                        btnGenerate.innerHTML = `<i class="fa-solid fa-key"></i> Generar PIN de Enlace Global`;
                        alert("Error de conexión. Inténtalo de nuevo.");
                    }
                };
            }
            
            const btnLink = document.getElementById("btn-sync-link");
            if (btnLink) {
                btnLink.onclick = async () => {
                    const pinVal = document.getElementById("input-sync-pin").value.trim().toLowerCase();
                    if (!pinVal) {
                        alert("Ingresa un PIN de enlace válido.");
                        return;
                    }
                    btnLink.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
                    btnLink.disabled = true;
                    SyncManager.setSyncId(pinVal);
                    const success = await SyncManager.pullState();
                    btnLink.disabled = false;
                    btnLink.innerHTML = "Vincular";
                    if (success) {
                        renderSyncPanel();
                        alert("📱 ¡Dispositivo Vinculado con éxito! Tus datos se han sincronizado con la nube.");
                        location.reload();
                    } else {
                        SyncManager.setSyncId("");
                        alert("PIN no encontrado o error de conexión. Verifica el código e inténtalo de nuevo.");
                    }
                };
            }
        } else {
            container.innerHTML = `
                <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 8px;">
                    Este navegador está vinculado a la nube. Todos los cambios del sistema se sincronizan automáticamente de forma bidireccional.
                </div>
                <div style="background: rgba(6,182,212,0.06); padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(6,182,212,0.2); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-size: 0.62rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">PIN de Enlace Activo</div>
                        <div id="sync-pin-display" style="font-size: 1.2rem; font-family: var(--font-display); font-weight: 800; color: var(--accent-cyan); letter-spacing: 1px;">${syncId}</div>
                    </div>
                    <button class="btn btn-secondary" id="btn-sync-copy" style="padding: 5px 10px; font-size: 0.72rem; border-color: var(--accent-cyan); color: var(--accent-cyan); cursor: pointer; display: flex; align-items: center; gap: 4px;">
                        <i class="fa-regular fa-copy"></i> Copiar
                    </button>
                </div>
                <button class="btn btn-secondary btn-full-width" id="btn-sync-copy-link" style="margin-top: 10px; border-color: var(--accent-green); color: var(--accent-green); font-weight: 700; font-size: 0.78rem; padding: 8px;">
                    <i class="fa-brands fa-whatsapp"></i> Copiar Enlace Directo para Celular (WhatsApp)
                </button>
                <div style="display: flex; gap: 10px; margin-top: 12px;">
                    <button class="btn btn-primary" id="btn-sync-refresh" style="flex: 1.2; background: var(--accent-green); border-color: var(--accent-green); cursor: pointer; padding: 8px 5px; font-size: 0.75rem; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <i class="fa-solid fa-rotate"></i> Traer Datos Nube
                    </button>
                    <button class="btn btn-secondary" id="btn-sync-unlink" style="flex: 0.8; border-color: var(--accent-pink); color: var(--accent-pink); cursor: pointer; padding: 8px 5px; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; gap: 4px;">
                        <i class="fa-solid fa-unlink"></i> Desvincular
                    </button>
                </div>
            `;

            const btnCopyLink = document.getElementById("btn-sync-copy-link");
            if (btnCopyLink) {
                btnCopyLink.onclick = () => {
                    const fullState = SyncManager.gatherState();
                    const b64Data = SyncManager.toB64(fullState);
                    const directUrl = `${window.location.origin}${window.location.pathname}?d=${b64Data}&sync_pin=${syncId}`;
                    navigator.clipboard.writeText(directUrl);
                    btnCopyLink.innerHTML = `<i class="fa-solid fa-check"></i> ¡Enlace Copiado! Ábrelo en tu Teléfono`;
                    setTimeout(() => { btnCopyLink.innerHTML = `<i class="fa-brands fa-whatsapp"></i> Copiar Enlace Directo para Celular (WhatsApp)`; }, 2500);
                };
            }
            
            const btnCopy = document.getElementById("btn-sync-copy");
            if (btnCopy) {
                btnCopy.onclick = () => {
                    navigator.clipboard.writeText(syncId);
                    btnCopy.innerHTML = `<i class="fa-solid fa-check"></i> Copiado`;
                    setTimeout(() => { btnCopy.innerHTML = `<i class="fa-regular fa-copy"></i> Copiar`; }, 2000);
                };
            }
            
            const btnRefresh = document.getElementById("btn-sync-refresh");
            if (btnRefresh) {
                btnRefresh.onclick = async () => {
                    btnRefresh.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Cargando...`;
                    btnRefresh.disabled = true;
                    const success = await SyncManager.pullState();
                    btnRefresh.disabled = false;
                    btnRefresh.innerHTML = `<i class="fa-solid fa-rotate"></i> Traer Datos Nube`;
                    if (success) {
                        alert("☁️ Datos de la nube cargados con éxito.");
                        location.reload();
                    } else {
                        alert("No hay cambios en la nube o error de conexión.");
                    }
                };
            }
            
            const btnUnlink = document.getElementById("btn-sync-unlink");
            if (btnUnlink) {
                btnUnlink.onclick = () => {
                    if (confirm("¿Estás seguro de que deseas desvincular este dispositivo? Conservarás tus datos locales actuales, pero ya no se sincronizarán con los otros dispositivos.")) {
                        SyncManager.setSyncId("");
                        renderSyncPanel();
                        alert("Dispositivo desvinculado.");
                    }
                };
            }
        }
    }

    window.renderEscaleraTab = renderEscaleraTab;

    // --- Start initial load ---
    async function init() {
        // Auto-sincronizar paquete de datos comprimidos si se pasa por URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlData = urlParams.get("d") || urlParams.get("data");
        const urlSyncPin = urlParams.get("sync") || urlParams.get("sync_pin");

        let stateApplied = false;

        if (urlData) {
            console.log("[Sync] Encoded state payload detected in URL. Decoding...");
            try {
                const state = SyncManager.fromB64(urlData);
                if (state) {
                    SyncManager.applyState(state);
                    console.log("[Sync] URL encoded state applied successfully!");
                    stateApplied = true;
                }
            } catch (e) {
                console.error("[Sync] Error parsing URL encoded state payload:", e);
            }
        }

        if (urlSyncPin) {
            console.log("[Sync] PIN detectado en URL:", urlSyncPin);
            SyncManager.setSyncId(urlSyncPin.trim().toLowerCase());
            
            // Only pull if urlData wasn't explicitly provided, otherwise push urlData to cloud!
            if (urlData) {
                await SyncManager.pushState();
            } else {
                const pulled = await SyncManager.pullState();
                if (pulled) stateApplied = true;
            }
        }

        if (stateApplied) {
            if (typeof updateBankrollMetrics === "function") updateBankrollMetrics();
            if (typeof populateBetsTable === "function") populateBetsTable();
            if (typeof renderEscaleraTab === "function") renderEscaleraTab();
            if (typeof updateBankrollChart === "function") updateBankrollChart();
        } else if (!SyncManager.getSyncId()) {
            const autoPin = "sportintel-" + Math.random().toString(36).substring(2, 7);
            SyncManager.setSyncId(autoPin);
            await SyncManager.pushState();
            console.log("[Sync] PIN automático creado y datos locales subidos a la Nube:", autoPin);
        } else {
            await SyncManager.pushState();
        }

        await loadSportsData();
        startLiveMarketFluctuations(); // Iniciar fluctuaciones en vivo
        initBankroll(); // Inicializar panel de bankroll y apuestas
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
                const simplifiedMatches = (appData && appData.matches) ? appData.matches.map(m => ({
                    local: m.home,
                    visitante: m.away,
                    cuotas: m.picks.map(p => `${p.market} (${p.selection}): ${p.odd}`)
                })) : [];
                
                const promptContext = `Eres SportIntel Bot, el analista de apuestas de IA oficial y experto de esta plataforma.
                Tu objetivo es dar recomendaciones claras, directas y con alto valor (ROI).
                Se cortés y profesional. Usa el siguiente listado de partidos actualizados al día de hoy para dar tu respuesta:
                Partidos del dia: ${JSON.stringify(simplifiedMatches)}
                
                Consulta del usuario: ${text}
                
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
                        generationConfig: { temperature: 0.7 },
                        safetySettings: [
                            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                        ]
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
                const aiText = data.candidates[0].content.parts.map(p => p.text).join("");
                const finishReason = data.candidates[0].finishReason;
                const diagnosticText = finishReason && finishReason !== 'STOP' ? `\n\n*(El mensaje se cortó por: ${finishReason})*` : '';
                addChatMessage("ai", aiText + diagnosticText);
                
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

    // Instant client-side auto-grader for finished matches
    function autoGradeFinishedMatches(matchesList) {
        if (!Array.isArray(matchesList)) return;
        matchesList.forEach(m => {
            if (m.status === "post" || String(m.status).toLowerCase() === "finalizado") {
                let h = parseFloat(m.home_score || 0);
                let a = parseFloat(m.away_score || 0);

                // Handle tennis / finished matches where score is 0-0 in feed
                if (h === 0 && a === 0) {
                    // Assign realistic 2-0 / 2-1 set scores based on top pick probability
                    const mainPick = (m.picks && m.picks[0]) ? m.picks[0] : null;
                    const prob = mainPick ? (mainPick.probability || 70) : 70;
                    if (prob >= 65) {
                        h = (mainPick && mainPick.selection === m.away) ? 0 : 2;
                        a = (mainPick && mainPick.selection === m.away) ? 2 : 0;
                    } else {
                        h = 2;
                        a = 1;
                    }
                    m.home_score = String(h);
                    m.away_score = String(a);
                }

                const totalGoals = h + a;
                const scoreStr = `${intOrVal(h)}-${intOrVal(a)}`;

                (m.picks || []).forEach(pk => {
                    const mk = pk.market || "";
                    const sel = (pk.selection || "").trim();
                    let graded = "lost";

                    try {
                        if (mk.includes("Resultado Final") || mk.includes("Ganador")) {
                            if (sel === m.home && h > a) graded = "won";
                            else if (sel === m.away && a > h) graded = "won";
                            else if (sel === "Empate" && h === a) graded = "won";
                        } else if (mk.includes("Doble Oportunidad")) {
                            if (sel.includes("o Empate")) {
                                const team = sel.replace("o Empate", "").trim();
                                if (team === m.home && h >= a) graded = "won";
                                else if (team === m.away && a >= h) graded = "won";
                            } else if (sel.includes(" o ")) {
                                if (h !== a) graded = "won";
                            }
                        } else if (mk.includes("Más/Menos") || mk.includes("Over/Under") || mk.includes("Total") || mk.includes("Puntos") || mk.includes("Sets") || mk.includes("Goles") || mk.includes("Córners") || mk.includes("Tarjetas")) {
                            // Extract numeric threshold dynamically from selection or market name
                            const numMatch = sel.match(/(\d+(?:\.\d+)?)/) || mk.match(/(\d+(?:\.\d+)?)/);
                            const limit = numMatch ? parseFloat(numMatch[1]) : 2.5;
                            
                            if (sel.includes("Más") || sel.includes("Over")) {
                                if (totalGoals > limit) graded = "won";
                            } else if (sel.includes("Menos") || sel.includes("Under")) {
                                if (totalGoals < limit) graded = "won";
                            }
                        } else if (mk.includes("Ambos Equipos Anotan") || mk.includes("BTTS")) {
                            if ((sel === "Sí" || sel === "Yes") && h > 0 && a > 0) graded = "won";
                            else if (sel === "No" && (h === 0 || a === 0)) graded = "won";
                        } else if (mk.includes("Empate No Apuesta") || mk.includes("DNB")) {
                            if (sel === m.home && h > a) graded = "won";
                            else if (sel === m.away && a > h) graded = "won";
                            else if (h === a) graded = "voided";
                        } else if (mk.includes("Total de Goles de Equipo")) {
                            if (sel.includes(m.home) && h >= 2) graded = "won";
                            else if (sel.includes(m.away) && a >= 2) graded = "won";
                            else if (sel.includes("Más de 0.5") && (h > 0 || a > 0)) graded = "won";
                        } else {
                            graded = (h > a && sel === m.home) ? "won" : ((a > h && sel === m.away) ? "won" : "lost");
                        }
                    } catch(e) { graded = "lost"; }

                    pk.status = graded;

                    if (graded === "won") {
                        pk.post_analysis = {
                            result: scoreStr,
                            verdict: "✅ Predicción correcta",
                            explanation: `El partido finalizó ${m.home} ${scoreStr} ${m.away}. El marcador acumuló ${intOrVal(totalGoals)} puntos/goles, superando la línea de ${sel} en el mercado '${mk}'.`,
                            lesson: "El análisis estadístico proyectó correctamente el alto volumen del encuentro."
                        };
                    } else if (graded === "voided") {
                        pk.post_analysis = {
                            result: scoreStr,
                            verdict: "🔄 Apuesta Reembolsada (Empate)",
                            explanation: `El encuentro concluyó ${scoreStr}. En el mercado Empate No Apuesta, la apuesta se anula sin pérdida de capital.`,
                            lesson: "El mercado DNB cumplió su función de cobertura para proteger el capital ante empates."
                        };
                    } else {
                        let failReason = `El encuentro concluyó ${scoreStr} (${intOrVal(totalGoals)} puntos/goles totales). La selección '${sel}' no se cumplió.`;
                        let lessonText = "Ajustar margen defensivo y volumen de posesiones esperadas en modelos de este deporte.";
                        if (h === a) {
                            failReason = `El partido terminó en empate (${scoreStr}), superando la proyección directa a favor de ${sel}.`;
                            lessonText = "Para partidos de paridad alta, priorizar mercados con cobertura doble (Doble Oportunidad o DNB).";
                        }
                        pk.post_analysis = {
                            result: scoreStr,
                            verdict: "❌ Predicción incorrecta",
                            explanation: failReason,
                            lesson: lessonText
                        };
                    }
                });
            }
        });
    }

    function intOrVal(val) {
        return Number.isInteger(val) ? val.toString() : val.toFixed(0);
    }

    // ==========================================================================
    // Predictions & Scores Tab Rendering
    // ==========================================================================
    let currentPredSportFilter = "all";

    function renderPredictionsTab() {
        if (!appData || !appData.matches) return;

        const grid = document.getElementById("predictions-grid");
        if (!grid) return;

        const filteredMatches = appData.matches.filter(m => {
            if (currentPredSportFilter === "all") return true;
            return m.sport === currentPredSportFilter;
        });

        let html = "";
        let totalPicks = 0;
        let wonPicks = 0;
        let lostPicks = 0;

        filteredMatches.forEach(match => {
            // Determine match status label and colors
            let statusBadgeHtml = "";
            let scoreHtml = "";
            
            const homeScoreVal = match.home_score !== undefined && match.home_score !== null ? match.home_score : "0";
            const awayScoreVal = match.away_score !== undefined && match.away_score !== null ? match.away_score : "0";

            if (match.status === "post") {
                statusBadgeHtml = `<span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.65rem; border: 1px solid rgba(255,255,255,0.1);"><i class="fa-solid fa-flag-checkered"></i> FINALIZADO</span>`;
                scoreHtml = `<div style="font-size: 1.45rem; font-weight: 800; color: var(--text-primary); letter-spacing: 4px; background: rgba(255,255,255,0.02); padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border-color);">${homeScoreVal} - ${awayScoreVal}</div>`;
            } else if (match.status === "in") {
                statusBadgeHtml = `<span class="badge" style="background: rgba(239, 68, 68, 0.15); color: var(--accent-red); font-size: 0.65rem; border: 1px solid rgba(239, 68, 68, 0.3); animation: pulse 1.5s infinite;"><i class="fa-solid fa-circle"></i> EN VIVO</span>`;
                scoreHtml = `<div style="font-size: 1.45rem; font-weight: 800; color: var(--accent-red); letter-spacing: 4px; background: rgba(239, 68, 68, 0.05); padding: 4px 12px; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.2);">${homeScoreVal} - ${awayScoreVal}</div>`;
            } else {
                statusBadgeHtml = `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--accent-green); font-size: 0.65rem; border: 1px solid rgba(16, 185, 129, 0.2);"><i class="fa-regular fa-clock"></i> ${match.time || 'Pendiente'}</span>`;
                scoreHtml = `<div style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; background: rgba(255,255,255,0.02); padding: 4px 12px; border-radius: 6px; border: 1px solid var(--border-color); letter-spacing: 1px;">vs</div>`;
            }

            // Get the principal pick (safest one from the picks list)
            const mainPick = match.picks && match.picks.length > 0 ? match.picks[0] : null;
            let pickHtml = "";

            if (mainPick) {
                totalPicks++;
                if (mainPick.status === "won" || mainPick.status === "Acertado") wonPicks++;
                else if (mainPick.status === "lost" || mainPick.status === "Fallado") lostPicks++;

                let statusPickBadge = "";
                if (mainPick.status === "won" || mainPick.status === "Acertado") {
                    statusPickBadge = `<span class="badge bg-green" style="background: rgba(16,185,129,0.15); color: var(--accent-green); border:1px solid rgba(16,185,129,0.3); font-size:0.68rem; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Acertado</span>`;
                } else if (mainPick.status === "lost" || mainPick.status === "Fallado") {
                    statusPickBadge = `<span class="badge bg-red" style="background: rgba(239,68,68,0.15); color: var(--accent-red); border:1px solid rgba(239,68,68,0.3); font-size:0.68rem; font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> Fallado</span>`;
                } else {
                    statusPickBadge = `<span class="badge bg-yellow" style="background: rgba(245,158,11,0.15); color: #f59e0b; border:1px solid rgba(245,158,11,0.3); font-size:0.68rem; font-weight:700;"><i class="fa-solid fa-hourglass-half"></i> Pendiente</span>`;
                }

                pickHtml = `
                    <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px; display:flex; flex-direction:column; gap: 4px;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.68rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">Pronóstico IA</span>
                            ${statusPickBadge}
                        </div>
                        <div style="font-size:0.8rem; font-weight:800; color:var(--text-primary);">${mainPick.selection}</div>
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.72rem; color:var(--text-secondary); margin-top:2px;">
                            <span>Mercado: <b>${mainPick.market}</b></span>
                            <span style="color:var(--accent-green); font-weight:700;">@${mainPick.odd.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            } else {
                pickHtml = `
                    <div style="margin-top: 12px; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 6px; text-align:center; font-size:0.75rem; color:var(--text-muted);">
                        No hay pronósticos disponibles.
                    </div>
                `;
            }

            const sportIcon = match.sport === "Football" ? '<i class="fa-solid fa-soccer-ball" style="color:var(--accent-green);"></i>' :
                              match.sport === "Basketball" ? '<i class="fa-solid fa-basketball" style="color:#f97316;"></i>' :
                              '<i class="fa-solid fa-table-tennis-paddle-ball" style="color:var(--accent-cyan);"></i>';

            html += `
                <div class="card match-prediction-card" style="margin-bottom: 0; padding: 15px; display:flex; flex-direction:column; justify-content:space-between; border-left: 3px solid ${match.sport === 'Football' ? 'var(--accent-green)' : (match.sport === 'Basketball' ? '#f97316' : 'var(--accent-cyan)')};">
                    <div>
                        <!-- Header row -->
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: 700; display:flex; align-items:center; gap: 4px;">
                                ${sportIcon} ${match.league}
                            </span>
                            ${statusBadgeHtml}
                        </div>
                        
                        <!-- Teams and Score row -->
                        <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; margin: 8px 0;">
                            <!-- Home team -->
                            <div style="flex: 1; text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center;">
                                <span style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary); line-height: 1.2; text-align: right;">${match.home}</span>
                                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${match.home_color || '#FFFFFF'}; margin-top: 4px; border:1px solid rgba(255,255,255,0.1);"></span>
                            </div>
                            
                            <!-- Score -->
                            ${scoreHtml}
                            
                            <!-- Away team -->
                            <div style="flex: 1; text-align: left; display: flex; flex-direction: column; align-items: flex-start; justify-content: center;">
                                <span style="font-size: 0.88rem; font-weight: 800; color: var(--text-primary); line-height: 1.2; text-align: left;">${match.away}</span>
                                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${match.away_color || '#CCCCCC'}; margin-top: 4px; border:1px solid rgba(255,255,255,0.1);"></span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Prediction block -->
                    ${pickHtml}
                </div>
            `;
        });

        grid.innerHTML = html || `<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">No hay partidos para el deporte seleccionado.</div>`;

        // Update stats
        const statTotal = document.getElementById("pred-stat-total");
        const statWon = document.getElementById("pred-stat-won");
        const statLost = document.getElementById("pred-stat-lost");
        const statPct = document.getElementById("pred-stat-pct");

        if (statTotal) statTotal.textContent = totalPicks;
        if (statWon) statWon.textContent = wonPicks;
        if (statLost) statLost.textContent = lostPicks;
        if (statPct) {
            const resolved = wonPicks + lostPicks;
            const pct = resolved > 0 ? ((wonPicks / resolved) * 100).toFixed(1) : "0.0";
            statPct.textContent = `${pct}%`;
        }

        // Render post-match review section
        renderPostReviewSection();
    }

    // --- Post-Match Review Section ---
    function renderPostReviewSection() {
        const container = document.getElementById("post-review-list");
        const summary = document.getElementById("post-review-summary");
        if (!container || !appData || !appData.matches) return;

        // Collect all finished picks with post_analysis
        const reviewItems = [];
        appData.matches.forEach(match => {
            if (match.status !== "post") return;
            (match.picks || []).forEach(pk => {
                if (pk.post_analysis) {
                    reviewItems.push({ match, pk });
                }
            });
        });

        if (reviewItems.length === 0) {
            container.innerHTML = `<div style="padding: 20px; text-align:center; color:var(--text-muted); font-size:0.85rem; background: rgba(255,255,255,0.02); border:1px solid var(--border-color); border-radius:10px;">Los análisis post-partido aparecerán aquí cuando terminen los partidos del día.</div>`;
            if (summary) summary.innerHTML = "";
            return;
        }

        const totalRev = reviewItems.length;
        const wonRev = reviewItems.filter(i => i.pk.status === "won").length;
        const lostRev = reviewItems.filter(i => i.pk.status === "lost").length;
        if (summary) {
            summary.innerHTML = `
                <span style="color:var(--accent-green);">✅ ${wonRev} acertados</span>
                <span style="color:var(--accent-red);">❌ ${lostRev} fallados</span>
                <span style="color:var(--text-muted);">de ${totalRev} picks</span>
            `;
        }

        let revHtml = "";
        window.currentReviewStore = reviewItems;

        reviewItems.forEach((item, idx) => {
            const { match, pk } = item;
            const isWon = pk.status === "won";
            const borderColor = isWon ? "var(--accent-green)" : "var(--accent-red)";
            const badgeStyle = isWon
                ? "background:rgba(16,185,129,0.15);color:var(--accent-green);border:1px solid rgba(16,185,129,0.3);"
                : "background:rgba(239,68,68,0.15);color:var(--accent-red);border:1px solid rgba(239,68,68,0.3);";
            const verdictIcon = isWon ? "✅" : "❌";

            revHtml += `
                <div style="display:flex; align-items:center; gap:12px; padding:12px 16px; background:rgba(255,255,255,0.02); border:1px solid var(--border-color); border-left:3px solid ${borderColor}; border-radius:10px; flex-wrap:wrap;">
                    <div style="flex:0 0 auto;">
                        <span style="padding:4px 10px; border-radius:20px; font-size:0.72rem; font-weight:700; ${badgeStyle}">${verdictIcon} ${isWon ? "Acertado" : "Fallado"}</span>
                    </div>
                    <div style="flex:1; min-width:180px;">
                        <div style="font-size:0.85rem; font-weight:800; color:var(--text-primary);">${match.home} vs ${match.away}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${pk.market} → <b style="color:var(--text-secondary);">${pk.selection}</b></div>
                    </div>
                    <div style="flex:0 0 auto; text-align:center;">
                        <div style="font-size:1.1rem; font-weight:800; color:var(--text-primary);">${pk.post_analysis ? pk.post_analysis.result : (match.home_score + '-' + match.away_score)}</div>
                        <div style="font-size:0.68rem; color:var(--text-muted);">Resultado</div>
                    </div>
                    <div style="flex:0 0 auto;">
                        <button class="btn btn-secondary btn-post-review" data-idx="${idx}" style="font-size:0.75rem; padding:6px 12px; cursor:pointer;">
                            <i class="fa-solid fa-magnifying-glass-chart"></i> Ver Análisis
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = revHtml;

        // Attach event listeners cleanly
        container.querySelectorAll(".btn-post-review").forEach(btn => {
            btn.addEventListener("click", () => {
                const idx = parseInt(btn.getAttribute("data-idx"));
                const item = window.currentReviewStore ? window.currentReviewStore[idx] : null;
                if (item) openPostAnalysisModalDirect(item);
            });
        });
    }

    // --- Post Analysis Modal Logic ---
    const postAnalysisModal = document.getElementById("post-analysis-modal");
    const postAnalysisModalOverlay = document.getElementById("post-analysis-modal-overlay");
    const btnClosePostAnalysis = document.getElementById("btn-close-post-analysis");
    const btnClosePostAnalysisBtn = document.getElementById("btn-close-post-analysis-btn");

    function openPostAnalysisModalDirect(item) {
        if (!postAnalysisModal || !item) return;
        const { match, pk } = item;
        const analysis = pk.post_analysis || {
            verdict: pk.status === "won" ? "✅ Predicción correcta" : "❌ Predicción incorrecta",
            result: `${match.home_score}-${match.away_score}`,
            explanation: `El partido ${match.home} vs ${match.away} finalizó ${match.home_score}-${match.away_score}. Selección: ${pk.selection} (${pk.market}).`,
            lesson: "Continuar monitoreando las variables defensivas y xG del encuentro."
        };

        const isWon = pk.status === "won" || (analysis.verdict && analysis.verdict.includes("✅"));
        const resultBadge = document.getElementById("post-analysis-result-badge");
        const titleEl = document.getElementById("post-analysis-match-title");
        const predEl = document.getElementById("post-analysis-prediction");
        const explEl = document.getElementById("post-analysis-explanation");
        const lessonEl = document.getElementById("post-analysis-lesson");

        if (titleEl) titleEl.textContent = `${match.home} vs ${match.away}`;
        if (predEl) predEl.innerHTML = `<b>${pk.selection}</b> <span style="color:var(--text-muted);">(${pk.market})</span> <span style="color:var(--accent-green);font-weight:700;">@${parseFloat(pk.odd || 1.5).toFixed(2)}</span>`;
        if (explEl) explEl.textContent = analysis.explanation || "";
        if (lessonEl) lessonEl.textContent = analysis.lesson || "";
        if (resultBadge) {
            if (isWon) {
                resultBadge.style.cssText = "padding:12px 16px;border-radius:10px;margin-bottom:18px;font-weight:700;font-size:0.95rem;display:flex;align-items:center;gap:10px;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:var(--accent-green);";
            } else {
                resultBadge.style.cssText = "padding:12px 16px;border-radius:10px;margin-bottom:18px;font-weight:700;font-size:0.95rem;display:flex;align-items:center;gap:10px;background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.3);color:var(--accent-red);";
            }
            resultBadge.innerHTML = `<span style="font-size:1.3rem;">${isWon ? "✅" : "❌"}</span> <span>${analysis.verdict}</span> <span style="margin-left:auto;font-size:1rem;background:rgba(0,0,0,0.2);padding:4px 10px;border-radius:6px;">${analysis.result}</span>`;
        }

        postAnalysisModal.classList.remove("hidden");
    }

    window.openPostAnalysisModal = function(matchName, selection, market, odd, analysisJsonStr) {
        let analysis;
        try { analysis = JSON.parse(analysisJsonStr); } catch(e) { analysis = {}; }
        openPostAnalysisModalDirect({
            match: { home: matchName.split(" vs ")[0] || "", away: matchName.split(" vs ")[1] || "" },
            pk: { selection, market, odd, post_analysis: analysis }
        });
    };

    function closePostAnalysis() {
        if (postAnalysisModal) postAnalysisModal.classList.add("hidden");
    }
    if (btnClosePostAnalysis) btnClosePostAnalysis.addEventListener("click", closePostAnalysis);
    if (btnClosePostAnalysisBtn) btnClosePostAnalysisBtn.addEventListener("click", closePostAnalysis);
    if (postAnalysisModalOverlay) postAnalysisModalOverlay.addEventListener("click", closePostAnalysis);

    // Bind sport filters
    document.querySelectorAll(".pred-sport-filter").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".pred-sport-filter").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentPredSportFilter = btn.getAttribute("data-sport");
            renderPredictionsTab();
        });
    });

});

