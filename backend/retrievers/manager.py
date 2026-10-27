from backend.retrievers.retriever_arxiv import search_papers as arxiv_search
from backend.retrievers.retriever_semantic import search_papers as semantic_search
from backend.retrievers.retriever_pubmed import search_papers as pubmed_search
from backend.retrievers.retriever_openalex import search_papers as openalex_search
from backend.retrievers.retriever_crossref import search_papers as crossref_search
from backend.retrievers.retriever_web import domain_web_retrieve
from backend.retrievers.deduplicator import deduplicate_papers
from backend.utils.logger import log
from concurrent.futures import ThreadPoolExecutor,as_completed
from backend.schemas.stats import RetrievalStats
import time


ALL_SOURCES = {
    "arxiv": arxiv_search,
    "semantic_scholar": semantic_search,
    "pubmed": pubmed_search,
    "openalex": openalex_search,
    "crossref": crossref_search,
    "web":domain_web_retrieve
}


def retrieve_source(source_name,retriever,query,max_results):
    try:
        start=time.time()
        results = retriever(
            query=query,
            max_results=max_results
        )
        duration=round(time.time()-start,2)
        return (
            source_name,
            results,
            None,
            duration
        )
    except Exception as e:
        return (source_name,[],str(e),0.0)


def retrieve_all(query: str,max_results: int,sources: list[str] | None = None) -> tuple[list, dict, RetrievalStats]:
    """
    Returns:
        papers        - flat list of Paper objects
        source_report - { source_name: { count, status, error } }
        stats         - count (total papers, unique papers, successful sources...)
    """

    active = sources if sources else list(ALL_SOURCES.keys())
    unknown = [s for s in active if s not in ALL_SOURCES]

    if unknown:
        raise ValueError(f"Unknown sources: {unknown}. Valid: {list(ALL_SOURCES.keys())}")

    papers = []     
    report = {}

    # Run all retrievers simultaneously instead of sequentially.
    with ThreadPoolExecutor(max_workers=len(active)) as executor: 

        futures={
            executor.submit(retrieve_source,name,ALL_SOURCES[name],query,max_results):
            name for name in active
        }

        for future in as_completed(futures):
            source_name=(futures[future])
            name,results,error,duration=(
                future.result()
            )

            papers.extend(results)

            if error:
                report[name]={
                    "count":0,
                    "status":"error",
                    "retrieval_type":"web" if name=="web" else "api",
                    "duration": duration,
                    "error":error
                }
                log(f"[{name}] failed: {error}")

            else:
                report[name]={
                    "count":len(results),
                    "status":"ok",
                    "retrieval_type":"web" if name=="web" else "api",
                    "duration":duration,
                    "error":None
                }
                log(f"[{name}] -> {len(results)} papers")

    successful_sources = sum(1 for source in report.values() if source["status"]=="ok")
    failed_sources = sum(1 for source in report.values() if source["status"]=="error")

    raw_count = len(papers) # total papers before removing same papers
    papers = deduplicate_papers(papers)
    unique_count = len(papers) # total papers after removing same papers
    duplicates_removed = (raw_count - unique_count)

    stats = RetrievalStats(
        total_papers=raw_count,
        unique_papers=unique_count,
        duplicate_papers_removed=duplicates_removed,
        successful_sources=successful_sources,
        failed_sources=failed_sources
    )
    return papers, report, stats