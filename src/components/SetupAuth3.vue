<template>
  <v-container fluid>
    <v-layout align-center justify-center>
      <v-flex xs12 sm10 md8>
        <v-card class="elevation-12">
          <v-toolbar dark color="primary">
            <v-toolbar-title>Benutzer Registrieren - Authenticator Setup</v-toolbar-title>
          </v-toolbar>
          <v-container fluid>
            <v-layout wrap>
              <v-flex xs12 sm4 md2>
                <span class="body-2">Benutzername:</span>
              </v-flex>
              <v-flex xs12 sm8 md10>
                <span class="body-1">{{name}}</span>
              </v-flex>
              <v-flex xs12 sm4 md2>
                <span class="body-2">Email:</span>
              </v-flex>
              <v-flex xs12 sm8 md10>
                <span class="body-1">{{email}}</span>
              </v-flex>
            </v-layout>
          </v-container>
          <v-container fluid>
            <v-layout wrap>
              <v-flex xs12>
                <p class="body-2">
                  Schritt 1: Download Google Authenticator
                </p>
                <div class="app-download-badges">
                  <a class="ios" href="https://itunes.apple.com/de/app/google-authenticator/id388497605?mt=8"
                     style="display:inline-block;overflow:hidden;background:url(https://linkmaker.itunes.apple.com/de-de/badge-lrg.svg?releaseDate=2010-09-20&kind=iossoftware&bubble=ios_apps) no-repeat;width:135px;height:40px;"
                  />
                  <a class="android"
                     href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2&hl=de&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1"
                  >
                    <img alt="Jetzt bei Google Play"
                         src="https://play.google.com/intl/en_us/badges/images/generic/de_badge_web_generic.png"
                    >
                  </a>
                </div>
                <p/>
                <p class="body-2">
                  Schritt 2: die Authenticator App durch scannen des QR codes initialisieren, oder
                  manuell den geheimen Schlüssel <span
                    class="secret"
                  >{{secret}}</span> eingeben
                </p>
                <qrcode-vue :value="otpauthURL" :size="qrsize" level="H"/>
                <p/>
                <p class="body-2">
                  Schritt 3: dann den von der Authenticator App generierten Code eingeben
                </p>
              </v-flex>
              <v-flex>
                <v-text-field id="code" v-model="code" name="code" type="text" autocomplete="off"
                              autofocus
                              outlined
                              solo
                              flat
                              persistent-hint
                              hint="6-stelliger Code"
                              class="codefield display-2 justify-center"
                              @keyup.enter="validateCode()"
                />
              </v-flex>
            </v-layout>
          </v-container>
          <v-card-actions>
            <v-spacer/>
            <v-spacer/>
            <div v-if="error" class=" red--text
                  " v-text="error"
            />
            <v-progress-circular v-if="inprogress" indeterminate color="primary"/>
            <v-spacer/>
            <v-btn :disabled="!code || code.length !== 6" color="primary" @click="validateCode()">
              Weiter
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
  import axios from 'axios'
  import QrcodeVue from 'qrcode.vue'

  export default {
    name: 'SetupAuth3',
    otpauthURL: '',
    code: '',
    components: {
      QrcodeVue
    },
    data() {
      return {
        inprogress: false,
        error: '',
        name: this.$route.query.name,
        email: this.$route.query.email,
        otpauthURL: this.otpauthURL,
        secret: this.secret,
        qrsize: 300,
        code: this.code
      }
    },
    mounted() {
      this.getUserSecret()
    },
    methods: {
      getUserSecret() {
        this.error = ''
        this.inprogress = true
        let self = this
        axios.get(`/api/usersecret?name=${this.$route.query.name}&email=${this.$route.query.email}&token=${this.$route.query.token}`)
          .then(function (response) {
            self.inprogress = false
            self.error = ''
            try {
              let res = JSON.parse(response.data)
              self.otpauthURL = res.otpauthURL
              let otpauthURL = new URL(res.otpauthURL)
              let params = new URLSearchParams(otpauthURL.search)
              self.secret = params.get('secret')
            } catch (ex) {
              console.log(ex)
            }
          })
          .catch(function (error) {
            console.log(error.message)
            self.inprogress = false
            self.error = 'Fehler beim holen des QR codes'
          })
      },
      validateCode() {
        if (!this.code || this.code.length !== 6) {
          return // skip validation if code is missing
        }
        const self = this
        this.error = ''
        this.inprogress = true
        const j = JSON.stringify({name: this.name, code: this.code})
        const c = {headers: {'Content-Type': 'application/json'}}
        axios.post('/api/verifycode', j, c)
          .then(function () {
            self.inprogress = false
            self.error = ''
            self.$router.replace('/setupauth4')
          })
          .catch(function (error) {
            console.log(error.message)
            self.inprogress = false
            self.error = 'Fehler beim Prüfen des Codes'
          })
      }
    }
  }
</script>

<style scoped>
  .app-download-badges {
    display: flex;
    align-items: center;
  }

  .app-download-badges .android {
    width: 135px;
    height: 60px;
  }

  .app-download-badges img {
    width: 135px;
    height: 100%;
    display: block;
  }

  .secret {
    word-wrap: break-word;
  }

  .codefield {
    max-width: 4.5em;
  }
</style>

<style>
  .codefield input {
    margin-top: 6px;
    margin-bottom: 3px;
    font-family: monospace;
  }
</style>
