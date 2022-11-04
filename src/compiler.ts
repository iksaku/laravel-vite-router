import { promisify } from 'util'
import { exec as exec_sync } from 'child_process'

const exec = promisify(exec_sync)

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

function filterRoutes(routes, { only, except }): [string, string][] {
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

export async function compileModule(options): Promise<string> {
    const filtered = filterRoutes(await fetchRoutes(), options)

    const routes = Object.fromEntries(filtered)

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

            for (let [key, value] of Object.entries(params)) {
                route = route.replace(\`{\${key}}\`, value)
            }

            const missingParams = Array.from(route.matchAll(/\\{\\w+\\}/g))

            if (missingParams.length > 0) {
                throw new Error(\`Missing route parameters: \${missingParams.join(', ')} in '\${route}'\`)
            }

            return route
        }
    `
}
