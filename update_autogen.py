import re

for filepath in ['main.js', 'frontend/main.js']:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Automatic check and auto-generation if appData.date is older than today
    old_load = '''            if (!fetchedData) {
                throw new Error("No se pudo cargar el archivo data.json desde ninguna fuente");
            }
            appData = fetchedData;'''

    new_load = '''            if (!fetchedData) {
                throw new Error("No se pudo cargar el archivo data.json desde ninguna fuente");
            }
            appData = fetchedData;

            // Auto-generar datos de HOY si los cargados corresponden a un día anterior
            const nowTime = new Date();
            const ecuadorNow = new Date(nowTime.getTime() - (5 * 60 * 60 * 1000));
            const todayStr = ecuadorNow.toISOString().split("T")[0];

            if (appData && appData.date && appData.date !== todayStr && !window._isAutoGeneratingToday) {
                window._isAutoGeneratingToday = true;
                console.log([AutoGen] Detectados datos desactualizados ( vs ). Generando pronósticos de hoy...);
                try {
                    setSyncStatus("syncing", "Generando hoy...");
                    await fetch("/api/generate");
                    const freshRes = await fetch(/api/data?v=);
                    if (freshRes.ok) {
                        const freshData = await freshRes.json();
                        if (freshData && freshData.date === todayStr) {
                            appData = freshData;
                            console.log("[AutoGen] ¡Pronósticos de hoy cargados con éxito!");
                        }
                    }
                } catch (e) {
                    console.error("[AutoGen] Error al auto-generar datos de hoy:", e);
                } finally {
                    window._isAutoGeneratingToday = false;
                    setSyncStatus("ok", "Mercado Actualizado ✓");
                }
            }'''

    content = content.replace(old_load, new_load)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated auto-generation logic in JS files successfully")
