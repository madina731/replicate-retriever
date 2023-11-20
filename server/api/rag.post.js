import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
})

export default defineEventHandler(async (event) => {
  try {
    let { text, ws_id } = await readBody(event)

    console.log('--- log (rag): embedding input text: ', text)
    const response = await fetch(
      process.env.VERCEL_ENV === 'development'
        ? 'http://localhost:3000/api/retrieve'
        : 'https://replicate-retriever.vercel.app/api/retrieve',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          content_length: 1000,
          limit: 10
        })
      }
    )
    const documents = await response.json()
    console.log('--- log (rag): embedding input text... DONE!')

    console.log('--- log (rag): creating prediction')

    const prediction = await replicate.predictions.create({
      // meta/llama-2-70b-chat
      version:
        '02e509c789964a7ea8736978a43525956ef40397be9033abf9fd2badfe68c9e3',
      input: {
        system_prompt: ``,
        prompt: `[INST] You are a very enthusiastic Replicate representative who loves to help people! Given the following CONTEXT from the Replicate documentation, answer the QUESTION using only that information. If you are unsure, if the answer is not explicitly written in the documentation, a question does not make any sense, or is not factually coherent, explain why instead of answering something not correct. Do not answer with something that is not written in the documentation. [/INST]
[INST] CONTEXT: You can use Replicate to run machine learning models in the cloud from your own code, without having to set up any servers. Our community has published hundreds of open-source models that you can run, or you can run your own models.
QUESTION: What is Replicate? [/INST]
Replicate lets you run machine learning models with a cloud API, without having to understand the intricacies of machine learning or manage your own infrastructure. You can run open-source models that other people have published, or package and publish your own models. Those models can be public or private.
[INST] CONTEXT: ${documents.map((document) => document.content).join('\n')}
QUESTION: ${text} [/INST]`,
        temperature: 0.5,
        max_new_tokens: 2048
      },
      webhook: `https://r3swiuknhh.execute-api.eu-west-1.amazonaws.com/prod/webhook?key=${ws_id}`,
      webhook_events_filter: ['output', 'completed']
    })

    console.log('--- log (rag): creating prediction... DONE!')
    console.log('--- log (rag): prediction ID:', prediction.id)

    return documents
  } catch (e) {
    console.log('--- error (rag): ', e)

    throw createError({
      statusCode: 500,
      statusMessage: 'Something went wrong with the API request.'
    })
  }
})
