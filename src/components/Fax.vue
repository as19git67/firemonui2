<template>
  <div v-if="image">
    <img :src="image" alt="FAX">
  </div>
  <div v-else>
    <h2>Start: {{start | toDate}}</h2>
    <h2>Kein Alarmfax verfügbar</h2>
  </div>
</template>

<script>
  import {mapGetters} from 'vuex'

  export default {
    name: 'Fax',
    data () {
      return {
        image: this.image,
        start: this.start
      }
    },
    computed: {
      ...mapGetters({currentJob: 'currentJob'})
    },
    watch: {
      currentJob () {
        this.setCurrentJobData()
      }
    },
    created () {
      if (this.currentJob) {
        this.setCurrentJobData()
      }
    },
    methods: {
      setCurrentJobData () {
        this.start = this.currentJob.start
        if (this.currentJob.images) {
          if (this.currentJob.images.fax) {
            this.image = this.currentJob.images.fax
          }
        }
      }
    }
  }
</script>

<style scoped>
  img {
    width: 100%;
    height: auto;
  }
</style>
