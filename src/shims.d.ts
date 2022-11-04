declare const route: (name: string, params?: Record<string, any>) => string;

declare module "virtual:laravel/routes" {}

declare module "@iksaku/laravel-vite-router" {
    import { Plugin } from 'vite'

    type Config = {
        only?: string[]
        except?: string[]
    }

    const plugin: (config?: Config) => Plugin

    export default plugin
}
