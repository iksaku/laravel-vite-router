import { promisify } from 'util'
import { exec as exec_sync } from 'child_process'
import { writeFile } from 'fs/promises'

const exec = promisify(exec_sync)

type RouteEntries = [string, string][]

async function fetchRoutes(): Promise<Map<string, string>> {
    const { stdout, stderr } = await exec('php artisan route:list --json')

    if (stderr) {
        throw stderr
    }

    const router = new Map<string, string>()

    for (let route of JSON.parse(stdout)) {
        if (! route.name) {
            continue
        }

        if (route.uri.startsWith('/')) {
            route.uri = route.uri.slice(1)
        }

        route.domain ??= ''

        router.set(route.name, `${route.domain}/${route.uri}`)
    }

    return router
}

function filterRoutes(routes, { only, except }): RouteEntries {
    const compileRouteFilters = filters => filters.map((filter) => {
        filter = filter.replaceAll('.', '\\.')

        if (filter.includes('*')) {
            filter = filter.replace('*', '.*')
        }

        return new RegExp(`^${filter}$`)
    })

    only = compileRouteFilters(only)
    except = compileRouteFilters(except)

    return [...routes].filter(([name]) => {
        if (only.length && ! only.some((filter) => filter.test(name))) {
            return false
        }

        if (except.length && except.some((filter) => filter.test(name))) {
            return false
        }

        return true
    })
}

async function writeRouteDeclarations(routes: RouteEntries): Promise<void> {
    const declarations = routes.map(([name, path]) => {
        let parameters = path
            .match(/(\{[a-zA-Z0-9_?]+\})/g)
            ?.map((param: string) => {
                const isOptional = param.includes('?')
                param = `'${param.replace(/[{}?]/g, '')}'`

                if (isOptional) {
                    param += '?'
                }

                return `${param}: any`
            })
            .join(', ') ?? undefined

        if (!parameters) {
            return `'${name}': object`
        }

        return `'${name}': { ${parameters} }`
    }).join(', ')

    const contents = `
        declare module "virtual:laravel/routes" {
            export type Routes = { ${declarations} }
        }
    `
        .replace(/(\n\s{8}|\n\s{4}$)/g, '\n')
        .replace(/^\n/g, '')

    await writeFile(`${process.cwd()}/node_modules/@iksaku/laravel-vite-router/dist/routes.d.ts`, contents, {
        encoding: 'utf-8'
    })
}

function cleanupRoutes(routes: RouteEntries): object {
    return Object.fromEntries(
        routes.map(([name, path]) => {
            path = path.replaceAll(/\?}/g, '}')

            return [name, path]
        })
    )
}

export async function compileModule(options): Promise<string> {
    const filtered = filterRoutes(await fetchRoutes(), options)

    await writeRouteDeclarations(filtered)
    const routes = cleanupRoutes(filtered)

    // language=JavaScript
    return `
        /** @type {Record<string, string>} */
        const routes = ${JSON.stringify(routes)}

        /**
         * @param {string} name
         * @param {Record<string, any>} params
         * @returns {string}
         */
        window.route = (name, params = {}) => {
            if (! routes[name]) {
                throw new Error(\`Route \${name} does not exist.\`)
            }

            /** @type {string} */
            let route = routes[name]

            if(typeof params !== 'object') {
                throw new Error('Route parameters must be an object.')
            }

            const query = new URLSearchParams()

            for (let [key, value] of Object.entries(params)) {
                if (route.includes(\`{\${key}}\`)) {
                    route = route.replace(\`{\${key}}\`, value)
                } else {
                    query.append(key, value)
                }
            }

            const missingParams = Array.from(route.matchAll(/\\{\\w+\\}/g))

            if (missingParams.length > 0) {
                throw new Error(\`Missing route parameters: \${missingParams.join(', ')} in '\${route}'\`)
            }

            const queryString = query.toString()

            if (queryString !== '') {
                route += \`?\${queryString}\`
            }

            return route
        }
    `
}
