<template>
  <div>
    <template>
      <Toolbar />
    </template>
    <v-container fluid fill-height>
      <v-layout align-center justify-center>
        <v-flex xs12 sm8 md4>
          <v-card class="elevation-12">
            <v-toolbar dark color="primary">
              <v-toolbar-title>Anmelden</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <v-text-field id="username" v-model="username" prepend-inner-icon="mdi-account-circle" name="username"
                            label="Benutzername" type="text" default
                            autofocus
              />
            </v-card-text>
            <v-layout align-center justify-center>
              <v-text-field id="code" v-model="code" name="code" type="text" autocomplete="off"
                            outlined
                            solo
                            flat
                            persistent-hint
                            hint="Authenticator App Code"
                            class="codefield display-2 justify-center"
                            @keyup.enter="validateCode()"
              />
            </v-layout>
            <v-card-actions>
              <v-spacer />
              <v-spacer />
              <div v-if="error" class="red--text" v-text="error" />
              <v-progress-circular v-if="inprogress" indeterminate color="primary" />
              <v-spacer />
              <v-btn :disabled="!code || code.length !== 6" color="primary" @click="validateCode()">
                Code prüfen
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-flex>
      </v-layout>
    </v-container>
  </div>
</template>

<script>
  import Toolbar from '@/components/Toolbar.vue'
  import {mapActions} from 'vuex'

  export default {
    name: 'Login',
    components: {
      Toolbar
    },
    data() {
      return {
        inprogress: this.inprogress,
        error: this.error,
        username: this.username,
        code: this.code
      }
    },
    beforeRouteEnter(to, from, next) {
      // called before the route that renders this component is confirmed.
      // does NOT have access to `this` component instance,
      // because it has not been created yet when this guard is called!
      next((vm) => {
        vm.from = from
      })
    },
    beforeRouteLeave (to, from, next) {
      // called when the route that renders this component is about to
      // be navigated away from.
      // has access to `this` component instance.
      if (this.timer) {
        console.log('Stopping timer, because navigating away')
        clearTimeout(this.timer)
        delete this.timer
      }
      next()
    },
    mounted () {
      this.username = this.$route.query.name
      this.code = ''
      this.inprogress = false
      this.error = null
      if (this.timer) {
        clearTimeout(this.timer)
      }
      this.timer = setTimeout(() => {
        console.log('Auto navigation to / after timeout')
        this.$router.replace('/')
      }, 600000)
    },
    methods: {
      ...mapActions([
        'loginWithCode' // map `this.loginWithCode()` to `this.$store.dispatch('loginWithCode')`
      ]),
      validateCode () {
        if (!this.code || this.code.length !== 6) {
          return // skip validation if code is missing
        }
        this.error = ''
        this.inprogress = true
        this.loginWithCode({$session: this.$session, name: this.username, code: this.code})
          .then(() => {
            clearTimeout(this.timer)
            delete this.timer
            this.inprogress = false
            this.error = ''
            if (this.from) {
              let options = {path: this.from.path}
              // navigate to the url that was saved in beforeRouteEnter, which is the path that was originally meant
              if (this.$route.query.doaction) {
                options.query = {doaction: this.$route.query.doaction}
              }
              this.$router.replace(options)
            } else {
              this.$router.replace('/')
            }
          })
          .catch(error => {
            clearTimeout(this.timer)
            delete this.timer
            this.inprogress = false
            if (error.response && error.response.status === 404) {
              this.error = 'Falscher Code'
            } else {
              console.log(error)
              this.error = 'Fehler beim Prüfen des Codes'
            }
          })
      }
    }
  }
</script>

<style scoped>
  .codefield {
    max-width: 4.5em;
  }
</style>

<style>
  .codefield input {
    font-family: monospace;
  }
  .v-input.codefield input {
    max-height: unset;
  }
</style>
