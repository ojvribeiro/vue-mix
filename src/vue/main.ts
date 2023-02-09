import { createApp, App as VueApp } from 'vue'
import { createRouter, createWebHistory, Router } from 'vue-router'
import { createHead, HeadClient } from '@vueuse/head'

import App from '~/app.vue'

const app: VueApp<Element> = createApp(App)
const head: HeadClient<{}> = createHead()


let routes: Array<{ path: string; component: any }> = []

/**
 * Built-in pages
 */
const nativePageComponents = require.context(
  '@/vue/pages/',
  true,
  /\.(vue|js|ts)$/i
)
nativePageComponents.keys().map((key: string) => {
  let slugName: string = key
    .split('.')[1]
    .replace(/([A-Z])/g, '-$1')
    .replace(/(^-)/g, '')
    .toLowerCase()

  if (slugName.match(/\/index$/)) {
    slugName = slugName.replace('/index', '/')
  }

  routes.push({
    path: slugName === '/index' ? '/' : `/${slugName}`,
    component: nativePageComponents(key).default,
  })
})

/**
 * Pages
 */
const pageComponents = require.context('@pages/', true, /\.(vue|js|ts)$/i)
pageComponents.keys().map((key: string) => {
  let slugName: string = key
    .split('.')[1]
    .replace(/([A-Z])/g, '-$1')
    .replace(/(^-)/g, '')
    .toLowerCase()

  if (slugName.match(/\/index$/)) {
    slugName = slugName.replace('/index', '/')
  }

  routes.push({
    path: slugName === '/index' ? '/' : `/${slugName}`,
    component: pageComponents(key).default,
  })
})

/**
 * Dynamic Pages
 */
const dynamicPageComponents = require.context(
  '@pages/',
  true,
  /\[(.*)\]\.(vue|js|ts)$/i
)
dynamicPageComponents.keys().map((key: string) => {
  let slugName: string = key
    .split('.')[1]
    .replace(/([A-Z])/g, '-$1')
    .replace(/(^-)/g, '')
    .toLowerCase()

  if (slugName.match(/\/index$/)) {
    slugName = slugName.replace('/index', '/')
  } else {
    slugName = slugName.replace(/\/\[(.*)\]/, '/:$1')
  }

  routes.push({
    path: slugName === '/index' ? '/' : `/${slugName}`,
    component: dynamicPageComponents(key).default,
  })
})

routes.push({
  path: '/:pathMatch(.*)*',
  component: require('@/vue/pages/404.vue').default,
})

const router: Router = createRouter({
  history: createWebHistory(),
  routes: routes,
})

app.use(router)
app.use(head)

app.mount('[data-vulmix-app]')
