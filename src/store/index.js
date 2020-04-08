import Vue from 'vue'
import Vuex from 'vuex'
import moment from 'moment'
import _ from 'lodash'
import axios from 'axios'

Vue.use(Vuex)
moment.locale('de')

function _updateHaveActiveJob (state) {
  let j = _.filter(state.jobsAsList, function (job) {
    if (job.end) {
      return !!(moment.isMoment(job.end) && job.end.isAfter(moment()))
    } else {
      return true
    }
  })
  state.haveActiveJob = (j.length > 0)
}

function _updateDuration (job) {
  let s, e
  if (!job) {
    return
  }

  if (moment.isMoment(job.start)) {
    s = job.start
  } else {
    let st = job.start ? job.start.trim() : job.start
    if (st) {
      s = moment(st)
    }
  }
  if (s && s.isValid()) {
    if (moment.isMoment(job.end)) {
      e = job.end
    } else {
      let en = job.end ? job.end.trim() : job.end
      if (en) {
        e = moment(en)
      }
    }
    if (e && e.isValid()) {
      let d = moment.duration(e.diff(s))
      job.report.duration = Math.round(d.asHours() * 10) / 10
    }
  }
}

function _addAJob (state, job) {
  _.each(_.keys(job), function (key) {
    let value = job[key]
    if (_.isString(value) && value.charAt(0) === '[') {
      try {
        job[key] = JSON.parse(value)
      } catch (ex) {
        console.log(`WARNING: JSON parse failed with ${value}`)
      }
    }
  })
  if (job.start && !moment.isMoment(job.start)) {
    job.start = moment(job.start)
  }
  if (job.end && !moment.isMoment(job.end)) {
    job.end = moment(job.end)
  }

  if (!job.images) {
    job.images = {}
  }
  if (!job.encrypted) {
    job.encrypted = false
  }
  if (!job.attendees) {
    job.attendees = []
  }
  if (!job.report) {
    job.report = {}
  }
  _updateDuration(job)
  if (_.isNumber(job.id)) {
    job.id = job.id.toString()
  }

  const reportAttributesExceptions = ['director', 'writer']
  let reportEdited = !!_.find(_.keys(job.report), key => {
    if (_.includes(reportAttributesExceptions, key)) {
      return false // don't check this attribute for any value
    }
    if (key === 'materialList') {
      const matList = job.report[key]
      if (!matList || !matList.length) {
        return false; // gnore empty material list
      }
    }
    const attribute = job.report[key]
    if (_.isString(attribute)) {
      const num = parseFloat(attribute)
      if (isNaN(num)) {
        return attribute.trim()
      } else {
        return num // evaluates to false if 0
      }
    } else {
      return attribute
    }
  })

  if (job.number || job.keyword || job.catchword || _.values(job.attendees).length || reportEdited) {
    job.onlyAdminCanDelete = true
  }

  state.jobs[job.id] = job
  state.jobsAsList.push(job)

  if (job.id === state.jobId) {
    state.currentJob = job
  }
}

async function _getRefreshedTokenFromServer ($session) {
  const at = $session.get('accessToken') + '.' + btoa($session.get('username'))
  const config = {headers: {'Authorization': 'bearer ' + at}}
  const response = await axios.get('/api/token', config)
  const tokenData = response.data
  $session.set('accessToken', tokenData.refreshAccessToken)
  $session.set('accessTokenExpiresAfter', tokenData.refreshAccessTokenExpiresAfter)
}

function _startRefreshingAccessToken ($session) {
  if ($session.exists()) {
    const refreshingToken = $session.get('refreshingToken')
    if (refreshingToken) {
      console.log('returning from _startRefreshingAccessToken, because already refreshing')
      return
    }
    $session.set('refreshingToken', true)
    let tokenExpiresAfter = $session.get('accessTokenExpiresAfter')
    let tokenExpiresSoonBefore = moment(tokenExpiresAfter).subtract(5, 'minutes')
    let waitMilliseconds = 120000
    let now = moment()
    if (tokenExpiresSoonBefore.isAfter(now)) {
      const w = tokenExpiresSoonBefore.diff(now)
      // if wait time is more than a hour, use default from above instead
      if (w > waitMilliseconds && w < (3600000)) {
        waitMilliseconds = w
      }
    }
    const d = moment.duration(waitMilliseconds)
    const oldTimer = $session.get('refreshTimer')
    if (oldTimer) {
      console.log('WARNING: have old timer, which should not happen')
      clearTimeout(oldTimer)
    }
    console.log(`Waiting ${d.humanize()} until token refresh`)
    $session.set('refreshTimer', setTimeout(async () => {
        try {
          if ($session.exists()) {
            console.log('Refreshing access token...')

            await _getRefreshedTokenFromServer($session)
            console.log('Access token refreshed.')
            $session.set('refreshingToken', false)
            $session.remove('refreshTimer')
            _startRefreshingAccessToken($session)
          } else {
            console.log('Have no session. Not refreshing access token.')
            $session.remove('refreshTimer')
          }
        } catch (ex) {
          $session.remove('refreshTimer')
          $session.set('refreshingToken', false)
          console.error(ex)
        }
      }, waitMilliseconds)
    )
  }
}

function _hasRightRead (accessRights) {
  return _.indexOf(accessRights, 'read') >= 0
}

// function _hasRightWrite (accessRights) {
//   return _.indexOf(accessRights, 'write') >= 0
// }

// function _hasRightFull (accessRights) {
//   return _.indexOf(accessRights, 'admin') >= 0
// }

function _extractAccessRights (state, accessRights) {
  state.canRead = _.indexOf(accessRights, 'read') >= 0
  state.canWrite = _.indexOf(accessRights, 'write') >= 0
  state.isAdmin = _.indexOf(accessRights, 'admin') >= 0
  state.canEncrypt = _.indexOf(accessRights, 'encrypt') >= 0
  state.canDecrypt = _.indexOf(accessRights, 'decrypt') >= 0
}

async function _checkSession (state, options) {
  options || (options = {})
  options.requestOptions || (options.requestOptions = {})
  if (options.$session.exists()) {
    _extractAccessRights(state, options.$session.get('accessRights'))
    return options.$session
  } else {
    console.log('not logged in => tryLoginWithToken')
    const haveSession = await this.dispatch('tryLoginWithToken', options)
    if (haveSession) {
      return options.$session
    } else {
      return undefined
    }
  }
}

async function _updateJobAttendees (commit, state, options) {
  options || (options = {})
  options.requestOptions || (options.requestOptions = {})
  const jobId = options.requestOptions.jobId
  if (jobId === undefined) {
    throw new Error('JobId missing in options')
  }
  const person = options.requestOptions.person
  if (person === undefined) {
    throw new Error('person missing in options')
  }
  let session = options.$session
  if (session.exists()) {
    _extractAccessRights(state, session.get('accessRights'))
  } else {
    console.log('_updateJobAttendees: not logged in => tryLoginWithToken')
    const haveSession = await this.dispatch('tryLoginWithToken', options)
    if (!haveSession) {
      // commit('storeSetAttendeesForJob', {jobId: jobId, attendees: []}) // clear out existing attendees
      return
    }
  }
  if (!state.canWrite) {
    console.log('_updateJobAttendees: can\'t modify job attendees, because user has no right to write')
    // options.$router.replace('/login')
    return
  }
  let jobAttendees = _.reject(state.jobs[jobId].attendees, ['id', person.id])
  if (options.add) {
    jobAttendees.push(person)
  }
  let data = {attendees: jobAttendees}
  let at = session.get('accessToken') + '.' + btoa(session.get('username'))
  let config = {headers: {'Authorization': 'bearer ' + at}}
  const self = this
  try {
    await axios.put(`/api/jobs/${jobId}`, data, config)
    commit('storeSetAttendeesForJob', {jobId: jobId, attendees: jobAttendees})
  } catch (ex) {
    if (ex.response) {
      const res = ex.response
      if (res.status === 401) {
        const haveSession = await self.dispatch('tryLoginWithToken', options)
        if (haveSession) {
          const at = session.get('accessToken') + '.' + btoa(session.get('username'))
          const config = {headers: {'Authorization': 'bearer ' + at}}
          await axios.put(`/api/jobs/${jobId}`, data, config)
          commit('storeSetAttendeesForJob', {jobId: jobId, attendees: jobAttendees})
        } else {
          // commit('storeSetAttendeesForJob', {jobId: jobId, attendees: []}) // clear out existing attendees
        }
      } else {
        if (res.data) {
          console.log('Error while saving attendees of jobs', res.data.error)
        } else {
          console.log('Error while saving attendees of jobs', res)
        }
        // commit('storeSetAttendeesForJob', {jobId: jobId, attendees: []}) // clear out existing attendees
        throw ex
      }
    } else {
      console.log('Error while saving attendees of jobs', ex)
      throw ex
    }
  }
}

function _setStaff (state, persons) {
  state.staff = {}
  state.staffAsList = []
  _.each(persons, function (person) {
    let p = {id: person.id, firstname: person.firstname, lastname: person.lastname}
    state.staff[p.id] = p
    state.staffAsList.push(p)
  })
}

async function _requestDataFromServer (commit, apiPath, mutationFunction, options) {
  const self = this
  let session = options.$session
  const username = session.get('username')
  let at = session.get('accessToken') + '.' + btoa(username)
  // console.log(`_requestDataFromServer with at ${at}`)
  let config = {headers: {'Authorization': 'bearer ' + at}}

  try {
    let response = await axios.get(apiPath, config)
    commit(mutationFunction, response.data)
  } catch (ex) {
    const res = ex.response
    if (res) {
      if (res.status === 401) {
        // console.log('response 401 -> call tryLoginWithToken')
        const haveSession = await self.dispatch('tryLoginWithToken', options)
        if (haveSession) {
          at = session.get('accessToken') + '.' + btoa(username)
          // console.log(`_requestDataFromServer after tryLoginWithToken with at ${at}`)
          config = {headers: {'Authorization': 'bearer ' + at}}
          const response = await axios.get(apiPath, config)
          // console.log(`Request successfully sent`)
          commit(mutationFunction, response.data)
        } else {
          throw new Error(`Login failed for accessing ${apiPath}`)
        }
      } else {
        if (res.data) {
          console.log(`Error while requesting data from ${apiPath}: ${res.data.error}`)
        } else {
          console.log(`Error while requesting data from ${apiPath}: ${res}`)
        }
      }
    }
    throw ex
  }
}

export default new Vuex.Store({
  state: {
    isAdmin: false,
    canRead: false,
    canWrite: false,
    canDecrypt: false,
    canEncrypt: false,
    materialTypes: [],
    materialMetadata: {},
    jobs: {},
    jobsAsList: [],
    jobId: undefined,
    haveActiveJob: false,
    currentJob: {},
    currentJobAttendeesById: {},
    currentJobAttendeesCount: 0,
    staff: {},
    savingEnabled: false,
    haveDataToSave: false,
    appName: 'Alarm Monitor',
    socket: {
      isConnected: false,
      message: '',
      reconnectError: false
    }
  },
  mutations: {
    setHaveDataToSave: function (state, haveDataToSave) {
      state.haveDataToSave = !!haveDataToSave
      console.log('have data to save: ' + state.haveDataToSave)
    },
    storeAddMaterialMeta: function (state, data) {
      if (_.isPlainObject(data)) {
        state.materialMetadata = {}
        const keys = Object.keys(data)
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i]
          state.materialMetadata[key] = data[key]
        }
        // state.materialMetadata = data
      } else {
        throw new Error('data of material metadata is no object')
      }
    },
    storeAddMaterialTypes: function (state, data) {
      if (_.isArray(data)) {
        state.materialTypes = []
        for (let i = 0; i < data.length; i++) {
          let value = data[i]
          state.materialTypes.push(value)
        }
        // state.materialTypes = data
      } else {
        throw new Error('data of material types is no array')
      }
    },
    storeAddJobs: function (state, data) {
      state.jobs = {}
      state.jobsAsList = []
      _.each(data, function (job) {
        _addAJob(state, job)
      })
      _updateHaveActiveJob(state)
    },
    storeAddSingleJob: function (state, job) {
      if (job.id === undefined) {
        throw new Error('job.id is undefined')
      }
      if (_.isNumber(job.id)) {
        job.id = job.id.toString()
      }
      _.pullAllBy(state.jobsAsList, [job], 'id') // remove existing job with that id
      _addAJob(state, job)
      _updateHaveActiveJob(state)
    },
    storeRemoveJob: function (state, jobId) {
      delete state.jobs[jobId]
      state.jobsAsList = _.map(state.jobs, function (j) {
        return j
      })
      _updateHaveActiveJob(state)
    },
    storeRemoveDecryptedJobs: function (state) {
      let keys = _.keys(state.jobs)
      keys.forEach(function (id) {
        if (id.startsWith('d')) {
          _.pullAllBy(state.jobsAsList, [state.jobs[id]], 'id')
          delete state.jobs[id]
        }
      })
    },
    storeUpdateJob: function (state, data) {
      // assign the new values
      let job = state.jobs[data.id]
      if (data.images) {
        job.images = data.images
        job.start = data.start
      } else {
        job.start = data.start
        _.assignIn(job, data)
        if (!job.encrypted) {
          delete job.encryptedData
          delete job.encryptedRandomBase64
        }
      }
      if (!moment.isMoment(job.start)) {
        job.start = moment(job.start);
      }
      if (!moment.isMoment(job.end)) {
        job.end = moment(job.end);
      }
      _updateHaveActiveJob(state)
    },
    storeSetCurrentJobId: function (state, jobId) {
      state.jobId = jobId
      state.currentJob = state.jobs[jobId]
      state.currentJobAttendeesCount = state.currentJob.attendees.length
      state.currentJobAttendeesById = {}
      _.each(state.currentJob.attendees, function (attendee) {
        state.currentJobAttendeesById[attendee.id] = attendee
      })
      if (state.currentJob.readonly) {
        _setStaff(state, state.currentJob.attendees)
      }
    },
    storeClearCurrentJobId: function (state) {
      state.jobId = undefined
      state.currentJob = {}
      state.currentJobAttendeesById = {}
      state.currentJobAttendeesCount = 0
      _setStaff(state, [])
    },
    storeAddStaff: function (state, data) {
      _setStaff(state, data)
    },
    storeSetAttendeesForJob: function (state, data) {
      let job = state.jobs[data.jobId]
      state.currentJobAttendeesById = {}
      job.attendees = []
      _.each(data.attendees, (attendee) => {
        let attendeeId
        if (_.isObject(attendee)) {
          attendeeId = attendee.id
        } else {
          attendeeId = attendee
        }
        const person = state.staff[attendeeId]
        state.currentJobAttendeesById[attendeeId] = person
        job.attendees.push({id: person.id, firstname: person.firstname, lastname: person.lastname})
      })
      state.currentJobAttendeesCount = job.attendees.length
      if (state.currentJob.readonly) {
        _setStaff(state, job.attendees)
      }
    },
    storeSetSavingEnabled (state, enabled) {
      state.savingEnabled = !!enabled
    },
    setJobData: function (state, data) {
      if (state.jobs[state.jobId]) {
        if (data.report) {
          _.extend(state.jobs[state.jobId].report, data.report)
        } else {
          _.extend(state.jobs[state.jobId], data)
        }
        _updateDuration(state.jobs[state.jobId])
        _updateHaveActiveJob(state)
      }
    },
    SOCKET_ONOPEN (state, event) {
      Vue.prototype.$socket = event.currentTarget
      state.socket.isConnected = true
    },
    SOCKET_ONCLOSE (state, event) {
      state.socket.isConnected = false
    },
    SOCKET_ONERROR (state, event) {
      state.socket.isConnected = false
      console.error('Websocket error: ', event)
    },
    // default handler called for all methods
    SOCKET_ONMESSAGE (state, message) {
      state.socket.message = message
    },
    // mutations for reconnect methods
    SOCKET_RECONNECT (state, count) {
      console.info('Websocket reconnect: ', count)
    },
    SOCKET_RECONNECT_ERROR (state) {
      state.socket.reconnectError = true
      state.socket.isConnected = false
    }
  },
  getters: {
    haveDataToSave (state) {
      console.log('ASK for have data to save: ' + state.haveDataToSave)
      return state.haveDataToSave
    },
    appName (state) {
      return state.appName
    },
    materialTypes (state) {
      return state.materialTypes
    },
    materialTypesByType (state) {
      let matTypesByType = {}
      for (let i = 0; i < state.materialTypes.length; i++) {
        matTypesByType[state.materialTypes[i].id] = state.materialTypes[i]
      }
      return matTypesByType
    },
    materialMetadata (state) {
      return state.materialMetadata
    },
    canRead (state) {
      return state.canRead
    },
    canWrite (state) {
      return state.canWrite
    },
    isAdmin (state) {
      return state.isAdmin
    },
    canDecrypt (state) {
      return state.canDecrypt
    },
    canEncrypt (state) {
      return state.canEncrypt
    },
    jobs (state) {
      return state.jobs
    },
    jobsList (state) {
      return state.jobsAsList
    },
    currentJobId (state) {
      return state.jobId
    },
    currentJob (state) {
      return state.currentJob
    },
    jobById: state => jobId => state.jobs[jobId],
    haveActiveJob: state => state.haveActiveJob,
    savingEnabled (state) {
      return state.savingEnabled
    },
    staff (state) {
      return state.staff
    },
    staffAsList (state) {
      return state.staffAsList
    },
    attendeesOfCurrentJob: state => state.jobId && state.jobs && state.jobs[state.jobId] ? state.jobs[state.jobId].attendees : [],
    attendeeOfCurrentJobById: state => personId => _.find(state.jobs[state.jobId].attendees, {id: personId}),
    attendeesCountOfCurrentJob: state => {
      return state.currentJobAttendeesCount
    },
    report (state) {
      if (state.jobs[state.jobId]) {
        return state.jobs[state.jobId].report
      } else {
        return {}
      }
    }
  },
  actions: {
    async tryLoginWithToken ({commit, state}, options) {
      let autotoken = options.$route.query.autotoken
      if (autotoken) {
        console.log('Try to authenticate with autotoken...')
        const config = {headers: {'Authorization': 'bearer ' + autotoken}}
        try {
          let response = await axios.post('/api/authwithtoken', undefined, config)
          console.log('Authentication with token was successful')
          let tokenData = response.data
          if (options.$session.exists()) {
            options.$session.destroy()
          }
          options.$session.start()
          options.$session.set('username', tokenData.username)
          const accessRights = tokenData.accessRights
          _extractAccessRights(state, accessRights)
          options.$session.set('accessRights', accessRights)
          options.$session.set('accessToken', tokenData.accessToken)
          options.$session.set('accessTokenIsAuto', true)
          options.$session.set('encryptionKeyName', tokenData.encryptionKeyName)
          options.$session.set('accessTokenExpiresAfter', tokenData.accessTokenExpiresAfter)

          options.$session.set('autologin', !!autotoken)

          console.log('Login with token was successful')

          _startRefreshingAccessToken(options.$session)
          return true
        } catch (ex) {
          console.log('login with token threw an exception')
          throw ex
        }
      } else {
        console.log('No token in url. Redirect to login page.')
        options.$router.replace('/login')
        return false
      }
    },
    async loginWithCode ({commit, state}, options) {
      if (!options.$session) {
        throw new Error('$session not set in options')
      }
      try {
        const j = JSON.stringify({name: options.name, code: options.code})
        const c = {headers: {'Content-Type': 'application/json'}}
        let response = await axios.post('/api/verifycode', j, c)
        let tokenData = response.data
        if (options.$session.exists()) {
          options.$session.destroy()
        }
        options.$session.start()
        options.$session.set('username', options.name)
        const accessRights = tokenData.accessRights
        _extractAccessRights(state, accessRights)
        options.$session.set('accessRights', accessRights)
        options.$session.set('accessToken', tokenData.accessToken)
        options.$session.set('accessTokenIsAuto', false)
        options.$session.set('encryptionKeyName', tokenData.encryptionKeyName)
        options.$session.set('accessTokenExpiresAfter', tokenData.accessTokenExpiresAfter)

        console.log('Login with code was successful')

        _startRefreshingAccessToken(options.$session)
        return true
      } catch (ex) {
        console.log('Login with code threw an exception')
        throw ex
      }
    },

    async requestMaterialMetadataFromServer ({commit, state}, options) {
      let session = await _checkSession.call(this, state, options)
      if (!session) {
        return
      }

      try {
        const apiPath = '/api/materialmeta'
        const mutationFunction = 'storeAddMaterialMeta'
        await _requestDataFromServer.call(this, commit, apiPath, mutationFunction, options)
      } catch (ex) {
        // ignore error
      }
    },

    async requestMaterialTypesFromServer ({commit, state}, options) {
      let session = await _checkSession.call(this, state, options)
      if (!session) {
        return
      }

      try {
        const apiPath = '/api/materialtypes'
        const mutationFunction = 'storeAddMaterialTypes'
        await _requestDataFromServer.call(this, commit, apiPath, mutationFunction, options)
      } catch (ex) {
        // ignore error
      }
    },

    async requestJobsFromServer ({commit, state}, options) {
      const mutationFunction = 'storeAddJobs'
      let session = await _checkSession.call(this, state, options)
      if (!session) {
        commit(mutationFunction, []) // clear out existing jobs
        return
      }

      try {
        const apiPath = `/api/jobs${options.requestOptions.withImages ? '?withImages=1' : ''}`
        await _requestDataFromServer.call(this, commit, apiPath, mutationFunction, options)
      } catch (ex) {
        console.error(ex.message)
        commit(mutationFunction, []) // clear out existing jobs
        throw ex
      }
    },

    async requestJobFromServer ({commit, state}, options) {
      options || (options = {})
      options.requestOptions || (options.requestOptions = {})
      const withImages = options.requestOptions.withImages
      const jobId = options.requestOptions.jobId
      if (jobId === undefined) {
        throw new Error('JobId missing in options')
      }
      const loginOptions = _.pick(options, ['$session', '$route', '$router'])
      if (loginOptions.$session.exists()) {
        _extractAccessRights(state, loginOptions.$session.get('accessRights'))
      } else {
        console.log('requestJobFromServer: not logged in => tryLoginWithToken')
        const haveSession = await this.dispatch('tryLoginWithToken', options)
        if (!haveSession) {
          commit('storeRemoveJob', jobId) // remove job from store
          return
        }
      }
      const self = this
      let at = loginOptions.$session.get('accessToken') + '.' + btoa(loginOptions.$session.get('username'))
      let config = {headers: {'Authorization': 'bearer ' + at}}
      const apiPath = `/api/jobs/${jobId}${withImages ? '?withImages=1' : ''}`
      try {
        let response = await axios.get(apiPath, config)
        if (state.jobs[response.data.id]) {
          commit('storeAddSingleJob', response.data)
        } else {
          commit('storeAddSingleJob', response.data)
        }
      } catch (ex) {
        const res = ex.response
        if (res.status === 401) {
          const haveSession = await self.dispatch('tryLoginWithToken', options)
          if (haveSession) {
            at = loginOptions.$session.get('accessToken') + '.' + btoa(loginOptions.$session.get('username'))
            config = {headers: {'Authorization': 'bearer ' + at}}
            const response = await axios.get(apiPath, config)
            if (state.jobs[response.data.id]) {
              commit('storeAddSingleJob', response.data)
            } else {
              commit('storeAddSingleJob', response.data)
            }
          } else {
            commit('storeRemoveJob', jobId) // remove job from store
          }
        } else {
          if (res.data) {
            console.log(`Error while retrieving job ${jobId}: ${res.data.error}`)
          } else {
            console.log(`Error while retrieving job ${jobId}: ${res}`)
          }
          commit('storeRemoveJob', jobId) // remove job from store
          throw ex
        }
      }
    },
    async createJobAtServer ({commit, state}, options) {
      const loginOptions = _.pick(options, ['$session', '$route', '$router'])
      if (!loginOptions.$session.exists()) {
        const haveSession = await this.dispatch('tryLoginWithToken', options)
        if (!haveSession) {
          return // tryLoginWithToken redirected to /login
        }
      }
      const at = loginOptions.$session.get('accessToken') + '.' + btoa(loginOptions.$session.get('username'))
      const config = {headers: {'Authorization': 'bearer ' + at}}
      const data = {title: options.title}
      try {
        const response = await axios.post(`/api/jobs`, data, config)
        if (response.status === 200) {
          const id = response.data.id
          console.log('Job created at server with id ' + id)
          commit('storeAddSingleJob', {id: id, title: options.title})
        } else {
          throw new Error(response.statusText)
        }
      } catch (ex) {
        console.log('Creating job at server failed')
        throw ex
      }
    },
    async deleteJobAtServer ({commit, state}, options) {
      const jobId = options.jobId
      if (options.$session.exists()) {
        const at = options.$session.get('accessToken') + '.' + btoa(options.$session.get('username'))
        const config = {headers: {'Authorization': 'bearer ' + at}}
        try {
          await axios.delete(`/api/jobs/${jobId}`, config)
          commit('storeRemoveJob', jobId)
        } catch (ex) {
          console.log('Deleting job at server failed')
          throw ex
        }
      } else {
        throw new Error('Can\'t delete job without being logged in')
      }
    },
    async encryptJobById ({commit, state}, payload) {
      const jobId = payload.jobId
      let job = state.jobs[jobId]
      if (job) {
        let at = this._vm.$session.get('accessToken') + '.' + btoa(this._vm.$session.get('username'))
        let config = {headers: {'Authorization': 'bearer ' + at}}
        const data = {id: jobId, encrypted: true}
        try {
          let result = await axios.put(`/api/jobs/${jobId}`, data, config)
          commit('storeUpdateJob', result.data)
        } catch (ex) {
          console.log('EXCEPTION while encrypting job data: ' + ex.message)
          throw ex
        }
      }
    },
    async decryptJobById ({commit, state}, payload) {
      let jobId = payload.jobId
      let passphrase = payload.passphrase
      let job = state.jobs[jobId]
      if (job) {
        let at = this._vm.$session.get('accessToken') + '.' + btoa(this._vm.$session.get('username'))
        let config = {headers: {'Authorization': 'bearer ' + at}}
        const data = {id: jobId, encrypted: false, passphrase: passphrase}
        try {
          let result = await axios.put(`/api/jobs/${jobId}`, data, config)
          commit('storeUpdateJob', result.data)
        } catch (ex) {
          console.log('EXCEPTION while decrypting job data: ' + ex.message)
          throw ex
        }
      }
    },
    async tempDecryptJobById ({commit, state}, payload) {
      let jobId = payload.jobId
      let passphrase = payload.passphrase
      let encryptionKeyName = payload.encryptionKeyName
      let job = state.jobs[jobId]
      if (job) {
        let at = this._vm.$session.get('accessToken') + '.' + btoa(this._vm.$session.get('username'))
        let config = {headers: {'Authorization': 'bearer ' + at, password: passphrase, encryptionKeyName: encryptionKeyName}}
        try {
          const result = await axios.get(`/api/jobs/${jobId}?withImages=1`, config)
          let job = result.data
          // put the decrypted job into the jobs list as a special job with the jobId prefixed with 'd'
          job.id = 'd' + job.id
          job.readonly = true // decrypted job is readonly when decrypted for reading only
          commit('storeAddSingleJob', job)
          return job.id
        } catch (ex) {
          console.log('EXCEPTION while decrypting job data: ' + ex.message)
          throw ex
        }
      }
    },
    async updateJobAtServer ({commit, state}, options) {
      const self = this
      const loginOptions = _.pick(options, ['$session', '$route', '$router'])
      if (loginOptions.$session.exists()) {
        _extractAccessRights(state, loginOptions.$session.get('accessRights'))
      } else {
        console.log('updateJobAtServer: not logged in => tryLoginWithToken')
        const haveSession = await this.dispatch('tryLoginWithToken', options)
        if (!haveSession) {
          return // tryLoginWithToken redirected to /login
        }
      }

      let at = loginOptions.$session.get('accessToken') + '.' + btoa(loginOptions.$session.get('username'))
      let config = {headers: {'Authorization': 'bearer ' + at}}
      const apiPath = `/api/jobs/${state.jobId}`
      const updateData = options.requestOptions.updateData
      try {
        console.log(`Saving job ${state.jobId}: ${JSON.stringify(options.updateData)}`)
        await axios.put(apiPath, updateData, config)
      } catch (ex) {
        if (ex.response) {
          const res = ex.response
          if (res.status === 401) {
            const haveSession = await self.dispatch('tryLoginWithToken', options)
            if (haveSession) {
              at = loginOptions.$session.get('accessToken') + '.' + btoa(loginOptions.$session.get('username'))
              config = {headers: {'Authorization': 'bearer ' + at}}
              await axios.put(apiPath, updateData, config)
            } else {
              console.log('Warning')
            }
          } else {
            if (res.data) {
              console.log(`Error while updating job ${state.jobId}: ${res.data.error}`)
            } else {
              console.log(`Error while retrieving job ${state.jobId}: ${res}`)
            }
            throw ex
          }
        } else {
          console.log(`Error while retrieving job ${state.jobId}: ${ex}`)
          throw ex
        }
      }
    },
    async requestStaffFromServer ({commit, state}, options) {
      function _handleResponseError (ex) {
        const res = ex.response
        if (res.data) {
          console.log('requestStaffFromServer: Error while retrieving staff', res.data.error)
        } else {
          console.log('requestStaffFromServer: Error while retrieving staff', res)
        }
        commit('storeAddStaff', []) // clear out existing staff
        throw ex
      }

      async function _requestFromServer () {
        const at = loginOptions.$session.get('accessToken') + '.' + btoa(loginOptions.$session.get('username'))
        const config = {headers: {'Authorization': 'bearer ' + at}}
        const response = await axios.get('/api/staff', config)
        commit('storeAddStaff', response.data)
      }

      const loginOptions = _.pick(options, ['$session', '$route', '$router'])
      if (!loginOptions.$session.exists()) {
        console.log('requestStaffFromServer: not logged in => tryLoginWithToken')
        const haveSession = await this.dispatch('tryLoginWithToken', options)
        if (!haveSession) {
          commit('storeAddStaff', []) // clear out existing staff
          return
        }
      }
      const self = this
      let canRead = _hasRightRead(loginOptions.$session.get('accessRights'))
      if (canRead) {
        try {
          await _requestFromServer()
        } catch (ex) {
          const res = ex.response
          if (res.status === 401) {
            // 401 can happen if session was available, but token was already expired => try again to login
            const haveSession = await self.dispatch('tryLoginWithToken', options)
            if (haveSession) {
              canRead = _hasRightRead(loginOptions.$session.get('accessRights'))
              if (canRead) {
                try {
                  await _requestFromServer()
                } catch (ex) {
                  _handleResponseError(ex)
                }
              } else {
                throw new Error('Benutzer hat kein Leserecht')
              }
            } else {
              commit('storeAddStaff', []) // clear out existing staff
              throw new Error('requestStaffFromServer: no session after second tryLoginWithToken')
            }
          } else {
            _handleResponseError(ex)
          }
        }
      } else {
        commit('storeAddStaff', []) // clear out existing staff
        throw new Error('Benutzer hat kein Leserecht')
      }
    },
    async addAttendeeToJob ({commit, state}, options) {
      options.add = true
      await _updateJobAttendees(commit, state, options)
    },
    async removeAttendeeFromJob ({commit, state}, options) {
      options.add = false
      await _updateJobAttendees(commit, state, options)
    },
    async getDetailsForUser ({commit, state}, options) {
      options || (options = {})
      options.requestOptions || (options.requestOptions = {})
      const loginOptions = _.pick(options, ['$session', '$route', '$router'])
      if (loginOptions.$session.exists()) {
        _extractAccessRights(state, loginOptions.$session.get('accessRights'))
      } else {
        console.log('getUser: not logged in => tryLoginWithToken')
        const haveSession = await this.dispatch('tryLoginWithToken', options)
        if (!haveSession) {
          console.log('login for getUser failed')
          return
        }
      }
      const self = this
      const username = loginOptions.$session.get('username')
      let at = loginOptions.$session.get('accessToken') + '.' + btoa(username)
      let config = {headers: {'Authorization': 'bearer ' + at}}
      const apiPath = '/api/user'
      try {
        let response = await axios.get(apiPath, config)
        return response.data
      } catch (ex) {
        const res = ex.response
        if (res.status === 401) {
          const haveSession = await self.dispatch('tryLoginWithToken', options)
          if (haveSession) {
            at = loginOptions.$session.get('accessToken') + '.' + btoa(username)
            config = {headers: {'Authorization': 'bearer ' + at}}
            const response = await axios.get(apiPath, config)
            return response.data
          } else {
            console.log(`login for getUser(${username}) failed`)
          }
        } else {
          if (res.data) {
            console.log(`Error while retrieving user data for ${username}: ${res.data.error}`)
          } else {
            console.log(`Error while retrieving user data for ${username}: ${res}`)
          }
          throw ex
        }
      }
    }
  }
})
