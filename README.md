# nTools 🚀

An all-in-one, ultra-fast productivity suite and Kannada text conversion platform built with **React 19**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Capacitor Android**.

Designed with **OLED pitch-black aesthetics**, zero-lag 120 FPS navigation, native Android lockscreen overlays, and a rich ecosystem of interactive Home Screen AppWidgets.

---

## 📱 Features

### 1. 📝 Kannada ASCII & Unicode Converter
- Real-time two-way conversion between **Kannada Unicode** and popular ASCII fonts (Baraha, Nudi, etc.).
- Text case transformation, word counts, font previewing, and direct file export.

### 2. 📁 Files & Document Suite
- Comprehensive PDF toolkit: compress, merge, split, extract text, watermark, and PDF-to-image conversion.
- Text, code, and document converters with offline processing.

### 3. ⏰ Clock, Alarms & Focus Suite
- Multi-alarm manager with customizable snooze intervals and 15-minute prior heads-up notifications.
- **Full-Screen Lockscreen Alert Overlay**: Rings over other apps and displays on the lockscreen with instant Dismiss & Snooze controls.
- **🎯 Focus Session**: Minimalist Zen Pitch Black screen with countdown timer, soft audio chimes, and **Allowed VIP Callers** to filter distractions.

### 4. 📅 Calendar & Life Planner
- Monthly interactive calendar with Karnataka and Indian public holidays.
- Event scheduling, anniversary tracking, and persistent birthday reminders with "Mark as Wished" confirmation.
- **Daily 6:00 AM Morning Briefing**: Automated notification summarizing the day's schedule, festivals, and priority tasks.

### 5. ✅ Tasks & To-Do Hub
- Task management with categories, priority tags, and due dates.
- High-priority task reminder popups with inline completion and snooze support.

### 6. 🧮 Smart Calculator
- Dual-mode calculator (standard + expression evaluator).
- Unit conversions, currency estimates, and math utilities.

### 7. 📒 Rich Notes & Widget Pinning
- Rich text notepad with tags and color-coding.
- **📌 Pin to Widget**: Select any note to display directly on your Android Home Screen widget.

### 8. 🖼️ Native Android Home Screen Widgets Suite (OLED Black)
11 fully customizable Android AppWidgets designed with OLED-optimized black backgrounds:
- **Vertical Stacked Clock** (Hours on top, minutes below, AM/PM & date)
- **Clock & Alarms** (Live alarm preview & quick toggle)
- **Transparent Floating Clock**
- **Calendar Month Grid**
- **Today's Agenda & Date**
- **Tasks & Checklist** (Direct interactive checkbox support)
- **Pinned Note Widget**
- **Interactive Smart Calculator** (Calculations directly on the home screen)
- **Focus / Pomodoro Session Controller**
- **Quick Launch Suite (4x1)**
- **Kannada Converter Shortcut (2x1)**

---

## 🛠️ Tech Stack & Performance Architecture

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Mobile Bridge**: Capacitor 7, Android SDK (Java).
- **Audio Engine**: Unified Android Ringtone & Web Audio API fallback.
- **Performance Optimizations**:
  - Direct canvas hardware acceleration (LAYER_TYPE_NONE).
  - Active module mounting (DOM footprint ~250 nodes).
  - Background CPU freeze on minimize (webView.onPause()).
  - Native <TextClock> implementation for zero battery drain.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Android Studio](https://developer.android.com/studio) with Android SDK 34+
- Java JDK 17 or 21

### Installation

`ash
# Clone the repository
git clone https://github.com/<your-username>/nTools.git
cd nTools

# Install dependencies
npm install
`

### Running the Web App

`ash
npm run dev
`

### Running Tests

`ash
npm test
`

### Building the Android APK

`ash
# 1. Build web bundle
npm run build

# 2. Sync web assets with Android
npx cap sync android

# 3. Compile Android debug APK
cd android
./gradlew assembleDebug
`

The compiled APK will be located at:
ndroid/app/build/outputs/apk/debug/nTools-debug.apk

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
