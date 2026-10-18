# Technical Specification Document: Smart Monitoring System for Oyster Mushroom Cultivation

## 1. Executive Summary & Context

This document outlines the software updates, UI/UX enhancements, notification logic, and reporting features required for the **Smart Monitoring System for Oyster Mushroom Cultivation**.

Based on user feedback and field recommendations, the app is being updated to provide clearer alert messaging, detailed daily reporting, audio/email notification capabilities, and a responsive design across varying display sizes.

---

## 2. Software & App Functional Specifications

### 2.1 Dashboard & Dynamic Alerts

* **Specific Alert Messaging:** Replace generic labels (e.g., "Climate: Check") with context-aware, actionable status strings:

  * **Low CO₂:** `CO₂ Low: 582 ppm (Action: Ventilation exhaust paused, awaiting CO₂ accumulation)`

  * **High Temperature:** `Temperature High: 28.1°C (Action: Cooling fans activated)`

  * **Low Humidity:** `Humidity Low: 79% (Action: Misting system engaged)`

* **System Action Indicator:** Every dashboard card must explicitly reflect current operational status:

  * **Automated Mode:** Displays current automated intervention (e.g., "Misting On").

  * **Manual Override:** Displays a prominent warning indicator when manual overrides block automated control logic.

---

### 2.2 Reporting & Daily Logs Module

* **Daily Summary Dashboard:** Include a dedicated **Daily Report** section under the History/Analytics tab.

* **Aggregated Metrics:**

  * 24-hour peak, minimum, and average readings for $\text{CO}_2$, Relative Humidity, and Temperature.

  * Total daily runtime and duty cycle for actuators (fans, misting pump, solenoids).

  * System event log capturing manual overrides, warning triggers, and sensor anomaly timestamps.

* **Export Options:** Support exporting daily summary logs to PDF and CSV formats for historical tracking.

---

### 2.3 Audio & Email Notification System

* **Audio Alerts:**

  * Implement customizable in-app notification sounds with distinct audio profiles for warnings versus critical threshold breaches.

  * Allow critical environmental alerts to override silent mode on user devices when configured in settings.

* **Email Notification Dispatcher:**

  * Integrate an automated email delivery service (e.g., SendGrid or Firebase Cloud Functions).

  * Send automated email reports when any parameter remains out of target range for more than 10 consecutive minutes.

---

### 2.4 Responsive UI/UX Adjustments

* **Dynamic Layout Engine:** Re-architect UI layouts using flexible relative units (percentage-based scaling and `dp`/`sp` typography units) to ensure elements, cards, and icons scale uniformly across varying mobile screen ratios and device sizes.

---

## 3. Implementation Roadmap

1. **Phase 1 (Dashboard & UI):** Re-skin UI layouts for flexible screen scaling and implement specific alert messaging logic.

2. **Phase 2 (Reporting Module):** Build out daily logs tab, aggregated metrics dashboard, and CSV/PDF export options.

3. **Phase 3 (Notification Dispatch):** Implement customizable audio alerts and set up automated email dispatchers.