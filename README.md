# Laravel Vite Router

An easy way to use Laravel routes in your Vite app, similar to [Ziggy](https://github.com/tighten/ziggy)
but with less setup.

## Installation
Install the vite plugin using npm:
`npm add @iksaku/laravel-vite-router --save-dev`

Or using yarn:
`yarn add -D @iksaku/laravel-vite-router`

Then add the plugin to your `vite.config.js` file:

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import router from '@iksaku/laravel-vite-router'

export default defineConfig({
    plugins: [
        laravel(),
        router()
    ]
})
```

Finally, import our `virtual:laravel/routes` module from your app entrypoint:

```js
// resources/js/app.js
import { createInertiaApp } from '@inertiajs/inertia-svelte'
import 'virtual:laravel/routes'

createInertiaApp({ ... })
```

This module will make the `route()` function globally available for your JavaScript code, be it using
plain JavaScript or a framework like Svelte, Vue or React.

## Usage

### route(name: string, params: Record<string, any>) => string
The `route()` function takes two arguments: the name of the route and an optional object of parameters,
mimicking the `route()` function from Laravel, and returns the URL for that route.

```php
// routes/web.php
Route::get('/users/{user}', fn (User $user) => $user->name)->name('users.show');
```

```js
route('users.show', { user: 1 }) // /users/1
```

> **Warning**
> We do not support passing an array of parameters to the `route()` function yet.
> If you need this, please open an issue or a PR.

This function plays really well with [InertiaJS](https://inertiajs.com/) as you can use it to generate
the URLs for your Inertia links:

```sveltehtml
<script lang="ts">
    import { inertia } from '@inertiajs/inertia-svelte'

    export let users
</script>

<div>
    <h1>Users</h1>
    <ul>
        {#each users as user}
            <li>
                <a use:inertia href={route('users.show', { user: user.id })}>
                    {user.name}
                </a>
            </li>
        {/each}
    </ul>
</div>
```

## Configuration

It is possible to only include a certain subset of routes in your JavaScript bundle. This can be done
by passing a `only` property to the plugin options:

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import router from '@iksaku/laravel-vite-router'

export default defineConfig({
    plugins: [
        laravel(),
        router({
            only: [
                'api.*', // Filter can be compared against the route name
                '/dashboard/*', // As well as to be compared against the route path 
            ]
        })
    ]
})
```
It is also possible to exclude certain routes from the JavaScript bundle by passing an `except` property
to the plugin options:

```js
import { defineConfig } from 'vite'
import laravel from 'laravel-vite-plugin'
import router from '@iksaku/laravel-vite-router'

export default defineConfig({
    plugins: [
        laravel(),
        router({
            except: [
                'api.internal.*', // Again, filter can be compared against the route name
                '/supersecretsettings/*', // And compared against the route path too 
            ]
        })
    ]
})
```
