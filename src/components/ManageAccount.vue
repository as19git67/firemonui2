<template>
  <div>
    <template>
      <Toolbar/>
    </template>
    <v-form>
      <v-container fluid>
        <v-card>
          <v-card-title dark color="info">
            Benutzerkonto von <span class="username">{{username}}</span> verwalten:
          </v-card-title>
          <v-layout row>
            <v-flex xs12 sm9 md7 lg5>
              <v-card-text>Email Adresse: <span class="email">{{email}}</span></v-card-text>
            </v-flex>
            <v-flex xs12 sm3 md5 lg7>
              <v-btn v-if="canChangeEmail" @click="changeEmail()">
                ändern
              </v-btn>
            </v-flex>
          </v-layout>
          <v-layout v-if="hasFullRight" row>
            <v-flex xs12 sm9 md7 lg5>
              <v-card-text>
                Geheimer Schlüssel zum Schützen der Daten: <span class="keystate">{{keystate}}</span>
              </v-card-text>
              <v-card-text>{{btnTitleGenerateKey}}</v-card-text>
            </v-flex>
            <v-flex xs12 sm3 md5 lg7>
              <v-card-text>
                <v-btn color="primary" :disabled="generateKeyDisabled" @click="generateKeys()">
                  Neu erzeugen
                </v-btn>
              </v-card-text>
            </v-flex>
          </v-layout>
        </v-card>
      </v-container>
    </v-form>
    <v-snackbar v-model="saveStatus" :top="false" dark color="info">
      Daten werden gespeichert...
    </v-snackbar>
    <v-snackbar v-model="loadStatus" :top="false" dark color="info">
      Daten werden geladen...
    </v-snackbar>
  </div>
</template>

<script>
  import Toolbar from '@/components/Toolbar.vue'
  import {mapActions} from 'vuex'
  import _ from 'lodash'
  import axios from 'axios'

  export default {
    name: 'ManageAccount',
    components: {
      Toolbar
    },
    data() {
      this.canChangeEmail = false
      this.btnTitleGenerateKey = 'Neues Schlüsselpaar erzeugen'
      return {
        canChangeEmail: this.canChangeEmail,
        username: this.$session.get('username'),
        email: this.email,
        keystate: this.keystate,
        generateKeyDisabled: this.generateKeyDisabled,
        loadStatus: false,
        saveStatus: false,
        btnTitleGenerateKey: this.btnTitleGenerateKey
      }
    },
    beforeCreate() {
      let haveSession = this.$session.exists()
      if (haveSession) {
        let accessRights = this.$session.get('accessRights')
        this.canRead = _.indexOf(accessRights, 'read') >= 0
        this.hasFullRight = _.indexOf(accessRights, 'admin') >= 0
      }
      // must be looged in and have read right
      if (!(haveSession && this.canRead)) {
        if (this.$route.query.autotoken) {
          this.$router.push({path: '/login', query: {autotoken: this.$route.query.autotoken}})
        } else {
          this.$router.push('/login')
        }
      }
    },
    created() {
      this.generateKeyDisabled = true
    },
    async mounted() {
      this.email = ''
      this.keystate = ''
      const options = {
        $session: this.$session,
        $route: this.$route,
        $router: this.$router
      }
      let userdata = await this.getDetailsForUser(options)
      if (userdata) {
        this.email = userdata.email
        this.keystate = userdata.encryptionKeyName ? userdata.encryptionKeyName : 'nicht vorhanden'
        this.keyName = userdata.encryptionKeyName
        this.generateKeyDisabled = !!userdata.encryptionKeyName
        if (this.generateKeyDisabled) {
          this.btnTitleGenerateKey = 'Es gibt bereits ein Schlüsselpaar. Ein erneutes generieren würde den Zugriff auf bereits verschlüsselte Daten verhindern'
        }
      }
    },
    methods: {
      ...mapActions([
        'getDetailsForUser' // map `this.getDetailsForUser()` to `this.$store.dispatch('getDetailsForUser')`
      ]),
      changeEmail() {
        this.$router.push('/changeEmail')
      },
      async generateKeys() {
        if (!this.loadStatus && !this.saveStatus) {
          let password = await
            this.$askPassphrase(
              `Zur Verschlüsselung der Einsatzdaten wird ein geheimer Dechiffrierschlüssel erzeugt. Der Dechiffrierschlüssel muss mit einem Passwort (passphrase) geschützt werden.`,
              {
                title: 'Dechiffrierschlüssel erzeugen',
                idForm: 'decryptionKeyPassphrase',
                label: 'Passwort',
                btnTextOk: 'Weiter'
              })
          if (!password) {
            return
          }
          let passwordConfirmation
          let message = 'Passwort wiederholen:'
          do {
            passwordConfirmation = await this.$askPassphrase(message,
              {
                title: 'Dechiffrierschlüssel erzeugen',
                idForm: 'decryptionKeyPassphrase',
                label: 'Passwort',
                btnTextOk: 'Speichern'
              })
            if (password !== passwordConfirmation) {
              message = 'Passwörter stimmen nicht überein. Passwort wiederholen:'
            }
          } while (passwordConfirmation && passwordConfirmation !== password)
          if (passwordConfirmation === password) {
            this.keystate = 'generieren...'
            this.generateKeyDisabled = true

            this.error = ''
            this.saveStatus = true
            let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
            let config = {
              headers: {'Authorization': 'bearer ' + at}
            }
            try {
              let data = {password: password}
              let result = await axios.post(`/api/users/key`, data, config)
              this.saveStatus = false
              this.generateKeyDisabled = !!result.data.encryptionKeyName
              this.keystate = `erstellt mit dem Namen ${result.data.encryptionKeyName}`
            } catch (ex) {
              this.saveStatus = false
              this.generateKeyDisabled = !!this.keyName
              if (ex.response && ex.response.data && ex.response.data.error) {
                this.error = ex.response.data.error
              } else {
                this.error = ex.message
              }
              this.keystate = `nicht erstellt (${this.error})`
              console.log('EXCEPTION while generating new encryption key', ex)
            }
          }
        }
      }
    }
  }
</script>

<style scoped>
  .username {
    font-style: italic;
  }

  .email {
    font-style: italic;
  }

  .keystate {
    font-style: italic;
  }
</style>
