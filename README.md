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
import laravelViteRouter from '@iksaku/laravel-vite-router'

export default defineConfig({
    plugins: [
        laravel(),
        laravelViteRouter()
    ]
})
```

## Usage
