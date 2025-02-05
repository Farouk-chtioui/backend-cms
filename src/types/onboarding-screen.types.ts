export enum OnboardingScreenCategory {
    PERMISSION = 'permission',
    TUTORIAL = 'tutorial', 
    WELCOME = 'welcome',
    CONFIGURATION = 'configuration',
    SPLASH = 'splash'
  }
  
  // Specific enums for each screen type category
  export enum PermissionScreenTypeEnum {
    BLUETOOTH = 'bluetooth_permission',
    GEOLOCATION = 'geolocation_permission',
    CAMERA = 'camera_permission',
    NOTIFICATIONS = 'notifications_permission',  
    CONTACTS = 'contacts_permission',
    STORAGE = 'storage_permission',
    MICROPHONE = 'microphone_permission',
    DATA_TRACKING = 'data_tracking_permission',
    HEALTH_DATA = 'health_data_permission'
  }
  
  export enum TutorialScreenTypeEnum {
    FEATURE_OVERVIEW = 'feature_overview',
    NAVIGATION_GUIDE = 'navigation_guide',
    QUICK_START = 'quick_start',
    GESTURES = 'gestures',
    SHORTCUTS = 'shortcuts',
    CUSTOMIZATION = 'customization'
  }
  
  export enum WelcomeScreenTypeEnum {
    GREETING = 'greeting',
    VALUE_PROPOSITION = 'value_proposition',
    FEATURES_SHOWCASE = 'features_showcase', 
    BRAND_STORY = 'brand_story'
  }
  
  export enum ConfigurationScreenTypeEnum {
    PROFILE_SETUP = 'profile_setup',
    PREFERENCES = 'preferences',
    ACCOUNT_LINKING = 'account_linking',
    THEME_SELECTION = 'theme_selection',
    LANGUAGE_SELECTION = 'language_selection'
  }
  
  export enum SplashScreenTypeEnum {
    LOADING = 'loading',
    BRANDED = 'branded',
    ANIMATED = 'animated'
  }
  
  // Union type remains the same
  export type OnboardingScreenType =
    | PermissionScreenTypeEnum
    | TutorialScreenTypeEnum
    | WelcomeScreenTypeEnum
    | ConfigurationScreenTypeEnum
    | SplashScreenTypeEnum;