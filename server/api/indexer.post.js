import { sql } from '@vercel/postgres'
import Replicate from 'replicate'
import * as cheerio from 'cheerio'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
})

const URLS = [
  'https://replicate.com/docs/get-started/nodejs',
  'https://replicate.com/docs/get-started/python',
  'https://replicate.com/docs/get-started/nextjs'
]

// Prepare such as:
//  - enable pgvector extension
//  - drop any old 'embeddings_new' table
//  - create a new 'embeddings_new' table
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
      embedding vector(1536)
    );`

  console.log(`---indexer: preparing database... DONE!`)
}

// Postpare such as:
const postpareDatabase = async () => {
  console.log(`---indexer: postparing database:`)

  console.log(`---indexer: rename table 'embeddings' to 'embeddings_old'`)
  await sql`ALTER TABLE IF EXISTS embeddings RENAME TO embeddings_old;`

  console.log(`---indexer: rename table 'embeddings_new' to 'embeddings'`)
  await sql`ALTER TABLE IF EXISTS embeddings_new RENAME TO embeddings;`

  console.log(`---indexer: drop table 'embeddings_old'`)
  await sql`DROP TABLE IF EXISTS embeddings_old;`

  console.log(`---indexer: postparing database... DONE!`)
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
      const text = $('body').text()

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
        normalize_embeddings: true
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

export default defineEventHandler(async (event) => {
  try {
    await prepareDatabase()

    const chunks = await scrapeURLs()
    await createEmbeddings(chunks)

    // Todo: insert into DB

    await postpareDatabase()

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
