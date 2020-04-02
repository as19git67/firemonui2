<template>
  <div class="report">
    <v-form v-model="valid">
      <v-container fluid>
        <v-text-field
          v-model.lazy="form.title"
          :readonly="readonly"
          label="Einsatztitel"
          hint="Der Title erscheint in der Einsatzliste"
          prepend-icon="mdi-format-title"
          required
        />
        <v-layout>
          <v-flex>
            <v-autocomplete
              v-model.lazy="form.director"
              :readonly="readonly"
              :items="attendeeList"
              placeholder="Tippe um die Person zu suchen"
              label="Einsatzleiter"
              prepend-icon="mdi-human-greeting"
              return-object
            />
          </v-flex>
          <v-flex>
            <v-autocomplete
              v-model="form.writer"
              :readonly="readonly"
              :items="attendeeList"
              placeholder="Tippe um die Person zu suchen"
              label="Bericht Ersteller"
              prepend-icon="mdi-account-edit"
              hint="Wer hat den Einsatzbericht erstellt?"
              return-object
            />
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-menu
              v-model="menuStart"
              :close-on-content-click="false"
              :nudge-right="40"
              transition="scale-transition"
              offset-y
              min-width="290px"
            >
              <template v-slot:activator="{ on }">
                <v-text-field
                  v-model="form.startFormattedLocalized"
                  label="Einsatzbeginn"
                  prepend-icon="mdi-timetable"
                  readonly
                  v-on="on"
                />
              </template>
              <v-date-picker v-model="form.endFormatted" locale="de" @input="menuStart = false"/>
            </v-menu>
          </v-flex>
          <v-flex>
            <v-text-field v-model="form.startTime" label="Einsatzbeginn" :rules="timeRules"
                          prepend-icon="mdi-clock-outline" :readonly="readonly"/>
          </v-flex>
          <v-flex>
            <v-menu
              v-model="menuEnd"
              :close-on-content-click="false"
              :nudge-right="40"
              transition="scale-transition"
              offset-y
              min-width="290px"
            >
              <template v-slot:activator="{ on }">
                <v-text-field
                  v-model="form.endFormattedLocalized"
                  label="Einsatzende"
                  prepend-icon="mdi-timetable"
                  readonly
                  v-on="on"
                />
              </template>
              <v-date-picker v-model="form.endFormatted" locale="de" @input="menuEnd = false"/>
            </v-menu>
          </v-flex>
          <v-flex>
            <v-text-field v-model="form.endTime" label="Ende (Zeit)" :rules="timeRules" prepend-icon="mdi-clock-outline"
                          :readonly="readonly"/>
          </v-flex>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-text-field v-model="form.duration" prepend-icon="mdi-timer" label="Einsatzdauer in Stunden"
                          :readonly="true"/>
          </v-flex>
          <v-flex>
            <v-text-field v-model="attendeesCountOfCurrentJob" label="Anzahl Anwesende"
                          prepend-icon="mdi-account-multiple-check" :readonly="true"/>
          </v-flex>
        </v-layout>
        <v-text-field v-model.lazy="form.incident" :readonly="readonly" prepend-icon="mdi-comment-text"
                      label="Alarmbild" required/>
        <v-text-field v-model.lazy="form.location" :readonly="readonly" prepend-icon="mdi-crosshairs-gps"
                      label="Einsatzort" required/>
        <v-text-field v-if="form.material" v-model.lazy="form.material" :readonly="readonly"
                      prepend-icon="mdi-car-multiple" label="Alarmierte Fahrzeuge"/>
        <v-text-field v-model.lazy="form.others" :readonly="readonly" prepend-icon="mdi-car-multiple"
                      label="Andere Wehren, Polizei, Rettungsdienst"
                      required
        />
        <v-textarea v-model.lazy="form.text" :readonly="readonly" label="Einsatzbeschreibung"
                    prepend-icon="mdi-note-text" required/>
        <v-icon>mdi-fire-truck</v-icon>
        <h3 class="materialListTitle">
          Eingesetztes Material (Fahrzeuge, etc.):
        </h3>
        <v-layout class="material-list column">
          <v-container fluid>
            <v-layout v-for="mat in materialList" :key="mat.id" row>
              <v-flex xs3>
                <v-text-field v-model="mat.name" readonly/>
              </v-flex>
              <v-flex v-for="value in mat.values" :key="`${mat.id}-${value.id}`" class="material-value">
                <v-text-field v-if="value.type==='string'" v-model.lazy="value.value" :readonly="readonly"
                              :label="value.label" required/>
                <v-text-field v-if="value.type==='int'" v-model.lazy="value.value" :readonly="readonly"
                              :label="value.label" :rules="integerRules"
                              required
                />
                <v-text-field v-if="value.type==='float'" v-model.lazy="value.value" :readonly="readonly"
                              :label="value.label" :rules="floatRules"
                              required
                />
                <v-autocomplete v-if="value.type==='attendee'" v-model.lazy="value.value" :readonly="readonly"
                                :items="attendeeList"
                                placeholder="Tippe um die Person zu suchen" :label="value.label" required
                                prepend-icon="mdi-account" return-object
                />
              </v-flex>
              <v-flex v-if="!readonly" align-self-center="true" xs1>
                <v-btn icon :disabled="readonly" @click="removeMaterial(mat.id)">
                  <v-icon title="Material löschen">
                    mdi-playlist-minus
                  </v-icon>
                </v-btn>
              </v-flex>
            </v-layout>
            <v-layout v-if="!readonly" row class="ml-5">
              <v-flex xs11>
                <v-label>Fahrzeuge und Geräte hinzufügen:</v-label>
                <v-btn icon :disabled="readonly" @click="showMaterialPicker">
                  <v-icon title="weitere Fahrzeuge oder Geräte hinzufügen">
                    mdi-playlist-plus
                  </v-icon>
                </v-btn>
              </v-flex>
            </v-layout>
          </v-container>
        </v-layout>
        <v-layout>
          <v-flex>
            <v-text-field v-model.lazy="form.rescued" :readonly="readonly" prepend-icon="mdi-account-heart-outline"
                          :rules="numberRules"
                          label="Anzahl gerettete Personen"
            />
          </v-flex>
          <v-flex>
            <v-text-field v-model.lazy="form.recovered" :readonly="readonly" prepend-icon="mdi-ghost"
                          :rules="numberRules"
                          label="Anzahl geborgene Personen"
            />
          </v-flex>
        </v-layout>
      </v-container>
    </v-form>
    <v-dialog v-model="materialPickerVisible" max-width="600px" scrollable :fullscreen="$vuetify.breakpoint.xsOnly">
      <template>
        <MaterialPicker @close="materialPickerClose"/>
      </template>
    </v-dialog>
    <v-snackbar :value="haveDataToSave" :top="false" :timeout="0" dark color="info">
      Daten werden automatisch gespeichert...
    </v-snackbar>
    <v-snackbar v-model="errorSnackbar" :timeout="16000" :top="true" color="error">
      {{errorSnackbarText}}
      <v-btn @click="errorSnackbar = false">
        Schließen
      </v-btn>
    </v-snackbar>
  </div>
</template>

<script>
  import _ from 'lodash'
  import moment from 'moment'
  import {mapGetters, mapMutations, mapActions} from 'vuex'
  import MaterialPicker from '@/components/MaterialPicker'

  export default {
    name: 'Report',
    components: {MaterialPicker},
    data: function () {
      if (!this.form) {
        this.jobKeys = ['title', 'startDate', 'startTime', 'startFormatted', 'startFormattedLocalized', 'endDate', 'endTime', 'endFormatted', 'endFormattedLocalized']
        this.jobReportKeys = ['director', 'writer', 'duration', 'incident', 'location', 'text', 'material', 'others', 'rescued', 'recovered']
        this.form = {}
        const self = this
        _.each(this.jobKeys, function (k) {
          self.form[k] = ''
        })
        _.each(this.jobReportKeys, function (k) {
          self.form[k] = ''
        })
        // The following is an example of the materialList structure
        /*
                "materialList": [
                  {
                    "id": 1,
                    "matId": "lima",
                    "category": "generic",
                    "name": "Lima",
                    "values": [
                      {
                        "id": "text",
                        "label": "",
                        "type": "string",
                        "value": "Sepp"
                      }
                    ]
                  },
                  {
                    "id": 2,
                    "matId": "hlf",
                    "category": "vehicle",
                    "name": "HLF",
                    "values": [
                      {
                        "id": "driver",
                        "label": "Fahrer",
                        "type": "attendee",
                        "value": "Florian Alt"
                      },
                      {
                        "id": "kmStart",
                        "label": "km Stand Start",
                        "type": "float",
                        "value": "1000"
                      },
                      {
                        "id": "kmEnde",
                        "label": "km Stand Ende",
                        "type": "float",
                        "value": "1100"
                      }
                    ]
                  }
                ]
        */
        this.materialList = []
      }
      return {
        errorSnackbarText: '',
        errorSnackbar: false,
        materialPickerVisible: false,
        attendeeList: this.attendeeList,
        form: this.form,
        materialList: this.materialList,
        readonly: this.readonly,
        dateFailure: this.dateFailure,
        menuStart: false,
        menuEnd: false,
        valid: false,
        numberRules: [
          v => {
            let re = (/^([0-9]+)$/).test(v)
            if (re) {
              return true
            } else {
              return 'Wert muß eine Zahl sein'
            }
          }
        ],
        integerRules: [
          v => {
            let i = parseInt(v)
            if (isNaN(i) || i.toString() !== v) {
              return 'Wert muß eine Zahl ohne Komma sein'
            } else {
              return true
            }
          }
        ],
        floatRules: [
          v => {
            if (v === undefined) {
              return true
            } else {
              let f = v.replace(/\./g, '').replace(',', '.')
              if (isNaN(parseFloat(f)) || !isFinite(f)) {
                return 'Wert muß eine Zahl sein'
              } else {
                return true
              }
            }
          }
        ],
        timeRules: [
          v => {
            let re = (/^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/).test(v)
            if (!re) {
              return 'Zeit im Format HH:MM eingeben'
            } else {
              return true
            }
          }
        ]
      }
    },
    computed: {
      ...mapGetters({
        haveDataToSave: 'haveDataToSave',
        currentJob: 'currentJob',
        currentJobId: 'currentJobId',
        attendeesCountOfCurrentJob: 'attendeesCountOfCurrentJob',
        report: 'report',
        materialTypesByType: 'materialTypesByType',
        materialMetadata: 'materialMetadata'
      })
    },
    watch: {
      materialList: {
        handler: function () {
          console.log(`materialList changed`)
          let job = this.currentJob

          function isDifferentMaterial(reportMaterial, m) {
            if (reportMaterial) {
              // material type changed?
              if (reportMaterial.matId !== m.matId) {
                return true
              } else {
                let changedValue = _.find(m.values, v => {
                  let reportValue = _.find(reportMaterial.values, repVal => {
                    return v.id === repVal.id
                  })
                  return v.value !== reportValue.value
                })
                return changedValue !== undefined
              }
            } else {
              // material from form is not in report material list => found changed material
              return true
            }
          }

          if (job) {
            console.log(`Material in job ${job.id} changed`)

            var removeIndexes = []
            for (var i = 0; this.currentJob.report.materialList && i < this.currentJob.report.materialList.length; i++) {
              const repMat = this.currentJob.report.materialList[i]
              const formMaterial = _.find(this.materialList, mat => {
                return mat.id === repMat.id
              })
              // if material not found in materialList, it was removed => remove it from report too
              if (!formMaterial) {
                removeIndexes.push(i)
              }
            }
            if (removeIndexes.length > 0) {
              _.each(removeIndexes, i => {
                this.currentJob.report.materialList.splice(i, 1)
              })
              this.saveMaterial()
            }

            let reportMaterial

            // find first material in material list in UI that was changed (compared with same material from report)
            let changedMaterial = _.find(this.materialList, matToTest => {
              // 1. find material with same id in report
              console.log(`searching changed material ${matToTest.id} in report`)
              reportMaterial = _.find(this.currentJob.report.materialList, repMat => {
                return matToTest.id === repMat.id
              })

              // 2. compare material from report with material to test from list in UI
              console.log(`${reportMaterial ? '' : 'not '}found changed material ${matToTest.id} in report`)
              const isDifferent = isDifferentMaterial(reportMaterial, matToTest)
              console.log(`Material is ${isDifferent ? 'different' : 'equal'}`)
              return isDifferent
            })

            if (changedMaterial) {
              // update or add material to report
              if (reportMaterial) {
                reportMaterial.matId = _.clone(changedMaterial.matId)
                reportMaterial.category = _.clone(changedMaterial.category)
                reportMaterial.name = _.clone(changedMaterial.name)
                reportMaterial.values = _.cloneDeep(changedMaterial.values)
              } else {
                let newMat = {
                  id: changedMaterial.id,
                  matId: _.clone(changedMaterial.matId),
                  category: _.clone(changedMaterial.category),
                  name: _.clone(changedMaterial.name),
                  values: []
                }
                if (changedMaterial.category) {
                  _.each(this.materialMetadata[changedMaterial.category], meta => {
                    newMat.values.push({id: meta.id, type: meta.type, label: meta.label, value: ''})
                  })

                  console.log('Saving new material (with metadata) to material list')
                  this.materialList = _.reject(this.materialList, mat => {
                    return newMat.id === mat.id
                  })
                  this.materialList.push(newMat)

                  console.log('Saving new material to report')
                  this.currentJob.report.materialList = _.reject(this.currentJob.report.materialList, repMat => {
                    return newMat.id === repMat.id
                  })
                  this.currentJob.report.materialList.push(_.cloneDeep(newMat))
                }
              }
              this.saveMaterial()
            }
          }
        },
        deep: true
      },
      form: {
        handler: function (old, newValue) {
          console.log(`form changed`)
          let job = this.currentJob
          const self = this
          _.forIn(newValue, (value, key) => {
            if (_.indexOf(self.jobKeys, key) >= 0) {
              let oldValue = job[key]
              if (oldValue === undefined) {
                let iDate = key.indexOf('Date')
                if (iDate > 0) {
                  self.processDate(key, iDate, job, value)
                } else {
                  let iTime = key.indexOf('Time') // check for time
                  if (iTime > 0) {
                    self.processTime(key, iTime, job, value)
                  }
                } // end date/time check
              } else {
                if (value !== oldValue) {
                  // console.log(`${key} changed from ${oldValue} to "${value}"`)
                  self.updateData[key] = value
                  self.setHaveDataToSave(true)
                  self._throttledSaveJobData()
                }
              }
            } else {
              if (_.indexOf(self.jobReportKeys, key) >= 0) {
                let oldValue = job.report[key]
                if (value !== oldValue) {
                  // console.log(`${key} changed from ${oldValue} to "${value}"`)
                  self.updateData.report[key] = value
                  self.setHaveDataToSave(true)
                  self._throttledSaveJobData()
                }
              }
            }
          })
        },
        deep: true
      },
      currentJob: {
        handler: function (newValue) {
          if (newValue.encrypted) {
            this.$router.push('/')
          } else {
            let job = this.currentJob
            this.dateTimeSplits = [{list: this.jobKeys, source: job}, {list: this.jobReportKeys, source: job.report}]
            console.log('currentJob has been changed -> _setFormFields')
            this._setFormFields()
            this._createAttendeesSelectionList()
          }
        },
        deep: true
      }
    },
    beforeCreate() {
      let haveSession = this.$session.exists()
      if (haveSession) {
        let accessRights = this.$session.get('accessRights')
        this.canRead = _.indexOf(accessRights, 'read') >= 0
        this.canWrite = _.indexOf(accessRights, 'write') >= 0
      }
      if (!(haveSession && this.canRead)) {
        if (this.$route.query.autotoken) {
          this.$router.push({path: '/login', query: {autotoken: this.$route.query.autotoken}})
        } else {
          this.$router.push('/login')
        }
      }
    },
    created() {
      this.updateData = {report: {}}
      let job = this.currentJob
      if (this.currentJob.id !== undefined) {
        this.materialList = []
        // migrate "old" material to new material list as generic material
        if (this.currentJob.report.material) {
          let migratedMaterial = {
            id: 0,
            matId: 'other',
            name: 'Sonstiges',
            category: 'generic',
            values: [
              {
                id: 'text',
                type: 'string',
                value: this.currentJob.report.material
              }
            ]
          }
          this.materialList.push(migratedMaterial)
          delete this.currentJob.report.material
        } else {
          if (this.currentJob.report.materialList) {
            _.each(this.currentJob.report.materialList, m => {
              if (m.id !== undefined && m.matId && m.category && this.materialMetadata[m.category]) {
                m.metadata = _.clone(this.materialMetadata[m.category])
                for (let i = 0; i < m.metadata.length; i++) {
                  const meta = m.metadata[i]
                  if (meta.id === m.values[i].id && meta.type === m.values[i].type) {
                    m.values[i].label = meta.label
                  } else {
                    throw new Error('MaterialList metadata does not match values')
                  }
                }
                this.materialList.push(m)
              }
            })
          }
        }
        this.dateTimeSplits = [{list: this.jobKeys, source: job}, {list: this.jobReportKeys, source: job.report}]
        console.log('component created -> _setFormFields')
        this._setFormFields()
        this._createAttendeesSelectionList()
      }
    },
    mounted() {
      this.dateFailure = false
      this.readonly = !this.canWrite || this.currentJob.readonly
    },
    methods: {
      ...mapActions([
        'updateJobAtServer' // map `this.updateJobAtServer()` to `this.$store.dispatch('updateJobAtServer')`
      ]),
      ...mapMutations(['setHaveDataToSave', 'setHaveDataToSave']),
      _handleError: function (ex, snackText) {
        const errorMessage = ex.response && ex.response.data ? ex.response.data : ex.message
        this.errorSnackbarText = `${snackText}: ${errorMessage}`
        this.errorSnackbar = true
        console.log(snackText, ex)
      },
      saveMaterial: function () {
        if (this.readonly) {
          console.log('WARNING: saveMaterial called, but report is readonly. Not saveing metarial.')
        } else {
          this.updateData.report.materialList = []
          _.each(this.materialList, mat => {
            if (mat.id !== undefined) {
              const m = {
                id: mat.id,
                matId: mat.matId,
                name: mat.name,
                category: mat.category,
                values: _.map(mat.values, value => {
                  return {
                    id: value.id,
                    type: value.type,
                    value: value.value
                  }
                })
              }
              this.updateData.report.materialList.push(m)
            }
          })
          this.setHaveDataToSave(true)
          this._throttledSaveJobData()
        }
      },
      processDate: function (key, iDate, job, value) {
        const dateKey = key.substr(0, iDate)
        let oldDate
        // use previous date value from update date if it is set there
        if (this.updateData[dateKey]) {
          oldDate = this.updateData[dateKey]
        } else {
          oldDate = job[dateKey]
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
            // this._setFormDate(newDate, dateKey)
            console.log(`updating date ${newDate.format()} datekey ${dateKey}`)
            this._setFormDateFormatted(newDate, dateKey)
            const duration = this._calculateDuration()
            if (duration !== undefined) {
              this.updateData.report.duration = duration
              this.form.duration = duration.toString()
              // update at server
            }
            this.updateData[dateKey] = newDate
            this.setHaveDataToSave(true)
            this._throttledSaveJobData()
          }
        }
      },
      processTime: function (key, iTime, job, value) {
        const timeKey = key.substr(0, iTime)

        let oldDateTime
        // use previous time value from update time if it is set there
        if (this.updateData[timeKey]) {
          oldDateTime = this.updateData[timeKey]
        } else {
          oldDateTime = job[timeKey]
        }

        let newDateTime = oldDateTime
        let newTime = moment(value, 'HH:mm')
        if (newTime.isValid()) {
          newDateTime.set('hour', newTime.hour())
          newDateTime.set('minute', newTime.minute())
          newDateTime.set('second', 0)
        }
        if (!newDateTime.isSame(oldDateTime)) {
          if (moment.isMoment(oldDateTime) && moment.isMoment(newDateTime)) {
            // console.log(`${key} changed from ${oldDateTime.format()} to "${newDateTime.format()}"`)
          } else {
            if (moment.isMoment(newDateTime)) {
              // console.log(`${key} changed from undefined to "${newDateTime.format()}"`)
            }
          }
          const duration = this._calculateDuration()
          if (duration !== undefined) {
            this.updateData.report.duration = duration
            this.form.duration = duration.toString()
            // update at server
          }
          this.updateData[timeKey] = newDateTime
          this.setHaveDataToSave(true)
          this._throttledSaveJobData()
        }
      },
      _createAttendeesSelectionList: function () {
        this.attendeeList = _.map(_.sortBy(this.currentJob.attendees, 'lastname'), function (attendee) {
          return attendee.firstname + ' ' + attendee.lastname
        })
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
      _throttledSaveJobData: _.debounce(async function () {
        console.log('Calling debounced saveJobData')
        const self = this
        const loading = this.loading
        const currentJobId = this.currentJobId
        if (!loading && currentJobId !== undefined) {
          const currentJob = this.currentJob
          if (currentJob && currentJob.readonly) {
            // not saving readonly job
            return
          }

          this.error = ''
          this.loading = true

          const options = {
            $session: this.$session,
            $route: this.$route,
            $router: this.$router,
            requestOptions: {
              updateData: this.updateData,
              jobId: this.currentJobId
            }
          }

          try {
            await this.updateJobAtServer(options)
            self.updateData = {report: {}}
          } catch (ex) {
            this._handleError(ex, 'Fehler beim Speichern der Berichtsdaten')
          } finally {
            self.loading = false
            self.setHaveDataToSave(false)
          }
        }
      }, 5000, {leading: false, trailing: true}),
      _calculateDuration() {
        let re = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/
        if (re.test(this.form.startTime) && re.test(this.form.endTime)) {
          let s = moment(this.form.startDate + ' ' + this.form.startTime)
          let e = moment(this.form.endDate + ' ' + this.form.endTime)
          if (s.isValid()) {
            if (e.isValid()) {
              let d = moment.duration(e.diff(s))
              return Math.round(d.asHours() * 10) / 10
            }
          }
          return moment.duration(0)
        } else {
          return undefined
        }
      },
      showMaterialPicker() {
        this.materialPickerVisible = true
      },
      materialPickerClose(payload) {
        this.materialPickerVisible = false
        for (let i = 0; i < payload.length; i++) {
          let pickedMaterialType = payload[i]
          this.addMaterial(pickedMaterialType)
        }
      },
      addMaterial(materialType) {
        let matSortedById = _.sortBy(this.materialList, 'id')
        let matWithMaxId = _.last(matSortedById)
        let m = {
          id: matWithMaxId ? matWithMaxId.id + 1 : 1,
          matId: materialType,
          category: this.materialTypesByType[materialType].category,
          name: this.materialTypesByType[materialType].name,
          values: this.materialMetadata[this.materialTypesByType[materialType].category]
            ? this.materialMetadata[this.materialTypesByType[materialType].category] : []
        }
        this.materialList.push(m)
      },
      removeMaterial(id) {
        let removeIndex = -1
        for (let i = 0; i < this.materialList.length; i++) {
          if (this.materialList[i].id === id) {
            removeIndex = i
            break
          }
        }
        if (removeIndex >= 0) {
          this.materialList.splice(removeIndex, 1)
        }
      },
      getMaterialName(item) {
        return item.name
      },
      getMaterialId(item) {
        return item.id
      }
    }
  }
</script>

<style scoped>
  .report h1 {
    padding-left: 16px;
    padding-right: 16px;
  }

  .materialListTitle {
    display: inline-block;
    margin-left: 0.3em;
  }

  .material-list {
    /*padding-left: 3em;*/
  }

  .material-value {
    padding-left: 1em;
  }
</style>
