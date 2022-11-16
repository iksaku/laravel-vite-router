import { promisify } from 'util'
import { exec as exec_sync } from 'child_process'
import { readFile, writeFile } from 'fs/promises'

const exec = promisify(exec_sync)

type RouteEntry = [string, string]
type RouteEntries = RouteEntry[]

async function fetchRoutes(): Promise<RouteEntries> {
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

    return [...router]
}

function filterRoutes(routes: RouteEntries, { only, except }): RouteEntries {
    const compileRouteFilters = (filters: string[]): RegExp[] => filters.map((filter) => {
        filter = filter.replaceAll('.', '\\.')
            .replaceAll('*', '.*')

        return new RegExp(`^${filter}$`)
    })

    const include = compileRouteFilters(only)
    const exclude = compileRouteFilters(except)
    const predicate = ([name, path]: RouteEntry) => (filter: RegExp) => filter.test(name) || filter.test(path)

    return routes.filter((entry) => {
        if (include.length) {
            return include.some(predicate(entry))
        }

        if (exclude.length) {
            return ! exclude.some(predicate(entry))
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

    const routeDeclarationsFile = `${process.cwd()}/node_modules/@iksaku/laravel-vite-router/dist/index.d.ts`

    const contents = (await readFile(routeDeclarationsFile, { encoding: 'utf-8' }))
        .replace(/(export type Routes).*/, `$1 = { ${declarations} }`)

    await writeFile(routeDeclarationsFile, contents, { encoding: 'utf-8' })
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
