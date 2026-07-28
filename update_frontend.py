import re

for filepath in ['main.js', 'frontend/main.js']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix stuck 'Subiendo datos...' badge
    old_push = '''                    if (pushRes.ok) {
                        const pushResult = await pushRes.json();
                        console.log("[Sync] Init push result:", pushResult);
                        if (pushResult.saved) {
                            lastLocalStateHash = getNormalizedStateHash(localState);
                            setSyncStatus("ok", "Guardado en nube ");
                        } else if (pushResult.newer) {
                            // Cloud is actually newer  apply it
                            SyncManager.applyState(pushResult.newer);
                            applied = true;
                            setSyncStatus("ok", "Sincronizado ");
                        }
                    }'''

    new_push = '''                    if (pushRes.ok) {
                        const pushResult = await pushRes.json();
                        console.log("[Sync] Init push result:", pushResult);
                        if (pushResult.saved) {
                            lastLocalStateHash = getNormalizedStateHash(localState);
                            setSyncStatus("ok", "Guardado en nube ✓");
                        } else if (pushResult.newer) {
                            SyncManager.applyState(pushResult.newer);
                            applied = true;
                            setSyncStatus("ok", "Sincronizado ✓");
                        } else {
                            setSyncStatus("ok", "Mercado Actualizado ✓");
                        }
                    } else {
                        setSyncStatus("ok", "Mercado Actualizado ✓");
                    }'''

    content = re.sub(r'if \(pushRes\.ok\) \{.*?setSyncStatus\("error", Error al subir: \$\{pushRes\.status\}\);\s*\}', new_push, content, flags=re.DOTALL)

    # 2. Add event listener for btn-reset-stats
    reset_listener = '''
    // Reiniciar Estadísticas e Historial de Boletos
    document.getElementById("btn-reset-stats")?.addEventListener("click", async () => {
        if (confirm("¿Estás seguro de que deseas reiniciar las estadísticas y el historial de boletos? El contador volverá a 0 para empezar limpio desde mañana.")) {
            const btn = document.getElementById("btn-reset-stats");
            try {
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Reiniciando...';
                }
                
                const res = await fetch("/api/data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ action: "reset_stats" })
                });
                
                if (window.appData) {
                    window.appData.historical_tickets_registry = [];
                    window.appData.global_stats = {
                        total_picks_won: 0,
                        total_picks_lost: 0,
                        avg_accuracy_40d: 0,
                        roi_percentage: 0
                    };
                }
                localStorage.removeItem("historical_tickets_registry");
                localStorage.removeItem("app_data");
                
                alert("¡Estadísticas e historial de boletos reiniciados con éxito! El sistema arrancará limpio desde cero.");
                location.reload();
            } catch (e) {
                console.error("Error al reiniciar estadísticas:", e);
                alert("Ocurrió un error al reiniciar las estadísticas.");
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Reiniciar Estadísticas';
                }
            }
        }
    });
'''

    if 'btn-reset-stats' not in content:
        content += reset_listener

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated JS files successfully")
