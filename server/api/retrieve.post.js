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

  console.log(`---retrieve: create prediction`)
  const input = {
    texts: JSON.stringify([text]),
    batch_size: 1,
    convert_to_numpy: false,
    normalize_embeddings: false
  }
  let output

  if (process.env.USE_REPLICATE_DEPLOYMENTS) {
    console.log(`---retrieve: using deployment`)
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

  console.log(`---retrieve: create prediction... DONE!`)

  return output[0]
}

const getDocuments = async (vector, content_length = 1000, limit = 20) => {
  console.log(
    `---retrieve: get ${limit} closest documents with content length ${content_length}`
  )
  const { rows } =
    await sql`SELECT content FROM embeddings WHERE content_length = ${content_length} ORDER BY embedding <=> ${JSON.stringify(
      vector
    )} LIMIT ${limit};`

  console.log(`---retrieve: got ${rows.length} closest documents... DONE!`)

  return rows.map((row) => row.content)
}

export default defineEventHandler(async (event) => {
  try {
    let { text, content_length, limit } = await readBody(event)

    // Limit input params
    text = String(text)
    content_length = content_length === 500 ? 500 : 1000
    if (limit < 1) limit = 1
    if (limit > 100) limit = 100

    const vector = await createEmbedding(text)
    const documents = await getDocuments(vector, content_length, limit)

    return documents
  } catch (e) {
    console.log('--- error: ', e)

    throw createError({
      statusCode: 500,
      statusMessage: 'Something went wrong with the API request.'
    })
  }
})
