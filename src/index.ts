import { normalizePath } from 'vite'
import type { Plugin } from 'vite'
import { compileModule } from './compiler'

type Config = {
    only?: string[]
    except?: string[]
}

export default (config: Config = {}): Plugin => {
    const id = 'virtual:laravel/routes'
    const resolvedId = '\0' + id

    const options = {
        only: [
            ...(config.only ?? []),
        ],
        except: [
            'ignition.*',
            ...(config.except ?? [])
        ],
    }

    return {
        name: 'laravel-vite-router',
        resolveId(source) {
            if (source === id) {
                return resolvedId
            }
        },
        async load(id) {
            if (id === resolvedId) {
                return await compileModule(options)
            }
        },
        configureServer(server) {
            const routeDir = normalizePath(`${process.cwd()}/routes`)

            server.watcher.on('change', async (path) => {
                if (! path.startsWith(routeDir)) {
                    return
                }

                const virtualModule = server.moduleGraph.getModuleById(resolvedId)
                server.moduleGraph.invalidateModule(virtualModule)
            })
        }
    }
}
