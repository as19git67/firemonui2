<template>
  <div>
    <template>
      <Toolbar/>
    </template>
    <div class="userlist">
      <v-toolbar-title class="ml-0 mt-2 mb-2 pl-4">
        Gruppenliste
        <v-btn icon @click="addGroup">
          <v-icon title="neue Gruppe erstellen">
            mdi-plus
          </v-icon>
        </v-btn>
      </v-toolbar-title>
      <v-data-table :headers="headers" :items="groups" class="elevation-1"
                    :loading="loading">
        <v-progress-linear slot="progress" indeterminate color="info"/>
        <template v-slot:item.id="{ item }">
          <span>{{ item.id }}</span>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn v-if="isAdmin" @click="deleteUser(item.id)">
            Löschen
          </v-btn>
        </template>
      </v-data-table>
      <v-snackbar v-model="errorSnackbar" :timeout="16000" :top="true" color="error">
        {{ errorSnackbarText }}
        <v-btn @click="errorSnackbar = false">
          Schließen
        </v-btn>
      </v-snackbar>
      <v-snackbar v-model="snackbar" :timeout="snackbarTimeout" :top="true" :color="snackbarColor">
        {{ snackbarText }}
        <v-btn @click="snackbar = false">
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
import {mapActions, mapMutations} from 'vuex'

export default {
  name: 'ManageGroups',
  components: {
    Toolbar
  },
  data() {
    return {
      groups: this.groups,
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
        {text: 'ID', align: 'left', sortable: true, value: 'id'},
        {text: 'Name', align: 'left', sortable: true, value: 'name'},
        {text: 'Beschreibung', align: 'left', sortable: true, value: 'description'},
        {text: 'Email des Gruppenverantwortlichen', sortable: true, value: 'responsible'},
        {text: 'Aktionen', sortable: false, value: 'actions'}
      ]
    }
  },
  beforeCreate() {
    let haveSession = this.$session.exists()
    if (haveSession) {
      let accessRights = this.$session.get('accessRights')
      this.isAdmin = _.indexOf(accessRights, 'admin') >= 0
      this.isGroupAdmin = _.indexOf(accessRights, 'groupadmin') >= 0 || this.isAdmin
    }
    if (!(haveSession && this.isAdmin)) {
      if (this.$route.query.autotoken) {
        this.$router.push({path: '/login', query: {autotoken: this.$route.query.autotoken}})
      } else {
        this.$router.push('/login')
      }
    }
  },
  created() {
    moment.locale('de')
  },
  mounted() {
    const self = this
    const isGroupAdmin = this.isGroupAdmin
    const now = moment()
    this.getGroups()
    .then(res => {
      self.groups = res
      _.each(res, function (group) {
// todo
      })
    })
    .catch(reason => {
      console.log(reason)
    })
  },
  methods: {
    ...mapActions([
      'requestGroupsFromServer', // map `this.requestGroupsFromServer()` to `this.$store.dispatch('requestGroupsFromServer')`
      'createGroupAtServer', // map `this.createGroupAtServer()` to `this.$store.dispatch('createGroupAtServer')`
    ]),
    _handleError: function (ex, snackText) {
      this.loading = false
      let errorMessage = ex.response && ex.response.data && ex.response.data.error ? ex.response.data.error : ex.message
      this.errorSnackbarText = `${snackText}: ${errorMessage}`
      this.errorSnackbar = true
      console.log(snackText, ex)
    },
    async addGroup() {
      const formData = await this.$modalDialogForm({
        message: 'Die ID der Gruppe wird ggf. für die Alarmierung verwendet und muss dann der 5-Ton-Folge entsprechen.',
        title: 'Neue Gruppe erzeugen',
        form: [{key: 'id', label: 'ID'}, {key: 'name', label: 'Name'}, {
          key: 'description',
          label: 'Beschreibung'
        }, {key: 'responsible', label: 'Email des Gruppenverantwortlichen'}],
        btnTextOk: 'Anlegen'
      })
      if (formData.length > 0) {
        this.loading = true
        let field = _.find(formData, {key: 'id'})
        const id = field.value
        field = _.find(formData, {key: 'name'})
        const name = field.value
        field = _.find(formData, {key: 'description'})
        const description = field.value
        field = _.find(formData, {key: 'responsible'})
        const responsible = field.value
        this.createGroupAtServer({
          $session: this.$session,
          $route: this.$route,
          $router: this.$router,
          id: id,
          name: name,
          description: description,
          responsible: responsible
        })
        .then(() => {
          this.loading = false
        })
        .catch(reason => {
          this.loading = false
          this._handleError(reason, 'Gruppe anlegen fehlgeschlagen')
        })
      }
    },

    async xtoggleCanRead(name) {
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
          this.$set(user, 'isGroupAdminDisabled', !this.isAdmin)
        } catch (ex) {
          this._handleError(ex, 'Fehler beim Ändern der Berechtigung (canRead)')
        }
      }
    },
    async xtoggleCanWrite(name) {
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
      let config = {
        headers: {
          'Authorization': 'bearer ' + at,
          password: ownPassword,
          encryptionKeyName: encryptionKeyName
        }
      }
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
      let notOk = await this.$confirm(message, {
        title: 'Recht zum Dechiffrieren entziehen',
        buttonTrueText: 'Nein',
        buttonFalseText: 'Ja'
      })
      if (notOk) {
        return
      }
      let ownPassword = await this.$askPassphrase(
        `Damit sichergestellt ist, dass chiffrierte Daten vom aktuellen Benutzer entschlüsselt werden können, wird nun das Passwort für den geheimen Dechiffrierschlüssel abgefragt.`,
        {
          title: 'Passwort für den Dechiffrierschlüssel eingeben',
          idForm: 'decryptionKeyPassphrase',
          label: 'Passwort',
          btnTextOk: 'Prüfen'
        })
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
    toggleCanDecrypt(name) {
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
            `Zum Weitergeben des geheimen Schlüssels, der zum Dechiffrieren verwendet wird, muss das eigene Passwort, mit dem er geschützt ist, eingegeben werden.`,
            {
              title: 'Passwort für Dechiffrierschlüssel eingeben',
              idForm: 'decryptionKeyPassphrase',
              label: 'Passwort',
              btnTextOk: 'Prüfen'
            })
          .then(async ownPassword => {
            if (!ownPassword) {
              this.inToggleCanDecrypt = false
              return
            }

            let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
            let config = {
              headers: {
                'Authorization': 'bearer ' + at,
                password: ownPassword,
                encryptionKeyName: encryptionKeyName
              }
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
                {
                  title: 'Geheimen Dechiffrierschlüssel schützen',
                  idForm: 'targetDecryptionKeyPassphrase',
                  label: 'Passwort',
                  btnTextOk: 'Weiter'
                })
            if (!password) {
              this.inToggleCanDecrypt = false
              return
            }
            let passwordConfirmation
            let message = 'Passwort wiederholen:'
            do {
              passwordConfirmation = await this.$askPassphrase(message,
                {
                  title: 'Passwort überprüfen',
                  idForm: 'targetDecryptionKeyPassphrase',
                  label: 'Passwort',
                  btnTextOk: 'Prüfen'
                })
              if (password !== passwordConfirmation) {
                message = 'Passwörter stimmen nicht überein. Passwort wiederholen:'
              }
            } while (passwordConfirmation && passwordConfirmation !== password)
            if (passwordConfirmation === password) {
              try {
                this.loading = true
                let data = {
                  password: ownPassword,
                  encryptionKeyName: encryptionKeyName,
                  targetKeyPassword: password
                }
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
    async toggleIsAdmin(name) {
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
            const isAdmin = !user.isAdmin
            let isGroupAdmin = isAdmin
            let data = {isAdmin: isAdmin, isGroupAdmin: isGroupAdmin}
            let response = await axios.put(`/api/user/${name}`, data, config)
            this.$set(user, 'isAdmin', response.data.isAdmin)
            this.$set(user, 'isGroupAdmin', response.data.isGroupAdmin)
          }
          this.loading = false
        } catch (ex) {
          this._handleError(ex, 'Fehler beim Ändern der Berechtigung (isAdmin)')
        }
      }
    },
    async toggleIsGroupAdmin(name) {
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
            let data = {isGroupAdmin: !user.isGroupAdmin}
            let response = await axios.put(`/api/user/${name}`, data, config)
            this.$set(user, 'isGroupAdmin', response.data.isGroupAdmin)
          }
          this.loading = false
        } catch (ex) {
          this._handleError(ex, 'Fehler beim Ändern der Berechtigung (isGroupAdmin)')
        }
      }
    },
    async deleteUser(name) {
      if (!this.loading) {
        let no = await this.$confirm(`Soll der Benutzer "${name}" wirklich gelöscht werden?`,
          {title: 'Benutzer löschen', buttonTrueText: 'Nein', buttonFalseText: 'Ja'})
        if (!no) {
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
    async getGroups() {
      this.error = ''
      this.loading = true
      let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
      let config = {headers: {'Authorization': 'bearer ' + at}}
      try {
        let response = await axios.get('/api/groups', config)
        this.loading = false
        return response.data
      } catch (ex) {
        this._handleError(ex, 'Fehler beim Holen der Gruppenliste')
      }
    }
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
