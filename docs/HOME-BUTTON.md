# Optional: make the remote Home button open Luma

Luma can be used without this procedure. The native helper below is for the **Samsung QE55S95BATXXH (S95B), firmware T-PTMDEUC-1720.7** that was inspected and tested. It uses an undocumented Tizen mechanism and an undocumented SDB command transport. The scripts contain exact model, firmware, architecture and UID guards. Do not remove those guards to try another TV or firmware.

**Keep the original Samsung Home available.** Luma has a **Samsung Home öffnen** button, and the steps below save the device's original native values so they can be restored from the PC. The restored path was checked while the TV still had its original mapping; a recovery from a broken changed state was not needed in the tested session.

## Before changing anything

1. Complete [`INSTALL.md`](INSTALL.md). Verify Luma can launch an app and its **Samsung Home öffnen** button opens a usable original Smart Hub.
2. Have Python 3, `sdb`, and a .NET SDK capable of publishing `netcoreapp3.1` projects. The scripts are designed for a Windows PC with Tizen Studio; `SDB_PATH` can point elsewhere.
3. Keep the TV powered on and connected to the network. Back up its signing certificate and the baseline created below in a private location outside this repo.

## Read and save this TV's original state

From the repository root in PowerShell:

```powershell
dotnet publish native/Query.csproj -c Release -o native/out/query
dotnet publish native/Control.csproj -c Release -o native/out/control

$env:TV_IP = '192.168.1.100'                 # replace with your TV's IP
$env:SDB_PATH = 'C:\tizen-studio\tools\sdb.exe' # adjust if needed
python native/query.py query
```

Read `native/private/query-output.txt` and confirm the model/firmware guards passed and both Home values still refer to `com.samsung.tv.csfs`. Then:

```powershell
python native/save-baseline.py
python native/query.py verify
```

Inspect `native/private/original.json`. `verify` must print `LUMA_BASELINE_MATCH`. Copy that JSON to secure storage outside the repository. These files are ignored by Git and must remain private.

## Check the restore route, then apply

While the Home button still points to Samsung Home, run a no-op restore. This checks the transport and baseline parsing but does **not** simulate recovery after a changed mapping:

```powershell
python native/control.py restore
python native/query.py query
```

Confirm `LUMA_RESTORED` and both Home values still equal `com.samsung.tv.csfs`. Only then run:

```powershell
python native/control.py apply
python native/query.py query
```

Require `LUMA_APPLIED` and confirm the query shows `LumaTV2026.LumaHome` for **both** the main Home operation and `db/appfw/home_appid`. Confirm the saved startup and auto-start values did not change. The C# helper reads back each write and attempts rollback if a later step fails. If a callback times out or the result is unclear, **query the TV before retrying**.

Test the physical remote from at least two other apps: app → **Home** should show Luma. Then test **Samsung Home öffnen** in Luma. Do not uninstall Luma while the Home button maps to it.

## Restore the original Samsung Home mapping

With SDB still connected and `native/private/original.json` available:

```powershell
python native/query.py query
python native/control.py restore
python native/query.py query
```

Require `LUMA_RESTORED`; both Home values must match your saved Samsung baseline. Only after that should you uninstall Luma or remove its certificate. If the TV or SDB becomes unreachable, do not guess or copy baseline values from another device.

## What changes

The helper changes exactly two Home targets from `com.samsung.tv.csfs` to `LumaTV2026.LumaHome`: the default app for `http://tizen.org/appcontrol/operation/main` and the vconf string `db/appfw/home_appid`. It does not intentionally change startup, boot backup, first-screen or Smart Hub auto-start values. Read the implementation and device-specific guards in [`native/`](../native/), plus the technical notes in [`AI-HANDOVER.md`](../AI-HANDOVER.md).
