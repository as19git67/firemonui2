<template>
  <div class="attendeeslist">
    <h1>Anwesenheitsliste</h1>
    <v-data-table :headers="headers" :items="staffWithStatus" :disable-pagination="true" sort-by="lastname"
                  hide-default-footer class="elevation-1">
      <template v-slot:item.attended="{ item }">
        <v-checkbox class="mt-0" :input-value="item.attended" primary hide-details
                    :disabled="item.isToggleAttendedDisabled"
                    @click.stop="toggleAttended(item.id)"
        />
      </template>
    </v-data-table>
    <v-snackbar v-model="saveStatus" :top="false" :timeout="6000" dark color="info">
      Daten werden automatisch gespeichert...
    </v-snackbar>
    <v-snackbar v-model="errorSnackbar" :timeout="16000" :top="true" color="error">
      {{errorSnackbarText}}
      <v-btn flat @click="errorSnackbar = false">
        Schließen
      </v-btn>
    </v-snackbar>
  </div>
</template>

<script>
  import _ from 'lodash'
  import {mapActions, mapGetters} from 'vuex'

  export default {
    name: 'Attendees',
    data() {
      return {
        saveStatus: this.saveStatus,
        staffWithStatus: this.staffWithStatus,
        errorSnackbar: false,
        errorSnackbarText: '',
        loading: this.loading,
        pagination: {
          sortBy: 'lastname',
          rowsPerPage: -1
        },
        headers: [
          {text: 'Anwesend', sortable: true, value: 'attended', width: '10em'},
          {text: 'Name', align: 'left', sortable: true, value: 'lastname', width: '12em'},
          {text: 'Vorname', align: 'left', sortable: true, value: 'firstname'}
        ]
      }
    },
    computed: {
      ...mapGetters({
        canWrite: 'canWrite',
        currentJobId: 'currentJobId',
        currentJob: 'currentJob',
        attendeesOfCurrentJob: 'attendeesOfCurrentJob',
        attendeeOfCurrentJobById: 'attendeeOfCurrentJobById',
        staff: 'staff',
        jobsList: 'jobsList'
      })
    },
    watch: {
      jobsList: {
        handler: function (newValue) {
          this._setStaffWithStatus()
        },
        deep: true
      },
      staff(newList, oldList) {
        this._setStaffWithStatus()
      }
    },
    created() {
      this.readonly = !this.canWrite || this.currentJob.readonly
      this._setStaffWithStatus()
    },
    methods: {
      ...mapActions([
        'addAttendeeToJob', // map `this.addAttendeeToJob()` to `this.$store.dispatch('addAttendeeToJob')`
        'removeAttendeeFromJob' // map `this.removeAttendeeFromJob()` to `this.$store.dispatch('removeAttendeeFromJob')`
      ]),
      async toggleAttended(id) {
        if (!this.loading && !this.readonly) {
          this.error = ''
          this.loading = true
          this.saveStatus = true
          let person = _.find(this.staffWithStatus, {id: id})
          const options = {
            $session: this.$session,
            $route: this.$route,
            $router: this.$router,
            requestOptions: {
              person: person,
              jobId: this.currentJobId
            }
          }
          try {
            if (person.attended) {
              await this.removeAttendeeFromJob(options)
            } else {
              await this.addAttendeeToJob(options)
            }
            this.saveStatus = false
          } catch (ex) {
            this._handleError(ex, 'Fehler beim Speichern der Anwesenheitsliste')
          } finally {
            this.loading = false
          }
        }
      },
      _handleError: function (ex, snackText) {
        this.saveStatus = false
        this.loading = false
        const errorMessage = ex.response && ex.response.data ? ex.response.data : ex.message
        this.errorSnackbarText = `${snackText}: ${errorMessage}`
        this.errorSnackbar = true
        console.log(snackText, ex)
      },
      _setStaffWithStatus() {
        const ro = this.readonly
        const self = this
        this.staffWithStatus = _.map(this.staff, (person) => {
          let attendeeById = self.attendeeOfCurrentJobById(person.id)
          const attended = attendeeById !== undefined
          return {
            id: person.id,
            lastname: person.lastname,
            firstname: person.firstname,
            attended: attended,
            isToggleAttendedDisabled: ro
          }
        })
      }
    }
  }
</script>

<style scoped>
  .attendeeslist h1 {
    padding-left: 24px;
    padding-right: 24px;
  }
</style>
