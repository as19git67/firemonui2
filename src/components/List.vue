<template>
  <div>
    <template>
      <Toolbar/>
    </template>
    <div class="joblist">
      <v-toolbar-title class="ml-0 mt-2 mb-2 pl-4">
        Einsatzliste
        <v-btn icon @click="createJob">
          <v-icon title="manuell anlegen">
            mdi-plus
          </v-icon>
        </v-btn>
      </v-toolbar-title>
      <v-data-table v-resize="onResize"
                    :headers="headers"
                    :items="jobsList"
                    :options="tableOptions"
                    :custom-sort="customSort"
                    class="elevation-1"
                    hide-default-footer
                    :disable-pagination="true">
        <template v-slot:item.start="{ item }">
          {{ item.start ? item.start.format('L LTS') : '' }}
        </template>
        <template v-if="$vuetify.breakpoint.smAndUp" v-slot:item.end="{ item }">
          {{ item.end ? item.end.format('L LTS') : '' }}
        </template>
        <template v-slot:item.title="{ item }">
          <router-link v-if="!item.encrypted"
                       :to="{ path:'/alarm/:jobId', name: 'alarm', params: { jobId: item.id }}"
          >
            {{ item.title }}
          </router-link>
          <span v-if="item.encrypted">{{ item.title}}</span>
        </template>
        <template v-if="$vuetify.breakpoint.mdAndUp" v-slot:item.keyword="{ item }">
          {{ item.keyword }}
        </template>
        <template v-if="$vuetify.breakpoint.lgAndUp" v-slot:item.catchword="{ item }">
          {{ item.catchword }}
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn v-if="isAdmin || (!item.onlyAdminCanDelete && canWrite)" icon
                 @click="deleteJob(item.id)"
          >
            <v-icon title="löschen">
              mdi-trash-can-outline
            </v-icon>
          </v-btn>
          <v-btn v-if="item.encrypted && canDecrypt" icon @click="decryptJob(item.id)">
            <v-icon title="entschlüsseln">
              mdi-lock-reset
            </v-icon>
          </v-btn>
          <v-btn v-if="!item.encrypted && canEncrypt" icon @click="encryptJob(item.id)">
            <v-icon title="verschlüsseln">
              mdi-lock-outline
            </v-icon>
          </v-btn>
          <v-btn v-if="item.encrypted && canDecrypt" icon @click="showEncrypted(item.id)">
            <v-icon title="anzeigen">
              mdi-eye-outline
            </v-icon>
          </v-btn>
        </template>
      </v-data-table>
      <v-snackbar v-model="errorSnackbar" :timeout="16000" :top="true" color="error">
        {{errorSnackbarText}}
        <v-btn text @click="errorSnackbar = false">
          Schließen
        </v-btn>
      </v-snackbar>
    </div>
  </div>
</template>

<script>
  import Toolbar from '@/components/Toolbar.vue'
  import _ from 'lodash'
  import moment from 'moment'
  import {mapActions, mapMutations, mapGetters} from 'vuex'

  export default {
    components: {
      Toolbar
    },
    data() {
      return {
        loading: this.loading,
        canDelete: this.canDelete,
        errorSnackbarText: '',
        errorSnackbar: false,
        tableOptions: {
          itemsPerPage: -1,
          sortBy: ['start'],
          sortDesc: [true],
        },
        headers: this.headers
      }
    },
    computed: {
      ...mapGetters({
        jobById: 'jobById',
        jobsList: 'jobsList',
        canRead: 'canRead',
        canWrite: 'canWrite',
        isAdmin: 'isAdmin',
        canDecrypt: 'canDecrypt',
        canEncrypt: 'canEncrypt',
        currentJobId: 'currentJobId'
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
          let jobId = this.currentJobId
          this.loadAllJobs()
          if (jobId !== undefined) {
            this.storeSetCurrentJobId(jobId)
          }
        }
      }
    },
    created() {
      // this.$emit('load-jobs') // trigger loading jobs at app level
    },
    mounted() {
      this.loadAllJobs()
    },
    methods: {
      ...mapMutations(['storeClearCurrentJobId', 'storeRemoveDecryptedJobs']),
      ...mapActions([
        'requestJobsFromServer', // map `this.requestJobsFromServer()` to `this.$store.dispatch('requestJobsFromServer')`
        'createJobAtServer', // map `this.createJobAtServer()` to `this.$store.dispatch('createJobAtServer')`
        'deleteJobAtServer', // map `this.deleteJobAtServer()` to `this.$store.dispatch('deleteJobAtServer')`
        'encryptJobById', // map `this.encryptJobById()` to `this.$store.dispatch('encryptJobById')`
        'decryptJobById', // map `this.decryptJobById()` to `this.$store.dispatch('decryptJobById')`
        'tempDecryptJobById' // map `this.tempDecryptJobById()` to `this.$store.dispatch('tempDecryptJobById')`
      ]),
      customSort(items, index, isDesc) {
        if (index.length === 0) {
          // default is start column, descending
          index.push('start')
          isDesc.push(true)
        }
        const i = index [0]
        const desc = isDesc[0];
        items.sort((a, b) => {
          const aVal = a[i]
          const bVal = b[i]
          if (aVal === undefined) {
            return desc ? -1 : 1
          }
          if (bVal === undefined) {
            return desc ? 1 : -1
          }
          switch (i) {
            case 'start':
            case 'end':
              if (!moment.isMoment(aVal) && !moment.isMoment(bVal)) {
                return 0
              }
              if (!moment.isMoment(aVal) && moment.isMoment(bVal)) {
                return desc ? 1 : -1
              }
              if (moment.isMoment(aVal) && !moment.isMoment(bVal)) {
                return desc ? -1 : 1
              }
              if (desc) {
                return aVal.isAfter(bVal) ? -1 : 1
              } else {
                return aVal.isBefore(bVal) ? -1 : 1
              }
            case 'title':
            case 'keyword':
            case 'catchword':
              if (!_.isString(aVal) && !_.isString(bVal)) {
                return 0
              }
              if (!_.isString(aVal)) {
                return desc ? 1 : -1
              }
              if (!_.isString(bVal)) {
                return desc ? 1 : -1
              }
              if (!desc) {
                return aVal.localeCompare(bVal, 'de', {sensitivity: 'base'})
              } else {
                return bVal.localeCompare(aVal, 'de', {sensitivity: 'base'})
              }
            default:
              if (!desc) {
                return aVal < bVal ? -1 : 1
              } else {
                return bVal < aVal ? -1 : 1
              }
          }
        });
        return items;
      },
      loadAllJobs() {
        if (this.loading) {
          return
        }
        this.loading = true
        this.storeClearCurrentJobId()
        this.storeRemoveDecryptedJobs()
        this.requestJobsFromServer({
          $session: this.$session,
          $route: this.$route,
          $router: this.$router,
          requestOptions: {withImages: false}
        })
          .then(() => {
            this.loading = false
            this.onResize()
            if (this.$route.query.doaction === 'deleteJob' && this.$route.query.jobId !== undefined) {
              this.deleteJob(this.$route.query.jobId)
            }
            if (this.$route.query.doaction === 'decryptJob' && this.$route.query.jobId !== undefined) {
              this.decryptJob(this.$route.query.jobId)
            }
            if (this.$route.query.doaction === 'showEncrypted' && this.$route.query.jobId !== undefined) {
              this.showEncrypted(this.$route.query.jobId)
            }
          }).catch(reason => {
          this._handleError(reason, 'Lesen der Jobliste fehlgeschlagen')
        })
      },
      onResize() {
        const minSizes = {
          end: 'sm',
          keyword: 'md',
          catchword: 'lg'
        }
        this.headers = _.filter([
          {text: 'Start', align: 'left', sortable: true, value: 'start'},
          {text: 'Ende', align: 'left', sortable: true, value: 'end'},
          {text: 'Titel', align: 'left', sortable: true, value: 'title'},
          {text: 'Schlüsselwort', sortable: true, value: 'keyword'},
          {text: 'Schlagwort', sortable: true, value: 'catchword'},
          {text: 'Aktionen', sortable: false, value: 'actions'}
        ], (h) => {
          if (minSizes[h.value]) {
            const minSize = minSizes[h.value]
            switch (minSize) {
              case 'sm':
                return this.$vuetify.breakpoint.smAndUp
              case 'md':
                return this.$vuetify.breakpoint.mdAndUp
              case 'lg':
                return this.$vuetify.breakpoint.lgAndUp
            }
          } else {
            return true
          }
        })
        // this.tableData = _.map(this.jobsList, j => {
        //   return j
        // })
      },
      async createJob() {
        const formData = await this.$modalDialogForm({
          message: 'Der eingegebene Titel erscheint in der Einsatzliste und kann später geändert werden.',
          title: 'Neuen Einsatzbericht anlegen',
          form: [{key: 'title', label: 'Titel'}],
          btnTextOk: 'Anlegen'
        })
        if (formData.length > 0) {
          const titleField = _.find(formData, {key: 'title'})
          const title = titleField.value
          this.loading = true
          this.createJobAtServer({$session: this.$session, $route: this.$route, $router: this.$router, title: title})
            .then(() => {
              this.loading = false
            })
            .catch(reason => {
              this.loading = false
              this._handleError(reason, 'Einsatz anlegen fehlgeschlagen')
            })
        }
      },
      deleteJob(jobId) {
        if (!this.loading) {
          let jobToDelete = this.jobById(jobId)
          if (jobToDelete) {
            let title = jobToDelete.title
            this.$confirm(`Sollen die Daten mit dem Titel "${title}" wirklich gelöscht werden?`,
              {title: 'Eintrag löschen', buttonTrueText: 'Ja', buttonFalseText: 'Nein'})
              .then(yes => {
                if (yes) {
                  this.loading = true
                  this.deleteJobAtServer({
                    $session: this.$session,
                    $route: this.$route,
                    $router: this.$router,
                    jobId: jobId
                  })
                    .then(() => {
                      this.loading = false
                    })
                    .catch(reason => {
                      this._handleError(reason, 'Einsatz löschen fehlgeschlagen')
                    })
                }
              })
          } else {
            console.log('ERROR: unknown job id for deletion', jobId)
          }
        }
      },
      async encryptJob(jobId) {
        if (!this.loading) {
          let jobToEncrypt = this.jobById(jobId)
          let title = jobToEncrypt.title
          let yes = await
            this.$confirm(
              `Sollen die Daten von "${title}" wirklich verschlüsselt werden? Die Daten können nur mit dem geheimen Dechiffrierschlüssel wieder hergestellt werden.`,
              {title: 'Eintrag chiffrieren', buttonTrueText: 'Ja', buttonFalseText: 'Nein'})
          if (yes) {
            try {
              this.loading = true
              await this.encryptJobById({jobId: jobId})
              this.loading = false
            } catch (ex) {
              this._handleError(ex, 'Chiffrieren fehlgeschlagen')
            }
          }
        }
      },
      async decryptJob(jobId) {
        if (!this.loading) {
          if (this.canDecrypt) {
            const message = 'Zum Entschlüsseln muss das Passwort für den Dechiffrierschlüssel eingegeben werden:'
            const passphrase = await this.$askPassphrase(message, {
              title: 'Passwort eingeben',
              idForm: 'decryptionKeyPassphrase',
              label: 'Passwort',
              btnTextOk: 'Dechiffrieren'
            })
            if (passphrase) {
              try {
                this.loading = true
                await this.decryptJobById({jobId: jobId, passphrase: passphrase})
                this.loading = false
              } catch (ex) {
                this._handleError(ex, 'Dechiffrieren fehlgeschlagen')
              }
            }
          } else {
            this.$router.replace({path: '/login', query: {doaction: 'decryptJob', jobId: jobId}})
          }
        }
      },
      async showEncrypted(jobId) {
        if (!this.loading) {
          if (this.canDecrypt) {
            const message = 'Zum Entschlüsseln muss das Passwort für den Dechiffrierschlüssel eingegeben werden:'
            const passphrase = await this.$askPassphrase(message, {
              title: 'Passwort eingeben',
              idForm: 'decryptionKeyPassphrase',
              label: 'Passwort',
              btnTextOk: 'Dechiffrieren',
              needStrongPassword: false
            })
            if (passphrase) {
              const encryptionKeyName = this.$session.get('encryptionKeyName')
              if (passphrase) {
                try {
                  this.loading = true
                  const id = await this.tempDecryptJobById({
                    jobId: jobId,
                    passphrase: passphrase,
                    encryptionKeyName: encryptionKeyName
                  })
                  this.loading = false
                  this.$router.push(`/alarm/${id}`)
                } catch (ex) {
                  this._handleError(ex, 'Dechiffrieren fehlgeschlagen')
                }
              }
            }
          } else {
            this.$router.replace({path: '/login', query: {doaction: 'showEncrypted', jobId: jobId}})
          }
        }
      },
      _hasRight(right) {
        switch (right) {
          case 'read':
            return this.canRead
          case 'write':
            return this.canWrite
          case 'full':
            return this.isAdmin
          case 'decrypt':
            return this.canDecrypt
          case 'encrypt':
            return this.canEncrypt
          default:
            return false
        }
      },
      _handleError: function (ex, snackText) {
        this.loading = false
        let errorMessage = ex.message
        if (ex.response) {
          if (ex.response.data && ex.response.data.error) {
            errorMessage = ex.response.data.error
          }
          if (ex.response.status === 401) {
            this.errorSnackbarText = `${snackText}: ${errorMessage}`
            this.errorSnackbar = true
//            this.$router.push('/login')
          } else {
            if (ex.response.data && ex.response.data.error) {
              errorMessage = ex.response.data.error
            }
          }
        }
        this.errorSnackbarText = `${snackText}: ${errorMessage}`
        this.errorSnackbar = true
        console.log(snackText, ex)
      }
    }
  }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
  .joblist > .xheadline {
    padding-left: 1em;
  }

  ul {
    list-style-type: none;
    padding: 0;
  }

  li {
    display: inline-block;
    margin: 0 10px;
  }

  a {
    color: #42b983;
  }

  .v-btn {
    margin: 0;
  }
</style>
