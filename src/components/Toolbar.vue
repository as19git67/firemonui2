<template>
  <v-app-bar :clipped-left="$vuetify.breakpoint.lgAndUp" app dark color="accent" fixed flat>
    <v-toolbar-title class="ml-0 pl-3 toolbar-title">
      <span class="hidden-sm-and-down">Alarm Monitor</span>
      <span v-if="subTitle" >{{subTitle}}</span>
      <span v-if="username">({{username}})</span>
      <span v-if="isInDevMode">(Development Mode)</span>
    </v-toolbar-title>
    <v-spacer/>
    <v-btn v-if="haveDataToSave" title="Abbrechen" icon @click="cancel()">
      <v-icon>mdi-cancel</v-icon>
    </v-btn>
    <v-btn :disabled="haveDataToSave" tilte="Einsatzliste" icon to="/">
      <v-icon>mdi-table-of-contents</v-icon>
    </v-btn>
    <v-btn v-if="isAdmin" :disabled="haveDataToSave" title="Benutzerliste" icon to="/manageusers">
      <v-icon>mdi-account-multiple</v-icon>
    </v-btn>
    <v-btn v-if="isGroupAdmin" :disabled="haveDataToSave" title="Gruppen" icon to="/managegroups">
      <v-icon>mdi-account-group</v-icon>
    </v-btn>
    <v-btn v-if="isLoggedIn" :disabled="haveDataToSave" title="Benutzerkonto verwalten" icon to="/manageaccount">
      <v-icon>mdi-account-tie</v-icon>
    </v-btn>
    <v-btn :disabled="haveDataToSave" title="Neues Benutzerkonto registrieren" icon to="/setupauth">
      <v-icon>mdi-account-plus</v-icon>
    </v-btn>
    <v-btn v-if="canLogIn" :disabled="haveDataToSave" title="Anmelden" icon @click="login()">
      <v-icon>mdi-login</v-icon>
    </v-btn>
    <v-btn v-if="canLogout" :disabled="haveDataToSave" title="Abmelden" icon @click="logout()">
      <v-icon>mdi-logout</v-icon>
    </v-btn>
  </v-app-bar>
</template>

<script>
  import {mapGetters, mapMutations} from 'vuex'

  export default {
    name: 'Toolbar',
    data() {
      return {
        canLogout: this.canLogout,
        canLogIn: this.canLogIn,
        isLoggedIn: this.isLoggedIn,
        username: this.username,
        isInDevMode: window.webpackHotUpdate,
        subTitle: this.subTitle
      }
    },
    computed: {
      ...mapGetters({
        haveDataToSave: 'haveDataToSave',
        currentJob: 'currentJob',
        jobsList: 'jobsList',
        haveActiveJob: 'haveActiveJob',
        isAdmin: 'isAdmin',
        isGroupAdmin: 'isGroupAdmin'
      }),
      notificationClass: {
        get() {
          return this.haveActiveJob ? 'red darken-1' : ''
        }
      }
    },
    watch: {
      jobsList: {
        handler: function () {
          this._checkSession()
        },
        deep: true
      }
    },
    created() {
      let job = this.currentJob
      if (job && job.keyword && job.catchword) {
        this.subTitle = `${job.keyword} - ${job.catchword}`
      } else {
        this.subTitle = undefined
      }
      this._checkSession()
    },
    methods: {
      ...mapMutations(['storeAddJobs']),
      logout: function () {
        const timer = this.$session.get('refreshTimer')
        if (timer) {
          clearTimeout(timer) // stop timer for token refresh
        }
        if (this.$session.exists()) {
          this.$session.destroy()
          this.storeAddJobs() // remove all jobs from store
        }
        this.$router.push('/')
        this.$router.go(0)
      },
      login: function () {
        const path = '/login'
        if (this.$route.path !== path) {
          this.$router.push(path)
        }
      },
      cancel: function () {
        // todo confirmation
        // todo setHaveDataToSave to false
        // todo: stop debounce timer in throttle...
        this.$router.push('/')
        this.$router.go(0)
      },
      _checkSession: function () {
        this.isAutoLogin = this.$session.exists() && this.$session.get('accessTokenIsAuto')
        this.isLoggedIn = this.$session.exists() && !this.$session.get('autologin')
        this.username = this.$session.exists() ? this.$session.get('username') : ''
        this.canLogIn = !this.$session.exists() || (this.$session.exists() && this.$session.get('autologin'))
        this.canLogout = this.isLoggedIn && !this.isAutoLogin
      }
    }
  }
</script>

<style scoped>
  .v-toolbar span:not(:first-child) {
    margin-left: 3px;
  }
  .toolbar-title span {
    margin-right: 0.5em;
  }

</style>
