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
              <v-toolbar-title>Benutzer Registrierung</v-toolbar-title>
            </v-toolbar>
            <v-card-text>
              <v-form v-model="valid">
                <v-text-field id="name" v-model="name" prepend-icon="person" name="name" label="Benutzername" type="text"
                              :rules="[rules.required, rules.userValid]"
                />
                <v-text-field id="email" v-model="email" prepend-icon="email" name="email" label="Email" type="text" :rules="[rules.required, rules.email]"
                              @keyup.enter="startSetupAuth()"
                />
              </v-form>
            </v-card-text>
            <v-card-actions>
              <v-spacer />
              <v-spacer />
              <div v-if="error" class="red--text" v-text="error" />
              <v-progress-circular v-if="inprogress" indeterminate color="primary" />
              <v-spacer />
              <v-btn :disabled="!valid" color="primary" @click="startSetupAuth()">
                Weiter
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
  import axios from 'axios'

  export default {
    name: 'SetupAuth',
    components: {
      Toolbar
    },
    data () {
      return {
        rules: {
          required: value => !!value || 'Ein Wert muss eingegeben werden',
          userValid: value => {
            const pattern = /^([a-z0-9]+)$/
            return pattern.test(value) || 'Nur a-z und 0-9'
          },
          email: value => {
            const pattern = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            return pattern.test(value) || 'Ungültige e-mail Adresse'
          }
        },
        valid: this.valid,
        error: null,
        name: null,
        email: null,
        inprogress: false
      }
    },
    methods: {
      startSetupAuth () {
        this.error = ''
        this.inprogress = true
        const j = JSON.stringify({name: this.name, email: this.email})
        const c = {headers: {'Content-Type': 'application/json'}}
        axios.post('/api/verifyemail', j, c)
          .then(request => {
            this.inprogress = false
            this.error = ''
            this.$router.replace('/setupauth2')
          })
          .catch(error => {
            if (error.response.status === 429) {
              this.error = 'Bitte später erneut versuchen.'
            } else {
              this.error = error.message
            }
            this.inprogress = false
          })
      }
    }
  }
</script>

<style scoped>

</style>
