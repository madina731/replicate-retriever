import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
})

export default defineEventHandler(async (event) => {
  try {
    let { text } = await readBody(event)

    console.log('---rag: embedding input text: ', text)
    const response = await fetch(
      'https://replicate-retriever.vercel.app/api/retrieve',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          limit: 15
        })
      }
    )
    const documents = await response.json()
    console.log('---rag: embedding input text... DONE!')

    console.log('---rag: creating prediction')
    const output = await replicate.run(
      'mistralai/mistral-7b-instruct-v0.1:83b6a56e7c828e667f21fd596c338fd4f0039b46bcfa18d973e8e70e455fda70',
      {
        input: {
          prompt: `[INST]
You are a very enthusiastic Replicate representative who loves to help people! Your goal is to answer the question that will help the user use Replicate. You will be given a USER_PROMPT, and a series of DOCUMENTATION_PAGES. You will respond with an answer.

If you are unsure and the answer is not explicitly written in the documentation, say "Sorry, I don\'t know how to help with that.". Do not answer with something that is not written in the documentation.

USER_PROMPT: ${text}

DOCUMENTATION_PAGES: ${documents.join('\n')}

ANSWER:

[/INST]`,
          temperature: 0.75,
          max_new_tokens: 2048
        }
      }
    )
    console.log('---rag: creating prediction... DONE!')

    return output
  } catch (e) {
    console.log('--- error: ', e)

    throw createError({
      statusCode: 500,
      statusMessage: 'Something went wrong with the API request.'
    })
  }
})
