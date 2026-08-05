import subprocess

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("Adding all files...")
run("git add -A")
print("Committing audited real-world scores & universal score extractor with v19.0 cache buster...")
run('git commit -m "Audit real-world scores: add universal ESPN linescores extractor for Tennis & Basketball, update data.json with exact real scores (2-0, 2-1, etc.), and bump cache buster to v19.0"')

print("Fetching origin main...")
run("git fetch origin main")

print("Rebasing on origin/main...")
res = run("git rebase origin/main")
print(res.stdout, res.stderr)

if "CONFLICT" in res.stdout or "CONFLICT" in res.stderr:
    print("Resolving conflicts...")
    run("git checkout --ours frontend/data.json data.json backend/event_cache.json")
    run("git add -A")
    res2 = run("set GIT_EDITOR=true && git rebase --continue")
    print(res2.stdout, res2.stderr)

print("Pushing to origin main...")
push_res = run("git push origin main")
print(push_res.stdout, push_res.stderr)
