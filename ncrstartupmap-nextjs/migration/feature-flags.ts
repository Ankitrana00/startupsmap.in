export const featureFlags = {
  // Enable advanced search features
  advancedSearch: false,

  // Enable real-time updates
  realTimeUpdates: false,

  // Enable admin dashboard
  adminDashboard: false,

  // Enable job listings
  jobsFeature: false,

  // Enable email notifications
  emailNotifications: false,

  // Enable analytics dashboard
  analyticsDashboard: false,

  // Enable dark mode
  darkMode: true,

  // Enable i18n
  i18n: true,
};

export function isFeatureEnabled(flag: keyof typeof featureFlags): boolean {
  return featureFlags[flag] || false;
}
