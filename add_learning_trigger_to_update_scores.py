with open("backend/update_scores.py", "r", encoding="utf-8") as f:
    us_code = f.read()

import re

old_finish_block = """    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[INFO] Proceso de actualización finalizado. Partidos procesados: {len(matches)}.")"""

new_finish_block = """    # Actualizar Base de Datos de Aprendizaje Autónomo Persistente
    try:
        from backend.data_generator import update_learning_database
        db_stats = update_learning_database(matches)
        print(f"[INFO] Base de Aprendizaje Autónomo actualizada: {db_stats.get('total_graded_picks', 0)} picks acumulados, {db_stats.get('total_won', 0)} ganados, {db_stats.get('total_lost', 0)} perdidos.")
    except Exception as e:
        print(f"[!] Error al actualizar aprendizaje en update_scores: {e}")

    with open(data_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[INFO] Proceso de actualización finalizado. Partidos procesados: {len(matches)}.")"""

if old_finish_block in us_code:
    us_code = us_code.replace(old_finish_block, new_finish_block)
    with open("backend/update_scores.py", "w", encoding="utf-8") as f:
        f.write(us_code)
    print("backend/update_scores.py updated with persistent learning trigger: OK")
