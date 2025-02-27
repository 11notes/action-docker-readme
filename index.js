const Eleven = require('./src/Eleven.js');

try{
  const README = require('./src/README.js');
  const readme = new README();
  Eleven.info('starting action-docker-readme');
  readme.init();
}catch(e){
  Eleven.info(e);
}