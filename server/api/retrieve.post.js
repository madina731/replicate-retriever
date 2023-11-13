import { sql } from '@vercel/postgres'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
})

// Create embedding using Replicate.
const createEmbedding = async (text = '') => {
  console.log(`---retrieve: embedding text with length ${text.length}`)

  // Replacing content newlines with spaces for better results
  text = text.replace(/\n/g, ' ')

  console.log(`---retrieve: created prediction`)
  const output = await replicate.run(
    'nateraw/bge-large-en-v1.5:9cf9f015a9cb9c61d1a2610659cdac4a4ca222f2d3707a68517b18c198a9add1',
    {
      input: {
        texts: JSON.stringify([text]),
        batch_size: 1,
        convert_to_numpy: false,
        normalize_embeddings: false
      }
    }
  )

  console.log(`---retrieve: prediction... DONE!`)

  return output[0]
}

const getChunks = async (vector, limit = 10) => {
  console.log(`---retrieve: get ${limit} closest chunks`)
  const { rows } =
    await sql`SELECT content FROM embeddings ORDER BY embedding <=> ${JSON.stringify(
      vector
    )} LIMIT ${limit};`

  console.log(`---retrieve: got ${rows.length} closest chunks... DONE!`)

  return rows.map((row) => row.content)
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    let { text, limit } = JSON.parse(body)

    // Limit input params
    text = String(text)
    if (limit < 1) limit = 1
    if (limit > 50) limit = 50

    const vector = await createEmbedding(text)
    const documents = await getChunks(vector)

    return { documents, limit }
  } catch (e) {
    console.log('--- error: ', e)

    throw createError({
      statusCode: 500,
      statusMessage: 'Something went wrong with the API request.'
    })
  }
})
