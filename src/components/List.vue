<template>
  <div>
    <template>
      <Toolbar />
    </template>
    <div class="joblist">
      <h1>
        Einsatzliste
        <v-btn icon @click="createJob">
          <v-icon title="manuell anlegen">
            mdi-plus
          </v-icon>
        </v-btn>
      </h1>
      <v-data-table v-resize="onResize" :headers="headers" :items="jobsList" class="elevation-1">
        <template v-slot:item.start="{ item }">
          {{ item.start.format('L LTS') }}
        </template>
        <template v-if="$vuetify.breakpoint.smAndUp" v-slot:item.end="{ item }">
          {{ item.end.format('L LTS') }}
        </template>
        <template slot="items" slot-scope="props">
          <td class="text-xs-left">
            <router-link v-if="!props.item.encrypted"
                         :to="{ path:'/alarm/:jobId', name: 'alarm', params: { jobId: props.item.id }}"
            >
              {{ props.item.title }}
            </router-link>
            <span v-if="props.item.encrypted">{{ props.item.title}}</span>
          </td>
          <td v-if="$vuetify.breakpoint.mdAndUp" class="text-xs-left">
            {{ props.item.keyword }}
          </td>
          <td v-if="$vuetify.breakpoint.lgAndUp" class="text-xs-left">
            {{ props.item.catchword }}
          </td>
          <td class="text-xs-left">
            <v-btn v-if="isAdmin || (!props.item.onlyAdminCanDelete && canWrite)" icon
                   @click="deleteJob(props.item.id)"
            >
              <v-icon title="löschen">
                mdi-trash-can-outline
              </v-icon>
            </v-btn>
            <v-btn v-if="props.item.encrypted && canDecrypt" icon @click="decryptJob(props.item.id)">
              <v-icon title="entschlüsseln">
                mdi-lock-reset
              </v-icon>
            </v-btn>
            <v-btn v-if="!props.item.encrypted && canEncrypt" icon @click="encryptJob(props.item.id)">
              <v-icon title="verschlüsseln">
                mdi-lock-outline
              </v-icon>
            </v-btn>
            <v-btn v-if="props.item.encrypted && canDecrypt" icon @click="showEncrypted(props.item.id)">
              <v-icon title="anzeigen">
                mdi-eye-outline
              </v-icon>
            </v-btn>
          </td>
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
        pagination: {
          sortBy: 'start',
          descending: true,
          rowsPerPage: -1
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
          {text: 'Aktionen', sortable: false}
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
          if (ex.response.status === 401) {
            this.$router.push('/login')
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
  h1, h2 {
    font-weight: normal;
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
