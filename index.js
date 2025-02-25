const fs = require('node:fs');
const { inspect } = require('node:util');
const { spawn, spawnSync } = require('node:child_process');
const path = require('node:path');
const core = require('@actions/core');
const args = process.argv.slice(2);

const run = async(bin, args) => {
  return(new Promise((resolve, reject) => {
    const param = (Array.isArray(args) ? args : args.split(' '));
    core.info(`run ${bin} ${param.join(' ')}`);
    const ps = spawn(bin, param);
    const io = {stdout:'', stderr:''};
    ps.stderr.on('data', data => {io.stderr += data.toString()});
    ps.stdout.on('data', data => {io.stdout += data.toString()});
    ps.on('error', error => {reject(error)});
    ps.on('close', code => {
      if(code === 0){
        if(io.stderr.length > 0){
          reject(io.stderr);
        }else{
          resolve(io.stdout.trim().split(/[\r\n]+/ig));
        }
      }else{
        reject(io.stderr);
      }
    });
  }));
}

class CVEReport{
  #CVEs = {};
  #markdown = [];
  #fetchCache = {};

  constructor(opt){
    if(opt?.title){
      this.#markdown.push(opt.title);
    }
    if(opt?.text){
      this.#markdown.push(opt.text);
    }
    this.#markdown.push('| ID | Severity | Complexity | Vector | Source |');
    this.#markdown.push('| --- | --- | --- | --- | --- |');
  }

  add(ID){
    if(!this.#CVEs[ID]){
      this.#CVEs[ID] = true;
    }
  }

  async create(){
    const CVEs = [];
    for(const ID in this.#CVEs){
      const update = await this.#fetch(ID);
      if(update){
        CVEs.push(update);
      }
    }

    if(CVEs.length > 0){
      CVEs.sort((a, b) => {return(b.severity - a.severity)});
      for(const CVE of CVEs){
        this.#markdown.push(`| ${CVE.id} | ${this.#severityToText(CVE.severity)} | ${CVE.complexity} | ${CVE.vector} | [${CVE.id}](https://nvd.nist.gov/vuln/detail/${CVE.id}) |`);
      }
      return(this.#markdown.join("\r\n"));
    }else{
      core.warning(`could not create report for ${this.#markdown[0]}`);
      return('');
    }
  }

  async #fetch(ID){
    try{
      if(this.#fetchCache[ID]){
        return(this.#fetchCache[ID]);
      }else{
        const response = await fetch(`https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=${ID}`, {signal:AbortSignal.timeout(15000)});
        if(!response.ok){
          throw new Error(`received HTTP status ${response.status}`);
        }else{
          const json = await response.json();
          const nist = {
            cvss:{},
          }
  
          if(json?.vulnerabilities?.[0]?.cve?.metrics?.cvssMetricV31?.[0]){
            nist.cvss = json.vulnerabilities[0].cve.metrics.cvssMetricV31[0];
          }else if(json?.vulnerabilities?.[0]?.cve?.metrics?.cvssMetricV30?.[0]){
            nist.cvss = json.vulnerabilities[0].cve.metrics.cvssMetricV30[0];
          }
  
          if(nist.cvss?.cvssData){
            const result = {
              id:ID,
              severity:nist.cvss?.cvssData?.baseScore || 0,
              vector:nist.cvss?.cvssData?.attackVector.toLowerCase() || '',
              complexity:nist.cvss?.cvssData?.attackComplexity.toLowerCase() || '',
            };

            this.#fetchCache[ID] = result;
            return(result);
          }else{
            throw new Error('could not access cvssMetricV31 or cvssMetricV30');
          }
        }
      }
    }catch(e){
      core.warning(`${e.message} // ${ID}`);
      return(false);
    }
  }

  #severityToText(severity){
    switch(true){
      case severity <= 0: return('none');
      case severity > 0 && severity <= 3.9: return('low');
      case severity >= 4 && severity <= 6.9: return('medium');
      case severity >= 7 && severity <= 8.9: return('high');
      case severity >= 9: return('critical');
    }
  }
}

class README{
  #debug;
  #env = {};
  #header = [];
  #footer = [];

  #default = {
    title:{
      synopsis:'# SYNOPSIS 📖',
      volumes:'# VOLUMES 📁',
      built:'# BUILT WITH 🧰',
      build:'# BUILD 🚧',
      unraid:'# UNRAID VERSION 🟠',
      compose:'# COMPOSE ✂️',
      tips:'# GENERAL TIPS 📌',
      environment:'# ENVIRONMENT 📝',
      source:'# SOURCE 💾',
      parent:'# PARENT IMAGE 🏛️',
      config:'# DEFAULT CONFIG 📑',
      patches:'# PATCHED CVE 🦟',
      tags:'# MAIN TAGS 🏷️',
      defaults:'# DEFAULT SETTINGS 🗃️',
      sarif:'# SECURITY VULNERABILITIES REPORT ⚡',
    },
    content:{
      shields:`${[
        '[<img src="https://img.shields.io/badge/github-source-blue?logo=github&color=040308">](https://github.com/11notes/docker-${{ json_name }})',
        '![size](https://img.shields.io/docker/image-size/${{ json_image }}/${{ json_semver_version }}?color=0eb305)',
        '![version](https://img.shields.io/docker/v/${{ json_image }}/${{ json_semver_version }}?color=eb7a09)',
        '![pulls](https://img.shields.io/docker/pulls/${{ json_image }}?color=2b75d6)',
        '[<img src="https://img.shields.io/github/issues/11notes/docker-${{ json_name }}?color=7842f5">](https://github.com/11notes/docker-${{ json_name }}/issues)',
      ].join("")}`,
      tips:`\${{ title_tips }}\r\n${[
        '* Use a reverse proxy like Traefik, Nginx, HAproxy to terminate TLS and to protect your endpoints',
        '* Use Let’s Encrypt DNS-01 challenge to obtain valid SSL certificates for your services'
      ].join("\r\n")}`,
      unraid:"${{ title_unraid }}\r\nThis image supports unraid by default. Simply add **-unraid** to any tag and the image will run as 99:100 instead of 1000:1000 causing no issues on unraid. Enjoy.",
      build:"${{ title_build }}\r\n```dockerfile\r\n${{ include: ./build.dockerfile }}\r\n```",
      tags:'',
      synopsis:'\${{ title_synopsis }}\r\n**What can I do with this?**',
      environment:`\${{ title_environment }}\r\n${[
        '| Parameter | Value | Default |',
        '| --- | --- | --- |',
        '| `TZ` | [Time Zone](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) | |',
        '| `DEBUG` | Will activate debug option for container image and app (if available) | |',
      ].join("\r\n")}`,
      defaults:`\${{ title_defaults }}\r\n${[
        '| Parameter | Value | Description |',
        '| --- | --- | --- |',
        '| `user` | docker | user name |',
        '| `uid` | 1000 | [user identifier](https://en.wikipedia.org/wiki/User_identifier) |',
        '| `gid` | 1000 | [group identifier](https://en.wikipedia.org/wiki/Group_identifier) |',
        '| `home` | ${{ json_root }} | home directory of user docker |',
      ].join("\r\n")}`,
      parent:"${{ title_parent }}\r\n* [${{ json_readme_parent_image }}](${{ json_readme_parent_url }})",
      source:"${{ title_source }}\r\n* [${{ json_image }}](https://github.com/11notes/docker-${{ json_name }})",
      sarif:'',
      patches:'',
    },
    text:{
      tags:'These are the main tags for the image. There is also a tag for each commit and its shorthand sha256 value.',
      patches:"Unlike other popular image providers, this image contains individual CVE fixes to create a clean container image even if the developers of the original app simply forgot or refuse to do that. Why not add a PR with these fixes? Well, many developers ignore PR for CVE fixes and don’t run any code security scanners against their repos. Some simply don’t care.\r\n\r\n",
    }
  };

  #json = {};

  #files = {
    workflows:{
      tags:'',
    },
    dockerfile:'',
    build:'',
    readme:'',
    compose:'',
  };

  constructor(opt = {}){
    this.#loadFiles(); // load all files
    (async() =>{
      this.#debug = opt?.debug || false;
      await this.#parseInputs(opt);
      this.#createVariables();

      this.#header = [
        '![banner](https://github.com/11notes/defaults/blob/main/static/img/banner.png?raw=true)',
        `# \${{ distro_icon }}\${{ json_name }}\r\n${this.#default.content.shields}`,
        this.#json.readme.description,
        this.#default.content.tags,
      ];

      this.#footer = [
        this.#default.content.patches,
        this.#default.content.sarif,
        `# ElevenNotes™️\r\nThis image is provided to you at your own risk. Always make backups before updating an image to a different version. Check the [releases](https://github.com/11notes/docker-${this.#json.name}/releases) for breaking changes. If you have any problems with using this image simply raise an [issue](https://github.com/11notes/docker-${this.#json.name}/issues), thanks. If you have a question or inputs please create a new [discussion](https://github.com/11notes/docker-${this.#json.name}/discussions) instead of an issue. You can find all my other repositories on [github](https://github.com/11notes?tab=repositories).`,
        `*created ${new Date().toLocaleString('de-CH', { timeZone:'Europe/Zurich'})} (CET)*`,
      ];

      this.#create();
    })();
  }

  #loadFiles(){
    fs.readdirSync('./').forEach(file => {
      switch(true){
        case /^\.json/i.test(file): this.#json = JSON.parse(fs.readFileSync(file).toString()); this.#jsonToTemplateVariable(this.#json, 'json_'); break;
        case /arch\.dockerfile/i.test(file): this.#files.dockerfile = fs.readFileSync(file).toString(); break;
        case /build\.dockerfile/i.test(file): this.#files.build = fs.readFileSync(file).toString(); break;
        case /project\.md/i.test(file): this.#files.readme = fs.readFileSync(file).toString(); break;
        case /compose\.yaml|compose\.yml/i.test(file): this.#files.compose = fs.readFileSync(file).toString(); break;
        case /\.github/i.test(file):
          if(fs.existsSync('./.github/workflows/tags.yml')){
            this.#files.workflows.tags = fs.readFileSync('./.github/workflows/tags.yml').toString();
          }
        break;
      }
    });
  }

  async #parseInputs(opt){
    if(opt.sarif?.runs && Array.isArray(opt.sarif.runs) && opt.sarif.runs.length > 0){
      if(/grype/i.test(opt.sarif.runs[0]?.tool?.driver?.name)){
        const report = new CVEReport({
          title:this.#default.title.sarif,
        });

        for(const rules of opt.sarif.runs[0].tool.driver?.rules){
          const severity = parseFloat(rules?.properties?.['security-severity']);
          const match = rules.id.match(/(CVE-\d+-\d+)/i);
          rules.id = match[1];
          if(severity >= (this.#json?.readme?.grype?.severity || 7)){
            report.add(rules.id);
          }
        }

        this.#default.content.sarif = await report.create();
      }else{
        core.warning('sarif is not a valid grype report');
      }
    }else{
      core.warning('sarif runs is empty');
    }

    if(opt.build_log.length > 0){
      // find CVE fixed that were applied during build
      const report = new CVEReport({
        title:this.#default.title.patches,
        text:this.#default.text.patches,
      });
      
      const matches = [...opt.build_log.toString().matchAll(/"type":"FIX","msg":"CVE\|(\S+)\|(\S+)"/ig)];
      for(const match of matches){
        if(/amd64/ig.test(match[2])){
          report.add(match[1]);
        }
      }

      this.#default.content.patches = await report.create();
    }else{
      core.warning('build log is empty');
    }
  }

  #createVariables(){
    this.#createTags();

    // check for compose example
    if(this.#files.compose.length > 0){
      this.#default.content.compose = `${this.#default.title.compose}\r\n${"```"}yaml\r\n${this.#files.compose}\r\n${"```"}`;
    }

    // check for build example
    if(this.#files.build.length > 0){
      this.#default.content.build = `${this.#default.title.build}\r\n${"```"}yaml\r\n${this.#files.build}\r\n${"```"}`;
    }

    // check for parent image
    this.#env['distro_icon'] = '⛰️ ';
    switch(true){
      case /scratch/i.test(this.#json?.readme?.parent?.image): this.#env['distro_icon'] = ''; this.#env['json_readme_parent_url'] = 'https://hub.docker.com/_/scratch'; break;
      case /11notes\/alpine\:.+/i.test(this.#json?.readme?.parent?.image): this.#env['json_readme_parent_url'] = 'https://hub.docker.com/r/11notes/alpine'; break;
      case /11notes\/kms\:.+/i.test(this.#json?.readme?.parent?.image): this.#env['json_readme_parent_url'] = 'https://hub.docker.com/r/11notes/kms'; break;
      case /ubuntu\:.+/i.test(this.#json?.readme?.parent?.image): this.#env['distro_icon'] = '🍟 '; this.#env['json_readme_parent_url'] = 'https://hub.docker.com/_/ubuntu'; break;
    }

    // check for built
    const built = [];
    for(const k in this.#json?.readme?.built){
      built.push(`* [${k}](${this.#json.readme.built[k]})`);
    }
    if(built.length > 0){
      this.#default.content.built = `${this.#default.title.built}\r\n${built.join("\r\n")}`;
    }

    // finalize
    this.#jsonToTemplateVariable(this.#default);
  }

  #jsonToTemplateVariable(json, prefix = ''){
    for(const k in json){
      if(typeof(json[k]) === 'object'){
        this.#jsonToTemplateVariable(json[k], `${prefix}${k}_`);
      }else{
        this.#env[`${prefix}${k.toLowerCase()}`] = json[k];
      }
    }
  }

  #createTags(){
    let tags = [];
    let hasUnraid = false;
    tags.push(this.#json.semver.version);
    for(const tag in this.#json.semver){
      if(tag !== 'version'){
        switch(true){
          case /stable/i.test(tag): tags.push('stable'); break;
          case /latest/i.test(tag): tags.push('latest'); break;
        }
      }
    }

    // check if image supports unraid tags
    if(/unraid|"uid":"99"/i.test(this.#files.workflows.tags) || /eleven unraid/i.test(this.#files.dockerfile)){
      hasUnraid = true;
      const unraid = [];
      for(const tag of tags){
        unraid.push(`${tag}-unraid`);
      }
      tags = tags.concat(unraid);
    }

    // create tags content
    if(tags.length > 0){
      const list = [];
      for(const tag of tags){
        list.push(`* [${tag}](https://hub.docker.com/r/11notes/${this.#json.name}/tags?name=${tag})`);
      }
      this.#default.content.tags = `${this.#default.title.tags}\r\n${this.#default.text.tags}\r\n\r\n${list.join("\r\n")}`;

      if(hasUnraid){
        this.#default.content.tags += `\r\n\r\n${this.#default.content.unraid}`;
      }
    }
  }

  #create(){
    const output = {
      markdown:'',
      header:[],
      footer:[],
    };

    // header
    for(const e of this.#header){
      if(`${e}`.length > 0){
        output.header.push(e);
      }
    }
    output.markdown += `${output.header.join("\r\n\r\n")}\r\n\r\n`;

    // body
    output.markdown += this.#files.readme;

    // footer
    for(const e of this.#footer){
      if(`${e}`.length > 0){
        output.footer.push(e);
      }
    }
    output.markdown += `\r\n\r\n${output.footer.join("\r\n\r\n")}`;

    for(const k in this.#env){
      output.markdown = output.markdown.replace(new RegExp(`\\\${{ ${String(k).toLowerCase()} }}`, 'ig'), this.#env[k]);
    }

    // include all files
    const includes = [...output.markdown.matchAll(/\${{ include:\s+(\S+) }}/ig)];
    for(const file of includes){
      if(fs.existsSync(file[1])){
        output.markdown = output.markdown.replace(`\${{ include: ${file[1]} }}`, fs.readFileSync(file[1]).toString());
      }else{
        output.markdown = output.markdown.replace(`\${{ include: ${file[1]} }}`,`file ${file[1]} not found!`);
      }
    }

    // add images
    const images = [...output.markdown.matchAll(/\${{ image:\s+(\S+) }}/ig)];
    for(const file of images){
      if(fs.existsSync(`./img/${file[1]}`)){
        output.markdown = output.markdown.replace(`\${{ image: ${file[1]} }}`, `![${file[1].split('.')[0].toUpperCase()}](https://github.com/11notes/docker-${this.#json.name}/blob/master/img/${file[1]}?raw=true)`);
      }else{
        output.markdown = output.markdown.replace(`\${{ image: ${file[1]} }}`,`image ${file[1]} not found!`);
      }
    }

    for(const k in this.#env){
      output.markdown = output.markdown.replace(new RegExp(`\\\${{ ${String(k).toLowerCase()} }}`, 'ig'), this.#env[k]);
    }

    // write file
    if(!this.#debug){
      fs.writeFileSync('./README.md', output.markdown);
    }else{
      fs.writeFileSync('./TREADME.md', output.markdown);
    }
  }
}

try{
  if(args.length && args[0] === 'debug'){
    const readme = new README({
      sarif:JSON.parse(fs.readFileSync('report.sarif', 'utf-8')),
      build_log:fs.readFileSync('buildx.log', 'utf-8').toString(),
      debug:true,
    });
  }else{
    (async()=>{
      try{
        const opt = {
          sarif:{},
          build_log:'',
        };

        // get sarif
        if(core.getInput('sarif_file')){
          const sarifPath = path.resolve(core.getInput('sarif_file'));
          if(fs.existsSync(sarifPath)){
            opt.sarif = JSON.parse(fs.readFileSync(sarifPath, 'utf-8'));
          }else{
            core.warning(`no sarif file present at ${sarifPath}`);
          }
        }else{
          core.warning('sarif_file not set');
        }

        // get build history from metadata
        if(core.getInput('build_output_metadata')){
          const metadata = JSON.parse(core.getInput('build_output_metadata'));
          const buildID = metadata?.["buildx.build.ref"].split('/').pop();
          //opt.build_log = await run('docker', ['buildx', 'history', 'logs', buildID]);
          const docker = spawnSync('docker', ['buildx', 'history', 'logs', buildID], {encoding:'utf-8', maxBuffer:128*1024*1024});
          console.log(inspect(docker, {showHidden:false, depth:null}));
          if(!docker.error){
            opt.build_log = docker.stdout;
            core.info(`log of build ${buildID} has ${[...opt.build_log].reduce((a, c) => a + (c === '\n' ? 1 : 0), 0)} entries`);
            if(docker.stderr.length > 0){
              core.warning('spawnSync stderr');
              console.log(inspect(docker, {showHidden:false, depth:null}));
              core.warning(docker.stderr);
            }
          }else{
            core.error('spawnSync error');
            console.log(inspect(docker, {showHidden:false, depth:null}));
            core.error(docker.error);
          }
        }else{
          core.warning('build_output_metadata not set');
        }

        // start creating README.md
        const readme = new README(opt);
      }catch(err){
        core.warning(inspect(err, {showHidden:false, depth:null}));
      }
    })();    
  }
}catch(err){
  core.error(inspect(err, {showHidden:false, depth:null}));
  core.setFailed(`action failed with error ${err.message}`);
}