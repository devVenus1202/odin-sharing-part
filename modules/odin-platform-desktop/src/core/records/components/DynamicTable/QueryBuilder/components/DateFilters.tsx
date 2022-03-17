import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SearchQueryType } from '@d19n/models/dist/search/search.query.type';
import { Col, Select } from 'antd';
import dayjs, { Dayjs } from 'dayjs'
import React from 'react';
import { connect } from 'react-redux';
import DayjsDatePicker from '../../../../../../shared/components/DayjsDatePicker/DayjsDatePicker'
import { getSchemaFromShortListByModuleAndEntity } from '../../../../../../shared/utilities/schemaHelpers';
import { generateModuleAndEntityKeyFromProps } from '../../../../../../shared/utilities/searchHelpers';
import { SchemaReducerState } from '../../../../../schemas/store/reducer';
import { searchRecordsRequest } from '../../../../store/actions';
import { IDateRangeQuery, setDateRangeQuery, setSearchQuery } from '../store/actions';
import { getQueryBuilderReducer, IQueryBuilderByModuleAndEntityReducer } from '../store/reducer';
import '../styles.scss';

const { Option } = Select;
const { RangePicker } = DayjsDatePicker;

const dateFormat = 'YYYY-MM-DD';

interface Props {
  moduleName: string | undefined,
  entityName: string | undefined,
  recordReducer: any,
  recordTableReducer: any,
  schemaReducer: SchemaReducerState,
  queryBuilderReducer: any,
  setQuery: (query: any) => {},
  configure: (params: any) => {},
  searchRecords: any
}

interface State {
  property: string | undefined;
}


class DateFilters extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      property: undefined,
    }
  }

  componentDidMount() {
    this.initialize();
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
    const { moduleName, entityName } = this.props;
    const prevQbr = getQueryBuilderReducer(prevProps.queryBuilderReducer, moduleName, entityName);
    const currentQbr: any = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);
    if(prevQbr?.dateRangeFilters !== currentQbr?.dateRangeFilters) {
      this.checkAndUpdateRange();
    }

    if(prevQbr?.dateRangeFilters?.property !== currentQbr?.dateRangeFilters?.property) {
      this.setState({
        property: currentQbr?.dateRangeFilters?.property,
      });
    }

    if (prevState.property != this.state.property) {
      this.handleDatePropertyChanged();
    }
  }

  initialize() {
    const { moduleName, entityName } = this.props;
    const queryBuilderReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    this.setState({
      property: queryBuilderReducer?.dateRangeFilters?.property,
    });

    this.checkAndUpdateRange();
  }

  private checkAndUpdateRange() {
    const { moduleName, entityName, setQuery } = this.props;
    const queryBuilderReducer: IQueryBuilderByModuleAndEntityReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    // ODN-1741 get stored absolute range dates
    let gte = queryBuilderReducer?.dateRangeFilters?.gte;
    let lte = queryBuilderReducer?.dateRangeFilters?.lte;

    // get range dates by range key
    const rangeDates = this.getRangeDatesByKey(queryBuilderReducer);

    if (rangeDates) {
      // if stored dates are not equal to calculated from range, then update stored dates
      const storedGteDate = dayjs(gte, dateFormat);
      const storedLteDate = dayjs(lte, dateFormat);
      const calculatedGteDate = dayjs(rangeDates.gte, dateFormat);
      const calculatedLteDate = dayjs(rangeDates.lte, dateFormat);

      let isNeedToSetCalculatedDates = false;

      if (!storedGteDate.isValid && calculatedGteDate.isValid) {
        isNeedToSetCalculatedDates = true;
      } else if (!storedLteDate.isValid && calculatedLteDate.isValid) {
        isNeedToSetCalculatedDates = true;
      } else if (!storedGteDate.isSame(calculatedGteDate) || !storedLteDate.isSame(calculatedLteDate)) {
        isNeedToSetCalculatedDates = true;
      }

      if (isNeedToSetCalculatedDates) {
        setQuery({ 
          property: queryBuilderReducer?.dateRangeFilters?.property,
          gte: rangeDates.gte, 
          lte: rangeDates.lte, 
          rangeKey: queryBuilderReducer.dateRangeFilters?.rangeKey,
        });
      }
    }
  }

  private handleDatePropertyChanged() {
    const { moduleName, entityName, setQuery } = this.props;
    const queryBuilderReducer: IQueryBuilderByModuleAndEntityReducer = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    setQuery({ 
      property: this.state.property,
      gte: queryBuilderReducer.dateRangeFilters?.gte,
      lte: queryBuilderReducer.dateRangeFilters?.lte,
      rangeKey: queryBuilderReducer.dateRangeFilters?.rangeKey,
    });
  }

  handleInputChange(gte: string | undefined, lte: string) {
    const { setQuery } = this.props;
    const rangeKey = this.detectRangeKey(gte, lte);
    setQuery({ property: this.state.property, gte, lte, rangeKey });
  }

  private onChangePeriod(dates: null | [ any, any ], dateStrings: [ string, string ]) {
    this.handleInputChange(dateStrings[0] || undefined, dateStrings[1] || 'now')
  }

  /**
   * ODN-1741 Detects the predefined range by selected gte and lte from the rangepicker
   * 
   * @param gte 
   * @param lte 
   * @returns 
   */
  private detectRangeKey(gte: string | undefined, lte: string) {
    const ranges = this.getRanges();
    const rangeKeys = Object.keys(ranges);

    const gteDate = dayjs(gte, dateFormat);
    const lteDate = dayjs(lte, dateFormat);
    if (!gteDate.isValid || !lteDate.isValid) return;

    for (const rangeKey of rangeKeys) {
      const range = ranges[rangeKey];
      if (gteDate.isSame(range[0], 'day') && lteDate.isSame(range[1], 'day')) {
        return rangeKey;
      }
    }
  }

  /**
   * ODN-1741 Returns predefined ranges for the rangepicker
   * 
   * @returns 
   */
  private getRanges(): { [key: string]: [Dayjs, Dayjs]} {
    return {
      'Yesterday' : [ dayjs().add(-1, "day"), dayjs().add(-1, "day") ],
      'Today': [ dayjs(), dayjs() ],
      'This Week': [ dayjs().startOf('week'), dayjs().endOf('week') ],
      'Last Week': [ dayjs().add(-1, 'week'), dayjs() ],
      'This Month': [ dayjs().startOf('month'), dayjs().endOf('month') ],
      'Last Month': [ dayjs().add(-1, 'month'), dayjs() ],
      'This Year': [ dayjs().startOf('year'), dayjs().endOf('year') ],
      'Last Year': [ dayjs().add(-1, 'year'), dayjs() ],
    };
  }

  private getRangeDatesByKey(queryBuilderReducer: IQueryBuilderByModuleAndEntityReducer) {
    const ranges = this.getRanges();

    // ODN-1741 calculate the range dates by rangeKey
    if (queryBuilderReducer.dateRangeFilters?.rangeKey) {
      const range = ranges[queryBuilderReducer.dateRangeFilters.rangeKey];
      if (range) {
        return {
          gte: range[0].format(dateFormat),
          lte: range[1].format(dateFormat),
        }
      }
    }
  }

  renderFieldInput() {

    const { moduleName, entityName } = this.props;
    const queryBuilderReducer: any = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    // ODN-1741 get stored absolute range dates
    let gte = queryBuilderReducer?.dateRangeFilters?.gte;
    let lte = queryBuilderReducer?.dateRangeFilters?.lte;

    const ranges = this.getRanges();

    // get range dates by range key
    const rangeDates = this.getRangeDatesByKey(queryBuilderReducer);
    if (rangeDates) {
      gte = rangeDates.gte;
      lte = rangeDates.lte;
    }

    return (
      <div>
        <div>
          <Select
            style={{ width: '100%' }}
            key="property"
            defaultValue={queryBuilderReducer?.dateRangeFilters?.property}
            value={this.state.property}
            placeholder="Date fields"
            allowClear
            onChange={(value) => this.setState({ property: value })}>
            {/* onSelect={(value) => this.setState({ property: value })}> */}
            <Option value="createdAt">Created</Option>
            <Option value="updatedAt">Updated</Option>
            <Option value="stageUpdatedAt">Stage updated</Option>
            {entityName === 'WorkOrder' &&
            <Option value="ServiceAppointment.dbRecords.properties.Date">Service Appointment</Option>}
            {entityName === 'Transaction' &&
            <Option value="properties.StatusUpdatedAt">Status updated</Option>}
            {entityName === 'Invoice' &&
            <Option value="properties.DueDate">Due Date</Option>}
            {entityName === 'Invoice' &&
            <Option value="Transaction.dbRecords.properties.StatusUpdatedAt">Transaction Status Updated</Option>}
          </Select>
        </div>
        {this.state.property && <div style={{ marginTop: 12 }}>
            <RangePicker
                ranges={ranges}
                onChange={this.onChangePeriod.bind(this)}
                value={(!gte || !lte) ? null : [ dayjs(gte, dateFormat), dayjs(lte, dateFormat) ]}
            />
        </div>}
      </div>
    )
  }

  private fetchData() {
    const { searchRecords, recordReducer, schemaReducer, moduleName, entityName } = this.props;
    const queryBuilderReducer: any = getQueryBuilderReducer(this.props.queryBuilderReducer, moduleName, entityName);

    if(moduleName && entityName) {
      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, moduleName, entityName);
      if(schema) {
        searchRecords({
          schema: schema,
          searchQuery: {
            schemas: schema.id,
            terms: recordReducer.searchQuery.terms,
            sort: recordReducer.searchQuery.sort,
            boolean: queryBuilderReducer.queries,
          },
        });
      }
    }
  }

  render() {
    return (
      <div style={{ margin: '10px', width: '95%' }}>
        <Col>
          {this.renderFieldInput()}
        </Col>
      </div>
    )
  }

}


const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  recordTableReducer: state.recordTableReducer,
  schemaReducer: state.schemaReducer,
  queryBuilderReducer: state.queryBuilderReducer,
});

const mapDispatch = (dispatch: any, ownProps: any) => ({
  configure: (params: any) => dispatch(setSearchQuery(generateModuleAndEntityKeyFromProps(ownProps), params)),
  searchRecords: (params: { schema: SchemaEntity, searchQuery: SearchQueryType }) => dispatch(searchRecordsRequest(
    params)),
  setQuery: (query: IDateRangeQuery) => dispatch(setDateRangeQuery(
    generateModuleAndEntityKeyFromProps(ownProps),
    query,
  )),
});

export default connect(mapState, mapDispatch)(DateFilters);
