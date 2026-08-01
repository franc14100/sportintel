import subprocess
import os
import shutil

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("Actualizando datos y subiendo a Vercel/GitHub...")

os.environ['RAPIDAPI_KEY'] = 'DISABLED'
import backend.data_generator as dg
dg.generate_daily_sports_data()

# Sincronizar raíz
shutil.copy('frontend/data.json', 'data.json')
if os.path.exists('frontend/main.js'): shutil.copy('frontend/main.js', 'main.js')
if os.path.exists('frontend/index.html'): shutil.copy('frontend/index.html', 'index.html')

run("git add -A")
run('git commit -m "Deploy Handicap +0 +1.5 +2 -1 -1.5 options and Under Goals logic with v12.0"')
run("git fetch origin main")
res = run("git rebase origin/main")
if "CONFLICT" in res.stdout or "CONFLICT" in res.stderr:
    run("git checkout --ours frontend/data.json data.json backend/event_cache.json")
    run("git add -A")
    run("set GIT_EDITOR=true && git rebase --continue")

push_res = run("git push origin main")
print(push_res.stdout, push_res.stderr)
print("¡Despliegue v12.0 completado con éxito!")
