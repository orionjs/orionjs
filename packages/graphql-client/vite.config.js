const path = require('path')
const {defineConfig} = require('vite')
const {visualizer} = require('rollup-plugin-visualizer')

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'orion-graphq-client',
      fileName: format => `orion-graphql-client.${format}.js`
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['react', 'graphql'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          react: 'React',
          graphql: 'graphql'
        }
      }
    }
  },
  plugins: [visualizer()]
})
