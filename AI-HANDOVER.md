# AI handover: Luma Home on Samsung S95B

Give this file and the repo to an assistant if you want to install, adapt, troubleshoot or restore Luma. Start with the ordinary [installation guide](docs/INSTALL.md); the [Home button guide](docs/HOME-BUTTON.md) is a separate optional procedure. This is a **tested case**, not a general Samsung TV procedure.

Copyable request for another assistant:

> Read this repository's README, `docs/INSTALL.md`, `docs/HOME-BUTTON.md` and `AI-HANDOVER.md` before changing anything. My TV model and firmware are [fill these in]. Help me [install / customize / map Home / restore Home]. Start with the ordinary app unless I specifically request native Home mapping. Keep my certificate, DUID, serial, IP and native baseline private. Do not assume the native helper supports my device; check its guards and obtain my original values. Give me one stage at a time with its expected output and recovery step. Do not run `apply` until the baseline and no-op restore have passed.

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

The owner tested the 1.2 app logic on the TV with personal greetings and favorites. The public source changes only those example strings and the browser preview's sample apps; it built as a signed `.wgt` but was not installed over the owner's personalized setup. Power-on startup, native recovery after a changed state, and operation on another model or firmware are **not verified**.

## First-time setup facts for an assistant

Use [`docs/INSTALL.md`](docs/INSTALL.md) for the full walk-through. When guiding a new owner, check these distinct stages in order:

1. Install Tizen Studio, **TV Extensions**, and **Samsung Certificate Extension 2.0.73 or later**. Check that `tizen` and `sdb` resolve in a new terminal, or use their full paths.
2. On the original Samsung Smart Hub, open **Apps → App Settings** and enter **12345** with the remote or its on-screen number keypad. Set **Developer mode** to **On**, enter the **computer's local IP**, reboot, and verify that **Develop Mode** appears in Apps.
3. Create a **Samsung → TV** certificate profile with an author certificate and a distributor certificate containing the **TV's DUID**. Keep the author certificate and password private. Use the original author certificate for later updates.
4. Run `sdb connect <TV-IP>:26101`, then `sdb devices`. Continue only when the TV has status `device`. The **TV IP** belongs in this command; it is different from the **computer IP** entered on the TV.
5. Package and install the ordinary web app first, then test a tile and **Samsung Home öffnen**. Only consider the separate native Home mapping after these paths work.

Samsung's [TV device](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html), [SDK installation](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html) and [certificate](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html) guides are the primary references. TV menus can differ by region and firmware; use the on-screen labels when they differ from this case.

## Find the right file

| Goal | File / action |
| --- | --- |
| Change greeting or starter apps | `app/main.js`: `GREETINGS`, `DEFAULT_NAMES` |
| Install or update the web app | `docs/INSTALL.md` |
| Understand Home mapping and recovery | `docs/HOME-BUTTON.md` |
| Change visual design, spacing or animations | `app/style.css`, `app/rainforest-bg.png` |
| Change the application ID | `app/config.xml` (`id`, `package`), `native/Control.cs` (`Target`, `TargetPackage`), `native/Query.cs` (`TargetApp`) together |
| Read current native Home/start values | Build `native/Query.csproj`, run `native/query.py query` |
| Save original per-TV values | `native/save-baseline.py` → ignored `native/private/original.json` |
| Compare live values to baseline | `native/query.py verify` |
| Map physical Home to Luma | `native/control.py apply` after all guards and baseline checks |
| Restore original Samsung Home | `native/control.py restore`, then `native/query.py query` |

The public app ships with generic examples: `Hallo Alex`, `Hallo Sam`, `Willkommen zu Hause`, plus YouTube, Netflix and Spotify as initial name matches. The tested owner's personal names and chosen app list are **not** in this repo. Change `GREETINGS` and `DEFAULT_NAMES` in `app/main.js` for your own examples; installed-app discovery still decides which tiles exist. Defaults apply only when no favorites have been saved. Existing selections live in TV `localStorage` under `luma-pinned-v2` and should be edited through the picker rather than overwritten by a source update.

## Problems encountered and fixes

| Symptom | Cause or useful finding | Working approach |
| --- | --- | --- |
| Pressing the remote Home button still opens Samsung Home | Pinning a web app only provides **Home → OK**; startup preferences do not change the remote key target. | Install and test Luma normally, then use the guarded native method in `docs/HOME-BUTTON.md` only on the matching device. |
| App picker freezes after pressing OK | Earlier modal/list versions (0.6–0.9) were unreliable on this TV; repeated Enter events also caused accidental selection. | Version 1.0 moved the picker to a lightweight full-screen view, pages nine items at a time and suppresses duplicate OK actions. |
| A tile shows only “App” or an `A` icon | The TV reports some generic app records with no useful display name. | Version 1.1 drops unnamed records and those named only “App”; saved favorites pointing to missing records are pruned. |
| Search grabs focus when reached with Up | Focusing an input can open Samsung's on-screen keyboard and trap the remote in IME navigation. | Version 1.2 uses a separate search **button**: Up/Down navigate normally; OK focuses the input and opens the keyboard. Done/Cancel returns focus to a result. |
| Changing `DEFAULT_NAMES` does not update the TV's current tiles | The list is used only when `luma-pinned-v2` is absent; later selections are persisted in `localStorage`. | Use **Apps auswählen** to change favorites on an already configured TV. Do not clear all app storage just to change examples. |
| YouTube icon is missing or odd | The TV-provided icon did not load reliably in this app. | Luma renders the YouTube play symbol in CSS as a stable fallback. |
| Animations or background feel slow | Earlier visual effects were too expensive on the TV. | Use the bundled static image and short opacity/transform transitions; avoid heavy filters or video backgrounds. |

The physical picker and search fixes above were confirmed by the owner on the tested S95B. Do not assume the same behavior on another model without testing its remote and keyboard.

In `app/main.js`, the picker uses `tizen.application.getAppsInfo()` and launches a selected ID with `tizen.application.launch()`. It filters `app.show`, missing names and names equal to “App”; selected IDs are ordered first. Keep the search trigger as a button separate from the text input. Samsung's IME uses Done/Cancel key codes `65376`/`65385`; the input's `keydown` must not call `preventDefault()` or text editing can break. The UI can be previewed in a desktop browser, but remote and IME behavior must be checked on the TV. No VolumeMute long-press or sleep-timer feature is included.

## Why the web app alone did not replace Home

Tizen's public JavaScript Application API can enumerate apps and launch an app. It has no public API to make a web app the system target of the remote's Home button. Pinning Luma in the Samsung bar only gives **Home → OK**. Disabling Smart Hub on power-on or enabling “last app” affects startup, not the Home key.

On this S95B, direct Home needed two native values, both changed from `com.samsung.tv.csfs` to `LumaTV2026.LumaHome`:

1. Default app for `http://tizen.org/appcontrol/operation/main`, read with `aul_get_default_app`, written with `app_operation_set_current_app` from `libcapi-appfw-app-operation-tv.so.0`.
2. Vconf string `db/appfw/home_appid`, read and written with `libvconf.so.0`.

`native/Control.cs` reads each value back after writing and attempts rollback on partial failure. It leaves `db/appfw/startup_appid`, `db/appfw/booting_appid_backup`, `db/first_screen/type` and `db/menu/smart_hub/ontvsetting/auto_start` unchanged. On this particular TV the first two were `org.tizen.tv-viewer`, `db/first_screen/type` was `com.samsung.tv.csfs`, and `auto_start` was `0`. **Read and save your own TV's values; do not copy these as your baseline.**

## Reproduction sequence

1. Inspect the device model and firmware first. The scripts refuse a model other than `QE55S95BATXXH`; the managed helpers refuse firmware other than `T-PTMDEUC-1720.7`, 64 bit or a UID other than 901. Do not remove guards to try another TV. Research it separately.
2. Install and open the signed Luma web app as a normal Tizen app. Confirm it launches other apps and that **Samsung Home öffnen** returns to an operable original Smart Hub. Do not change native Home if either path fails.
3. On the PC, have Python 3, Tizen SDB, and a .NET SDK that can publish `netcoreapp3.1` assemblies. From the repo root in PowerShell, replace the example IP and SDB path. Stop if `dotnet publish` fails or `sdb devices` does not list the TV:

   ```powershell
   $env:TV_IP = '192.168.1.100' # replace with your TV's local IP
   $env:SDB_PATH = 'C:\tizen-studio\tools\sdb.exe' # adjust for your installation
   $serial = $env:TV_IP + ':26101'
   & $env:SDB_PATH connect $serial
   & $env:SDB_PATH devices
   dotnet --list-sdks
   dotnet publish native/Query.csproj -c Release -o native/out/query
   dotnet publish native/Control.csproj -c Release -o native/out/control
   python native/query.py query
   ```

4. Review `native/private/query-output.txt` before saving anything. The exact-match query must include these lines while Samsung Home is still the default; compare the other startup values against this TV, not an example from another device:

   ```text
   firmware_guard=matched
   home_operation=com.samsung.tv.csfs
   db/appfw/home_appid=com.samsung.tv.csfs
   launcher_boot_supported=1
   ```

   Then save and verify the per-TV baseline:

   ```powershell
   python native/save-baseline.py
   python native/query.py verify
   ```

   Inspect and back up `native/private/original.json` **outside the repo**. `verify` must print `LUMA_BASELINE_MATCH`. The helper checks required keys and refuses a baseline that was not captured from the original Samsung mapping.
5. While the TV still has its original mapping, check the PC restore route:

   ```powershell
   python native/control.py restore
   python native/query.py query
   ```

   Require `LUMA_RESTORED` and both Home values still equal `com.samsung.tv.csfs`. This checks transport and parsing but **does not prove recovery from a modified state**.
6. After explicit device-owner authorization for the native change, apply and immediately read back:

   ```powershell
   python native/control.py apply
   python native/query.py query
   ```

   Require `LUMA_APPLIED`. The query must now include:

   ```text
   home_operation=LumaTV2026.LumaHome
   db/appfw/home_appid=LumaTV2026.LumaHome
   ```

   Saved startup, first-screen and auto-start values must remain identical to the baseline. If a callback times out, query the TV before any retry.
7. Test the physical remote from at least two non-Luma apps. Test the button in Luma back to Samsung Home. Keep the baseline and signing certificate. Do not uninstall Luma while Home points to it.

The Python runners stage temporary shell/managed files on the TV using an **undocumented SDB command transport** adapted from [chaosmanage/samsung-tv-launcher](https://github.com/chaosmanage/samsung-tv-launcher). The original device-bound runners worked on the single TV above; the public copies were sanitized and have not been run against a second TV. A firmware update could change behavior. If a callback times out, the outcome is uncertain: **query the TV before any retry**.

### Outputs an assistant should check

| Command | Local artifact or success marker | What it means |
| --- | --- | --- |
| `python native/query.py query` | `native/private/query-output.txt`, containing `QUERY_BEGIN` / `QUERY_END` | Read-only native values were returned; inspect the values themselves. |
| `python native/save-baseline.py` | `native/private/original.json` | This TV's original values were captured; back up the file privately. |
| `python native/query.py verify` | `LUMA_BASELINE_MATCH` | Live values match the saved original before applying. |
| `python native/control.py restore` | `LUMA_RESTORED` | Restore helper completed; run a fresh query to confirm both Home values. |
| `python native/control.py apply` | `LUMA_APPLIED` | Apply helper completed; run a fresh query to confirm both Home values and unchanged startup settings. |

A missing marker, callback timeout or partial output is **not** proof that a write did or did not happen. Inspect the private output and query the TV before deciding on another command.

## Recovery

If Home acts unexpectedly while SDB still connects, use the saved baseline and inspect state before the restore:

```powershell
python native/query.py query
python native/control.py restore
python native/query.py query
```

Confirm `LUMA_RESTORED` and both Home values back at the saved Samsung IDs. Keep the TV running and avoid deleting Luma until Home again maps to Samsung. The original Samsung interface can also be opened from Luma with its on-screen button. A real restore after a changed state was not needed in the tested session; only a no-op restore from the original state was tested.

## Related sources

- [Samsung Tizen Application API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/application-api.html) for app discovery/launch.
- [Samsung remote control guide](https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html) for key events.
- [Samsung Keyboard/IME guide](https://developer.samsung.com/smarttv/develop/guides/user-interaction/keyboardime.html) for the on-screen keyboard, Done/Cancel codes and input event handling.
- [Arn0 TV setup](https://github.com/NelsonEU/arn0-tv/blob/main/docs/setup-tv.md), the native Home mapping reference (MIT).
- [Samsung TV Launcher native transport](https://github.com/chaosmanage/samsung-tv-launcher), the SDB transport reference (MIT).
