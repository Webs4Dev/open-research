import os
from openai import OpenAI
from dotenv import load_dotenv

from backend.utils.hash import generate_paper_id
load_dotenv()

from backend.utils.logger import log
from backend.rag.collection import chunk_collection

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
client_openai = OpenAI(api_key=OPENAI_API_KEY)

def get_embedding(text):
    response = client_openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )

    return response.data[0].embedding

# Papers are keyed by paper_id (hash of the PDF bytes), so two different files
# with the same name never mix; paper_title is kept only for display.
def is_paper_ingested(paper_id: str) -> bool:
    existing = chunk_collection.get(
        where={"paper_id": paper_id},
        limit=1
    )
    return len(existing["ids"]) > 0

def count_chunks_for_paper(paper_id: str) -> int:
    existing = chunk_collection.get(where={"paper_id": paper_id})
    return len(existing["ids"])

# One embeddings request per batch instead of one per chunk (81 chunks took 44s one-by-one).
EMBED_BATCH_SIZE = 100

def get_embeddings(texts):
    response = client_openai.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )

    # Sort by index so embeddings line up with the input texts.
    return [item.embedding for item in sorted(response.data, key=lambda item: item.index)]

def store_chunks(chunks,paper_id,paper_title):

    # Embed everything before writing anything: if an OpenAI call fails midway, nothing is
    # stored, so is_paper_ingested stays False and a re-upload retries instead of being skipped.
    embeddings=[]
    for start in range(0,len(chunks),EMBED_BATCH_SIZE):
        batch = chunks[start:start+EMBED_BATCH_SIZE]
        embeddings.extend(get_embeddings([chunk.text for chunk in batch]))

    # upsert, not add: two concurrent uploads of the same file write the same ids harmlessly.
    chunk_collection.upsert(
        ids=[generate_paper_id(f"{paper_id}_{chunk.chunk_id}") for chunk in chunks],
        documents=[chunk.text for chunk in chunks],
        embeddings=embeddings,
        metadatas=[
            {
                "paper_id":paper_id,
                "paper_title":paper_title,
                "page_no":chunk.page_no,
                "chunk_id":chunk.chunk_id
            }
            for chunk in chunks
        ]
    )
    log(f"Stored {len(chunks)} chunks")


def search_chunks(query,k=5,paper_id=None):

    query_embedding = get_embedding(query)
    if not paper_id:
        results = chunk_collection.query(
            query_embeddings=[query_embedding],
            n_results=k
        )
    else:
        results = chunk_collection.query(
            query_embeddings=[query_embedding],
            n_results=k,
            where={
                "paper_id":paper_id
            }
        )
    
    log(f"Retrieved {len(results["ids"][0])} chunks")

    results_list=[]

    for i in range(len(results["ids"][0])):
        distance = results["distances"][0][i]
        relevance_score = round(1/(1+distance),3)*100

        metadata = results["metadatas"][0][i]
        results_list.append(
            {
                "paper_title":metadata["paper_title"],
                "url":metadata.get("url"),
                "year":metadata.get("year"),
                "page_no":metadata.get("page_no"),
                "chunk_id":metadata.get("chunk_id"),
                "text":results["documents"][0][i],
                "relevance_score":relevance_score
            }
        )
   
    return results_list


def retrieve_context(query,k=5):
    return search_chunks(query=query,k=k)


