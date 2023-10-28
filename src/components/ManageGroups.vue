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
      <v-data-table :headers="headers" :items="groupsList" class="elevation-1"
                    :loading="loading">
        <v-progress-linear slot="progress" indeterminate color="info"/>
        <template v-slot:item.id="{ item }">
          <router-link :to="{ path:'/managegroup/:groupId', name: 'ManageGroup', params: { groupId: item.id }}">
            {{ item.id }}
          </router-link>
        </template>
        <template v-slot:item.actions="{ item }">
          <v-btn v-if="isAdmin || (!item.isGroupAdmin)" icon @click="editGroup(item.id)"
          >
            <v-icon title="bearbeiten">
              mdi-pencil
            </v-icon>
          </v-btn>
          <v-btn v-if="isAdmin || (!item.isGroupAdmin)" icon @click="deleteGroup(item.id)"
          >
            <v-icon title="löschen">
              mdi-trash-can-outline
            </v-icon>
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
import {mapActions, mapGetters, mapMutations} from 'vuex'

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
        {text: 'Beschreibung', align: 'left', sortable: true, value: 'description'},
        {text: 'Verantwortlicher (email)', sortable: true, value: 'responsibleEmail'},
        {text: 'Absender (email)', align: 'left', sortable: true, value: 'senderEmail'},
        {text: 'Absender (SMS)', align: 'left', sortable: true, value: 'senderSMS'},
        {text: 'Aktionen', sortable: false, value: 'actions'}
      ],
      groupEditFormDef: [
        {key: 'id', label: 'ID'},
        {key: 'description', label: 'Beschreibung'},
        {key: 'responsibleEmail', label: 'Verantwortlicher (Email)'},
        {key: 'senderEmail', label: 'Absender (Email)'},
        {key: 'senderSMS', label: 'Absender (SMS, max. 11 Zeichen, A-Z, a-z, 0-9)'},
      ],
    }
  },
  computed: {
    ...mapGetters({
      groupById: 'groupById',
      groupsList: 'groupsList',
    }),
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
  },
  methods: {
    ...mapActions([
      'requestGroupsFromServer', // map `this.requestGroupsFromServer()` to `this.$store.dispatch('requestGroupsFromServer')`
      'requestMembersFromServer', // map `this.requestMembersFromServer()` to `this.$store.dispatch('requestMembersFromServer')`
      'createGroupAtServer', // map `this.createGroupAtServer()` to `this.$store.dispatch('createGroupAtServer')`
      'deleteGroupAtServer', // map `this.deleteGroupAtServer()` to `this.$store.dispatch('deleteGroupAtServer')`
      'updateGroupAtServer', // map `this.updateGroupAtServer()` to `this.$store.dispatch('updateGroupAtServer')`
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
        message: 'Die ID der Gruppe wird ggf. für die Alarmierung verwendet und muss dann der 5-Ton-Folge entsprechen. Sie kann später nicht mehr geändert werden.',
        title: 'Neue Gruppe erzeugen:',
        form: this.groupEditFormDef,
        btnTextOk: 'Speichern'
      })
      if (formData.length > 0) {
        this.loading = true
        let field = _.find(formData, {key: 'id'})
        const id = field.value
        field = _.find(formData, {key: 'description'})
        const description = field.value
        field = _.find(formData, {key: 'responsibleEmail'})
        const responsibleEmail = field.value
        field = _.find(formData, {key: 'senderEmail'})
        const senderEmail = field.value
        field = _.find(formData, {key: 'senderSMS'})
        const senderSMS = field.value
        this.createGroupAtServer({
          $session: this.$session,
          $route: this.$route,
          $router: this.$router,
          id: id,
          description: description,
          responsibleEmail: responsibleEmail,
          senderEmail: senderEmail,
          senderSMS: senderSMS,
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
    async editGroup(id) {
      let group = this.groupById(id)
      if (group) {
        let formDef = [];
        _.each(this.groupEditFormDef, (def) => {
          if (def.key !== 'id') {
            formDef.push({key: def.key, label: def.label, value: group[def.key]})
          }
        })
        const formData = await this.$modalDialogForm({
          message: ' ',
          title: `Gruppe mit ID ${group.id} ändern:`,
          form: formDef,
          btnTextOk: 'Speichern'
        })
        if (formData.length > 0) {
          this.loading = true
          let field = _.find(formData, {key: 'description'})
          const description = field.value
          field = _.find(formData, {key: 'responsibleEmail'})
          const responsibleEmail = field.value
          field = _.find(formData, {key: 'senderEmail'})
          const senderEmail = field.value
          field = _.find(formData, {key: 'senderSMS'})
          const senderSMS = field.value
          this.updateGroupAtServer({
            $session: this.$session,
            $route: this.$route,
            $router: this.$router,
            requestOptions: {
              updateData: {
                description: description,
                responsibleEmail: responsibleEmail,
                senderEmail: senderEmail,
                senderSMS: senderSMS
              },
              groupId: id
            }
          })
          .then(() => {
            this.loading = false
          })
          .catch(reason => {
            this.loading = false
            this._handleError(reason, 'Gruppe bearbeiten fehlgeschlagen')
          })
        }
      }
    },

    async deleteGroup(id) {
      if (!this.loading) {
        let group = this.groupById(id)
        let no = await this.$confirm(`Soll die Gruppe ${id} (${group.name}) wirklich gelöscht werden? Dieser Vorgang kann nicht rückgängig gemacht werden.`,
          {title: `Gruppe ${id} löschen`, buttonTrueText: 'Nein', buttonFalseText: 'Ja'})
        if (!no) {
          this.loading = true
          let at = this.$session.get('accessToken') + '.' + btoa(this.$session.get('username'))
          let config = {
            headers: {'Authorization': 'bearer ' + at}
          }
          try {
            await this.deleteGroupAtServer({
              $session: this.$session,
              $route: this.$route,
              $router: this.$router,
              groupId: id
            })
            await this.requestGroupsFromServer({
              $session: this.$session,
              $route: this.$route,
              $router: this.$router,
              requestOptions: {withMembers: false}
            })
            this.loading = false
            this.snackbarText = `Gruppe ${id} wurde gelöscht`
            this.snackbarColor = 'success'
            this.snackbarTimeout = 6000
            this.snackbar = true
          } catch (ex) {
            this._handleError(ex, `Gruppe ${id} konnte nicht gelöscht werden`)
          }
        }
      }
    },
    async getGroups() {
      try {
        await this.requestGroupsFromServer({
          $session: this.$session,
          $route: this.$route,
          $router: this.$router,
          requestOptions: {withMembers: false}
        })
        this.loading = false
      }
      catch(ex) {
        this._handleError(ex, 'Lesen der Gruppenliste fehlgeschlagen')
      }
      try {
        await this.requestMembersFromServer({
          $session: this.$session,
          $route: this.$route,
          $router: this.$router,
          requestOptions: {}
        })
        this.loading = false
      }
      catch(ex) {
        this._handleError(ex, 'Lesen der Mitgliederliste fehlgeschlagen')
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
