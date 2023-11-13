import { sql } from '@vercel/postgres'
import Replicate from 'replicate'
import * as cheerio from 'cheerio'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
})

const URLS = [
  'https://replicate.com/home',
  'https://replicate.com/docs',
  'https://replicate.com/docs/get-started/nodejs',
  'https://replicate.com/docs/get-started/python',
  'https://replicate.com/docs/get-started/nextjs',
  'https://replicate.com/docs/get-started/swiftui',
  'https://replicate.com/docs/get-started/discord-bot',
  'https://hexdocs.pm/replicate/readme.html',
  'https://replicate.com/docs/guides/push-a-model',
  'https://replicate.com/docs/how-does-replicate-work#private-models',
  'https://replicate.com/docs/guides/fine-tune-a-language-model',
  'https://replicate.com/docs/guides/fine-tune-an-image-model',
  'https://replicate.com/docs/guides/get-a-gpu-machine',
  'https://replicate.com/docs/guides/push-stable-diffusion',
  'https://raw.githubusercontent.com/replicate/setup-cog/main/README.md',
  'https://replicate.com/docs/how-does-replicate-work',
  'https://replicate.com/showcase',
  'https://replicate.com/docs/webhooks',
  'https://replicate.com/docs/streaming',
  'https://replicate.com/docs/reference/client-libraries',
  'https://replicate.com/docs/reference/http',
  'https://replicate.com/about',
  'https://replicate.com/pricing',
  'https://replicate.com/blog/hello-world',
  'https://replicate.com/blog/constraining-clipdraw',
  'https://replicate.com/blog/model-docs',
  'https://replicate.com/blog/exploring-text-to-image-models',
  'https://replicate.com/blog/daily-news',
  'https://replicate.com/blog/grab-hundreds-of-images-with-clip-and-laion',
  'https://replicate.com/blog/uncanny-spaces',
  'https://replicate.com/blog/build-a-robot-artist-for-your-discord-server-with-stable-diffusion',
  'https://replicate.com/blog/run-stable-diffusion-with-an-api',
  'https://replicate.com/blog/run-stable-diffusion-on-m1-mac',
  'https://replicate.com/blog/dreambooth-api',
  'https://replicate.com/blog/lora-faster-fine-tuning-of-stable-diffusion',
  'https://replicate.com/blog/machine-learning-needs-better-tools',
  'https://replicate.com/blog/replicate-alpaca',
  'https://replicate.com/blog/fine-tune-llama-to-speak-like-homer-simpson',
  'https://replicate.com/blog/llama-roundup',
  'https://replicate.com/blog/fine-tune-alpaca-with-lora',
  'https://replicate.com/blog/language-models',
  'https://replicate.com/blog/autocog',
  'https://replicate.com/blog/language-model-roundup',
  'https://replicate.com/blog/new-status-page',
  'https://replicate.com/blog/turn-your-llm-into-a-poet',
  'https://replicate.com/blog/llama-2-roundup',
  'https://replicate.com/blog/fine-tune-llama-2',
  'https://replicate.com/blog/run-llama-locally',
  'https://replicate.com/blog/run-sdxl-with-an-api',
  'https://replicate.com/blog/run-llama-2-with-an-api',
  'https://replicate.com/blog/all-the-llamas',
  'https://replicate.com/blog/fine-tune-sdxl',
  'https://replicate.com/blog/streaming',
  'https://replicate.com/blog/how-to-prompt-llama',
  'https://replicate.com/blog/cutting-prices-in-half',
  'https://replicate.com/blog/painting-with-words-a-history-of-text-to-image-ai',
  'https://replicate.com/blog/fine-tune-cold-boots',
  'https://replicate.com/changelog'
]

const jsonToAscii = (jsonText) => {
  var s = ''

  for (var i = 0; i < jsonText.length; ++i) {
    var c = jsonText[i]
    if (c >= '\x7F') {
      c = c.charCodeAt(0).toString(16)
      switch (c.length) {
        case 2:
          c = '\\u00' + c
          break
        case 3:
          c = '\\u0' + c
          break
        default:
          c = '\\u' + c
          break
      }
    }
    s += c
  }
  return s
}

// Prepare such as:
//   - enable pgvector extension
//   - drop any old 'embeddings_new' table
//   - create a new 'embeddings_new' table
const prepareDatabase = async () => {
  console.log(`---indexer: preparing database:`)

  console.log(`---indexer: ensure pgvector is enabled`)
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`

  console.log(`---indexer: create new table 'embeddings_new'`)
  await sql`DROP TABLE IF EXISTS embeddings_new;`
  await sql`
    CREATE TABLE embeddings_new (
      id bigserial primary key,
      title text,
      url text,
      content text,
      tokens integer,
      embedding vector(1024)
    );`

  console.log(`---indexer: preparing database... DONE!`)
}

// Scrape a list of URLs into chunks of 'chunk_length'.
// Use Promise.all() to parallelize the fetching.
const scrapeURLs = async (urls = URLS, chunk_length = 1000) => {
  console.log(`---indexer: ${urls.length} URLs to scrape:`)

  const chunks = []

  // Parallelize each URL fetch
  await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url)
      const html = await response.text()
      const $ = cheerio.load(html)
      const text = jsonToAscii($('body').text())

      const chunks_url = []
      let start = 0
      while (start < text.length) {
        const end = start + chunk_length
        const content = text.slice(start, end)
        chunks_url.push({ url, content })
        start = end
      }

      chunks.push(...chunks_url)

      console.log(`---indexer: ${url}, ${chunks_url.length} chunks`)
    })
  )

  console.log(`---indexer: URLs to scrape... DONE!`)

  return chunks
}

// Create embeddings using Replicate and mend back output to the original array.
const createEmbeddings = async (chunks = []) => {
  console.log(`---indexer: ${chunks.length} chunks to embed:`)

  // Replacing content newlines with spaces for better results
  const texts = chunks.map((chunk) => chunk.content.replace(/\n/g, ' '))

  console.log(`---indexer: created prediction`)
  const output = await replicate.run(
    'nateraw/bge-large-en-v1.5:9cf9f015a9cb9c61d1a2610659cdac4a4ca222f2d3707a68517b18c198a9add1',
    {
      input: {
        texts: JSON.stringify(texts),
        batch_size: 32,
        convert_to_numpy: false,
        normalize_embeddings: false
      }
    }
  )

  // Mend back prediction output
  for (const [i, value] of output.entries()) {
    chunks[i].embedding = value
  }

  console.log(`---indexer: prediction... DONE!`)

  return chunks
}

const insertDatabase = async (chunks = []) => {
  console.log(`---indexer: inserting ${chunks.length} chunks to the database:`)

  await Promise.all(
    chunks.map(
      async (chunk) =>
        sql`INSERT INTO embeddings_new (url, content, embedding) VALUES (${
          chunk.url
        }, ${chunk.content}, ${JSON.stringify(chunk.embedding)});`
    )
  )

  console.log(`---indexer: inserting chunks to database... DONE!`)
}

// Create index for faster search.
const createIndex = async () => {
  // Calculate the index parameters according to best practices
  let num_lists = chunks.length / 1000
  if (num_lists < 10) num_lists = 10
  if (chunks.length > 1000000) num_lists = Math.sqrt(chunks.length)

  console.log(`---indexer: creating index, num_lists = ${num_lists}`)

  await sql`CREATE INDEX ON embeddings_new USING ivfflat (embedding vector_cosine_ops) WITH (lists = ${num_lists});`

  console.log(`---indexer: creating index... DONE!`)
}

// Deploy such as:
//   - Switching out the previous table with the new for minimum downtime
//   - Drop the old table
const deployDatabase = async () => {
  console.log(`---indexer: deploying database:`)

  console.log(`---indexer: rename table 'embeddings' to 'embeddings_old'`)
  await sql`ALTER TABLE IF EXISTS embeddings RENAME TO embeddings_old;`

  console.log(`---indexer: rename table 'embeddings_new' to 'embeddings'`)
  await sql`ALTER TABLE IF EXISTS embeddings_new RENAME TO embeddings;`

  console.log(`---indexer: drop table 'embeddings_old'`)
  await sql`DROP TABLE IF EXISTS embeddings_old;`

  console.log(`---indexer: deploying database... DONE!`)
}

export default defineEventHandler(async (event) => {
  try {
    await prepareDatabase()

    const chunks = await scrapeURLs()
    await createEmbeddings(chunks)
    await insertDatabase(chunks)
    await deployDatabase()

    const output = JSON.stringify(chunks)
    return { foo: output }
  } catch (e) {
    console.log('--- error: ', e)

    throw createError({
      statusCode: 500,
      statusMessage: 'Something went wrong with the API request.'
    })
  }
})
