<template>
  <div id="app">
    <a href="https://github.com/replicate/replicate-retriever" target="_new">
      <img src="/retriever_logo.png"
    /></a>
    <textarea v-model="text" placeholder="Question..."></textarea>
    <button @click="submit">{{ loading ? 'Loading...' : 'Submit' }}</button>
    <div v-if="output !== ''" v-html="markdownToHtml(output)" id="output"></div>
    <div v-if="output !== '' && deduped_documents.length > 0" id="sources">
      <b>Sources:</b>
      <ol>
        <li v-for="(item, index) in deduped_documents" :key="`source-${index}`">
          <a :href="item.url" tager="_new">{{ item.title }}</a>
        </li>
      </ol>
    </div>
  </div>
</template>

<script>
import { marked } from 'marked'
import rwp from 'replicate-webhook-proxy'

const makeid = (length) => {
  let result = ''
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  let counter = 0
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
    counter += 1
  }
  return result
}

const ws_id = makeid(10)
const client = rwp(ws_id)

export default {
  data: () => ({
    loading: false,
    text: 'How does pricing work?',
    output: '',
    documents: []
  }),
  computed: {
    deduped_documents() {
      return this.documents.filter(
        (value, index, self) =>
          index === self.findIndex((v) => v.title === value.title)
      )
    }
  },
  methods: {
    markdownToHtml(str) {
      return marked.parse(str)
    },
    async submit() {
      try {
        this.loading = true
        this.output = ''
        const response = await fetch('/api/rag', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: this.text,
            ws_id
          })
        })
        this.documents = await response.json()
      } catch (e) {
        this.loading = false
        this.response = `Error: ${e.message}`
      }
    }
  },
  mounted() {
    client.on('message', (event) => {
      this.output = event.data.body.output.join('')
      this.loading = false
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

#sources {
  margin-top: 0.5rem;
  padding: 0.5rem;
  font-size: 0.875rem;
  font-family: monospace;
  color: #171717;
  white-space: pre-wrap;
  background: rgb(255, 247, 145);
}

#sources ol {
  margin: 0;
  padding: 0 0.5rem 0.5rem 2.5rem;
}

#sources ol li {
  padding: 0.5rem 0 0;
}

#sources ol li a {
  color: #000;
  text-decoration: underline;
  text-decoration-color: #00000073;
  text-decoration-thickness: 0.6px;
  text-underline-offset: 0.15em;
}

#sources ol li a:hover {
  text-decoration-color: #000;
  text-decoration-thickness: 2px;
}
</style>
