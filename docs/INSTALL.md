# Install Luma Home on a Samsung TV

This installs the web app as an ordinary TV app. It does **not** change the remote's Home button. The PowerShell commands below were exercised with Tizen Studio on the tested [S95B and firmware](../README.md#what-is-verified). Samsung's [TV device guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html) is the source for the Developer Mode steps.

## Before you start

- Connect the TV and computer to the same home network. Avoid a guest network that isolates devices from each other.
- Install [Tizen Studio](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html). In its **Package Manager → Extension SDK**, install **TV Extensions** and **Samsung Certificate Extension**. Use certificate extension **2.0.73 or later**; Samsung says earlier versions cannot create certificates after September 2025. Put Tizen Studio's `tools/ide/bin` and `tools` directories on `PATH`, or call `tizen.bat` and `sdb.exe` by their full paths. Open a **new** PowerShell window after changing `PATH`.
- Have a Samsung Developer account for the TV certificate. The account is used in Certificate Manager; credentials never belong in the repo.

Three values in this guide have different jobs:

| Value | Where to find it | Where it goes |
| --- | --- | --- |
| **PC/host IP** | Run `ipconfig` on Windows and find the IPv4 address of the active Wi-Fi or Ethernet adapter. | **Developer Mode popup on the TV.** Do not enter the TV IP here. |
| **TV IP** | TV **Settings → Connection → Network → Network Status → IP Settings**; labels can vary by region. | `sdb connect` and Tizen Device Manager on the PC. |
| **TV DUID** | TV **Menu → Support → Contact Samsung → Unique Device ID**, per Samsung's certificate guide. | Distributor certificate in Certificate Manager. It is not the serial number or an IP address. |

For example, if the PC is `192.168.1.50` and the TV is `192.168.1.100`, enter **`192.168.1.50` on the TV** and connect **to `192.168.1.100` from the PC**. These are examples, not values to copy to your own network.

## 1. Enable Developer Mode on the TV

1. Open the original Samsung **Home / Smart Hub**, then **Apps**. If Luma already owns the Home button, use **Samsung Home öffnen** in Luma first.
2. In **Apps**, scroll down to **App Settings**. Do this inside Samsung's Apps screen, before entering any digits. While **App Settings** is selected, enter **1 2 3 4 5** in sequence. A traditional remote has number keys. On a slim Samsung Smart Remote, open its **123/number keypad** and use the on-screen digits. You should now see a **Developer mode** configuration popup. The [Samsung TV device guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html) shows the panel and popup.
3. In the **Developer mode** popup, set the switch to **On**. Enter the **PC's local IPv4 address** from the table above, then choose **OK**. This is the computer that will send the app to the TV.
4. Restart the TV as prompted. Open **Apps** again and check that **Develop Mode** appears near the top. If it does not, return to the popup and check the switch and PC IP. On TVs with Samsung Instant On, Samsung says a full power cycle may be needed for the restart to take effect.

If `12345` opens a search result or nothing happens, close search, return to **App Settings**, and enter the digits there. The exact position of App Settings can vary with the Smart Hub layout. If the TV appears to restart but **Develop Mode** is missing, turn it fully off and back on before trying to connect.

## 2. Create a TV certificate profile

Samsung requires a signed `.wgt` to install on a TV. In Tizen Studio:

1. Open **Tools → Certificate Manager**, click **+**, choose **Samsung → TV** and give the profile a name such as `MySamsungTV`.
2. Create or import an **author certificate** and sign in with your Samsung Developer account when prompted. Keep its password private. If you already used this app ID on the TV, import the original author certificate for an update.
3. Create the **distributor certificate** and add **this TV's DUID**. Certificate Manager can also offer the connected TV in its device list. Do not substitute the serial number. If the TV is not connected yet, enter its DUID manually.
4. Finish and select the new profile. Back up the author certificate outside this repository: updates to the same installed app need the same author certificate.

Follow Samsung's [certificate walkthrough](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html) if a screen differs.

## 3. Connect the TV from the PC

Clone the repo and open PowerShell in its root. Replace the example TV IP. The Developer Mode popup already contains the **PC** IP; the command below uses the **TV** IP.

```powershell
git clone https://github.com/mschr703/samsung-s95b-tizen-home-launcher.git
cd samsung-s95b-tizen-home-launcher
$tvIp = '192.168.1.100'      # replace with your TV's local IP
$tvSerial = "${tvIp}:26101"
sdb connect $tvSerial
sdb devices
```

Continue only when `sdb devices` lists the TV with status `device`, for example `192.168.1.100:26101    device`. If the serial differs, put the one reported by `sdb devices` in `$tvSerial` before the install commands. As a GUI alternative, open **Tizen Studio → Tools → Device Manager → Remote Device Manager → +**, add the TV IP with port **26101**, then turn its connection **On**. Samsung documents this [Device Manager route](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html).

## 4. Package, install and launch

From the same PowerShell window, use the certificate profile name you created:

```powershell
$profile = 'YOUR_TV_PROFILE' # replace with the Certificate Manager profile name
tizen package -t wgt -s $profile -- app
Copy-Item 'app/Luma Home.wgt' 'app/LumaHome.wgt' -Force
tizen install -s $tvSerial -n LumaHome.wgt -- app
tizen run -s $tvSerial -p LumaTV2026.LumaHome
```

The package command prints its actual `.wgt` filename. If it differs, change the `Copy-Item` source. The short target filename avoids the Tizen CLI's trouble with spaces. Generated packages and signing artifacts are ignored by Git.

On the TV, confirm that Luma opens, a tile launches an installed app and **Samsung Home öffnen** returns to the original Smart Hub. Then add Luma to Samsung's start bar for **Home → OK**. This setup does not alter the native Home button target.

## 5. Use the app picker

Choose **Apps auswählen** or **Apps ändern**. The checked apps at the top are the current favorites; press **OK** on one to remove it. To search, move **Up** from the first app to **App suchen**, press **OK**, type, then close the Samsung keyboard with **Done** or **Back**. Focus returns to the first result. **Back** from the picker returns to Luma.

The picker only lists installed apps whose names the TV reports. It hides unnamed entries and entries named only “App”. Up to seven favorites fit on the home screen. The three example favorites match YouTube, Netflix and Spotify by name; an app appears only if installed.

## Updating Luma

After changing `app/`, increase the version in [`app/config.xml`](../app/config.xml), package again and install with the **same author certificate** and application ID. This is how the tested TV was updated through version 1.2. Keep the author certificate backed up; Samsung notes that a different author certificate may make an update appear as a different app.

If the Home button has been mapped to Luma, **restore Samsung Home before uninstalling Luma**. See [`HOME-BUTTON.md`](HOME-BUTTON.md).

## If installation fails

| Symptom | Check |
| --- | --- |
| `12345` does not open the popup | Open Samsung **Apps → App Settings** first. On the slim remote, use its on-screen number keypad, not the Apps search box. |
| `tizen` or `sdb` is not recognized in PowerShell | Check `Get-Command tizen` and `Get-Command sdb`; open a new terminal after updating `PATH`, or use the full paths to `tizen.bat` and `sdb.exe`. |
| `sdb devices` is empty | TV and PC are on the same network; Developer Mode has the **PC** IP; `sdb connect` uses the **TV** IP; TV has restarted; try Device Manager. Samsung says port 26101 is internal and cannot be opened separately. |
| Package cannot be signed or installed | Samsung TV certificate profile is selected, its distributor certificate includes this TV's DUID, and the package is signed with it. If certificate creation fails, update Samsung Certificate Extension to 2.0.73 or later. |
| An update is rejected | Use the original author certificate and unchanged application ID. |
| App picker is empty | Check that apps are installed and visible in Samsung Apps; the picker filters unnamed and generic “App” entries. |
| Search appears to trap remote focus | Use version 1.2 or later: **Up** marks a button, **OK** opens the keyboard, **Down** returns to apps. |

Samsung's [Tizen Studio FAQ](https://developer.samsung.com/smarttv/develop/faq/tizen-studio.html) has further installation checks.
