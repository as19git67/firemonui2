<template>
  <v-app>
    <v-main class="main-content">
      <router-view :key="$route.fullPath" />
    </v-main>
  </v-app>
</template>

<script>
  import moment from 'moment'
  import _ from 'lodash'
  import {mapMutations, mapActions, mapGetters} from 'vuex'

  export default {
    name: 'App',
    computed: {
      ...mapGetters({jobsList: 'jobsList', haveDataToSave: 'haveDataToSave', savingData: 'savingData'})
    },
    created () {
      moment.locale('de')
      let path = this.$route.path.toLowerCase()
      if (path.startsWith('/setupauth') === false) {
        this.$options.sockets.onmessage = (messageEvent) => {
          // console.log(messageEvent)
          let messageParts = messageEvent.data.split(':')
          let jobId
          switch (messageParts[0]) {
            case 'newJob':
              if (messageParts.length > 1) {
                jobId = messageParts[1]
                this.requestJobFromServer({
                  $session: this.$session,
                  $route: this.$route,
                  $router: this.$router,
                  requestOptions: {
                    jobId: jobId,
                    withImages: false
                  }
                }).then(() => {
                  this.gotoActiveJob()
                }).catch(reason => {
                  console.log('EXCEPTION while requesting job from server:', reason)
                })
              }
              break
            case 'updatedJob':
              // console.log('Server pushes jobs')
              if (!this.haveDataToSave && !this.savingData) {
                if (messageParts.length > 1) {
                  jobId = messageParts[1]
                  this.requestJobFromServer({
                    $session: this.$session,
                    $route: this.$route,
                    $router: this.$router,
                    requestOptions: {
                      jobId: jobId,
                      withImages: false
                    }
                  }).catch(reason => {
                    console.log('EXCEPTION while requesting job from server:', reason)
                  })
                }
              } else {
                console.log('ignoring push from server to update job, because there is new data to save')
              }
              break
            case 'deletedJob':
              // console.log('Server pushes jobs')
              if (messageParts.length > 1) {
                jobId = messageParts[1]
                this.storeRemoveJob(jobId)
              }
              break
            case 'decryptedJob':
              if (messageParts.length > 1) {
                jobId = messageParts[1]
                this.requestJobFromServer({
                  $session: this.$session,
                  $route: this.$route,
                  $router: this.$router,
                  requestOptions: {
                    jobId: jobId,
                    withImages: true
                  }
                }).catch(reason => {
                  console.log('EXCEPTION while requesting job (complete) from server:', reason)
                })
              }
              break
          }
        }
      }
    },
    methods: {
      ...mapMutations(['storeClearCurrentJobId', 'storeRemoveJob']),
      ...mapActions([
        'requestJobFromServer' // map `this.requestJobFromServer()` to `this.$store.dispatch('requestJobFromServer')`
      ]),
      gotoActiveJob () {
        // Sort jobs by start date and filter out only those that have no end set
        // These jobs are active. If there are active jobs, redirect to the Alarm page
        let jobs = this.jobsList
        let sortedJobs = _.sortBy(jobs, function (j) {
          if (j.start) {
            return j.start.unix() * -1
          } else {
            return 0
          }
        })
        let active = _.filter(sortedJobs, function (j) {
          return j.end === undefined
        })
        if (active.length > 0) {
          console.log(`have ${active.length} jobs. Navigating to /alarm/${active[0].id}`)
          this.$router.push(`/alarm/${active[0].id}`)
        } else {
          console.log('No active job')
        }
      }
    }
  }
</script>

<style language="scss">
  html, body {
    height: 100%;
  }

  #app {
    font-family: 'Avenir', Helvetica, Arial, sans-serif;
    color: #2c3e50;
    flex-direction: column;
    height: 100%;
  }

  .main-content {
    flex: 1 1 auto;
  }

  .main-content > div {
    display: flex;
    flex-direction: column;
  }
</style>
