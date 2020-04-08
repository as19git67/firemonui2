<template>
  <div class="alarm-content">
    <template>
      <Toolbar/>
    </template>
    <v-tabs v-if="$vuetify.breakpoint.mdAndDown" v-model="active" background-color="yellow" slider-color="accent"
            class="mytabs">
      <v-tab :key="0" :disabled="haveDataToSave" ripple @click="resize">
        Einsatz
      </v-tab>
      <v-tab :key="1" :disabled="haveDataToSave" ripple @click="resize">
        Karte
      </v-tab>
      <v-tab :key="3" :disabled="haveDataToSave" ripple>
        Anwesenheit
      </v-tab>
      <v-tab :key="4" :disabled="haveDataToSave" ripple>
        Bericht
      </v-tab>
      <v-tab-item :key="0" class="tabArea faxArea">
        <template>
          <Fax/>
        </template>
      </v-tab-item>
      <v-tab-item :key="1" class="tabArea mapArea">
        <template>
          <Map/>
        </template>
      </v-tab-item>
      <v-tab-item :key="3" class="tabArea">
        <template>
          <Attendees/>
        </template>
      </v-tab-item>
      <v-tab-item :key="4" class="tabArea">
        <template>
          <Report/>
        </template>
      </v-tab-item>
    </v-tabs>
    <v-tabs v-if="$vuetify.breakpoint.lgAndUp" v-model="active" background-color="yellow" slider-color="accent"
            class="mytabs">
      <v-tab :key="5" :disabled="haveDataToSave" ripple @click="resize">
        Einsatz
      </v-tab>
      <v-tab :key="6" :disabled="haveDataToSave" ripple>
        Anwesenheit
      </v-tab>
      <v-tab :key="7" :disabled="haveDataToSave" ripple>
        Bericht
      </v-tab>
      <v-tab-item :key="5" class="doubleTabArea">
        <div class="leftRight">
          <div class="tabArea faxArea">
            <div class="full-height">
              <template>
                <Fax/>
              </template>
            </div>
          </div>
          <div class="tabArea mapArea">
            <div class="full-height">
              <template>
                <Map/>
              </template>
            </div>
          </div>
        </div>
      </v-tab-item>
      <v-tab-item :key="6" class="tabArea">
        <template>
          <Attendees/>
        </template>
      </v-tab-item>
      <v-tab-item :key="7" class="tabArea">
        <template>
          <Report/>
        </template>
      </v-tab-item>
    </v-tabs>
    <v-snackbar v-model="snackbar" :timeout="snackbarTimeout" :top="true" :color="snackbarColor">
      {{snackbarText}}
      <v-btn flat @click="snackbar = false">
        Schließen
      </v-btn>
    </v-snackbar>
  </div>
</template>

<script>
  import {mapActions, mapMutations, mapGetters} from 'vuex'
  import Toolbar from '@/components/Toolbar.vue'
  import Fax from '@/components/Fax.vue'
  import Map from '@/components/Map.vue'
  import Attendees from '@/components/Attendees'
  import Report from '@/components/Report'

  export default {
    active: 0,
    name: 'Alarm',
    components: {
      Attendees,
      Report,
      Toolbar,
      Fax,
      Map
    },
    data() {
      return {
        waitingForData: false,
        snackbar: false,
        snackbarTimeout: 6000,
        snackbarText: '',
        snackbarColor: 'info',
        active: this.active,
        keyword: this.keyword ? this.keyword : 'unknown',
        catchword: this.catchword ? this.catchword : 'unknown'
      }
    },
    computed: {
      ...mapGetters({
        haveDataToSave: 'haveDataToSave',
        jobsList: 'jobsList',
        currentJobId: 'currentJobId',
        currentJob: 'currentJob',
        jobById: 'jobById'
      }),
      // were not able to get the watch work with wsConnected as mapGetters => implement computed property manually
      wsConnected() {
        return this.$store.state.socket.isConnected
      }
    },
    watch: {
      wsConnected() {
        console.log(`WebSocket connection state changed. Connected: ${this.wsConnected}`)
        if (this.wsConnected) {
          this.loadJobFromServer()
        }
      }
    },
    created() {
      const jobId = this.$attrs.jobId
      const jobs = this.jobsList
      if (jobId === undefined || jobs === undefined || jobs.length === 0) {
        console.log(`No jobId - redirecting to /`)
        this.$router.replace('/')
        return
      }
      console.log(`Alarm should show job with id ${jobId}`)
      const j = this.jobById(jobId)
      if (j === undefined) {
        this.$router.replace('/')
        return
      }
      this.storeSetCurrentJobId(jobId)
      this.keyword = this.currentJob.keyword
      this.catchword = this.currentJob.catchword
      if (jobId.startsWith('d')) {
        // it is a temporarily decrypted job (only for viewing encrypted job)
        this.readonly = this.currentJob.readonly
        if (!this.readonly) {
          throw new Error('WARNING: decrypted job must be readonly')
        }
      } else {
        this.loadJobFromServer()
      }
    },
    methods: {
      ...mapMutations(['storeSetCurrentJobId', 'storeRemoveDecryptedJobs']),
      ...mapActions([
        'requestJobFromServer', // map `this.requestJobFromServer()` to `this.$store.dispatch('requestJobFromServer')`
        'requestStaffFromServer', // map `this.requestStaffFromServer()` to `this.$store.dispatch('requestStaffFromServer')`
        'requestMaterialMetadataFromServer', // map `this.requestMaterialMetadataFromServer()` to `this.$store.dispatch('requestMaterialMetadataFromServer')`
        'requestMaterialTypesFromServer' // map `this.requestMaterialTypesFromServer()` to `this.$store.dispatch('requestMaterialTypesFromServer')`
      ]),
      async loadJobFromServer() {
        this.waitingForData = true
        try {
          const options = {
            $session: this.$session,
            $route: this.$route,
            $router: this.$router,
            requestOptions: {
              withImages: true,
              jobId: this.currentJobId
            }
          }
          await this.requestJobFromServer(options)
          await this.requestStaffFromServer({$session: this.$session, $route: this.$route, $router: this.$router})
          await this.requestMaterialMetadataFromServer({
            $session: this.$session,
            $route: this.$route,
            $router: this.$router
          })
          await this.requestMaterialTypesFromServer({
            $session: this.$session,
            $route: this.$route,
            $router: this.$router
          })
        } catch (ex) {
          this._handleError(ex, 'Lesen der Einsatzdaten vom Server fehlgeschlagen')
        }
        this.waitingForData = false
      },
      resize: function () {
        window.dispatchEvent(new Event('resize'))
      },
      _handleError: function (ex, snackText) {
        this.waitingForData = false
        const errorMessage = ex.response && ex.response.data ? ex.response.data : ex.message
        this.snackbarText = `${snackText}: ${errorMessage}`
        this.snackbarColor = 'error'
        this.snackbarTimeout = 16000
        this.snackbar = true
        console.log(snackText, ex)
      }
    },
    beforeRouteLeave(to, from, next) {
      this.storeRemoveDecryptedJobs()
      next()
    }
  }
</script>

<style scoped>
  .alarm-content,
  .alarm-content .v-tabs {
    display: flex;
    flex-direction: column;
    flex: 1 1 100%;
    height: 100%;
  }

  .leftRight {
    display: flex;
    flex-direction: row;
    flex: 1 1 100%;
    height: 100%;
  }

  .leftRight .tabArea {
    flex: 1 1 50%;
    height: 100%;
  }

  .full-height {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }

  .tabArea {
    display: flex;
    flex-direction: column;
  }

  .faxArea {
    overflow-y: scroll;
  }

  .mapArea {
    align-items: center;
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    height: 100%;
  }

  .tabArea img {
    height: 100%;
    width: auto;
  }
</style>

<style>
  .mytabs > div.v-window,
  .mytabs > div.v-window > div {
    display: flex !important;
    flex-direction: column !important;
    flex: 1 1 auto !important;
    height: 100% !important;
  }

  .mytabs > div.v-window .doubleTabArea {
    flex: 1 1 auto !important;
    height: 100% !important;
  }

</style>
