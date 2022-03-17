/**
 * Result holding object.
 * This is returned back to the requestor.
 */
import { SearchPageType } from "./search.page.type";
import { SearchQueryTypeHttp } from "./search.query.type.http";

export class SearchResponseType<T> {

  /**
   * Response status code
   */
  public statusCode: number | null;

  /**
   * Response message
   */
  public message: string | null;

  /**
   * Response data
   */
  public data: T[];

  /**
   * Pagination object.
   */
  public pageable: SearchPageType;

  /**
   * Scroll id to scroll thru all records.
   */
  public scrollId?: string;

  /**
   * Term(s) highlighted by elasticsearch.
   */
  public highlights: string[];

  /**
   * Search terms string.
   */
  public search: SearchQueryTypeHttp;

  /**
   * Constructor.
   *
   * @param search
   * @param total total number of results outside of this page.
   * @param {{content: Array<T>}} values values.
   * @param highlights Term(s) highlighted by elasticsearch.
   * @param message
   * @param statusCode
   * @param scrollId _scroll_id param for search results scrolling 
   */
  public constructor(
    search: SearchQueryTypeHttp,
    total: number,
    values: { data: T[] },
    highlights: string[],
    message?: string,
    statusCode?: number,
    scrollId?: string,
  ) {

    const page = search.pageable.page;
    let from = search.pageable.from;
    const size = search.pageable.size;
    const totalRecords = total;
    const currentRecords = values.data.length;

    const totalPages = Math.floor(totalRecords / Number(size)) + 1;

    if (!from || isNaN(from)) {
      if (page && !isNaN(page) && size && !isNaN(size)) {
        from = Number(page) * Number(size);
      } else {
        from = 0;
      }
    }
    const hasMore = (Number(from) + Number(currentRecords)) < totalRecords;

    const isFirstPage = Number(page) === 0;
    const isLastPage = (Number(page) + 1) === totalPages;


    this.search = search;
    this.pageable = new SearchPageType(totalRecords, currentRecords, hasMore, isFirstPage, isLastPage, totalPages);
    this.highlights = highlights;
    this.message = message || '';
    this.statusCode = statusCode || 200;
    this.data = values.data;
    this.scrollId = scrollId;

  }

}
