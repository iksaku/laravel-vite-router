const process = require('process')
const { compileRoutes } = require('./route_loader.js')
const {normalizePath} = require("vite");

module.exports = (config = {}) => {
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
        groups: {
            ...(config.groups ?? {})
        }
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
                const { default: ungrouped, ...groups } = await compileRoutes(options)

                let module = ''

                for (const [name, path] of Object.entries(groups)) {
                    module += `export const ${name} = ${JSON.stringify(path)}\n`
                }

                module += `export default ${JSON.stringify(ungrouped)}`

                return module
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
