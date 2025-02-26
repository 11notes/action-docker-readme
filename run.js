const { spawn } = require('node:child_process');

module.exports = run = async(bin, args) => {
  return(new Promise((resolve, reject) => {
    const param = (Array.isArray(args) ? args : args.split(' '));
    core.info(`run ${bin} ${param.join(' ')}`);
    const ps = spawn(bin, param, {shell:true, stdio:['pipe', 'pipe', 'pipe']});
    const io = {stdout:'', stderr:''};
    ps.stderr.on('data', data => {io.stderr += data.toString()});
    ps.stdout.on('data', data => {io.stdout += data.toString()});
    ps.on('error', error => {reject(error)});
    ps.on('close', code => {
      if(code === 0){
        if(io.stderr.length > 0 && io.stdout.length <= 0){
          // seems binary has logged all to stderr instead of stdout with exit code 0
          resolve(io.stderr.trim());
        }else{
          resolve(io.stdout.trim());
        }
      }else{
        reject(io.stderr);
      }
    });
  }));
}