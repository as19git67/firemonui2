import 'roboto-fontface/css/roboto/roboto-fontface.css'
import Vue from 'vue'
import App from './App.vue'
import store from './store'
import router from './router'
import vuetify from './plugins/vuetify';

import axios from 'axios'

import moment from 'moment'

import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import VueNativeSock from 'vue-native-websocket'
import VuetifyConfirm from 'vuetify-confirm'
import Passphrase from '@/components/Passphrase.vue'
import ModalDialogForm from '@/components/ModalDialogForm.vue'

// need the following to replace urls for icons with the ones in this webpack
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png')
})

moment.locale('de')

let originUrl = new URL(location.origin)

// if (process.env.NODE_ENV === 'development') {
//   originUrl = new URL(process.env.SERVER_URL)
//   console.log(`Using development server with origin ${originUrl}`)
// }

axios.defaults.baseURL = originUrl.origin

Vue.config.productionTip = false

/* eslint-disable no-new */

Vue.filter('toCurrency', function (value) {
  if (typeof value !== 'number') {
    return value
  }
  let formatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2
  })
  return formatter.format(value)
})

Vue.filter('toDate', function (value) {
  if (value && moment.isMoment(value)) {
    value.locale('de')
    let f = value.format('L LTS')
    return f
  } else {
    return ''
  }
})

let wsUrl
if (originUrl.protocol === 'http:') {
  wsUrl = `ws://${originUrl.host}${originUrl.pathname}`
} else {
  wsUrl = `wss://${originUrl.host}${originUrl.pathname}`
}

Vue.use(VueNativeSock, wsUrl, {
  store: store,
  reconnection: true, // (Boolean) whether to reconnect automatically (false)
  reconnectionDelay: 5000
})

Vue.use(VuetifyConfirm, { vuetify })

function InstallPassphrase(Vue) {
  const property = '$askPassphrase'

  function createDialogCmp(options) {
    return new Promise(resolve => {
      const cmp = new Vue(Object.assign(Passphrase, {
        destroyed: () => {
          document.body.removeChild(cmp.$el)
          resolve(cmp.value)
        }
      }))
      Object.assign(cmp, Vue.prototype.$askPassphrase.options || {}, options)
      document.body.appendChild(cmp.$mount().$el)
    })
  }

  function show(message, options = {}) {
    options.message = message
    return createDialogCmp(options)
  }

  Vue.prototype[property] = show
  Vue.prototype[property].options = {}
}

Vue.use(InstallPassphrase)

function InstallDialogForm(Vue) {
  const property = '$modalDialogForm'

  function createDialogCmp(options) {
    return new Promise(resolve => {
      const cmp = new Vue(Object.assign(ModalDialogForm, {
        destroyed: () => {
          document.body.removeChild(cmp.$el)
          resolve(cmp.formData)
        }
      }))
      Object.assign(cmp, Vue.prototype.$modalDialogForm.options || {}, options)
      document.body.appendChild(cmp.$mount().$el)
    })
  }

  function show(options = {}) {
    return createDialogCmp(options)
  }

  Vue.prototype[property] = show
  Vue.prototype[property].options = {}
}

Vue.use(InstallDialogForm)

new Vue({
  store,
  router,
  vuetify,
  render: h => h(App)
}).$mount('#app')
