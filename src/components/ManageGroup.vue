<template>
  <div>
    <template>
      <Toolbar/>
    </template>
    <v-form>
      <v-container fluid>
        <v-flex>
          <span class="title">Gruppe {{ group.id }} verwalten:
            <v-tooltip top>
              <template v-slot:activator="{ on }">
                <v-btn icon @click="showMemberPicker" v-on="on">
                  <v-icon title="weitere Personen hinzufügen">
                    mdi-account-plus
                  </v-icon>
                </v-btn>
              </template>
              <span>Personen hinzufügen</span>
            </v-tooltip>
          </span>
        </v-flex>
        <v-layout class="group-members-list column">
          <v-container fluid>
            <v-layout v-for="member in groupMembers" :key="member.id" row>
              <v-flex xs3>
                <v-text-field v-model="member.lastname" readonly prepend-icon="mdi-tools"/>
              </v-flex>
              <v-flex v-for="group in member.groups" :key="group.id" class="material-value">
                <v-text-field v-if="value.type==='string'" v-model.lazy="value.value"
                              :label="value.label" required/>
                <v-text-field v-if="value.type==='int'" v-model.lazy="value.value"
                              :label="value.label" :rules="integerRules"
                              required
                />
                <v-text-field v-if="value.type==='float'" v-model.lazy="value.value"
                              :label="value.label" :rules="floatRules"
                              required
                />
                <v-autocomplete v-if="value.type==='attendee'" v-model.lazy="value.value"
                                :items="attendeeList"
                                placeholder="Tippe um die Person zu suchen" :label="value.label" required
                                prepend-icon="mdi-account" return-object
                />
              </v-flex>
              <v-flex align-self-center="true">
                <v-btn icon @click="removeMember(member.id)">
                  <v-icon title="Person aus Gruppe entfernen">
                    mdi-playlist-minus
                  </v-icon>
                </v-btn>
              </v-flex>
            </v-layout>
          </v-container>
        </v-layout>
      </v-container>
    </v-form>
    <v-dialog v-model="memberPickerVisible" max-width="600px" scrollable :fullscreen="$vuetify.breakpoint.xsOnly">
      <template>
        <MemberPicker @close="memberPickerClose" @showMemberForm="showMemberForm"/>
      </template>
    </v-dialog>
    <v-dialog v-model="memberFormVisible" max-width="600px" scrollable :fullscreen="$vuetify.breakpoint.xsOnly">
      <template>
        <MemberForm @saveMemberForm="saveMemberForm"/>
      </template>
    </v-dialog>
    <v-snackbar v-model="saveStatus" :top="false" dark color="info">
      Daten werden gespeichert...
    </v-snackbar>
    <v-snackbar v-model="loadStatus" :top="false" dark color="info">
      Daten werden geladen...
    </v-snackbar>
  </div>
</template>

<script>
import Toolbar from '@/components/Toolbar.vue'
import {mapActions, mapMutations, mapGetters} from 'vuex'
import MemberPicker from '@/components/MemberPicker'
import MemberForm from '@/components/MemberForm'
import _ from 'lodash'

export default {
  name: 'ManageGroup',
  components: {
    Toolbar, MemberPicker, MemberForm
  },
  data() {
    return {
      groupMembers: [],
      memberPickerVisible: false,
      memberFormVisible: false,
      form: this.form,
      loadStatus: false,
      saveStatus: false,
      snackbar: false,
      snackbarTimeout: 6000,
      snackbarText: '',
      snackbarColor: 'info',
    }
    },
    computed: {
      ...mapGetters({
        groupById: 'groupById',
        groupMembersByGroupId: 'groupMembersByGroupId',
      }),
    },
    beforeCreate() {
      let haveSession = this.$session.exists()
      if (haveSession) {
        let accessRights = this.$session.get('accessRights')
        this.canRead = _.indexOf(accessRights, 'read') >= 0
        this.hasFullRight = _.indexOf(accessRights, 'admin') >= 0
        this.isGroupAdmin = _.indexOf(accessRights, 'groupadmin') >= 0 || this.hasFullRight
      }
      // must be logged in and have group admin right
      if (!(haveSession && this.isGroupAdmin)) {
        if (this.$route.query.autotoken) {
          this.$router.push({path: '/login', query: {autotoken: this.$route.query.autotoken}})
        } else {
          this.$router.push('/login')
        }
      }
    },
    created() {
      const groupId = this.$attrs.groupId
      if (groupId === undefined) {
        console.log(`No groupId - redirecting to /managegroups`)
        this.$router.replace('/managegroups')
        return
      }
      console.log(`should show group with id ${groupId}`)
      const g = this.groupById(groupId)
      if (g === undefined) {
        this.$router.replace('/managegroups')
        return
      }
      this.group = g
      this.groupMembers = this.groupMembersByGroupId(groupId);
    },
    async mounted() {
      this.email = ''
      const options = {
        $session: this.$session,
        $route: this.$route,
        $router: this.$router
      }
    },
    methods: {
      ...mapActions([
        'addMembersAtServer', // map `this.addMembersAtServer()` to `this.$store.dispatch('addMembersAtServer')`
      ]),
      showMemberPicker() {
        this.memberPickerVisible = true
      },
      memberPickerClose(payload) {
        this.memberPickerVisible = false
        for (let i = 0; i < payload.length; i++) {
          const pickedMember = payload[i]
          this.addMember(pickedMember)
        }
      },
      showMemberForm() {
        this.memberFormVisible = true
      },
      saveMemberForm(member) {
        this.memberFormVisible = false
        this.addMember(member)
      },
      saveAndNewMemberForm(member) {
        this.addMember(member)
      },
      addMember(member) {
        const memberSortedById = _.sortBy(this.groupMembers, 'id')
        const memberWithMinId = _.first(memberSortedById)
        let id = -1;
        if (memberWithMinId !== undefined) {
          id = memberWithMinId >= 0 ? -1 : memberWithMinId.id - 1;
        }

        // negative id means not yet saved at server
        let m = {
          id: id,
          lastname: member.lastname,
          firstname: member.firstname,
          mobile: member.mobile,
          email: member.email,
        }
        this.saveStatus = true
        this.addMembersAtServer({$session: this.$session, $route: this.$route, $router: this.$router, members: [m]})
        .then(() => {
          this.saveStatus = false
        })
        .catch(reason => {
          this.saveStatus = false
          this._handleError(reason, 'Neue Mitglieder speichern fehlgeschlagen')
        })

      },
      removeMember(id) {
        let removeIndex = -1
        for (let i = 0; i < this.groupMembers.length; i++) {
          if (this.groupMembers[i].id === id) {
            removeIndex = i
            break
          }
        }
        if (removeIndex >= 0) {
          this.groupMembers.splice(removeIndex, 1)
        }
      },

    }
  }
</script>

<style scoped>
</style>
