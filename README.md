<p align="center">
  <img src="assets/retriever_logo.png" height=150>
</p>

## <div align="center"><b>Retriever</b> — the documentation embedding and retrieval API</div>

### Why?

We want to provide great documentation that removes friction from [running machine learning models in the cloud at Replicate](https://replicate.com/). That's why we created this API to allow [retrieval augmented generation (RAG)](https://replicate.com/blog/how-to-use-rag-with-chromadb-and-mistral-7b-instruct) applications to be easily built on top of our online documentation.

### What?

This API handles the retrieval part in RAG; we've pre-chunked our online documentation and made embeddings of them. You can then provide the API with a text string (e.g. a question) and retrieve relevant documentation chunks to be used as augmented information in a large language model (LLM), such as [llama](https://replicate.com/meta/llama-2-7b-chat).

### How?

We've build this API so that you can play with it on your own. It's running on Vercel Serverelss, with a Vercel PostgreSQL vector database.

### Vercel PostgreSQL

1. Deploy the project to Vercel.
2. Under "Storage", create a new PostgreSQL database.
3. Pull down credentials after you've linked the Vercel project locally: `vercel link` and `vercel env pull .env`.
