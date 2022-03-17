import axios from 'axios';
import { getHostName } from './helpers';

function buildUrl(path: string): string {
  let url = `${getHostName()}/${path}`;
  // override url here for local debug
  return url;
}

export function httpGet<T>(path: string, params?: any) {
  const token = localStorage.getItem(`token`);
  return axios({
    method: 'get',
    timeout: 60 * 1000 * 2,
    params: params,
    url: buildUrl(path),
    headers: {
      Authorization: 'Bearer ' + token,
    },
  });
}

export function httpGetAbsolute<T>(path: string) {
  const token = localStorage.getItem(`token`);
  return axios({
    method: 'get',
    timeout: 60 * 1000 * 2,
    url: path,
    headers: {
      Authorization: 'Bearer ' + token,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE,PATCH,OPTIONS',
    },
  });
}

export function httpPost<T>(path: string, body: T, params?: any) {
  const token = localStorage.getItem(`token`);
  return axios({
    method: 'post',
    timeout: 60 * 1000 * 2,
    params: params,
    url: buildUrl(path),
    headers: {
      Authorization: 'Bearer ' + token,
    },
    data: body,
  });
}


export function httpPut<T>(path: string, body: T) {
  const token = localStorage.getItem(`token`);
  return axios({
    method: 'put',
    timeout: 60 * 1000 * 2,
    url: buildUrl(path),
    headers: {
      Authorization: 'Bearer ' + token,
    },
    data: body,
  });
}

export function httpPatch<T>(path: string, body: T) {
  const token = localStorage.getItem(`token`);
  return axios({
    method: 'patch',
    timeout: 60 * 1000 * 2,
    url: buildUrl(path),
    headers: {
      Authorization: 'Bearer ' + token,
    },
    data: body,
  });
}


export function httpDelete<T>(path: string, body?: T) {
  const token = localStorage.getItem(`token`);
  return axios({
    method: 'delete',
    timeout: 60 * 1000 * 2,
    url: buildUrl(path),
    headers: {
      Authorization: 'Bearer ' + token,
    },
    data: body,
  });
}

export function httpFileUpload<T>(path: string, body: T) {
  const token = localStorage.getItem(`token`);
  return axios({
    method: 'post',
    timeout: 60 * 1000 * 2,
    url: buildUrl(path),
    headers: {
      'Content-Type': 'multipart/form-data',
      Authorization: 'Bearer ' + token,
    },
    data: body,
  });
}

