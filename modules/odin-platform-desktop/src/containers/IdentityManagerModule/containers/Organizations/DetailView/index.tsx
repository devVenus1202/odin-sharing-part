import { Button, Col, Form, Input, Layout, Row } from 'antd';
import { FormInstance } from 'antd/lib/form';
import React from 'react';
import { connect } from 'react-redux';
import { getOrganizationByIdRequest, saveOrganizationRequest } from '../../../../../core/identityUser/store/actions';
import { errorNotification } from '../../../../../shared/system/notifications/store/reducers';

interface Props {
  userReducer: any;
  getOrganizationData: any;
  saveOrganization: any;
  notifyError: any;
}

interface State {
  name: string,
  crNumber: string,
  vatNumber: string,
  billingReplyToEmail: string,
  customerServiceReplyToEmail: string,
  webUrl: string,
  contactUrl: string,
  contactPhone: string,
  addressLine1: string,
  addressLine2: string,
  addressCity: string,
  addressPostalCode: string,
  countryCode: string,
}

class OrganizationsDetailView extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    const { userReducer, getOrganizationData } = props;
    this.state = {
      name: '',
      crNumber: '',
      vatNumber: '',
      billingReplyToEmail: '',
      customerServiceReplyToEmail: '',
      webUrl: '',
      contactUrl: '',
      contactPhone: '',
      addressLine1: '',
      addressLine2: '',
      addressCity: '',
      addressPostalCode: '',
      countryCode: '',
    }
    getOrganizationData({ id: userReducer.user.organization.id }, (resp: any) => {
      this.setState({
        name: resp.results.name,
        crNumber: resp.results.crNumber,
        vatNumber: resp.results.vatNumber,
        billingReplyToEmail: resp.results.billingReplyToEmail,
        customerServiceReplyToEmail: resp.results.customerServiceReplyToEmail,
        webUrl: resp.results.webUrl,
        contactUrl: resp.results.contactUrl,
        contactPhone: resp.results.contactPhone,
        addressLine1: resp.results.addressLine1,
        addressLine2: resp.results.addressLine2,
        addressCity: resp.results.addressCity,
        addressPostalCode: resp.results.addressPostalCode,
        countryCode: resp.results.countryCode,
      })
    })
  }

  formRef = React.createRef<FormInstance>();

  saveChanges = async () => {
    const { notifyError, saveOrganization, userReducer } = this.props;
    try {
      if(!!this.formRef.current) {
        await this.formRef.current.validateFields();
        const formErrors = this.formRef.current ? this.formRef.current.getFieldsError() : [];
        const hasErrors = formErrors.filter(({ errors }) => errors.length).length > 0;
        if(hasErrors) {
          return notifyError({
            message: 'form has errors, fix them and resubmit',
            validation: null,
            data: null,
          });
        } else {
          saveOrganization({ data: this.state, id: userReducer.user.organization.id }, (resp: any) => {
            this.setState({
              name: resp.results.name,
              crNumber: resp.results.crNumber,
              vatNumber: resp.results.vatNumber,
              billingReplyToEmail: resp.results.billingReplyToEmail,
              customerServiceReplyToEmail: resp.results.customerServiceReplyToEmail,
              webUrl: resp.results.webUrl,
              contactUrl: resp.results.contactUrl,
              contactPhone: resp.results.contactPhone,
              addressLine1: resp.results.addressLine1,
              addressLine2: resp.results.addressLine2,
              addressCity: resp.results.addressCity,
              addressPostalCode: resp.results.addressPostalCode,
              countryCode: resp.results.countryCode,
            })
          })
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  setFormValues = () => {
    this.formRef.current?.setFieldsValue({
      name: this.state.name,
      crNumber: this.state.crNumber,
      vatNumber: this.state.vatNumber,
      billingReplyToEmail: this.state.billingReplyToEmail,
      customerServiceReplyToEmail: this.state.customerServiceReplyToEmail,
      webUrl: this.state.webUrl,
      contactUrl: this.state.contactUrl,
      contactPhone: this.state.contactPhone,
      addressLine1: this.state.addressLine1,
      addressLine2: this.state.addressLine2,
      addressCity: this.state.addressCity,
      addressPostalCode: this.state.addressPostalCode,
      countryCode: this.state.countryCode,
    });
  }

  renderForm() {
    this.setFormValues()
    return (
      <Form
        layout={'vertical'}
        style={{ width: 'calc(100% - 6px)', paddingBottom: '1rem' }}
        ref={this.formRef}
        initialValues={this.state}
      >
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item className="form-item" label="Name" name='name' initialValue={this.state.name}>
              <Input
                placeholder="Name"
                onChange={(e) => this.setState({ name: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="Company Registration Number (CRN)" name='crNumber' initialValue={this.state.crNumber}>
              <Input
                placeholder="CRN"
                onChange={(e) => this.setState({ crNumber: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="Company VAT Number" name='vatNumber' initialValue={this.state.vatNumber}>
              <Input
                placeholder="VAT Number"
                onChange={(e) => this.setState({ vatNumber: e.target.value })}/>
            </Form.Item>
            <Form.Item
              className="form-item"
              label="Billing Reply To Email"
              name='billingReplyToEmail'
              initialValue={this.state.billingReplyToEmail}
            >
              <Input
                placeholder="Billing Reply To Email"
                onChange={(e) => this.setState({ billingReplyToEmail: e.target.value })}/>
            </Form.Item>
            <Form.Item
              className="form-item"
              label="Customer Service Reply To Email"
              name='customerServiceReplyToEmail'
              initialValue={this.state.customerServiceReplyToEmail}
            >
              <Input
                placeholder="Customer Service Reply To Email"
                onChange={(e) => this.setState({ customerServiceReplyToEmail: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="Web Url" name='webUrl' 
              initialValue={this.state.webUrl}>
              <Input
                placeholder="Web Url"
                onChange={(e) => this.setState({ webUrl: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="Contact Page Url" name='contactUrl' 
              initialValue={this.state.contactUrl}>
              <Input
                placeholder="Contact Page Url"
                onChange={(e) => this.setState({ contactUrl: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="Contact Phone Number" name='contactPhone' 
              initialValue={this.state.contactPhone}>
              <Input
                placeholder="Contact Phone Number"
                onChange={(e) => this.setState({ contactPhone: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="Address Line 1" name='addressLine1' 
              initialValue={this.state.addressLine1}>
              <Input
                placeholder="Address Line 1"
                onChange={(e) => this.setState({ addressLine1: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="Address Line 2" name='addressLine2' 
              initialValue={this.state.addressLine2}>
              <Input
                placeholder="Address Line 2"
                onChange={(e) => this.setState({ addressLine2: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="City" name='addressCity' 
              initialValue={this.state.addressCity}>
              <Input
                placeholder="City"
                onChange={(e) => this.setState({ addressCity: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="Postal Code" name='addressPostalCode' 
              initialValue={this.state.addressPostalCode}>
              <Input
                placeholder="Postal Code"
                onChange={(e) => this.setState({ addressPostalCode: e.target.value })}/>
            </Form.Item>
            <Form.Item className="form-item" label="Country Code" name='countryCode' 
              initialValue={this.state.countryCode}>
              <Input
                placeholder="Country Code"
                onChange={(e) => this.setState({ countryCode: e.target.value })}/>
            </Form.Item>
          </Col>
        </Row>
        <div style={{ float: 'right' }}>
          <Button key="1" type="primary" onClick={() => this.saveChanges()}>Save Changes</Button>
        </div>
      </Form>
    );
  }

  render() {

    return (
      <Layout className="record-detail-view">{this.renderForm()}</Layout>
    );
  }
}

const mapState = (state: any) => ({
  userReducer: state.userReducer,
});

const mapDispatch = (dispatch: any) => ({
  notifyError: (params: any) => dispatch(errorNotification(params)),
  getOrganizationData: (params: any, cb: any) => dispatch(getOrganizationByIdRequest(params, cb)),
  saveOrganization: (params: any, cb: any) => dispatch(saveOrganizationRequest(params, cb)),
});

export default connect(mapState, mapDispatch)(OrganizationsDetailView);
