import { createApp } from 'vue'
import './style.scss'
import 'bulma'
import App from './App.vue'
import Home from './components/Home.vue'
import {createRouter, createWebHistory} from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home }
  ]
})

createApp(App).use(router).mount('#app')
