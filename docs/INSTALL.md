# Install Luma Home on a Samsung TV

This installs the web app as an ordinary TV app. It does **not** change the remote's Home button. The commands below use PowerShell and were exercised with Tizen Studio on the tested [S95B and firmware](../README.md#what-is-verified).

## 1. Prepare the TV and signing profile

1. Install [Tizen Studio, Samsung TV Extension and Samsung Certificate Extension](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html). Put Tizen Studio's `tools/ide/bin` and `tools` directories on `PATH`, or call `tizen.bat` and `sdb.exe` by their full paths.
2. Put the TV and PC on the same network. On the TV, open **Apps**, enter **12345** with the remote, enable Developer Mode, enter the **PC's** local IP address and restart the TV. Samsung documents the [device connection steps](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html).
3. In Tizen Studio **Tools → Certificate Manager**, create a **Samsung → TV** profile, sign in with your Samsung Developer account and add this TV's DUID to the distributor certificate. Samsung's [certificate guide](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html) explains where to find the DUID. Record the profile name. Keep the certificate files and password outside the repo and back up the author certificate for updates.

## 2. Connect, package and install

Clone the repo, then run the following from its root. Replace the example IP and profile name. `sdb devices` must show your connected TV; use its reported serial if it differs from `IP:26101`.

```powershell
$tvIp = '192.168.1.100'           # replace with your TV's local IP
$tvSerial = "${tvIp}:26101"      # check against `sdb devices`
$profile = 'YOUR_TV_PROFILE'      # your Certificate Manager profile name

sdb connect $tvSerial
sdb devices
tizen package -t wgt -s $profile -- app
Copy-Item 'app/Luma Home.wgt' 'app/LumaHome.wgt' -Force
tizen install -s $tvSerial -n LumaHome.wgt -- app
tizen run -s $tvSerial -p LumaTV2026.LumaHome
```

The package command's output identifies the actual `.wgt` filename. If it is different, change the `Copy-Item` source. The short target filename avoids the Tizen CLI's trouble with spaces. `.wgt` files are ignored by Git.

On the TV, confirm that Luma opens, a tile launches an installed app and **Samsung Home öffnen** returns to the original Smart Hub. Then add Luma to Samsung's start bar for **Home → OK**. This is a complete, reversible setup without native changes.

## 3. Use the app picker

Choose **Apps auswählen** or **Apps ändern**. The checked apps at the top are the current favorites; press **OK** on one to remove it. To search, move **Up** from the first app to **App suchen**, press **OK**, type, then close the Samsung keyboard with **Done** or **Back**. Focus returns to the first result. **Back** from the picker returns to Luma.

The picker only lists installed apps whose names the TV reports. It hides unnamed entries and entries named only “App”. Up to seven favorites fit on the home screen. The three example favorites match YouTube, Netflix and Spotify by name; an app appears only if installed.

## Updating Luma

After changing `app/`, increase the version in [`app/config.xml`](../app/config.xml), package again and install with the **same author certificate** and application ID. This is how the tested TV was updated through version 1.2. Keep the author certificate backed up; Samsung notes that a different author certificate may make an update appear as a different app.

If the Home button has been mapped to Luma, **restore Samsung Home before uninstalling Luma**. See [`HOME-BUTTON.md`](HOME-BUTTON.md).

## If installation fails

| Symptom | Check |
| --- | --- |
| `sdb devices` is empty | TV and PC are on the same network; Developer Mode has the PC IP; TV has restarted; try Device Manager. |
| Package cannot be signed or installed | Samsung TV certificate profile is selected, its distributor certificate includes this TV's DUID, and the package is signed with it. |
| An update is rejected | Use the original author certificate and unchanged application ID. |
| App picker is empty | Check that apps are installed and visible in Samsung Apps; the picker filters unnamed and generic “App” entries. |
| Search appears to trap remote focus | Use version 1.2 or later: **Up** marks a button, **OK** opens the keyboard, **Down** returns to apps. |

Samsung's [Tizen Studio FAQ](https://developer.samsung.com/smarttv/develop/faq/tizen-studio.html) has further installation checks.
