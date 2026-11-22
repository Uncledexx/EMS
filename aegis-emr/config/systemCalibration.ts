// Defaults. Admins can override any of these at runtime (stored in the Setting table, key "calibration").
export const DEFAULT_CALIBRATION = {
  ORGANIZATION_MODE: "WORKPLACE" as "SCHOOL" | "WORKPLACE", // UI labels: Student/Teacher/Clinic vs Employee/Team Leader/Occupational Health
  RESPONDER_SESSION_TIMEOUT_SECONDS: 300, // auto-lock after NFC tap
  SHIFT_PIN_VALIDITY_HOURS: 8,            // how long a PIN stays paired with the badge
  DYNAMIC_QR_REFRESH_SECONDS: 30,         // TOTP window for the mobile QR
  BREAK_GLASS_RATE_LIMIT_MAX_SCANS: 3,    // more scans than this inside the window raises an IT alert
  RATE_LIMIT_WINDOW_MINUTES: 5,
  NOTIFY_FAMILY_ON_SCAN: true,            // email/SMS the emergency contact (provider hookup still to do)
  REQUIRE_WITNESS_ID_ON_CLOSURE: false,
  GOLDEN_HOUR_VISIBLE_FIELDS: ["full_name","blood_type","severe_allergies","chronic_conditions","active_medications","emergency_contacts","hmo_philhealth"],
};
export type Calibration = typeof DEFAULT_CALIBRATION;
