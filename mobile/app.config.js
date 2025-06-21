const { withAndroidManifest } = require('@expo/config-plugins');

// Plugin personalizado para corrigir o conflito de mensagens Firebase
const withAndroidManifestFixPlugin = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    
    // Procura o meta-data existente para cor de notificação do Firebase Messaging
    const metadataArray = application['meta-data'] || [];
    
    // Encontrar o índice do meta-data da cor de notificação
    let notificationColorIndex = -1;
    for (let i = 0; i < metadataArray.length; i++) {
      if (metadataArray[i].$?.name === 'com.google.firebase.messaging.default_notification_color') {
        notificationColorIndex = i;
        break;
      }
    }

    // Se encontrar, adiciona o atributo tools:replace para sobrescrever o valor
    if (notificationColorIndex !== -1) {
      // Adiciona o xmlns:tools se não existir
      if (!androidManifest.manifest.$['xmlns:tools']) {
        androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
      }
      
      // Adiciona tools:replace ao meta-data específico
      metadataArray[notificationColorIndex].$['tools:replace'] = 'android:resource';
    }
    
    return config;
  });
};

module.exports = {
  "expo": {
    "name": "PetApp",
    "slug": "mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "fonts": [
      "./assets/fonts/Inter-Regular.ttf",
      "./assets/fonts/Inter-Bold.ttf",
      "./assets/fonts/Inter-Medium.ttf",
      "./assets/fonts/Inter-Light.ttf",
      "./assets/fonts/Inter-SemiBold.ttf"
    ],
    "ios": {
      "supportsTablet": true,
      "infoPlist": {
        "NSCameraUsageDescription": "Este aplicativo utiliza a câmera para tirar fotos dos seus pets e para reportar pets perdidos/encontrados.",
        "NSPhotoLibraryUsageDescription": "Este aplicativo precisa de acesso à sua galeria para que você possa selecionar fotos dos seus pets.",
        "NSLocationWhenInUseUsageDescription": "Precisamos da sua localização para ajudar a encontrar pets perdidos próximos a você.",
        "UIBackgroundModes": ["remote-notification", "fetch"],
        "FirebaseAppDelegateProxyEnabled": true
      },
      "entitlements": {
        "aps-environment": "development"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#f5e9d6"
      },
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "INTERNET",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE",
        "POST_NOTIFICATIONS"
      ],
      "googleServicesFile": "./google-services.json",
      "config": {
        "googleMaps": {
          "apiKey": process.env.GOOGLE_MAPS_API_KEY,
        }
      },
      "useNextNotificationsApi": true,
      "package": "com.samukka_64.mobile",
      "notification": {
        "icon": "./assets/images/notification-icon.png",
        "color": "#FF6B6B",
        "androidMode": "default",
        "androidCollapsedTitle": "#{unread_notifications} novas notificações",
        "iosDisplayInForeground": true,
        "channels": [
          {
            "name": "default",
            "sound": true,
            "priority": "high",
            "vibrate": true
          },
          {
            "name": "chat",
            "sound": true,
            "priority": "high",
            "vibrate": true,
            "badge": true
          },
          {
            "name": "high_importance_channel",
            "sound": true,
            "priority": "max",
            "vibrate": [0, 250, 250, 250]
          }
        ]
      }
    },
    "web": {
      "bundler": "metro",
      "output": "static",
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router",
      withAndroidManifestFixPlugin,
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#f5e9d6"
        }
      ],
      [
        "expo-camera",
        {
          "cameraPermission": "Permita que o PetApp acesse sua câmera para tirar fotos dos seus pets."
        }
      ],
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Permita que o PetApp acesse sua localização para ajudar a encontrar pets perdidos próximos a você."
        }
      ],
      [
        "expo-media-library",
        {
          "photosPermission": "Permita que o PetApp acesse suas fotos para selecionar imagens dos seus pets.",
          "savePhotosPermission": "Permita que o PetApp salve fotos na sua galeria."
        }
      ],
      "expo-font",
      [
        "expo-notifications",
        {
          "icon": "./assets/images/notification-icon.png",
          "color": "#FF6B6B",
          "sounds": ["./assets/sounds/notification.wav"],
          "androidMode": "default",
          "androidCollapsedTitle": "#{unread_notifications} novas notificações",
          "iosDisplayInForeground": true
        }
      ],
      "@react-native-firebase/app",
      [
        "expo-build-properties",
        {
          "android": {
            "compileSdkVersion": 35,
            "targetSdkVersion": 34,
            "buildToolsVersion": "35.0.0",
            "kotlinVersion": "1.9.25",
            "firebaseMessagingVersion": "23.2.1",
            "usesCleartextTraffic": true,
            "networkSecurityConfig": [
              {
                "domain": "191.223.238.238",
                "includeSubdomains": false
              }
            ]
          },
          "ios": {
            "useFrameworks": "static"
          }
        }
      ],
      withAndroidManifestFixPlugin
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "router": {
        "origin": false
      },
      "eas": {
        "projectId": "426a4a30-d489-4ee2-b249-e190fc940ee6"
      },
      "firebaseApiKey": "FIREBASE_API_KEY",
      "firebaseAppId": "FIREBASE_APP_ID",
      "firebaseMessagingSenderId": "FIREBASE_SENDER_ID",
      "firebaseProjectId": "FIREBASE_PROJECT_ID",
      "firebaseAuthDomain": "FIREBASE_AUTH_DOMAIN",
      "firebaseStorageBucket": "FIREBASE_STORAGE_BUCKET",
      "firebaseMeasurementId": "FIREBASE_MEASUREMENT_ID"
    },
    "owner": "samukka_64",
    "runtimeVersion": "1.0.0",
    "updates": {
      "url": "https://u.expo.dev/426a4a30-d489-4ee2-b249-e190fc940ee6"
    }
  }
}

