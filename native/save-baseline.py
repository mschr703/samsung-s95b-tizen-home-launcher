"""Convert this TV's successful read-only Query output to a private baseline."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
source = ROOT / "private" / "query-output.txt"
destination = ROOT / "private" / "original.json"
text = source.read_text(encoding="utf-8")
body = text.split("QUERY_BEGIN\n", 1)[1].split("\nQUERY_END", 1)[0]
values = dict(line.split("=", 1) for line in body.splitlines() if "=" in line)
if values.get("uid") != "901" or values.get("architecture_bits") != "32":
    raise SystemExit("Platform guard mismatch")
if values.get("firmware_guard") != "matched" or values.get("launcher_boot_supported") != "1":
    raise SystemExit("Firmware or launcher eligibility mismatch")
if values.get("home_operation") != "com.samsung.tv.csfs":
    raise SystemExit("Unexpected original Home operation")
keys = (
    "db/appfw/home_appid",
    "db/appfw/startup_appid",
    "db/appfw/booting_appid_backup",
    "db/first_screen/type",
)
if values.get(keys[0]) != "com.samsung.tv.csfs":
    raise SystemExit("Unexpected original Home preference")
if any(not values.get(key) for key in keys):
    raise SystemExit("Missing original preference")
auto = values.get("db/menu/smart_hub/ontvsetting/auto_start")
if auto not in ("0", "1"):
    raise SystemExit("Invalid original auto_start")
snapshot = {
    "Home": values["home_operation"],
    "Strings": {key: values[key] for key in keys},
    "Autostart": int(auto),
}
destination.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
print("Saved original values to", destination)
