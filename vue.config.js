module.exports = {
  "devServer": {
    proxy: {
      '^/': {
        target: 'http://[::1]:5005',
        logLevel: "debug",
//        target: 'http://localhost:5005',
      },
      '^/websocket': {
        target: 'http://[::1]:5005',
        logLevel: "debug",
//        target: 'http://localhost:5005',
        ws: true,
        changeOrigin: true
      }
    }
  },
  "transpileDependencies": [
    "vuetify"
  ]
}
