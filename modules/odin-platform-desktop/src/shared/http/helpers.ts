export const getHostName = () => {
  let host: string | undefined = window.location.host;

  if(host.indexOf('localhost') === -1) {
    if(host.indexOf('app') > -1) {
      host = `https://${host.replace('app', 'api')}`;
    } else {
      host = `https://api.${host}`;
    }
  } else {
    host = process.env.REACT_APP_ODIN_API_URL
  }

  return host;
}



export const getOrganizationName = () => {

  const hostName = window.location.host


  if(hostName && hostName.indexOf('youfibre') > -1){
    return 'YouFibre'
  }else if(hostName && hostName.indexOf('netomnia') > -1){
    return 'Netomnia'
  }else if (hostName && hostName.indexOf('localhost') > -1){
    return 'Default'
  }else{
    return 'Default'
  }

}