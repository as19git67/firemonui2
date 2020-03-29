<template>
  <footer>
    <hr>
    <p class="text-muted">
      Alarm Monitor︎ by <a href="https://github.com/as19git67">Anton</a>
    </p>
  </footer>
</template>

<script>
  export default {
    name: 'Foot'
  }
</script>

<style scoped>
  footer {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-family: Roboto, sans-serif;
  }

  p {
    padding-left: 16px;
    margin: 0;
  }
</style>
