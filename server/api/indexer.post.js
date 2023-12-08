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
  'https://replicate.com/docs/deployments',
  'https://replicate.com/docs/fine-tuning',
  'https://replicate.com/docs/guides/fine-tune-a-language-model',
  'https://replicate.com/docs/guides/fine-tune-an-image-model',
  'https://replicate.com/docs/guides/get-a-gpu-machine',
  'https://replicate.com/docs/guides/push-stable-diffusion',
  'https://raw.githubusercontent.com/replicate/setup-cog/main/README.md',
  'https://replicate.com/docs/how-does-replicate-work',
  'https://replicate.com/docs/billing',
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
  'https://replicate.com/blog/animatediff-interpolator',
  'https://replicate.com/blog/run-mistral-7b-with-api',
  'https://replicate.com/blog/llama-2-grammars',
  'https://replicate.com/blog/fine-tune-musicgen',
  'https://replicate.com/blog/how-to-use-rag-with-chromadb-and-mistral-7b-instruct',
  'https://replicate.com/blog/run-latent-consistency-model-on-mac',
  'https://replicate.com/blog/generate-music-from-chord-progressions-musicgen-chord',
  'https://replicate.com/blog/run-bge-embedding-models',
  'https://replicate.com/blog/replicate-scaffold',
  'https://replicate.com/blog/run-yi-chat-with-api',
  'https://replicate.com/blog/series-b',
  'https://replicate.com/blog/how-to-create-an-ai-narrator',
  'https://replicate.com/blog/how-to-tune-a-realistic-voice-clone',
  'https://replicate.com/changelog'
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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
  console.log(`--- log (indexer): preparing database:`)

  console.log(`--- log (indexer): ensure pgvector is enabled`)
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`

  console.log(`--- log (indexer): create new table 'embeddings_new'`)
  await sql`DROP TABLE IF EXISTS embeddings_new;`
  await sql`
    CREATE TABLE embeddings_new (
      id bigserial primary key,
      title text,
      url text,
      content text,
      content_length integer,
      tokens integer,
      embedding vector(1024)
    );`

  console.log(`--- log (indexer): preparing database... DONE!`)
}

// Scrape a list of URLs into chunks of 'content_length'.
// Use Promise.all() to parallelize the fetching.
const scrapeURLs = async (urls = URLS, content_length = 1000) => {
  console.log(`--- log (indexer): ${urls.length} URLs to scrape:`)

  const chunks = []

  // Parallelize each URL fetch
  await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url)
      const html = await response.text()
      const $ = cheerio.load(html)
      const title = $('title').text()
      const text = jsonToAscii($('body').text())

      const chunks_url = []
      let start = 0
      while (start < text.length) {
        const end = start + content_length
        const content = text.slice(start, end)
        chunks_url.push({ title, url, content, content_length })
        start = end
      }

      chunks.push(...chunks_url)

      console.log(
        `--- log (indexer): ${url}, ${chunks_url.length} chunks (content length: ${content_length})`
      )
    })
  )

  console.log(`--- log (indexer): URLs to scrape... DONE!`)

  return chunks
}

// Create embeddings using Replicate and mend back output to the original array.
const createEmbeddings = async (chunks = []) => {
  console.log(`--- log (indexer): ${chunks.length} chunks to embed`)

  // Replacing content newlines with spaces for better results
  const texts = chunks.map((chunk) => chunk.content.replace(/\n/g, ' '))

  // Create bucket of chunks so that prediction input doesn't get too large

  const bucket_size = 500
  const buckets = []
  while (texts.length > 0) {
    buckets.push(texts.splice(0, bucket_size))
  }

  console.log(
    `--- log (indexer): created ${buckets.length} prediction buckets of chunks`
  )

  const outputs = []

  for (const bucket of buckets) {
    console.log(`--- log (indexer): create prediction of bucket`)
    const input = {
      texts: JSON.stringify(bucket),
      batch_size: 32,
      convert_to_numpy: false,
      normalize_embeddings: false
    }
    let output

    if (process.env.USE_REPLICATE_DEPLOYMENTS) {
      console.log(`--- log (indexer): using deployment`)
      let prediction = await replicate.deployments.predictions.create(
        'replicate',
        'retriever-embeddings',
        { input }
      )
      prediction = await replicate.wait(prediction)
      output = prediction.output
    } else {
      output = await replicate.run(
        'nateraw/bge-large-en-v1.5:9cf9f015a9cb9c61d1a2610659cdac4a4ca222f2d3707a68517b18c198a9add1',
        { input }
      )
    }

    outputs.push(...output)
  }

  // Mend back prediction output
  for (const [i, value] of outputs.entries()) {
    chunks[i].embedding = value
  }

  console.log(`--- log (indexer): create prediction... DONE!`)

  return chunks
}

const insertDatabase = async (chunks = []) => {
  console.log(
    `--- log (indexer): inserting ${chunks.length} chunks to the database:`
  )

  // Below will timeout, may need chunking of insert ops
  /*
  await Promise.all(
    chunks.map(
      async (chunk) =>
        sql`INSERT INTO embeddings_new (title, url, content, content_length, embedding) VALUES (${
          chunk.title
        }, ${chunk.url}, ${chunk.content}, ${
          chunk.content_length
        }, ${JSON.stringify(chunk.embedding)});`
    )
  )
  */

  // Very innefficient but doesn't time-out the DB
  let i = 0
  for (const chunk of chunks) {
    await sql`INSERT INTO embeddings_new (title, url, content, content_length, embedding) VALUES (${
      chunk.title
    }, ${chunk.url}, ${chunk.content}, ${
      chunk.content_length
    }, ${JSON.stringify(chunk.embedding)});`
    console.log(`--- log (indexer): inserted chunk #${i}`)
    i++
  }

  console.log(`--- log (indexer): inserting chunks to database... DONE!`)
}

// Create index for faster search.
const createIndex = async () => {
  // Calculate the index parameters according to best practices
  let num_lists = chunks.length / 1000
  if (num_lists < 10) num_lists = 10
  if (chunks.length > 1000000) num_lists = Math.sqrt(chunks.length)

  console.log(`--- log (indexer): creating index, num_lists = ${num_lists}`)

  await sql`CREATE INDEX ON embeddings_new USING ivfflat (embedding vector_cosine_ops) WITH (lists = ${num_lists});`

  console.log(`--- log (indexer): creating index... DONE!`)
}

// Deploy such as:
//   - Switching out the previous table with the new for minimum downtime
//   - Drop the old table
const deployDatabase = async () => {
  console.log(`--- log (indexer): deploying database:`)

  console.log(
    `--- log (indexer): rename table 'embeddings' to 'embeddings_old'`
  )
  await sql`ALTER TABLE IF EXISTS embeddings RENAME TO embeddings_old;`

  console.log(
    `--- log (indexer): rename table 'embeddings_new' to 'embeddings'`
  )
  await sql`ALTER TABLE IF EXISTS embeddings_new RENAME TO embeddings;`

  console.log(`--- log (indexer): drop table 'embeddings_old'`)
  await sql`DROP TABLE IF EXISTS embeddings_old;`

  console.log(`--- log (indexer): deploying database... DONE!`)
}

export default defineEventHandler(async (event) => {
  try {
    await prepareDatabase()

    // Create two sets of content lengths (1000, and 500)
    const [chunks_1000, chunks_500] = await Promise.all([
      scrapeURLs(URLS, 1000),
      scrapeURLs(URLS, 500)
    ])
    const chunks = [...chunks_1000, ...chunks_500]

    await createEmbeddings(chunks)
    await insertDatabase(chunks)
    await deployDatabase()

    return
  } catch (e) {
    console.log('--- error (indexer): ', e)

    throw createError({
      statusCode: 500,
      statusMessage: 'Something went wrong with the API request.'
    })
  }
})
