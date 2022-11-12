/// <reference path="./routes.d.ts" />

import type { Routes } from 'virtual:laravel/routes'

declare global {
    const route: <RouteName extends keyof Routes>(name: RouteName, params?: Routes[RouteName]) => string
}

declare module "@iksaku/laravel-vite-router" {
    import { Plugin } from 'vite'

    type Config = {
        only?: string[]
        except?: string[]
    }

    const plugin: (config?: Config) => Plugin

    export default plugin
}
