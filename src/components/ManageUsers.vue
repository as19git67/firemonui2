<template>
  <div>
    <template>
      <Toolbar />
    </template>
    <div class="userlist">
      <h1>Benutzerliste</h1>
      <v-data-table :headers="headers" :items="users" :pagination.sync="pagination" class="elevation-1" :loading="loading">
        <v-progress-linear slot="progress" indeterminate color="info" />
        <template slot="items" slot-scope="props">
          <td class="text-xs-left">
            {{ props.item.name }}
          </td>
          <td class="text-xs-left">
            {{ props.item.email }}
          </td>
          <td class="text-xs-left">
            {{ props.item.stateFormatted }}
          </td>
          <td>
            <v-checkbox :input-value="props.item.canRead" primary hide-details :disabled="props.item.canReadDisabled"
                        @click="toggleCanRead(props.item.name)"
            />
          </td>
          <td>
            <v-checkbox :input-value="props.item.canWrite" primary hide-details :disabled="props.item.canWriteDisabled"
                        @click="toggleCanWrite(props.item.name)"
            />
          </td>
          <td>
            <v-checkbox :input-value="props.item.canDecrypt" hide-details :disabled="props.item.canDecryptDisabled"
                        @click="toggleCanDecrypt(props.item.name)"
            />
          </td>
          <td>
            <v-checkbox :input-value="props.item.isAdmin" hide-details :disabled="props.item.isAdminDisabled"
                        @click="toggleIsAdmin(props.item.name)"
            />
          </td>
          <td class="text-xs-left" :class="props.item.expiredClass">
            {{ props.item.expiredAfter | toDate }}
          </td>
          <td class="text-xs-left">
            <v-btn v-if="isAdmin" @click="deleteUser(props.item.name)">
              Löschen
            </v-btn>
          </td>
        </template>
      </v-data-table>
      <v-snackbar v-model="errorSnackbar" :timeout="16000" :top="true" color="error">
        {{errorSnackbarText}}
        <v-btn flat @click="errorSnackbar = false">
          Schließen
        </v-btn>
      </v-snackbar>
      <v-snackbar v-model="snackbar" :timeout="snackbarTimeout" :top="true" :color="snackbarColor">
        {{snackbarText}}
        <v-btn flat @click="snackbar = false">
          Schließen
        </v-btn>
      </v-snackbar>
    </div>
  </div>
</template>

<script>
  import Toolbar from '@/components/Toolbar.vue'
  import axios from 'axios'
  import moment from 'moment'
  import _ from 'lodash'
  import {mapMutations} from 'vuex'

  export default {
    name: 'ManageUsers',
    beforeCreate () {
      let haveSession = this.$session.exists()
      if (haveSession) {
        let accessRights = this.$session.get('accessRights')
        this.isAdmin = _.indexOf(accessRights, 'admin') >= 0
      }
      if (!(haveSession && this.isAdmin)) {
        if (this.$route.query.autotoken) {
          this.$router.push({path: '/login', query: {autotoken: this.$route.query.autotoken}})
        } else {
          this.$router.push('/login')
        }
      }
    },
    created () {
      moment.locale('de')
      this.storeClearCurrentJobId()
    },
    methods: {
      ...mapMutations(['storeClearCurrentJobId']),
      _handleError: function (ex, snackText) {
        this.loading = false
        const errorMessage = ex.response && ex.response.data ? ex.response.data : ex.message
        this.errorSnackbarText = `${snackText}: ${errorMessage}`
        this.errorSnackbar = true
        console.log(snackText, ex)
      },
      async toggleCanRead (name) {
        if (!this.loading) {
          this.error = ''
          this.loading = true
          let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
          let config = {
            headers: {'Authorization': 'bearer ' + at}
          }
          try {
            let user = _.find(this.users, {name: name})
            let data = {canRead: !user.canRead}
            let response = await axios.put(`/api/user/${name}`, data, config)
            this.loading = false
            this.$set(user, 'canRead', response.data.canRead)
            this.$set(user, 'canWriteDisabled', !response.data.canRead)
            this.$set(user, 'canDecryptDisabled', !(this.isAdmin && response.data.canRead && response.data.canWrite))
            this.$set(user, 'isAdminDisabled', !response.data.canRead)
          } catch (ex) {
            this._handleError(ex, 'Fehler beim Ändern der Berechtigung (canRead)')
          }
        }
      },
      async toggleCanWrite (name) {
        if (!this.loading) {
          this.error = ''
          this.loading = true
          let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
          let config = {
            headers: {'Authorization': 'bearer ' + at}
          }
          try {
            let user = _.find(this.users, {name: name})
            let data = {canWrite: !user.canWrite}
            let response = await axios.put(`/api/user/${name}`, data, config)
            this.loading = false
            this.$set(user, 'canWrite', response.data.canWrite)
            this.$set(user, 'canReadDisabled', response.data.canWrite)
            this.$set(user, 'canDecryptDisabled', !(this.isAdmin && response.data.canRead && response.data.canWrite))
          } catch (ex) {
            this._handleError(ex, 'Fehler beim Ändern der Berechtigung (canWrite)')
          }
        }
      },
      _verifyDecryptionPassphrase: async function (ownPassword) {
        const encryptionKeyName = this.$session.get('encryptionKeyName')
        let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
        let config = {headers: {'Authorization': 'bearer ' + at, password: ownPassword, encryptionKeyName: encryptionKeyName}}
        try {
          await axios.get(`/api/users/key`, config)
        } catch (ex) {
          if (ex.response && ex.response.status === 403) {
            throw new Error('Das Passwort ist falsch')
          } else {
            throw ex
          }
        }
      },
      _disableCanDecrypt: async function (user, name) {
        const message =
          `Wenn dem Benutzer ${user.name} das Recht zum Dechiffrieren entzogen wird, wird der ihm zugeordnete geheime Dechiffrierschlüssel entfernt. ` +
          `Hinweis: wenn kein anderer Benutzer mehr das Recht zum Dechiffrieren hat, oder niemand mehr sein jeweiliges Passwort für den Dechiffrierschlüssel ` +
          `kennt, können die Daten nie mehr entschlüsselt werden. Wollen sie Benutzer ${user.name} das Recht zum Dechiffrieren entziehen?`
        let ok = await this.$confirm(message, {title: 'Recht zum Dechiffrieren entziehen', buttonTrueText: 'Ja', buttonFalseText: 'Nein'})
        if (!ok) {
          return
        }
        let ownPassword = await this.$askPassphrase(
          `Damit sichergestellt ist, dass chiffrierte Daten vom aktuellen Benutzer entschlüsselt werden können, wird nun das Passwort für den geheimen Dechiffrierschlüssel abgefragt.`,
          {title: 'Passwort für den Dechiffrierschlüssel eingeben', idForm: 'decryptionKeyPassphrase', label: 'Passwort', btnTextOk: 'Prüfen'})
        if (!ownPassword) {
          return
        }
        this.loading = true
        await this._verifyDecryptionPassphrase(ownPassword)
        let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
        let config = {headers: {'Authorization': 'bearer ' + at, encryptionKeyName: user.encryptionKeyName}}
        await axios.delete(`/api/user/${name}/key`, config)
        this.loading = false
        this.$set(user, 'encryptionKeyName', '')
        this.$set(user, 'canDecrypt', false)
      },
      toggleCanDecrypt (name) {
        const encryptionKeyName = this.$session.get('encryptionKeyName')
        if (!this.inToggleCanDecrypt && encryptionKeyName) {
          this.inToggleCanDecrypt = true
          let user = _.find(this.users, {name: name})
          if (user.canDecrypt) {
            let otherDecryptor = _.find(this.users, function (u) {
              return u.canDecrypt && u.name !== user.name
            })
            if (otherDecryptor) {
              this._disableCanDecrypt(user, name)
                .then(() => {
                  this.inToggleCanDecrypt = false
                })
                .catch(reason => {
                  this.inToggleCanDecrypt = false
                  this._handleError(reason, 'Fehler beim Löschen der Berechtigung zum Dechiffrieren')
                })
            } else {
              this.snackbarText = 'Diesem Benutzer kann das Recht zum Dechiffrieren nicht entzogen werden, da kein weiterer Benutzer die Möglichkeit zum Dechiffrieren hat.'
              this.snackbarColor = 'info'
              this.snackbar = true
              this.inToggleCanDecrypt = false
            }
          } else {
            // enable decryption for a different user
            this.$askPassphrase(
              `Zum Weitergeben des geheimen Schlüssels, der zum Dechiffrieren verwendet wird, muss das Passwort für den eigenen Dechiffrierschlüssel eingeben werden.`,
              {title: 'Passwort für den eigenen Dechiffrierschlüssel eingeben', idForm: 'decryptionKeyPassphrase', label: 'Passwort', btnTextOk: 'Prüfen'})
              .then(async ownPassword => {
                if (!ownPassword) {
                  this.inToggleCanDecrypt = false
                  return
                }

                let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
                let config = {
                  headers: {'Authorization': 'bearer ' + at, password: ownPassword, encryptionKeyName: encryptionKeyName}
                }
                try {
                  this.loading = true
                  await axios.get(`/api/users/key`, config)
                  this.loading = false
                } catch (ex) {
                  console.log('Checking password for own decryption key failed')
                  if (ex.response && ex.response.status === 403) {
                    this._handleError(ex, 'Das Passwort ist falsch')
                  } else {
                    this._handleError(ex, 'Die Überprüfung des Passworts ist fehlgeschlagen')
                  }
                  this.inToggleCanDecrypt = false
                  return
                }
                let password = await
                  this.$askPassphrase(
                    `Der geheime Schlüssel, der zum Dechiffrieren verwendet wird, wird für jeden berechtigten Benutzer jeweils mit einem Passwort (passphrase) geschützt. Das hier eingegebene Passwort muss an den Benutzer (${name}) auf sicherem Weg übergeben werden und dieser sollte das Passwort anschließend ändern. `,
                    {title: 'Geheimen Dechiffrierschlüssel schützen', idForm: 'targetDecryptionKeyPassphrase', label: 'Passwort', btnTextOk: 'Weiter'})
                if (!password) {
                  this.inToggleCanDecrypt = false
                  return
                }
                let passwordConfirmation
                let message = 'Passwort wiederholen:'
                do {
                  passwordConfirmation = await this.$askPassphrase(message,
                    {title: 'Passwort überprüfen', idForm: 'targetDecryptionKeyPassphrase', label: 'Passwort', btnTextOk: 'Prüfen'})
                  if (password !== passwordConfirmation) {
                    message = 'Passwörter stimmen nicht überein. Passwort wiederholen:'
                  }
                } while (passwordConfirmation && passwordConfirmation !== password)
                if (passwordConfirmation === password) {
                  try {
                    this.loading = true
                    let data = {password: ownPassword, encryptionKeyName: encryptionKeyName, targetKeyPassword: password}
                    let result = await axios.post(`/api/user/${name}/key`, data, config)
                    this.loading = false
                    this.$set(user, 'canDecrypt', true)
                    this.$set(user, 'encryptionKeyName', result.data.encryptionKeyName)
                  } catch (ex) {
                    console.log('Setting decryption key failed')
                    this._handleError(ex, `Das Setzen des Schlüssels zum Entschlüsseln bei Benutzer ${name} ist fehlgeschlagen`)
                  }
                }
                this.inToggleCanDecrypt = false
              })
          }
        }
      },
      async toggleIsAdmin (name) {
        if (!this.loading) {
          this.error = ''
          this.loading = true
          let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
          let config = {
            headers: {'Authorization': 'bearer ' + at}
          }
          try {
            let user = _.find(this.users, {name: name})
            if (user.canRead) {
              let data = {isAdmin: !user.isAdmin}
              let response = await axios.put(`/api/user/${name}`, data, config)
              this.$set(user, 'isAdmin', response.data.isAdmin)
            }
            this.loading = false
          } catch (ex) {
            this._handleError(ex, 'Fehler beim Ändern der Berechtigung (isAdmin)')
          }
        }
      },
      async deleteUser (name) {
        if (!this.loading) {
          let yes = await this.$confirm(`Soll der Benutzer "${name}" wirklich gelöscht werden?`,
            {title: 'Benutzer löschen', buttonTrueText: 'Ja', buttonFalseText: 'Nein'})
          if (yes) {
            this.loading = true
            let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
            let config = {
              headers: {'Authorization': 'bearer ' + at}
            }
            try {
              await axios.delete(`/api/user/${name}`, config)
              this.loading = false
              const idx = this.users.findIndex((user) => {
                return user.name === name
              })
              this.users.splice(idx, 1)
              this.snackbarText = `Benutzer ${name} wurde gelöscht`
              this.snackbarColor = 'success'
              this.snackbarTimeout = 6000
              this.snackbar = true
            } catch (ex) {
              this._handleError(ex, `Benutzer ${name} konnte nicht gelöscht werden`)
            }
          }
        }
      },
      async getUsers () {
        this.error = ''
        this.loading = true
        let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
        let config = {headers: {'Authorization': 'bearer ' + at}}
        try {
          let response = await axios.get('/api/users', config)
          this.loading = false
          return response.data
        } catch (ex) {
          this._handleError(ex, 'Fehler beim Holen der Benutzerliste')
        }
      }
    },
    components: {
      Toolbar
    },
    data () {
      return {
        users: this.users,
        isAdmin: this.isAdmin,
        loading: this.loading,
        errorSnackbar: false,
        errorSnackbarText: '',
        snackbar: false,
        snackbarTimeout: 6000,
        snackbarText: '',
        snackbarColor: 'info',
        pagination: {
          sortBy: 'name',
          rowsPerPage: -1
        },
        headers: [
          {text: 'Name', align: 'left', sortable: true, value: 'name'},
          {text: 'Email', align: 'left', sortable: true, value: 'email'},
          {text: 'Status', align: 'left', sortable: true, value: 'state'},
          {text: 'Aktiviert', sortable: true, value: 'canRead'},
          {text: 'Bearbeiter', sortable: true, value: 'canWrite'},
          {text: 'Entschlüsseln', sortable: true, value: 'canDecrypt'},
          {text: 'Admin', sortable: true, value: 'isAdmin'},
          {text: 'Ablaufsdatum', sortable: true, value: 'expires'},
          {text: 'Aktionen', sortable: false}
        ]
      }
    },
    mounted () {
      const self = this
      const isAdmin = this.isAdmin
      const now = moment()
      this.getUsers()
        .then(res => {
          self.users = res
          _.each(res, function (user) {
            user.expiredAfter = moment(user.expiredAfter)
            user.expiredClass = now.isAfter(user.expiredAfter) ? 'red--text text--darken-2' : 'light-green--text text--darken-2'
            user.canDecrypt = !!user.encryptionKeyName

            switch (user.state) {
              case 'new':
                user.stateFormatted = 'Neu'
                break
              case 'provisioned':
                user.stateFormatted = 'OK'
                break
              default:
                user.stateFormatted = user.state
            }
            if (user.state === 'new') {
              user.isAdminDisabled = true
              user.canReadDisabled = true
              user.canWriteDisabled = true
              user.canDecryptDisabled = true
            } else {
              user.canDecryptDisabled = !(isAdmin && user.canRead && user.canWrite)
              user.isAdminDisabled = !user.canWrite
              if (!user.canRead) {
                user.canWriteDisabled = true
              }
              if (user.canWrite) {
                user.canReadDisabled = true
              }
            }
          })
        })
        .catch(reason => {
          console.log(reason)
        })
    }
  }
</script>

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
