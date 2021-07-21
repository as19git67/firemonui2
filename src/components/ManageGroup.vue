<template>
  <div>
    <template>
      <Toolbar/>
    </template>
    <v-form>
      <v-container fluid>
        <v-card>
          <v-card-title dark color="info">
            Gruppe <span class="username ml-1 mr-1">{{groupname}}</span>verwalten:
          </v-card-title>
          <v-layout row class="ml-1">
            <v-flex xs12 sm9 md7 lg5>
              <v-card-text>Email Adresse: <span class="email">{{email}}</span></v-card-text>
            </v-flex>
            <v-flex xs12 sm3 md5 lg7>
              <v-btn v-if="canChangeEmail" @click="changeEmail()">
                ändern
              </v-btn>
            </v-flex>
          </v-layout>
          <v-layout v-if="hasFullRight" row class="ml-1">
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
        groupname: this.groupname,
        email: this.email,
        loadStatus: false,
        saveStatus: false,
      }
    },
    beforeCreate() {
      let haveSession = this.$session.exists()
      if (haveSession) {
        let accessRights = this.$session.get('accessRights')
        this.canRead = _.indexOf(accessRights, 'read') >= 0
        this.hasFullRight = _.indexOf(accessRights, 'admin') >= 0
        this.isGroupAdmin = _.indexOf(accessRights, 'groupadmin') >= 0
      }
      // must be looged in and have group admin right
      if (!(haveSession && this.isGroupAdmin)) {
        if (this.$route.query.autotoken) {
          this.$router.push({path: '/login', query: {autotoken: this.$route.query.autotoken}})
        } else {
          this.$router.push('/login')
        }
      }
    },
    created() {
    },
    async mounted() {
      this.email = ''
      const options = {
        $session: this.$session,
        $route: this.$route,
        $router: this.$router
      }
      let userdata = await this.getDetailsForUser(options)
      if (userdata) {
        this.email = userdata.email
      }
    },
    methods: {
      ...mapActions([
        'getDetailsForUser' // map `this.getDetailsForUser()` to `this.$store.dispatch('getDetailsForUser')`
      ]),
      changeEmail() {
        this.$router.push('/changeEmail')
      },
    }
  }
</script>

<style scoped>
  .username {
    font-weight: bold;
  }

  .email {
    font-style: italic;
  }

  .keystate {
    font-style: italic;
  }
</style>
