const util = require('util')
const exec = util.promisify(require('child_process').exec)

async function fetchRoutes() {
    const { stdout, stderr } = await exec('php artisan route:list --json')

    if (stderr) {
        throw stderr
    }

    const router = new Map()

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

function compileRouteFilters(filters) {
    return filters.map((filter) => {
        filter = filter.replaceAll('.', '\\.')

        if (filter.includes('*')) {
            filter = filter.replace('*', '.*')
        }

        return new RegExp(`^${filter}$`)
    })
}

function filterRoutes(routes, { only, except }) {
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

function groupRoutes(routes, { groups }) {
    groups = Object.entries(groups).map(([name, filters]) => {
        return [name, compileRouteFilters(filters)]
    })

    const groupedRoutes = {}

    for (let [name, path] of routes) {
        const [group] = groups.find(
            ([_, filters]) => filters.some(
                (filter) => filter.test(name)
            )
        ) ?? ['default']

        groupedRoutes[group] ??= {}
        groupedRoutes[group][name] = path
    }

    return groupedRoutes
}

async function compileRoutes(options) {
    const filtered = filterRoutes(await fetchRoutes(), options)

    const groups = groupRoutes(filtered, options)

    console.log(groups)

    return groups
}

exports.compileRoutes = compileRoutes
