export default defineEventHandler(async (event) => {
  try {
    // const query = getQuery(event)
    const body = await readBody(event)
    return { foo: 'bar' }
  } catch (e) {
    console.log('--- error: ', e)

    throw createError({
      statusCode: 500,
      statusMessage: 'Something went wrong with the API request.'
    })
  }
})
