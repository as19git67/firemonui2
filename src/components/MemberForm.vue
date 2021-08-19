<template>
  <v-container fluid class="cont">
    <v-layout align-center justify-center class="lay">
      <v-flex>
        <v-card class="elevation-12">
          <v-toolbar dark color="primary">
            <v-toolbar-title>Personendaten eingeben:</v-toolbar-title>
          </v-toolbar>
          <v-divider/>
          <v-form v-model="valid">
            <v-container fluid>
              <v-text-field
                v-model.lazy="form.firstname"
                label="Vorname"
                hint=""
                prepend-icon="mdi-account-details"
                required
              />
              <v-text-field
                v-model.lazy="form.lastname"
                label="Nachname"
                hint=""
                prepend-icon="mdi-account-details"
                required
              />
              <v-text-field
                v-model.lazy="form.mobile"
                label="Mobiltelefon"
                hint=""
                prepend-icon="mdi-cellphone-basic"
                required
              />
              <v-text-field
                v-model.lazy="form.email"
                label="Email"
                hint=""
                prepend-icon="mdi-email"
                required
              />
            </v-container>
          </v-form>
          <v-divider/>
          <v-toolbar dark color="primary">
            <v-spacer/>
            <v-btn color="info" @click="finishAndNew">
              Speichern und neu
            </v-btn>
            <v-spacer/>
            <v-btn color="info" @click="finish">
              Speichern
            </v-btn>
            <v-spacer/>
            <v-btn class="ml-3" color="secondary" @click="cancel">
              Abbrechen
            </v-btn>
          </v-toolbar>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import _ from 'lodash'

export default {
  name: 'MemberForm',
  data: function () {
    return {
      valid: true,
      form: {
        lastname: '',
        firstname: '',
        mobile: '+49',
        email: '',
      }
    }
  },
  methods: {
    finish: function () {
      this.$emit('saveMemberForm', {
        lastname: this.form.lastname,
        firstname: this.form.firstname,
        mobile: this.form.mobile,
        email: this.form.email
      })
    },
    finishAndNew: function () {
      this.$emit('saveAndNewMemberForm', {
        lastname: this.form.lastname,
        firstname: this.form.firstname,
        mobile: this.form.mobile,
        email: this.form.email
      })
    },
    cancel: function () {
      this.$emit('closeMemberForm', {})
    }
  }
}
</script>

<style scoped>
.cont {
  padding: 0;
  margin: 0;
}
</style>
