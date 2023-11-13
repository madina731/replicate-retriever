<template>
  <div id="app">
    <a href="https://github.com/replicate/replicate-retriever" target="_new">
      <img src="/retriever_logo.png"
    /></a>
    <textarea v-model="text" placeholder="Question..."></textarea>
    <button @click="submit">Submit</button>
    <div v-if="output !== ''" v-html="markdownToHtml(output)" id="output"></div>
  </div>
</template>

<script>
import { marked } from 'marked'
import rwp from 'replicate-webhook-proxy'

const client = rwp('8r73h487rh378fg3')

export default {
  data: () => ({
    text: 'How does pricing work?',
    output: ''
  }),
  methods: {
    markdownToHtml(str) {
      return marked.parse(str)
    },
    async submit() {
      try {
        this.output = ''
        const response = await fetch('/api/indexer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: this.text
          })
        })
      } catch (e) {
        this.response = `Error: ${e.message}`
      }
    }
  },
  mounted() {
    client.on('message', (event) => {
      this.output = event.data.body.output.join('')
    })
  }
}
</script>

<style>
body {
  margin: 0 !important;
  padding: 0;
}

#app {
  padding: 8px;
  position: relative;
}

img {
  width: 100px;
  margin: 0 auto 16px;
  border: 0;
  display: block;
}

textarea {
  width: 100%;
  height: 80px;
  box-sizing: border-box;
  padding: 0.5rem;
  display: block;
  border: 1px solid black;
  resize: none;
}

button {
  margin-top: 8px;
  margin-bottom: 8px;
  padding: 0.5rem 0.75rem;
  border: 0;
  border-radius: 0;
  background: #171717;
  color: #fcfcfc;
  font-size: 1rem;
  display: block;
  cursor: pointer;
}

#output {
  padding: 0.5rem;
  background: #f3f3f3;
  font-size: 0.875rem;
  font-family: monospace;
  color: #171717;
  white-space: pre-wrap;
}

#output p {
  margin: 0;
  padding-bottom: 8px;
}

#output pre {
  margin: 0;
  padding: 8px;
  background: #464646;
  color: #f3f3f3;
}
</style>
