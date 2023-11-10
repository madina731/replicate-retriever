<template>
  <pre>{{ response }}</pre>
</template>

<script>
export default {
  data: () => ({
    response: 'Loading...'
  }),
  async mounted() {
    try {
      const response = await fetch('/api/retrieve', {
        method: 'POST'
      })
      this.response = await response.json()
    } catch (e) {
      this.response = `Error: ${e.message}`
    }
    // window.location.href = 'https://github.com/replicate/replicate-retriever'
  }
}
</script>
