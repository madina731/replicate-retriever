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
      const response = await fetch('/api/indexer', {
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

<style scoped>
pre {
  white-space: pre-wrap; /* css-3 */
  white-space: -moz-pre-wrap; /* Mozilla, since 1999 */
  white-space: -pre-wrap; /* Opera 4-6 */
  white-space: -o-pre-wrap; /* Opera 7 */
  word-wrap: break-word;
}
</style>
