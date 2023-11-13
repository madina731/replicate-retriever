<template>
  <div id="app">
    <textarea v-model="text" placeholder="Question..."></textarea>
    <button @click="submit">Submit</button>
    <div id="output">{{ output }}</div>
  </div>
</template>

<script>
export default {
  data: () => ({
    text: 'How does pricing work?',
    output: null
  }),
  methods: {
    async submit() {
      try {
        const response = await fetch('/api/rag', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: this.text
          })
        })
        this.output = await response.json()
      } catch (e) {
        this.response = `Error: ${e.message}`
      }
    }
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
