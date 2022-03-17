import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { SchemaColumnTypes } from '@d19n/models/dist/schema-manager/schema/column/types/schema.column.types';
import { SearchQueryType } from '@d19n/models/dist/search/search.query.type';
import { parseDateAndTimeLocal, parseDateToLocalFormat } from '../../../../../shared/utilities/dateHelpers';
import { updateStringItemInArray } from '../../../../../shared/utilities/reducerHelpers';
import { renderRecordGroups, TableHeaderColumn } from '../helpers/configureColumns';
import { TableRowData } from '../helpers/configureRows';
import { IQueryBuilderByModuleAndEntityReducer } from '../QueryBuilder/store/reducer';
import {
  DB_RECORD_CLEAR_SAVED_FILTER,
  DB_RECORD_SAVE_FILTER,
  DB_RECORD_TABLE_ADD_COLUMN,
  DB_RECORD_TABLE_BULK_SELECT_ROWS,
  DB_RECORD_TABLE_REMOVE_COLUMN,
  DB_RECORD_TABLE_SELECT_ROW,
  DB_RECORD_TABLE_SET_COLUMNS,
  DB_RECORD_TABLE_SET_CONFIG,
  DB_RECORD_TABLE_SET_DATA,
  RESET_DB_RECORD_TABLE,
  RESET_DB_RECORD_TABLE_FILTERS,
} from './constants'


export interface TableReducer {
  selectedItems: string[],
  filterableColumns: object,
  columns: TableHeaderColumn[],
  data: TableRowData[],
  listViews: {
    [key: string]: {
      search: SearchQueryType,
      columns: TableHeaderColumn[],
      queryBuilder: IQueryBuilderByModuleAndEntityReducer
    }
  },
}

export const initialState: TableReducer = {
  selectedItems: [],
  filterableColumns: {},
  columns: [],
  data: [],
  listViews: {},
};


function reducer(state = initialState, action: any) {
  switch (action.type) {

    case DB_RECORD_TABLE_SET_CONFIG: {
      return {
        ...state,
        ...action.params,
      }
    }

    case DB_RECORD_TABLE_SET_COLUMNS: {
      return {
        ...state,
        columns: action.columns,
      }
    }

    case DB_RECORD_TABLE_ADD_COLUMN: {
      return {
        ...state,
        columns: [
          ...state.columns,
          {
            sorter: true,
            sortDirections: [ 'asc', 'desc' ],
            title: action.params.title,
            dataIndex: action.params.dataIndex,
            columnType: action.params.columnType,
            position: state.columns.length,
            render: (text: string | undefined, row: { [x: string]: any, rowRecord: DbRecordEntityTransform }) => {
              const formattedDataIndex = `${action.params.dataIndex}_Fmt`;
              const formattedValue = row[formattedDataIndex];
              if (action.params.columnType === SchemaColumnTypes.DATE && !formattedValue) {
                return parseDateToLocalFormat(text) ?? text;
              } else if (action.params.columnType === SchemaColumnTypes.DATE_TIME && !formattedValue) {
                return parseDateAndTimeLocal(text) ?? text;
              }
              // ODN-2100 render record groups
              else if (action.params.dataIndex === 'groups') {
                return renderRecordGroups(row.rowRecord);
              } else {
                if (action.params.columnType === SchemaColumnTypes.LOOKUP) {
                  const link = row.rowRecord?.links?.find(l => l.id === text);
                  if (link) {
                    return `${link.recordNumber ? `${link.recordNumber} - ` : ''}${link.title || ''}`;
                  }
                }
                return formattedValue ?? text;
              }
            },
          },
        ].sort((a, b) => a.position - b.position),
      }
    }

    case DB_RECORD_TABLE_SELECT_ROW: {

      if(state.selectedItems.includes(action.rowKey)) {
        return {
          ...state,
          selectedItems: state.selectedItems.filter((key) => key !== action.rowKey),
        }
      } else {
        return {
          ...state,
          selectedItems: updateStringItemInArray(state.selectedItems, action.key, (items: any) => items),
        }
      }

    }

    case DB_RECORD_TABLE_BULK_SELECT_ROWS: {
      return {
        ...state,
        selectedItems: action.rowKeys,
      }
    }


    case DB_RECORD_TABLE_REMOVE_COLUMN: {
      return {
        ...state,
        columns: state.columns.filter((col: { [key: string]: any }) => col.dataIndex !== action.dataIndex),
      }
    }

    case DB_RECORD_TABLE_SET_DATA: {
      return {
        ...state,
        data: action.data,
      }
    }

    case DB_RECORD_SAVE_FILTER: {
      return {
        ...state,
        listViews: Object.assign({}, state.listViews, {
          [action.name]: action.params,
        }),
      }
    }

    case DB_RECORD_CLEAR_SAVED_FILTER: {
     
      const newFilters = state.listViews;
      delete newFilters[action.params.name];

      return {
        ...state,
        listViews: newFilters,
      }
    }

    case RESET_DB_RECORD_TABLE_FILTERS: {
      return {
        ...initialState,
      }
    }

    case RESET_DB_RECORD_TABLE: {
      return {
        ...state,
        selectedItems: [],
        columns: [],
        data: [],
      }
    }

    default:
      return state;
  }
}

export default reducer;
