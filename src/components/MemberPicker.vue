<template>
  <v-container fluid class="cont">
    <v-layout align-center justify-center class="lay">
      <v-flex>
        <v-card class="elevation-12">
          <v-toolbar dark color="primary">
            <v-toolbar-title>Person auswählen oder
              <v-tooltip top>
                <template v-slot:activator="{ on }">
                  <v-btn icon @click="showMemberForm" v-on="on">
                    <v-icon title="Personen neu hinzufügen">
                      mdi-account-plus
                    </v-icon>
                  </v-btn>
                </template>
                <span>Personen hinzufügen</span>
              </v-tooltip>

            </v-toolbar-title>

            <v-spacer/>

            <v-btn color="info" @click="finish">
              Übernehmen
            </v-btn>
            <v-btn class="ml-3" color="secondary" @click="cancel">
              Abbrechen
            </v-btn>
          </v-toolbar>
          <v-card-text>
            <v-text-field
              v-model="filter"
              placeholder="zum Suchen Begriff eingeben"
              hide-details
              prepend-icon="mdi-table-search"
              single-line
            />
          </v-card-text>
          <v-divider/>
          <v-list two-line class="theList">
            <v-list-item-group>
              <template v-for="(item, index) in filteredMemberList">
                <v-list-item :key="item.id">
                  <template v-slot:default="{ active, toggle }">
                    <v-list-item-action>
                      <v-checkbox v-model="selected[item.id]" color="primary"/>
                    </v-list-item-action>
                    <v-list-item-content>
                      <v-list-item-title>{{ item.name }}</v-list-item-title>
                      <v-list-item-subtitle class="text--primary">
                        {{ item.notes }}
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </template>
                </v-list-item>
                <v-divider v-if="index + 1 < filteredMemberList.length" :key="index"/>
              </template>
            </v-list-item-group>
          </v-list>
        </v-card>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import {mapGetters} from 'vuex'
import _ from 'lodash'

export default {
  name: 'MemberPicker',
  data: function () {
    return {
      selected: this.selected,
      filter: ''
    }
  },
  computed: {
    ...mapGetters({
      filteredMemberList: 'filteredMemberList'
    }),
    filteredMemberList() {
      return this.materialTypes ? _.map(_.filter(this.materialTypes, mt => {
        return this.filter.trim().length === 0 ||
          (mt.name && mt.name.trim().toLowerCase().indexOf(this.filter.trim().toLowerCase()) > -1) ||
          (mt.notes && mt.notes.trim().toLowerCase().indexOf(this.filter.trim().toLowerCase()) > -1)
      }), mt => {
        return {
          id: mt.id,
          type: mt.type,
          name: mt.name,
          notes: mt.notes,
          metadata: _.clone(this.materialMetadata[mt.type])
        }
      }) : []
    }
  },
  created: function () {
    this.selected = []
  },
  mounted: function () {
    this.selected = []
  },
  methods: {
    showMemberForm: function () {
      this.$emit('showMemberForm')
    },
    finish: function () {
      let selectionIds = []
      _.each(Object.keys(this.selected), key => {
        let id = this.selected[key]
        if (id) {
          selectionIds.push(key)
        }
      })
      this.selected = []
      this.$emit('close', selectionIds)
    },
    cancel: function () {
      this.selected = []
      this.$emit('close', [])
    }
  }
}
</script>

<style scoped>
.cont {
  padding: 0;
  margin: 0;
}

.theList {
  min-height: calc(70vH + 50px);
  max-height: 70vH;
  overflow: auto;
}
</style>
