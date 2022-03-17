import { ConfigProvider } from 'antd';
import 'antd/dist/antd.css';

import en_GB from 'antd/es/locale/en_GB';
import en_US from 'antd/es/locale/en_US';
import sr_RS from 'antd/es/locale/sr_RS';

import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import App from './App';
import './index.css';
import * as serviceWorker from './serviceWorker';
import configureStore from './store/configureStore';

const userLang = navigator.language ? navigator.language.toLowerCase() : undefined;
console.log('The language is: ' + userLang);

const store = configureStore();

// Set the global locale for antd components
// these are the supported locales, default is en_US
const setLocale = () => {
  if (userLang === 'en_gb') {
    return en_GB
  } else if (userLang === 'sr_rs') {
    return sr_RS
  }
  return en_US
}

const renderApp = () => render(
  <React.StrictMode>
    <ConfigProvider locale={setLocale()}>
      <Provider store={store}>
        <App/>
      </Provider>
    </ConfigProvider>
  </React.StrictMode>,
  document.getElementById('root'),
);
// @ts-ignore
if (process.env.NODE_ENV !== 'production' && module.hot) {
  // @ts-ignore
  module.hot.accept('./App', renderApp)
}

renderApp();

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
