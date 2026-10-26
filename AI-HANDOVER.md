# AI handover: Luma Home on Samsung S95B

Give this file and the repo to an assistant if you want to install, adapt, troubleshoot or restore Luma. Start with the ordinary [installation guide](docs/INSTALL.md); the [Home button guide](docs/HOME-BUTTON.md) is a separate optional procedure. This is a **tested case**, not a general Samsung TV procedure.

Copyable request for another assistant:

> Read this repository's README, `docs/INSTALL.md`, `docs/HOME-BUTTON.md` and `AI-HANDOVER.md` before changing anything. My TV model and firmware are [fill these in]. Help me [install / customize / map Home / restore Home]. Keep my certificate, DUID, serial, IP and native baseline private. Do not assume the native helper supports my device; check its guards and obtain my original values. Explain the exact next step and how to verify or undo it.

## Device and verified result

| Item | Tested value |
| --- | --- |
| Model | `QE55S95BATXXH`, Samsung S95B |
| Firmware | `T-PTMDEUC-1720.7` |
| Platform | Tizen 6.5, ARMv7 / 32 bit, SDK UID 901 |
| Launcher ID | `LumaTV2026.LumaHome` (`app/config.xml`) |
| Original Samsung Home ID | `com.samsung.tv.csfs` |
| Luma version | `1.2.0` on the tested TV |
| Physical tests | YouTube → Home → Luma; Netflix → Home → Luma; Luma → Samsung Home button → original Smart Hub; picker select/unselect and Back; selected-first list; search button, keyboard, filtered results and return navigation |

The TV's serial, DUID, local IP, signing certificate, and saved native baseline are intentionally absent. Obtain each from the owner/device. Do not put them in Git.

## Find the right file

| Goal | File / action |
| --- | --- |
| Change greeting or starter apps | `app/main.js`: `GREETINGS`, `DEFAULT_NAMES` |
| Install or update the web app | `docs/INSTALL.md` |
| Understand Home mapping and recovery | `docs/HOME-BUTTON.md` |
| Change visual design, spacing or animations | `app/style.css`, `app/rainforest-bg.png` |
| Change the application ID | `app/config.xml`, `native/Control.cs`, `native/Query.cs` together |
| Read current native Home/start values | Build `native/Query.csproj`, run `native/query.py query` |
| Save original per-TV values | `native/save-baseline.py` → ignored `native/private/original.json` |
| Compare live values to baseline | `native/query.py verify` |
| Map physical Home to Luma | `native/control.py apply` after all guards and baseline checks |
| Restore original Samsung Home | `native/control.py restore`, then `native/query.py query` |

The public app ships with generic examples: `Hallo Alex`, `Hallo Sam`, `Willkommen zu Hause`, plus YouTube, Netflix and Spotify as initial name matches. The tested owner's personal names and chosen app list are **not** in this repo. Change only `app/main.js` for your own examples; installed-app discovery still decides which tiles exist.

## Problems encountered and fixes

| Symptom | Cause or useful finding | Working approach |
| --- | --- | --- |
| Pressing the remote Home button still opens Samsung Home | Pinning a web app only provides **Home → OK**; startup preferences do not change the remote key target. | Install and test Luma normally, then use the guarded native method in `docs/HOME-BUTTON.md` only on the matching device. |
| App picker freezes after pressing OK | Earlier modal/list versions (0.6–0.9) were unreliable on this TV; repeated Enter events also caused accidental selection. | Version 1.0 moved the picker to a lightweight full-screen view, pages nine items at a time and suppresses duplicate OK actions. |
| A tile shows only “App” or an `A` icon | The TV reports some generic app records with no useful display name. | Version 1.1 drops unnamed records and those named only “App”; saved favorites pointing to missing records are pruned. |
| Search grabs focus when reached with Up | Focusing an input can open Samsung's on-screen keyboard and trap the remote in IME navigation. | Version 1.2 uses a separate search **button**: Up/Down navigate normally; OK focuses the input and opens the keyboard. Done/Cancel returns focus to a result. |
| YouTube icon is missing or odd | The TV-provided icon did not load reliably in this app. | Luma renders the YouTube play symbol in CSS as a stable fallback. |
| Animations or background feel slow | Earlier visual effects were too expensive on the TV. | Use the bundled static image and short opacity/transform transitions; avoid heavy filters or video backgrounds. |

The physical picker and search fixes above were confirmed by the owner on the tested S95B. Do not assume the same behavior on another model without testing its remote and keyboard.

## Why the web app alone did not replace Home

Tizen's public JavaScript Application API can enumerate apps and launch an app. It has no public API to make a web app the system target of the remote's Home button. Pinning Luma in the Samsung bar only gives **Home → OK**. Disabling Smart Hub on power-on or enabling “last app” affects startup, not the Home key.

On this S95B, direct Home needed two native values, both changed from `com.samsung.tv.csfs` to `LumaTV2026.LumaHome`:

1. Default app for `http://tizen.org/appcontrol/operation/main`, read with `aul_get_default_app`, written with `app_operation_set_current_app` from `libcapi-appfw-app-operation-tv.so.0`.
2. Vconf string `db/appfw/home_appid`, read and written with `libvconf.so.0`.

`native/Control.cs` reads each value back after writing and attempts rollback on partial failure. It leaves `db/appfw/startup_appid`, `db/appfw/booting_appid_backup`, `db/first_screen/type` and `db/menu/smart_hub/ontvsetting/auto_start` unchanged. On this particular TV the first two were `org.tizen.tv-viewer`, `db/first_screen/type` was `com.samsung.tv.csfs`, and `auto_start` was `0`. **Read and save your own TV's values; do not copy these as your baseline.**

## Reproduction sequence

1. Inspect the device model and firmware first. The scripts refuse a model other than `QE55S95BATXXH`; the managed helpers refuse firmware other than `T-PTMDEUC-1720.7`, 64 bit or a UID other than 901. Do not remove guards to try another TV. Research it separately.
2. Install and open the signed Luma web app as a normal Tizen app. Confirm it launches other apps and that **Samsung Home öffnen** returns to an operable original Smart Hub. Do not change native Home if either path fails.
3. On the PC, have Python 3, Tizen SDB, and a .NET SDK that can publish `netcoreapp3.1` assemblies. PowerShell example:

   ```powershell
   dotnet publish native/Query.csproj -c Release -o native/out/query
   dotnet publish native/Control.csproj -c Release -o native/out/control
   $env:TV_IP = 'YOUR_TV_LOCAL_IP'
   $env:SDB_PATH = 'C:\tizen-studio\tools\sdb.exe'
   python native/query.py query
   ```

4. Review `native/private/query-output.txt` for the exact model's original values. Run `python native/save-baseline.py`; inspect and back up `native/private/original.json` **outside the repo**. The helper only accepts an original Samsung Home mapping and checks the required keys. Then run `python native/query.py verify` and confirm `LUMA_BASELINE_MATCH`.
5. Prepare a PC restore route and confirm that `python native/control.py restore` completes while the TV is still in its original state. This checks transport and parsing but **does not prove a restore from a modified state**.
6. After explicit device-owner authorization for the native change, run `python native/control.py apply`. Require `LUMA_APPLIED` plus immediate `python native/query.py query` readback: both Home values must equal the installed launcher ID, while saved startup and autostart values remain identical.
7. Test the physical remote from at least two non-Luma apps. Test the button in Luma back to Samsung Home. Keep the baseline and signing certificate. Do not uninstall Luma while Home points to it.

The Python runners stage temporary shell/managed files on the TV using an **undocumented SDB command transport** adapted from [chaosmanage/samsung-tv-launcher](https://github.com/chaosmanage/samsung-tv-launcher). The original device-bound runners worked on the single TV above; the public copies were sanitized and have not been run against a second TV. A firmware update could change behavior. If a callback times out, the outcome is uncertain: **query the TV before any retry**.

## Recovery

If Home acts unexpectedly while SDB still connects, run `python native/query.py query`, then `python native/control.py restore`; confirm `LUMA_RESTORED` and read back with `python native/query.py query`. Keep the TV running and avoid deleting the app until Home again maps to Samsung. The original Samsung interface can also be opened from Luma with its on-screen button. A real restore after a changed state was not needed in the tested session; only a no-op restore from the original state was tested.

## Related sources

- [Samsung Tizen Application API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/application-api.html) for app discovery/launch.
- [Samsung remote control guide](https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html) for key events.
- [Arn0 TV setup](https://github.com/NelsonEU/arn0-tv/blob/main/docs/setup-tv.md), the native Home mapping reference (MIT).
- [Samsung TV Launcher native transport](https://github.com/chaosmanage/samsung-tv-launcher), the SDB transport reference (MIT).
