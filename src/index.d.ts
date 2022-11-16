// @ts-ignore
declare global {
    export type Routes = {}

    const route: <RouteName extends keyof Routes>(name: RouteName, params?: Routes[RouteName]) => string
}

declare module 'virtual:laravel/routes' {}

declare module '@iksaku/laravel-vite-router' {
    import { Plugin } from 'vite'

    type Config = {
        only?: string[]
        except?: string[]
    }

    const plugin: (config?: Config) => Plugin

    export default plugin
}
