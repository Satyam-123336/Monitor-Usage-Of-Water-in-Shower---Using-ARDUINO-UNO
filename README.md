# Shower Water Monitor Pro

A smart shower water-usage monitor built with:
- Arduino firmware for real-time sensing and alerts
- A browser dashboard for live visualization, history, and analytics

The system measures flow rate, estimates total water consumed, triggers an over-limit alarm, and streams JSON telemetry to a Web Serial dashboard.

## Table of Contents
- [Features](#features)
- [Live Deployment](#live-deployment)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Hardware Requirements](#hardware-requirements)
- [Wiring](#wiring)
- [Firmware Setup (Arduino)](#firmware-setup-arduino)
- [Frontend Local Setup (Optional)](#frontend-local-setup-optional)
- [How to Use](#how-to-use)
- [Data Format](#data-format)
- [Configuration Notes](#configuration-notes)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)

## Features
- Real-time flow monitoring from a pulse-based flow sensor
- LCD status display (flow, usage, idle state, limit warning)
- Buzzer alert when configured usage limit is exceeded
- JSON serial output for external integrations
- Interactive web dashboard with:
  - Live flow chart
  - Daily budget progress
  - Session timer and summary
  - Historical daily/weekly/monthly charts
  - Multi-user tracking and leaderboard
  - Achievements and eco stats (water, cost, CO2 savings)
  - Theme toggle and fullscreen mode
  - CSV export

## Live Deployment
The frontend dashboard is already deployed on Vercel.

- Open your deployed Vercel URL in Chrome or Microsoft Edge.
- Click `Connect` and choose your Arduino serial port.
- Keep the Arduino connected and running at `115200` baud.

Note:
- Web Serial requires a secure origin (`https://`), which Vercel provides.
- If you want this README to include the exact production URL, replace the placeholder below:

https://frontend-three-ashen-60.vercel.app/

## System Architecture
1. Arduino reads pulse interrupts from the flow sensor.
2. Firmware computes L/min and cumulative liters.
3. Device prints one JSON message per second over Serial (115200 baud).
4. Browser app connects via Web Serial and renders live + historical insights.

## Project Structure

```text
PROJECT/
├── PROJECT.ino          # Arduino firmware
└── frontend/
    ├── index.html       # Dashboard UI
    ├── styles.css       # Dashboard styling
    └── app.js           # Web Serial + app logic
```

## Hardware Requirements
- Arduino board (Uno/Nano compatible)
- Hall-effect water flow sensor (pulse output)
- I2C 16x2 LCD module (LiquidCrystal_I2C)
- Active buzzer
- Jumper wires and suitable power supply

## Wiring
Current firmware pin mapping in `PROJECT.ino`:
- Flow sensor signal -> `D2` (interrupt pin)
- Buzzer -> `D3`
- LCD -> I2C (`SDA`, `SCL`, `VCC`, `GND`)

LCD I2C address is set to `0x27` in code. If your module differs, try `0x3F`.

## Firmware Setup (Arduino)
1. Open `PROJECT.ino` in Arduino IDE.
2. Install required libraries:
   - `LiquidCrystal_I2C`
   - `Wire` (usually built-in)
3. Select your board and COM port.
4. Upload the sketch.
5. Keep Serial at `115200` baud.

## Frontend Local Setup (Optional)
Web Serial works best in Chromium-based browsers (Chrome/Edge).

1. Open a terminal in `frontend`.
2. Run a local static server (example with Python):

```bash
python -m http.server 5500
```

3. Open:

```text
http://localhost:5500
```

4. Click `Connect` and choose the Arduino serial port.

## How to Use
1. Start water flow.
2. Watch live values on LCD and dashboard.
3. If usage crosses firmware limit, buzzer and UI warning are triggered.
4. Review session metrics, history charts, and leaderboard.
5. Use Settings for budget and cost assumptions, and export usage CSV when needed.

## Data Format
Firmware emits JSON like:

```json
{"flowLpm": 2.35, "totalLitres": 0.42, "motorIdle": false, "limitExceeded": false, "buzzerAlerted": false}
```

## Configuration Notes
- Firmware limit is currently hardcoded at `0.5` liters (`PROJECT.ino`).
- Flow conversion uses `7.5` pulses factor in firmware formula.
- Dashboard calibration setting exists in UI but is not currently applied to incoming data (data is used as reported by firmware).

## Troubleshooting
- Browser says Web Serial unsupported:
  - Use latest Chrome or Edge.
- Cannot connect to serial port:
  - Close Arduino Serial Monitor and other apps using the COM port.
- No flow updates:
  - Verify sensor wiring and pulse output to `D2`.
- LCD not showing text:
  - Check I2C address (`0x27` vs `0x3F`) and SDA/SCL wiring.
- Frequent parse errors in dashboard:
  - Ensure firmware prints one valid JSON object per line.

## Future Improvements
- Move all thresholds/calibration to shared configurable settings
- Add backend persistence (instead of localStorage only)
- Add mobile-friendly PWA install support
- Add automated tests for parser and analytics logic

## License
Check LICENSE.md for it.
