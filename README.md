<p align="center">
  <img src="public/retriever_logo.png" height=150>
</p>

## <div align="center"><b>Retriever</b> — the documentation embedding and retrieval API</div>

### Why?

We want to provide great documentation that removes friction from [running machine learning models in the cloud at Replicate](https://replicate.com/). That's why we created this API to allow [retrieval augmented generation (RAG)](https://replicate.com/blog/how-to-use-rag-with-chromadb-and-mistral-7b-instruct) applications to be easily built on top of our online documentation.

### What?

This API handles the retrieval part in RAG; we've pre-chunked our online documentation and made embeddings of them. You can then provide the API with a text string (e.g. a question) and retrieve relevant documentation chunks to be used as augmented information in a large language model (LLM), such as [llama](https://replicate.com/meta/llama-2-7b-chat).

### How?

We've build this API so that you can play with it on your own. It's running on Vercel Serverelss, with a Vercel PostgreSQL vector database.

## Usage

| Input parameter | Type   | Description                                                   |
| :-------------- | :----- | :------------------------------------------------------------ |
| text            | String | The input text to retrieve similar documents for.             |
| content_length  | Number | The character length of the documents (500 or 1000).          |
| limit           | Number | The maximum number of retrieved documents (min: 1, max: 100). |

cURL:

```shell
curl -X POST \
-d '{"text": "How does pricing work?", "content_length": 1000, "limit": 20}' \
-H 'Content-Type: application/json' \
https://replicate-retriever.vercel.app/api/retrieve
```

JavaScript

```js
const response = await fetch(
  'https://replicate-retriever.vercel.app/api/retrieve',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: 'How does pricing work?',
      content_length: 1000,
      limit: 20
    })
  }
)
const documents = await response.json()
```

The response is a list of documents in the following form:

```json
[
  { "title": "<title>", "url": "<url", "content": "<content>" },
  { "title": "<title>", "url": "<url", "content": "<content>" },
  ...
]
```

## Develop

### Vercel PostgreSQL

1. Deploy the project to Vercel.
2. Under "Storage", create a new PostgreSQL database.
3. Pull down credentials after you've linked the Vercel project locally: `vercel link` and `vercel env pull .env`.
