<template>
  <div>
    <v-alert
      :value="true"
      type="success"
    >
      Eine Email mit einem Link wurde versendet. Um mit der Registrierung des Benutzers fortzufahren, muss der Link in
      der Email geöffnet werden.
    </v-alert>
    <v-btn
      color="primary"
      @click="continueToLogin()"
    >
      Weiter
    </v-btn>
  </div>
</template>

<script>
  export default {
    name: 'SetupAuth2',
    methods: {
      continueToLogin() {
        this.$router.replace('/')
      }
    }
  }
</script>

<style scoped>

</style>
