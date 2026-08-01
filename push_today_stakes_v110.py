import subprocess

def run(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

print("Adding all files...")
run("git add -A")
print("Committing today's dynamic confidence stakes with v11.0 cache buster...")
run('git commit -m "Update todays tickets with exact dynamic confidence-based stakes (T1: 8%, T2: 7%, T3: 7%, T4: 1%) and v11.0 cache bump"')

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
