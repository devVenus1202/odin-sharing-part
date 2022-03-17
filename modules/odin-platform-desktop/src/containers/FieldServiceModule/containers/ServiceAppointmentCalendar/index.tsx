import { DbRecordEntityTransform } from '@d19n/models/dist/schema-manager/db/record/transform/db.record.entity.transform';
import { getProperty } from '@d19n/models/dist/schema-manager/helpers/dbRecordHelpers';
import { SchemaEntity } from '@d19n/models/dist/schema-manager/schema/schema.entity';
import { SchemaModuleEntityTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.entity.types';
import { SchemaModuleTypeEnums } from '@d19n/models/dist/schema-manager/schema/types/schema.module.types';
import { SearchQueryType } from '@d19n/models/dist/search/search.query.type';
import { Calendar, Card, Col, Layout, Row, Select, Spin, Tag } from 'antd';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import {
  createAppointmentRequest,
  ILoadAppointments,
  loadAppointmentsRequest,
} from '../../../../core/appointments/store/actions';
import { resetRecordsList, searchRecordsRequest } from '../../../../core/records/store/actions';
import { IRecordReducer } from '../../../../core/records/store/reducer';
import { IRecordAssociationsReducer } from '../../../../core/recordsAssociations/store/reducer';
import { getSchemaByModuleAndEntityRequest } from '../../../../core/schemas/store/actions';
import { SchemaReducerState } from '../../../../core/schemas/store/reducer';
import { getRecordListFromShortListById } from '../../../../shared/utilities/recordHelpers';
import { getSchemaFromShortListByModuleAndEntity } from '../../../../shared/utilities/schemaHelpers';
import SearchResult from '../../../Search/SearchResult';

const { Option } = Select;

const SERVICE_APPOINTMENT_CONFIG = 'ServiceAppointmentConfig'

interface Props {
  schemaReducer: SchemaReducerState,
  recordReducer: IRecordReducer,
  recordAssociationReducer: IRecordAssociationsReducer,
  searchRecords: any,
  appointmentReducer: any,
  loadAppointments: (params: ILoadAppointments) => {},
  getSchemaByEntity: any,
  resetRecordReducer: any
}

interface State {
  selectedDate: string,
  selectedType: string | undefined,
  aptConfigKey: string | undefined
}

const { FIELD_SERVICE_MODULE } = SchemaModuleTypeEnums;
const { WORK_ORDER } = SchemaModuleEntityTypeEnums;

class ServiceAppointmentCalendar extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {
      selectedDate: moment().format('YYYY-MM-DD'),
      selectedType: 'INSTALL',
      aptConfigKey: '',
    };

    this.dateCellRender = this.dateCellRender.bind(this);
    this.getMonthlyAppointments = this.getMonthlyAppointments.bind(this);
  }

  componentDidMount() {
    const { getSchemaByEntity } = this.props;

    this.loadAppointmentsOverview();

    this.fetchServiceAppointmentConfig()

    getSchemaByEntity({ moduleName: FIELD_SERVICE_MODULE, entityName: WORK_ORDER });
    getSchemaByEntity({ moduleName: FIELD_SERVICE_MODULE, entityName: SERVICE_APPOINTMENT_CONFIG });
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
    if (prevProps.schemaReducer.isRequesting != this.props.schemaReducer.isRequesting) {
      this.fetchData();
    }

    if (prevState.selectedDate != this.state.selectedDate) {
      if (!!this.state.aptConfigKey) {
        this.loadAppointmentsByConfigOverview()
        this.fetchDataByConfig();
      } else {
        this.loadAppointmentsOverview();
        this.fetchData();
      }
    }

    if (prevState.selectedType != this.state.selectedType && !this.state.aptConfigKey) {
      this.fetchData();
      this.loadAppointmentsOverview();
    }

    if (prevState.aptConfigKey != this.state.aptConfigKey) {
      this.loadAppointmentsByConfigOverview()
      this.fetchDataByConfig();
    }
  }

  componentWillUnmount() {
    const { resetRecordReducer } = this.props;
    resetRecordReducer();
  }

  private loadAppointmentsOverview() {
    const { loadAppointments } = this.props;
    const { selectedDate, selectedType } = this.state;

    loadAppointments({
      start: moment(selectedDate).startOf('month').format('YYYY-MM-DD'),
      end: moment(selectedDate).endOf('month').format('YYYY-MM-DD'),
      type: selectedType,
      isOverview: true,
    });
  }

  private loadAppointmentsByConfigOverview() {
    const { loadAppointments } = this.props;
    const { selectedDate, aptConfigKey } = this.state;

    if (aptConfigKey) {
      const split = aptConfigKey.split('#')

      console.log({
        start: moment(selectedDate).startOf('month').format('YYYY-MM-DD'),
        end: moment(selectedDate).endOf('month').format('YYYY-MM-DD'),
        type: split[1],
        exPolygonId: split[2],
      })

      loadAppointments({
        start: moment(selectedDate).startOf('month').format('YYYY-MM-DD'),
        end: moment(selectedDate).endOf('month').format('YYYY-MM-DD'),
        type: split[1],
        exPolygonId: split[2],
        isOverview: true,
      });
    }
  }

  private fetchServiceAppointmentConfig() {
    const { schemaReducer, searchRecords } = this.props;

    const schema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      FIELD_SERVICE_MODULE,
      SERVICE_APPOINTMENT_CONFIG,
    );

    if (schema) {
      searchRecords({
        schema: schema,
        searchQuery: {
          schemas: schema.id,
          terms: '',
          boolean: {
            must: [
              {
                query_string: {
                  fields: [ 'properties.IsDefault' ],
                  query: 'true',
                  lenient: true,
                  default_operator: 'AND',
                },
              },
            ],
          },
          sort: [],
        },
      });
    }
  }

  private fetchDataByConfig() {
    const { schemaReducer, searchRecords } = this.props;
    const { selectedDate, aptConfigKey } = this.state;

    if (aptConfigKey) {
      const split = aptConfigKey.split('#')

      const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, FIELD_SERVICE_MODULE, WORK_ORDER);

      if (schema) {
        searchRecords({
          schema: schema,
          searchQuery: {
            schemas: schema.id,
            pageable: {
              size: 100,
            },
            terms: '',
            sort: [ { 'ServiceAppointment.dbRecords.properties.TimeBlock.keyword': { order: 'asc' } } ],
            boolean: {
              must: [
                {
                  query_string: {
                    fields: [ 'ServiceAppointment.dbRecords.properties.Date' ],
                    query: selectedDate,
                    lenient: true,
                    default_operator: 'AND',
                  },
                },
                {
                  query_string: {
                    fields: [ 'ServiceAppointment.dbRecords.properties.Type' ],
                    query: split[1],
                    lenient: true,
                    default_operator: 'AND',
                  },
                },
                {
                  terms: {
                    'ServiceAppointment.dbRecords.properties.ExPolygonId': split[2].split(','),
                  },
                },
              ],
            },
          },
        }, () => {
          this.fetchServiceAppointmentConfig()
        });
      }
    }
  }

  private fetchData() {
    const { schemaReducer, searchRecords } = this.props;
    const { selectedDate, selectedType } = this.state;

    const schema = getSchemaFromShortListByModuleAndEntity(schemaReducer.shortList, FIELD_SERVICE_MODULE, WORK_ORDER);

    if (schema) {
      searchRecords({
        schema: schema,
        searchQuery: {
          schemas: schema.id,
          pageable: {
            size: 100,
          },
          terms: '',
          sort: [ { 'ServiceAppointment.dbRecords.properties.TimeBlock.keyword': { order: 'asc' } } ],
          boolean: {
            must: [
              {
                query_string: {
                  fields: [ 'ServiceAppointment.dbRecords.properties.Date' ],
                  query: selectedDate,
                  lenient: true,
                  default_operator: 'AND',
                },
              },
              {
                query_string: {
                  fields: [ 'ServiceAppointment.dbRecords.properties.Type' ],
                  query: selectedType,
                  lenient: true,
                  default_operator: 'AND',
                },
              },
            ],
          },
        },
      }, () => {
        this.fetchServiceAppointmentConfig()
      });
    }
  }

  renderTimeslotClassName(item: { [key: string]: { dbRecords: DbRecordEntityTransform[] } }) {
    if (item['ServiceAppointment'] && item['ServiceAppointment'].dbRecords) {
      return getProperty(item['ServiceAppointment'].dbRecords[0], 'TimeBlock') == 'AM' ? 'amTimeSlot' : 'pmTimeSlot';
    }
  }

  private renderWorkOrderList() {
    const { recordReducer, schemaReducer } = this.props;

    const schema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      SchemaModuleTypeEnums.FIELD_SERVICE_MODULE,
      SchemaModuleEntityTypeEnums.WORK_ORDER,
    );

    if (schema && schema.id) {
      const list = getRecordListFromShortListById(recordReducer.list, schema.id);
      if (list && list.length > 0) {
        return list.map((result: any) => (
          <SearchResult
            key={result.id}
            entityName={result.entity.split(':')[1]}
            searchResult={result}
            globalCollapsed={false}
            onClose={() => {
            }}
          />
        ))
      }
    }
  }

  private renderServiceAppointmentConfigList() {
    const { recordReducer, schemaReducer } = this.props;

    const schema = getSchemaFromShortListByModuleAndEntity(
      schemaReducer.shortList,
      SchemaModuleTypeEnums.FIELD_SERVICE_MODULE,
      SERVICE_APPOINTMENT_CONFIG,
    );

    if (schema && schema.id) {
      const list = getRecordListFromShortListById(recordReducer.list, schema.id);

      console.log('renderServiceAppointmentConfigList__List', list)
      console.log('aptConfigKey', this.state)

      return (
        <Select defaultValue={`${this.state.aptConfigKey || this.state.selectedType}`}
                style={{ width: 360 }}
                onChange={(val) => {
                  if (val === 'INSTALL') {
                    this.setState({ selectedType: val, aptConfigKey: undefined })
                  } else if (val === 'SERVICE') {
                    this.setState({ selectedType: val, aptConfigKey: undefined })
                  } else {
                    this.setState({ aptConfigKey: val, selectedType: undefined })
                  }
                }}>
          <Option value={`INSTALL`}>INSTALL - Overview</Option>
          <Option value={`SERVICE`}>SERVICE - Overview</Option>
          {list && list.length > 0 ? list.map(elem => (
            <Option
              value={`${elem.id}#${elem.type}#${getProperty(elem, 'ExPolygonId')}`}>{elem.type} - {elem.title}</Option>
          )) : <Option value={`NULL`} disabled>Create Appointment Configs</Option>}
        </Select>
      )
    }
  }

  getAvailabilityColor(dayCount: number) {
    if (dayCount >= 4) {
      return 'red';
    } else if (dayCount < 4 && dayCount > 0) {
      return 'gold';
    } else {
      return 'green';
    }
  }

  getListData(value: any) {
    const { appointmentReducer } = this.props;

    const appointmentFound = appointmentReducer.list.filter(function (appointment: any) {
      return appointment.Date === value.format('YYYY-MM-DD');
    });

    if (appointmentFound.length > 0) {
      return [
        {
          availabilityColor: this.getAvailabilityColor(appointmentFound[0].AMCount),
          totalCount: appointmentFound[0].AMCount,
          timeSlot: {
            slot: 'AM',
            availability: appointmentFound[0].AM,
          },
        },
        {
          availabilityColor: this.getAvailabilityColor(appointmentFound[0].PMCount),
          totalCount: appointmentFound[0].PMCount,
          timeSlot: {
            slot: 'PM',
            availability: appointmentFound[0].PM,
          },
        },
      ]
    } else {
      return []
    }
  }

  dateCellRender(value: any) {
    let dayCellBackground;
    let listData: Array<any> = this.getListData(value);

    if (listData.length > 0) {
      if (listData[0].timeSlot.availability == false && listData[1].timeSlot.availability == false) {
        dayCellBackground = 'dayIsUnavailable';
      }
    }

    return (
      <Row style={{ marginTop: '12' }} className={`${dayCellBackground} dayCell`}>
        <Col span={24}>
          <div>
            <ul className="events">
              {listData.map((item: any, index: number) => (
                <li key={index} style={{ marginBottom: '8px' }}>
                  <Tag className={(item.timeSlot.slot == 'AM' ? 'amTimeSlot' : 'pmTimeSlot')}>
                    {item.timeSlot.slot}
                  </Tag>
                  <Tag className="timeSlotCount" color={item.availabilityColor}>
                    {item.totalCount}
                  </Tag>
                </li>
              ))}
            </ul>
          </div>
        </Col>
      </Row>
    );
  }

  getMonthlyAppointments(value: any) {
    const { loadAppointments } = this.props;

    loadAppointments({
      start: value.startOf('month').format('YYYY-MM-DD'),
      end: value.endOf('month').format('YYYY-MM-DD'),
      type: this.state.selectedType,
      isOverview: true,
    });
  }

  render() {
    const { appointmentReducer, recordReducer } = this.props;

    return (
      <Layout style={{ padding: 10 }}>
        <Row gutter={4}>
          <Col xs={24} lg={18} xl={18}>
            <Card title="Service Appointment Calendar" extra={[
              this.renderServiceAppointmentConfigList(),
            ]}>
              <Spin spinning={appointmentReducer.isSearching} size="large">
                <Calendar
                  validRange={[ moment().subtract(1, 'years'), moment().add(3, 'years') ]}
                  onPanelChange={this.getMonthlyAppointments}
                  dateCellRender={this.dateCellRender}
                  onSelect={
                    (date: any) => this.setState({ selectedDate: date.format('YYYY-MM-DD') })
                  }
                />
              </Spin>
            </Card>
          </Col>
          <Col xs={24} lg={6} xl={6}>
            <Card title="Customer Work Orders">
              <Spin spinning={recordReducer.isSearching} size="small">
                {this.renderWorkOrderList()}
              </Spin>
            </Card>
          </Col>
        </Row>
      </Layout>
    )
  }
}

const mapState = (state: any) => ({
  recordReducer: state.recordReducer,
  recordAssociationReducer: state.recordAssociationReducer,
  schemaReducer: state.schemaReducer,
  appointmentReducer: state.appointmentReducer,
});

const mapDispatch = (dispatch: any) => ({
  loadAppointments: (params: ILoadAppointments) => dispatch(loadAppointmentsRequest(params)),
  createAppointment: (params: any, cb: () => {}) => dispatch(createAppointmentRequest(params, cb)),
  searchRecords: (params: { schema: SchemaEntity, searchQuery: SearchQueryType }, cb: () => {}) => dispatch(
    searchRecordsRequest(
      params, cb)),
  getSchemaByEntity: (params: any) => dispatch(getSchemaByModuleAndEntityRequest(params)),
  resetRecordReducer: () => dispatch(resetRecordsList()),
});

export default connect(mapState, mapDispatch)(ServiceAppointmentCalendar);
