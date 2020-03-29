<template>
  <l-map ref="map" :zoom="zoom" :center="center" class="map">
    <l-tile-layer :url="url" :attribution="attribution" />
    <l-marker :lat-lng="marker" />
  </l-map>
</template>

<script>
  import {mapGetters} from 'vuex'
  import {LMap, LTileLayer, LMarker} from 'vue2-leaflet'
  import L from 'leaflet'

  export default {
    name: 'Map',
    components: {
      LMap,
      LTileLayer,
      LMarker
    },
    computed: {
      ...mapGetters({currentJob: 'currentJob'})
    },
    created () {
      let job = this.currentJob
      if (job) {
        if (job.latitude && job.longitude) {
          this.latitude = job.latitude
          this.longitude = job.longitude

          this.center = L.latLng(this.latitude, this.longitude)
          this.marker = L.latLng(this.latitude, this.longitude)
        }
      }
    },
    data () {
      if (!this.latitude || !this.longitude) {
        // initialize with some coordinate
        this.latitude = 48.2451316
        this.longitude = 10.9866118
      }
      this.center = L.latLng(this.latitude, this.longitude)
      this.marker = L.latLng(this.latitude, this.longitude)
      return {
        zoom: 17,
        center: this.center,
        url: 'https://{s}.tile.osm.org/{z}/{x}/{y}.png',
        attribution: 'Einsatzort',
        marker: this.marker
      }
    }
  }
</script>

<style scoped>
  img {
    width: 100%;
    height: 100%;
  }

  .map {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    margin-top: 0;
    margin-bottom: 0;
    height: 100%;
  }
</style>
