import { createApp } from 'vue'
import App from './App.vue'
import { initTheme } from './lib/theme'

import './assets/index.css'

initTheme()

createApp(App).mount('#app')
