import { createRouter } from '@tanstack/react-router'

import { routeTree } from './routeTree.gen'

export const getRouter = () => {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    ...(import.meta.env.VITE_TAURI ? { ssr: false } : {}),
  })
}
