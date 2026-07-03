import { defineConfig } from '#q-app/wrappers';

export default defineConfig(function (ctx) {
  return {
    boot: [
      'axios',
      'notifications',
    ],

    css: [
      'app.scss'
    ],

    extras: [
      'roboto-font',
      'material-icons',
    ],

    build: {
      target: {
        browser: [ 'es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1' ],
        node: 'node20'
      },

      vueRouterMode: 'history',

      // vitePlugins: [
      //   ['@vitejs/plugin-vue', {}]
      // ]
    },

    devServer: {
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        }
      }
    },

    framework: {
      config: {
        brand: {
          primary: '#FF8C00', // Orange
          secondary: '#20B2AA', // Light Sea Green (Green Tosca)
          accent: '#008080', // Teal
          dark: '#1d1d1d',
          positive: '#21BA45',
          negative: '#C10015',
          info: '#31CCEC',
          warning: '#F2C037'
        }
      },

      plugins: [
        'Notify',
        'Loading',
        'Dialog'
      ]
    },

    animations: [],

    ssr: {
      pwa: false,
      prodPort: 3000,
      middlewares: [
        'render'
      ]
    },

    pwa: {
      workboxMode: 'injectManifest',
      injectPwaMetaTags: true,
      swFilename: 'sw.js',
      manifest: {
        name: 'BMH Apps',
        short_name: 'BMH Apps',
        description: 'bmhapps ZISWAF management ERP',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#14B8A6',
        icons: [
          {
            src: 'icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: 'icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-256x256.png',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: 'icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    },

    cordova: {},

    capacitor: {
      hideSplashscreen: true
    },

    electron: {
      inspectPort: 5858,
      bundler: 'packager',
    },

    bex: {
      contentScripts: [
        'my-content-script'
      ],
    }
  }
});
