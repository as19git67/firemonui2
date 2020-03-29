module.exports = {
  "devServer": {
    proxy: {
      '^/': {
        target: 'http://localhost:5005',
        ws: true,
        changeOrigin: true
      }
    }
  },
  "transpileDependencies": [
    "vuetify"
  ]
}
