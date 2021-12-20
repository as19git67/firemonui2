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
              <v-menu
                v-model="menuBirthdayDate"
                :close-on-content-click="false"
                :nudge-right="40"
                transition="scale-transition"
                offset-y
                min-width="290px"
              >
                <template v-slot:activator="{ on }">
                  <v-text-field
                    v-model="form.birthdayFormattedLocalized"
                    label="Geburtstag"
                    prepend-icon="mdi-timetable"
                    readonly
                    v-on="on"
                  />
                </template>
                <v-date-picker v-model="form.birthdayDate" :readonly="readonly" locale="de"
                               @input="menuBirthdayDate = false"/>
              </v-menu>
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
import moment from "moment";

export default {
  name: 'MemberForm',
  data: function () {
    this.formMustSave = false
    this.updateData = {}
    this.person = {
      firstname: 'Anton'
    }
    if (!this.form) {
      this.personKeys = ['lastname', 'firstname', 'street', 'streetno', 'city', 'postalcode', 'birthdayDate',
        'birthdayFormattedLocalized', 'mobile', 'email']
      this.form = {}
      const self = this
      _.each(this.personKeys, function (k) {
        self.form[k] = ''
      })

      let person = this.person
      this.dateTimeSplits = [{list: this.personKeys, source: person}]
      this._setFormFields()

      return {
        valid: true,
        readonly: false,
        form: this.form,
        menuBirthdayDate: false,
        menuEntryDate: false,
      }
    }
  },
  watch: {
    form: {
      handler: function (old, newValue) {
        console.log(`form changed`)
        let person = this.person
        const self = this
        _.forIn(newValue, (value, key) => {
          if (_.indexOf(self.personKeys, key) >= 0) {
            let oldValue = person[key]
            if (oldValue === undefined) {
              let iDate = key.indexOf('Date')
              if (iDate > 0) {
                self.processDate(key, iDate, person, value)
              } // end date/time check
            } else {
              if (value !== oldValue) {
                // console.log(`${key} changed from ${oldValue} to "${value}"`)
                self.updateData[key] = value
                self.setHaveDataToSave(true)
              }
            }
          }
        })
      },
      deep: true
    },
    person: {
      handler: function (newValue) {
        let person = this.person
        this.dateTimeSplits = [{list: this.personKeys, source: person}]
        console.log('person has been changed -> _setFormFields')
        this._setFormFields()
      },
      deep: true
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
    },
    setHaveDataToSave: function () {
      this.formMustSave = true
    },
    processDate: function (key, iDate, person, value) {
      const dateKey = key.substr(0, iDate)
      let oldDate
      // use previous date value from update date if it is set there
      if (this.updateData[dateKey]) {
        oldDate = this.updateData[dateKey]
      } else {
        oldDate = person[dateKey]
      }
      let newDate = moment(value)
      if (newDate.isValid()) {
        // console.log(`processDate oldDate: ${moment(oldDate).format()}, newDate: ${moment(newDate).format()}`)
        if (oldDate) {
          newDate.set('hour', oldDate.hour())
          newDate.set('minute', oldDate.minute())
          newDate.set('second', oldDate.second())
        } else {
          newDate.set('hour', 0)
          newDate.set('minute', 0)
          newDate.set('second', 0)
        }
        if (!newDate.isSame(oldDate)) {
          if (moment.isMoment(oldDate) && moment.isMoment(newDate)) {
            console.log(`${key} changed from ${oldDate.format()} to "${newDate.format()}"`)
          } else {
            if (moment.isMoment(newDate)) {
              console.log(`${key} changed from undefined to "${newDate.format()}"`)
            }
          }
          // update date field (picker and text field) in form
          console.log(`updating date ${newDate.format()} datekey ${dateKey}`)
          this._setFormDateLocalized(newDate, dateKey)
          this.updateData[dateKey] = newDate
          this.setHaveDataToSave(true)
        }
      }
    },
    _setFormFieldIfChanged: function (newValue, formFieldName) {
      if (newValue !== this.form[formFieldName]) {
        // console.log(`${formFieldName} changed to "${newValue}"`)
        this.form[formFieldName] = newValue
      }
    },
    _setFormDate: function (date, dateKey) {
      let newValue
      if (moment.isMoment(date)) {
        newValue = date.format('YYYY-MM-DD')
      } else {
        // newValue = moment().format('YYYY-MM-DD')
        newValue = ''
      }
      this._setFormFieldIfChanged(newValue, dateKey + 'Date')
    },
    _setFormDateFormatted: function (date, dateKey) {
      let newValue
      if (moment.isMoment(date)) {
        newValue = date.toISOString().substr(0, 10)
      } else {
        // newValue = moment().format('L')
        newValue = ''
      }
      this._setFormFieldIfChanged(newValue, dateKey + 'Formatted')
    },
    _setFormDateLocalized: function (date, dateKey) {
      let newValue
      if (moment.isMoment(date)) {
        newValue = date.format('L')
      } else {
        newValue = ''
      }
      this._setFormFieldIfChanged(newValue, dateKey + 'FormattedLocalized')
    },
    _setFormTime: function (time, dateKey) {
      let newValue
      if (moment.isMoment(time)) {
        newValue = time.format('LT')
      } else {
        // newValue = moment().format('LT')
        newValue = ''
      }
      this._setFormFieldIfChanged(newValue, dateKey + 'Time')
    },
    _setFormFieldFormatted: function (formFieldName, sourceObj) {
      // check for Date, Formatted or Time in the key. If found, make a form-model with this name and
      // a specific to the key formatted date or time text
      let iDate = formFieldName.indexOf('Date')
      let dateKey, date, time;
      if (iDate > 0) {
        dateKey = formFieldName.substr(0, iDate)
        date = sourceObj[dateKey]
        this._setFormDate(date, dateKey)
      } else {
        let iFormatted = formFieldName.indexOf('Formatted')
        if (iFormatted > 0) {
          let iLocalized = formFieldName.indexOf('FormattedLocalized')
          if (iLocalized > 0) {
            dateKey = formFieldName.substr(0, iLocalized)
            date = sourceObj[dateKey]
            this._setFormDateLocalized(date, dateKey)
          } else {
            dateKey = formFieldName.substr(0, iFormatted)
            date = sourceObj[dateKey]
            this._setFormDateFormatted(date, dateKey)
          }
        } else {
          let iTime = formFieldName.indexOf('Time')
          if (iTime > 0) {
            dateKey = formFieldName.substr(0, iTime)
            time = sourceObj[dateKey]
            this._setFormTime(time, dateKey)
          } else {
            this._setFormFieldIfChanged(sourceObj[formFieldName], formFieldName)
          }
        }
      }
    },
    _setFormFields: function () {
      const self = this
      _.each(this.dateTimeSplits, function (o) {
        _.each(o.list, function (keyInSource) {
          self._setFormFieldFormatted(keyInSource, o.source)
        })
      })
    },
  }
}
</script>

<style scoped>
.cont {
  padding: 0;
  margin: 0;
}
</style>
