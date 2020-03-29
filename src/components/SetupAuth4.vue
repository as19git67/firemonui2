<template>
  <div>
    <v-alert :value="true" type="success">
      Der Benutzer wurde angelegt, ist aber noch nicht aktiviert. Die Aktivierung kann von einem Administrator
      durchgeführt werden.
    </v-alert>
    <v-btn color="primary" @click="gotoHome()">
      Weiter
    </v-btn>
  </div>
</template>

<script>
  export default {
    name: 'SetupAuth4',
    methods: {
      gotoHome() {
        this.$router.replace('/')
      }
    }
  }
</script>

<style scoped>

</style>
