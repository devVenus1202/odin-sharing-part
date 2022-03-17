import { GET_DB_RECORD_AUDIT_LOGS_REQUEST } from "./constants";
import { SchemaEntity } from "@d19n/models/dist/schema-manager/schema/schema.entity";
import { SearchQueryType } from "@d19n/models/dist/search/search.query.type";
import { FieldData, getQueryBlock } from "../../components/DynamicTable/QueryBuilder/store/reducer";

export interface IGetRecordAuditLogs {
  schema: SchemaEntity;
  recordId: string;
  filterFields?: FieldData[],
  searchQuery?: SearchQueryType;
}

export function getRecordAuditLogs(params: IGetRecordAuditLogs, cb = () => {}) {
  if (!params?.searchQuery && params.filterFields) {
    const searchQuery: any = {
      boolean: {
        must: [...params.filterFields.map(ff => getQueryBlock(ff))]
      }
    };
    params.searchQuery = searchQuery;
  }
  return {
    type: GET_DB_RECORD_AUDIT_LOGS_REQUEST,
    params,
    cb
  }
}

