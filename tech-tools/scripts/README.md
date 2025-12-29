# Windows 11 De-Bloat & Setup Automation

A quick PowerShell script designed to clean up and configure fresh Windows 11 installations. This script removes bloatware, customizes the UI, and installs certain everyday software automatically.

## 🚀 Quick Start

### One-Liner Execution

Run this command in PowerShell (as Administrator or regular user - it will auto-elevate):

```powershell
irm https://raw.githubusercontent.com/sullivan1337/sullivan1337.github.io/refs/heads/master/tech-tools/scripts/win11debloat.ps1 | iex
```

### Alternative Method

If you encounter issues with the one-liner, use this alternative:

```powershell
iwr -UseBasicParsing "https://raw.githubusercontent.com/sullivan1337/sullivan1337.github.io/refs/heads/master/tech-tools/scripts/win11debloat.ps1" -OutFile "$env:TEMP\debloat.ps1"; Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:TEMP\debloat.ps1"
```

## ✨ Features

### 🗑️ Bloatware Removal
- **Microsoft Apps**: Removes 35+ pre-installed Microsoft apps including Bing, Copilot, Teams, Cortana, and more
- **Third-Party Apps**: Removes 48+ sponsored apps like Candy Crush, TikTok, Facebook, Netflix, etc.
- **Deep Removal**: Removes both provisioned packages (prevents reinstall) and installed packages (current user)

### 🎨 UI Customization
- **Taskbar**: Hides Search Box, Task View, Widgets, Chat/Meet Now, and Copilot buttons
- **Taskbar Alignment**: Optional left-alignment instead of center
- **File Explorer**: 
  - Opens to "This PC" instead of Home
  - Shows hidden files, folders, and drives
  - Shows file extensions
  - Unpins Videos, Music, and Pictures from Quick Access

### 📦 Software Installation
- **Direct Downloads**: No winget required - downloads installers directly from official sources
- **Browser Selection**: Choose Chrome, Firefox, or both

## 📋 Menu Options

### Removal Options
1. **Remove Microsoft Bloat** - Removes 35 Microsoft apps (Bing, Copilot, Teams, etc.)
2. **Remove Third-Party Apps** - Removes 48 sponsored apps (games, social media, streaming)

### Customization
3. **Customize UI (Taskbar & Explorer)** - Configure both with separate y/n prompts

### Installation
4. **Install Essential Apps** - Browser (Chrome/Firefox/Both) and VS Code
5. **Install Optional Apps** - NVIDIA App, Steam, VLC, Discord

### Quick Start
6. **Remove & Customize All** - Runs options 1, 2, and 3
7. **Install All Apps** - Runs options 4 and 5
8. **RUN EVERYTHING** - Complete fresh install setup (recommended)

## 📦 Apps That Can Be Installed

### Essential Apps
- **Google Chrome** - Web browser
- **Mozilla Firefox** - Web browser
- **Visual Studio Code** - Code editor

### Optional Apps
- **NVIDIA App** - GPU drivers and settings
- **Steam** - Gaming platform
- **VLC Media Player** - Media player
- **Discord** - Communication platform

## 🗑️ Apps That Get Removed

### Microsoft Apps (35 total)
- Microsoft 3D Builder
- Cortana (discontinued)
- Bing Finance, Food & Drink, Health & Fitness, News, Sports, Translator, Travel, Weather
- Copilot & Copilot Provider
- Messaging
- Microsoft Journal
- Microsoft Office Hub
- Power BI
- Solitaire Collection
- Mixed Reality Portal
- Microsoft News
- Office Sway
- OneConnect
- Outlook for Windows
- People
- Power Automate Desktop
- Skype
- Microsoft To Do
- Windows DevHome
- Mail and Calendar
- Feedback Hub
- Windows Maps
- Movies & TV (Zune Video)
- Microsoft Family
- Quick Assist
- Microsoft Teams (both old and new versions)

### Third-Party Apps (48 total)
- ACG Media Player
- Actipro Software
- Adobe Photoshop Express
- Amazon & Amazon Video
- Asphalt 8 Airborne
- Autodesk SketchBook
- Caesars Slots Free Casino
- COOKING FEVER
- CyberLink Media Suite
- Disney & Disney Magic Kingdoms
- Drawboard PDF
- Duolingo
- Eclipse Manager
- Facebook
- FarmVille 2
- Fitbit
- Flipboard
- HiddenCity
- Hulu Plus
- iHeartRadio
- Instagram
- King.com games (Bubble Witch 3, Candy Crush Saga, Candy Crush Soda Saga)
- LinkedIn
- March of Empires
- Netflix
- NYT Crossword
- OneCalendar
- Pandora
- Phototastic Collage
- PicsArt
- Plex
- Polarr Photo Editor
- Royal Revolt
- Shazam
- Sidia Live Wallpaper
- Sling TV
- TikTok
- TuneIn Radio
- Twitter
- Viber
- WinZip Universal
- Wunderlist
- XING
- Spotify

## 🎨 UI Customization Details

### Taskbar Customization
When you select option 3, you'll be asked separately for:

**Taskbar Changes (y/n):**
- Hide Search Box
- Hide Task View Button
- Hide Widgets Button
- Hide Chat/Meet Now Icon
- Hide Copilot Button
- Optional: Align taskbar icons to LEFT (separate prompt)

**Explorer Changes (y/n):**
- Open Explorer to "This PC" (instead of Home)
- Show hidden files, folders, and drives
- Show file extensions
- Unpin Videos, Music, Pictures from Quick Access

## 🔧 Requirements

- **Windows 11** (designed for fresh installations)
- **Administrator privileges** (script auto-elevates if needed)
- **Internet connection** (for downloading installers)
- **PowerShell 5.1+** (comes with Windows 11)

## 📊 Installation Process

The script provides detailed feedback during installation:

1. **Preflight Check**: Shows which apps are already installed vs. need installation
2. **Download Progress**: Real-time progress bar with download speed
3. **Installation Progress**: Animated spinner with elapsed time
4. **Verification**: Confirms successful installation

### Example Output
```
  ► Google Chrome
    Downloading: [==============================] 100% (95.2 MB)
    Installing: [SUCCESS] Completed in 12 seconds

  ► Visual Studio Code
    Downloading: [==============================] 100% (82.1 MB)
    Installing: [SUCCESS] Completed in 8 seconds
```

## 🛠️ Troubleshooting

### Script Won't Run
- **Execution Policy Error**: The script automatically bypasses execution policy, but if issues persist, run:
  ```powershell
  Set-ExecutionPolicy Bypass -Scope Process -Force
  ```

### Apps Won't Install
- **Download Fails**: The script tries multiple mirrors/URLs automatically
- **Installation Hangs**: Script has 5-minute timeout and will continue
- **Discord Issues**: Discord needs extra time to extract - script waits up to 26 seconds

### Apps Already Installed
- The script detects existing installations and skips them automatically
- Preflight check shows what will be installed vs. skipped

### Explorer/Taskbar Changes Not Applied
- Script restarts Explorer automatically
- If changes don't appear, manually restart Explorer or log out/in

## 🔒 Security & Privacy

- **No Data Collection**: Script doesn't send any data anywhere
- **Open Source**: Full source code available on GitHub
- **Direct Downloads**: Downloads only from official sources
- **No Telemetry**: Script doesn't include any tracking

## 📝 Notes

- **Reversible**: Most changes can be manually reversed through Windows Settings
- **Safe**: Only removes apps, doesn't modify system files
- **Non-Destructive**: Won't break Windows functionality
- **Idempotent**: Can be run multiple times safely

## 🎯 Best Practices

1. **Run on Fresh Install**: Best results on new Windows 11 installations
2. **Backup First**: Consider creating a system restore point before running
3. **Read Prompts**: The script asks for confirmation before major changes
4. **Use Option 8**: For complete setup, use "RUN EVERYTHING" option

## 📄 License

This script is provided as-is for personal use. Use at your own risk.

## 👤 Author

**sullivan1337**

GitHub: [sullivan1337](https://github.com/sullivan1337)

## 🔗 Links

- **Script URL**: `https://raw.githubusercontent.com/sullivan1337/sullivan1337.github.io/refs/heads/master/tech-tools/scripts/win11debloat.ps1`
- **Repository**: `https://github.com/sullivan1337/sullivan1337.github.io`

## 💡 Tips

- Run the script immediately after Windows 11 OOBE (Out of Box Experience)
- Use option 8 for a complete "set it and forget it" experience
- The script is interactive - you can choose which parts to run
- All installations are silent - no popups or prompts during install

## 🐛 Known Issues

- Discord may take longer to install (script handles this automatically)
- Some apps may require manual verification if installation paths differ
- Explorer restart is required for UI changes to take effect

## 📚 Additional Information

### How It Works

1. **Elevation Check**: Automatically requests admin privileges if needed
2. **Package Removal**: Uses `Remove-AppxPackage` and `Remove-AppxProvisionedPackage`
3. **Registry Changes**: Modifies Windows registry for UI customization
4. **Direct Downloads**: Downloads installers using WebClient with progress tracking
5. **Silent Installation**: Runs installers with silent flags

### Technical Details

- **PowerShell Version**: Requires PowerShell 5.1 or later
- **.NET Framework**: Uses System.Net for downloads
- **COM Objects**: Uses Shell.Application for Explorer customization
- **Process Management**: Monitors installer processes with timeouts

---

**⚠️ Disclaimer**: This script modifies your Windows 11 installation. While tested and safe, use at your own risk. Always create a system restore point before running system modification scripts.

